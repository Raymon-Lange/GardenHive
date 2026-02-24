# GardenHive

Square foot garden planning & harvest tracking — MERN stack.

## Stack

- **Frontend** — React 19 + Vite 7 + Tailwind CSS 3 + Recharts
- **Backend** — Node.js + Express 5
- **Database** — MongoDB (local or Docker)
- **Auth** — JWT + bcrypt

## Quick start

### 1. Start MongoDB

```bash
docker run -d --name gardenhive-mongo -p 27017:27017 mongo:7
```

Or install MongoDB locally and start `mongod`.

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit JWT_SECRET if desired
npm install
npm run seed           # seeds plant library, demo user, beds & harvests (run once)
npm run dev            # starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # starts on http://localhost:5173
```

Open **http://localhost:5173**, sign up, and start gardening.

## Project structure

```
GardenHive/
├── backend/
│   └── src/
│       ├── models/      User, GardenBed, Plant, Harvest, GardenAccess
│       ├── routes/      auth, beds, plants, harvests, access
│       ├── middleware/  JWT auth
│       └── seed/        plant library, demo user, beds & harvests
└── frontend/
    └── src/
        ├── pages/       Landing, Login, Signup, Dashboard, GardenBeds,
        │                BedDetail, GardenMap, Harvests, Analytics,
        │                Profile, Admin
        ├── components/  AppLayout, ProtectedRoute, PlantHarvestSummary,
        │                GardenDimensionsModal, GardenPrintView
        ├── context/     AuthContext
        └── lib/         axios API client
```

## API routes

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, get JWT |
| GET | `/api/auth/me` | ✓ | Current user |
| PUT | `/api/auth/me` | ✓ | Update profile |
| PUT | `/api/auth/me/password` | ✓ | Change password |
| DELETE | `/api/auth/me` | ✓ | Delete account |
| POST | `/api/auth/me/hidden-plants` | ✓ | Hide a plant from library |
| PUT | `/api/auth/me/garden` | ✓ | Set garden name & dimensions |
| POST | `/api/auth/me/garden-image` | ✓ | Upload garden image |
| DELETE | `/api/auth/me/garden-image` | ✓ | Remove garden image |

### Beds

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/beds` | ✓ | List user's beds |
| POST | `/api/beds` | ✓ | Create a bed |
| GET | `/api/beds/:id` | ✓ | Get bed with cells |
| PUT | `/api/beds/:id` | ✓ | Update bed (rename, map position) |
| PUT | `/api/beds/:id/cells` | ✓ | Set a cell's plant |
| DELETE | `/api/beds/:id` | ✓ | Delete a bed |

### Plants

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/plants` | ✓ | Plant library |
| GET | `/api/plants/:id` | ✓ | Single plant |
| POST | `/api/plants` | ✓ | Add custom plant |
| PUT | `/api/plants/:id` | ✓ | Update plant |
| DELETE | `/api/plants/:id` | ✓ | Delete plant |

### Harvests

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/harvests` | ✓ | Recent harvests |
| POST | `/api/harvests` | ✓ | Log a harvest |
| DELETE | `/api/harvests/:id` | ✓ | Delete a harvest entry |
| GET | `/api/harvests/totals` | ✓ | Totals by plant+season (supports `?from=&to=`) |
| GET | `/api/harvests/yoy` | ✓ | Monthly totals grouped by year |
| GET | `/api/harvests/weekly` | ✓ | Week-by-week totals for a year |
| GET | `/api/harvests/years` | ✓ | Distinct years with harvest data |
| GET | `/api/harvests/monthly` | ✓ | Rolling 12-month oz totals |

### Access sharing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/access` | ✓ | Grants I own |
| GET | `/api/access/shared` | ✓ | Gardens I've been granted access to |
| POST | `/api/access` | ✓ | Grant access to another user |
| PUT | `/api/access/:id` | ✓ | Update a grant |
| DELETE | `/api/access/:id` | ✓ | Revoke a grant |

## Production deployment

The stack runs entirely in Docker. A `certs/` directory next to `docker-compose.yml` is volume-mounted into the nginx container for TLS.

### Required env vars

```
JWT_SECRET=<strong-random-secret>
CORS_ORIGIN=https://fire-hive.com
SEED_DATA=false
```

### Cert setup (Let's Encrypt)

```bash
mkdir -p /home/deploy/gardenhive/certs
sudo cp /etc/letsencrypt/live/fire-hive.com/fullchain.pem /home/deploy/gardenhive/certs/fullchain.crt
sudo cp /etc/letsencrypt/live/fire-hive.com/privkey.pem   /home/deploy/gardenhive/certs/privkey.key
sudo chown deploy:deploy /home/deploy/gardenhive/certs/*
chmod 600 /home/deploy/gardenhive/certs/*
```

### Start

```bash
cd /home/deploy/gardenhive
docker compose up -d
```

### Reseed production data

```bash
SEED_DATA=true docker compose up -d --force-recreate backend
# wait for seed to complete, then restore default
docker compose up -d --force-recreate backend
```
