# Trail Whisper

[![Build](https://github.com/smeir/trail-whisper/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/smeir/trail-whisper/actions/workflows/deploy.yml)
[![GitHub Pages](https://img.shields.io/github/deployments/smeir/trail-whisper/github-pages?label=pages&logo=github)](https://github.com/smeir/trail-whisper/deployments/github-pages)
[![React](https://img.shields.io/npm/v/react?label=react)](https://www.npmjs.com/package/react)
[![Vite](https://img.shields.io/npm/v/vite?label=vite)](https://www.npmjs.com/package/vite)

<p align="center"><img src="public/favicon-96x96.png" alt="Trail Whisper Favicon" width="96" height="96" style="border-radius: 12px; border: 1px solid #ddd;" /></p>

Trail Whisper is a production-ready React + TypeScript application for exploring your outdoor workouts. It connects to Supabase for authentication, storage and geospatial queries, parses FIT files on the client, and surfaces whether you have already visited your current location.

## Features

- **Email/password authentication** via Supabase Auth with persistent sessions.
- **Per-user activity storage** backed by PostGIS geography columns and row-level security.
- **Geolocation dashboard** that asks for permission, checks for previous visits within 400 m, and renders a mini map of nearby workouts (< 2 km).
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
   - Copy `.env.example` (create it if it does not exist) to `.env.local` and set:

     ```bash
     VITE_SUPABASE_URL="https://<project>.supabase.co"
     VITE_SUPABASE_ANON_KEY="<anon-key>"
     VITE_EMAIL_REDIRECT_URL="https://smeir.github.io/trail-whisper/"
     ```

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
- `find_visits_near(lat, lon, radius_m)` RPC that powers the 400 m dashboard check and near-by list.
- `get_activity_geojson(activity_id)` RPC for serving LineString and Point geometries as GeoJSON when needed.

Run it once per project. If you make schema updates, re-run the script or create a migration through the Supabase migration flow.

## Architecture notes

- **Routing**: `react-router-dom` with protected routes that gate everything behind Supabase email authentication.
- **Data fetching**: TanStack Query handles cache invalidation after uploads and ensures optimistic UI states.
- **Maps**: React Leaflet + OpenStreetMap tiles, with markers for current location and activities.
- **FIT parsing**: `fit-file-parser` converts tracks to WKT (`LINESTRING`) and calculates simple centroids client-side.
- **Styling**: Tailwind CSS with lightweight shadcn-inspired building blocks under `src/components/ui`.
- **Geospatial helpers**: Haversine distance utilities live in `src/utils/geo.ts` to support proximity filtering and map markers.

## Scripts

| Command          | Description                           |
| ---------------- | ------------------------------------- |
| `npm run dev`    | Start Vite with hot module reload     |
| `npm run build`  | Production build                      |
| `npm run preview`| Preview the production bundle         |

## Testing & QA

Automated tests are not yet configured. Run through the main flows manually:

1. Create an account or sign in on `/login` with email + password and ensure redirect to `/app`.
2. Accept geolocation permissions and confirm the 400 m check works once data exists.
3. Upload a FIT file on `/upload`, verify the toast, and ensure it appears in `/history` and the dashboard map.
4. Open `/activity/:id` to validate the map and GeoJSON download.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds on every push to `main` and deploys to GitHub Pages. Provide the required environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) as GitHub secrets for production deployments.
