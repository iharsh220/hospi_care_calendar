require('dotenv').config();

const { sequelize } = require('../models');
const { Op } = require('sequelize');
const { Event, EventAssignment } = require('../models');
const {
  generateAssignmentsForPeriod,
  getEligibleUsers,
  processCarryForwards,
  shouldEventFireInMonth,
} = require('../services/assignmentService');

function readArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find(arg => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function parseMonthYear() {
  const now = new Date();
  const month = parseInt(readArg('month'), 10) || now.getMonth() + 1;
  const year = parseInt(readArg('year'), 10) || now.getFullYear();

  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  return { month, year };
}

async function run() {
  const { month, year } = parseMonthYear();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const sendEmails = process.argv.includes('--send-emails');
  const dryRun = process.argv.includes('--dry-run');

  console.log(`[TEST] Running month-start for ${month}/${year}`);
  console.log(`[TEST] Carry-forward source: ${prevMonth}/${prevYear}`);
  console.log(`[TEST] Emails: ${sendEmails ? 'enabled' : 'disabled'}`);
  console.log(`[TEST] Mode: ${dryRun ? 'dry-run' : 'write'}`);

  await sequelize.authenticate();

  if (dryRun) {
    const carryForwardCandidates = await EventAssignment.count({
      where: {
        period_month: prevMonth,
        period_year: prevYear,
        status: { [Op.in]: ['pending', 'carry'] },
      },
      include: [{ model: Event, as: 'event', where: { frequency: { [Op.ne]: 'yearly' } } }],
    });

    const events = await Event.findAll({ where: { is_active: true } });
    let newAssignmentCandidates = 0;
    for (const event of events) {
      if (!shouldEventFireInMonth(event, month, year)) continue;
      const users = await getEligibleUsers(event.assigned_to);
      newAssignmentCandidates += users.length;
    }

    console.log(`[TEST] Carry-forward candidates: ${carryForwardCandidates}`);
    console.log(`[TEST] Regular assignment candidates: ${newAssignmentCandidates}`);
    return;
  }

  await processCarryForwards(prevMonth, prevYear, { sendEmails });
  await generateAssignmentsForPeriod(month, year);

  console.log('[TEST] Month-start process completed');
}

run()
  .catch(err => {
    console.error('[TEST] Month-start failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
