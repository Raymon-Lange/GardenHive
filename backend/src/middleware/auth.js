const jwt = require('jsonwebtoken');
const GardenAccess = require('../models/GardenAccess');

const LEVELS = { analytics: 1, harvests_analytics: 2, full: 3, owner: 4 };

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware factory: verifies JWT then checks garden access.
// Sets req.gardenOwnerId and req.gardenPermission for downstream use.
function requireAccess(minPermission) {
  return [
    requireAuth,
    async (req, res, next) => {
      try {
        const ownerId = req.query.ownerId || req.userId;

        if (ownerId === req.userId) {
          req.gardenOwnerId = req.userId;
          req.gardenPermission = 'owner';
          return next();
        }

        const access = await GardenAccess.findOne({
          ownerId,
          granteeId: req.userId,
          status: 'active',
        });

        if (!access) {
          return res.status(403).json({ error: 'Access denied' });
        }

        if (LEVELS[access.permission] < LEVELS[minPermission]) {
          return res.status(403).json({ error: 'Insufficient permission' });
        }

        req.gardenOwnerId = ownerId;
        req.gardenPermission = access.permission;
        next();
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    },
  ];
}

module.exports = requireAuth;
module.exports.requireAccess = requireAccess;
