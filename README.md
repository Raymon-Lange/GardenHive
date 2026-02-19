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
│       ├── models/      User, GardenBed, Plant, Harvest
│       ├── routes/      auth, beds, plants, harvests
│       ├── middleware/  JWT auth
│       └── seed/        plant library, demo user, beds & harvests
└── frontend/
    └── src/
        ├── pages/       Landing, Login, Signup, Dashboard, GardenBeds,
        │                BedDetail, GardenMap, Harvests, Analytics
        ├── components/  AppLayout, ProtectedRoute, PlantHarvestSummary
        ├── context/     AuthContext
        └── lib/         axios API client
```

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, get JWT |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/beds` | ✓ | List user's beds |
| POST | `/api/beds` | ✓ | Create a bed |
| GET | `/api/beds/:id` | ✓ | Get bed with cells |
| PUT | `/api/beds/:id` | ✓ | Rename a bed |
| PUT | `/api/beds/:id/cells` | ✓ | Set a cell's plant |
| DELETE | `/api/beds/:id` | ✓ | Delete a bed |
| GET | `/api/plants` | ✓ | Plant library |
| GET | `/api/harvests` | ✓ | Recent harvests |
| GET | `/api/harvests/totals` | ✓ | Totals by plant+season (supports `?from=&to=`) |
| GET | `/api/harvests/yoy` | ✓ | Monthly totals grouped by year (line chart) |
| GET | `/api/harvests/weekly` | ✓ | Week-by-week totals for a year |
| GET | `/api/harvests/years` | ✓ | Distinct years with harvest data |
| GET | `/api/harvests/monthly` | ✓ | Rolling 12-month oz totals |
| POST | `/api/harvests` | ✓ | Log a harvest |
| DELETE | `/api/harvests/:id` | ✓ | Delete a harvest entry |
