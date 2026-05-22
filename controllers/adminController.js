const { Op } = require('sequelize');
const { sequelize, Organogram, Event, EventAssignment } = require('../models');
const { shouldEventFireInMonth, generateAssignmentsForPeriod, getEligibleUsers } = require('../services/assignmentService');

function monthLabel(month, year) {
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[month - 1]} ${year}`;
}

// GET /admin/dashboard?month=&year=
async function adminDashboard(req, res) {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Ensure assignments exist for this period
    await generateAssignmentsForPeriod(month, year);

    const totalFieldUsers = await Organogram.count({ where: { status: { [Op.not]: 'inactive' } } });

    const activeEvents = await Event.findAll({ where: { is_active: true } });
    const firingEvents = activeEvents.filter(e => shouldEventFireInMonth(e, month, year));

    const allAssignments = await EventAssignment.findAll({
      where: { period_month: month, period_year: year },
      include: [{ model: Event, as: 'event' }],
    });

    const total_expected = allAssignments.length;
    const completed = allAssignments.filter(a => a.status === 'done').length;
    const carry_forwards = allAssignments.filter(a => a.is_carry_forward && a.status !== 'done').length;
    const pending_overdue = total_expected - completed;

    // Alerts
    const usersWithPending = [...new Set(
      allAssignments.filter(a => a.status !== 'done').map(a => a.organogram_id)
    )].length;
    const usersWithCarry = [...new Set(
      allAssignments.filter(a => a.is_carry_forward && a.status !== 'done').map(a => a.organogram_id)
    )].length;

    const alerts = [];
    if (usersWithPending > 0) alerts.push({ type: 'red', message: `${usersWithPending} field users have not completed all required events for ${monthLabel(month, year)}.` });
    if (usersWithCarry > 0) alerts.push({ type: 'amber', message: `${usersWithCarry} carry-forwards are active this month.` });

    // Event completion breakdown
    const event_completion = [];
    for (const ev of firingEvents) {
      const evAssignments = allAssignments.filter(a => a.event_id === ev.id);
      const evTotal = evAssignments.length;
      const evDone = evAssignments.filter(a => a.status === 'done').length;
      event_completion.push({
        event_name: ev.name,
        type: ev.frequency,
        completed: evDone,
        total: evTotal,
        percent: evTotal > 0 ? Math.round((evDone / evTotal) * 100) : 0,
      });
    }

    // Region performance
    const regions = await Organogram.findAll({
      attributes: ['region'],
      where: { status: { [Op.not]: 'inactive' } },
      group: ['region'],
      raw: true,
    });
    const region_performance = [];
    for (const row of regions) {
      const region = row.region;
      if (!region) continue;
      const regionUsers = await Organogram.findAll({ where: { region, status: { [Op.not]: 'inactive' } } });
      const regionIds = regionUsers.map(u => u.id);
      const regionAssignments = allAssignments.filter(a => regionIds.includes(a.organogram_id));
      const regionDone = regionAssignments.filter(a => a.status === 'done').length;
      const regionTotal = regionAssignments.length;
      const overdue = [...new Set(regionAssignments.filter(a => a.status !== 'done').map(a => a.organogram_id))].length;
      const cf = [...new Set(regionAssignments.filter(a => a.is_carry_forward && a.status !== 'done').map(a => a.organogram_id))].length;
      region_performance.push({
        region,
        total_users: regionUsers.length,
        avg_completion_percent: regionTotal > 0 ? Math.round((regionDone / regionTotal) * 100) : 0,
        overdue_count: overdue,
        carry_forward_count: cf,
      });
    }

    return res.json({
      success: true,
      month_label: monthLabel(month, year),
      total_field_users: totalFieldUsers,
      total_active_events: firingEvents.length,
      stats: { total_expected, completed, pending_overdue, carry_forwards },
      alerts,
      event_completion,
      region_performance,
    });
  } catch (err) {
    console.error('[adminDashboard]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /admin/calendar?month=&year=
async function adminCalendar(req, res) {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const events = await Event.findAll({ where: { is_active: true } });

    const specific_events = events
      .filter(e => e.frequency === 'yearly' && e.event_date)
      .filter(e => {
        const d = new Date(e.event_date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .map(e => ({
        day: new Date(e.event_date).getDate(),
        event_name: e.name,
        type: 'specific',
      }));

    // For recurring events, indicate first day of month as "event open" and rest as reminder window
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthly_event_days = [1];
    const reminder_window_days = Array.from({ length: daysInMonth - 1 }, (_, i) => i + 2);

    return res.json({
      success: true,
      month,
      year,
      monthly_event_days,
      reminder_window_days,
      specific_events,
    });
  } catch (err) {
    console.error('[adminCalendar]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /admin/events
async function listEvents(req, res) {
  try {
    const events = await Event.findAll({ where: { is_active: true }, order: [['id', 'ASC']] });
    return res.json({
      success: true,
      total: events.length,
      events: events.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        type: e.frequency,
        schedule: e.frequency !== 'yearly' ? `${e.frequency} (open period)` : null,
        date: e.event_date || null,
        seven_day_reminder: e.seven_day_reminder,
        assigned_to: e.assigned_to,
        assigned_label: e.assigned_to === 'all' ? 'All users' : `All ${e.assigned_to.replace(/,/g, ', ')} users`,
      })),
    });
  } catch (err) {
    console.error('[listEvents]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Helper: sync assignments for an event in a given month/year
// Removes old non-carry-forward assignments and creates new ones based on assigned_to
async function syncAssignmentsForEvent(event, month, year) {
  // Get all currently eligible users for this event's assigned_to
  const eligibleUsers = await getEligibleUsers(event.assigned_to);
  const eligibleUserIds = new Set(eligibleUsers.map(u => u.id));

  // Find existing non-carry-forward assignments for this event+period
  const existingAssignments = await EventAssignment.findAll({
    where: {
      event_id: event.id,
      period_month: month,
      period_year: year,
      is_carry_forward: false,
    },
  });

  // Remove assignments for users who are no longer eligible
  const toRemove = existingAssignments.filter(a => !eligibleUserIds.has(a.organogram_id));
  for (const a of toRemove) {
    await a.destroy();
  }

  // Add assignments for newly eligible users who don't have one yet
  const existingUserIds = new Set(
    existingAssignments.filter(a => eligibleUserIds.has(a.organogram_id)).map(a => a.organogram_id)
  );

  for (const user of eligibleUsers) {
    if (!existingUserIds.has(user.id)) {
      await EventAssignment.create({
        event_id: event.id,
        organogram_id: user.id,
        period_month: month,
        period_year: year,
        status: 'pending',
        is_carry_forward: false,
      });
    }
  }
}

// POST /admin/events
async function addEvent(req, res) {
  try {
    const { name, description, type, date, assigned_to, seven_day_reminder } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'name and type are required' });
    }
    if (type === 'yearly' && !date) {
      return res.status(400).json({ success: false, message: 'date is required for yearly events' });
    }
    const event = await Event.create({
      name,
      description,
      frequency: type,
      event_date: type === 'yearly' ? date : null,
      assigned_to: assigned_to ? assigned_to.trim() : 'all',
      seven_day_reminder: !!seven_day_reminder,
    });

    // If recurring, generate assignments for current month immediately
    if (type !== 'yearly') {
      const now = new Date();
      await syncAssignmentsForEvent(event, now.getMonth() + 1, now.getFullYear());
    }

    return res.json({ success: true, message: 'Event created successfully', event_id: event.id });
  } catch (err) {
    console.error('[addEvent]', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// PUT /admin/events/:event_id
async function editEvent(req, res) {
  try {
    const event = await Event.findByPk(req.params.event_id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const { name, description, type, date, assigned_to, seven_day_reminder } = req.body;
    const oldAssignedTo = event.assigned_to;
    const oldFrequency = event.frequency;

    await event.update({
      name: name || event.name,
      description: description !== undefined ? description : event.description,
      frequency: type || event.frequency,
      event_date: type === 'yearly' ? date : null,
      assigned_to: assigned_to ? assigned_to.trim() : event.assigned_to,
      seven_day_reminder: seven_day_reminder !== undefined ? !!seven_day_reminder : event.seven_day_reminder,
    });

    // If recurring, sync assignments for current month
    if (event.frequency !== 'yearly') {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // If assigned_to changed, sync assignments (remove old, add new)
      if (assigned_to && assigned_to.trim() !== oldAssignedTo) {
        await syncAssignmentsForEvent(event, currentMonth, currentYear);
      }

      // If frequency changed, regenerate all assignments for the period
      if (type && type !== oldFrequency) {
        await generateAssignmentsForPeriod(currentMonth, currentYear);
      }
    }

    return res.json({ success: true, message: 'Event updated successfully' });
  } catch (err) {
    console.error('[editEvent]', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

// DELETE /admin/events/:event_id
async function deleteEvent(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const event = await Event.findByPk(req.params.event_id, { transaction });
    if (!event) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const deletedAssignments = await EventAssignment.destroy({
      where: { event_id: event.id },
      transaction,
    });

    await event.destroy({ transaction });
    await transaction.commit();

    return res.json({
      success: true,
      message: 'Event deleted successfully',
      deleted_event_id: event.id,
      deleted_assignments: deletedAssignments,
    });
  } catch (err) {
    await transaction.rollback();
    console.error('[deleteEvent]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /admin/tracking?month=&year=&search=&filter=all&region=all
async function adminTracking(req, res) {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const search = (req.query.search || '').toLowerCase();
    const filter = req.query.filter || 'all';
    const region = req.query.region || req.query.zone || 'all';

    await generateAssignmentsForPeriod(month, year);

    const userWhere = { status: { [Op.not]: 'inactive' } };
    if (region !== 'all') userWhere.region = region;

    let users = await Organogram.findAll({ where: userWhere });
    if (search) {
      users = users.filter(u =>
        (u.emp_name || '').toLowerCase().includes(search) ||
        (u.region || '').toLowerCase().includes(search)
      );
    }

    const allAssignments = await EventAssignment.findAll({
      where: { period_month: month, period_year: year },
    });

    const assignmentMap = {};
    for (const a of allAssignments) {
      if (!assignmentMap[a.organogram_id]) assignmentMap[a.organogram_id] = [];
      assignmentMap[a.organogram_id].push(a);
    }

    let userRows = users.map(u => {
      const uAssign = assignmentMap[u.id] || [];
      const done = uAssign.filter(a => a.status === 'done').length;
      const carry = uAssign.filter(a => a.is_carry_forward && a.status !== 'done').length;
      const pending = uAssign.filter(a => a.status !== 'done').length;
      const total = uAssign.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 100;
      const hasCarry = carry > 0;
      let status = 'complete';
      if (hasCarry) status = 'carry';
      else if (pending > 0) status = 'incomplete';
      const lastDone = uAssign.filter(a => a.completed_on).sort((a, b) => new Date(b.completed_on) - new Date(a.completed_on));
      const last_active = lastDone[0]?.completed_on || null;
      return { id: u.id, name: u.emp_name, employee_id: u.emp_code, region: u.region, email: u.emailid, completed: done, pending, total_events: total, completion_percent: pct, has_carry_forward: hasCarry, last_active, status };
    });

    if (filter === 'complete') userRows = userRows.filter(u => u.status === 'complete');
    else if (filter === 'incomplete') userRows = userRows.filter(u => u.status === 'incomplete');
    else if (filter === 'carry') userRows = userRows.filter(u => u.status === 'carry');

    const fullyComplete = userRows.filter(u => u.status === 'complete').length;
    const behindIncomplete = userRows.filter(u => u.status === 'incomplete').length;
    const carryForwards = userRows.filter(u => u.status === 'carry').length;

    return res.json({
      success: true,
      total_users: users.length,
      shown: userRows.length,
      month_label: monthLabel(month, year),
      summary: { fully_complete: fullyComplete, behind_incomplete: behindIncomplete, carry_forwards: carryForwards },
      users: userRows,
    });
  } catch (err) {
    console.error('[adminTracking]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /admin/incomplete
async function adminIncomplete(req, res) {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const search = (req.query.search || '').toLowerCase();
    const filter = req.query.filter || 'all';

    const allAssignments = await EventAssignment.findAll({
      where: { period_month: month, period_year: year, status: { [Op.not]: 'done' } },
      include: [{ model: Organogram, as: 'user' }],
    });

    const userMap = {};
    for (const a of allAssignments) {
      const uid = a.organogram_id;
      if (!userMap[uid]) {
        userMap[uid] = { user: a.user, pending: 0, hasCarry: false };
      }
      userMap[uid].pending++;
      if (a.is_carry_forward) userMap[uid].hasCarry = true;
    }

    let rows = Object.values(userMap).map(({ user, pending, hasCarry }) => {
      let risk_level = 'low';
      if (pending >= 3) risk_level = 'high';
      else if (hasCarry) risk_level = 'medium';
      return {
        id: user?.id,
        name: user?.emp_name,
        region: user?.region,
        pending_count: pending,
        has_carry_forward: hasCarry,
        risk_level,
        last_active: null,
      };
    });

    if (search) rows = rows.filter(r => (r.name || '').toLowerCase().includes(search));
    if (filter === 'carry') rows = rows.filter(r => r.has_carry_forward);
    else if (filter === 'high') rows = rows.filter(r => r.risk_level === 'high');

    return res.json({
      success: true,
      total_requiring_attention: rows.length,
      month_label: monthLabel(month, year),
      users: rows,
    });
  } catch (err) {
    console.error('[adminIncomplete]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /admin/users
async function listUsers(req, res) {
  try {
    const search = (req.query.search || '').toLowerCase();
    const region = req.query.region || req.query.zone || 'all';
    const where = { status: { [Op.not]: 'inactive' } };
    if (region !== 'all') where.region = region;

    let users = await Organogram.findAll({ where });
    if (search) {
      users = users.filter(u =>
        (u.emp_name || '').toLowerCase().includes(search) ||
        (u.region || '').toLowerCase().includes(search) ||
        (u.emailid || '').toLowerCase().includes(search)
      );
    }

    return res.json({
      success: true,
      total: users.length,
      users: users.map(u => ({
        id: u.id,
        name: u.emp_name,
        employee_id: u.emp_code,
        region: u.region,
        email: u.emailid,
        level: u.level,
        sap_code: u.sap_code,
        mobile: u.mobileno,
        completion_percent: null,
        last_active: null,
        status: 'active',
      })),
    });
  } catch (err) {
    console.error('[listUsers]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// POST /admin/users
async function addUser(req, res) {
  try {
    const { first_name, last_name, email, sap_code, region, zone, employee_id, mobile, level } = req.body;
    if (!email || !sap_code) {
      return res.status(400).json({ success: false, message: 'Email and SAP code required' });
    }
    const user = await Organogram.create({
      emp_name: `${first_name} ${last_name}`.trim(),
      emailid: email,
      sap_code,
      region: region || zone,
      emp_code: employee_id,
      mobileno: mobile,
      level: level || 'AM',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    return res.json({ success: true, message: 'User added successfully', user_id: user.id });
  } catch (err) {
    console.error('[addUser]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  adminDashboard,
  adminCalendar,
  listEvents,
  addEvent,
  editEvent,
  deleteEvent,
  adminTracking,
  adminIncomplete,
  listUsers,
  addUser,
};
