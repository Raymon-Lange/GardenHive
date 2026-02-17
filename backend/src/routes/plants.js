const express = require('express');
const Plant = require('../models/Plant');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/plants — public plant library
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const plants = await Plant.find(filter).sort({ name: 1 });
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

module.exports = router;
