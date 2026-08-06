<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logos/nockerl-mark-on-dark.svg">
  <img alt="Nockerl" src="logos/nockerl-mark.svg" width="88">
</picture>

# Nockerl Design

Design tokens and components for Web, Android, and Swift.

[![CI](https://github.com/dizyx/nockerl-design/actions/workflows/ci.yml/badge.svg)](https://github.com/dizyx/nockerl-design/actions/workflows/ci.yml)
[![Swift](https://github.com/dizyx/nockerl-design/actions/workflows/swift.yml/badge.svg)](https://github.com/dizyx/nockerl-design/actions/workflows/swift.yml)
[![Compose](https://github.com/dizyx/nockerl-design/actions/workflows/compose.yml/badge.svg)](https://github.com/dizyx/nockerl-design/actions/workflows/compose.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-0CC0DF.svg)](LICENSE)

</div>

---

## Install

**Swift (SwiftPM)** resolves straight from this repo, no auth needed:

```swift
.package(url: "https://github.com/dizyx/nockerl-design.git", from: "2.2.0")
```

**Web (npm)**

```bash
npm install @dizyx/nockerl-tokens @dizyx/nockerl-react
```

**Android (Gradle)**

```kotlin
implementation("com.dizyx.nockerl:design-tokens:2.2.0")
implementation("com.dizyx.nockerl:design-components:2.2.0")
```

All packages ship on one version line, so a given release of one is compatible with the
same version of the others. Upgrade them together.

## Use it

```swift
import NockerlDesign

NockerlCard(elevation: .level2) {
    Text("Session started").nockerlType(.eyebrow)
}
```

```tsx
import { Surface, Button } from '@dizyx/nockerl-react';
import '@dizyx/nockerl-tokens/tokens.css';

<Surface elevation={2}>
  <Button variant="primary">Continue</Button>
</Surface>
```

```kotlin
NockerlSurface(elevation = NockerlElevation.Level2) {
    Text("Session started", style = NockerlType.eyebrow)
}
```

## Documentation

Every component has a page with live examples, a props table, and the code for all three
platforms. Build the docs site locally:

```bash
bun install
bun run build      # generate tokens for all platforms
cd site && bun run dev
```

## Development

```bash
bun run check      # typecheck + build + verify, run this before pushing
bun test           # unit tests
bun run verify     # round-trip every token to every platform target
```

`bun run verify` re-reads the generated CSS, Kotlin, and Swift and asserts each value
matches the token it came from, so a platform emitter that drifts fails the build.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how the
token layers fit together and what the build expects.

## License

MIT, see [LICENSE](LICENSE). The bundled Outfit and Space Mono typefaces are licensed
separately under the SIL Open Font License 1.1.
