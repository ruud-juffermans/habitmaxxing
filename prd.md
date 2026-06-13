# Product Requirements Document: Habitmaxxing

## 1. Overview

**Habitmaxxing** is a fullstack web application for tracking daily habits and personal metrics. It runs locally as a single-user app (no authentication) for the owner to log daily entries against a configurable list of habits and metrics, building a long-term record of their routines, sleep quality, and self-improvement activities.

## 2. Goals

- Make daily habit logging fast and frictionless (under 60 seconds per day).
- Allow the user to fully customize what is tracked without code changes.
- Provide a clear historical view to spot trends and streaks.
- Persist data reliably so multi-year tracking is possible.
- Run entirely locally with a single `docker compose up` / `docker compose down`.

## 3. Non-Goals

- Multi-user support, authentication, or account management.
- Public/internet deployment.
- Social features (sharing, friends, leaderboards).
- Mobile-native apps (responsive web only for v1).
- AI-driven recommendations or coaching.
- Integrations with wearables/third-party APIs (v1).

## 4. Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React (Vite) + TypeScript           |
| Backend  | Node.js + Express + TypeScript      |
| Database | PostgreSQL                          |
| ORM      | Prisma (recommended) or Knex        |
| Styling  | styled-components with a shared theme |
| Testing  | Vitest (frontend), Jest (backend)   |
| Runtime  | Docker Compose (single command up)  |

## 5. User Stories

1. As the user, I can start the whole app with `docker compose up` and stop it with `docker compose down`.
2. As the user, I can open the app in a browser and immediately see today's habit checklist — no login.
3. As the user, I can mark a boolean habit (e.g., "30 minutes reading") as done/undone.
4. As the user, I can enter numeric values (e.g., sleep score 1–10) for metrics.
5. As the user, I can enter time values (e.g., wake-up time).
6. As the user, I can add, edit, archive, or delete habits/metrics from a settings page.
7. As the user, I can view a calendar/history of past days and edit prior entries.
8. As the user, I can see a simple stats view (streaks, weekly averages).
9. As the user, my data persists across container restarts via a Docker named volume.

## 6. Trackable Item Types

The system supports configurable item types so users can extend tracking without schema changes:

| Type       | Example                          | Storage           |
|------------|----------------------------------|-------------------|
| `boolean`  | "30 min reading"                 | true / false      |
| `integer`  | "Pushups"                        | whole number      |
| `decimal`  | "Weight (kg)"                    | decimal           |
| `score`    | "Sleep score (1–10)"             | int with min/max  |
| `time`     | "Woke up at"                     | HH:MM             |
| `duration` | "Meditation minutes"             | minutes (int)     |
| `text`     | "Mood notes"                     | short string      |

### Suggested default habits/metrics (seed list, user-editable)

- 30 minutes reading (boolean)
- Wake-up time (time)
- Sleep score 1–10 (score)
- Hours slept (decimal)
- Workout completed (boolean)
- Steps (integer)
- Water intake in liters (decimal)
- Meditation minutes (duration)
- No screens 1h before bed (boolean)
- Daily mood notes (text)
- Weight in kg (decimal)
- Caffeine cups (integer)
- Alcohol drinks (integer)

## 7. Functional Requirements

### 7.1 Habit/Metric Management
- CRUD for habit definitions.
- Fields: `id`, `name`, `type`, `unit`, `min`, `max`, `sortOrder`, `archived`, `createdAt`.
- Archiving hides from daily entry but preserves history.

### 7.2 Daily Entries
- One entry row per (habit, date).
- `GET /api/entries?date=YYYY-MM-DD` returns that day's entries plus active habits.
- `PUT /api/entries` upserts a value for (habit, date).
- Editing past dates is allowed.

### 7.3 History & Stats
- `GET /api/entries/range?from=&to=` returns entries grouped by date.
- Stats endpoint returns current streak per boolean habit and 7/30-day averages for numeric habits.

## 8. Data Model (PostgreSQL)

```
habits
  id UUID PK
  name TEXT NOT NULL
  type TEXT NOT NULL  -- boolean|integer|decimal|score|time|duration|text
  unit TEXT
  min NUMERIC
  max NUMERIC
  sort_order INT DEFAULT 0
  archived BOOLEAN DEFAULT false
  created_at TIMESTAMPTZ DEFAULT now()

entries
  id UUID PK
  habit_id UUID FK -> habits.id
  entry_date DATE NOT NULL
  value_bool BOOLEAN
  value_num NUMERIC
  value_text TEXT
  value_time TIME
  updated_at TIMESTAMPTZ DEFAULT now()
  UNIQUE (habit_id, entry_date)
```

## 9. UI / Screens

1. **Today** (default landing) — list of active habits with appropriate input controls; auto-saves on change.
2. **History** — calendar/heatmap; click a day to view/edit that day's entries.
3. **Stats** — streaks, averages, simple charts (line/bar).
4. **Settings → Habits** — table to add/edit/reorder/archive habits.

### 9.1 Styling

- All styling done via `styled-components`.
- A single `theme.ts` is wrapped at the app root via `<ThemeProvider theme={theme}>`.
- Theme exposes tokens for `colors` (background, surface, text, primary, success, danger, muted), `space` (4/8/12/16/24/32), `radii`, `fontSizes`, `fontWeights`, and `breakpoints`.
- Light + dark themes ship together; the active one is toggled from settings and persisted in `localStorage`.
- `styled.d.ts` declares the `DefaultTheme` interface so styled-components is fully typed.
- No utility-class CSS (no Tailwind, no CSS modules) — components own their styles via `styled(...)`.

## 10. API Surface (summary)

```
GET    /api/habits
POST   /api/habits
PATCH  /api/habits/:id
DELETE /api/habits/:id

GET    /api/entries?date=YYYY-MM-DD
GET    /api/entries/range?from=&to=
PUT    /api/entries          # upsert single value
GET    /api/stats
```

## 11. Non-Functional Requirements

- All API responses < 300ms p95 on a 10k-entry dataset.
- Daily entry page loads and is interactive in < 1s.
- App is local-only; bind containers to `127.0.0.1` so nothing is exposed on the LAN.
- Postgres data persists across `docker compose down` via a named volume.

## 12. Project Structure

```
/client              React + Vite + TS frontend
  Dockerfile
/server              Express + TS backend
  Dockerfile
/server/prisma       Prisma schema and migrations
/shared              Shared TS types (habit types, DTOs)
docker-compose.yml   # db + server + client
.env                 # DB credentials, ports
```

## 13. Docker Compose Setup

The application is started and stopped exclusively via Docker Compose.

### Services

| Service  | Image / Build           | Port (host → container) | Notes                                    |
|----------|-------------------------|-------------------------|------------------------------------------|
| `db`     | `postgres:16-alpine`    | `127.0.0.1:5432 → 5432` | Named volume `habitmaxxing_pgdata`        |
| `server` | build `./server`        | `127.0.0.1:3001 → 3001` | Waits for `db` healthcheck; runs migrations on start |
| `client` | build `./client`        | `127.0.0.1:5173 → 5173` | Vite dev server in dev, nginx static in prod profile |

### Commands

```bash
docker compose up -d        # start everything
docker compose down         # stop everything (data preserved)
docker compose down -v      # stop and wipe the database volume
docker compose logs -f      # tail logs
```

### Requirements

- A single root `docker-compose.yml` orchestrates all three services.
- `db` defines a healthcheck (`pg_isready`) so `server` can `depends_on` it with `condition: service_healthy`.
- Backend reads `DATABASE_URL` from env; compose injects it pointing at the `db` service hostname.
- Frontend reads `VITE_API_URL` from env (defaults to `http://localhost:3001`).
- `.env.example` is committed; `.env` is gitignored.
- Source folders are bind-mounted in dev so edits hot-reload without rebuilds.

## 14. Milestones

1. **M1 — Skeleton:** repo setup, `docker-compose.yml` with db + server + client, server connects to Postgres.
2. **M2 — Habits CRUD:** settings page + API.
3. **M3 — Daily entry:** Today screen with all input types, auto-save.
4. **M4 — History:** calendar view + edit past days.
5. **M5 — Stats:** streaks and averages.
6. **M6 — Polish:** responsive layout, error states, empty states, seed defaults.

## 15. Open Questions

- Timezone handling: hardcode the user's timezone in `.env` (e.g., `APP_TZ=Europe/Amsterdam`) and resolve all "today" calculations against it? (recommendation: yes.)
- Export/import format for user data (CSV vs JSON)?
- Dev vs prod compose profiles, or a single dev-style setup is enough for local use?
