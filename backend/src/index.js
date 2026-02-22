require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const bedsRoutes = require('./routes/beds');
const plantsRoutes = require('./routes/plants');
const harvestsRoutes = require('./routes/harvests');
const accessRoutes = require('./routes/access');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/beds', bedsRoutes);
app.use('/api/plants', plantsRoutes);
app.use('/api/harvests', harvestsRoutes);
app.use('/api/access', accessRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    if (process.env.SEED_DATA === 'true') {
      const { seedAll } = require('./seed/index');
      await seedAll({ force: true });
    }
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
