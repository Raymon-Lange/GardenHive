const express = require('express');
const multer = require('multer');
const { parse: parseCsv } = require('csv-parse/sync');
const requireAuth = require('../middleware/auth');
const Garden = require('../models/Garden');
const GardenBed = require('../models/GardenBed');
const User = require('../models/User');
const logger = require('../lib/logger');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1_000_000 } });

const router = express.Router();

// GET /api/gardens — list all gardens for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const gardens = await Garden.find({ userId: req.userId }).sort({ createdAt: 1 });
    res.json(gardens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gardens/import — create a garden with beds from a CSV upload
router.post('/import', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    const mime = req.file.mimetype;
    if (!mime.includes('csv') && !mime.includes('text')) {
      return res.status(400).json({ error: 'File must be a CSV' });
    }

    let rows;
    try {
      rows = parseCsv(req.file.buffer.toString('utf8'), { columns: true, skip_empty_lines: true });
    } catch {
      return res.status(400).json({ error: 'Could not parse CSV file' });
    }

    if (!rows.length) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    const required = ['Bed Name', 'Rows', 'Cols'];
    const cols = Object.keys(rows[0]);
    const missing = required.filter((c) => !cols.includes(c));
    if (missing.length) {
      return res.status(400).json({ error: `Missing required columns: ${missing.join(', ')}` });
    }

    const validBeds = [];
    const errors = [];

    rows.forEach((row, i) => {
      const rowNum = i + 2; // 1-based + header row
      const bedName = (row['Bed Name'] || '').trim();
      const rowsVal = parseInt(row['Rows'], 10);
      const colsVal = parseInt(row['Cols'], 10);

      if (!bedName) {
        errors.push(`Row ${rowNum}: Bed Name is required`);
      } else if (!Number.isInteger(rowsVal) || rowsVal < 1 || rowsVal > 50) {
        errors.push(`Row ${rowNum}: Rows must be a whole number between 1 and 50`);
      } else if (!Number.isInteger(colsVal) || colsVal < 1 || colsVal > 50) {
        errors.push(`Row ${rowNum}: Cols must be a whole number between 1 and 50`);
      } else {
        validBeds.push({ name: bedName, rows: rowsVal, cols: colsVal });
      }
    });

    if (!validBeds.length) {
      return res.status(400).json({ error: 'No valid rows in CSV', errors });
    }

    const garden = await Garden.create({
      userId: req.userId,
      name: name.trim(),
      gardenWidth: null,
      gardenHeight: null,
    });

    await Promise.all(validBeds.map((b) =>
      GardenBed.create({
        userId: req.userId,
        gardenId: garden._id,
        name: b.name,
        rows: b.rows,
        cols: b.cols,
        cells: [],
      })
    ));

    await User.findByIdAndUpdate(req.userId, { activeGardenId: garden._id });

    logger.info({ action: 'garden.imported', userId: req.userId, gardenId: garden._id, bedsCreated: validBeds.length }, 'Garden imported from CSV');
    res.status(201).json({ garden, bedsCreated: validBeds.length, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gardens — create a new blank garden (or clone from sourceGardenId)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, gardenWidth, gardenHeight, sourceGardenId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    let width = gardenWidth ?? null;
    let height = gardenHeight ?? null;

    if (sourceGardenId) {
      // Clone mode: copy dimensions and beds from source
      const source = await Garden.findById(sourceGardenId);
      if (!source) return res.status(400).json({ error: 'Source garden not found' });
      if (source.userId.toString() !== req.userId) {
        return res.status(400).json({ error: 'Source garden does not belong to you' });
      }
      width  = source.gardenWidth;
      height = source.gardenHeight;
    }

    const garden = await Garden.create({
      userId:      req.userId,
      name:        name.trim(),
      gardenWidth:  width,
      gardenHeight: height,
    });

    if (sourceGardenId) {
      // Clone all beds from source (reset map positions)
      const sourceBeds = await GardenBed.find({ gardenId: sourceGardenId });
      await Promise.all(sourceBeds.map((b) =>
        GardenBed.create({
          userId:   req.userId,
          gardenId: garden._id,
          name:     b.name,
          rows:     b.rows,
          cols:     b.cols,
          cells:    b.cells.map((c) => ({ row: c.row, col: c.col, plantId: c.plantId })),
          mapRow:   null,
          mapCol:   null,
        })
      ));
    }

    // Set as active garden
    await User.findByIdAndUpdate(req.userId, { activeGardenId: garden._id });

    logger.info({ action: 'garden.created', userId: req.userId, gardenId: garden._id, name: garden.name }, 'Garden created');
    res.status(201).json(garden);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gardens/:id — update garden name and/or dimensions
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });
    if (garden.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, gardenWidth, gardenHeight } = req.body;

    if (name !== undefined) {
      if (!name || !name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
      garden.name = name.trim();
    }

    if (gardenWidth !== undefined) {
      if (gardenWidth !== null && (!Number.isInteger(gardenWidth) || gardenWidth < 1)) {
        return res.status(400).json({ error: 'gardenWidth must be a positive integer' });
      }
      if (gardenWidth !== null) {
        const clipped = await GardenBed.findOne({
          gardenId: garden._id,
          mapCol: { $ne: null },
          $expr: { $gt: [{ $add: ['$mapCol', '$cols'] }, gardenWidth] },
        });
        if (clipped) return res.status(400).json({ error: 'Garden dimensions are smaller than existing bed placements' });
      }
      garden.gardenWidth = gardenWidth;
    }

    if (gardenHeight !== undefined) {
      if (gardenHeight !== null && (!Number.isInteger(gardenHeight) || gardenHeight < 1)) {
        return res.status(400).json({ error: 'gardenHeight must be a positive integer' });
      }
      if (gardenHeight !== null) {
        const clipped = await GardenBed.findOne({
          gardenId: garden._id,
          mapRow: { $ne: null },
          $expr: { $gt: [{ $add: ['$mapRow', '$rows'] }, gardenHeight] },
        });
        if (clipped) return res.status(400).json({ error: 'Garden dimensions are smaller than existing bed placements' });
      }
      garden.gardenHeight = gardenHeight;
    }

    await garden.save();
    logger.info({ action: 'garden.updated', userId: req.userId, gardenId: garden._id }, 'Garden updated');
    res.json(garden);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/gardens/:id — permanently delete a garden and its beds
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id);
    if (!garden) return res.status(404).json({ error: 'Garden not found' });
    if (garden.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const totalGardens = await Garden.countDocuments({ userId: req.userId });
    if (totalGardens <= 1) {
      return res.status(400).json({ error: 'Cannot delete your only garden' });
    }

    await GardenBed.deleteMany({ gardenId: garden._id });
    await Garden.findByIdAndDelete(garden._id);

    // If this was the active garden, switch to the most recently created remaining garden
    const user = await User.findById(req.userId);
    if (user.activeGardenId?.toString() === garden._id.toString()) {
      const next = await Garden.findOne({ userId: req.userId }).sort({ createdAt: -1 });
      await User.findByIdAndUpdate(req.userId, { activeGardenId: next?._id ?? null });
    }

    logger.info({ action: 'garden.deleted', userId: req.userId, gardenId: garden._id }, 'Garden deleted');
    res.json({ message: 'Garden deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
