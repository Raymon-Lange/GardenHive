require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('../models/User');
const Plant = require('../models/Plant');
const Harvest = require('../models/Harvest');

const CSV_PATH   = path.join(require('os').homedir(), 'Downloads', 'Garden 2025 - 2025.csv');
const EXCEL_PATH = path.join(require('os').homedir(), 'Downloads', 'Garden 2025.xlsx');

// ─── Plant name normalisation ─────────────────────────────────────────────────
// Maps any variant found in the CSV/Excel → canonical library name
const NAME_MAP = {
  'raddish':              'Radish',
  'radish':               'Radish',
  'green beans':          'Green Bean (Bush)',
  'green bean':           'Green Bean (Bush)',
  'cucumber':             'Cucumber',
  'tomato':               'Tomato (Large)',
  'cherry tomato':        'Tomato (Cherry)',
  'bell peppers':         'Bell Pepper',
  'bell pepper':          'Bell Pepper',
  'banna peppers':        'Banana Pepper',
  'banana peppers':       'Banana Pepper',
  'beet':                 'Beet',
  'jalapeno':             'Jalapeño',
  'cayenne':              'Cayenne',
  'shishito':             'Shishito Pepper',
  'tomatillo':            'Tomatillo',
  'okra':                 'Okra',
  'onion':                'Onion',
  'potato':               'Potato',
  'watermelon':           'Watermelon',
  'carrot':               'Carrot',
  'yellow squish':        'Yellow Squash',
  'yellow squash':        'Yellow Squash',
  'butternut':            'Butternut Squash',
  'butternut squash':     'Butternut Squash',
  'pumpkin':              'Pumpkin',
  'chard':                'Swiss Chard',
  'mix lettuce':          'Lettuce',
  'mixed lettuce':        'Lettuce',
  'lettuce':              'Lettuce',
  'cauliflower':          'Cauliflower',
  'cantalope':            'Cantaloupe',
  'cantaloupe':           'Cantaloupe',
  'cherokee purple':      'Tomato (Large)',
  'hatch pepper':         'Hatch Pepper',
  'strawberries':         'Strawberry',
  'strawberry':           'Strawberry',
  'garlic':               'Garlic',
  'ginger':               'Ginger',
  'tobasco':              'Tabasco Pepper',
  'tabasco':              'Tabasco Pepper',
  'turnip':               'Turnip',
  'zucchini':             'Zucchini',
};

// ─── Extra plants to add if missing ──────────────────────────────────────────
const EXTRA_PLANTS = [
  // Already added in previous run but re-checked via upsert
  { name: 'Jalapeño',        category: 'vegetable', perSqFt: 1,  daysToHarvest: 75,  emoji: '🌶️', description: 'Medium heat pepper.' },
  { name: 'Cayenne',         category: 'vegetable', perSqFt: 1,  daysToHarvest: 80,  emoji: '🌶️', description: 'Thin hot pepper, fresh or dried.' },
  { name: 'Shishito Pepper', category: 'vegetable', perSqFt: 1,  daysToHarvest: 60,  emoji: '🫑', description: 'Mild Japanese pepper.' },
  { name: 'Tomatillo',       category: 'vegetable', perSqFt: 1,  daysToHarvest: 75,  emoji: '🟢', description: 'Husk tomato for salsa verde.' },
  { name: 'Okra',            category: 'vegetable', perSqFt: 1,  daysToHarvest: 55,  emoji: '🌿', description: 'Harvest pods every 2–3 days.' },
  // New
  { name: 'Yellow Squash',   category: 'vegetable', perSqFt: 1,  daysToHarvest: 50,  emoji: '🟡', description: 'Summer squash. Harvest young.' },
  { name: 'Butternut Squash',category: 'vegetable', perSqFt: 1,  daysToHarvest: 110, emoji: '🎃', description: 'Winter squash. Cure after harvest.' },
  { name: 'Pumpkin',         category: 'vegetable', perSqFt: 1,  daysToHarvest: 100, emoji: '🎃', description: 'Needs space to vine out.' },
  { name: 'Banana Pepper',   category: 'vegetable', perSqFt: 1,  daysToHarvest: 70,  emoji: '🫑', description: 'Mild, tangy sweet pepper.' },
  { name: 'Hatch Pepper',    category: 'vegetable', perSqFt: 1,  daysToHarvest: 80,  emoji: '🌶️', description: 'New Mexico green chile. Seasonal.' },
  { name: 'Tabasco Pepper',  category: 'vegetable', perSqFt: 1,  daysToHarvest: 80,  emoji: '🌶️', description: 'Small, very hot pepper.' },
  { name: 'Turnip',          category: 'vegetable', perSqFt: 9,  daysToHarvest: 50,  emoji: '🟣', description: 'Root vegetable. 9 per sq ft.' },
  { name: 'Ginger',          category: 'herb',      perSqFt: 1,  daysToHarvest: 240, emoji: '🫚', description: 'Tropical rhizome. Harvest in fall.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalise(name) {
  return (name || '').trim().toLowerCase();
}

function excelSerialToDate(serial, fallbackYear) {
  if (!serial || typeof serial !== 'number') {
    return new Date(`${fallbackYear}-07-01T12:00:00`);
  }
  const d = XLSX.SSF.parse_date_code(serial);
  return new Date(`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}T12:00:00`);
}

// ─── CSV parser (2025) ────────────────────────────────────────────────────────
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
    if (!canonical) { console.warn(`  ⚠  Unknown plant (CSV): "${plantRaw}"`); continue; }
    const [m, d] = dateStr.split('/');
    records.push({
      date: new Date(`2025-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`),
      plantName: canonical,
      quantity: totalOz,
      unit: 'oz',
    });
  }
  return records;
}

// ─── Excel parser (2020-2023) ─────────────────────────────────────────────────
function parseExcelSheet(wb, sheetName) {
  const year = parseInt(sheetName);
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const records = [];

  for (let i = 1; i < rows.length; i++) {
    const row      = rows[i];
    const dateVal  = row[0];
    const plantRaw = row[1];
    const totalOz  = parseFloat(row[4]);

    if (!plantRaw || isNaN(totalOz) || totalOz <= 0) continue;

    const canonical = NAME_MAP[normalise(String(plantRaw))];
    if (!canonical) { console.warn(`  ⚠  Unknown plant (${sheetName}): "${plantRaw}"`); continue; }

    records.push({
      date: excelSerialToDate(dateVal, year),
      plantName: canonical,
      quantity: totalOz,
      unit: 'oz',
    });
  }
  return records;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ email: 'mike@gardenhive.com' });
  if (!user) {
    console.error('Default user not found. Run: npm run seed:user first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Upsert extra plants
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

  // Check existing
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

  // Parse all sources
  const wb = XLSX.readFile(EXCEL_PATH);
  const allRecords = [
    ...parseExcelSheet(wb, '2020'),
    ...parseExcelSheet(wb, '2021'),
    ...parseExcelSheet(wb, '2022'),
    ...parseExcelSheet(wb, '2023'),
    ...parseCSV(CSV_PATH),
  ];

  // Group by year for summary
  const byYear = {};
  let created = 0;

  for (const r of allRecords) {
    const plantId = plantByName[r.plantName];
    if (!plantId) { console.warn(`  ⚠  Plant not in DB: "${r.plantName}"`); continue; }
    await Harvest.create({
      userId: user._id,
      plantId,
      quantity: r.quantity,
      unit: r.unit,
      harvestedAt: r.date,
      notes: '',
    });
    const yr = r.date.getFullYear();
    byYear[yr] = (byYear[yr] || 0) + 1;
    created++;
  }

  console.log(`\nSeeded ${created} harvest entries for ${user.name}:`);
  Object.entries(byYear).sort().forEach(([yr, count]) => {
    console.log(`  ${yr}: ${count} entries`);
  });

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
