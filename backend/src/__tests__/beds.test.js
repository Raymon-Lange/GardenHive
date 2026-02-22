const {
  connectDB, disconnectDB, clearDB,
  authHeader, createUser, createHelper, createBed, createGrant, createSystemPlant,
  api,
} = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

// ── GET /api/beds ─────────────────────────────────────────────────────────────

describe('GET /api/beds', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/beds');
    expect(res.status).toBe(401);
  });

  it('returns empty array when owner has no beds', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/beds')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all beds belonging to the owner', async () => {
    const { user, token } = await createUser();
    await createBed(user._id, { name: 'Bed A' });
    await createBed(user._id, { name: 'Bed B' });
    const res = await api()
      .get('/api/beds')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ name: expect.any(String), rows: expect.any(Number), cols: expect.any(Number), cells: expect.any(Array) });
  });

  it('returns 403 for helper with only analytics permission', async () => {
    const { user: owner } = await createUser();
    const { user: helper, token: helperToken } = await createHelper();
    await createGrant(owner._id, helper._id, helper.email, 'analytics');

    const res = await api()
      .get(`/api/beds?ownerId=${owner._id}`)
      .set('Authorization', `Bearer ${helperToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/insufficient permission/i);
  });

  it('returns owner beds for helper with full permission', async () => {
    const { user: owner } = await createUser();
    const { user: helper, token: helperToken } = await createHelper();
    await createGrant(owner._id, helper._id, helper.email, 'full');
    await createBed(owner._id, { name: 'Owner Bed' });

    const res = await api()
      .get(`/api/beds?ownerId=${owner._id}`)
      .set('Authorization', `Bearer ${helperToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((b) => b.name === 'Owner Bed')).toBe(true);
  });
});

// ── GET /api/beds/:id ─────────────────────────────────────────────────────────

describe('GET /api/beds/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/beds/000000000000000000000001');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent bed', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/beds/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns the bed with cells populated", async () => {
    const { user, token } = await createUser();
    const bed = await createBed(user._id, { name: 'Test Bed' });
    const res = await api()
      .get(`/api/beds/${bed._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body._id.toString()).toBe(bed._id.toString());
    expect(Array.isArray(res.body.cells)).toBe(true);
  });
});

// ── POST /api/beds ────────────────────────────────────────────────────────────

describe('POST /api/beds', () => {
  it('returns 401 with no token', async () => {
    const res = await api().post('/api/beds').send({ name: 'Bed', rows: 3, cols: 3 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/beds')
      .set('Authorization', `Bearer ${token}`)
      .send({ rows: 3, cols: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when rows is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/beds')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bed', cols: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when cols is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/beds')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bed', rows: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 201 on valid creation', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/beds')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Bed', rows: 4, cols: 4 });
    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.name).toBe('New Bed');
    expect(res.body.rows).toBe(4);
    expect(res.body.cols).toBe(4);
    expect(res.body.cells).toEqual([]);
  });

  it('returns 403 for helper with full permission trying to create a bed', async () => {
    const { user: owner } = await createUser();
    const { user: helper, token: helperToken } = await createHelper();
    await createGrant(owner._id, helper._id, helper.email, 'full');

    const res = await api()
      .post(`/api/beds?ownerId=${owner._id}`)
      .set('Authorization', `Bearer ${helperToken}`)
      .send({ name: 'Helper Bed', rows: 2, cols: 2 });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/only the garden owner/i);
  });
});

// ── PUT /api/beds/:id ─────────────────────────────────────────────────────────

describe('PUT /api/beds/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().put('/api/beds/000000000000000000000001').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent bed', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/beds/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 200 and updates bed name', async () => {
    const { user, token } = await createUser();
    const bed = await createBed(user._id, { name: 'Old Name' });
    const res = await api()
      .put(`/api/beds/${bed._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });
});

// ── PUT /api/beds/:id/cells ───────────────────────────────────────────────────

describe('PUT /api/beds/:id/cells', () => {
  it('returns 401 with no token', async () => {
    const res = await api().put('/api/beds/000000000000000000000001/cells').send({});
    expect(res.status).toBe(401);
  });

  it('sets a cell with a plant', async () => {
    const { user, token } = await createUser();
    const bed = await createBed(user._id);
    const plant = await createSystemPlant();
    const res = await api()
      .put(`/api/beds/${bed._id}/cells`)
      .set('Authorization', `Bearer ${token}`)
      .send({ row: 0, col: 0, plantId: plant._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.cells).toHaveLength(1);
    expect(res.body.cells[0].row).toBe(0);
    expect(res.body.cells[0].col).toBe(0);
    expect(res.body.cells[0].plantId._id.toString()).toBe(plant._id.toString());
  });

  it('clears a cell when plantId is null', async () => {
    const { user, token } = await createUser();
    const plant = await createSystemPlant();
    const bed = await createBed(user._id, { cells: [{ row: 0, col: 0, plantId: plant._id }] });

    const res = await api()
      .put(`/api/beds/${bed._id}/cells`)
      .set('Authorization', `Bearer ${token}`)
      .send({ row: 0, col: 0, plantId: null });
    expect(res.status).toBe(200);
    expect(res.body.cells).toHaveLength(0);
  });
});

// ── DELETE /api/beds/:id ──────────────────────────────────────────────────────

describe('DELETE /api/beds/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().delete('/api/beds/000000000000000000000001');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent bed', async () => {
    const { token } = await createUser();
    const res = await api()
      .delete('/api/beds/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 and deletes the bed for the owner', async () => {
    const { user, token } = await createUser();
    const bed = await createBed(user._id);
    const res = await api()
      .delete(`/api/beds/${bed._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();

    // Confirm it's gone
    const getRes = await api()
      .get(`/api/beds/${bed._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 403 for helper with full permission trying to delete a bed', async () => {
    const { user: owner } = await createUser();
    const { user: helper, token: helperToken } = await createHelper();
    await createGrant(owner._id, helper._id, helper.email, 'full');
    const bed = await createBed(owner._id);

    const res = await api()
      .delete(`/api/beds/${bed._id}?ownerId=${owner._id}`)
      .set('Authorization', `Bearer ${helperToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/only the garden owner/i);
  });
});
