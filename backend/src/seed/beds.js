const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const GardenBed = require('../models/GardenBed');
const Plant = require('../models/Plant');

const CSV_PATH = path.join(__dirname, 'data', 'layout.csv');

const BED_NAMES = {
  1:  'Bed 1 — South East',
  2:  'Bed 2 — Center East',
  3:  'Bed 3 — North East',
  4:  'Bed 4 — South Center',
  5:  'Bed 5 — Center Middle',
  6:  'Bed 6 — North Center',
  7:  'Bed 7 — Bottom Row',
  8:  'Bed 8 — South Strip',
  9:  'Bed 9 — North Strip',
  10: 'Bed 10 — West Border',
};

// Ten plants chosen for good visual variety across the PDF
// (mix of categories and emoji to exercise the colour palette)
const SELECTED_PLANT_NAMES = [
  'Tomato (Cherry)',
  'Bell Pepper',
  'Carrot',
  'Kale',
  'Lettuce',
  'Cucumber',
  'Basil',
  'Dill',
  'Strawberry',
  'Jalapeño',
];

function parseLayout(csvPath) {
  const rows = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  const grid = rows.map(r =>
    r.split(',').map(v => (v.trim() === '' ? null : Number(v)))
  );

  const beds = {};
  grid.forEach((row, r) => {
    row.forEach((val, c) => {
      if (!val) return;
      if (!beds[val]) beds[val] = { minR: r, maxR: r, minC: c, maxC: c };
      beds[val].minR = Math.min(beds[val].minR, r);
      beds[val].maxR = Math.max(beds[val].maxR, r);
      beds[val].minC = Math.min(beds[val].minC, c);
      beds[val].maxC = Math.max(beds[val].maxC, c);
    });
  });

  return Object.entries(beds)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([id, b]) => ({
      id: Number(id),
      name: BED_NAMES[Number(id)] || `Bed ${id}`,
      rows: b.maxR - b.minR + 1,
      cols: b.maxC - b.minC + 1,
      mapRow: b.minR,
      mapCol: b.minC,
    }));
}

// Deterministic-ish shuffle using a simple LCG seeded by an integer
function seededShuffle(arr, seed) {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildCells(bed, bedIndex, plantIds) {
  // Each bed gets a 3–5 plant subset, seeded by bed index for variety
  const subsetSize = 3 + (bedIndex % 3);
  const bedPlants = seededShuffle(plantIds, bedIndex * 37 + 7).slice(0, subsetSize);

  const cells = [];
  for (let r = 0; r < bed.rows; r++) {
    for (let c = 0; c < bed.cols; c++) {
      // ~75% fill rate — leave some cells empty for a natural look
      const val = Math.abs((bedIndex * 1000 + r * 100 + c * 17) * 2654435761) % 100;
      if (val >= 75) continue;
      const plant = bedPlants[Math.abs((r * 31 + c * 17 + bedIndex) * 2654435761) % bedPlants.length];
      cells.push({ row: r, col: c, plantId: plant });
    }
  }
  return cells;
}

async function seedBeds({ force = false } = {}) {
  const user = await User.findOne({ email: 'mike@gardenhive.com' });
  if (!user) throw new Error('Default user not found. Run seedUser first.');

  const existing = await GardenBed.countDocuments({ userId: user._id });
  if (existing > 0) {
    if (!force) {
      console.log(`${user.name} already has ${existing} beds. Skipping.`);
      return;
    }
    await GardenBed.deleteMany({ userId: user._id });
    console.log('Cleared existing beds.');
  }

  // Resolve plants for cell seeding
  const plants = await Plant.find({ name: { $in: SELECTED_PLANT_NAMES } });
  if (!plants.length) throw new Error('No plants found. Run seedPlants first.');
  const plantIds = plants.map(p => p._id);
  console.log(`  Using ${plantIds.length} plants for cell seeding.`);

  const bedDefs = parseLayout(CSV_PATH);
  for (let i = 0; i < bedDefs.length; i++) {
    const bed = bedDefs[i];
    const cells = buildCells(bed, i, plantIds);
    await GardenBed.create({
      userId: user._id,
      name: bed.name,
      rows: bed.rows,
      cols: bed.cols,
      mapRow: bed.mapRow,
      mapCol: bed.mapCol,
      cells,
    });
    console.log(`  Created: ${bed.name} (${bed.rows}×${bed.cols}) — ${cells.length}/${bed.rows * bed.cols} cells planted`);
  }

  console.log(`Seeded ${bedDefs.length} beds for ${user.name}.`);
}

module.exports = { seedBeds };

// ── Standalone entrypoint ─────────────────────────────────────────────────────
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGO_URI)
    .then(() => seedBeds({ force: process.argv.includes('--force') }))
    .then(() => mongoose.disconnect())
    .catch((err) => { console.error(err); process.exit(1); });
}
