const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');

// Import app without triggering mongoose.connect (app.js does not connect)
const app = require('../app');

// Import models for test data setup
const User = require('../models/User');
const Plant = require('../models/Plant');
const GardenBed = require('../models/GardenBed');
const Garden = require('../models/Garden');
const Harvest = require('../models/Harvest');
const GardenAccess = require('../models/GardenAccess');

// ── DB Lifecycle ──────────────────────────────────────────────────────────────

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI);
}

async function disconnectDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

// ── Auth Helpers ──────────────────────────────────────────────────────────────

function makeToken(userId) {
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function authHeader(userId) {
  return { Authorization: `Bearer ${makeToken(userId)}` };
}

// ── User Factory ──────────────────────────────────────────────────────────────

// bcrypt cost 1 (vs 12 in prod) keeps tests fast (~2ms vs ~400ms per hash)
async function createUser(overrides = {}) {
  const user = await User.create({
    name: 'Test Owner',
    email: `owner-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash: await bcrypt.hash('password123', 1),
    role: 'owner',
    active: true,
    ...overrides,
  });
  return { user, token: makeToken(user._id) };
}

async function createHelper(overrides = {}) {
  return createUser({ name: 'Test Helper', role: 'helper', ...overrides });
}

// ── Data Factories ────────────────────────────────────────────────────────────

async function createSystemPlant(overrides = {}) {
  return Plant.create({
    name: 'Tomato',
    category: 'vegetable',
    emoji: '🍅',
    ownerId: null,
    ...overrides,
  });
}

async function createCustomPlant(ownerId, overrides = {}) {
  return Plant.create({
    name: `Plant-${Date.now()}`,
    category: 'vegetable',
    ownerId,
    ...overrides,
  });
}

async function createGarden(userId, overrides = {}) {
  const garden = await Garden.create({
    userId,
    name: 'Test Garden',
    gardenWidth: null,
    gardenHeight: null,
    ...overrides,
  });
  // Set as active garden on the user
  await User.findByIdAndUpdate(userId, { activeGardenId: garden._id });
  return garden;
}

async function createBed(userId, gardenId, overrides = {}) {
  return GardenBed.create({
    userId,
    gardenId,
    name: 'Test Bed',
    rows: 3,
    cols: 3,
    cells: [],
    ...overrides,
  });
}

async function createHarvest(userId, plantId, overrides = {}) {
  return Harvest.create({
    userId,
    loggedById: userId,
    plantId,
    quantity: 10,
    unit: 'oz',
    harvestedAt: new Date(),
    ...overrides,
  });
}

async function createGrant(ownerId, granteeId, granteeEmail, permission = 'full') {
  return GardenAccess.create({
    ownerId,
    granteeId,
    granteeEmail,
    permission,
    status: 'active',
  });
}

// ── Request Helper ────────────────────────────────────────────────────────────

function api() {
  return request(app);
}

module.exports = {
  connectDB,
  disconnectDB,
  clearDB,
  makeToken,
  authHeader,
  createUser,
  createHelper,
  createSystemPlant,
  createCustomPlant,
  createGarden,
  createBed,
  createHarvest,
  createGrant,
  api,
};
