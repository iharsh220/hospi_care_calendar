const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { EventAssignment, Event, Organogram } = require('../models');
const { ensureAssignmentsForMonth } = require('./assignmentService');

const createTransport = () => {
  if (!process.env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  });
};

const dueDateForEvent = (event, year) => {
  if (!event.event_date) return null;
  const date = new Date(event.event_date);
  if (event.type === 'yearly') date.setFullYear(year);
  return date;
};

const shouldSendReminder = (assignment, today) => {
  const event = assignment.event;
  if (!event) return false;
  if (assignment.status === 'done') return false;
  if (assignment.is_carry_forward) return true;

  const date = dueDateForEvent(event, today.getFullYear());
  if (!date) return true;

  const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  if (event.type === 'yearly' || event.type === 'specific') {
    return diffDays >= 0 && diffDays <= 7;
  }
  return true;
};

const buildSubject = (assignment) => {
  const prefix = assignment.is_carry_forward ? 'Carry-forward reminder' : 'Event reminder';
  return `${prefix}: ${assignment.event.name}`;
};

const buildText = (assignment) => {
  const event = assignment.event;
  const user = assignment.fieldUser;
  const date = dueDateForEvent(event, assignment.year);
  const dueLine = date ? `Due date: ${date.toISOString().slice(0, 10)}\n` : '';
  const carryLine = assignment.is_carry_forward
    ? `This task was carried forward ${assignment.carry_count || 1} time(s).\n`
    : '';

  return [
    `Hello ${user.emp_name || 'Team'},`,
    '',
    `Please complete this event: ${event.name}`,
    event.description ? `Details: ${event.description}` : '',
    dueLine.trim(),
    carryLine.trim(),
    '',
    'Regards,',
    'Hospital Care Calendar Automation'
  ].filter(Boolean).join('\n');
};

const sendReminderEmails = async (month, year) => {
  await ensureAssignmentsForMonth(month, year);

  const transport = createTransport();
  const assignments = await EventAssignment.findAll({
    where: {
      month,
      year,
      status: { [Op.ne]: 'done' }
    },
    include: [
      { model: Event, as: 'event', where: { is_active: true } },
      { model: Organogram, as: 'fieldUser', attributes: ['emp_name', 'emailid'] }
    ]
  });

  const today = new Date();
  const reminders = assignments.filter(a => a.fieldUser && a.fieldUser.emailid && shouldSendReminder(a, today));

  if (!transport) {
    return {
      configured: false,
      message: 'SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM to send email.',
      eligible: reminders.length,
      sent: 0
    };
  }

  let sent = 0;
  const failed = [];
  for (const assignment of reminders) {
    try {
      await transport.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: assignment.fieldUser.emailid,
        subject: buildSubject(assignment),
        text: buildText(assignment)
      });
      sent++;
    } catch (err) {
      failed.push({ assignment_id: assignment.id, emailid: assignment.fieldUser.emailid, error: err.message });
    }
  }

  return {
    configured: true,
    eligible: reminders.length,
    sent,
    failed
  };
};

module.exports = { sendReminderEmails };
