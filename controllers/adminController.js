const { Op, fn, col, literal } = require('sequelize');
const { Organogram, Event, EventAssignment, sequelize } = require('../models');

// Helper: month label
const monthLabel = (month, year) => {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

// Helper: format last_active date
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleString('en-IN', { month: 'short', day: 'numeric' });
};

// Helper: check if event type is a periodic (recurring) type
const isPeriodicType = (type) => ['monthly', 'bi_monthly', 'quarterly', 'half_yearly', 'yearly'].includes(type);

// Helper: get the list of due months (1-12) for a given periodic type
const getDueMonths = (type) => {
  switch (type) {
    case 'monthly':     return [1,2,3,4,5,6,7,8,9,10,11,12];
    case 'bi_monthly':  return [1,3,5,7,9,11];       // every 2nd month (odd)
    case 'quarterly':   return [1,4,7,10];            // Jan, Apr, Jul, Oct
    case 'half_yearly': return [1,7];                  // Jan, Jul
    case 'yearly':      return [1];                    // Jan only
    default:            return [1,2,3,4,5,6,7,8,9,10,11,12];
  }
};

// ─────────────────────────────────────────────
// 3. GET /admin/dashboard
// ─────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const totalOrganograms = await Organogram.count({ where: { status: 'active' } });
    const totalActiveEvents = await Event.count({ where: { is_active: true } });

    // All assignments for this month
    const assignments = await EventAssignment.findAll({
      where: { month, year },
      include: [
        { model: Event, as: 'event', attributes: ['name', 'type'] },
        { model: Organogram, as: 'fieldUser', attributes: ['id', 'level'] }
      ]
    });

    const totalExpected = assignments.length;
    const completed = assignments.filter(a => a.status === 'done').length;
    const pendingOverdue = assignments.filter(a => ['pending', 'carry', 'remind'].includes(a.status)).length;
    const carryForwards = assignments.filter(a => a.is_carry_forward).length;

    // Users with at least one non-done assignment
    const incompleteUserIds = new Set(
      assignments.filter(a => a.status !== 'done').map(a => a.field_user_id)
    );

    const alerts = [];
    if (incompleteUserIds.size > 0) {
      alerts.push({ type: 'red', message: `${incompleteUserIds.size} field users have not completed all required events for ${monthLabel(month, year)}.` });
    }
    if (carryForwards > 0) {
      alerts.push({ type: 'amber', message: `${carryForwards} carry-forwards are active this month.` });
    }

    // Event completion breakdown
    const eventMap = {};
    for (const a of assignments) {
      const key = a.event_id;
      if (!eventMap[key]) {
        eventMap[key] = { event_name: a.event.name, type: a.event.type, completed: 0, total: 0 };
      }
      eventMap[key].total++;
      if (a.status === 'done') eventMap[key].completed++;
    }
    const event_completion = Object.values(eventMap).map(e => ({
      ...e,
      percent: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0
    }));

    // Level performance
    const allActiveUsers = await Organogram.findAll({ where: { status: 'active' }, attributes: ['id', 'level'] });
    const levelMap = {};
    for (const u of allActiveUsers) {
      const lvl = u.level || 'Unassigned';
      if (!levelMap[lvl]) levelMap[lvl] = [];
      levelMap[lvl].push(u.id);
    }
    const level_performance = Object.entries(levelMap).map(([lvl, userIds]) => {
      const lvlAssignments = assignments.filter(a => userIds.includes(a.field_user_id));
      const totalAssignments = lvlAssignments.length;
      const doneCount = lvlAssignments.filter(a => a.status === 'done').length;
      const overdueCount = new Set(lvlAssignments.filter(a => a.status !== 'done').map(a => a.field_user_id)).size;
      const carryCount = lvlAssignments.filter(a => a.is_carry_forward).length;

      return {
        level: lvl,
        total_users: userIds.length,
        avg_completion_percent: totalAssignments > 0 ? Math.round((doneCount / totalAssignments) * 100) : 0,
        overdue_count: overdueCount,
        carry_forward_count: carryCount
      };
    });

    res.json({
      success: true,
      month_label: monthLabel(month, year),
      total_field_users: totalOrganograms,
      total_active_events: totalActiveEvents,
      stats: { total_expected: totalExpected, completed, pending_overdue: pendingOverdue, carry_forwards: carryForwards },
      alerts,
      event_completion,
      level_performance
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// 4. GET /admin/calendar
// ─────────────────────────────────────────────
const getCalendar = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Monthly events → mark day 1 and every 7th day as visual markers
    const monthlyEvents = await Event.findAll({ where: { type: 'monthly', is_active: true } });
    const monthly_event_days = monthlyEvents.length > 0 ? [1, 8, 15, 22] : [];

    // Build reminder window: days 8–27 (7 days either side of each marker)
    const reminderSet = new Set();
    for (const d of [8, 15, 22]) {
      for (let i = d; i <= d + 6 && i <= 28; i++) {
        if (i !== d) reminderSet.add(i);
      }
    }
    const reminder_window_days = [...reminderSet].sort((a, b) => a - b);

    // Specific events this month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const specificEvents = await Event.findAll({
      where: {
        type: 'specific',
        is_active: true,
        event_date: { [Op.between]: [startDate, endDate] }
      }
    });

    const specific_events = specificEvents.map(e => ({
      day: new Date(e.event_date).getDate(),
      event_name: e.name,
      type: 'specific'
    }));

    res.json({
      success: true,
      month,
      year,
      monthly_event_days,
      reminder_window_days,
      specific_events
    });
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// 5. GET /admin/events
// ─────────────────────────────────────────────
const getEvents = async (req, res) => {
  try {
    const totalUsers = await Organogram.count({ where: { status: 'active' } });
    const events = await Event.findAll({ where: { is_active: true }, order: [['id', 'ASC']] });

    const formatted = events.map(e => {
      const assignedLabel = e.assigned_to === 'all'
        ? `All ${totalUsers} users`
        : `Level: ${e.assigned_to}`;

      return {
        id: e.id,
        name: e.name,
        description: e.description,
        type: e.type,
        schedule: e.type === 'monthly' ? 'Every month (open period)'
          : e.type === 'bi_monthly' ? 'Every 2 months'
          : e.type === 'quarterly' ? 'Every 3 months (quarterly)'
          : e.type === 'half_yearly' ? 'Every 6 months (half-yearly)'
          : e.type === 'yearly' ? 'Every 12 months (yearly)'
          : e.type === 'specific' ? 'Fixed date'
          : null,
        date: e.event_date || null,
        seven_day_reminder: e.seven_day_reminder,
        assigned_to: e.assigned_to,
        assigned_label: assignedLabel
      };
    });

    res.json({ success: true, total: formatted.length, events: formatted });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// 6. POST /admin/events
// ─────────────────────────────────────────────
const createEvent = async (req, res) => {
  try {
    const { name, description, type, date, assigned_to, seven_day_reminder } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'name and type are required' });
    }
    if (type === 'specific' && !date) {
      return res.status(400).json({ success: false, message: 'date is required for specific events' });
    }

    const event = await Event.create({
      name,
      description: description || null,
      type,
      event_date: type === 'specific' ? date : null,
      assigned_to: assigned_to || 'all',
      seven_day_reminder: seven_day_reminder || false
    });

    // Auto-assign to matching field users
    await assignEventToUsers(event);

    res.status(201).json({ success: true, message: 'Event created successfully', event_id: event.id });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// Helper: assign event to matching field users
// ─────────────────────────────────────────────
const assignEventToUsers = async (event) => {
  const where = { status: 'active' };
  if (event.assigned_to !== 'all') where.level = event.assigned_to;
  const users = await Organogram.findAll({ where, attributes: ['id'] });

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // For periodic events, only assign in due months
  if (isPeriodicType(event.type) && !getDueMonths(event.type).includes(month)) {
    return; // skip assignment this month
  }

  // Determine status for specific events
  let defaultStatus = 'pending';
  if (event.type === 'specific' && event.event_date) {
    const dueDate = new Date(event.event_date);
    const diff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    if (diff <= 7 && diff > 0) defaultStatus = 'remind';
    else if (diff > 7) defaultStatus = 'upcoming';
    else defaultStatus = 'pending';
  }

  const assignments = users.map(u => ({
    field_user_id: u.id,
    event_id: event.id,
    month,
    year,
    status: defaultStatus,
    is_carry_forward: false
  }));

  if (assignments.length > 0) {
    await EventAssignment.bulkCreate(assignments, { ignoreDuplicates: true });
  }
};

// ─────────────────────────────────────────────
// 7. PUT /admin/events/:event_id
// ─────────────────────────────────────────────
const updateEvent = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { name, description, type, date, assigned_to, seven_day_reminder } = req.body;

    const event = await Event.findByPk(event_id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    await event.update({
      name: name || event.name,
      description: description !== undefined ? description : event.description,
      type: type || event.type,
      event_date: type === 'specific' ? (date || event.event_date) : null,
      assigned_to: assigned_to || event.assigned_to,
      seven_day_reminder: seven_day_reminder !== undefined ? seven_day_reminder : event.seven_day_reminder
    });

    res.json({ success: true, message: 'Event updated successfully' });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// 8. GET /admin/tracking
// ─────────────────────────────────────────────
const getTracking = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const search = req.query.search || '';
    const filter = req.query.filter || 'all';
    const level = req.query.level || 'all';

    const userWhere = { status: 'active' };
    if (level !== 'all') userWhere.level = level;
    if (search) {
      userWhere[Op.or] = [
        { emp_name: { [Op.like]: `%${search}%` } },
        { level: { [Op.like]: `%${search}%` } }
      ];
    }

    const allUsers = await Organogram.findAll({
      where: userWhere,
      include: [{
        model: EventAssignment,
        as: 'assignments',
        where: { month, year },
        required: false
      }]
    });

    const totalActiveEvents = await Event.count({ where: { is_active: true } });

    let users = allUsers.map(u => {
      const assignments = u.assignments || [];
      const completed = assignments.filter(a => a.status === 'done').length;
      const pending = assignments.filter(a => a.status !== 'done').length;
      const hasCarryForward = assignments.some(a => a.is_carry_forward);
      const completionPercent = assignments.length > 0
        ? Math.round((completed / assignments.length) * 100) : 0;

      const lastActive = assignments
        .filter(a => a.completed_on)
        .sort((a, b) => new Date(b.completed_on) - new Date(a.completed_on))[0];

      let status = 'incomplete';
      if (hasCarryForward) status = 'carry';
      else if (pending === 0 && completed > 0) status = 'complete';

      return {
        id: u.id,
        name: u.emp_name,
        emp_code: u.emp_code,
        level: u.level,
        emailid: u.emailid,
        completed,
        pending,
        total_events: assignments.length || totalActiveEvents,
        completion_percent: completionPercent,
        has_carry_forward: hasCarryForward,
        last_active: lastActive ? formatDate(lastActive.completed_on) : null,
        status,
        _raw_pending: pending,
        _raw_carry: hasCarryForward
      };
    });

    // Apply status filter
    if (filter !== 'all') {
      users = users.filter(u => u.status === filter);
    }

    // Summary stats
    const fullyComplete = users.filter(u => u.status === 'complete').length;
    const behindIncomplete = users.filter(u => u.status === 'incomplete').length;
    const carryForwards = users.filter(u => u.status === 'carry').length;

    // Clean internal fields
    users = users.map(({ _raw_pending, _raw_carry, ...rest }) => rest);

    res.json({
      success: true,
      total_users: allUsers.length,
      shown: users.length,
      month_label: monthLabel(month, year),
      summary: { fully_complete: fullyComplete, behind_incomplete: behindIncomplete, carry_forwards: carryForwards },
      users
    });
  } catch (err) {
    console.error('Tracking error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// 9. GET /admin/incomplete
// ─────────────────────────────────────────────
const getIncomplete = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const search = req.query.search || '';
    const filter = req.query.filter || 'all';

    const userWhere = { status: 'active' };
    if (search) {
      userWhere[Op.or] = [
        { emp_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const allUsers = await Organogram.findAll({
      where: userWhere,
      include: [{
        model: EventAssignment,
        as: 'assignments',
        where: { month, year, status: { [Op.ne]: 'done' } },
        required: true   // Only users with at least one incomplete
      }]
    });

    let users = allUsers.map(u => {
      const assignments = u.assignments || [];
      const pendingCount = assignments.length;
      const hasCarryForward = assignments.some(a => a.is_carry_forward);
      const lastActive = assignments
        .filter(a => a.updated_at)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

      let riskLevel = 'low';
      if (pendingCount >= 3) riskLevel = 'high';
      else if (hasCarryForward) riskLevel = 'medium';

      return {
        id: u.id,
        name: u.emp_name,
        level: u.level,
        pending_count: pendingCount,
        has_carry_forward: hasCarryForward,
        risk_level: riskLevel,
        last_active: lastActive ? formatDate(lastActive.updated_at) : null
      };
    });

    // Filter
    if (filter === 'carry') users = users.filter(u => u.has_carry_forward);
    else if (filter === 'high') users = users.filter(u => u.risk_level === 'high');

    res.json({
      success: true,
      total_requiring_attention: users.length,
      month_label: monthLabel(month, year),
      users
    });
  } catch (err) {
    console.error('Incomplete error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// 10. GET /admin/users
// ─────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const search = req.query.search || '';
    const level = req.query.level || 'all';
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const where = { status: 'active' };
    if (level !== 'all') where.level = level;
    if (search) {
      where[Op.or] = [
        { emp_name: { [Op.like]: `%${search}%` } },
        { emailid: { [Op.like]: `%${search}%` } },
        { emp_code: { [Op.like]: `%${search}%` } }
      ];
    }

    const allUsers = await Organogram.findAll({
      where,
      include: [{
        model: EventAssignment,
        as: 'assignments',
        where: { month, year },
        required: false
      }],
      order: [['emp_name', 'ASC']]
    });

    const users = allUsers.map(u => {
      const assignments = u.assignments || [];
      const completed = assignments.filter(a => a.status === 'done').length;
      const hasCarryForward = assignments.some(a => a.is_carry_forward);
      const completionPercent = assignments.length > 0
        ? Math.round((completed / assignments.length) * 100) : 0;
      const lastActive = assignments
        .filter(a => a.completed_on)
        .sort((a, b) => new Date(b.completed_on) - new Date(a.completed_on))[0];

      let status = 'incomplete';
      if (hasCarryForward) status = 'carry';
      else if (completed === assignments.length && assignments.length > 0) status = 'complete';

      return {
        id: u.id,
        name: u.emp_name,
        emp_code: u.emp_code,
        level: u.level,
        emailid: u.emailid,
        level: u.level,
        completion_percent: completionPercent,
        last_active: lastActive ? formatDate(lastActive.completed_on) : null,
        status
      };
    });

    res.json({ success: true, total: users.length, users });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// 11. POST /admin/users
// ─────────────────────────────────────────────
const createUser = async (req, res) => {
  try {
    const { emp_name, emailid, sap_code, emp_code, mobileno, level, division, hq, doj, am_sapcode, rm_sapcode, zm_sapcode } = req.body;

    if (!emp_name || !emailid || !sap_code || !emp_code || !level) {
      return res.status(400).json({ success: false, message: 'emp_name, emailid, sap_code, emp_code, and level are required' });
    }

    const existing = await Organogram.findOne({
      where: { [Op.or]: [{ emailid }, { sap_code }, { emp_code }] }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with same emailid, SAP code, or emp_code already exists' });
    }

    const user = await Organogram.create({ emp_name, emailid, sap_code, emp_code, mobileno, level, division, hq, doj, am_sapcode, rm_sapcode, zm_sapcode });

    // Auto-assign existing active events to the new user
    const events = await Event.findAll({
      where: {
        is_active: true,
        [Op.or]: [{ assigned_to: 'all' }, { assigned_to: level }]
      }
    });

    if (events.length > 0) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const assignments = events.map(e => ({
        field_user_id: user.id,
        event_id: e.id,
        month,
        year,
        status: 'pending',
        is_carry_forward: false
      }));
      await EventAssignment.bulkCreate(assignments, { ignoreDuplicates: true });
    }

    res.status(201).json({ success: true, message: 'User added successfully', user_id: user.id });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────
// Carry-Forward Logic
// For monthly events: if not done in month N, carry to N+1, then N+2, etc.
// For bi_monthly/quarterly/half_yearly/yearly: missed events are ignored
// ─────────────────────────────────────────────────────────
const carryForwardAssignments = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Previous month (handle year rollover)
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Find all monthly event assignments from previous month that are NOT done
    const pendingAssignments = await EventAssignment.findAll({
      where: {
        month: prevMonth,
        year: prevYear,
        status: { [Op.ne]: 'done' }
      },
      include: [{ model: Event, as: 'event', attributes: ['id', 'name', 'type'] }]
    });

    // Filter: monthly, bi_monthly, quarterly, half_yearly get carried forward (yearly does NOT)
    const toCarry = pendingAssignments.filter(a => a.event && ['monthly', 'bi_monthly', 'quarterly', 'half_yearly'].includes(a.event.type));

    let carriedCount = 0;
    for (const prev of toCarry) {
      // Check if a carry-forward already exists for this user+event in current month
      const existing = await EventAssignment.findOne({
        where: {
          field_user_id: prev.field_user_id,
          event_id: prev.event_id,
          month: currentMonth,
          year: currentYear,
          is_carry_forward: true
        }
      });

      if (existing) continue; // already carried forward this month

      const newCarryCount = (prev.carry_count || 0) + 1;

      await EventAssignment.create({
        field_user_id: prev.field_user_id,
        event_id: prev.event_id,
        month: currentMonth,
        year: currentYear,
        status: 'carry',
        is_carry_forward: true,
        carry_count: newCarryCount,
        original_month: prev.original_month || prevMonth,
        original_year: prev.original_year || prevYear
      });
      carriedCount++;
    }

    const monthLabel = new Date(currentYear, currentMonth - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const prevMonthLabel = new Date(prevYear, prevMonth - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    res.json({
      success: true,
      message: 'Carry-forward completed',
      from_month: prevMonthLabel,
      to_month: monthLabel,
      events_checked: toCarry.length,
      carried_forward: carriedCount,
      skipped: toCarry.length - carriedCount
    });
  } catch (err) {
    console.error('Carry-forward error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  carryForwardAssignments,
  getDashboard,
  getCalendar,
  getEvents,
  createEvent,
  updateEvent,
  getTracking,
  getIncomplete,
  getUsers,
  createUser
};
