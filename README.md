# dev-stack — Unified Local Environment

Brings up **ILM-prototype**, **goldendreams_v2**, and **cascade-api** with a
single shared Docker network and no duplicated containers or volumes.

---

## Prerequisites

- Docker Desktop (with Compose v2 — `docker compose` not `docker-compose`)
- All three repos cloned side-by-side under `/Volumes/portable/work/`:
  ```
  /Volumes/portable/work/
  ├── ILM-prototype/
  ├── goldendreams_v2/
  └── cascade-api/
  ```
- `cascade-api/.env` exists (copy from `cascade-api/.env.example` and set `DB_PASSWORD`)

---

## Scripts

| Script              | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `build-no-cache.sh` | Build all images from scratch then start every service                 |
| `up.sh`             | Start all services using cached images (no rebuild) + local services   |
| `down.sh`           | Stop the containers and the local services                             |
| `local-services.sh` | Helper sourced by `up.sh`/`down.sh` for the two non-Docker dev services |
| `import-db.sh`      | Import `backup.sql` into the ILM and GD MySQL containers               |
| `migrate.sh`        | Run `python manage.py migrate` inside the ILM and GD Django containers |

---

## First-Time Setup (run in order)

```bash
cd /Volumes/portable/work/dev-stack

# 1. Build all images and start containers
./build-no-cache.sh

# 2. Import database snapshots
#    (wait until all containers show healthy — check with: docker compose -f docker-compose.unified.yml -p cascade-stack ps)
./import-db.sh

# 3. Apply Django migrations on top of the imported data
./migrate.sh
```

> **cascade-api** migrations run automatically inside the container on every
> start via `npm run migrate` — no separate step needed.

---

## Day-to-Day Usage

```bash
# Start everything (uses cached images)
./up.sh

# Stop everything
./down.sh

# Containers only, leave the local services alone
SKIP_LOCAL_SERVICES=1 ./up.sh
SKIP_LOCAL_SERVICES=1 ./down.sh

# Logs for the local (non-Docker) services
tail -f .run/authorizer.log
tail -f .run/facelift.log

# Check running services
docker compose -f /Volumes/portable/work/dev-stack/docker-compose.unified.yml -p cascade-stack ps

# View logs for a specific service
docker compose -f /Volumes/portable/work/dev-stack/docker-compose.unified.yml -p cascade-stack logs -f cascade-api
```

---

## Service Port Map

| Service           | Container                    | Host Port |
| ----------------- | ---------------------------- | --------- |
| ILM Django API    | `ilm-server-2`               | 8000      |
| ILM MySQL         | `ilm-database-2`             | 3306      |
| GD Django API     | `goldendreams-server`        | 8001      |
| GD MySQL          | `goldendreams-database`      | 3308      |
| GD Memcached      | `goldendreams-cache`         | 11211     |
| GD Redis (Celery) | `goldendreams-celery-broker` | 6379      |
| GD phpMyAdmin     | `goldendreams-phpmyadmin`    | 4002      |
| cascade-api       | `cascade-api`                | 3000      |
| cascade MySQL     | `cascade-db`                 | 3307      |

### Local (non-Docker) services

Started by `up.sh` and stopped by `down.sh` alongside the containers. PIDs and
logs live in `dev-stack/.run/`.

| Service             | How it runs                                    | Host Port |
| ------------------- | ---------------------------------------------- | --------- |
| issara-authorizer   | `issara-authorizer/.venv/bin/python app.py`    | 9000      |
| ILM-facelift (vite) | `npm run dev` on node 22 (from `.nvmrc`)       | 5173      |

If a port is already in use, or the venv / `node_modules` are missing, `up.sh`
skips that service with a message instead of failing the whole stack.

---

## Database Credentials

| DB      | Container               | Database          | User   | Password                                    |
| ------- | ----------------------- | ----------------- | ------ | ------------------------------------------- |
| ILM     | `ilm-database-2`        | `ilm_2`           | `root` | `password`                                  |
| GD      | `goldendreams-database` | `goldendreams_v2` | `root` | `password`                                  |
| Cascade | `cascade-db`            | `cascade_db`      | `root` | _(from `cascade-api/.env` → `DB_PASSWORD`)_ |

---

## Networking

All services share one bridge network: `cascade-stack_shared`.
This allows `cascade-api` to reach `ilm-database-2` and `goldendreams-database`
directly by container name.

---

## Re-importing the Database

If you need to wipe and re-import at any time:

```bash
# Stop and remove containers + volumes
docker compose -f /Volumes/portable/work/dev-stack/docker-compose.unified.yml -p cascade-stack down -v

# Rebuild and start fresh
./build-no-cache.sh

# Re-import data
./import-db.sh

# Re-run migrations
./migrate.sh
```
# issara-docker-stack
