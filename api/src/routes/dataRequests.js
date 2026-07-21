const express = require('express');
const router  = express.Router();
const { sendEmail } = require('../services/email');

router.post('/', async (req, res) => {
  const { phone, type, details } = req.body;
  if (!phone || !type) return res.status(400).json({ error: 'phone and type required' });

  try {
    await sendEmail({
      to: process.env.SUPPORT_EMAIL || 'support@verified.gh',
      subject: `Data ${type} request — ${phone}`,
      html: `<p>Phone: ${phone}</p><p>Type: ${type}</p><p>Details: ${details || 'none'}</p>`
    });
    res.json({ message: 'Request received' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

module.exports = router;