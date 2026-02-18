const express = require('express');
const Harvest = require('../models/Harvest');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/harvests/totals — cumulative by plant per season
router.get('/totals', requireAuth, async (req, res) => {
  try {
    const { season } = req.query;
    const match = { userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId) };
    if (season) match.season = season;

    const totals = await Harvest.aggregate([
      { $match: match },
      {
        $group: {
          _id: { plantId: '$plantId', season: '$season', unit: '$unit' },
          total: { $sum: '$quantity' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'plants',
          localField: '_id.plantId',
          foreignField: '_id',
          as: 'plant',
        },
      },
      { $unwind: '$plant' },
      {
        $project: {
          _id: 0,
          plantId: '$_id.plantId',
          season: '$_id.season',
          unit: '$_id.unit',
          plantName: '$plant.name',
          plantEmoji: '$plant.emoji',
          plantCategory: '$plant.category',
          total: 1,
          count: 1,
        },
      },
      { $sort: { season: -1, total: -1 } },
    ]);

    res.json(totals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/harvests/years — distinct years with harvest data
router.get('/years', requireAuth, async (req, res) => {
  try {
    const years = await Harvest.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId) } },
      { $group: { _id: { $year: '$harvestedAt' } } },
      { $sort: { _id: -1 } },
    ]);
    res.json(years.map((y) => y._id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/harvests/monthly?year=2025 — oz totals per month for the year
router.get('/monthly', requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const match = {
      userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId),
      harvestedAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31T23:59:59`),
      },
    };

    const monthly = await Harvest.aggregate([
      { $match: match },
      {
        $group: {
          _id: { month: { $month: '$harvestedAt' } },
          totalOz: { $sum: '$quantity' },
          entries: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    // Fill all 12 months (so the line graph has a complete x-axis)
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = MONTHS.map((name, i) => {
      const found = monthly.find((m) => m._id.month === i + 1);
      return { month: name, totalOz: found ? Math.round(found.totalOz) : 0, entries: found?.entries || 0 };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/harvests
router.get('/', requireAuth, async (req, res) => {
  try {
    const { season, plantId, limit = 50 } = req.query;
    const filter = { userId: req.userId };
    if (season) filter.season = season;
    if (plantId) filter.plantId = plantId;
    const harvests = await Harvest.find(filter)
      .populate('plantId', 'name emoji category')
      .populate('bedId', 'name')
      .sort({ harvestedAt: -1 })
      .limit(Number(limit));
    res.json(harvests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/harvests
router.post('/', requireAuth, async (req, res) => {
  try {
    const { plantId, bedId, quantity, unit, harvestedAt, notes } = req.body;
    if (!plantId || quantity == null || !unit) {
      return res.status(400).json({ error: 'plantId, quantity, and unit are required' });
    }
    const harvest = await Harvest.create({
      userId: req.userId,
      plantId,
      bedId: bedId || null,
      quantity: Number(quantity),
      unit,
      harvestedAt: harvestedAt ? new Date(harvestedAt) : new Date(),
      notes: notes || '',
    });
    await harvest.populate('plantId', 'name emoji category');
    await harvest.populate('bedId', 'name');
    res.status(201).json(harvest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/harvests/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const harvest = await Harvest.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!harvest) return res.status(404).json({ error: 'Harvest not found' });
    res.json({ message: 'Harvest deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
