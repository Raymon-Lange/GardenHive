const { seedUser, seedSuperAdmin } = require('./user');
const { seedPlants }   = require('./plants');
const { seedBeds }     = require('./beds');
const { seedHarvests } = require('./harvests');

async function seedAll({ force = true } = {}) {
  console.log('--- Seeding database ---');
  await seedUser({ force });
  await seedSuperAdmin({ force });
  await seedPlants({ force });
  await seedBeds({ force });
  await seedHarvests({ force });
  console.log('--- Seeding complete ---');
}

module.exports = { seedAll };

// ── Standalone entrypoint ─────────────────────────────────────────────────────
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGO_URI)
    .then(() => seedAll({ force: true }))
    .then(() => mongoose.disconnect())
    .catch((err) => { console.error(err); process.exit(1); });
}
