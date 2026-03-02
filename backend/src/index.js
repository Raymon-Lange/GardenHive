const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./lib/logger');

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    logger.info('Connected to MongoDB');
    if (process.env.SEED_DATA === 'true') {
      const { seedAll } = require('./seed/index');
      await seedAll({ force: true });
    }
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => logger.info({ port: PORT }, 'Server running'));
  })
  .catch((err) => {
    logger.fatal({ err }, 'MongoDB connection error');
    process.exit(1);
  });
