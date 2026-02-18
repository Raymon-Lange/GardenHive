const express = require('express');
const Harvest = require('../models/Harvest');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/harvests/totals — cumulative by plant, supports ?from=&to= date range
router.get('/totals', requireAuth, async (req, res) => {
  try {
    const { season, from, to } = req.query;
    const match = { userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId) };
    if (season) match.season = season;
    if (from || to) {
      match.harvestedAt = {};
      if (from) match.harvestedAt.$gte = new Date(from);
      if (to)   match.harvestedAt.$lte = new Date(to);
    }

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

// GET /api/harvests/yoy — monthly totals grouped by year (all years, for line chart)
router.get('/yoy', requireAuth, async (req, res) => {
  try {
    const { plantId } = req.query;
    const match = { userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId) };
    if (plantId) match.plantId = require('mongoose').Types.ObjectId.createFromHexString(plantId);

    const data = await Harvest.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: '$harvestedAt' }, month: { $month: '$harvestedAt' } },
          totalOz: { $sum: '$quantity' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Reshape into { year: { Jan: {oz, count}, ... } }
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const byYear = {};
    data.forEach(({ _id, totalOz, count }) => {
      const yr = String(_id.year);
      if (!byYear[yr]) byYear[yr] = {};
      byYear[yr][MONTHS[_id.month - 1]] = { oz: Math.round(totalOz), count };
    });

    // Fill missing months with 0
    const years = Object.keys(byYear).sort();
    const result = MONTHS.map((month) => {
      const row = { month };
      years.forEach((yr) => {
        row[`${yr}_oz`]    = byYear[yr][month]?.oz    || 0;
        row[`${yr}_count`] = byYear[yr][month]?.count || 0;
      });
      return row;
    });

    res.json({ years, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/harvests/weekly?year=2025&plantId= — week-by-week totals for a year
router.get('/weekly', requireAuth, async (req, res) => {
  try {
    const year    = parseInt(req.query.year) || new Date().getFullYear();
    const plantId = req.query.plantId;

    const match = {
      userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId),
      harvestedAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31T23:59:59`) },
    };
    if (plantId) match.plantId = require('mongoose').Types.ObjectId.createFromHexString(plantId);

    const data = await Harvest.aggregate([
      { $match: match },
      {
        $group: {
          _id: { week: { $isoWeek: '$harvestedAt' } },
          totalOz: { $sum: '$quantity' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.week': 1 } },
    ]);

    // Fill all 52 weeks
    const result = Array.from({ length: 52 }, (_, i) => {
      const week = i + 1;
      const found = data.find((d) => d._id.week === week);
      return { week: `Wk ${week}`, oz: found ? Math.round(found.totalOz) : 0, count: found?.count || 0 };
    });

    // Trim trailing empty weeks
    let last = result.length - 1;
    while (last > 0 && result[last].oz === 0 && result[last].count === 0) last--;
    res.json(result.slice(0, last + 1));
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

// GET /api/harvests/monthly — rolling 12 months oz totals (today - 12 months → today)
router.get('/monthly', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);

    const match = {
      userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId),
      harvestedAt: { $gte: from, $lte: now },
    };

    const monthly = await Harvest.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: '$harvestedAt' }, month: { $month: '$harvestedAt' } },
          totalOz: { $sum: '$quantity' },
          entries: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build ordered 12-month labels (e.g. "Mar 25", "Apr 25", ... "Feb 26")
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(from);
      d.setMonth(from.getMonth() + i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const label = `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}`;
      const found = monthly.find((r) => r._id.year === y && r._id.month === m);
      result.push({ month: label, totalOz: found ? Math.round(found.totalOz) : 0, entries: found?.entries || 0 });
    }

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
