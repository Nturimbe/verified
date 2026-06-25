require('dotenv').config();
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log(`[EMAIL SKIP] No RESEND_API_KEY. Would have sent: ${subject} to ${to}`);
    return null;
  }
  if (!to || to.includes('@verified.gh')) {
    // Skip placeholder emails we generated for phone-only buyers
    return null;
  }
  try {
    const result = await resend.emails.send({
      from:    'Verified <noreply@verified.gh>',
      to,
      subject,
      html
    });
    console.log(`[EMAIL] Sent "${subject}" to ${to}`);
    return result;
  } catch (error) {
    console.error(`[EMAIL] Failed to ${to}:`, error.message);
    return null;
  }
}

const emailTemplates = {
  paymentReceived: ({ itemName, amount, transactionId }) => ({
    subject: `Payment confirmed — ${itemName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <div style="background:#2E7D52;padding:24px;text-align:center;">
          <h1 style="color:#E8A020;margin:0;font-size:24px;">✓ Verified</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9;">
          <h2 style="color:#1B5C3A;">Payment Secured</h2>
          <p style="color:#555;line-height:1.6;">
            Your payment of <strong>GHS ${amount}</strong> for
            <strong>${itemName}</strong> is safely held in escrow.
          </p>
          <p style="color:#555;line-height:1.6;">
            Funds will only be released to the seller after you confirm
            receipt of your item. If anything goes wrong, we step in.
          </p>
          <p style="color:#888;font-size:12px;margin-top:20px;">
            Transaction ID: ${transactionId.split('-')[0]}...
          </p>
        </div>
        <div style="background:#145230;padding:16px;text-align:center;">
          <p style="color:#A8C5B0;font-size:12px;margin:0;">
            Protected by Verified Escrow · support@verified.gh
          </p>
        </div>
      </div>`
  }),

  itemDispatched: ({ itemName, confirmUrl, transactionId }) => ({
    subject: `Your item is on the way — ${itemName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <div style="background:#2E7D52;padding:24px;text-align:center;">
          <h1 style="color:#E8A020;margin:0;font-size:24px;">✓ Verified</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9;">
          <h2 style="color:#1B5C3A;">📦 Item Dispatched</h2>
          <p style="color:#555;line-height:1.6;">
            The seller has dispatched your <strong>${itemName}</strong>.
          </p>
          <p style="color:#555;line-height:1.6;">
            When you receive it, please confirm receipt using the button below.
            Funds are released to the seller only after you confirm.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${confirmUrl}"
               style="background:#E8A020;color:white;padding:14px 32px;
               border-radius:8px;text-decoration:none;font-weight:bold;
               font-size:15px;">
              Confirm Receipt
            </a>
          </div>
          <p style="color:#888;font-size:12px;">
            Transaction ID: ${transactionId.split('-')[0]}...
          </p>
        </div>
        <div style="background:#145230;padding:16px;text-align:center;">
          <p style="color:#A8C5B0;font-size:12px;margin:0;">
            Protected by Verified Escrow · support@verified.gh
          </p>
        </div>
      </div>`
  }),

  transactionComplete: ({ itemName, amount }) => ({
    subject: `Transaction complete — ${itemName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <div style="background:#2E7D52;padding:24px;text-align:center;">
          <h1 style="color:#E8A020;margin:0;font-size:24px;">✓ Verified</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9;">
          <h2 style="color:#1B5C3A;">✅ Transaction Complete</h2>
          <p style="color:#555;line-height:1.6;">
            Your transaction for <strong>${itemName}</strong> is complete.
            GHS ${amount} has been released to the seller.
          </p>
          <p style="color:#555;line-height:1.6;">
            Thank you for trading safely with Verified.
          </p>
        </div>
        <div style="background:#145230;padding:16px;text-align:center;">
          <p style="color:#A8C5B0;font-size:12px;margin:0;">
            Protected by Verified Escrow · support@verified.gh
          </p>
        </div>
      </div>`
  }),

  disputeRaised: ({ itemName, disputeId }) => ({
    subject: `Dispute raised — ${itemName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <div style="background:#2E7D52;padding:24px;text-align:center;">
          <h1 style="color:#E8A020;margin:0;font-size:24px;">✓ Verified</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9;">
          <h2 style="color:#C0392B;">🔒 Dispute Raised</h2>
          <p style="color:#555;line-height:1.6;">
            A dispute has been raised on your transaction for
            <strong>${itemName}</strong>. Funds are frozen.
          </p>
          <p style="color:#555;line-height:1.6;">
            Our team will review and contact both parties within 48 hours.
          </p>
          <p style="color:#888;font-size:12px;">
            Dispute reference: ${disputeId.split('-')[0]}...
          </p>
        </div>
        <div style="background:#145230;padding:16px;text-align:center;">
          <p style="color:#A8C5B0;font-size:12px;margin:0;">
            Protected by Verified Escrow · disputes@verified.gh
          </p>
        </div>
      </div>`
  })
};

module.exports = { sendEmail, emailTemplates };