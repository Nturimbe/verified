const express = require('express');
const router  = express.Router();
const prisma  = require('../db');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { sendSMS } = require('../services/sms');
const { isRevoked, revoke } = require('../services/revocation');

const JWT_SECRET = process.env.JWT_SECRET;
const OTP_EXPIRY_MINUTES = 10;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/request-otp
router.post('/request-otp', async (req, res) => {
  const { phone } = req.body;

  if (!phone || phone.length < 10) {
    return res.status(400).json({ error: 'Valid phone number is required' });
  }

  const normalizedPhone = phone.replace(/\s/g, '').replace(/^\+233/, '0');

  try {
    const code = generateOtp();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpRequest.create({
      data: { phone: normalizedPhone, codeHash, expiresAt }
    });

    await sendSMS(
      normalizedPhone,
      `Your Verified login code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Never share this code.`
    );

    res.json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code are required' });
  }

  const normalizedPhone = phone.replace(/\s/g, '').replace(/^\+233/, '0');

  try {
    const otpRequest = await prisma.otpRequest.findFirst({
      where: {
        phone:     normalizedPhone,
        verified:  false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRequest) {
      return res.status(400).json({ error: 'OTP expired or not found. Please request a new one.' });
    }

    const validCode = await bcrypt.compare(code, otpRequest.codeHash);
    if (!validCode) {
      return res.status(400).json({ error: 'Incorrect code.' });
    }

    await prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data:  { verified: true }
    });

       const crypto = require('crypto');
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { phone: normalizedPhone, jti },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('verified_session', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge:   30 * 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Logged in successfully', phone: normalizedPhone });

  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// GET /auth/me — check current session
router.get('/me', (req, res) => {
  const token = req.cookies?.verified_session;
  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ phone: payload.phone });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.verified_session;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      await revoke(payload.jti, new Date(payload.exp * 1000));
    } catch {
      // Token already invalid/expired — nothing to revoke
    }
  }
  res.clearCookie('verified_session');
  res.json({ message: 'Logged out' });
});

module.exports = router;

// Middleware other routes can use
async function requireAuth(req, res, next) {
  const token = req.cookies?.verified_session;
  if (!token) {
    return res.status(401).json({ error: 'Please log in' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (await isRevoked(payload.jti)) {
      return res.status(401).json({ error: 'Session has been revoked. Please log in again.' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}
module.exports = router;
module.exports.requireAuth = requireAuth;