const express = require('express');
const requireAuth = require('../middleware/auth');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const User = require('../models/User');
const GardenBed = require('../models/GardenBed');
const Harvest = require('../models/Harvest');

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const [totalUsers, totalGardens, totalHarvests] = await Promise.all([
      User.countDocuments(),
      GardenBed.countDocuments(),
      Harvest.countDocuments(),
    ]);
    res.json({ totalUsers, totalGardens, totalHarvests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'gardenbeds',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
            { $count: 'n' },
          ],
          as: '_bedCount',
        },
      },
      {
        $lookup: {
          from: 'harvests',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
            { $count: 'n' },
          ],
          as: '_harvestCount',
        },
      },
      {
        $addFields: {
          bedCount:     { $ifNull: [{ $arrayElemAt: ['$_bedCount.n',     0] }, 0] },
          harvestCount: { $ifNull: [{ $arrayElemAt: ['$_harvestCount.n', 0] }, 0] },
        },
      },
      {
        $project: {
          _id:          1,
          name:         1,
          email:        1,
          createdAt:    1,
          lastLoginAt:  1,
          bedCount:     1,
          harvestCount: 1,
        },
      },
    ]);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
