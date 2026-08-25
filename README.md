# github-showcase

A statically-exported Next.js site that replaces the stock GitHub profile page
with a live build log: recent activity feed, contribution heatmap, language
breakdown, commit velocity, and recently-touched repositories. Deploys to
GitHub Pages with no backend — data is snapshotted at build time and can be
refreshed client-side on demand.

## Stack

- Next.js 16 (App Router) — `output: "export"` static export
- React 19
- Tailwind CSS v4 (design tokens in `src/app/globals.css`)
- framer-motion — page-load choreography, scroll reveals, hover states
- recharts — language donut, commit velocity sparkline
- @tanstack/react-query — client-side "sync now" refresh against the GitHub REST API
- zustand — shared store so a single sync action updates every component
- lucide-react — icons

## How the data flows

`scripts/fetch-github-data.mjs` runs before every build (`npm run prebuild`)
and writes a snapshot to `public/data/github.json`:

- Profile, repos, languages, and recent public events via the REST API
- The real contribution calendar via the GraphQL API, **only if a token is
  available** (`GH_PAT` or the Actions-provided `GITHUB_TOKEN`) — without one,
  the heatmap falls back to an approximate commit-velocity view built from
  public push events, clearly labeled as such

The page reads that JSON at build time (`fs.readFileSync`, no client fetch
needed for first paint). A "sync now" button re-fetches the public REST
endpoints directly from the browser via TanStack Query and overlays the
result through a zustand store — useful between scheduled rebuilds, subject
to GitHub's unauthenticated 60 req/hr per-IP limit.

## Local development

```bash
cp .env.example .env.local
# edit .env.local — set GH_USERNAME, optionally GH_PAT for the real calendar
npm install
npm run dev
```

`predev` fetches a fresh snapshot automatically. Run `npm run fetch:data` any
time to refresh it manually.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. Repo Settings → Pages → Source: **GitHub Actions**.
3. Optional: Settings → Secrets and variables → Actions → add `GH_PAT` (a
   classic token, no scopes needed for public data, `read:user` if you want
   contribution data without relying on `GITHUB_TOKEN`).
4. Push to `main`, or run the workflow manually. `.github/workflows/deploy.yml`
   builds with `GH_USERNAME` set to the repo owner, resolves the correct
   `basePath` automatically (empty for a `<user>.github.io` user site, `/repo`
   for a project site), and deploys `out/` to Pages. It also reruns on a
   6-hour schedule so the snapshot stays current between pushes.

## Notes

- Static export means no server runtime: no API routes, no ISR, no
  `next/image` optimization (`images.unoptimized: true` is required).
- The commit-velocity fallback only covers the events API's ~90-day public
  window, backfilled with zeros further back — it's framed as recent
  activity, not a full year, unless the real GraphQL calendar is available.
