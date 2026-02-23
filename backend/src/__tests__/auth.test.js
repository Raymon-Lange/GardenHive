const {
  connectDB, disconnectDB, clearDB,
  authHeader, createUser, createHelper, createSystemPlant, createBed,
  api,
} = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('returns 201 with token and correct user shape', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({
      name: 'Alice',
      email: 'alice@test.com',
      role: 'owner',
      gardenName: null,
      gardenImage: null,
    });
    expect(res.body.user.id).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  it('returns 400 when name is missing', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: 'a@test.com', password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Alice', password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'a@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when password is shorter than 6 characters', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'a@test.com', password: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 characters/i);
  });

  it('returns 409 when email is already registered', async () => {
    await createUser({ email: 'dup@test.com' });
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'dup@test.com', password: 'secret123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already in use/i);
  });

  it('returns 400 for an invalid role', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'a@test.com', password: 'secret123', role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/owner or helper/i);
  });

  it('returns 201 with role helper when helper role is specified', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@test.com', password: 'secret123', role: 'helper' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('helper');
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 with token and user on valid credentials', async () => {
    await createUser({ email: 'login@test.com' });
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('login@test.com');
  });

  it('returns 401 on wrong password', async () => {
    await createUser({ email: 'login2@test.com' });
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'login2@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('returns 401 when email is not found', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'secret123' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ password: 'secret123' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for an inactive account', async () => {
    await createUser({ email: 'inactive@test.com', active: false });
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'inactive@test.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/deactivated/i);
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await api()
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-valid-token');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user payload on valid token', async () => {
    const { user, token } = await createUser();
    const res = await api()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body.id).toBeDefined();
    expect(res.body.passwordHash).toBeUndefined();
  });
});

// ── PUT /api/auth/me ──────────────────────────────────────────────────────────

describe('PUT /api/auth/me', () => {
  it('returns 401 with no token', async () => {
    const res = await api().put('/api/auth/me').send({ name: 'New Name' });
    expect(res.status).toBe(401);
  });

  it('returns 200 and updates name on valid request', async () => {
    const { user, token } = await createUser();
    const res = await api()
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });

  it('returns 400 when name is empty', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});

// ── PUT /api/auth/me/password ─────────────────────────────────────────────────

describe('PUT /api/auth/me/password', () => {
  it('returns 401 with no token', async () => {
    const res = await api()
      .put('/api/auth/me/password')
      .send({ currentPassword: 'password123', newPassword: 'newpass123' });
    expect(res.status).toBe(401);
  });

  it('returns 200 on valid password change', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'password123', newPassword: 'newpass456' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('returns 400 when current password is incorrect', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongpass', newPassword: 'newpass456' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it('returns 400 when new password is shorter than 6 characters', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'password123', newPassword: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 characters/i);
  });

  it('returns 400 when currentPassword or newPassword is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ── DELETE /api/auth/me ───────────────────────────────────────────────────────

describe('DELETE /api/auth/me', () => {
  it('returns 401 with no token', async () => {
    const res = await api()
      .delete('/api/auth/me')
      .send({ password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when password is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('hard-deletes an owner account and subsequent GET /me returns 401', async () => {
    const { user, token } = await createUser({ role: 'owner' });

    const deleteRes = await api()
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'password123' });
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBeDefined();

    // Token is still valid JWT but user no longer exists → 401
    const meRes = await api()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(401);
  });

  it('soft-deactivates a helper account (active=false)', async () => {
    const { user, token } = await createHelper();

    const deleteRes = await api()
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'password123' });
    expect(deleteRes.status).toBe(200);

    // Subsequent token use should return 401 (account inactive)
    const meRes = await api()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(401);
  });
});

// ── POST /api/auth/me/hidden-plants ──────────────────────────────────────────

describe('POST /api/auth/me/hidden-plants', () => {
  it('returns 401 with no token', async () => {
    const res = await api()
      .post('/api/auth/me/hidden-plants')
      .send({ plantId: '000000000000000000000001' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when plantId is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/auth/me/hidden-plants')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('toggles a plant into the hidden list', async () => {
    const { token } = await createUser();
    const plant = await createSystemPlant();
    const res = await api()
      .post('/api/auth/me/hidden-plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId: plant._id.toString() });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.hiddenPlants)).toBe(true);
    expect(res.body.hiddenPlants.map(String)).toContain(plant._id.toString());
  });

  it('toggles a plant back out of the hidden list on second call', async () => {
    const { token } = await createUser();
    const plant = await createSystemPlant();
    const plantId = plant._id.toString();

    // First call: hide
    await api()
      .post('/api/auth/me/hidden-plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId });

    // Second call: unhide
    const res = await api()
      .post('/api/auth/me/hidden-plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId });

    expect(res.status).toBe(200);
    expect(res.body.hiddenPlants.map(String)).not.toContain(plantId);
  });
});

// ── PUT /api/auth/me/garden ───────────────────────────────────────────────────

describe('PUT /api/auth/me/garden', () => {
  it('returns 401 with no token', async () => {
    const res = await api()
      .put('/api/auth/me/garden')
      .send({ gardenName: 'My Garden' });
    expect(res.status).toBe(401);
  });

  it('sets gardenName and returns it in the response', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenName: 'Sunflower Fields' });

    expect(res.status).toBe(200);
    expect(res.body.gardenName).toBe('Sunflower Fields');
  });

  it('clears gardenName when null is sent', async () => {
    const { token } = await createUser({ gardenName: 'Old Name' });
    const res = await api()
      .put('/api/auth/me/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenName: null });

    expect(res.status).toBe(200);
    expect(res.body.gardenName).toBeNull();
  });

  it('sets gardenWidth and gardenHeight and returns them', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenWidth: 20, gardenHeight: 12 });

    expect(res.status).toBe(200);
    expect(res.body.gardenWidth).toBe(20);
    expect(res.body.gardenHeight).toBe(12);
  });

  it('returns 400 when gardenWidth is zero', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenWidth: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gardenWidth/i);
  });

  it('returns 400 when gardenWidth is negative', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenWidth: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gardenWidth/i);
  });

  it('returns 400 when gardenHeight is a fractional value', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/auth/me/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenHeight: 5.5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gardenHeight/i);
  });

  it('clears gardenWidth when null is sent', async () => {
    const { token, user } = await createUser({ gardenWidth: 20 });
    const res = await api()
      .put('/api/auth/me/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenWidth: null });

    expect(res.status).toBe(200);
    expect(res.body.gardenWidth).toBeNull();
  });

  it('returns 400 when reducing width clips a placed bed', async () => {
    const { token, user } = await createUser({ gardenWidth: 20, gardenHeight: 12 });
    // Place a bed at col 15, width 4 — right edge at col 19
    await createBed(user._id, { rows: 2, cols: 4, mapRow: 0, mapCol: 15 });

    const res = await api()
      .put('/api/auth/me/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenWidth: 10 }); // would clip the bed (15+4=19 > 10)

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/smaller than existing/i);
  });

  it('returns 400 when reducing height clips a placed bed', async () => {
    const { token, user } = await createUser({ gardenWidth: 20, gardenHeight: 12 });
    await createBed(user._id, { rows: 3, cols: 2, mapRow: 9, mapCol: 0 });

    const res = await api()
      .put('/api/auth/me/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ gardenHeight: 8 }); // would clip bed (9+3=12 > 8)

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/smaller than existing/i);
  });
});
