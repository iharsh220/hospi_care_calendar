const cron = require('node-cron');
const { Op } = require('sequelize');
const { Event, EventAssignment, Organogram } = require('../models');
const { sendMail, buildReminderHtml } = require('./mailService');
const { generateAssignmentsForPeriod, processCarryForwards } = require('./assignmentService');

// ─────────────────────────────────────────
//  EVERY MONDAY & FRIDAY: send reminders for recurring events
//  "0 8 * * 1,5" = 8 AM every Monday and Friday
// ─────────────────────────────────────────
cron.schedule('0 8 * * 1,5', async () => {
  console.log('[CRON] Running recurring event email reminders...');
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get all pending/carry assignments for current month
    const pending = await EventAssignment.findAll({
      where: {
        period_month: month,
        period_year: year,
        status: { [Op.in]: ['pending', 'carry', 'remind'] },
      },
      include: [
        {
          model: Event,
          as: 'event',
          where: {
            frequency: { [Op.in]: ['monthly', 'bi-monthly', 'quarterly', 'half-yearly'] },
            is_active: true,
          },
        },
        { model: Organogram, as: 'user' },
      ],
    });

    for (const assignment of pending) {
      const user = assignment.user;
      const event = assignment.event;
      if (!user?.emailid) continue;

      const monthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const dueInfo = assignment.is_carry_forward
        ? `Carry-forward from last month — complete anytime in ${monthLabel}`
        : `Due anytime in ${monthLabel}`;

      await sendMail({
        to: user.emailid,
        subject: `[FieldTrack] Reminder: ${event.name} — ${monthLabel}`,
        html: buildReminderHtml(user.emp_name, event.name, dueInfo),
      });
    }

    console.log(`[CRON] Recurring reminders sent for ${pending.length} assignments`);
  } catch (err) {
    console.error('[CRON] Reminder error:', err.message);
  }
});

// ─────────────────────────────────────────
//  DAILY: 7-day advance reminder for yearly events
// ─────────────────────────────────────────
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] Running 7-day advance reminder for yearly events...');
  try {
    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const targetDate = sevenDaysLater.toISOString().split('T')[0];

    const yearlyEvents = await Event.findAll({
      where: {
        frequency: 'yearly',
        event_date: targetDate,
        seven_day_reminder: true,
        is_active: true,
      },
    });

    for (const event of yearlyEvents) {
      const assignments = await EventAssignment.findAll({
        where: {
          event_id: event.id,
          status: { [Op.in]: ['pending', 'remind', 'upcoming'] },
        },
        include: [{ model: Organogram, as: 'user' }],
      });

      for (const assignment of assignments) {
        const user = assignment.user;
        if (!user?.emailid) continue;

        // Update status to remind
        await assignment.update({ status: 'remind' });

        await sendMail({
          to: user.emailid,
          subject: `[FieldTrack] 7-Day Reminder: ${event.name} on ${event.event_date}`,
          html: buildReminderHtml(
            user.emp_name,
            event.name,
            `Scheduled for ${event.event_date} — 7 days away. Please prepare and complete on time.`
          ),
        });
      }
    }

    console.log(`[CRON] 7-day advance reminders sent for ${yearlyEvents.length} events`);
  } catch (err) {
    console.error('[CRON] 7-day reminder error:', err.message);
  }
});

// ─────────────────────────────────────────
//  1st of each month: generate assignments + carry-forwards
// ─────────────────────────────────────────
cron.schedule('0 0 1 * *', async () => {
  console.log('[CRON] Running month-start: generating assignments and carry-forwards...');
  try {
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    // Carry forward from previous month
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;
    await processCarryForwards(prevMonth, prevYear);

    // Generate new assignments for current month
    await generateAssignmentsForPeriod(curMonth, curYear);

    console.log(`[CRON] Month-start processing done for ${curMonth}/${curYear}`);
  } catch (err) {
    console.error('[CRON] Month-start cron error:', err.message);
  }
});

module.exports = {};
