function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  // Super admin check — in future this will check role in DB
  // For now the ADMIN_SECRET holder is always super admin
  req.adminName = 'Super Admin';
  next();
}

module.exports = { requireAdmin, requireSuperAdmin };