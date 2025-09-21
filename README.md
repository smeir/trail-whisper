# Trail Whisper

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
     ```

3. **Node.js 18+** with your preferred package manager (`pnpm` recommended, `npm` works as well).

## Local development

```bash
pnpm install
pnpm dev
```

The Vite dev server starts at http://localhost:5173. Sign in with your email address and password to exercise the authenticated routes.

## Production build

```bash
pnpm build
```

The optimised build is written to `dist/`. Run `pnpm preview` to smoke-test the production bundle.

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

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `pnpm dev`     | Start Vite with hot module reload     |
| `pnpm build`   | Production build                      |
| `pnpm preview` | Preview the production bundle         |
| `pnpm lint`    | Run ESLint over the TypeScript source |

## Testing & QA

Automated tests are not yet configured. Run through the main flows manually:

1. Create an account or sign in on `/login` with email + password and ensure redirect to `/app`.
2. Accept geolocation permissions and confirm the 400 m check works once data exists.
3. Upload a FIT file on `/upload`, verify the toast, and ensure it appears in `/history` and the dashboard map.
4. Open `/activity/:id` to validate the map and GeoJSON download.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds on every push to `main` and deploys to GitHub Pages. Provide the required environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) as GitHub secrets for production deployments.
