---
description: Rebuild and restart local dev environment (docker-compose.dev.yml) and show container status
---

Rebuild and restart the local GardenHive dev environment, then show container status and logs tail.

Run these steps in order:

1. From the repo root `/home/raymon/Documents/code/GardenHive`, rebuild and restart all services with the dev override:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build 2>&1
   ```

2. Show container status:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml ps 2>&1
   ```

3. Tail the last 20 lines of logs from all services to confirm they started cleanly:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=20 2>&1
   ```

Print the full output of each step as you go so the user can see what happened. If any step fails, stop and report the error.

After all steps complete, print a summary:
- Which services are running
- Frontend URL: http://localhost:5173
- Any warnings or errors spotted in the logs
