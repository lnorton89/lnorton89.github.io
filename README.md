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
- recharts — commit velocity area chart
- @tanstack/react-query — client-side "sync now" refresh against the GitHub REST API
- zustand — shared store so a single sync action updates every component
- lucide-react — icons
- vitest — focused tests for the snapshot-merge and filtering logic

## How the data flows

`scripts/fetch-github-data.mjs` runs before every build (`npm run prebuild`)
and writes a snapshot to `public/data/github.json`:

- Profile, repos, languages, and recent public events via the REST API
- Per-repository weekly commit statistics via `repos/{owner}/{repo}/stats/commit_activity`
- The real contribution calendar via the GraphQL API, **only if a token is
  available** (`GH_PAT` or the Actions-provided `GITHUB_TOKEN`) — without one,
  the heatmap falls back to the build-time commit-statistics view, clearly
  labeled as such

The page reads that JSON at build time (`fs.readFileSync`, no client fetch
needed for first paint). A "sync now" button manually re-fetches only the
profile, repository metadata, and recent public events directly from the
browser via TanStack Query — three requests in total. Those fields merge over
the build snapshot by repository `fullName` while its enriched language,
source-file, contribution, and commit-history data is preserved. Browser
refreshes are subject to GitHub's unauthenticated 60 req/hr per-IP limit; a
rate-limited refresh reports the failure and leaves the existing snapshot
untouched.

## Local development

```bash
cp .env.example .env.local
# edit .env.local — set GH_USERNAME, optionally GH_PAT for the real calendar
npm install
npm run dev
```

`predev` fetches a fresh snapshot automatically. Run `npm run fetch:data` any
time to refresh it manually.

## Testing

```bash
npm test
```

Runs the Vitest suite in `tests/` covering the snapshot-merge behavior (a
client refresh must never overwrite build-time language/source-file data, and
failed refreshes must not replace the base snapshot), repository filtering,
and file-metric formatting (missing tree data stays "unavailable" rather than
becoming a fake zero or estimate).

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
- The public Events API returns at most 300 events from roughly the previous
  30 days. It is used for recent activity, not as a complete contribution
  history.
- Repository source-file counts come from recognized file extensions in the
  recursive Git tree; they are not a count of every file in a repository.
