const {
  connectDB, disconnectDB, clearDB,
  api, createUser, createBed, createHarvest, createSystemPlant,
} = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

const SUPER_ADMIN_EMAIL = 'raymon.lange@gmail.com';

async function createSuperAdmin() {
  return createUser({ email: SUPER_ADMIN_EMAIL });
}

// ── GET /api/admin/stats ──────────────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  it('returns 200 with totalUsers, totalGardens, totalHarvests as integers', async () => {
    const { token } = await createSuperAdmin();
    const { user: other } = await createUser();
    const plant = await createSystemPlant({ name: 'Tomato', emoji: '🍅' });
    await createBed(other._id);
    await createHarvest(other._id, plant._id);

    const res = await api()
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.totalUsers).toBe('number');
    expect(typeof res.body.totalGardens).toBe('number');
    expect(typeof res.body.totalHarvests).toBe('number');
    expect(res.body.totalUsers).toBe(2);
    expect(res.body.totalGardens).toBe(1);
    expect(res.body.totalHarvests).toBe(1);
  });

  it('returns 403 for a non-admin authenticated user', async () => {
    const { token } = await createUser();

    const res = await api()
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await api().get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('returns 200 with users array sorted newest-created first', async () => {
    const { token } = await createSuperAdmin();
    // Create two more users in sequence
    await createUser({ email: 'first@test.com' });
    await createUser({ email: 'second@test.com' });

    const res = await api()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
    // Sorted newest first: second < first < super admin (by createdAt desc)
    const emails = res.body.map((u) => u.email);
    expect(emails[0]).toBe('second@test.com');
    expect(emails[1]).toBe('first@test.com');
  });

  it('returns lastLoginAt as null for a user who has never logged in', async () => {
    const { token } = await createSuperAdmin();
    await createUser({ email: 'nologin@test.com' });

    const res = await api()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const noLoginUser = res.body.find((u) => u.email === 'nologin@test.com');
    expect(noLoginUser).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(noLoginUser, 'lastLoginAt')).toBe(true);
    expect(noLoginUser.lastLoginAt).toBeNull();
  });

  it('returns bedCount and harvestCount as integers, correct for a user with one bed', async () => {
    const { token } = await createSuperAdmin();
    const { user: other } = await createUser({ email: 'gardener@test.com' });
    const plant = await createSystemPlant({ name: 'Cucumber', emoji: '🥒' });
    await createBed(other._id);
    await createHarvest(other._id, plant._id);
    await createHarvest(other._id, plant._id);

    const res = await api()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const gardener = res.body.find((u) => u.email === 'gardener@test.com');
    expect(gardener.bedCount).toBe(1);
    expect(gardener.harvestCount).toBe(2);
  });

  it('returns bedCount 0 and harvestCount 0 for a user with no activity', async () => {
    const { token } = await createSuperAdmin();
    await createUser({ email: 'inactive@test.com' });

    const res = await api()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    const inactive = res.body.find((u) => u.email === 'inactive@test.com');
    expect(inactive.bedCount).toBe(0);
    expect(inactive.harvestCount).toBe(0);
  });

  it('does not expose passwordHash in any user row', async () => {
    const { token } = await createSuperAdmin();
    await createUser();

    const res = await api()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.forEach((u) => {
      expect(u.passwordHash).toBeUndefined();
    });
  });

  it('returns 403 for a non-admin authenticated user', async () => {
    const { token } = await createUser();

    const res = await api()
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await api().get('/api/admin/users');
    expect(res.status).toBe(401);
  });
});
