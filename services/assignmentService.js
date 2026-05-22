const { Op } = require('sequelize');
const { Organogram, Event, EventAssignment } = require('../models');
const { sendMail, buildCarryForwardHtml } = require('./mailService');

// Map level field to assigned_to category
function levelToCategory(level) {
  if (!level) return null;
  const l = level.trim().toLowerCase();
  if (l.includes('bdm')) return 'BDM';
  if (l === 'am') return 'KAM';
  if (l === 'rm') return 'RM';
  if (l === 'zm') return 'ZM';
  return null;
}

// Should this event fire in a given month/year?
function eventFiringMonths(frequency, startDate) {
  // Returns array of month numbers (1-12) when event is active in a year
  switch (frequency) {
    case 'monthly': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    case 'bi-monthly': return [1, 3, 5, 7, 9, 11]; // Jan, Mar, May...
    case 'quarterly': return [1, 4, 7, 10];
    case 'half-yearly': return [1, 7];
    case 'yearly': return []; // handled separately via event_date
    default: return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
}

function shouldEventFireInMonth(event, month, year) {
  if (event.frequency === 'yearly') {
    if (!event.event_date) return false;
    const d = new Date(event.event_date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  }
  const months = eventFiringMonths(event.frequency);
  return months.includes(month);
}

// Get users eligible for event
async function getEligibleUsers(assigned_to) {
  if (assigned_to === 'all') {
    return Organogram.findAll({ where: { status: { [Op.not]: 'inactive' } } });
  }

  // Handle comma-separated assigned_to values (e.g. "ZM,BDM")
  const categories = assigned_to.split(',').map(cat => cat.trim());

  // Map category to Organogram level filter
  // KAM = AM level, BDM = any level containing "BDM", ZM = ZM, RM = RM
  const levelMap = {
    BDM: { [Op.like]: '%BDM%' },
    KAM: 'AM',
    RM: 'RM',
    ZM: 'ZM',
  };

  // Build OR conditions for each category
  const whereConditions = [];
  for (const category of categories) {
    const levelCondition = levelMap[category];
    if (levelCondition) {
      const whereLevel = typeof levelCondition === 'string'
        ? { level: levelCondition }
        : { level: levelCondition };
      whereConditions.push({ ...whereLevel, status: { [Op.not]: 'inactive' } });
    }
  }

  if (whereConditions.length === 0) return [];

  return Organogram.findAll({ where: { [Op.or]: whereConditions } });
}

// Generate assignments for a given month/year (idempotent)
async function generateAssignmentsForPeriod(month, year) {
  const events = await Event.findAll({ where: { is_active: true } });

  for (const event of events) {
    if (!shouldEventFireInMonth(event, month, year)) continue;

    const users = await getEligibleUsers(event.assigned_to);

    for (const user of users) {
      const existing = await EventAssignment.findOne({
        where: {
          event_id: event.id,
          organogram_id: user.id,
          period_month: month,
          period_year: year,
          is_carry_forward: false,
        },
      });
      if (!existing) {
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
}

// Roll over pending assignments from previous month → new carry-forwards
async function processCarryForwards(fromMonth, fromYear, options = {}) {
  const { sendEmails = true } = options;
  const toMonth = fromMonth === 12 ? 1 : fromMonth + 1;
  const toYear = fromMonth === 12 ? fromYear + 1 : fromYear;

  // Find all pending/carry assignments from previous month that are NOT yearly
  const pending = await EventAssignment.findAll({
    where: {
      period_month: fromMonth,
      period_year: fromYear,
      status: { [Op.in]: ['pending', 'carry'] },
    },
    include: [
      { model: Event, as: 'event', where: { frequency: { [Op.ne]: 'yearly' } } },
      { model: Organogram, as: 'user' },
    ],
  });

  for (const assignment of pending) {
    // Check if carry-forward for this event+user already exists in new month
    const alreadyExists = await EventAssignment.findOne({
      where: {
        event_id: assignment.event_id,
        organogram_id: assignment.organogram_id,
        period_month: toMonth,
        period_year: toYear,
        is_carry_forward: true,
        carry_from_month: fromMonth,
        carry_from_year: fromYear,
      },
    });

    if (!alreadyExists) {
      await EventAssignment.create({
        event_id: assignment.event_id,
        organogram_id: assignment.organogram_id,
        period_month: toMonth,
        period_year: toYear,
        status: 'carry',
        is_carry_forward: true,
        carry_from_month: fromMonth,
        carry_from_year: fromYear,
      });

      // Send carry-forward email
      const user = assignment.user;
      const event = assignment.event;
      if (sendEmails && user?.emailid) {
        const monthLabel = new Date(toYear, toMonth - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        await sendMail({
          to: user.emailid,
          subject: `[FieldTrack] Carry-Forward: ${event.name}`,
          html: buildCarryForwardHtml(user.emp_name, event.name, monthLabel),
        });
      }
    }
  }
}

module.exports = {
  levelToCategory,
  eventFiringMonths,
  shouldEventFireInMonth,
  getEligibleUsers,
  generateAssignmentsForPeriod,
  processCarryForwards,
};
