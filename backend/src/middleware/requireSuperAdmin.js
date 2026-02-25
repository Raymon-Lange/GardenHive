const User = require('../models/User');

const SUPER_ADMIN_EMAIL = 'raymon.lange@gmail.com';

async function requireSuperAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('email').lean();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = requireSuperAdmin;
