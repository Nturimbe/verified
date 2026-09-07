const { sendEmail } = require('./email');

const ALERT_EMAIL = process.env.ALERT_EMAIL || process.env.SUPPORT_EMAIL || 'support@verified.gh';

async function alertCrash(source, error) {
  try {
    await sendEmail({
      to: ALERT_EMAIL,
      subject: `Verified API crash — ${source}`,
      html: `<p><strong>Source:</strong> ${source}</p>
             <p><strong>Message:</strong> ${error?.message || error}</p>
             <pre>${error?.stack || ''}</pre>
             <p>Time: ${new Date().toISOString()}</p>`
    });
  } catch (e) {
    console.error('Failed to send crash alert email:', e.message);
  }
}

module.exports = { alertCrash };