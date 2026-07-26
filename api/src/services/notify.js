const prisma = require('../db');

async function createNotification({ phone, title, message, type = 'INFO', link = null }) {
  try {
    await prisma.notification.create({
      data: { phone, title, message, type, link }
    });
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
}

module.exports = { createNotification };