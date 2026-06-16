# Local development

> The committed `docker-compose.yml` is the **production** (VPS) setup: it joins
> external networks created by the `ruudjuffermans-infra` stack, builds images,
> and publishes no host ports. Use one of the two local options below instead.

## Quick start (Docker — recommended)

`docker-compose.dev.yml` is a self-contained dev stack: its own Postgres, plus
the server and client with hot reload. No infra repo, no manual env files.

```bash
docker compose -f docker-compose.dev.yml up
```

First boot installs deps, runs migrations, and seeds the demo account (takes a
minute). Then open http://localhost:5173 and sign in with:

- **Email:** `demo@habitmaxxing.local`
- **Password:** `password123`

Source is bind-mounted, so edits on the host reload live. Other commands:

```bash
docker compose -f docker-compose.dev.yml up -d        # background
docker compose -f docker-compose.dev.yml logs -f      # tail logs
docker compose -f docker-compose.dev.yml down         # stop
docker compose -f docker-compose.dev.yml down -v      # stop + wipe the DB
```

The DB is exposed on `localhost:5432` (`postgres` / `devpassword`, database
`habitmaxxing`). Override any default by adding a `.env` next to the compose
file (e.g. `POSTGRES_PASSWORD=...`, `SEED_USER_EMAIL=...`).


## 1. Database (infra Postgres)

The database runs as the shared infra Postgres. Two local-only files make it
reachable from the host (both gitignored, not used on the VPS):

- `ruudjuffermans-infra/.env`
  ```
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=devpassword
  ```
- `ruudjuffermans-infra/docker-compose.override.yml` — publishes the DB port to
  the host:
  ```yaml
  services:
    db:
      ports:
        - "127.0.0.1:5432:5432"
  ```

Bring it up (from the infra repo):

```bash
cd ../ruudjuffermans-infra
docker compose up -d db
```

This creates the `habitmaxxing` and `ruudjuffermans` databases automatically
(via `db/init/`) on first boot. Verify:

```bash
docker compose exec db psql -U postgres -c "\l"
```

## 2. Server

All configuration lives in the root `.env` (gitignored — copy it from
`.env.example`):

```bash
cp .env.example .env     # then set DATABASE_URL to ...@localhost:5432/... for host-runs
```

The app does **not** load `dotenv` (in production env comes from Docker), and the
Prisma CLI run from `server/` won't see the root file, so export it into the
shell first, then run everything from there:

```bash
set -a && . ./.env && set +a     # export the root .env

cd server
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Server listens on http://localhost:3001 (routes are under `/api/...`).

## 3. Client

The Vite dev proxy targets the Docker hostname `server:3001`, which does not
resolve locally. Point the client straight at the local server instead:

```bash
cd client
npm install
VITE_API_URL=http://localhost:3001 npm run dev
```

Client runs on http://localhost:5173.

## 4. Log in

Open http://localhost:5173 and sign in with the seeded demo account:

- **Email:** `demo@habitmaxxing.local`
- **Password:** `password123`

The app header/nav only renders once authenticated.

## Troubleshooting

- **`Environment variable not found: DATABASE_URL`** — you started the server
  without exporting `.env`. Use the `set -a && . ./.env && set +a` line above.
- **Login 500 / DB connection refused** — the infra DB isn't up or port 5432
  isn't published; check `docker compose ps` in the infra repo.
- **Login 404** — auth routes are `/api/auth/...` (no `/v1`).
- **Port already in use** — find and stop the stray process:
  `lsof -tiTCP:3001 -sTCP:LISTEN | xargs kill` (or `:5173`, `:5432`).
