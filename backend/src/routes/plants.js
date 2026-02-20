const express = require('express');
const mongoose = require('mongoose');
const Plant = require('../models/Plant');
const GardenBed = require('../models/GardenBed');
const Harvest = require('../models/Harvest');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const EDITABLE_FIELDS = [
  'name', 'category', 'emoji', 'description',
  'perSqFt', 'daysToHarvest', 'daysToGermination', 'spacingIn', 'depthIn',
];

// GET /api/plants — system plants + the effective owner's custom plants
// ?showAll=true  → include hidden plants (for admin), adds `hidden` boolean to each
// ?ownerId=xxx   → use that owner's custom plants (for helpers viewing a shared garden)
router.get('/', requireAuth, async (req, res) => {
  try {
    const effectiveOwnerId = req.query.ownerId || req.userId;
    const showAll = req.query.showAll === 'true';
    const { category, search } = req.query;

    // Fetch the requesting user's hidden list
    const me = await User.findById(req.userId).select('hiddenPlants');
    const hiddenSet = new Set((me?.hiddenPlants ?? []).map((id) => id.toString()));

    const filter = {
      $or: [{ ownerId: null }, { ownerId: effectiveOwnerId }],
    };
    if (!showAll && hiddenSet.size > 0) {
      filter._id = { $nin: [...hiddenSet] };
    }
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const plants = await Plant.find(filter).sort({ name: 1 });

    if (showAll) {
      // Annotate each plant with whether the requesting user has it hidden
      const annotated = plants.map((p) => ({
        ...p.toObject(),
        hidden: hiddenSet.has(p._id.toString()),
      }));
      return res.json(annotated);
    }

    res.json(plants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/plants/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    res.json(plant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plants — create a custom plant
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const data = { ownerId: req.userId };
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    const plant = await Plant.create(data);
    res.status(201).json(plant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/plants/:id — update a custom plant
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    if (!plant.ownerId || plant.ownerId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not your plant' });
    }
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) plant[field] = req.body[field];
    }
    await plant.save();
    res.json(plant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/plants/:id — delete a custom plant
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    if (!plant.ownerId) {
      return res.status(400).json({ error: 'System plants cannot be deleted' });
    }
    if (plant.ownerId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not your plant' });
    }

    const id = plant._id;
    const inBed = await GardenBed.findOne({ 'cells.plantId': id });
    if (inBed) {
      return res.status(400).json({ error: 'This plant is in use in a garden bed and cannot be deleted' });
    }
    const inHarvest = await Harvest.findOne({ plantId: id });
    if (inHarvest) {
      return res.status(400).json({ error: 'This plant has harvest records and cannot be deleted' });
    }

    await Plant.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
