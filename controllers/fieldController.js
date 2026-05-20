const { Op } = require('sequelize');
const { Organogram, Event, EventAssignment } = require('../models');
const { generateAssignmentsForPeriod } = require('../services/assignmentService');

function monthLabel(month, year) {
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${names[month - 1]} ${year}`;
}

function statusLabel(status, isCarry) {
  if (isCarry && status !== 'done') return 'carry';
  return status;
}

// GET /field/my-events?month=&year=
async function myEvents(req, res) {
  try {
    const userId = req.user.id;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const user = await Organogram.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Ensure assignments for this user
    await generateAssignmentsForPeriod(month, year);

    const assignments = await EventAssignment.findAll({
      where: { organogram_id: userId, period_month: month, period_year: year },
      include: [{ model: Event, as: 'event', where: { is_active: true } }],
      order: [['id', 'ASC']],
    });

    const done = assignments.filter(a => a.status === 'done').length;
    const pending = assignments.filter(a => a.status !== 'done').length;
    const total = assignments.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 100;
    const hasCarry = assignments.some(a => a.is_carry_forward && a.status !== 'done');

    // Build alerts
    const alerts = [];
    const carryItems = assignments.filter(a => a.is_carry_forward && a.status !== 'done');
    for (const c of carryItems) {
      alerts.push({
        type: 'amber',
        message: `Carry-forward active. You did not complete "${c.event.name}" in ${monthLabel(c.carry_from_month, c.carry_from_year)}. It has been added to your ${monthLabel(month, year)} tasks.`,
      });
    }

    // 7-day reminder events
    const remindItems = assignments.filter(a => a.status === 'remind');
    for (const r of remindItems) {
      if (r.event.event_date) {
        alerts.push({
          type: 'blue',
          message: `${r.event.name} is scheduled for ${r.event.event_date} — within 7 days. An email reminder has been sent.`,
        });
      }
    }

    // Build event cards
    const now = new Date();
    const events = assignments.map(a => {
      const ev = a.event;
      let status = a.status;
      if (a.is_carry_forward && status !== 'done') status = 'carry';
      // Mark upcoming for yearly events not yet within 7 days
      if (ev.frequency === 'yearly' && status === 'pending' && ev.event_date) {
        const daysUntil = Math.ceil((new Date(ev.event_date) - now) / 86400000);
        if (daysUntil > 7) status = 'upcoming';
        else if (daysUntil <= 7 && daysUntil > 0) status = 'remind';
      }

      let description = '';
      if (status === 'done') description = `Completed on ${a.completed_on}`;
      else if (status === 'carry') description = `Carry-forward from ${monthLabel(a.carry_from_month, a.carry_from_year)} — complete anytime in ${monthLabel(month, year)}`;
      else if (status === 'remind') description = `Due: ${ev.event_date} · 7-day reminder sent`;
      else if (status === 'upcoming') description = `Due: ${ev.event_date} · upcoming`;
      else description = ev.frequency === 'yearly' ? `Due: ${ev.event_date}` : `Due anytime in ${monthLabel(month, year)}`;

      return {
        id: a.id,
        event_id: ev.id,
        name: ev.name,
        description,
        type: ev.frequency === 'yearly' ? 'specific' : 'monthly',
        status,
        due_date: ev.event_date || null,
        completed_on: a.completed_on || null,
        proof_image_url: a.proof_image_url || null,
      };
    });

    return res.json({
      success: true,
      user: { name: user.emp_name, region: user.region },
      month_label: monthLabel(month, year),
      alerts,
      sidebar_status: { done, pending, completion_percent: pct, has_carry_forward: hasCarry },
      events,
    });
  } catch (err) {
    console.error('[myEvents]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /field/complete  (multipart/form-data)
async function completeEvent(req, res) {
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
      where: {
        id: event_id,
        organogram_id: userId,
        status: { [Op.not]: 'done' },
      },
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found or already completed' });
    }

    const proofUrl = `/uploads/${req.file.filename}`;
    await assignment.update({
      status: 'done',
      completed_on: completed_on || new Date().toISOString().split('T')[0],
      completion_notes: notes || null,
      proof_image_url: proofUrl,
    });

    return res.json({ success: true, message: 'Event marked as complete successfully' });
  } catch (err) {
    console.error('[completeEvent]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /field/my-history
async function myHistory(req, res) {
  try {
    const userId = req.user.id;

    const user = await Organogram.findByPk(userId);

    const assignments = await EventAssignment.findAll({
      where: { organogram_id: userId },
      include: [{ model: Event, as: 'event' }],
      order: [['period_year', 'DESC'], ['period_month', 'DESC'], ['id', 'DESC']],
    });

    const history = assignments.map(a => {
      const ev = a.event;
      const ml = a.period_month ? monthLabel(a.period_month, a.period_year) : 'N/A';
      const status = a.status === 'done' ? 'done' : 'carry';
      return {
        event_name: ev?.name || 'Unknown',
        type: ev?.frequency === 'yearly' ? 'specific' : 'monthly',
        month_label: ml,
        completed_on: a.completed_on || null,
        status,
        proof_image_url: a.proof_image_url || null,
      };
    });

    return res.json({ success: true, user: { name: user?.emp_name }, history });
  } catch (err) {
    console.error('[myHistory]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ── Hierarchical access: ZM → RM → AM/KAM data ──

// GET /field/team-tracking?month=&year= (for ZM, RM, AM views)
async function teamTracking(req, res) {
  try {
    const userId = req.user.id;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const me = await Organogram.findByPk(userId);
    if (!me) return res.status(404).json({ success: false, message: 'User not found' });

    const level = (me.level || '').trim().toLowerCase();
    let subordinates = [];

    if (level === 'zm') {
      // ZM can see all RMs and AMs under their zm_sapcode
      subordinates = await Organogram.findAll({
        where: {
          [Op.or]: [
            { zm_sapcode: me.sap_code },
            { rm_sapcode: { [Op.in]: await Organogram.findAll({ where: { zm_sapcode: me.sap_code }, attributes: ['sap_code'] }).then(rs => rs.map(r => r.sap_code)) } },
          ],
          status: { [Op.not]: 'inactive' },
        },
      });
    } else if (level === 'rm') {
      // RM sees all AMs under their rm_sapcode
      subordinates = await Organogram.findAll({
        where: { rm_sapcode: me.sap_code, status: { [Op.not]: 'inactive' } },
      });
    } else if (level === 'am') {
      // AM sees users where their sap is am_sapcode (BDMs under them)
      subordinates = await Organogram.findAll({
        where: { am_sapcode: me.sap_code, status: { [Op.not]: 'inactive' } },
      });
    }

    const allAssignments = await EventAssignment.findAll({
      where: {
        organogram_id: { [Op.in]: subordinates.map(u => u.id) },
        period_month: month,
        period_year: year,
      },
    });

    const assignMap = {};
    for (const a of allAssignments) {
      if (!assignMap[a.organogram_id]) assignMap[a.organogram_id] = [];
      assignMap[a.organogram_id].push(a);
    }

    const users = subordinates.map(u => {
      const uA = assignMap[u.id] || [];
      const done = uA.filter(a => a.status === 'done').length;
      const pending = uA.filter(a => a.status !== 'done').length;
      const total = uA.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 100;
      return {
        id: u.id,
        name: u.emp_name,
        employee_id: u.emp_code,
        region: u.region,
        level: u.level,
        completed: done,
        pending,
        total_events: total,
        completion_percent: pct,
        has_carry_forward: uA.some(a => a.is_carry_forward && a.status !== 'done'),
        status: pending > 0 ? 'incomplete' : 'complete',
      };
    });

    return res.json({
      success: true,
      viewer: { name: me.emp_name, level: me.level },
      month_label: monthLabel(month, year),
      total_team: users.length,
      users,
    });
  } catch (err) {
    console.error('[teamTracking]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { myEvents, completeEvent, myHistory, teamTracking };
