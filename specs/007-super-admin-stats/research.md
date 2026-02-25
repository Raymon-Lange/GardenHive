# Research: Super Admin Stats Dashboard

**Branch**: `007-super-admin-stats`
**Date**: 2026-02-25

---

## Decision 1 — MongoDB Aggregation: Single Pipeline vs Three Separate Queries

**Decision**: Single `User.aggregate()` pipeline with `$lookup` + `$count` sub-pipelines for per-user bed and harvest counts.

**Rationale**:
- At ~100 users, the single pipeline reads all three collections in one server-side operation — one TCP round-trip vs three
- The `pipeline` form of `$lookup` with `$count` inside avoids materialising full bed/harvest document arrays; only a single integer crosses the pipeline boundary per user
- `gardenbeds.userId` and `harvests.userId` both carry `index: true` in their schemas — MongoDB 7 pushes the inner `$match` to an index scan automatically
- A transactional snapshot: all three collections are read together, preventing a harvest from being inserted between query 1 and query 3

**Collection names** (Mongoose lowercases + pluralises):
- `GardenBed` → `gardenbeds`
- `Harvest` → `harvests`
- `User` → `users`

**Aggregation pipeline pattern** (for `GET /api/admin/users`):

```js
const report = await User.aggregate([
  { $sort: { createdAt: -1 } },
  {
    $lookup: {
      from: 'gardenbeds',
      let: { uid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
        { $count: 'n' },
      ],
      as: '_bedCount',
    },
  },
  {
    $lookup: {
      from: 'harvests',
      let: { uid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
        { $count: 'n' },
      ],
      as: '_harvestCount',
    },
  },
  {
    $addFields: {
      bedCount:     { $ifNull: [{ $arrayElemAt: ['$_bedCount.n',     0] }, 0] },
      harvestCount: { $ifNull: [{ $arrayElemAt: ['$_harvestCount.n', 0] }, 0] },
    },
  },
  {
    $project: {
      _id: 1, name: 1, email: 1, createdAt: 1, lastLoginAt: 1,
      bedCount: 1, harvestCount: 1,
    },
  },
]);
```

**Platform stats query** (for `GET /api/admin/stats`) uses three simple `countDocuments()` calls via `Promise.all` — no aggregation needed since they are scalar counts with no per-user join required.

**Alternatives considered**:
- Three separate queries + application join: identical index efficiency, but three network frames, and a harvest inserted between query 1 and query 3 would produce a stale count. Rejected: no advantage over the single pipeline.
- `$facet`-based combined stats + users in one call: over-engineered; makes cache invalidation granularity coarser. Rejected per YAGNI.

---

## Decision 2 — `lastLoginAt` Storage: Field on User vs Separate Collection

**Decision**: Add `lastLoginAt: { type: Date, default: null }` directly to the User Mongoose model.

**Rationale**:
- A separate sessions collection is the right tool for login *history* (audit logs, device tracking). For a single "last seen" timestamp, one scalar per user is all that is needed.
- Consistent with the existing pattern: all per-user scalar state (`active`, `gardenWidth`, `gardenHeight`) lives on the User document.
- `findByIdAndUpdate(user._id, { lastLoginAt: new Date() })` is a single indexed update — atomic at the document level, effectively zero latency.
- Document size is unchanged in any meaningful way (8 bytes for a BSON Date).

**Update location**: Inside `POST /api/auth/login`, after password verification passes, before returning the token — `await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })`.

**Alternatives considered**:
- Separate `LoginEvent` collection: correct for audit trails. Rejected: feature requires only "last login", not history.

---

## Decision 3 — Super-Admin Identity: `isSuperAdmin` in JWT Payload vs DB Lookup Per Request

**Decision**: Compute `isSuperAdmin` in `userPayload()` (auth.js) and include it in the login/refresh response. Store it in `localStorage` as part of `gh_user`. The `requireSuperAdmin` middleware performs a lightweight DB lookup to verify on every admin API call.

**Rationale**:
- The email comparison `user.email.toLowerCase() === 'raymon.lange@gmail.com'` in `userPayload()` gives the frontend an `isSuperAdmin` boolean without hardcoding the email in React. The email is defined only in the backend.
- The backend middleware does its own DB lookup (not trusting the JWT alone) to enforce the check on every request — the JWT is used for identity (`req.userId`), but the email check is always re-verified against the database record. This is belt-and-suspenders: the JWT can't be faked to elevate privileges.
- The User schema already normalises email to lowercase (`lowercase: true`), so the comparison is safe.

**Middleware pattern** (`backend/src/middleware/requireSuperAdmin.js`):

```js
const SUPER_ADMIN_EMAIL = 'raymon.lange@gmail.com';

module.exports = async function requireSuperAdmin(req, res, next) {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('email').lean();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

**Frontend usage** (`AdminRoute.jsx`) — reads `user.isSuperAdmin` from `AuthContext`; does not compare the email string. The email is never in React source.

**Alternatives considered**:
- Comparing email in `AdminRoute.jsx` directly: puts the hardcoded email in the frontend bundle (readable via browser source view). Rejected.
- Adding a `role: 'superadmin'` enum value to the User schema: more schema churn for a single-user concept. Rejected per YAGNI.
- Including the super-admin check in the JWT and trusting it without DB re-verification: security risk (compromised JWT with modified payload). Rejected.

---

## Decision 4 — `lastLoginAt` API Response for Never-Logged-In Users

**Decision**: Return `null` from the API. Never coerce to a string (`"Never"`) or substitute `createdAt`.

**Rationale**:
- `null` is honest: the system genuinely does not know when the user last logged in (feature was not deployed yet at account creation time).
- Returning `createdAt` as a proxy would misrepresent inactive users as active — misleading for an admin report.
- The frontend decides presentation: `null` → renders "Never" in the table; ISO string → renders formatted date. This keeps the API agnostic to UI formatting decisions.
- Consistent with the existing `userPayload()` convention: all optional fields return `null` (e.g., `gardenName: user.gardenName || null`).
- Sorting is clean: `null` sorts to the bottom when using null-aware comparators.

---

## Decision 5 — Frontend Data Fetching: Two Queries vs Combined Endpoint

**Decision**: Two independent React Query queries — `['admin', 'stats']` and `['admin', 'users']` — against two separate API endpoints.

**Rationale**:
- The stats cards and user table are visually independent sections; they should load and render independently.
- The user-list aggregation (`$lookup` across two collections) is slower than the stats count queries — with a combined endpoint, the stats cards are blocked on the table data.
- Cache granularity: a "refresh users" action can invalidate only `['admin', 'users']` without re-fetching stats.
- Aligns with constitution Principle V: hierarchical tuple keys, one query per resource.

**Alternatives considered**:
- Combined `GET /api/admin/dashboard` endpoint returning `{ stats, users }`: would require invalidating both on every refresh, coarser granularity, no performance benefit at this scale. Rejected.
