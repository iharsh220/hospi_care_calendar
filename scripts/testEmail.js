const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sendMail } = require('../services/mailService');

const recipient = 'harsh.gohil@alembic.co.in';

async function run() {
  const now = new Date();

  console.log(`[TEST EMAIL] Sending test email to ${recipient}`);

  const info = await sendMail({
    to: recipient,
    subject: `[FieldTrack] Test Email - ${now.toLocaleString('en-IN')}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>FieldTrack Test Email</h2>
        <p>This is a test email from Hospital Care Calendar Automation.</p>
        <p><strong>Sent at:</strong> ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
      </div>
    `,
  });

  console.log(`[TEST EMAIL] Accepted: ${(info.accepted || []).join(', ') || 'none'}`);
  console.log(`[TEST EMAIL] Message ID: ${info.messageId || 'n/a'}`);
}

run().catch(err => {
  console.error('[TEST EMAIL] Failed:', err.message);
  process.exit(1);
});
