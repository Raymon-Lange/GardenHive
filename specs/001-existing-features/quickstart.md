# Quickstart: GardenHive Local Development

**Branch**: `001-existing-features`
**Date**: 2026-02-23

Use this guide to run the full GardenHive stack locally. All commands assume
the repo root as the working directory unless otherwise noted.

---

## Prerequisites

- [Node.js 22](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for MongoDB; or install MongoDB 7 locally)
- Git

---

## Option A: Docker Compose (Recommended)

Starts MongoDB, backend, and frontend in one command.

```bash
# 1. Copy and configure environment files
cp backend/.env.example backend/.env
# Edit backend/.env: set JWT_SECRET to any long random string

# 2. Start all services
docker compose up --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
# MongoDB:  localhost:27017
```

To seed demo data (run once after first start):

```bash
docker compose exec backend npm run seed:all
```

---

## Option B: Manual Setup

### 1. Start MongoDB

```bash
docker run -d --name gardenhive-mongo -p 27017:27017 mongo:7
```

Or use a local MongoDB 7 installation with `mongod` running on port 27017.

### 2. Backend

```bash
cd backend
cp .env.example .env   # set JWT_SECRET in .env

npm install
npm run seed:all       # seeds plant library, demo users, beds, and harvests (run once)
npm run dev            # starts on http://localhost:5000
```

**Backend environment variables** (`.env`):

| Variable | Required | Example |
|---|---|---|
| `MONGODB_URI` | yes | `mongodb://localhost:27017/gardenhive` |
| `JWT_SECRET` | yes | any long random string |
| `PORT` | no | `5000` (default) |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # starts on http://localhost:5173
```

**Frontend environment variables** (`.env` or Vite inline defaults):

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend API base URL |

Open **http://localhost:5173** and create an account, or log in with the
demo credentials created by the seed script.

---

## Demo Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Owner | `owner@gardenhive.dev` | `password123` |
| Helper | `helper@gardenhive.dev` | `password123` |

The helper account has `full` permission on the owner's garden.

---

## Running Tests

```bash
cd backend
npm test                  # run all tests once (uses in-memory MongoDB)
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

Tests never connect to a real MongoDB instance — `mongodb-memory-server`
is used automatically.

---

## Useful Scripts

| Command | Location | Effect |
|---|---|---|
| `npm run dev` | `backend/` | Start backend with auto-reload |
| `npm start` | `backend/` | Start backend (production mode) |
| `npm run seed:all` | `backend/` | Seed all demo data |
| `npm run seed` | `backend/` | Seed plant library only |
| `npm run seed:user` | `backend/` | Seed demo users |
| `npm run seed:beds` | `backend/` | Seed sample garden beds |
| `npm run seed:harvests` | `backend/` | Seed sample harvest data |
| `npm run dev` | `frontend/` | Start Vite dev server |
| `npm run build` | `frontend/` | Production build → `dist/` |
| `npm run lint` | `frontend/` | ESLint check |

---

## Validation Checklist

After setup, verify everything is working:

- [ ] `http://localhost:5000/api/health` returns `200 OK`
- [ ] `http://localhost:5173` shows the GardenHive landing page
- [ ] Register a new account and reach the Dashboard
- [ ] Create a garden bed and assign a plant to a cell
- [ ] Log a harvest and verify it appears in the history
- [ ] Analytics page shows at least one chart with data (after logging harvests)
- [ ] `npm test` (backend) passes with all tests green
