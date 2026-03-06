const {
  connectDB, disconnectDB, clearDB,
  api, createUser, createGarden, createBed,
} = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

// ── GET /api/gardens ──────────────────────────────────────────────────────────

describe('GET /api/gardens', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/gardens');
    expect(res.status).toBe(401);
  });

  it('returns empty array when user has no gardens', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/gardens')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all gardens for the user sorted by createdAt ascending', async () => {
    const { user, token } = await createUser();
    await createGarden(user._id, { name: 'Garden A' });
    await createGarden(user._id, { name: 'Garden B' });
    const res = await api()
      .get('/api/gardens')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Garden A');
    expect(res.body[1].name).toBe('Garden B');
  });

  it('does not return gardens belonging to another user', async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    await createGarden(other._id, { name: 'Other Garden' });
    const res = await api()
      .get('/api/gardens')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('returns correct garden shape', async () => {
    const { user, token } = await createUser();
    await createGarden(user._id, { name: 'Shape Test', gardenWidth: 10, gardenHeight: 8 });
    const res = await api()
      .get('/api/gardens')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const g = res.body[0];
    expect(g.name).toBe('Shape Test');
    expect(g.gardenWidth).toBe(10);
    expect(g.gardenHeight).toBe(8);
    expect(g._id).toBeDefined();
    expect(g.userId).toBeDefined();
  });
});

// ── POST /api/gardens ─────────────────────────────────────────────────────────

describe('POST /api/gardens', () => {
  it('returns 401 with no token', async () => {
    const res = await api().post('/api/gardens').send({ name: 'New' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when name is empty string', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 201 with created garden shape', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Spring 2026', gardenWidth: 15, gardenHeight: 10 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Spring 2026');
    expect(res.body.gardenWidth).toBe(15);
    expect(res.body.gardenHeight).toBe(10);
    expect(res.body._id).toBeDefined();
  });

  it('returns 201 with null dimensions when not provided', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bare Garden' });
    expect(res.status).toBe(201);
    expect(res.body.gardenWidth).toBeNull();
    expect(res.body.gardenHeight).toBeNull();
  });
});

// ── POST /api/gardens/import ──────────────────────────────────────────────────

describe('POST /api/gardens/import', () => {
  const CSV_VALID = 'Bed Name,Rows,Cols\nFront Bed,4,6\nSide Bed,2,3\nBack Bed,5,5\n';
  const CSV_ONE_BAD = 'Bed Name,Rows,Cols\nFront Bed,4,6\n,2,3\nBack Bed,5,5\n';
  const CSV_BAD_COLS = 'Name,R,C\nFront Bed,4,6\n';
  const CSV_EMPTY = 'Bed Name,Rows,Cols\n';

  it('returns 401 with no token', async () => {
    const res = await api()
      .post('/api/gardens/import')
      .field('name', 'Import Test')
      .attach('file', Buffer.from(CSV_VALID), { filename: 'beds.csv', contentType: 'text/csv' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(CSV_VALID), { filename: 'beds.csv', contentType: 'text/csv' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when no file is uploaded', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens/import')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Import Test');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/file/i);
  });

  it('returns 400 when CSV is missing required columns', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens/import')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Import Test')
      .attach('file', Buffer.from(CSV_BAD_COLS), { filename: 'beds.csv', contentType: 'text/csv' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/columns/i);
  });

  it('returns 400 when CSV is empty', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens/import')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Import Test')
      .attach('file', Buffer.from(CSV_EMPTY), { filename: 'beds.csv', contentType: 'text/csv' });
    expect(res.status).toBe(400);
  });

  it('returns 201 with bedsCreated count for valid CSV', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens/import')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'My Import')
      .attach('file', Buffer.from(CSV_VALID), { filename: 'beds.csv', contentType: 'text/csv' });
    expect(res.status).toBe(201);
    expect(res.body.bedsCreated).toBe(3);
    expect(res.body.errors).toHaveLength(0);
    expect(res.body.garden.name).toBe('My Import');
  });

  it('returns 201 with partial success and errors array when one row is invalid', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens/import')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Partial Import')
      .attach('file', Buffer.from(CSV_ONE_BAD), { filename: 'beds.csv', contentType: 'text/csv' });
    expect(res.status).toBe(201);
    expect(res.body.bedsCreated).toBe(2);
    expect(res.body.errors).toHaveLength(1);
  });
});

// ── POST /api/gardens (clone) ─────────────────────────────────────────────────

describe('POST /api/gardens (clone from sourceGardenId)', () => {
  it('returns 400 when sourceGardenId does not exist', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Clone', sourceGardenId: '000000000000000000000001' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when sourceGardenId belongs to another user', async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    const source = await createGarden(other._id, { name: 'Other Source' });
    const res = await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Clone', sourceGardenId: source._id.toString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not belong/i);
  });

  it('requires name even when cloning', async () => {
    const { user, token } = await createUser();
    const source = await createGarden(user._id, { name: 'Source' });
    const res = await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ sourceGardenId: source._id.toString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('clones dimensions from source garden', async () => {
    const { user, token } = await createUser();
    const source = await createGarden(user._id, { name: 'Source', gardenWidth: 10, gardenHeight: 8 });
    const res = await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Clone', sourceGardenId: source._id.toString() });
    expect(res.status).toBe(201);
    expect(res.body.gardenWidth).toBe(10);
    expect(res.body.gardenHeight).toBe(8);
  });

  it('clones all beds with matching cells, map positions reset to null', async () => {
    const { user, token } = await createUser();
    const source = await createGarden(user._id, { name: 'Source', gardenWidth: 12, gardenHeight: 10 });
    await createBed(user._id, source._id, {
      name: 'Bed A', rows: 2, cols: 3,
      cells: [{ row: 0, col: 0, plantId: null }],
      mapRow: 1, mapCol: 2,
    });
    await createBed(user._id, source._id, {
      name: 'Bed B', rows: 4, cols: 4,
      cells: [],
      mapRow: 5, mapCol: 0,
    });

    const res = await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Season Clone', sourceGardenId: source._id.toString() });

    expect(res.status).toBe(201);
    const newGardenId = res.body._id;

    // Fetch beds of new garden
    const bedsRes = await api()
      .get('/api/beds')
      .query({ gardenId: newGardenId })
      .set('Authorization', `Bearer ${token}`);
    expect(bedsRes.status).toBe(200);
    expect(bedsRes.body).toHaveLength(2);

    const bedA = bedsRes.body.find((b) => b.name === 'Bed A');
    const bedB = bedsRes.body.find((b) => b.name === 'Bed B');

    expect(bedA).toBeDefined();
    expect(bedA.rows).toBe(2);
    expect(bedA.cols).toBe(3);
    expect(bedA.mapRow).toBeNull();
    expect(bedA.mapCol).toBeNull();

    expect(bedB).toBeDefined();
    expect(bedB.rows).toBe(4);
    expect(bedB.cols).toBe(4);
    expect(bedB.mapRow).toBeNull();
    expect(bedB.mapCol).toBeNull();
  });

  it('leaves source garden unchanged after cloning', async () => {
    const { user, token } = await createUser();
    const source = await createGarden(user._id, { name: 'Source', gardenWidth: 6, gardenHeight: 4 });
    await createBed(user._id, source._id, { name: 'Original Bed', rows: 1, cols: 1 });

    await api()
      .post('/api/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Clone', sourceGardenId: source._id.toString() });

    // Source garden still exists
    const sourceBeds = await api()
      .get('/api/beds')
      .query({ gardenId: source._id.toString() })
      .set('Authorization', `Bearer ${token}`);
    expect(sourceBeds.status).toBe(200);
    expect(sourceBeds.body).toHaveLength(1);
    expect(sourceBeds.body[0].name).toBe('Original Bed');
  });
});

// ── PUT /api/gardens/:id ──────────────────────────────────────────────────────

describe('PUT /api/gardens/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().put('/api/gardens/000000000000000000000001').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent garden', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/gardens/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when garden belongs to another user', async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    const garden = await createGarden(other._id, { name: 'Other' });
    const res = await api()
      .put(`/api/gardens/${garden._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Stolen' });
    expect(res.status).toBe(403);
  });

  it('returns 200 and updates name', async () => {
    const { user, token } = await createUser();
    const garden = await createGarden(user._id, { name: 'Old Name' });
    const res = await api()
      .put(`/api/gardens/${garden._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('returns 200 and updates dimensions', async () => {
    const { user, token } = await createUser();
    const garden = await createGarden(user._id);
    const res = await api()
      .put(`/api/gardens/${garden._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenWidth: 20, gardenHeight: 15 });
    expect(res.status).toBe(200);
    expect(res.body.gardenWidth).toBe(20);
    expect(res.body.gardenHeight).toBe(15);
  });

  it('returns 400 when reducing width clips a placed bed', async () => {
    const { user, token } = await createUser();
    const garden = await createGarden(user._id, { gardenWidth: 20, gardenHeight: 12 });
    await createBed(user._id, garden._id, { rows: 2, cols: 4, mapRow: 0, mapCol: 15 });
    const res = await api()
      .put(`/api/gardens/${garden._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenWidth: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/smaller than existing/i);
  });

  it('returns 400 when reducing height clips a placed bed', async () => {
    const { user, token } = await createUser();
    const garden = await createGarden(user._id, { gardenWidth: 20, gardenHeight: 12 });
    await createBed(user._id, garden._id, { rows: 3, cols: 2, mapRow: 9, mapCol: 0 });
    const res = await api()
      .put(`/api/gardens/${garden._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenHeight: 8 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/smaller than existing/i);
  });
});

// ── DELETE /api/gardens/:id ───────────────────────────────────────────────────

describe('DELETE /api/gardens/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().delete('/api/gardens/000000000000000000000001');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent garden', async () => {
    const { token } = await createUser();
    const res = await api()
      .delete('/api/gardens/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 403 when garden belongs to another user', async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    const garden = await createGarden(other._id);
    // Give other user a second garden so delete is not blocked by "only garden" check
    await createGarden(other._id, { name: 'Second' });
    const res = await api()
      .delete(`/api/gardens/${garden._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 400 when attempting to delete the only garden', async () => {
    const { user, token } = await createUser();
    const garden = await createGarden(user._id);
    const res = await api()
      .delete(`/api/gardens/${garden._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only garden/i);
  });

  it('returns 200 and removes garden and its beds', async () => {
    const { user, token } = await createUser();
    const gardenA = await createGarden(user._id, { name: 'Garden A' });
    const gardenB = await createGarden(user._id, { name: 'Garden B' });
    await createBed(user._id, gardenA._id, { name: 'Bed in A' });
    await createBed(user._id, gardenB._id, { name: 'Bed in B' });

    const res = await api()
      .delete(`/api/gardens/${gardenA._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    // Garden A and its bed are gone
    const gardens = await api().get('/api/gardens').set('Authorization', `Bearer ${token}`);
    expect(gardens.body).toHaveLength(1);
    expect(gardens.body[0].name).toBe('Garden B');

    const bedsA = await api().get('/api/beds').query({ gardenId: gardenA._id.toString() }).set('Authorization', `Bearer ${token}`);
    expect(bedsA.body).toHaveLength(0);

    // Garden B's bed is untouched
    const bedsB = await api().get('/api/beds').query({ gardenId: gardenB._id.toString() }).set('Authorization', `Bearer ${token}`);
    expect(bedsB.body).toHaveLength(1);
  });

  it('switches activeGardenId when the active garden is deleted', async () => {
    const { user, token } = await createUser();
    const gardenA = await createGarden(user._id, { name: 'Garden A' });
    const gardenB = await createGarden(user._id, { name: 'Garden B' });

    // Set A as active
    await api()
      .put('/api/auth/me/active-garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenId: gardenA._id.toString() });

    // Delete A
    const res = await api()
      .delete(`/api/gardens/${gardenA._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Verify auth payload reflects new active garden
    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.activeGardenId.toString()).toBe(gardenB._id.toString());
  });
});

// ── PUT /api/auth/me/active-garden ────────────────────────────────────────────

describe('PUT /api/auth/me/active-garden', () => {
  it('returns 401 with no token', async () => {
    const res = await api()
      .put('/api/auth/me/active-garden')
      .send({ gardenId: '000000000000000000000001' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when gardenId is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/active-garden')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gardenId/i);
  });

  it('returns 404 for a non-existent garden', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/active-garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenId: '000000000000000000000001' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when garden belongs to another user', async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    const garden = await createGarden(other._id);
    const res = await api()
      .put('/api/auth/me/active-garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenId: garden._id.toString() });
    expect(res.status).toBe(403);
  });

  it('returns 200 and updates activeGardenId on success', async () => {
    const { user, token } = await createUser();
    const gardenA = await createGarden(user._id, { name: 'Garden A' });
    const gardenB = await createGarden(user._id, { name: 'Garden B' });

    // Switch to gardenB
    const res = await api()
      .put('/api/auth/me/active-garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenId: gardenB._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.activeGardenId.toString()).toBe(gardenB._id.toString());
    expect(res.body.gardenName).toBe('Garden B');
  });
});
