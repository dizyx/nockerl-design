# Nockerl Design: Compose (Android)

The Kotlin/Jetpack-Compose side of the Nockerl design system, published to **GitHub Packages
Maven**. Source of truth: **dizyx/nockerl-design**. Clients consume it as a versioned
dependency and never re-invent the tokens/theme (ADR-0006/0007).

## Modules

| Coordinate | What |
|---|---|
| `com.dizyx.nockerl:design-tokens` | The token + theme layer: `NockerlColors` + palettes, `ThemeMode` / `LocalNockerlColors`, `NockerlTheme` (Activity-safe), `NockerlTypography` (**Outfit**, thin-forward, per ADR-0008), `NockerlShapes` (**card = 16**, per ADR-0003), and the "lit from above" material (`NockerlElevation`, `nockerlShadow`, `nockerlLitSurface`, `NockerlSurface`, `NockerlCard`). The Outfit variable font is bundled in the library. |
| `com.dizyx.nockerl:design-components` | The component layer (**shipped in 0.5.0**): `NockerlButton` (the fill-ladder button family), `NockerlIconButton`, `NockerlChip`, and their shared control internals. This layer depends on `design-tokens`. Since Phases 3 and 4: `NockerlBottomSheet` + `NockerlSheetGrip`, `NockerlSegmented`, `NockerlSettingsRow`, the `NockerlListItem` grammar, and `Modifier.longPressPop`. |
| `:nockerl-design-gallery` *(never published)* | The maintained Showkase gallery + the Roborazzi golden rail (ADR-0007: galleries live with the libraries). Every shipped component has a curated `@ShowkaseComposable` entry; the screenshot test renders each entry to a version-controlled golden PNG in dark + light (headless, no emulator). |

## The visual-regression rail (goldens)

Golden PNGs live at `nockerl-design-gallery/src/test/screenshots/gallery/<theme>/<slug>.png`
(10 components × dark + light) and are consumed by the docs site straight from the repo.

```bash
./gradlew :nockerl-design-gallery:verifyRoborazziDebug   # gate: FAIL on any pixel diff
./gradlew :nockerl-design-gallery:recordRoborazziDebug   # re-record after a DELIBERATE visual change, then commit the PNGs
```

Diff artifacts from a failed verify land under `build/outputs/roborazzi/compare/`, never the
tracked tree. The gallery module is dev tooling only: it may use `material-icons-extended`;
the published modules must not.

## Consuming it (auth is required, even for reads)

GitHub Packages Maven requires authentication **even to resolve/read** an artifact. There is
no anonymous read, and Gradle cannot route through the the credential store proxy. Every consumer (CI and
local dev machines) needs a **read-only Personal Access Token** with the **`read:packages`**
scope.

### 1. Put the credentials outside the repo

Add to `~/.gradle/gradle.properties` (never commit a token):

```properties
gpr.user=<your-github-username>
gpr.key=<a-PAT-with-read:packages>
```

In CI, the Actions `GITHUB_TOKEN` already has `packages: read`. Read `GITHUB_ACTOR` /
`GITHUB_TOKEN` from the environment instead of the properties file.

### 2. Add the repository (consumer `settings.gradle.kts`)

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven {
            name = "NockerlDesignGitHubPackages"
            url = uri("https://maven.pkg.github.com/dizyx/nockerl-design")
            credentials {
                username = providers.gradleProperty("gpr.user").orNull ?: System.getenv("GITHUB_ACTOR")
                password = providers.gradleProperty("gpr.key").orNull ?: System.getenv("GITHUB_TOKEN")
            }
        }
    }
}
```

### 3. Depend on it

```kotlin
// consumer module build.gradle.kts
dependencies {
    implementation("com.dizyx.nockerl:design-tokens:0.6.0")
    implementation("com.dizyx.nockerl:design-components:0.6.0")   // optional: the button family
}
```

### 4. Theme the app

```kotlin
import com.dizyx.nockerl.design.tokens.NockerlTheme
import com.dizyx.nockerl.design.tokens.ThemeMode

setContent {
    NockerlTheme(mode = ThemeMode.DEFAULT) {
        // your composables: MaterialTheme is themed; LocalNockerlColors is provided;
        // Outfit is the type ramp; cards use the 16dp radius.
    }
}
```

The bundled Outfit font ships inside the library (no font wiring needed). `NockerlTheme` is
**Activity-safe** (it no-ops the system-bar sync outside an Activity), so it works in
`@Preview` and non-Activity hosts.

### 5. Use the components

`design-components` builds on the theme. Call the components inside `NockerlTheme`:

```kotlin
import com.dizyx.nockerl.design.components.NockerlButton
import com.dizyx.nockerl.design.components.NockerlButtonVariant

NockerlButton(
    text = "Save",
    onClick = { save() },
    variant = NockerlButtonVariant.PRIMARY,
)
```

`NockerlIconButton` and `NockerlChip` follow the same pattern. All read the ambient
`LocalNockerlColors`, so they restyle with the active `ThemeMode` and never hardcode a value.

## Building / publishing (maintainers)

Compile-only verification runs on any machine with the Android SDK (no emulator needed):

```bash
cd packages/compose
./gradlew :nockerl-design-tokens:assembleRelease :nockerl-design-tokens:ktlintCheck
```

Publishing is **CI-only**, tag-driven, and hardened (version-from-tag must match the module's
`build.gradle.kts`; `ALREADY_PUBLISHED` is a failure). A `vX.Y.Z` git tag publishes this
Maven artifact **in lockstep** with the npm `@dizyx/nockerl-tokens` + `@dizyx/nockerl-react`
packages: one version line across the whole design system.

The token values are generated from the DTCG source (`bun run build` → `NockerlTokens.kt`);
the hand-written semantic layer assembles the palettes from those generated constants, so
there are **no hardcoded design values** in the module.

---

Private / internal: see the repo-root [`LICENSE`](../../LICENSE). No open-source or
redistributable license is offered for this Maven artifact.
