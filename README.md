# Habitmaxxing

A self-hosted, local-first habit tracker. Define the habits that matter to you, log them daily, and watch trends emerge over weeks and months.

The full product spec lives in [`prd.md`](./prd.md).

## Table of contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Development](#development)
- [Database](#database)
- [API reference](#api-reference)
- [Common commands](#common-commands)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)

## Features

- **Flexible habit types** — boolean, integer, decimal, score, time-of-day, duration, free text.
- **Habit groups** — colour-coded categories that flow through the UI (today view, history calendar, stats).
- **Today view** — log every habit for the current day in one place.
- **History calendar** — month grid with completion bars per group; click any day to edit retroactively.
- **Stats** — 7-day and 30-day rolling averages, current streak, total entries.
- **Periods** — Mon–Sun current-week and current-month aggregates per habit.
- **Light/dark theme** — defaults to dark, persists per browser.
- **Local-first** — your data never leaves your machine; everything runs in Docker on `127.0.0.1`.

## Screenshots

> Drop PNGs into `docs/screenshots/` with the filenames below to populate this section.

### Today

Daily logging view — every active habit grouped by category, ready to be checked off, scored, or annotated.

![Today view](docs/screenshots/today.png)

### History

Month calendar with a coloured bar per completed habit, tinted by group. Click any day to retro-edit entries.

![History calendar](docs/screenshots/history.png)

### Stats

Per-habit rolling aggregates: current streak, 7-day and 30-day averages, and total entries over the last 30 days.

![Stats overview](docs/screenshots/stats.png)

### Periods

Side-by-side current-week (Mon–Sun) and current-month aggregates, grouped by category.

![Periods overview](docs/screenshots/periods.png)

### Settings

Manage habits and groups: create, reorder, archive, and tweak units/min/max.

![Settings](docs/screenshots/settings.png)

## Tech stack

| Layer    | Tech                                                  |
| -------- | ----------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, styled-components, React Router |
| Backend  | Node.js, Express, TypeScript, Zod, Prisma             |
| Database | PostgreSQL 16                                         |
| Runtime  | Docker Compose                                        |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- A free port for each service (defaults: `5173`, `3001`, `5432`)

That's it — Node and Postgres are not required on the host.

## Quick start

```bash
cp .env.example .env
docker compose up -d
```

Open <http://localhost:5173>.

The first boot runs Prisma migrations and seeds a starter set of habits. Subsequent starts reuse the existing volume.

## Configuration

All configuration is environment-driven via `.env` (see [`.env.example`](./.env.example)):

| Variable            | Default                                                                | Purpose                              |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `POSTGRES_USER`     | `habitmaxxing`                                                          | DB username                          |
| `POSTGRES_PASSWORD` | `habitmaxxing`                                                          | DB password                          |
| `POSTGRES_DB`       | `habitmaxxing`                                                          | DB name                              |
| `POSTGRES_PORT`     | `5432`                                                                 | Host-side DB port                    |
| `DATABASE_URL`      | `postgresql://habitmaxxing:habitmaxxing@db:5432/habitmaxxing?schema=public` | Server's connection string          |
| `SERVER_PORT`       | `3001`                                                                 | Express API port                     |
| `CLIENT_PORT`       | `5173`                                                                 | Vite dev server port                 |
| `VITE_API_URL`      | `http://localhost:3001`                                                | API base URL the client targets      |
| `VITE_APP_TZ`       | `Europe/Amsterdam`                                                     | Timezone the client uses for "today"  |
| `APP_TZ`            | `Europe/Amsterdam`                                                     | Timezone the server uses for stats day boundaries |

> Keep `APP_TZ` and `VITE_APP_TZ` in sync so the client and server agree on where each day starts.

All ports bind to `127.0.0.1` only.

## Project structure

```
.
├── client/              # React + Vite frontend
│   └── src/
│       ├── pages/       # Today, History, Stats, Periods, Settings
│       ├── components/  # HabitInput + shared styled UI
│       ├── api.ts       # Typed API client
│       └── theme.ts     # Light/dark theme tokens
├── server/              # Express + Prisma backend
│   ├── src/
│   │   ├── routes/      # habits, entries, groups, stats
│   │   ├── db.ts
│   │   └── index.ts
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/
│       └── seed.ts
├── docker-compose.yml
├── .env.example
└── prd.md               # Product spec
```

## Development

The compose file mounts `client/src` and `server/src` into the containers, so file edits hot-reload automatically (Vite HMR for the client, `tsx watch` for the server).

### Running outside Docker

If you'd rather run Node locally and only Postgres in Docker:

```bash
docker compose up -d db

# server
cd server
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev

# client (new terminal)
cd client
npm install
npm run dev
```

### Production build

```bash
# client
cd client && npm run build      # outputs to client/dist
# server
cd server && npm run build && npm start
```

## Database

Schema is managed by Prisma. See [`server/prisma/schema.prisma`](./server/prisma/schema.prisma) for the source of truth. The data model:

- **HabitGroup** — colour-coded category (e.g. Health, Focus).
- **Habit** — a tracked item with a `HabitType` (`boolean`, `integer`, `decimal`, `score`, `time`, `duration`, `text`), optional unit/min/max, optional group.
- **Entry** — one row per `(habit, date)`; uniqueness is enforced at the DB level.

Common Prisma tasks (run inside the `server` container or from `server/`):

```bash
npx prisma migrate dev --name <change>   # create + apply a new migration
npx prisma migrate deploy                # apply pending migrations
npx prisma db seed                       # reseed
npx prisma studio                        # browse data in the GUI
```

## API reference

Base URL: `http://localhost:3001/api`

| Method | Path                       | Purpose                              |
| ------ | -------------------------- | ------------------------------------ |
| GET    | `/health`                  | Liveness check                       |
| GET    | `/groups`                  | List habit groups                    |
| POST   | `/groups`                  | Create group                         |
| PATCH  | `/groups/:id`              | Update group                         |
| DELETE | `/groups/:id`              | Delete group                         |
| GET    | `/habits?includeArchived`  | List habits                          |
| POST   | `/habits`                  | Create habit                         |
| PATCH  | `/habits/:id`              | Update habit                         |
| DELETE | `/habits/:id`              | Delete habit                         |
| GET    | `/entries?date=YYYY-MM-DD` | Fetch one day (habits + entries)     |
| GET    | `/entries/range?from=&to=` | Fetch entries across a range         |
| PUT    | `/entries`                 | Upsert an entry by `(habitId, date)` |
| GET    | `/stats`                   | Per-habit 7d/30d aggregates + streak |

Request/response shapes match `client/src/types.ts`.

## Common commands

```bash
docker compose up -d               # start everything
docker compose down                # stop everything (data preserved)
docker compose down -v             # stop AND wipe the database
docker compose logs -f             # tail all logs
docker compose logs -f server      # tail server only
docker compose restart server      # restart after server-side dep changes
docker compose exec db psql -U habitmaxxing  # psql shell into the DB
```

## Troubleshooting

- **Port already in use** — change `CLIENT_PORT`, `SERVER_PORT`, or `POSTGRES_PORT` in `.env`.
- **Migrations look out of sync** — `docker compose down -v` wipes the volume and reseeds on next boot. Destructive: only do this if you don't care about your entries.
- **Client can't reach the API** — check `VITE_API_URL` matches the host-side `SERVER_PORT`.
- **Wrong "today" date around midnight** — verify both `APP_TZ` and `VITE_APP_TZ` are set to your local timezone.

## Roadmap

See [`prd.md`](./prd.md) for the full spec and planned scope. Anything not yet in the UI lives there.

## License

Released under the [MIT License](./LICENSE).

Sources (best-practice research):
- [Make a README](https://www.makeareadme.com/)
- [readme-best-practices (jehna)](https://github.com/jehna/readme-best-practices)
- [How to write a good README — DEV Community](https://dev.to/merlos/how-to-write-a-good-readme-bog)
- [README Best Practices — Tilburg Science Hub](https://www.tilburgsciencehub.com/topics/collaborate-share/share-your-work/content-creation/readme-best-practices/)
- [README File Guidelines — pyOpenSci](https://www.pyopensci.org/python-package-guide/documentation/repository-files/readme-file-best-practices.html)
