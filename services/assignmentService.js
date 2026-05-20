const { Op } = require('sequelize');
const { Organogram, Event, EventAssignment } = require('../models');

const ACTIVE_STATUSES = ['active', 'Active', 'ACTIVE'];
const PERIODIC_TYPES = ['monthly', 'bi_monthly', 'quarterly', 'half_yearly', 'yearly'];
const CARRY_FORWARD_TYPES = ['monthly', 'bi_monthly', 'quarterly', 'half_yearly', 'yearly'];

const activeUserWhere = () => ({ status: { [Op.in]: ACTIVE_STATUSES } });

const monthBounds = (month, year) => {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  return { start, end };
};

const previousMonth = (month, year) => ({
  month: month === 1 ? 12 : month - 1,
  year: month === 1 ? year - 1 : year
});

const parseAssignedTo = (assignedTo) => {
  if (!assignedTo || assignedTo === 'all' || assignedTo === 'everyone') return ['all'];
  return String(assignedTo).split(',').map(v => v.trim()).filter(Boolean);
};

const targetAliases = (target) => {
  const lower = String(target).toLowerCase();
  if (lower === 'all' || lower === 'everyone') return ['all'];
  if (lower === 'bdm') return ['BDM - Government Account'];
  if (lower === 'kam') return ['AM', 'KAM'];
  if (lower === 'am') return ['AM', 'KAM'];
  return [target];
};

const matchesAssignedTo = (user, assignedTo) => {
  const targets = parseAssignedTo(assignedTo).flatMap(targetAliases);
  if (targets.includes('all')) return true;

  return targets.some(target => (
    String(user.level || '').toLowerCase() === String(target).toLowerCase()
    || String(user.hq || '').toLowerCase() === String(target).toLowerCase()
  ));
};

const getDueMonths = (event) => {
  if (event.event_date && event.type === 'yearly') {
    return [new Date(event.event_date).getMonth() + 1];
  }

  switch (event.type) {
    case 'monthly': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    case 'bi_monthly': return [1, 3, 5, 7, 9, 11];
    case 'quarterly': return [1, 4, 7, 10];
    case 'half_yearly': return [1, 7];
    case 'yearly': return [1];
    default: return [];
  }
};

const isEventDueInMonth = (event, month, year) => {
  if (event.type === 'specific') {
    if (!event.event_date) return false;
    const date = new Date(event.event_date);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  }

  if (!PERIODIC_TYPES.includes(event.type)) return false;
  return getDueMonths(event).includes(month);
};

const statusForEvent = (event, today = new Date()) => {
  if (!event.event_date || !['specific', 'yearly'].includes(event.type)) return 'pending';

  const dueDate = new Date(event.event_date);
  if (event.type === 'yearly') {
    dueDate.setFullYear(today.getFullYear());
  }

  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  if (diffDays > 7) return 'upcoming';
  if (diffDays >= 0) return 'remind';
  return 'pending';
};

const createIfMissing = async (payload, where) => {
  const existing = await EventAssignment.findOne({ where });
  if (existing) return false;
  await EventAssignment.create(payload);
  return true;
};

const assignCurrentDueEvents = async (month, year, today = new Date()) => {
  const events = await Event.findAll({ where: { is_active: true } });
  const users = await Organogram.findAll({
    where: activeUserWhere(),
    attributes: ['id', 'level', 'hq']
  });

  let created = 0;
  for (const event of events) {
    if (!isEventDueInMonth(event, month, year)) continue;

    const matchedUsers = users.filter(user => matchesAssignedTo(user, event.assigned_to));
    for (const user of matchedUsers) {
      const wasCreated = await createIfMissing({
        field_user_id: user.id,
        event_id: event.id,
        month,
        year,
        status: statusForEvent(event, today),
        is_carry_forward: false
      }, {
        field_user_id: user.id,
        event_id: event.id,
        month,
        year,
        is_carry_forward: false
      });

      if (wasCreated) created++;
    }
  }

  return created;
};

const carryForwardPendingAssignments = async (month, year) => {
  const prev = previousMonth(month, year);
  const pendingAssignments = await EventAssignment.findAll({
    where: {
      month: prev.month,
      year: prev.year,
      status: { [Op.ne]: 'done' }
    },
    include: [{ model: Event, as: 'event', attributes: ['id', 'type'] }]
  });

  let carried = 0;
  for (const assignment of pendingAssignments) {
    if (!assignment.event || !CARRY_FORWARD_TYPES.includes(assignment.event.type)) continue;

    const originalMonth = assignment.original_month || prev.month;
    const originalYear = assignment.original_year || prev.year;
    const wasCreated = await createIfMissing({
      field_user_id: assignment.field_user_id,
      event_id: assignment.event_id,
      month,
      year,
      status: 'carry',
      is_carry_forward: true,
      original_month: originalMonth,
      original_year: originalYear,
      carry_count: (assignment.carry_count || 0) + 1
    }, {
      field_user_id: assignment.field_user_id,
      event_id: assignment.event_id,
      month,
      year,
      is_carry_forward: true,
      original_month: originalMonth,
      original_year: originalYear
    });

    if (wasCreated) carried++;
  }

  return { checked: pendingAssignments.length, carried };
};

const ensureAssignmentsForMonth = async (month, year) => {
  const today = new Date();
  const currentCreated = await assignCurrentDueEvents(month, year, today);
  const carry = await carryForwardPendingAssignments(month, year);

  return {
    month,
    year,
    current_assignments_created: currentCreated,
    carry_forward_checked: carry.checked,
    carry_forward_created: carry.carried
  };
};

module.exports = {
  ACTIVE_STATUSES,
  PERIODIC_TYPES,
  activeUserWhere,
  monthBounds,
  previousMonth,
  matchesAssignedTo,
  getDueMonths,
  isEventDueInMonth,
  ensureAssignmentsForMonth
};
