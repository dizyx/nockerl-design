package com.dizyx.nockerl.design.gallery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlColors
import com.dizyx.nockerl.design.tokens.NockerlTheme

/**
 * Shared scaffolding for the **design gallery**: the maintained Compose
 * showcase of every shipped design-system component (galleries live
 * with the libraries, not the consuming apps).
 *
 * The gallery has two consumers that render the *exact same* composables, so a
 * component is defined once and never drifts between them:
 *  - **Showkase** (on-device browser): each gallery entry is a
 *    `@ShowkaseComposable`, aggregated by [GalleryShowkaseRoot] into a browsable
 *    registry (host it from any dev app; this library module ships no Activity).
 *  - **Roborazzi** (headless PNG capture): the screenshot test iterates the
 *    Showkase-generated registry and renders each entry to a 3x PNG in BOTH
 *    themes (see `src/test/.../ComponentGalleryScreenshotTest.kt`).
 *
 * Every gallery entry composes its component(s) inside [GalleryGroup], which lays
 * them out on the live palette canvas with consistent padding/spacing. The
 * entries are theme-agnostic. They read tokens from [LocalNockerlColors], so
 * the surrounding theme ([NockerlTheme]) decides dark vs light. The screenshot
 * test provides the theme per capture; a browser host provides it on-device.
 *
 * Naming convention (the contract the design site relies on): every entry is
 * tagged with the Showkase `group` [GROUP] and a `name` of
 * `"<Component> · <state>"` (e.g. `"Button · Primary"`). The screenshot test
 * derives PNG paths from those. See that test's KDoc for the directory layout.
 */

/** The single Showkase group all design-system gallery entries belong to. */
const val GROUP = "Nockerl Design System"

/**
 * Lay out one gallery entry's content on the live palette canvas.
 *
 * Paints [NockerlColors.canvas] behind [content] so a captured PNG shows the
 * component on its real page background (not transparent pixels), and applies
 * the gallery's standard 24dp inset + 12dp vertical rhythm. Width is
 * wrap-content by default so a single-component capture is tightly cropped;
 * pass a width-constraining [modifier] for full-width components.
 *
 * @param modifier outer modifier (e.g. a width constraint for full-width rows).
 * @param content the component(s) this gallery entry showcases.
 */
@Composable
fun GalleryGroup(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = LocalNockerlColors.current
    Column(
        modifier =
            modifier
                .background(colors.canvas)
                .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        content()
    }
}

/**
 * A [GalleryGroup] pre-constrained to the standard phone content width.
 *
 * Convenience for full-width components (segmented controls, settings rows,
 * cards, list items) so each entry's capture has a stable, realistic width
 * instead of shrinking to its intrinsic size.
 */
@Composable
fun GalleryGroupFullWidth(content: @Composable () -> Unit) {
    GalleryGroup(modifier = Modifier.fillMaxWidth(), content = content)
}
