# Quickstart: Super Admin Stats Dashboard

**Branch**: `007-super-admin-stats`
**Date**: 2026-02-25

---

## Scenario 1 — Super Admin Views Platform Overview

**Setup**: Super admin account `raymon.lange@gmail.com` exists. Platform has several registered users, beds, and harvest entries.

1. Super admin logs in at `/login` with their credentials
2. JWT is returned; `user.isSuperAdmin === true` is stored in `gh_user` localStorage
3. A **"Platform Stats"** link appears in the sidebar navigation (hidden for all other users)
4. Super admin clicks the link → navigates to `/super-admin`
5. `AdminRoute` reads `user.isSuperAdmin` → passes through (no redirect)
6. `GET /api/admin/stats` is called via React Query `['admin', 'stats']`
7. Dashboard renders three summary cards: **Total Users**, **Total Gardens**, **Total Harvests**

**Expected outcome**: Dashboard loads with accurate aggregate counts. Stats cards appear before the user table finishes loading (independent queries).

---

## Scenario 2 — Super Admin Views User Report

**Setup**: Same as Scenario 1. Multiple users registered with varying activity.

1. On the same `/super-admin` page, `GET /api/admin/users` is called via React Query `['admin', 'users']`
2. User table renders: Name, Email, Registered, Last Login, Gardens, Harvests columns
3. Table is sorted newest registered first (default sort)
4. A user who never logged in after feature deployment shows **"Never"** in the Last Login column
5. A user with zero beds shows **0** (not blank) in the Gardens column

**Expected outcome**: Complete user table with all columns populated; no blank cells; "Never" for missing last-login data.

---

## Scenario 3 — Non-Admin User Blocked from Dashboard

**Setup**: User `alice@example.com` is logged in normally.

1. Alice manually navigates to `/super-admin`
2. `AdminRoute` reads `user.isSuperAdmin === false` → redirects to `/403`
3. The backend also rejects: `GET /api/admin/stats` with Alice's token → 403 Forbidden

**Expected outcome**: Alice cannot see the dashboard. No admin data is exposed.

---

## Scenario 4 — Unauthenticated Access Blocked

**Setup**: No user is logged in.

1. Browser navigates to `/super-admin`
2. `AdminRoute` reads `isAuthenticated === false` → redirects to `/login`
3. Any direct API call to `GET /api/admin/stats` without a token → 401 Unauthorized

**Expected outcome**: Unauthenticated request is blocked at both the frontend route guard and backend middleware layers.

---

## Scenario 5 — Last Login Updates After Login

**Setup**: Super admin views the user report. User `bob@example.com` has `lastLoginAt: null`.

1. Bob logs into his account
2. `POST /api/auth/login` succeeds → `User.findByIdAndUpdate` sets `lastLoginAt: new Date()`
3. Super admin refreshes the `/super-admin` page (or React Query stale-time of 30 s expires)
4. `GET /api/admin/users` returns Bob's row with `lastLoginAt` populated

**Expected outcome**: Bob's last login timestamp is updated to within seconds of his actual login.

---

## Scenario 6 — Empty Platform (Zero Users)

**Setup**: Database is empty (dev/test environment).

1. Super admin calls `GET /api/admin/stats` → `{ totalUsers: 0, totalGardens: 0, totalHarvests: 0 }`
2. Dashboard renders cards showing **0** for all stats
3. User table shows a "No users yet" empty state message

**Expected outcome**: Dashboard handles empty state gracefully — no null reference errors, no missing counts.

---

## API Call Sequence

```
User action                            API call
───────────────────────────────────────────────────────────────────────
Navigate to /super-admin            →  (no API — AdminRoute checks context)
Page mount                          →  GET /api/admin/stats  (stats cards)
                                    →  GET /api/admin/users  (user table, concurrent)
User logs in (any user)             →  POST /api/auth/login  (side effect: lastLoginAt updated)
Super admin refreshes dashboard     →  GET /api/admin/stats  (re-fetch)
                                    →  GET /api/admin/users  (re-fetch)
```

---

## Key React Query Cache Keys

```js
['admin', 'stats']   // platform aggregate counts
['admin', 'users']   // user report array
```

No `invalidateQueries` calls needed — admin dashboard is read-only. Both queries use the default 30 s stale time.
