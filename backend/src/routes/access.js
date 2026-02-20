const express = require('express');
const requireAuth = require('../middleware/auth');
const GardenAccess = require('../models/GardenAccess');
const User = require('../models/User');

const router = express.Router();

// GET /api/access/shared — gardens I've been granted access to (as grantee)
router.get('/shared', requireAuth, async (req, res) => {
  try {
    const grants = await GardenAccess.find({ granteeId: req.userId, status: 'active' })
      .populate('ownerId', 'name email');
    const gardens = grants.map((g) => ({
      ownerId:     g.ownerId._id,
      ownerName:   g.ownerId.name,
      ownerEmail:  g.ownerId.email,
      permission:  g.permission,
    }));
    res.json(gardens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/access — grants I own
router.get('/', requireAuth, async (req, res) => {
  try {
    const grants = await GardenAccess.find({ ownerId: req.userId })
      .sort({ createdAt: -1 });
    res.json(grants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/access — invite someone by email
router.post('/', requireAuth, async (req, res) => {
  try {
    const { email, permission } = req.body;
    if (!email || !permission) {
      return res.status(400).json({ error: 'email and permission are required' });
    }
    if (!['analytics', 'harvests_analytics', 'full'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission value' });
    }

    // Prevent inviting yourself
    const owner = await User.findById(req.userId);
    if (owner.email === email.toLowerCase().trim()) {
      return res.status(400).json({ error: 'You cannot invite yourself' });
    }

    // Prevent duplicate
    const existing = await GardenAccess.findOne({ ownerId: req.userId, granteeEmail: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'This person already has access' });
    }

    // Check if the grantee already has an account
    const grantee = await User.findOne({ email: email.toLowerCase().trim() });

    const grant = await GardenAccess.create({
      ownerId:      req.userId,
      granteeEmail: email.toLowerCase().trim(),
      granteeId:    grantee?._id || null,
      permission,
      status:       grantee ? 'active' : 'pending',
    });

    res.status(201).json(grant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/access/:id — update permission
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { permission } = req.body;
    if (!['analytics', 'harvests_analytics', 'full'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission value' });
    }
    const grant = await GardenAccess.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      { permission },
      { new: true }
    );
    if (!grant) return res.status(404).json({ error: 'Grant not found' });
    res.json(grant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/access/:id — revoke access
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const grant = await GardenAccess.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!grant) return res.status(404).json({ error: 'Grant not found' });
    res.json({ message: 'Access revoked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
