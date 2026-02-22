module.exports = async function globalTeardown() {
  await global.__MONGOD__.stop();
};
