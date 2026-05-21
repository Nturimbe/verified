const express = require('express');
const router  = express.Router();
const prisma  = require('../db');

// Buyer payment page — /pay/:id
router.get('/pay/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verified — Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; background: #1B3A6B; color: white;
                   display: flex; align-items: center; justify-content: center;
                   min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .box { text-align: center; }
            h2 { color: #C8922A; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>Transaction Not Found</h2>
            <p>This payment link is invalid or has expired.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Mask seller MoMo — show only last 4 digits
    const maskedMomo = transaction.sellerMomo.slice(0, 3) + '****' +
                       transaction.sellerMomo.slice(-4);

    const stateMessages = {
      CREATED:    null,
      FUNDED:     'Payment already secured for this transaction.',
      DISPATCHED: 'This item has been dispatched.',
      CONFIRMED:  'This transaction is complete.',
      RESOLVED:   'This transaction is complete.',
      DISPUTED:   'This transaction is under review.'
    };

    const alreadyPaid = transaction.state !== 'CREATED';
    const stateNote   = stateMessages[transaction.state];

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verified — Pay Securely</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, sans-serif;
            background: #F4F7FB;
            min-height: 100vh;
            padding: 0 0 40px 0;
          }
          .header {
            background: #1B3A6B;
            padding: 18px 20px;
            text-align: center;
          }
          .header h1 {
            color: #C8922A;
            font-size: 26px;
            letter-spacing: 1px;
          }
          .header p {
            color: #AABBD4;
            font-size: 13px;
            margin-top: 4px;
          }
          .card {
            background: white;
            margin: 20px 16px 0;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
          .label {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          .value {
            font-size: 16px;
            color: #1B3A6B;
            font-weight: bold;
            margin-bottom: 16px;
          }
          .amount {
            font-size: 32px;
            color: #1B3A6B;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .escrow-badge {
            background: #EEF3FA;
            border-left: 4px solid #C8922A;
            padding: 14px 16px;
            border-radius: 0 8px 8px 0;
            margin: 16px 0;
          }
          .escrow-badge p {
            font-size: 13px;
            color: #444;
            line-height: 1.5;
          }
          .escrow-badge strong {
            color: #1B3A6B;
          }
          .btn {
            display: block;
            width: 100%;
            padding: 16px;
            background: #C8922A;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 17px;
            font-weight: bold;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            margin-top: 8px;
          }
          .btn:active { opacity: 0.85; }
          .btn-disabled {
            background: #CCCCCC;
            cursor: not-allowed;
          }
          .state-note {
            background: #EEF3FA;
            color: #1B3A6B;
            padding: 14px;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
            margin-top: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 28px;
            color: #888;
            font-size: 12px;
            padding: 0 20px;
          }
          .divider {
            border: none;
            border-top: 1px solid #EEE;
            margin: 16px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✓ Verified</h1>
          <p>Pay. Confirm. Done.</p>
        </div>

        <div class="card">
          <div class="label">Item</div>
          <div class="value">${transaction.itemName}</div>

          <div class="label">Amount</div>
          <div class="amount">GHS ${transaction.amount.toLocaleString()}</div>

          <hr class="divider">

          <div class="label">Seller</div>
          <div class="value">${maskedMomo}</div>

          <div class="label">Delivery Window</div>
          <div class="value">${transaction.deliveryHours} hours</div>

          <div class="escrow-badge">
            <p>
              <strong>Your money is protected.</strong> Verified holds your payment securely.
              The seller only receives funds <strong>after you confirm delivery</strong>.
              If something goes wrong, we step in.
            </p>
          </div>

          ${alreadyPaid
            ? `<div class="state-note">✓ ${stateNote}</div>`
            : `<a href="#" class="btn" id="payBtn">Pay GHS ${transaction.amount.toLocaleString()} Securely</a>`
          }
        </div>

        <div class="footer">
          <p>Transaction ID: ${transaction.id.split('-')[0]}...</p>
          <p style="margin-top:6px;">Protected by Verified Escrow</p>
        </div>

        ${!alreadyPaid ? `
        <script>
          document.getElementById('payBtn').addEventListener('click', async function(e) {
            e.preventDefault();
            this.textContent = 'Initialising payment...';
            this.classList.add('btn-disabled');

            try {
              const response = await fetch('/transactions/initiate-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transactionId: '${transaction.id}',
                  buyerEmail: prompt('Enter your email address for payment receipt:')
                })
              });
              const data = await response.json();
              if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
              } else {
                alert('Could not initialise payment. Please try again.');
                this.textContent = 'Pay GHS ${transaction.amount.toLocaleString()} Securely';
                this.classList.remove('btn-disabled');
              }
            } catch (err) {
              alert('Something went wrong. Please try again.');
            }
          });
        </script>
        ` : ''}
      </body>
      </html>
    `);

  } catch (error) {
    console.error(error);
    res.status(500).send('<h1>Something went wrong. Please try again.</h1>');
  }
});

module.exports = router;