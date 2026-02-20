const express = require('express');
const { Types: { ObjectId } } = require('mongoose');
const Harvest = require('../models/Harvest');
const { requireAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/harvests/totals
router.get('/totals', requireAccess('analytics'), async (req, res) => {
  try {
    const { season, from, to } = req.query;
    const match = { userId: ObjectId.createFromHexString(req.gardenOwnerId) };
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
      { $lookup: { from: 'plants', localField: '_id.plantId', foreignField: '_id', as: 'plant' } },
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

// GET /api/harvests/yoy
router.get('/yoy', requireAccess('analytics'), async (req, res) => {
  try {
    const { plantId } = req.query;
    const match = { userId: ObjectId.createFromHexString(req.gardenOwnerId) };
    if (plantId) match.plantId = ObjectId.createFromHexString(plantId);

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

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const byYear = {};
    data.forEach(({ _id, totalOz, count }) => {
      const yr = String(_id.year);
      if (!byYear[yr]) byYear[yr] = {};
      byYear[yr][MONTHS[_id.month - 1]] = { oz: Math.round(totalOz), count };
    });

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

// GET /api/harvests/weekly
router.get('/weekly', requireAccess('analytics'), async (req, res) => {
  try {
    const year    = parseInt(req.query.year) || new Date().getFullYear();
    const plantId = req.query.plantId;

    const match = {
      userId: ObjectId.createFromHexString(req.gardenOwnerId),
      harvestedAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31T23:59:59`) },
    };
    if (plantId) match.plantId = ObjectId.createFromHexString(plantId);

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

    const result = Array.from({ length: 52 }, (_, i) => {
      const week = i + 1;
      const found = data.find((d) => d._id.week === week);
      return { week: `Wk ${week}`, oz: found ? Math.round(found.totalOz) : 0, count: found?.count || 0 };
    });

    let last = result.length - 1;
    while (last > 0 && result[last].oz === 0 && result[last].count === 0) last--;
    res.json(result.slice(0, last + 1));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/harvests/years
router.get('/years', requireAccess('analytics'), async (req, res) => {
  try {
    const years = await Harvest.aggregate([
      { $match: { userId: ObjectId.createFromHexString(req.gardenOwnerId) } },
      { $group: { _id: { $year: '$harvestedAt' } } },
      { $sort: { _id: -1 } },
    ]);
    res.json(years.map((y) => y._id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/harvests/monthly
router.get('/monthly', requireAccess('analytics'), async (req, res) => {
  try {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);

    const match = {
      userId: ObjectId.createFromHexString(req.gardenOwnerId),
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
router.get('/', requireAccess('analytics'), async (req, res) => {
  try {
    const { season, plantId, limit = 50 } = req.query;
    const filter = { userId: req.gardenOwnerId };
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
router.post('/', requireAccess('harvests_analytics'), async (req, res) => {
  try {
    const { plantId, bedId, quantity, unit, harvestedAt, notes } = req.body;
    if (!plantId || quantity == null || !unit) {
      return res.status(400).json({ error: 'plantId, quantity, and unit are required' });
    }
    const harvest = await Harvest.create({
      userId: req.gardenOwnerId,
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
router.delete('/:id', requireAccess('harvests_analytics'), async (req, res) => {
  try {
    const harvest = await Harvest.findOneAndDelete({ _id: req.params.id, userId: req.gardenOwnerId });
    if (!harvest) return res.status(404).json({ error: 'Harvest not found' });
    res.json({ message: 'Harvest deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
