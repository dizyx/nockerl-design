# tokens/

Layered design tokens. Authored once, composed per platform by the build.

```
core/        # global primitives + brand: shared by ALL platforms (cyan ramp, neutrals, type, base scales)
semantic/    # intent tokens referencing core; carries light/dark; shared elevation + radius/motion intent
platform/
  web/       # web-only deltas (rem/px, Tailwind/shadcn mapping, glass)
  android/   # Compose deltas (dp, Material 3 mapping, chamfer shapes)
  mac/       # SwiftUI/AppKit deltas (later, Voice)
```

**Build composition (Style Dictionary, via Bun):** `core → semantic → platform/<target>`.
A later layer overrides only what it names; everything else falls through. So brand
color, logos, and type are identical everywhere, while e.g. the web-4px vs Android-18dp
radius is an explicit, reviewable platform delta (not drift).

Full explanation + the "what is global vs platform-specific" rules: **`../docs/token-hierarchy.md`**.

> The flat placeholder files currently here (`color.json`, `radius.json`, …) migrate
> into `core/` + `semantic/` during the token-extraction task. The folder structure
> above is the ratified target.
