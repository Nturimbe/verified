require('dotenv').config();
const AfricasTalking = require('africastalking');

const at = AfricasTalking({
  username: process.env.AT_USERNAME,
  apiKey:   process.env.AT_API_KEY
});

const sms = at.SMS;

async function sendSMS(to, message) {
  try {
    const formatted = to.startsWith('+') ? to : '+233' + to.slice(1);

    console.log(`[SMS] Sending to ${formatted}: "${message.substring(0, 50)}..."`);

    const result = await sms.send({
      to:      [formatted],
      message: message
    });

    console.log('[SMS] Result:', JSON.stringify(result.SMSMessageData));
    return result;

  } catch (error) {
    console.error('[SMS] Failed:', error.message);
    return null;
  }
}

const messages = {
  FUNDED: (itemName, amount) =>
    `Verified: Payment of GHS ${amount} secured for "${itemName}". Dispatch the item to release your funds.`,

  DISPATCHED: (itemName, confirmUrl) =>
    `Verified: Your item "${itemName}" is on the way. Confirm receipt here: ${confirmUrl}`,

  CONFIRMED: (itemName, amount) =>
    `Verified: GHS ${amount} released to your MoMo. Transaction complete. Thank you for using Verified.`,

  DISPUTED: (itemName) =>
    `Verified: A dispute has been raised on "${itemName}". Our team will contact both parties within 48 hours.`,

  RESOLVED_BUYER: (itemName) =>
    `Verified: Your dispute for "${itemName}" has been resolved. Your refund is being processed.`,

  RESOLVED_SELLER: (itemName, amount) =>
    `Verified: Your transaction for "${itemName}" is complete. GHS ${amount} has been sent to your MoMo.`
};

module.exports = { sendSMS, messages };