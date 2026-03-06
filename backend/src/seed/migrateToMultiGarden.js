/**
 * Migration: Multi-Garden
 *
 * Creates a Garden document for each owner user that doesn't have one yet,
 * sets user.activeGardenId, and assigns gardenId to all their GardenBeds.
 *
 * Idempotent — safe to re-run. Skips users who already have activeGardenId set.
 *
 * Run: node backend/src/seed/migrateToMultiGarden.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User      = require('../models/User');
const Garden    = require('../models/Garden');
const GardenBed = require('../models/GardenBed');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const owners = await User.find({ role: 'owner', activeGardenId: null });
  console.log(`Found ${owners.length} owner(s) to migrate`);

  let migrated = 0;
  let skipped  = 0;

  for (const user of owners) {
    // Double-check: skip if already has an active garden
    if (user.activeGardenId) {
      skipped++;
      continue;
    }

    const garden = await Garden.create({
      userId:       user._id,
      name:         user.gardenName || 'My Garden',
      gardenWidth:  user.gardenWidth  || null,
      gardenHeight: user.gardenHeight || null,
    });

    user.activeGardenId = garden._id;
    await user.save();

    const { modifiedCount } = await GardenBed.updateMany(
      { userId: user._id, gardenId: { $exists: false } },
      { $set: { gardenId: garden._id } }
    );

    console.log(
      `  ✓ User ${user.email}: created garden "${garden.name}", ` +
      `updated ${modifiedCount} bed(s)`
    );
    migrated++;
  }

  const alreadyMigrated = await User.countDocuments({ role: 'owner', activeGardenId: { $ne: null } });
  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped, ${alreadyMigrated} already had gardens`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
