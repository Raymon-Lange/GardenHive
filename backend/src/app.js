require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes     = require('./routes/auth');
const bedsRoutes     = require('./routes/beds');
const plantsRoutes   = require('./routes/plants');
const harvestsRoutes = require('./routes/harvests');
const accessRoutes   = require('./routes/access');
const adminRoutes    = require('./routes/admin');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',     authRoutes);
app.use('/api/beds',     bedsRoutes);
app.use('/api/plants',   plantsRoutes);
app.use('/api/harvests', harvestsRoutes);
app.use('/api/access',   accessRoutes);
app.use('/api/admin',    adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
