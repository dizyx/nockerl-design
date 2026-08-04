# @dizyx/nockerl-react

The Nockerl design system as React components: token-pure, SSR-safe (each component
injects its own `<style>`, so there is **zero consumer CSS/bundler config**), and
contract-checked (every component declares a `compose` contract; misuse warns in dev).

> Source of truth: **dizyx/nockerl-design**. Do not fork components into an app. Add or
> change them upstream and bump the version.

## Install

Public on npm. No registry configuration and no token:

```bash
npm install @dizyx/nockerl-react @dizyx/nockerl-tokens
```

`react` (>=19) is a peer dependency.

## Use

Import the tokens **once** at your app root (they define the `--color-*` / `--font-*` /
`--space-*` custom properties every component reads), then use components anywhere:

```tsx
import '@dizyx/nockerl-tokens/tokens.css';
import { Button, Surface } from '@dizyx/nockerl-react';

export function Example() {
  return (
    <Surface level={2}>
      <Button text="Save" variant="primary" onClick={() => {}} />
    </Surface>
  );
}
```

No stylesheet import from this package is required (styles ship with the markup).

## Load the brand fonts

The tokens name **Outfit** (`--font-family-sans`) and **Space Mono** (`--font-family-mono`),
but a token file cannot ship a typeface. If you don't load the fonts, every component
silently falls back to system fonts (off-brand, no error). Self-host with
[Fontsource](https://fontsource.org) and import once at your app entry:

```bash
npm install @fontsource/outfit @fontsource/space-mono
```

```ts
import '@fontsource/outfit/300.css';         // Outfit (sans): thin-forward ramp
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/space-mono/400.css';     // Space Mono: code / mono
import '@fontsource/space-mono/700.css';
```

Use `@fontsource/outfit` (family `Outfit`), **not** `@fontsource-variable/outfit` (whose
family is `Outfit Variable` and won't match the token). The family names match the token
names, so nothing else needs wiring. (Any other Outfit / Space Mono delivery works too,
whether Google Fonts or a local `@font-face`, as long as the loaded family names match.)

## Theming & dark mode

**Dark is the brand default.** The tokens define both themes; you choose which is active by a
class or attribute on a high ancestor (usually `<html>`):

```html
<html class="dark">        <!-- or: <html data-theme="dark"> -->
```

`tokens.css` scopes the dark values to `.dark` **and** `[data-theme='dark']`, so either works.
Light is the `:root` default and dark overrides it. Nothing switches until you set one of them.

Paint the page surface with the canvas token so the app isn't components-on-white:

```css
body { background: var(--color-canvas); color: var(--color-on-canvas); }
```

Follow the OS preference by reflecting it onto `<html>` once at startup:

```ts
const dark = matchMedia('(prefers-color-scheme: dark)');
const apply = () => document.documentElement.classList.toggle('dark', dark.matches);
apply();
dark.addEventListener('change', apply);
```

## What's in v0

Tier-1 primitives, tier-2 behaviors (Tooltip / Popover / Menu / ListItem / NavItem /
Calendar / ListboxOption / Overlay), and the tier-3 controls that live at the primitive
layer (Pagination / Tabs / RadioGroup / Stepper). Higher composites (Dialog, Table, …)
are consumed from the docs site today and land in a later minor.

## Developing against a checkout (local path)

Consuming the **published** package (registry install or a packed tarball) is the happy path
and needs nothing special. But if you point at a **local checkout** (`file:../nockerl-design/packages/react`,
`bun link` / `npm link`, a git submodule, or a monorepo), a production build can crash with:

```
TypeError: Cannot read properties of null (reading 'useId')
```

That's **two copies of React** in one bundle: the bundler resolves the library's `import 'react'`
by realpath, which walks into *this repo's* `node_modules`, while your app bundles its own
React. `vite dev` hides it (esbuild dedupes); `vite build` surfaces it. Fix it by forcing a
single React in your consumer config:

```ts title="vite.config.ts"
export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },
});
```

(`react`/`react-dom` are peer dependencies for exactly this reason. The component library must
use *your* React instance, not one of its own.)

---

MIT. The full text ships in this package as [`LICENSE`](./LICENSE).
