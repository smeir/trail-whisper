# Trail Whisper

[![Build](https://github.com/smeir/trail-whisper/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/smeir/trail-whisper/actions/workflows/deploy.yml)
[![GitHub Pages](https://img.shields.io/github/deployments/smeir/trail-whisper/github-pages?label=pages&logo=github)](https://github.com/smeir/trail-whisper/deployments/github-pages)
[![React](https://img.shields.io/npm/v/react?label=react)](https://www.npmjs.com/package/react)
[![Vite](https://img.shields.io/npm/v/vite?label=vite)](https://www.npmjs.com/package/vite)

<p align="center"><img src="public/favicon-96x96.png" alt="Trail Whisper Favicon" width="96" height="96" style="border-radius: 12px; border: 1px solid #ddd;" /></p>

Have I been here before?

That is the question Trail Whisper answers. If you spend enough time running, riding or hiking, trails start to blur together — you stand at a junction with the nagging feeling you've passed this way, but you can't be sure. Trail Whisper remembers for you. Upload the GPS tracks from your outdoor workouts, and the app keeps a personal map of everywhere your own two feet (or wheels) have already taken you.

Out on the move, open it and it quietly checks your current spot against your history: a familiar place, or new ground? Back home, browse every activity you've recorded, filter by sport, date or location, and relive each route on the map. It's a private logbook for the explorer in you — proof of the ground you've covered, and a gentle nudge toward the corners you haven't.

## Features

- **Email/password authentication** via Supabase Auth with persistent sessions.
- **Per-user activity storage** backed by PostGIS geography columns and row-level security.
- **Geolocation dashboard** that asks for permission, checks for previous visits within 500 m, and renders a mini map of those nearby workouts.
- **FIT file ingestion** with client-side previews and WKT payloads ready for PostGIS.
- **History explorer** with sport/date/location filters and card-based mini maps.
- **Activity detail** pages including map visualisations and GeoJSON export.
- **Responsive UI** built with Tailwind CSS, shadcn-inspired components and lucide-react icons.

## Prerequisites

1. **Supabase project**
   - Create a project at [supabase.com](https://supabase.com/) and note the project URL and anon key.
   - Confirm that email sign-ups are enabled under **Authentication → Providers** (enabled by default) and disable OAuth providers you do not plan to offer.
   - Under **Database → Extensions** enable `postgis`.
   - Run the SQL script [`supabase/setup.sql`](./supabase/setup.sql) using the SQL editor or the Supabase CLI to create the `activities` table, policies, and RPC functions.

2. **Environment variables**
   - Copy [`.env.example`](./.env.example) to `.env` (gitignored) and fill in your Supabase project URL, anon key and email redirect URL.

3. **Node.js 18+** with your preferred package manager (npm is used in the examples below).

## Local development

```bash
npm install
npm run dev
```

The Vite dev server starts at http://localhost:5173. Sign in with your email address and password to exercise the authenticated routes.

## Production build

```bash
npm run build
```

The optimised build is written to `dist/`. Run `npm run preview` to smoke-test the production bundle.

## Supabase data model

The SQL file [`supabase/setup.sql`](./supabase/setup.sql) provisions everything required:

- `activities` table scoped to `auth.users` via row-level security.
- GIST indexes for performant geospatial lookups.
- `find_visits_near(lat, lon, radius_m)` RPC that powers the dashboard check and near-by list. The client always passes `radius_m = 500`; the SQL function's own `400` default applies only when the parameter is omitted.
- `get_activity_geojson(activity_id)` RPC for serving LineString and Point geometries as GeoJSON when needed.

Run it once per project. If you make schema updates, re-run the script or create a migration through the Supabase migration flow.

## Architecture notes

- **Routing**: `react-router-dom` with protected routes that gate everything behind Supabase email authentication.
- **Data fetching**: TanStack Query handles cache invalidation after uploads and ensures optimistic UI states.
- **Maps**: MapLibre GL with OpenFreeMap vector tiles (`tiles.openfreemap.org/styles/liberty`), with markers for current location and activities.
- **FIT parsing**: `fit-file-parser` converts tracks to WKT (`LINESTRING`) and calculates simple centroids client-side.
- **Styling**: Tailwind CSS with lightweight shadcn-inspired building blocks under `src/components/ui`.
- **Geospatial helpers**: Haversine distance utilities live in `src/utils/geo.ts` to support proximity filtering and map markers.

## Scripts

| Command          | Description                           |
| ---------------- | ------------------------------------- |
| `npm run dev`    | Start Vite with hot module reload     |
| `npm run build`  | Production build                      |
| `npm run preview`| Preview the production bundle         |
| `npm run lint`   | ESLint (flat config)                  |
| `npm run typecheck` | Type-check with `tsc --noEmit`     |
| `npm test`       | Vitest unit/component suite           |
| `npm run test:e2e` | Playwright smoke suite              |

## Testing & QA

Automated coverage:

- **Vitest + Testing Library** — unit tests for geospatial/format/FIT logic,
  component smoke tests, and an integration test that parses a generated FIT
  binary through the real `fit-file-parser`.
- **Playwright** — offline smoke flow (auth redirect, login/sign-up UI).

Run `npm run lint && npm run typecheck && npm test && npm run test:e2e`.

Still verify these flows manually (no automated WebGL/Supabase coverage):

1. Create an account or sign in on `/login` with email + password and ensure redirect to `/app`.
2. Accept geolocation permissions and confirm the 400 m check works once data exists.
3. Upload a FIT file on `/upload`, verify the toast, and ensure it appears in `/history` and the dashboard map.
4. Open `/activity/:id` to validate the map and GeoJSON download.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds on every push to `main` and deploys to GitHub Pages. Provide the required environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) as GitHub secrets for production deployments.
