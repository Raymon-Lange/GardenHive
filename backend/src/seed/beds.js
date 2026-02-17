require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const GardenBed = require('../models/GardenBed');

const CSV_PATH = path.join(require('os').homedir(), 'Downloads', 'layout.csv');

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

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ email: 'mike@gardenhive.com' });
  if (!user) {
    console.error('Default user not found. Run: npm run seed:user first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const existing = await GardenBed.countDocuments({ userId: user._id });
  if (existing > 0) {
    console.log(`Mike already has ${existing} beds. Skipping.`);
    console.log('Run with --force to re-seed: node src/seed/beds.js --force');
    if (!process.argv.includes('--force')) {
      await mongoose.disconnect();
      return;
    }
    await GardenBed.deleteMany({ userId: user._id });
    console.log('Cleared existing beds.');
  }

  const bedDefs = parseLayout(CSV_PATH);

  for (const bed of bedDefs) {
    await GardenBed.create({
      userId: user._id,
      name: bed.name,
      rows: bed.rows,
      cols: bed.cols,
      mapRow: bed.mapRow,
      mapCol: bed.mapCol,
      cells: [],
    });
    console.log(`  Created: ${bed.name} (${bed.rows}×${bed.cols}) @ map [${bed.mapRow},${bed.mapCol}]`);
  }

  console.log(`\nSeeded ${bedDefs.length} beds for ${user.name}.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
