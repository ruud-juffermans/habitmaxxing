# Habitmaxxing

A habit tracker. Define the habits that matter to you, log them daily, and
watch trends emerge over weeks and months. Runs at `habit.ruudjuffermans.nl`.

**Client-only since the platform consolidation.** The backend lives in
[`../ruudjuffermans-server`](../ruudjuffermans-server) (one API for all maxxing
apps at `api.ruudjuffermans.nl`), and all auth UI lives in
[`../ruudjuffermans-account`](../ruudjuffermans-account)
(`account.ruudjuffermans.nl`) — sign in once there and you're signed in to
every app. A signed-out visitor here is redirected to the account app and comes
straight back after login. See `../PLATFORM_ARCHITECTURE_PLAN.md` for the
architecture.

The full product spec lives in [`prd.md`](./prd.md).

## Table of contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Database](#database)
- [API reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)

## Features

- **One account for all apps** — authentication is handled by the central
  account app; habit data is scoped per user behind the platform's shared
  session cookie.
- **Linked habits** — a habit can be sourced from a sibling app
  (`fitness_workout`, `journal_entry`): finish a workout in fitnessmaxxing or
  write a journal entry in journalmaxxing and the habit checks itself for that
  day, via the platform's event bus.
- **Flexible habit types** — boolean, integer, decimal, score, time-of-day, duration, free text.
- **Scheduling & frequency** — make a habit daily, on specific weekdays, N× per week, or every N days. The Today view shows only what's due, and streaks and completion percentages respect each habit's schedule.
- **Goals & targets** — give a numeric habit a target (e.g. 2 L water, 8000 steps) with an at-least or at-most direction. "Done" means the goal was met, so streaks, History bars, and Stats all score goal attainment instead of just whether an entry exists. Habits without a goal keep the old "any entry counts" behaviour.
- **Habit groups** — colour-coded categories that flow through the UI (today view, history calendar, stats).
- **Today view** — log every habit for the current day in one place.
- **History calendar** — month grid with completion bars per group; click any day to edit retroactively.
- **Stats** — 7-day and 30-day rolling averages, current streak, total entries.
- **Periods** — Mon–Sun current-week and current-month aggregates per habit.
- **Light/dark theme** — defaults to dark, persists per browser.

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

Manage habits and groups: create, reorder, archive, and tweak units/min/max, schedules, and goals.

![Settings](docs/screenshots/settings.png)

## Tech stack

| Layer    | Tech                                                         |
| -------- | ------------------------------------------------------------ |
| Frontend | React 18, TypeScript, Vite, styled-components, React Router  |
| Backend  | [`ruudjuffermans-server`](../ruudjuffermans-server) — Express + Prisma + PostgreSQL, `habit` module |
| Auth UI  | [`ruudjuffermans-account`](../ruudjuffermans-account)         |
| Runtime  | nginx static image via Docker Compose (this repo builds the client only) |

## Local development

Run the platform API and (for login) the account app first:

```bash
# 1. API — in ../ruudjuffermans-server (see its README):
docker compose -f docker-compose.dev.yml up -d && npm run dev   # :4000

# 2. Account app — in ../ruudjuffermans-account/client:
npm run dev                                                     # :3004

# 3. This client:
cd client
npm install
npm run dev                                                     # :3003
```

The dev ports matter: the platform server's CORS allowlist expects this client
on `http://localhost:3003` (its `HABIT_URL` default).

In local dev the platform has no SMTP configured, so verification and
password-reset **emails are printed to the API server's console** — copy the
link from there. Seed a demo account with `npx prisma db seed` in
`../ruudjuffermans-server` (default `demo@ruudjuffermans.local` /
`password123`), or use "Continue as guest" on the account app's login page.

> `server/` and `setup-dev.sh` are **legacy** (pre-consolidation) — no longer
> deployed or maintained; kept only for reference until deleted.

## Configuration

Vite env, inlined at build time (see [`.env.example`](./.env.example)):

| Variable           | Default (dev)            | Purpose                                    |
| ------------------ | ------------------------ | ------------------------------------------ |
| `CLIENT_PORT`      | `3003`                   | Vite dev server port (matches platform CORS) |
| `VITE_API_URL`     | `http://localhost:4000`  | Platform API origin                        |
| `VITE_ACCOUNT_URL` | `http://localhost:3004`  | Account app (login/register/reset live there) |
| `VITE_APP_TZ`      | `Europe/Amsterdam`       | Timezone the client uses for "today"       |

Keep `VITE_APP_TZ` in sync with the platform server's `APP_TZ` so the client
and server agree on where each day starts. Server-side configuration (session
TTLs, SMTP, admin, …) lives in `../ruudjuffermans-server/.env.example`.

## Project structure

```
.
├── client/              # React + Vite frontend (the deployed artifact)
│   └── src/
│       ├── pages/       # Today, History, Stats, Periods, Settings, admin
│       ├── components/  # HabitInput + shared styled UI
│       ├── api.ts       # Typed API client (platform endpoints)
│       └── theme.ts     # Light/dark theme tokens
├── server/              # LEGACY pre-consolidation backend — not deployed
├── docker-compose.yml   # Production stack: client-only nginx image
├── .env.example         # Client env template
└── prd.md               # Product spec
```

## Database

The schema lives in the platform:
[`../ruudjuffermans-server/prisma/schema.prisma`](../ruudjuffermans-server/prisma/schema.prisma),
`habit` Postgres schema. The data model:

- **HabitGroup** — colour-coded category (e.g. Health, Focus), owned by a user.
- **Habit** — a tracked item with a `HabitType` (`boolean`, `integer`, `decimal`, `score`, `time`, `duration`, `text`), optional unit/min/max, optional group, a schedule (`daily`, `weekdays`, `weekly_count`, or `interval`), an optional numeric goal (`goalTarget` plus an `at_least`/`at_most` `goalDirection`) that defines completion, and an optional `source` (`fitness_workout` / `journal_entry`) marking it auto-completed by a sibling app's events.
- **HabitEntry** — one row per `(habit, date)`; uniqueness enforced at the DB level.

Users, sessions and verification tokens are platform-wide (`account` schema).
Prisma commands (migrate/seed/studio) run in `../ruudjuffermans-server`.

## API reference

Base URL: the platform API (`http://localhost:4000` in dev,
`https://api.ruudjuffermans.nl` in production). All data routes require the
platform session cookie (`rj_session`) and return only the signed-in user's
records.

**Account** (used by this client; full auth lives in the account app):

| Method | Path                                | Purpose                        |
| ------ | ----------------------------------- | ------------------------------ |
| GET    | `/api/account/auth/me`              | Current user, or 401           |
| POST   | `/api/account/auth/logout`          | Destroy the current session    |
| POST   | `/api/account/auth/convert`         | Upgrade a guest account        |
| POST   | `/api/account/auth/change-password` | Change password (authenticated) |
| *      | `/api/account/admin/users…`         | Central admin API (admin pages) |

**Data** (authenticated):

| Method | Path                                  | Purpose                              |
| ------ | ------------------------------------- | ------------------------------------ |
| GET    | `/api/health`                         | Liveness check                       |
| GET    | `/api/habit/groups`                   | List habit groups                    |
| POST   | `/api/habit/groups`                   | Create group                         |
| PATCH  | `/api/habit/groups/:id`               | Update group                         |
| DELETE | `/api/habit/groups/:id`               | Delete group                         |
| GET    | `/api/habit/habits?includeArchived`   | List habits                          |
| POST   | `/api/habit/habits`                   | Create habit                         |
| PATCH  | `/api/habit/habits/:id`               | Update habit                         |
| DELETE | `/api/habit/habits/:id`               | Delete habit                         |
| GET    | `/api/habit/entries?date=YYYY-MM-DD`  | Fetch one day (habits + entries)     |
| GET    | `/api/habit/entries/range?from=&to=`  | Fetch entries across a range         |
| PUT    | `/api/habit/entries`                  | Upsert an entry by `(habitId, date)` |
| GET    | `/api/habit/stats`                    | Per-habit 7d/30d aggregates + streak |

Request/response shapes match `client/src/types.ts`. The old
`/api/integrations/events` endpoint is gone — sibling-app activity arrives via
the platform's internal event bus (`fitness.workout.*`, `journal.entry.*`).

## Troubleshooting

- **Redirect loop / bounced to the account app** — the platform API isn't
  running, or your session expired; sign in on the account app.
- **Client can't reach the API** — check `VITE_API_URL` points at the platform
  server and that this client runs on port 3003 (the API's CORS allowlist for
  habit).
- **Wrong "today" date around midnight** — verify `VITE_APP_TZ` here matches
  the platform's `APP_TZ`.
- **Verification / reset email never arrives** — with no `SMTP_HOST` set on
  the platform server, emails (and their links) are printed to its console.
- **Linked habit didn't auto-complete** — check the platform's event
  dead-letters: `GET /api/account/admin/events` (admin session or service token).

## Roadmap

See [`prd.md`](./prd.md) for the full spec and planned scope. Anything not yet in the UI lives there.

## License

Released under the [MIT License](./LICENSE).
