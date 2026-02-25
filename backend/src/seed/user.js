const bcrypt = require('bcryptjs');
const User = require('../models/User');

const DEFAULT_USER = {
  name: 'Mike Jones',
  email: 'mike@gardenhive.com',
  password: '321qaz',
  role: 'owner',
};

const SUPER_ADMIN = {
  name: 'Raymon',
  email: 'raymon.lange@gmail.com',
  password: '321qaz',
  role: 'owner',
};

async function seedUser({ force = false } = {}) {
  const existing = await User.findOne({ email: DEFAULT_USER.email });
  if (existing) {
    if (!force) {
      console.log(`User "${DEFAULT_USER.name}" already exists. Skipping.`);
      return;
    }
    await User.deleteOne({ email: DEFAULT_USER.email });
    console.log('Removed existing user.');
  }

  const passwordHash = await bcrypt.hash(DEFAULT_USER.password, 12);
  const user = await User.create({
    name: DEFAULT_USER.name,
    email: DEFAULT_USER.email,
    passwordHash,
    role: DEFAULT_USER.role,
    gardenWidth: 32,
    gardenHeight: 20,
  });

  console.log(`Created default user:`);
  console.log(`  Name:     ${user.name}`);
  console.log(`  Email:    ${DEFAULT_USER.email}`);
  console.log(`  Password: ${DEFAULT_USER.password}`);
}

async function seedSuperAdmin({ force = false } = {}) {
  const existing = await User.findOne({ email: SUPER_ADMIN.email });
  if (existing) {
    if (!force) {
      console.log(`User "${SUPER_ADMIN.name}" already exists. Skipping.`);
      return;
    }
    await User.deleteOne({ email: SUPER_ADMIN.email });
    console.log('Removed existing super admin.');
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 12);
  const user = await User.create({
    name: SUPER_ADMIN.name,
    email: SUPER_ADMIN.email,
    passwordHash,
    role: SUPER_ADMIN.role,
  });

  console.log(`Created super admin:`);
  console.log(`  Name:     ${user.name}`);
  console.log(`  Email:    ${SUPER_ADMIN.email}`);
  console.log(`  Password: ${SUPER_ADMIN.password}`);
}

module.exports = { seedUser, seedSuperAdmin };

// ── Standalone entrypoint ─────────────────────────────────────────────────────
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const mongoose = require('mongoose');
  const force = process.argv.includes('--force');
  mongoose.connect(process.env.MONGO_URI)
    .then(() => seedUser({ force }))
    .then(() => seedSuperAdmin({ force }))
    .then(() => mongoose.disconnect())
    .catch((err) => { console.error(err); process.exit(1); });
}
