# Contributing

Thanks for taking a look. This is a design system that generates three platform outputs
from one token source, so the most useful thing to understand before changing anything is
where a value is allowed to live.

## Setup

```bash
bun install
bun run build      # generate tokens for web, Compose, and Swift
bun run check      # typecheck + build + verify + the dash gate

git config core.hooksPath .githooks   # optional, catches dash problems before you commit
```

Bun is the runtime. There is no Node fallback.

## One writing rule

Em dashes, en dashes, and their lookalikes are not allowed anywhere in this repository:
not in prose, not in code comments, not in string literals. `bun run check:dashes`
enforces it, and the same check runs in CI, so a pull request carrying one will not pass.

There is no ignore pragma, deliberately. When the gate stops you, rewrite the sentence
rather than swapping in a hyphen: a colon introduces a definition or a list, a comma
carries a mild aside, parentheses subordinate a real interruption, a full stop splits two
welded thoughts, and deleting the clause is often the honest answer. A hyphen is right
only for a genuinely hyphenated compound.

The sole exemption is verbatim third-party legal text, which keeps its original wording.

## Where values live

Tokens are layered, and each layer may only reference the one below it:

| Layer | Holds | Example |
|-------|-------|---------|
| `tokens/core/` | raw primitives: the palette, the spacing scale | `cyan400: #0CC0DF` |
| `tokens/semantic/` | roles that reference core | `accentPrimary: {core.cyan400}` |
| platform output | generated, never edited by hand | `--color-accent-primary` |

**Components consume semantic tokens.** A component that hardcodes a hex, a pixel value,
or a font name will fail `bun run lint:tokens`. If you need a value that doesn't exist,
add the semantic token rather than inlining it.

Anything under `build/` is generated. Edit `tokens/`, run `bun run build`, and commit the
regenerated output.

## Making a change

**Changing a token value.** Edit the JSON in `tokens/`, run `bun run build`, and check
`bun run verify` still passes. That command re-reads the generated CSS, Kotlin, and Swift
and asserts every value matches its source token, so it will catch an emitter that drifted.

**Adding a component.** It needs to exist on the platforms it claims to support, consume
only semantic tokens, and come with a docs page under `site/src/content/docs/components/`
showing live examples and a props table. Props tables are extracted from the source, so
run `bun run props:extract` rather than writing them by hand.

**Changing something visual.** Say so explicitly in the PR description. Visual changes
are the ones that ripple out to every consuming app.

## What CI checks

Everything below runs on every push, and all of it must pass:

- typecheck, lint, and unit tests
- `verify`, the token round-trip across all three platforms
- `lint:tokens`, no hardcoded design values in components
- `check:deps`, no dependency cycles or upward dependencies between tiers
- `check:docs`, every import in a docs page is a real export
- one version line, so all package manifests agree

Swift and Compose build and test in their own workflows.

## Pull requests

Keep them focused: one concern per PR. Describe what changed and why, and call out
anything visual. If you're planning something large, open an issue first so we can talk
about the shape before you build it.

## Versioning

All packages ship on one version line, following [semver](https://semver.org/): a renamed
or removed token is a major, added tokens are a minor, and a changed value is a patch.
