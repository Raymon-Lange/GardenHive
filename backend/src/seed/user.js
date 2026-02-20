const bcrypt = require('bcryptjs');
const User = require('../models/User');

const DEFAULT_USER = {
  name: 'Mike Jones',
  email: 'mike@gardenhive.com',
  password: '321qaz',
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
  const user = await User.create({ name: DEFAULT_USER.name, email: DEFAULT_USER.email, passwordHash });

  console.log(`Created default user:`);
  console.log(`  Name:     ${user.name}`);
  console.log(`  Email:    ${DEFAULT_USER.email}`);
  console.log(`  Password: ${DEFAULT_USER.password}`);
}

module.exports = { seedUser };

// ── Standalone entrypoint ─────────────────────────────────────────────────────
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGO_URI)
    .then(() => seedUser({ force: process.argv.includes('--force') }))
    .then(() => mongoose.disconnect())
    .catch((err) => { console.error(err); process.exit(1); });
}
