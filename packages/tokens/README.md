# @dizyx/nockerl-tokens

The canonical Nockerl design tokens, web build (CSS custom properties), generated from the
DTCG source in this repo (`tokens/` → Style Dictionary → `build/web/tokens.css`). Published to
**GitHub Packages** under the `@dizyx` scope (GitHub Packages requires the npm scope to equal
the GitHub org; the pure `@nockerl` brand is reserved for public npm later).
Consumed as a versioned dependency: **never vendored, never hardcoded**.

## Install

### 1. Auth: GitHub Packages needs a `read:packages` PAT

GitHub Packages (npm) has **no anonymous read**: resolving `@dizyx/*` requires a GitHub
Personal Access Token with the **`read:packages`** scope. Create one at
**GitHub → Settings → Developer settings → Personal access tokens** with `read:packages`, then
add a scoped `.npmrc` in the consumer repo (never commit the raw token, inject it from the
environment or your secret store):

```ini
# .npmrc (consumer repo)
@dizyx:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_GITHUB_TOKEN}   # a PAT with read:packages
```

In CI, the Actions `GITHUB_TOKEN` already has `packages: read`, so set
`NPM_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` and reuse the same `.npmrc`.

### 2. Install

```bash
npm install @dizyx/nockerl-tokens
# bun add @dizyx/nockerl-tokens   # (Bun works too)
```

## Quickstart

Import the tokens once at your app root. Light values are on `:root`, dark on `.dark`:

```css
/* import the tokens (light = :root, dark = .dark) */
@import "@dizyx/nockerl-tokens/tokens.css";
```

That defines the `--color-*` / `--font-*` / `--space-*` / `--radius-*` custom properties. Read
them anywhere. If you use `@dizyx/nockerl-react`, its components read these same
properties automatically:

```css
.card {
  background: var(--color-card-surface1);
  border-radius: var(--radius-card);   /* 16px */
  padding: var(--space-4);
}
```

## Fonts

The type tokens name **Outfit** (`--font-family-sans`) and **Space Mono**
(`--font-family-mono`). A CSS-variable file can't ship a typeface, so the consumer must load
those fonts. Otherwise text falls back to system fonts silently. Self-host with
[Fontsource](https://fontsource.org):

```bash
npm install @fontsource/outfit @fontsource/space-mono
```

```ts
import '@fontsource/outfit/300.css';         // sans (import the weights you render, 100-500)
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/space-mono/400.css';     // mono
import '@fontsource/space-mono/700.css';
```

Use `@fontsource/outfit` (family `Outfit`), not `@fontsource-variable/outfit` (family
`Outfit Variable`, which won't match the token). The `@dizyx/nockerl-react` and Installation
docs cover this same step; the Compose and Swift packages bundle the font, so this is the
web-only wiring.

## Publish (maintainers)

Publishing is CI-only (`.github/workflows/release.yml`) using the Actions `GITHUB_TOKEN`, so no
PAT, nothing on a dev machine. Bump the version, then trigger the workflow (release / manual /
`repository_dispatch: release-tokens`). A `vX.Y.Z` git tag publishes this npm artifact **in
lockstep** with `@dizyx/nockerl-react` and the Compose Maven artifact: one version line across
the whole design system. Semver per ADR-0006.

---

MIT, see the repo-root [`LICENSE`](../../LICENSE).
