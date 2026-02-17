const express = require('express');
const GardenBed = require('../models/GardenBed');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/beds
router.get('/', requireAuth, async (req, res) => {
  try {
    const beds = await GardenBed.find({ userId: req.userId })
      .populate('cells.plantId', 'name emoji category')
      .sort({ createdAt: -1 });
    res.json(beds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/beds/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const bed = await GardenBed.findOne({ _id: req.params.id, userId: req.userId }).populate(
      'cells.plantId',
      'name emoji category perSqFt'
    );
    if (!bed) return res.status(404).json({ error: 'Garden bed not found' });
    res.json(bed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/beds
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, rows, cols } = req.body;
    if (!name || !rows || !cols) {
      return res.status(400).json({ error: 'name, rows, and cols are required' });
    }
    const bed = await GardenBed.create({
      userId: req.userId,
      name,
      rows: Math.min(rows, 20),
      cols: Math.min(cols, 20),
      cells: [],
    });
    res.status(201).json(bed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/beds/:id — update name
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const bed = await GardenBed.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name },
      { new: true }
    );
    if (!bed) return res.status(404).json({ error: 'Garden bed not found' });
    res.json(bed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/beds/:id/cells — set a single cell's plant
router.put('/:id/cells', requireAuth, async (req, res) => {
  try {
    const { row, col, plantId } = req.body;
    const bed = await GardenBed.findOne({ _id: req.params.id, userId: req.userId });
    if (!bed) return res.status(404).json({ error: 'Garden bed not found' });

    const existingIdx = bed.cells.findIndex((c) => c.row === row && c.col === col);
    if (plantId === null || plantId === undefined) {
      // Clear cell
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

// DELETE /api/beds/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const bed = await GardenBed.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!bed) return res.status(404).json({ error: 'Garden bed not found' });
    res.json({ message: 'Garden bed deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
