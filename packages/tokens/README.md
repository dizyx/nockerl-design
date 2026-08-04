# @dizyx/nockerl-tokens

The canonical Nockerl design tokens, web build (CSS custom properties), generated from the
DTCG source in this repo (`tokens/` → Style Dictionary → `build/web/tokens.css`).
Consumed as a versioned dependency: **never vendored, never hardcoded**.

## Install

Public on npm. No registry configuration and no token:

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

Publishing is CI-only (`.github/workflows/release.yml`) and uses npm **trusted publishing**
over OIDC, so there is no npm token anywhere: not in the repo, not in a secret, not on a dev
machine. The workflow proves its identity to npm at publish time and npm attaches a
**provenance attestation**, which is what lets anyone confirm a published version really was
built from this repo at that commit.

Bump the version, then trigger the workflow (release / manual / `repository_dispatch`). A
`vX.Y.Z` git tag publishes this npm artifact **in lockstep** with `@dizyx/nockerl-react` and
the Compose Maven artifact: one version line across the whole design system, semver.

Two things follow from how provenance works, and both bite if forgotten. The workflow has to
run in the repository named by `repository.url` in `package.json`, so publishing is done from
the public repository (the workflow checks this and says so before it fails). And a package
has to exist before a trusted publisher can be attached to it, so the very first version of a
brand new package is published by hand, and CI takes over from the second onward.

---

MIT. The full text ships in this package as [`LICENSE`](./LICENSE).
