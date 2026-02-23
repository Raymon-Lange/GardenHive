const express = require('express');
const GardenBed = require('../models/GardenBed');
const User = require('../models/User');
const { requireAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/beds
router.get('/', requireAccess('full'), async (req, res) => {
  try {
    const beds = await GardenBed.find({ userId: req.gardenOwnerId })
      .populate('cells.plantId', 'name emoji category')
      .sort({ createdAt: -1 });
    res.json(beds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/beds/:id
router.get('/:id', requireAccess('full'), async (req, res) => {
  try {
    const bed = await GardenBed.findOne({ _id: req.params.id, userId: req.gardenOwnerId }).populate(
      'cells.plantId',
      'name emoji category perSqFt'
    );
    if (!bed) return res.status(404).json({ error: 'Garden bed not found' });
    res.json(bed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/beds — owner only
router.post('/', requireAccess('full'), async (req, res) => {
  try {
    if (req.gardenPermission !== 'owner') {
      return res.status(403).json({ error: 'Only the garden owner can create beds' });
    }
    const { name, rows, cols } = req.body;
    if (!name || !rows || !cols) {
      return res.status(400).json({ error: 'name, rows, and cols are required' });
    }
    const bed = await GardenBed.create({
      userId: req.gardenOwnerId,
      name,
      rows: Math.min(rows, 50),
      cols: Math.min(cols, 50),
      cells: [],
    });
    res.status(201).json(bed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/beds/:id — update name and/or map position
router.put('/:id', requireAccess('full'), async (req, res) => {
  try {
    if (req.gardenPermission !== 'owner') {
      return res.status(403).json({ error: 'Only the garden owner can update beds' });
    }
    const { name, mapRow, mapCol } = req.body;

    const bed = await GardenBed.findOne({ _id: req.params.id, userId: req.gardenOwnerId });
    if (!bed) return res.status(404).json({ error: 'Garden bed not found' });

    if (name !== undefined) bed.name = name;

    if (mapRow !== null && mapCol !== null && mapRow !== undefined && mapCol !== undefined) {
      // Validate non-negative integers
      if (!Number.isInteger(mapRow) || mapRow < 0 || !Number.isInteger(mapCol) || mapCol < 0) {
        return res.status(400).json({ error: 'mapRow and mapCol must be non-negative integers' });
      }

      // Garden dimensions must be set before placing
      const owner = await User.findById(req.gardenOwnerId);
      if (!owner || owner.gardenWidth == null || owner.gardenHeight == null) {
        return res.status(400).json({ error: 'Garden dimensions not set — configure garden size before placing beds' });
      }

      // Boundary check
      if (mapCol + bed.cols > owner.gardenWidth || mapRow + bed.rows > owner.gardenHeight) {
        return res.status(400).json({ error: 'Bed position is outside the garden boundary' });
      }

      // AABB overlap check against all other placed beds
      const otherBeds = await GardenBed.find({
        userId: req.gardenOwnerId,
        _id: { $ne: bed._id },
        mapRow: { $ne: null },
        mapCol: { $ne: null },
      });

      const hasOverlap = otherBeds.some((other) => (
        mapCol          < other.mapCol + other.cols &&
        mapCol + bed.cols > other.mapCol &&
        mapRow          < other.mapRow + other.rows &&
        mapRow + bed.rows > other.mapRow
      ));

      if (hasOverlap) {
        return res.status(409).json({ error: 'Bed position overlaps an existing bed' });
      }

      bed.mapRow = mapRow;
      bed.mapCol = mapCol;
    } else if (mapRow === null && mapCol === null) {
      // Explicit null unplaces the bed
      bed.mapRow = null;
      bed.mapCol = null;
    }

    await bed.save();
    res.json(bed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/beds/:id/cells — set a single cell's plant
router.put('/:id/cells', requireAccess('full'), async (req, res) => {
  try {
    const { row, col, plantId } = req.body;
    const bed = await GardenBed.findOne({ _id: req.params.id, userId: req.gardenOwnerId });
    if (!bed) return res.status(404).json({ error: 'Garden bed not found' });

    const existingIdx = bed.cells.findIndex((c) => c.row === row && c.col === col);
    if (plantId === null || plantId === undefined) {
      if (existingIdx !== -1) bed.cells.splice(existingIdx, 1);
    } else {
      if (existingIdx !== -1) {
        bed.cells[existingIdx].plantId = plantId;
      } else {
        bed.cells.push({ row, col, plantId });
      }
    }
    await bed.save();
    await bed.populate('cells.plantId', 'name emoji category perSqFt');
    res.json(bed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/beds/:id — owner only
router.delete('/:id', requireAccess('full'), async (req, res) => {
  try {
    if (req.gardenPermission !== 'owner') {
      return res.status(403).json({ error: 'Only the garden owner can delete beds' });
    }
    const bed = await GardenBed.findOneAndDelete({ _id: req.params.id, userId: req.gardenOwnerId });
    if (!bed) return res.status(404).json({ error: 'Garden bed not found' });
    res.json({ message: 'Garden bed deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
