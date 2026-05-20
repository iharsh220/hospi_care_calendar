const nodemailer = require('nodemailer');

const mailPort = parseInt(process.env.MAIL_PORT || process.env.EMAIL_PORT, 10) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || process.env.EMAIL_HOST,
  port: mailPort,
  secure: mailPort === 465,
  auth: {
    user: process.env.MAIL_USER || process.env.EMAIL_USER,
    pass: process.env.MAIL_PASS || process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

async function sendMail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || 'FieldTrack <noreply@fieldtrack.com>',
      to,
      subject,
      html,
    });
    console.log(`[MAIL] Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[MAIL ERROR] Failed to ${to}:`, err.message);
  }
}

function buildReminderHtml(userName, eventName, dueInfo) {
  return `
  <div style="font-family:DM Sans,Arial,sans-serif;max-width:560px;margin:auto;background:#f0f4f8;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#0f172a,#1e56a0);padding:24px 32px;text-align:center">
      <h2 style="color:#fff;margin:0;font-size:20px">FieldTrack</h2>
      <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">Field Calendar Reminder</p>
    </div>
    <div style="padding:28px 32px;background:#fff">
      <p style="color:#0f172a;font-size:15px">Hi <strong>${userName}</strong>,</p>
      <p style="color:#475569;font-size:13px;line-height:1.6">
        This is a reminder that the following event is due soon:
      </p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:18px 0">
        <p style="margin:0;font-size:15px;font-weight:600;color:#1e3a8a">📋 ${eventName}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#1d4ed8">${dueInfo}</p>
      </div>
      <p style="color:#475569;font-size:12px;line-height:1.6">
        Please log in to FieldTrack and mark the event as complete with a proof image before the deadline.
      </p>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;font-size:11px;color:#94a3b8">
      FieldTrack · Hospital Care Calendar Automation · Alembic Pharmaceuticals
    </div>
  </div>`;
}

function buildCarryForwardHtml(userName, eventName, month) {
  return `
  <div style="font-family:DM Sans,Arial,sans-serif;max-width:560px;margin:auto;background:#f0f4f8;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#92400e,#b45309);padding:24px 32px;text-align:center">
      <h2 style="color:#fff;margin:0;font-size:20px">FieldTrack</h2>
      <p style="color:#fde68a;margin:4px 0 0;font-size:13px">Carry-Forward Alert</p>
    </div>
    <div style="padding:28px 32px;background:#fff">
      <p style="color:#0f172a;font-size:15px">Hi <strong>${userName}</strong>,</p>
      <p style="color:#475569;font-size:13px;line-height:1.6">
        You did not complete the following event last month. It has been <strong>carried forward</strong> to ${month}:
      </p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:18px 0">
        <p style="margin:0;font-size:15px;font-weight:600;color:#92400e">↻ ${eventName}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#b45309">This is now added to your ${month} tasks. Please complete it at the earliest.</p>
      </div>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;text-align:center;font-size:11px;color:#94a3b8">
      FieldTrack · Hospital Care Calendar Automation · Alembic Pharmaceuticals
    </div>
  </div>`;
}

module.exports = { sendMail, buildReminderHtml, buildCarryForwardHtml };
