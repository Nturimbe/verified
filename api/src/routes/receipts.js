const express = require('express');
const router  = express.Router();
const prisma  = require('../db');
const PDFDocument = require('pdfkit');
const path = require('path');
const { requireAuth } = require('./auth');

router.get('/:transactionId', requireAuth, async (req, res) => {
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: req.params.transactionId },
      include: { ledgerEntries: true }
    });

    if (!tx || tx.state !== 'RESOLVED') {
      return res.status(404).json({ error: 'Receipt only available for completed transactions' });
    }

    const callerPhone = req.user.phone;
    const isParty = callerPhone === tx.sellerMomo || callerPhone === tx.buyerPhone;
    if (!isParty) {
      return res.status(403).json({ error: 'You are not a party to this transaction.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=verified-receipt-${tx.id.split('-')[0]}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Watermark — large, centered, low opacity, drawn first so text sits on top of it
    const logoPath = path.join(__dirname, '..', '..', 'assets', 'logo.png');
    try {
      doc.save();
      doc.opacity(0.06);
      const wmSize = 320;
      doc.image(
        logoPath,
        (doc.page.width - wmSize) / 2,
        (doc.page.height - wmSize) / 2,
        { width: wmSize }
      );
      doc.restore();
    } catch (e) {
      console.error('Watermark skipped:', e.message);
    }

    doc.opacity(1);
    doc.fontSize(20).fillColor('#2E7D52').text('Verified', { align: 'left' });
    doc.fontSize(10).fillColor('#888').text('Transaction Receipt', { align: 'left' });
    doc.moveDown(2);

    doc.fontSize(12).fillColor('#000');
    doc.text(`Transaction ID: ${tx.id}`);
    doc.text(`Item: ${tx.itemName}`);
    doc.text(`Amount: GHS ${tx.amount.toLocaleString()}`);
    doc.text(`Seller MoMo: ${tx.sellerMomo.slice(0, 3)}****${tx.sellerMomo.slice(-4)}`);
    doc.text(`Date: ${new Date(tx.createdAt).toLocaleDateString('en-GH')}`);
    doc.text(`Status: ${tx.state}`);
    doc.moveDown(1);

    doc.fontSize(14).text('Ledger Entries', { underline: true });
    doc.moveDown(0.5);
    tx.ledgerEntries.forEach(entry => {
      doc.fontSize(10).text(
        `${entry.entryType} — ${entry.account} — GHS ${entry.amount} — ${new Date(entry.createdAt).toLocaleDateString()}`
      );
    });

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#888').text(
      'This receipt confirms a transaction coordinated through Verified using ' +
      "Paystack Ghana's licensed payment infrastructure. " +
      'For queries, contact support@verified.gh',
      { align: 'left' }
    );

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

module.exports = router;