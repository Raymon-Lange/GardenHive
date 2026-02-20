const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Plant = require('../models/Plant');
const Harvest = require('../models/Harvest');

const DATA_DIR = path.join(__dirname, 'data');

function parseHarvestCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, plant, quantity, unit] = lines[i].split(',').map(s => s.trim());
    const qty = parseFloat(quantity);
    if (!date || !plant || isNaN(qty) || qty <= 0) continue;
    records.push({ date: new Date(`${date}T12:00:00`), plantName: plant, quantity: qty, unit });
  }
  return records;
}

async function seedHarvests({ force = false } = {}) {
  const user = await User.findOne({ email: 'mike@gardenhive.com' });
  if (!user) throw new Error('Default user not found. Run seedUser first.');

  const existing = await Harvest.countDocuments({ userId: user._id });
  if (existing > 0) {
    if (!force) {
      console.log(`${user.name} already has ${existing} harvest entries. Skipping.`);
      return;
    }
    await Harvest.deleteMany({ userId: user._id });
    console.log('Cleared existing harvests.');
  }

  // Build plant name → _id lookup
  const allPlants = await Plant.find({});
  const plantByName = {};
  allPlants.forEach(p => { plantByName[p.name] = p._id; });

  // Read all harvests_YYYY.csv files in order
  const csvFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^harvests_\d{4}\.csv$/))
    .sort();

  const byYear = {};
  let created = 0;

  for (const file of csvFiles) {
    const records = parseHarvestCSV(path.join(DATA_DIR, file));
    for (const r of records) {
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
  }

  console.log(`Seeded ${created} harvest entries for ${user.name}:`);
  Object.entries(byYear).sort().forEach(([yr, count]) => {
    console.log(`  ${yr}: ${count} entries`);
  });
}

module.exports = { seedHarvests };

// ── Standalone entrypoint ─────────────────────────────────────────────────────
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGO_URI)
    .then(() => seedHarvests({ force: process.argv.includes('--force') }))
    .then(() => mongoose.disconnect())
    .catch((err) => { console.error(err); process.exit(1); });
}
