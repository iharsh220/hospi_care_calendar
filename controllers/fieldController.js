const { Op } = require('sequelize');
const path = require('path');
const { Organogram, Event, EventAssignment } = require('../models');

const monthLabel = (month, year) => {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

// ─────────────────────────────────────────────
// 12. GET /field/my-events
// ─────────────────────────────────────────────
const getMyEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const user = await Organogram.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const assignments = await EventAssignment.findAll({
      where: { field_user_id: userId, month, year },
      include: [{ model: Event, as: 'event' }],
      order: [['id', 'ASC']]
    });

    // Build alerts
    const alerts = [];
    const carryItems = assignments.filter(a => a.is_carry_forward);
    if (carryItems.length > 0) {
      for (const ca of carryItems) {
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevLabel = monthLabel(prevMonth, prevYear);
        alerts.push({
          type: 'amber',
          message: `Carry-forward active. You did not complete ${ca.event.name} in ${prevLabel}. It has been added to your ${monthLabel(month, year)} tasks.`
        });
      }
    }

    // 7-day reminders
    const today = new Date();
    const remindItems = assignments.filter(a => a.status === 'remind' && a.event.event_date);
    for (const ri of remindItems) {
      const due = new Date(ri.event.event_date);
      const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      if (diff > 0 && diff <= 7) {
        alerts.push({
          type: 'blue',
          message: `${ri.event.name} is scheduled for ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} — ${diff} day${diff > 1 ? 's' : ''} away. An email reminder has been sent.`
        });
      }
    }

    // Sidebar
    const done = assignments.filter(a => a.status === 'done').length;
    const pending = assignments.filter(a => a.status !== 'done').length;
    const hasCarryForward = assignments.some(a => a.is_carry_forward);
    const completionPercent = assignments.length > 0
      ? Math.round((done / assignments.length) * 100) : 0;

    // Format events
    const events = assignments.map(a => {
      const e = a.event;
      let description = '';

      if (a.status === 'carry') {
        const prevMonth = a.original_month || (month === 1 ? 12 : month - 1);
        const prevYear = a.original_year || (month === 1 ? year - 1 : year);
        description = `Carry-forward from ${monthLabel(prevMonth, prevYear)} — complete anytime in ${monthLabel(month, year)}`;
      } else if (a.status === 'done') {
        description = `Completed on ${new Date(a.completed_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      } else if (a.status === 'remind' && e.event_date) {
        description = `Due: ${new Date(e.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · 7-day reminder sent`;
      } else if (a.status === 'upcoming' && e.event_date) {
        description = `Due: ${new Date(e.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · upcoming`;
      } else if (e.type === 'monthly') {
        description = `Due anytime in ${monthLabel(month, year)}`;
      } else {
        description = e.description || '';
      }

      return {
        id: a.id,
        name: e.name,
        description,
        type: e.type,
        status: a.status,
        due_date: e.event_date || null,
        carry_count: a.carry_count || 0,
        is_carry_forward: a.is_carry_forward,
        ...(a.completed_on && { completed_on: a.completed_on })
      };
    });

    res.json({
      success: true,
      user: { name: user.emp_name, level: user.level },
      month_label: monthLabel(month, year),
      alerts,
      sidebar_status: { done, pending, completion_percent: completionPercent, has_carry_forward: hasCarryForward },
      events
    });
  } catch (err) {
    console.error('My events error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// 13. POST /field/complete
// ─────────────────────────────────────────────
const submitCompletion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { event_id, completed_on, notes } = req.body;

    if (!event_id) {
      return res.status(400).json({ success: false, message: 'event_id is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Proof image is required' });
    }

    const assignment = await EventAssignment.findOne({
      where: { id: event_id, field_user_id: userId }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Event assignment not found' });
    }
    if (assignment.status === 'done') {
      return res.status(400).json({ success: false, message: 'Event already marked as complete' });
    }

    // Build proof URL (in production serve /uploads statically)
    const proofImageUrl = `/uploads/${req.file.filename}`;

    await assignment.update({
      status: 'done',
      completed_on: completed_on || new Date().toISOString().split('T')[0],
      notes: notes || null,
      proof_image_url: proofImageUrl
    });

    res.json({ success: true, message: 'Event marked as complete successfully' });
  } catch (err) {
    console.error('Submit completion error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// 14. GET /field/my-history
// ─────────────────────────────────────────────
const getMyHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await Organogram.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const assignments = await EventAssignment.findAll({
      where: {
        field_user_id: userId,
        status: { [Op.in]: ['done', 'carry'] }
      },
      include: [{ model: Event, as: 'event' }],
      order: [['year', 'DESC'], ['month', 'DESC'], ['id', 'DESC']]
    });

    const history = assignments.map(a => ({
      event_name: a.event.name,
      type: a.event.type,
      month_label: monthLabel(a.month, a.year),
      completed_on: a.completed_on || null,
      status: a.status,
      proof_image_url: a.proof_image_url || null
    }));

    res.json({
      success: true,
      user: { name: user.emp_name },
      history
    });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMyEvents, submitCompletion, getMyHistory };
