const {
  connectDB, disconnectDB, clearDB,
  authHeader, createUser, createHelper, createGrant,
  api,
} = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

// ── GET /api/access/shared ────────────────────────────────────────────────────

describe('GET /api/access/shared', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/access/shared');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no grants exist for this user as grantee', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/access/shared')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns active grants with correct shape including gardenName and gardenImage', async () => {
    const { user: owner } = await createUser({ gardenName: 'Rose Garden' });
    const { user: helper, token: helperToken } = await createHelper();
    await createGrant(owner._id, helper._id, helper.email, 'full');

    const res = await api()
      .get('/api/access/shared')
      .set('Authorization', `Bearer ${helperToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const grant = res.body[0];
    expect(grant.ownerId).toBeDefined();
    expect(grant.ownerName).toBeDefined();
    expect(grant.ownerEmail).toBeDefined();
    expect(grant.gardenName).toBe('Rose Garden');
    expect('gardenImage' in grant).toBe(true);
    expect(grant.permission).toBe('full');
  });

  it('does not return pending grants', async () => {
    const { user: owner } = await createUser();
    const { user: helper, token: helperToken } = await createHelper();
    // Create a pending grant (granteeId set but status pending)
    const GardenAccess = require('../models/GardenAccess');
    await GardenAccess.create({
      ownerId: owner._id,
      granteeId: helper._id,
      granteeEmail: helper.email,
      permission: 'full',
      status: 'pending',
    });

    const res = await api()
      .get('/api/access/shared')
      .set('Authorization', `Bearer ${helperToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── GET /api/access ───────────────────────────────────────────────────────────

describe('GET /api/access', () => {
  it('returns 401 with no token', async () => {
    const res = await api().get('/api/access');
    expect(res.status).toBe(401);
  });

  it('returns empty array when owner has no grants', async () => {
    const { token } = await createUser();
    const res = await api()
      .get('/api/access')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns grants owned by the requesting user', async () => {
    const { user: owner, token } = await createUser();
    const { user: helper } = await createHelper();
    await createGrant(owner._id, helper._id, helper.email, 'analytics');

    const res = await api()
      .get('/api/access')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const grant = res.body[0];
    expect(grant._id).toBeDefined();
    expect(grant.ownerId.toString()).toBe(owner._id.toString());
    expect(grant.granteeEmail).toBe(helper.email);
    expect(grant.permission).toBe('analytics');
    expect(grant.status).toBe('active');
  });
});

// ── POST /api/access ──────────────────────────────────────────────────────────

describe('POST /api/access', () => {
  it('returns 401 with no token', async () => {
    const res = await api()
      .post('/api/access')
      .send({ email: 'a@test.com', permission: 'full' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/access')
      .set('Authorization', `Bearer ${token}`)
      .send({ permission: 'full' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when permission is missing', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/access')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'other@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 for an invalid permission value', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/access')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'other@test.com', permission: 'superadmin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid permission/i);
  });

  it('returns 400 when inviting your own email', async () => {
    const { user, token } = await createUser({ email: 'self@test.com' });
    const res = await api()
      .post('/api/access')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'self@test.com', permission: 'full' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });

  it('returns 409 when inviting an already-granted email', async () => {
    const { user: owner, token } = await createUser();
    const { user: helper } = await createHelper({ email: 'dup@test.com' });
    await createGrant(owner._id, helper._id, 'dup@test.com', 'full');

    const res = await api()
      .post('/api/access')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'dup@test.com', permission: 'analytics' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already has access/i);
  });

  it('returns 201 with status pending and granteeId null for unregistered email', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/api/access')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newperson@test.com', permission: 'harvests_analytics' });
    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.status).toBe('pending');
    expect(res.body.granteeId).toBeNull();
    expect(res.body.permission).toBe('harvests_analytics');
  });

  it('returns 201 with status active and granteeId set for existing user', async () => {
    const { token } = await createUser();
    const { user: existing } = await createHelper({ email: 'existing@test.com' });
    const res = await api()
      .post('/api/access')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'existing@test.com', permission: 'analytics' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('active');
    expect(res.body.granteeId.toString()).toBe(existing._id.toString());
  });
});

// ── PUT /api/access/:id ───────────────────────────────────────────────────────

describe('PUT /api/access/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api()
      .put('/api/access/000000000000000000000001')
      .send({ permission: 'full' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent grant', async () => {
    const { token } = await createUser();
    const res = await api()
      .put('/api/access/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`)
      .send({ permission: 'full' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid permission value', async () => {
    const { user: owner, token } = await createUser();
    const { user: helper } = await createHelper();
    const grant = await createGrant(owner._id, helper._id, helper.email, 'analytics');

    const res = await api()
      .put(`/api/access/${grant._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ permission: 'superadmin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid permission/i);
  });

  it('returns 200 and updates permission', async () => {
    const { user: owner, token } = await createUser();
    const { user: helper } = await createHelper();
    const grant = await createGrant(owner._id, helper._id, helper.email, 'analytics');

    const res = await api()
      .put(`/api/access/${grant._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ permission: 'full' });
    expect(res.status).toBe(200);
    expect(res.body.permission).toBe('full');
    expect(res.body._id.toString()).toBe(grant._id.toString());
  });

  it("returns 404 when trying to update another user's grant", async () => {
    const { user: owner1 } = await createUser();
    const { user: owner2, token: token2 } = await createUser();
    const { user: helper } = await createHelper();
    const grant = await createGrant(owner1._id, helper._id, helper.email, 'analytics');

    const res = await api()
      .put(`/api/access/${grant._id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ permission: 'full' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/access/:id ────────────────────────────────────────────────────

describe('DELETE /api/access/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await api().delete('/api/access/000000000000000000000001');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent grant', async () => {
    const { token } = await createUser();
    const res = await api()
      .delete('/api/access/000000000000000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 and revokes access', async () => {
    const { user: owner, token } = await createUser();
    const { user: helper } = await createHelper();
    const grant = await createGrant(owner._id, helper._id, helper.email, 'full');

    const res = await api()
      .delete(`/api/access/${grant._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/revoked/i);

    // Confirm it's gone
    const listRes = await api()
      .get('/api/access')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.find((g) => g._id.toString() === grant._id.toString())).toBeUndefined();
  });

  it("returns 404 when trying to delete another user's grant", async () => {
    const { user: owner1 } = await createUser();
    const { user: owner2, token: token2 } = await createUser();
    const { user: helper } = await createHelper();
    const grant = await createGrant(owner1._id, helper._id, helper.email, 'full');

    const res = await api()
      .delete(`/api/access/${grant._id}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(404);
  });
});
