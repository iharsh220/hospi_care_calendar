const cron = require('node-cron');
const { ensureAssignmentsForMonth } = require('./assignmentService');
const { sendReminderEmails } = require('./mailService');

let started = false;

const currentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

const startScheduler = () => {
  if (started || String(process.env.DISABLE_SCHEDULER || '').toLowerCase() === 'true') return;
  started = true;

  const timezone = process.env.TZ || 'Asia/Kolkata';

  cron.schedule('15 0 1 * *', async () => {
    const { month, year } = currentMonthYear();
    try {
      await ensureAssignmentsForMonth(month, year);
    } catch (err) {
      console.error('Assignment scheduler error:', err);
    }
  }, { timezone });

  cron.schedule('0 9 * * 1,5', async () => {
    const { month, year } = currentMonthYear();
    try {
      await sendReminderEmails(month, year);
    } catch (err) {
      console.error('Reminder email scheduler error:', err);
    }
  }, { timezone });
};

module.exports = { startScheduler };
