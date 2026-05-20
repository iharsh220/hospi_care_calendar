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
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'FieldTrack <noreply@fieldtrack.com>',
      to,
      subject,
      html,
    });
    console.log(`[MAIL] Sent to ${to}: ${subject}`);
    return info;
  } catch (err) {
    console.error(`[MAIL ERROR] Failed to ${to}:`, err.message);
    throw err;
  }
}

function buildEmailLayout({ title, subtitle, accentColor, lightColor, borderColor, bodyHtml }) {
  return `
  <div style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#172033">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef2f7">
      <tr>
        <td align="center" style="padding:28px 12px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:600px;background:#ffffff;border:1px solid #d9e2ec;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08)">
            <tr>
              <td style="background:${accentColor};padding:26px 32px;text-align:left">
                <p style="margin:0 0 8px;font-size:11px;line-height:1.2;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:#dbeafe">FieldTrack</p>
                <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:700;color:#ffffff">${title}</h1>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#e0f2fe">${subtitle}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px 28px;background:#ffffff">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;text-align:center">
                <p style="margin:0;font-size:11px;line-height:1.5;color:#64748b">FieldTrack | Hospital Care Calendar Automation | Alembic Pharmaceuticals</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
}

function buildInfoBox({ accentColor, lightColor, borderColor, label, eventName, detail }) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:22px 0;background:${lightColor};border:1px solid ${borderColor};border-radius:10px">
      <tr>
        <td style="padding:18px 18px 16px;border-left:5px solid ${accentColor};border-radius:10px">
          <p style="margin:0 0 8px;font-size:11px;line-height:1.2;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${accentColor}">${label}</p>
          <p style="margin:0;font-size:17px;line-height:1.35;font-weight:700;color:#0f172a">${eventName}</p>
          <p style="margin:8px 0 0;font-size:13px;line-height:1.55;color:#475569">${detail}</p>
        </td>
      </tr>
    </table>`;
}

function buildReminderHtml(userName, eventName, dueInfo) {
  return buildEmailLayout({
    title: 'Field Calendar Reminder',
    subtitle: 'A pending activity needs your attention.',
    accentColor: '#1e56a0',
    lightColor: '#eff6ff',
    borderColor: '#bfdbfe',
    bodyHtml: `
      <p style="margin:0;font-size:15px;line-height:1.6;color:#334155">Hi <strong style="color:#0f172a">${userName}</strong>,</p>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.65;color:#475569">This is a reminder that the following event is due soon.</p>
      ${buildInfoBox({
        accentColor: '#1e56a0',
        lightColor: '#eff6ff',
        borderColor: '#bfdbfe',
        label: 'Upcoming Event',
        eventName,
        detail: dueInfo,
      })}
      <p style="margin:0;font-size:13px;line-height:1.65;color:#475569">Please log in to FieldTrack and mark the event as complete with a proof image before the deadline.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse">
        <tr>
          <td style="background:#1e56a0;border-radius:7px">
            <span style="display:inline-block;padding:11px 18px;font-size:13px;font-weight:700;color:#ffffff">Open FieldTrack</span>
          </td>
        </tr>
      </table>
    `,
  });
}

function buildCarryForwardHtml(userName, eventName, month) {
  return buildEmailLayout({
    title: 'Carry-Forward Alert',
    subtitle: `This item has moved into ${month}.`,
    accentColor: '#b45309',
    lightColor: '#fffbeb',
    borderColor: '#fde68a',
    bodyHtml: `
      <p style="margin:0;font-size:15px;line-height:1.6;color:#334155">Hi <strong style="color:#0f172a">${userName}</strong>,</p>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.65;color:#475569">You did not complete the following event last month. It has been carried forward to <strong style="color:#92400e">${month}</strong>.</p>
      ${buildInfoBox({
        accentColor: '#b45309',
        lightColor: '#fffbeb',
        borderColor: '#fde68a',
        label: 'Carried Forward',
        eventName,
        detail: `This is now added to your ${month} tasks. Please complete it at the earliest.`,
      })}
      <p style="margin:0;font-size:13px;line-height:1.65;color:#475569">Complete this activity from your FieldTrack task list to clear the pending status.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse">
        <tr>
          <td style="background:#b45309;border-radius:7px">
            <span style="display:inline-block;padding:11px 18px;font-size:13px;font-weight:700;color:#ffffff">Review Task</span>
          </td>
        </tr>
      </table>
    `,
  });
}

module.exports = { sendMail, buildReminderHtml, buildCarryForwardHtml };
