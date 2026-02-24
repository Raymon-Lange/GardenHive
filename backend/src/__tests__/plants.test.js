const {
  connectDB, disconnectDB, clearDB,
  authHeader, createUser, createSystemPlant, createCustomPlant, createBed, createHarvest,
  api,
} = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

// ── GET /api/plants/public ────────────────────────────────────────────────────

describe('GET /api/plants/public', () => {
  it('returns 200 with no auth header', async () => {
    const res = await api().get('/api/plants/public');
    expect(res.status).toBe(200);
  });

  it('returns an array of system plants', async () => {
    await createSystemPlant({ name: 'Basil' });
    await createSystemPlant({ name: 'Thyme' });
    const res = await api().get('/api/plants/public');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((p) => p.name === 'Basil')).toBe(true);
    expect(res.body.some((p) => p.name === 'Thyme')).toBe(true);
  });

  it('excludes custom plants (ownerId != null)', async () => {
    const { user } = await createUser();
    await createSystemPlant({ name: 'System Plant' });
    await createCustomPlant(user._id, { name: 'Custom Plant' });
    const res = await api().get('/api/plants/public');
    expect(res.status).toBe(200);
    expect(res.body.some((p) => p.name === 'Custom Plant')).toBe(false);
    expect(res.body.some((p) => p.name === 'System Plant')).toBe(true);
  });

  it('returns empty array when no system plants exist', async () => {
    const res = await api().get('/api/plants/public');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── GET /api/plants ───────────────────────────────────────────────────────────

describe('GET /api/plants', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/plants');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no plants exist', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/plants')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns system plants (ownerId: null)', async () => {
    const { user, token } = await createUser();
    await createSystemPlant({ name: 'Basil' });
    const res = await api()
      .get('/api/plants')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.some((p) => p.name === 'Basil')).toBe(true);
  });

  it("returns user's own custom plants", async () => {
    const { user, token } = await createUser();
    await createCustomPlant(user._id, { name: 'My Herb' });
    const res = await api()
      .get('/api/plants')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.some((p) => p.name === 'My Herb')).toBe(true);
  });

  it("does not return another user's custom plants", async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    await createCustomPlant(other._id, { name: 'Secret Plant' });
    const res = await api()
      .get('/api/plants')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.some((p) => p.name === 'Secret Plant')).toBe(false);
  });

  it('excludes hidden plants by default', async () => {
    const { user, token } = await createUser();
    const plant = await createSystemPlant({ name: 'Hidden Herb' });
    // Add to hidden list
    await api()
      .post('/api/auth/me/hidden-plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId: plant._id.toString() });

    const res = await api()
      .get('/api/plants')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.some((p) => p._id.toString() === plant._id.toString())).toBe(false);
  });

  it('includes hidden plants with ?showAll=true and annotates them', async () => {
    const { user, token } = await createUser();
    const plant = await createSystemPlant({ name: 'Visible Plant' });
    // Hide it
    await api()
      .post('/api/auth/me/hidden-plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId: plant._id.toString() });

    const res = await api()
      .get('/api/plants?showAll=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const found = res.body.find((p) => p._id.toString() === plant._id.toString());
    expect(found).toBeDefined();
    expect(found.hidden).toBe(true);
  });
});

// ── GET /api/plants/:id ───────────────────────────────────────────────────────

describe('GET /api/plants/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/plants/000000000000000000000001');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent plant', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/plants/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns the plant on valid id', async () => {
    const { token } = await createUser();
    const plant = await createSystemPlant();
    const res = await api()
      .get(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body._id.toString()).toBe(plant._id.toString());
    expect(res.body.name).toBe(plant.name);
    expect(res.body.ownerId).toBeNull();
  });
});

// ── POST /api/plants ──────────────────────────────────────────────────────────

describe('POST /api/plants', () => {
  it('returns 401 with no token', async () => {
    const res = await api().post('/api/plants').send({ name: 'Mint' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'herb' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 201 with ownerId set to requesting user when only name is provided', async () => {
    const { user, token } = await createUser();
    const res = await api()
      .post('/api/plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mint' });
    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.name).toBe('Mint');
    expect(res.body.ownerId.toString()).toBe(user._id.toString());
  });

  it('returns 201 with all optional fields when provided', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/plants')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Lavender',
        category: 'herb',
        emoji: '💜',
        perSqFt: 1,
        daysToHarvest: 90,
        daysToGermination: 14,
        spacingIn: 12,
        depthIn: 0.25,
      });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('herb');
    expect(res.body.emoji).toBe('💜');
    expect(res.body.perSqFt).toBe(1);
  });
});

// ── PUT /api/plants/:id ───────────────────────────────────────────────────────

describe('PUT /api/plants/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().put('/api/plants/000000000000000000000001').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent plant', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/plants/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when trying to update a system plant', async () => {
    const { token } = await createUser();
    const plant = await createSystemPlant();
    const res = await api()
      .put(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not your plant/i);
  });

  it("returns 403 when trying to update another user's plant", async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    const plant = await createCustomPlant(other._id, { name: 'Other Plant' });
    const res = await api()
      .put(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Stolen' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not your plant/i);
  });

  it('returns 200 and updates own custom plant', async () => {
    const { user, token } = await createUser();
    const plant = await createCustomPlant(user._id, { name: 'Old Name' });
    const res = await api()
      .put(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });
});

// ── DELETE /api/plants/:id ────────────────────────────────────────────────────

describe('DELETE /api/plants/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().delete('/api/plants/000000000000000000000001');
    expect(res.status).toBe(401);
  });

  it('returns 400 when trying to delete a system plant', async () => {
    const { token } = await createUser();
    const plant = await createSystemPlant();
    const res = await api()
      .delete(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/system plants cannot be deleted/i);
  });

  it("returns 403 when trying to delete another user's plant", async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    const plant = await createCustomPlant(other._id);
    const res = await api()
      .delete(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not your plant/i);
  });

  it('returns 400 when plant is in use in a garden bed', async () => {
    const { user, token } = await createUser();
    const plant = await createCustomPlant(user._id);
    await createBed(user._id, { cells: [{ row: 0, col: 0, plantId: plant._id }] });
    const res = await api()
      .delete(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/in use in a garden bed/i);
  });

  it('returns 400 when plant has harvest records', async () => {
    const { user, token } = await createUser();
    const plant = await createCustomPlant(user._id);
    await createHarvest(user._id, plant._id);
    const res = await api()
      .delete(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/harvest records/i);
  });

  it('returns 200 and deletes an unassigned custom plant', async () => {
    const { user, token } = await createUser();
    const plant = await createCustomPlant(user._id);
    const res = await api()
      .delete(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deleted');

    // Confirm it's gone
    const getRes = await api()
      .get(`/api/plants/${plant._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });
});
