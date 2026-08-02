package com.dizyx.nockerl.design.gallery

import androidx.compose.runtime.Composable
import com.airbnb.android.showkase.models.Showkase
import com.airbnb.android.showkase.models.ShowkaseBrowserComponent
import com.dizyx.nockerl.design.tokens.NockerlTheme
import com.dizyx.nockerl.design.tokens.ThemeMode
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Render the entire Nockerl design-system gallery to PNG **headless** (no
 * emulator, no device) via Roborazzi on top of Robolectric.
 *
 * ### One source of truth: Showkase drives the capture
 * The gallery components are defined once in `main`
 * (`com.dizyx.nockerl.design.gallery.*`), each annotated `@ShowkaseComposable`.
 * This test does NOT re-list them: it reads the **Showkase-generated registry**
 * ([Showkase.getMetadata]) and renders every entry, so any Showkase browser
 * host and these PNGs can never drift out of sync. Adding a new
 * `@ShowkaseComposable` to the gallery automatically adds it here.
 *
 * Each component is captured **once per theme** (dark + light): the parameter
 * provider is the cross-product of `componentList × ThemeMode`, and each capture
 * wraps the component in [NockerlTheme] for that mode so the semantic palette +
 * Material 3 color scheme are live, exactly as on-device. The gallery composables
 * paint their own canvas background (via [GalleryGroup]), so no extra surface
 * wrapping is needed here.
 *
 * ### Why this shape
 * Roborazzi's canonical Compose path is JUnit4 + a Robolectric runner, so this is
 * a JUnit4 [ParameterizedRobolectricTestRunner] test (this module has no JUnit5
 * suite, so no vintage engine is involved). [GraphicsMode.Mode.NATIVE] routes
 * Compose's draw calls through Robolectric's native graphics layer so the
 * captured bitmap contains the real pixels (fills, borders, shadows, text), not
 * a blank canvas.
 *
 * [Config] pins the SDK to the project's `compileSdk` (35) and sizes the device
 * to a standard phone at **xxhdpi (3x)** (`w411dp-h891dp-xxhdpi`) so layout is
 * deterministic across machines AND the captured PNGs are 3x the dp size: crisp
 * when the design site downscales them, not an upscaled 1x bitmap.
 *
 * ### Output layout (the contract the design site consumes)
 * Golden PNGs are version-controlled under
 * `nockerl-design-gallery/src/test/screenshots/gallery/<theme>/<component>.png`,
 * e.g. `gallery/dark/button-variants-enabled.png` and its `gallery/light/…`
 * twin. The `<theme>` directory split + the slugified component name give a
 * predictable per-component, per-theme tree. Run:
 *  - `./gradlew :nockerl-design-gallery:recordRoborazziDebug` to (re)record, and
 *  - `./gradlew :nockerl-design-gallery:verifyRoborazziDebug` to fail the build
 *    on any visual diff (the visual-regression gate).
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w411dp-h891dp-xxhdpi")
class ComponentGalleryScreenshotTest(
    private val case: GalleryCase,
) {
    /** Render this [case]'s component in its theme and capture it to its PNG. */
    @Test
    fun captureGalleryComponent() {
        captureRoboImage(filePath = case.filePath()) {
            ThemedGalleryEntry(mode = case.theme, content = case.component.component)
        }
    }

    companion object {
        /**
         * The capture matrix: every Showkase component × dark + light.
         *
         * Each row is one parameterized invocation. Built from the generated
         * Showkase registry so the set always matches the annotated gallery.
         * [ThemeMode.SYSTEM] is excluded because it resolves to dark or light
         * at runtime and would duplicate one of them.
         */
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun cases(): List<Array<Any>> =
            Showkase.getMetadata().componentList.flatMap { component ->
                ThemeMode.entries
                    .filter { it != ThemeMode.SYSTEM }
                    .map { theme -> arrayOf<Any>(GalleryCase(component, theme)) }
            }
    }
}

/**
 * One unit of the gallery capture matrix: a Showkase [component] rendered in a
 * specific [theme].
 *
 * @property component the Showkase-registered gallery entry to render.
 * @property theme the palette to render it under (dark or light).
 */
data class GalleryCase(
    val component: ShowkaseBrowserComponent,
    val theme: ThemeMode,
) {
    /**
     * The PNG path for this case:
     * `gallery/<theme>/<slugified component name>.png`.
     *
     * The component name is lower-cased and reduced to `[a-z0-9-]` words joined
     * by single hyphens (e.g. `"Button · Variants (enabled)"` →
     * `button-variants-enabled`), so the tree is filesystem- and URL-safe for the
     * design site.
     */
    fun filePath(): String = "$OUTPUT_DIR/${theme.dirName}/${component.slug()}.png"

    /** Used in the parameterized test name, e.g. `button-variants-enabled · dark`. */
    override fun toString(): String = "${component.slug()} · ${theme.dirName}"

    companion object {
        /**
         * Root directory the gallery PNGs land in: a **version-controlled** path
         * under the module, resolved relative to the module dir
         * (`nockerl-design-gallery/`) because `captureRoboImage(filePath = …)`
         * takes a module-relative path. The full committed tree is
         * `nockerl-design-gallery/src/test/screenshots/gallery/<theme>/<slug>.png`.
         *
         * These PNGs are the golden gallery: `recordRoborazziDebug` (re)writes
         * them, `verifyRoborazziDebug` diffs against them to catch visual
         * regressions, and the design site consumes them straight from the repo.
         * Comparison diffs from a failed verify go to the build dir instead (see
         * the `roborazzi { compare { … } }` config in build.gradle.kts), never
         * the tracked tree.
         */
        const val OUTPUT_DIR = "src/test/screenshots/gallery"
    }
}

/**
 * Slugify a Showkase component's name into a filesystem- and URL-safe token:
 * lower-cased, every run of non-`[a-z0-9]` characters collapsed to a single
 * hyphen, leading/trailing hyphens trimmed.
 */
private fun ShowkaseBrowserComponent.slug(): String =
    componentName
        .lowercase()
        .replace(Regex("[^a-z0-9]+"), "-")
        .trim('-')

/** The output sub-directory name for a theme (`dark` / `light`). */
private val ThemeMode.dirName: String
    get() =
        when (this) {
            ThemeMode.DARK -> "dark"
            ThemeMode.LIGHT -> "light"
            ThemeMode.SYSTEM -> "system"
        }

/**
 * Wrap a gallery entry in [NockerlTheme] for the given [mode] so the captured
 * component renders against the live semantic palette + M3 color scheme. The
 * gallery composables paint their own canvas background, so this only supplies
 * the theme.
 */
@Composable
private fun ThemedGalleryEntry(
    mode: ThemeMode,
    content: @Composable () -> Unit,
) {
    NockerlTheme(mode = mode) {
        content()
    }
}
