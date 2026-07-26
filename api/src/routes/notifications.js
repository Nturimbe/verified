const express = require('express');
const router  = express.Router();
const prisma  = require('../db');

router.get('/:phone', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { phone: req.params.phone },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
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