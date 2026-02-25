const express = require('express');
const multer = require('multer');
const { parse: parseCsv } = require('csv-parse/sync');
const { Types: { ObjectId } } = require('mongoose');
const Harvest = require('../models/Harvest');
const Plant = require('../models/Plant');
const { requireAccess } = require('../middleware/auth');
const { findClosestPlant } = require('../utils/fuzzyMatch');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1_000_000 } });

const router = express.Router();

// GET /api/harvests/template
router.get('/template', requireAccess('harvests_analytics'), (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="harvest-template.csv"');
  res.send('Plant Name,Date,Quantity (oz)\nTomato,06/15/2025,8\n');
});

// POST /api/harvests/import  — parse + validate CSV, return preview (no DB writes)
router.post('/import', requireAccess('harvests_analytics'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const mime = req.file.mimetype;
    const ext  = (req.file.originalname || '').split('.').pop().toLowerCase();
    if (mime !== 'text/csv' && mime !== 'application/vnd.ms-excel' && ext !== 'csv') {
      return res.status(400).json({ error: 'Only CSV files are accepted' });
    }

    let records;
    try {
      records = parseCsv(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      return res.status(400).json({ error: 'Could not parse CSV — check that the file is valid' });
    }

    // Validate required columns
    if (records.length > 0) {
      const headers = Object.keys(records[0]);
      const required = ['Plant Name', 'Date', 'Quantity (oz)'];
      const missing = required.filter((h) => !headers.includes(h));
      if (missing.length) {
        return res.status(400).json({ error: `Missing required columns: ${missing.join(', ')}` });
      }
    }

    if (records.length === 0) {
      return res.json({ totalRows: 0, matched: [], unmatched: [], errors: [] });
    }

    // Load plants accessible to this user (system + own custom)
    const plants = await Plant.find({
      $or: [{ ownerId: null }, { ownerId: req.gardenOwnerId }],
    }).lean();

    const DATE_REGEXES = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,   // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,    // MM/DD/YY
    ];

    function parseDate(raw) {
      for (const re of DATE_REGEXES) {
        const m = raw.match(re);
        if (m) {
          const month = parseInt(m[1], 10);
          const day   = parseInt(m[2], 10);
          let year    = parseInt(m[3], 10);
          if (year < 100) year = 2000 + year;
          if (month < 1 || month > 12 || day < 1 || day > 31) return null;
          return new Date(Date.UTC(year, month - 1, day)).toISOString();
        }
      }
      return null;
    }

    const matched   = [];
    const unmatched = [];
    const errors    = [];

    records.forEach((record, idx) => {
      const row       = idx + 1;
      const rawName   = (record['Plant Name'] || '').trim();
      const rawDate   = (record['Date'] || '').trim();
      const rawQty    = (record['Quantity (oz)'] || '').trim();

      if (!rawName) {
        errors.push({ row, field: 'plantName', message: 'Plant name is required' });
        return;
      }

      const parsedDate = parseDate(rawDate);
      if (!parsedDate) {
        errors.push({ row, field: 'date', message: 'Invalid date format — expected MM/DD/YYYY or MM/DD/YY' });
        return;
      }

      const quantity = parseFloat(rawQty);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ row, field: 'quantity', message: 'Quantity must be a positive number' });
        return;
      }

      // Case-insensitive exact match
      const exactMatch = plants.find((p) => p.name.toLowerCase() === rawName.toLowerCase());
      if (exactMatch) {
        matched.push({
          row,
          plantId:    exactMatch._id.toString(),
          plantName:  exactMatch.name,
          plantEmoji: exactMatch.emoji,
          date:       parsedDate,
          quantity,
        });
        return;
      }

      // Fuzzy suggestion
      const suggestion = findClosestPlant(rawName, plants);
      unmatched.push({
        row,
        rawName,
        suggestion: suggestion
          ? { plantId: suggestion.plant._id.toString(), plantName: suggestion.plant.name, plantEmoji: suggestion.plant.emoji }
          : null,
      });
    });

    res.json({ totalRows: records.length, matched, unmatched, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/harvests/bulk  — create multiple harvest records from resolved payload
router.post('/bulk', requireAccess('harvests_analytics'), async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows must be a non-empty array' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 rows per import' });
    }

    // Validate each row before writing anything
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const n = i + 1;
      if (!r.plantId)     return res.status(400).json({ error: `Row ${n}: plantId is required` });
      if (!r.harvestedAt) return res.status(400).json({ error: `Row ${n}: harvestedAt is required` });
      if (r.quantity == null || isNaN(Number(r.quantity)) || Number(r.quantity) <= 0) {
        return res.status(400).json({ error: `Row ${n}: quantity must be a positive number` });
      }
    }

    const docs = rows.map((r) => ({
      userId:      req.gardenOwnerId,
      loggedById:  req.userId,
      plantId:     r.plantId,
      quantity:    Number(r.quantity),
      unit:        'oz',
      harvestedAt: new Date(r.harvestedAt),
    }));

    const harvests = await Harvest.insertMany(docs);
    res.status(201).json({ imported: harvests.length, harvests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
      .populate('loggedById', 'name')
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
      loggedById: req.userId,
      plantId,
      bedId: bedId || null,
      quantity: Number(quantity),
      unit,
      harvestedAt: harvestedAt ? new Date(harvestedAt) : new Date(),
      notes: notes || '',
    });
    await harvest.populate('plantId', 'name emoji category');
    await harvest.populate('bedId', 'name');
    await harvest.populate('loggedById', 'name');
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
