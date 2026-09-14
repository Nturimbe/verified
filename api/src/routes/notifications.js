const express = require('express');
const router  = express.Router();
const prisma  = require('../db');
const { requireAuth } = require('./auth');

router.get('/:phone', requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { phone: req.user.phone },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.phone !== req.user.phone) {
      return res.status(403).json({ error: 'This notification does not belong to you.' });
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });
    res.json({ message: 'Marked read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

module.exports = router;