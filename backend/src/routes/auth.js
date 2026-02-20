const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GardenAccess = require('../models/GardenAccess');
const requireAuth = require('../middleware/auth');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function userPayload(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role || 'owner' };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'owner' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['owner', 'helper'].includes(role)) {
      return res.status(400).json({ error: 'Role must be owner or helper' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });

    // Auto-link any pending garden access invites for this email
    await GardenAccess.updateMany(
      { granteeEmail: email, status: 'pending' },
      { granteeId: user._id, status: 'active' }
    );

    const token = signToken(user._id);
    res.status(201).json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(userPayload(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
