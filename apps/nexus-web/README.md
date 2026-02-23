# NEXUS Web

Marketing/product website for the NEXUS desktop application.

## Stack

- Astro 5
- Tailwind CSS 4
- Lucide icons (local npm dependency)

## Local Development

Run commands inside `apps/nexus-web`:

```sh
npm install
npm run dev
```

## Quality and Build

```sh
npm run check
npm run lint
npm run build
npm run verify
```

- `check`/`lint`: Astro type/content checks
- `build`: Static production build into `dist/`
- `verify`: Check + build in one command

## Release Download Links

Homepage download buttons are resolved from:

- `https://api.github.com/repos/ryanastro-dev/NEXUS/releases/latest`

If release assets cannot be fetched, links automatically fall back to:

- `https://github.com/ryanastro-dev/NEXUS/releases/latest`

## Vercel Deploy

Recommended Vercel settings:

- Root Directory: `apps/nexus-web`
- Framework Preset: `Astro`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

For monorepo-safe deploy from repository root, this repo now includes
`vercel.json` with build/install/output paths for `apps/nexus-web`.

Detailed checklist:

- `apps/nexus-web/DEPLOY_VERCEL.md`
