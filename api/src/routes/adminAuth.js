const express  = require('express');
const router   = express.Router();
const prisma   = require('../db');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const ADMIN_JWT_SECRET  = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
const MAX_ATTEMPTS       = 5;
const LOCKOUT_MINUTES     = 30;
const { revoke } = require('../services/revocation');

// POST /admin/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((admin.lockedUntil - new Date()) / 60000);
      return res.status(423).json({
        error: `Account locked due to repeated failed attempts. Try again in ${minutesLeft} minute(s).`
      });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);

    if (!valid) {
      const attempts = admin.failedAttempts + 1;
      const shouldLock = attempts >= MAX_ATTEMPTS;

      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedAttempts: shouldLock ? 0 : attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
            : null
        }
      });

      if (shouldLock) {
        return res.status(423).json({
          error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`
        });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data:  { failedAttempts: 0, lockedUntil: null }
    });

       const jti = crypto.randomUUID();
    const token = jwt.sign(
      { id: admin.id, name: admin.name, role: admin.role, jti },
      ADMIN_JWT_SECRET,
      { expiresIn: '12h' }
    );

    const { deriveCsrfToken } = require('../middleware/auth');
    const csrfToken = deriveCsrfToken(jti);

    res.cookie('admin_session', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge:   12 * 60 * 60 * 1000
    });

    res.json({
      message: 'Logged in',
      name:    admin.name,
      role:    admin.role,
      csrfToken
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /admin/auth/me
router.get('/me', requireAdmin, (req, res) => {
  res.json({ name: req.admin.name, role: req.admin.role });
});

// POST /admin/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.admin_session;
  if (token) {
    try {
      const payload = jwt.verify(token, ADMIN_JWT_SECRET);
      await revoke(payload.jti, new Date(payload.exp * 1000));
    } catch {
      // Token already invalid/expired — nothing to revoke
    }
  }
  res.clearCookie('admin_session');
  res.json({ message: 'Logged out' });
});

// POST /admin/auth/create — super admin only
router.post('/create', requireSuperAdmin, async (req, res) => {
  const { name, email, password, role = 'ADMIN' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        passwordHash,
        role:      role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
        createdBy: req.adminName || 'SUPER_ADMIN'
      }
    });

    res.status(201).json({
      message: 'Admin created',
      id:      admin.id,
      name:    admin.name,
      email:   admin.email,
      role:    admin.role
    });

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// GET /admin/auth/list — super admin only
router.get('/list', requireSuperAdmin, async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdBy: true, createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// PATCH /admin/auth/:id/deactivate — super admin only
router.patch('/:id/deactivate', requireSuperAdmin, async (req, res) => {
  try {
    await prisma.admin.update({
      where: { id: req.params.id },
      data:  { isActive: false }
    });
    res.json({ message: 'Admin deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate admin' });
  }
});

module.exports = router;