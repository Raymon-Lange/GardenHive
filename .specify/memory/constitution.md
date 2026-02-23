<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0 (initial ratification)

Principles added (all new):
  I.   Layered Separation
  II.  REST-First API Design
  III. Permission-Gated Multi-Tenancy
  IV.  Schema-Validated Data Integrity
  V.   Server State via React Query / UI State via Context
  VI.  Test-Before-Deploy
  VII. Simplicity & YAGNI
  VIII.Consistent Naming & Code Style

Sections added:
  - Technology Stack & Constraints
  - Development Workflow & Quality Gates
  - Governance

Templates reviewed:
  ✅ .specify/templates/plan-template.md — "Constitution Check" gate is generic; no update needed
  ✅ .specify/templates/spec-template.md — structure compatible; no update needed
  ✅ .specify/templates/tasks-template.md — "Web app" path convention matches backend/frontend split
  ✅ No commands/ directory exists; nothing to update

Deferred TODOs: none
-->

# GardenHive Constitution

## Core Principles

### I. Layered Separation

The codebase MUST maintain a strict `backend/` / `frontend/` split. All business
logic, data validation, and authorization MUST live in the Express backend.
The React frontend MUST only consume the API — it MUST NOT implement business
rules, recalculate server-owned values, or duplicate validation already enforced
on the backend. The `uploads/` directory is owned by the backend and served as
static files; the frontend references image paths via the helper `uploadUrl()`.

**Rationale**: Keeps the API the single source of truth and allows the frontend
to be replaced or supplemented (mobile app, CLI) without re-implementing logic.

### II. REST-First API Design

All backend functionality MUST be exposed via RESTful endpoints mounted under
`/api`. The following conventions are non-negotiable:

- **HTTP verbs**: GET (read), POST (create), PUT (replace/update), DELETE (remove).
  PATCH is not used — use PUT with partial body.
- **URL structure**: Resource-based paths (`/api/beds/:id/cells`). No verb-in-URL
  patterns (not `/api/getBeds`).
- **Success envelope**: Return data directly (`{ token, user }` for auth; array or
  object for resources). Never wrap in `{ success: true, data: ... }`.
- **Error envelope**: Always `{ error: "Human-readable message" }`. One key, one
  string. Never return stack traces to clients.
- **Status codes**: 200 (read/update), 201 (created), 400 (bad request), 401
  (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 500
  (server error). No other codes.
- **Versioning**: No URL versioning at this scale. Breaking changes require a
  documented migration; a version prefix (`/api/v2`) MAY be introduced when a
  breaking change affects an existing client.

**Rationale**: Consistency enables the frontend Axios interceptor and React Query
cache to work predictably across all routes.

### III. Permission-Gated Multi-Tenancy

Every route that touches garden data (beds, plants, harvests, access) MUST be
protected by `requireAccess(minPermission)` middleware. No route handler MAY
perform its own ad-hoc auth check in place of this middleware.

Permission levels are ordered and MUST NOT be reordered:

```
analytics (1) < harvests_analytics (2) < full (3) < owner (4)
```

Routes that operate on behalf of another user's garden MUST accept and validate
the `?ownerId=` query parameter through the middleware — never trust a raw
`ownerId` from the request body. Garden owners MUST be hard-deleted with full
cascade; helpers MUST be soft-deactivated (`active: false`).

**Rationale**: Multi-tenancy correctness is a security requirement. Centralising
the check in middleware prevents routes from accidentally skipping it.

### IV. Schema-Validated Data Integrity

Every Mongoose model MUST include:

- `{ timestamps: true }` — `createdAt`/`updatedAt` on every document.
- Explicit field types, `required: true` where mandatory, `enum` for constrained
  strings, and `min`/`max` for numeric bounds.
- `ref` declarations for all `ObjectId` foreign keys.

Route handlers MUST perform pre-flight validation of required fields before any
DB operation and return 400 with a human-readable message on failure. Business-
derived fields (e.g., `Harvest.season`) MUST be computed in Mongoose pre-save
hooks, not scattered across route handlers. Nested sub-documents that do not need
independent addressing MUST use `{ _id: false }`.

**Rationale**: Two-layer validation (schema + route) catches errors at both the
ODM boundary and the API surface without duplicating DB round-trips.

### V. Server State via React Query / UI State via Context

State in the frontend MUST be categorised and placed accordingly:

| Category | Tool | Examples |
|---|---|---|
| Server-fetched data | React Query (`useQuery`, `useMutation`) | beds, plants, harvests |
| Cross-cutting app state | React Context | auth (`AuthContext`), active garden (`GardenContext`) |
| Form inputs & UI toggles | `useState` (local) | modal open, active tab, form fields |

Query keys MUST follow the hierarchical tuple pattern:
`['resource']`, `['resource', id]`, `['resource', 'subresource', ...]`.
Mutations MUST call `queryClient.invalidateQueries` for every affected key on
success. The stale time MUST be 30 s unless a specific route has documented
freshness requirements.

The `api.js` Axios instance is the only HTTP client. Direct `fetch()` calls in
components are forbidden.

**Rationale**: Separating server state from UI state eliminates over-fetching,
stale-cache bugs, and duplicated loading/error handling boilerplate.

### VI. Test-Before-Deploy

The CI pipeline MUST run backend tests before the build step; a failed test run
MUST block deployment. Tests MUST use `mongodb-memory-server` — no test MUST
ever connect to a shared or real MongoDB instance.

Required coverage per route file:

- Happy path (correct input → expected status + body shape).
- Missing required fields (→ 400).
- Permission boundary (insufficient level → 403; unauthenticated → 401).
- Conflict / not-found cases where applicable.

Test factories in `helpers.js` MUST be the sole source of test data creation.
bcrypt MUST use cost factor 1 in tests. `passwordHash` MUST never appear in any
API response body (verified in tests).

**Rationale**: API contract tests caught at CI prevent regressions from reaching
production and document the expected behaviour for future contributors.

### VII. Simplicity & YAGNI

Add complexity only when the current need demands it. Specifically:

- Extract a helper function only when it is used in **three or more** places.
- A service layer between routes and Mongoose is **not required**; route handlers
  MAY call Mongoose directly. Introduce a service only when a handler exceeds
  ~150 lines of logic.
- Do not add feature flags, backwards-compatibility shims, or defensive code for
  scenarios that cannot currently occur.
- Do not create files that are not immediately used.
- Justify any deviation from the existing structure in a PR description.

**Rationale**: The codebase is a focused single-product app. Over-engineering
produces maintenance burden without user benefit.

### VIII. Consistent Naming & Code Style

The following conventions apply across the entire codebase and MUST NOT be mixed:

**Casing**

| Artifact | Convention | Example |
|---|---|---|
| Mongoose model fields | camelCase | `harvestedAt`, `ownerId` |
| API JSON keys | camelCase | `gardenName`, `daysToHarvest` |
| JS variables & functions | camelCase | `bedId`, `handleSubmit` |
| Boolean variables | `is`/`has`/`can` prefix | `isLoading`, `canDelete` |
| Event handlers | `handle` prefix | `handleChange`, `handleLogout` |
| Custom React hooks | `use` prefix | `useBeds`, `useHarvestTotals` |
| Constants | UPPER_SNAKE_CASE | `LEVELS`, `PIE_COLORS` |
| React components & pages | PascalCase files | `AppLayout.jsx`, `Dashboard.jsx` |
| JS utilities & lib | camelCase files | `api.js` |
| Test files | `*.test.js` in `__tests__/` | `auth.test.js` |

**Code style**

- `const`/`let` always; `var` never.
- `async`/`await` over `.then()` chains.
- Arrow functions for callbacks; named `function` declarations for route
  handlers and top-level utilities.
- Tailwind utility classes for all styling; custom reusable classes (`.card`,
  `.btn-primary`, `.input`, `.label`) defined once in `index.css`.
- ESLint rules (react-hooks plugin) MUST pass; do not disable rules inline
  without a comment explaining why.

**Rationale**: Uniform conventions reduce cognitive load and make code review,
search, and refactoring predictable.

## Technology Stack & Constraints

**Backend**
- Runtime: Node.js 22
- Framework: Express 5
- ODM: Mongoose 9 + MongoDB 7
- Auth: `jsonwebtoken` (7-day expiry) + `bcryptjs`
- File uploads: `multer` (stored in `backend/uploads/`, served as static)
- Testing: Jest 29 + Supertest + `mongodb-memory-server`

**Frontend**
- UI: React 19 (functional components only)
- Build: Vite 7
- Routing: React Router 7
- HTTP: Axios (single `api.js` instance with request/response interceptors)
- Server state: TanStack React Query 5
- CSS: Tailwind CSS 3 + custom utility classes
- Charts: Recharts
- Icons: Lucide React

**Infrastructure**
- Local dev: Docker Compose (MongoDB + backend + frontend)
- CI/CD: GitHub Actions → Docker images → GHCR → VPS via Tailscale + SSH
- Environment config: `.env` files (never committed); `VITE_` prefix for
  frontend variables consumed by Vite

**Constraints**
- All images MUST be served from the backend (`/uploads/` static route); the
  frontend MUST use `uploadUrl()` to resolve image paths.
- JWT tokens MUST be stored in `localStorage` under keys `gh_token` and
  `gh_user`. A 401 response MUST trigger automatic logout and redirect to `/login`.
- The `passwordHash` field MUST be excluded from every API response. Tests MUST
  assert this.

## Development Workflow & Quality Gates

**Feature branches**: All development happens on a branch named
`###-short-description`. Merge to `master` via PR.

**Quality gates** (in order):

1. `npm test` (backend) MUST pass — CI blocks deploy on failure.
2. ESLint MUST pass — `npm run lint` (frontend) MUST produce zero errors.
3. Docker build MUST succeed — the CI build step validates this.

**Seeding**: `npm run seed:all` (backend) bootstraps the plant library, a demo
owner, demo helper, sample beds, and sample harvests. Seed scripts MUST be
idempotent or guarded against duplicate runs.

**Database migrations**: Mongoose handles schema evolution. For additive changes,
add fields with `default` values so existing documents remain valid. For
destructive changes, write a migration script in `backend/src/seed/` and document
it in the PR.

**Secrets**: `JWT_SECRET`, `MONGODB_URI`, and deployment credentials MUST live
in environment variables. They MUST NOT be hardcoded or committed.

## Governance

This constitution supersedes any informal convention, PR comment, or README
instruction it contradicts. When a conflict exists, the constitution wins.

**Amendment procedure**:

1. Open a PR that modifies this file.
2. Increment `CONSTITUTION_VERSION` per semantic versioning:
   - MAJOR — principle removed, redefined, or made incompatible with existing code.
   - MINOR — new principle or section added, or material expansion of guidance.
   - PATCH — clarification, wording, or typo fix.
3. Update `LAST_AMENDED_DATE` to the date of merge.
4. Run the consistency propagation checklist against all `.specify/templates/`
   files and note results in the Sync Impact Report comment at the top of this file.
5. The PR description MUST reference the amended section and rationale.

**Compliance review**: Every feature PR MUST include a "Constitution Check"
confirming no principles are violated. If a violation is necessary, it MUST be
documented in the plan's Complexity Tracking table with justification.

**Version policy**: A version bump does not require migrating existing code
unless the amendment explicitly mandates it.

---

**Version**: 1.0.0 | **Ratified**: 2026-02-23 | **Last Amended**: 2026-02-23
