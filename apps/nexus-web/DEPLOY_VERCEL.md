# Vercel Deploy Checklist

Use this checklist to deploy `apps/nexus-web` without monorepo path issues.

## 1) Repository Setup

- Push latest changes with:
  - `vercel.json` at repository root
  - `apps/nexus-web` source and lockfile

## 2) Vercel Project (Recommended: Git Integration)

1. Import repo in Vercel.
2. In Project Settings, verify:
   - Root Directory: repo root (default)
   - Build and Output settings are loaded from `vercel.json`
3. Keep Node.js runtime aligned with `apps/nexus-web/package.json` (`20.x`).

## 3) Build Settings Used

From `vercel.json`:

- Install Command: `cd apps/nexus-web && npm ci`
- Build Command: `cd apps/nexus-web && npm run build`
- Output Directory: `apps/nexus-web/dist`

## 4) Pre-Deploy Local Check

From `apps/nexus-web`:

```sh
npm ci
npm run verify
```

## 5) First Deploy Validation

After deploy, confirm:

- Homepage loads
- Theme toggle works (light/system/dark)
- Release version badge renders
- Download links point to GitHub release assets or fallback release page

## 6) Common Failures

- Wrong working directory in build steps
- Missing lockfile or stale `node_modules`
- GitHub API rate-limit causing fallback links (site should still function)
