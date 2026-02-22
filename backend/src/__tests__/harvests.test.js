const {
  connectDB, disconnectDB, clearDB,
  authHeader, createUser, createHelper, createSystemPlant, createHarvest, createGrant,
  api,
} = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

// ── GET /api/harvests ─────────────────────────────────────────────────────────

describe('GET /api/harvests', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/harvests');
    expect(res.status).toBe(401);
  });

  it('returns empty array when owner has no harvests', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/harvests')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns harvests with populated plantId and loggedById', async () => {
    const { user, token } = await createUser();
    const plant = await createSystemPlant({ name: 'Carrot' });
    await createHarvest(user._id, plant._id);

    const res = await api()
      .get('/api/harvests')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const h = res.body[0];
    expect(h._id).toBeDefined();
    expect(h.quantity).toBe(10);
    expect(h.unit).toBe('oz');
    expect(h.plantId).toMatchObject({ _id: expect.any(String), name: 'Carrot' });
    expect(h.loggedById).toMatchObject({ _id: expect.any(String), name: expect.any(String) });
  });

  it('returns harvests for helper with analytics permission', async () => {
    const { user: owner } = await createUser();
    const { user: helper, token: helperToken } = await createHelper();
    await createGrant(owner._id, helper._id, helper.email, 'analytics');
    const plant = await createSystemPlant();
    await createHarvest(owner._id, plant._id);

    const res = await api()
      .get(`/api/harvests?ownerId=${owner._id}`)
      .set('Authorization', `Bearer ${helperToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// ── GET /api/harvests/totals ──────────────────────────────────────────────────

describe('GET /api/harvests/totals', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/harvests/totals');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no harvests exist', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/harvests/totals')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns aggregated totals with correct shape', async () => {
    const { user, token } = await createUser();
    const plant = await createSystemPlant({ name: 'Pepper', emoji: '🌶️' });
    await createHarvest(user._id, plant._id, { quantity: 5, unit: 'lbs' });
    await createHarvest(user._id, plant._id, { quantity: 3, unit: 'lbs' });

    const res = await api()
      .get('/api/harvests/totals')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const item = res.body[0];
    expect(item.plantId).toBeDefined();
    expect(item.plantName).toBe('Pepper');
    expect(item.plantEmoji).toBe('🌶️');
    expect(item.plantCategory).toBe('vegetable');
    expect(typeof item.total).toBe('number');
    expect(typeof item.count).toBe('number');
    expect(item.unit).toBe('lbs');
    expect(typeof item.season).toBe('string');
  });
});

// ── GET /api/harvests/yoy ─────────────────────────────────────────────────────

describe('GET /api/harvests/yoy', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/harvests/yoy');
    expect(res.status).toBe(401);
  });

  it('returns empty response structure when no harvests', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/harvests/yoy')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.years).toEqual([]);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(12);
    expect(res.body.data[0]).toHaveProperty('month');
  });

  it('returns years array and month-keyed data when harvests exist across two years', async () => {
    const { user, token } = await createUser();
    const plant = await createSystemPlant();
    await createHarvest(user._id, plant._id, { harvestedAt: new Date('2024-06-15') });
    await createHarvest(user._id, plant._id, { harvestedAt: new Date('2025-06-15') });

    const res = await api()
      .get('/api/harvests/yoy')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.years).toHaveLength(2);
    expect(res.body.years).toContain('2024');
    expect(res.body.years).toContain('2025');
    // Each month row should have keys for each year
    const junRow = res.body.data.find((d) => d.month === 'Jun');
    expect(junRow).toBeDefined();
    expect(junRow['2024_oz']).toBeGreaterThan(0);
    expect(junRow['2025_oz']).toBeGreaterThan(0);
  });
});

// ── GET /api/harvests/weekly ──────────────────────────────────────────────────

describe('GET /api/harvests/weekly', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/harvests/weekly');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no harvests this year', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/harvests/weekly')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // With no harvests, all weeks are 0 and trailing zeros are trimmed → empty
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns weekly data with correct shape when harvests exist', async () => {
    const { user, token } = await createUser();
    const plant = await createSystemPlant();
    const year = new Date().getFullYear();
    await createHarvest(user._id, plant._id, {
      harvestedAt: new Date(`${year}-06-15`),
      quantity: 20,
      unit: 'oz',
    });

    const res = await api()
      .get('/api/harvests/weekly')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const item = res.body[0];
    expect(item).toHaveProperty('week');
    expect(item.week).toMatch(/^Wk \d+$/);
    expect(typeof item.oz).toBe('number');
    expect(typeof item.count).toBe('number');
  });
});

// ── GET /api/harvests/years ───────────────────────────────────────────────────

describe('GET /api/harvests/years', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/harvests/years');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no harvests', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/harvests/years')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns years in descending order', async () => {
    const { user, token } = await createUser();
    const plant = await createSystemPlant();
    await createHarvest(user._id, plant._id, { harvestedAt: new Date('2024-03-01') });
    await createHarvest(user._id, plant._id, { harvestedAt: new Date('2025-07-01') });

    const res = await api()
      .get('/api/harvests/years')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([2025, 2024]);
  });
});

// ── GET /api/harvests/monthly ─────────────────────────────────────────────────

describe('GET /api/harvests/monthly', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/harvests/monthly');
    expect(res.status).toBe(401);
  });

  it('returns 12 months with zeros when no harvests', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/harvests/monthly')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(12);
    expect(res.body[0]).toHaveProperty('month');
    expect(res.body[0].totalOz).toBe(0);
    expect(res.body[0].entries).toBe(0);
  });
});

// ── POST /api/harvests ────────────────────────────────────────────────────────

describe('POST /api/harvests', () => {
  it('returns 401 with no token', async () => {
    const res = await api().post('/api/harvests').send({});
    expect(res.status).toBe(401);
  });

  it('returns 400 when plantId is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/harvests')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 10, unit: 'oz' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when quantity is missing', async () => {
    const { token } = await createUser();
    const plant = await createSystemPlant();
    const res = await api()
      .post('/api/harvests')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId: plant._id.toString(), unit: 'oz' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when unit is missing', async () => {
    const { token } = await createUser();
    const plant = await createSystemPlant();
    const res = await api()
      .post('/api/harvests')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId: plant._id.toString(), quantity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 201 with correct shape on valid creation', async () => {
    const { token } = await createUser();
    const plant = await createSystemPlant({ name: 'Zucchini' });
    const res = await api()
      .post('/api/harvests')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId: plant._id.toString(), quantity: 8, unit: 'lbs' });
    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.quantity).toBe(8);
    expect(res.body.unit).toBe('lbs');
    expect(typeof res.body.season).toBe('string');
    expect(res.body.plantId).toMatchObject({ _id: expect.any(String), name: 'Zucchini' });
    expect(res.body.loggedById).toMatchObject({ _id: expect.any(String) });
  });

  it('returns 403 for helper with only analytics permission', async () => {
    const { user: owner } = await createUser();
    const { user: helper, token: helperToken } = await createHelper();
    await createGrant(owner._id, helper._id, helper.email, 'analytics');
    const plant = await createSystemPlant();

    const res = await api()
      .post(`/api/harvests?ownerId=${owner._id}`)
      .set('Authorization', `Bearer ${helperToken}`)
      .send({ plantId: plant._id.toString(), quantity: 5, unit: 'oz' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/insufficient permission/i);
  });

  it('records userId as owner and loggedById as helper when helper posts', async () => {
    const { user: owner } = await createUser();
    const { user: helper, token: helperToken } = await createHelper();
    await createGrant(owner._id, helper._id, helper.email, 'harvests_analytics');
    const plant = await createSystemPlant();

    const res = await api()
      .post(`/api/harvests?ownerId=${owner._id}`)
      .set('Authorization', `Bearer ${helperToken}`)
      .send({ plantId: plant._id.toString(), quantity: 3, unit: 'oz' });
    expect(res.status).toBe(201);
    expect(res.body.userId.toString()).toBe(owner._id.toString());
    expect(res.body.loggedById._id.toString()).toBe(helper._id.toString());
  });
});

// ── DELETE /api/harvests/:id ──────────────────────────────────────────────────

describe('DELETE /api/harvests/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().delete('/api/harvests/000000000000000000000001');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent harvest', async () => {
    const { token } = await createUser();
    const res = await api()
      .delete('/api/harvests/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 200 and deletes the harvest', async () => {
    const { user, token } = await createUser();
    const plant = await createSystemPlant();
    const harvest = await createHarvest(user._id, plant._id);

    const res = await api()
      .delete(`/api/harvests/${harvest._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();

    // Confirm it's gone
    const listRes = await api()
      .get('/api/harvests')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.find((h) => h._id.toString() === harvest._id.toString())).toBeUndefined();
  });
});
