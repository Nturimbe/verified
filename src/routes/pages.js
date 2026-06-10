const express = require('express');
const router  = express.Router();
const path    = require('path');

// ── Buyer payment page — /pay/:id ─────────────────────────────────────────────
router.get('/pay/:id', (req, res) => {
  res.redirect(`/pay.html?id=${req.params.id}`);
});

// ── Admin dashboard ───────────────────────────────────────────────────────────
// Served from views/ — NOT public/ — so it cannot be accessed directly by URL
router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../views/admin.html'));
});

module.exports = router;