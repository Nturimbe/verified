const express = require('express');
const router  = express.Router();
const path    = require('path');

// ── Buyer payment page — /pay/:id ─────────────────────────────────────────────
router.get('/pay/:id', (req, res) => {
  res.redirect(`/pay.html?id=${req.params.id}`);
});


module.exports = router;