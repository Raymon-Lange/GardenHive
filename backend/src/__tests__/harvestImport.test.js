const {
  connectDB, disconnectDB, clearDB,
  api, createUser, createSystemPlant,
} = require('./helpers');

beforeAll(connectDB);
afterAll(disconnectDB);
afterEach(clearDB);

// ── GET /api/harvests/template ────────────────────────────────────────────────

describe('GET /api/harvests/template', () => {
  it('returns 200 with CSV content-type and correct headers', async () => {
    const { user } = await createUser();
    const res = await api()
      .get('/api/harvests/template')
      .set('Authorization', `Bearer ${require('jsonwebtoken').sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1d' })}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.text).toContain('Plant Name');
    expect(res.text).toContain('Date');
    expect(res.text).toContain('Quantity (oz)');
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await api().get('/api/harvests/template');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/harvests/import ─────────────────────────────────────────────────

describe('POST /api/harvests/import', () => {
  function makeToken(userId) {
    return require('jsonwebtoken').sign({ userId: userId.toString() }, process.env.JWT_SECRET, { expiresIn: '1d' });
  }

  it('returns 200 with matched array when all plant names match (case-insensitive)', async () => {
    const { user } = await createUser();
    await createSystemPlant({ name: 'Tomato', emoji: '🍅' });

    const csv = 'Plant Name,Date,Quantity (oz)\ntomato,06/15/2025,8\n';

    const res = await api()
      .post('/api/harvests/import')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.matched).toHaveLength(1);
    expect(res.body.matched[0].plantName).toBe('Tomato');
    expect(res.body.matched[0].quantity).toBe(8);
    expect(res.body.unmatched).toHaveLength(0);
    expect(res.body.errors).toHaveLength(0);
  });

  it('matches plant name case-insensitively (UPPERCASE input)', async () => {
    const { user } = await createUser();
    await createSystemPlant({ name: 'Cucumber', emoji: '🥒' });

    const csv = 'Plant Name,Date,Quantity (oz)\nCUCUMBER,07/04/2025,5\n';

    const res = await api()
      .post('/api/harvests/import')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.matched).toHaveLength(1);
    expect(res.body.unmatched).toHaveLength(0);
  });

  it('returns unmatched with suggestion for typo plant name', async () => {
    const { user } = await createUser();
    await createSystemPlant({ name: 'Tomato', emoji: '🍅' });

    const csv = 'Plant Name,Date,Quantity (oz)\nTomatoe,06/15/2025,8\n';

    const res = await api()
      .post('/api/harvests/import')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.matched).toHaveLength(0);
    expect(res.body.unmatched).toHaveLength(1);
    expect(res.body.unmatched[0].rawName).toBe('Tomatoe');
    expect(res.body.unmatched[0].suggestion.plantName).toBe('Tomato');
    expect(res.body.unmatched[0].date).toBeDefined();
    expect(res.body.unmatched[0].quantity).toBe(8);
  });

  it('accepts single-digit month M/DD/YYYY', async () => {
    const { user } = await createUser();
    await createSystemPlant({ name: 'Tomato', emoji: '🍅' });

    const csv = 'Plant Name,Date,Quantity (oz)\nTomato,2/18/2026,8\n';

    const res = await api()
      .post('/api/harvests/import')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.matched).toHaveLength(1);
    expect(res.body.errors).toHaveLength(0);
    expect(res.body.matched[0].date).toBe('2026-02-18T00:00:00.000Z');
  });

  it('accepts single-digit day MM/D/YY', async () => {
    const { user } = await createUser();
    await createSystemPlant({ name: 'Tomato', emoji: '🍅' });

    const csv = 'Plant Name,Date,Quantity (oz)\nTomato,02/2/26,8\n';

    const res = await api()
      .post('/api/harvests/import')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.matched).toHaveLength(1);
    expect(res.body.errors).toHaveLength(0);
    expect(res.body.matched[0].date).toBe('2026-02-02T00:00:00.000Z');
  });

  it('returns error row for invalid date format (YYYY-MM-DD)', async () => {
    const { user } = await createUser();
    await createSystemPlant({ name: 'Tomato', emoji: '🍅' });

    const csv = 'Plant Name,Date,Quantity (oz)\nTomato,2025-06-15,8\n';

    const res = await api()
      .post('/api/harvests/import')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].field).toBe('date');
    expect(res.body.matched).toHaveLength(0);
  });

  it('returns error row for non-numeric quantity', async () => {
    const { user } = await createUser();
    await createSystemPlant({ name: 'Tomato', emoji: '🍅' });

    const csv = 'Plant Name,Date,Quantity (oz)\nTomato,06/15/2025,abc\n';

    const res = await api()
      .post('/api/harvests/import')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].field).toBe('quantity');
  });

  it('returns 400 for non-CSV file type', async () => {
    const { user } = await createUser();

    const res = await api()
      .post('/api/harvests/import')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .attach('file', Buffer.from('not a csv'), { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/csv/i);
  });

  it('returns 400 when required column is missing', async () => {
    const { user } = await createUser();

    const csv = 'Plant Name,Date\nTomato,06/15/2025\n';

    const res = await api()
      .post('/api/harvests/import')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Quantity/);
  });

  it('returns 401 when unauthenticated', async () => {
    const csv = 'Plant Name,Date,Quantity (oz)\nTomato,06/15/2025,8\n';
    const res = await api()
      .post('/api/harvests/import')
      .attach('file', Buffer.from(csv), { filename: 'test.csv', contentType: 'text/csv' });
    expect(res.status).toBe(401);
  });
});

// ── POST /api/harvests/bulk ───────────────────────────────────────────────────

describe('POST /api/harvests/bulk', () => {
  function makeToken(userId) {
    return require('jsonwebtoken').sign({ userId: userId.toString() }, process.env.JWT_SECRET, { expiresIn: '1d' });
  }

  it('returns 201 and creates harvest records with unit oz', async () => {
    const { user } = await createUser();
    const plant = await createSystemPlant({ name: 'Tomato', emoji: '🍅' });

    const res = await api()
      .post('/api/harvests/bulk')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .send({ rows: [{ plantId: plant._id.toString(), harvestedAt: '2025-06-15T00:00:00.000Z', quantity: 8 }] });

    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(1);
    expect(res.body.harvests[0].unit).toBe('oz');
    expect(res.body.harvests[0].quantity).toBe(8);
  });

  it('returns 400 for empty rows array', async () => {
    const { user } = await createUser();

    const res = await api()
      .post('/api/harvests/bulk')
      .set('Authorization', `Bearer ${makeToken(user._id)}`)
      .send({ rows: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non-empty/i);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await api()
      .post('/api/harvests/bulk')
      .send({ rows: [{ plantId: '000000000000000000000001', harvestedAt: '2025-06-15T00:00:00.000Z', quantity: 8 }] });
    expect(res.status).toBe(401);
  });
});
