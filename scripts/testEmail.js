const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sendMail, buildReminderHtml, buildCarryForwardHtml } = require('../services/mailService');

const recipient = 'harsh.gohil@alembic.co.in';

async function run() {
  const now = new Date();

  console.log(`[TEST EMAIL] Sending test email to ${recipient}`);

  const info = await sendMail({
    to: recipient,
    subject: `[FieldTrack] Template Test Email - ${now.toLocaleString('en-IN')}`,
    html: `
      ${buildReminderHtml(
        'Harsh Gohil',
        'Monthly Safety Inspection',
        'Due anytime in May 2026'
      )}
      <div style="height:24px"></div>
      ${buildCarryForwardHtml(
        'Harsh Gohil',
        'Equipment Maintenance Log',
        'June 2026'
      )}
    `,
  });

  console.log(`[TEST EMAIL] Accepted: ${(info.accepted || []).join(', ') || 'none'}`);
  console.log(`[TEST EMAIL] Message ID: ${info.messageId || 'n/a'}`);
}

run().catch(err => {
  console.error('[TEST EMAIL] Failed:', err.message);
  process.exit(1);
});
