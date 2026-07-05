const express  = require('express');
const router   = express.Router();
const prisma   = require('../db');
const bcrypt   = require('bcryptjs');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');

// POST /admin/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Check legacy single admin first
    if (
      email === 'admin' &&
      password === process.env.ADMIN_SECRET
    ) {
      return res.json({
        token:     process.env.ADMIN_SECRET,
        name:      'Super Admin',
        role:      'SUPER_ADMIN',
        legacy:    true
      });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      token: process.env.ADMIN_SECRET,
      name:  admin.name,
      role:  admin.role,
      id:    admin.id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
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
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        isActive:  true,
        createdBy: true,
        createdAt: true
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