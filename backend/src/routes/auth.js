const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const GardenAccess = require('../models/GardenAccess');
const GardenBed = require('../models/GardenBed');
const Harvest = require('../models/Harvest');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ── Multer setup for garden images ───────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `garden-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function userPayload(user) {
  return {
    id:           user._id,
    name:         user.name,
    email:        user.email,
    role:         user.role || 'owner',
    gardenName:   user.gardenName   || null,
    gardenImage:  user.gardenImage  || null,
    gardenWidth:  user.gardenWidth  ?? null,
    gardenHeight: user.gardenHeight ?? null,
  };
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
    if (user.active === false) {
      return res.status(401).json({ error: 'This account has been deactivated' });
    }
    const token = signToken(user._id);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/me/hidden-plants — toggle a plant in/out of the user's hidden list
router.post('/me/hidden-plants', requireAuth, async (req, res) => {
  try {
    const { plantId } = req.body;
    if (!plantId) return res.status(400).json({ error: 'plantId is required' });
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const idx = user.hiddenPlants.findIndex((id) => id.toString() === plantId);
    if (idx === -1) {
      user.hiddenPlants.push(plantId);
    } else {
      user.hiddenPlants.splice(idx, 1);
    }
    await user.save();
    res.json({ hiddenPlants: user.hiddenPlants });
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

// PUT /api/auth/me — update name
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name: name.trim() },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(userPayload(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/me/password — change password
router.put('/me/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/me — delete (owner) or deactivate (helper) account
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    if (user.role === 'owner') {
      // Hard delete: user + all their garden data
      await Harvest.deleteMany({ userId: req.userId });
      await GardenBed.deleteMany({ userId: req.userId });
      await GardenAccess.deleteMany({ $or: [{ ownerId: req.userId }, { granteeId: req.userId }] });
      await User.findByIdAndDelete(req.userId);
    } else {
      // Soft deactivate: remove helper's access records, keep garden data untouched
      await GardenAccess.deleteMany({ granteeId: req.userId });
      user.active = false;
      await user.save();
    }

    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/me/garden — update garden name and/or dimensions
router.put('/me/garden', requireAuth, async (req, res) => {
  try {
    const { gardenName, gardenWidth, gardenHeight } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (gardenName !== undefined) {
      user.gardenName = gardenName ? gardenName.trim() : null;
    }

    if (gardenWidth !== undefined) {
      if (gardenWidth !== null && (!Number.isInteger(gardenWidth) || gardenWidth < 1)) {
        return res.status(400).json({ error: 'gardenWidth must be a positive integer' });
      }
      // When reducing, ensure no placed bed's footprint is clipped
      if (gardenWidth !== null) {
        const clippedBed = await GardenBed.findOne({
          userId: req.userId,
          mapCol: { $ne: null },
          $expr: { $gt: [{ $add: ['$mapCol', '$cols'] }, gardenWidth] },
        });
        if (clippedBed) {
          return res.status(400).json({ error: 'Garden dimensions are smaller than existing bed placements' });
        }
      }
      user.gardenWidth = gardenWidth;
    }

    if (gardenHeight !== undefined) {
      if (gardenHeight !== null && (!Number.isInteger(gardenHeight) || gardenHeight < 1)) {
        return res.status(400).json({ error: 'gardenHeight must be a positive integer' });
      }
      // When reducing, ensure no placed bed's footprint is clipped
      if (gardenHeight !== null) {
        const clippedBed = await GardenBed.findOne({
          userId: req.userId,
          mapRow: { $ne: null },
          $expr: { $gt: [{ $add: ['$mapRow', '$rows'] }, gardenHeight] },
        });
        if (clippedBed) {
          return res.status(400).json({ error: 'Garden dimensions are smaller than existing bed placements' });
        }
      }
      user.gardenHeight = gardenHeight;
    }

    await user.save();
    res.json(userPayload(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/me/garden-image — upload garden image
router.post('/me/garden-image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Delete old image if one exists
    if (user.gardenImage) {
      const oldPath = path.join(uploadsDir, path.basename(user.gardenImage));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    user.gardenImage = `/uploads/${req.file.filename}`;
    await user.save();
    res.json(userPayload(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/me/garden-image — remove garden image
router.delete('/me/garden-image', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.gardenImage) {
      const filePath = path.join(uploadsDir, path.basename(user.gardenImage));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      user.gardenImage = null;
      await user.save();
    }
    res.json(userPayload(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
