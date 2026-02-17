require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Plant = require('../models/Plant');
const Harvest = require('../models/Harvest');

const CSV_PATH = path.join(require('os').homedir(), 'Downloads', 'Garden 2025 - 2025.csv');

// Normalise CSV plant names → canonical plant names in our library
// (handles typos, trailing spaces, alternate names)
const NAME_MAP = {
  'raddish':        'Radish',
  'radish':         'Radish',
  'green beans':    'Green Bean (Bush)',
  'green bean':     'Green Bean (Bush)',
  'cucumber':       'Cucumber',
  'tomato':         'Tomato (Large)',
  'cherry tomato':  'Tomato (Cherry)',
  'bell peppers':   'Bell Pepper',
  'bell pepper':    'Bell Pepper',
  'beet':           'Beet',
  'jalapeno':       'Jalapeño',
  'cayenne':        'Cayenne',
  'shishito':       'Shishito Pepper',
  'tomatillo':      'Tomatillo',
  'okra':           'Okra',
  'onion':          'Onion',
  'potato':         'Potato',
  'watermelon':     'Watermelon',
  'carrot':         'Carrot',
};

// Plants to add to the library if they don't already exist
const EXTRA_PLANTS = [
  { name: 'Jalapeño',       category: 'vegetable', perSqFt: 1,  daysToHarvest: 75,  emoji: '🌶️', description: 'Medium heat pepper. Prolific producer.' },
  { name: 'Cayenne',        category: 'vegetable', perSqFt: 1,  daysToHarvest: 80,  emoji: '🌶️', description: 'Thin hot pepper, great fresh or dried.' },
  { name: 'Shishito Pepper',category: 'vegetable', perSqFt: 1,  daysToHarvest: 60,  emoji: '🫑', description: 'Mild Japanese pepper. Mostly sweet with occasional heat.' },
  { name: 'Tomatillo',      category: 'vegetable', perSqFt: 1,  daysToHarvest: 75,  emoji: '🟢', description: 'Husk tomato. Essential for salsa verde.' },
  { name: 'Okra',           category: 'vegetable', perSqFt: 1,  daysToHarvest: 55,  emoji: '🌿', description: 'Harvest pods every 2–3 days when small.' },
];

function parseDate(str) {
  // Format: M/DD → 2025-M-DD
  const [m, d] = str.trim().split('/');
  return new Date(`2025-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`);
}

function normalise(name) {
  return name.trim().toLowerCase();
}

function parseCSV(csvPath) {
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const dateStr  = cols[0]?.trim();
    const plantRaw = cols[1]?.trim();
    const totalOz  = parseFloat(cols[4]);

    if (!dateStr || !plantRaw || isNaN(totalOz) || totalOz <= 0) continue;

    const canonical = NAME_MAP[normalise(plantRaw)];
    if (!canonical) {
      console.warn(`  ⚠  Unknown plant name skipped: "${plantRaw}"`);
      continue;
    }

    records.push({
      date: parseDate(dateStr),
      plantName: canonical,
      quantity: totalOz,
      unit: 'oz',
    });
  }

  return records;
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ email: 'mike@gardenhive.com' });
  if (!user) {
    console.error('Default user not found. Run: npm run seed:user first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Add any missing plants to the library
  for (const p of EXTRA_PLANTS) {
    const exists = await Plant.findOne({ name: p.name });
    if (!exists) {
      await Plant.create(p);
      console.log(`  Added plant: ${p.emoji} ${p.name}`);
    }
  }

  // Build plant name → _id lookup
  const allPlants = await Plant.find({});
  const plantByName = {};
  allPlants.forEach(p => { plantByName[p.name] = p._id; });

  // Check for existing harvest data
  const existing = await Harvest.countDocuments({ userId: user._id });
  if (existing > 0) {
    console.log(`Mike already has ${existing} harvest entries. Skipping.`);
    console.log('Run with --force to re-seed: node src/seed/harvests.js --force');
    if (!process.argv.includes('--force')) {
      await mongoose.disconnect();
      return;
    }
    await Harvest.deleteMany({ userId: user._id });
    console.log('Cleared existing harvests.');
  }

  const records = parseCSV(CSV_PATH);
  let created = 0;

  for (const r of records) {
    const plantId = plantByName[r.plantName];
    if (!plantId) {
      console.warn(`  ⚠  Plant not in DB: "${r.plantName}"`);
      continue;
    }
    await Harvest.create({
      userId: user._id,
      plantId,
      quantity: r.quantity,
      unit: r.unit,
      harvestedAt: r.date,
      notes: '',
    });
    created++;
  }

  console.log(`\nSeeded ${created} harvest entries for ${user.name}.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
