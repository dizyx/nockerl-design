package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * The **nav surface** is the ONE edge-anchored navigation panel ( · D5): the
 * SAME component in two modes, so the drawer and the persistent sidebar/nav-rail
 * are one surface, not two (mirroring the web's unified `NockerlNavSurface` /
 * `NockerlDrawer`).
 *
 * - [NockerlNavSurfaceMode.INLINE] is the persistent nav-rail / sidebar role: no
 *   scrim, the app stays live beside it.
 * - [NockerlNavSurfaceMode.OVERLAY] is the drawer role: a palette scrim behind the
 *   panel (tap [onScrimClick] to dismiss).
 *
 * The panel offers **BOTH ratified surface options** (R5-14 , token-driven):
 *
 * - [NockerlNavSurfaceStyle.TRANSLUCENT] (default) is the single ratified
 *   translucent surface ( · LAW-5 carve-out): `surfaceTranslucencySidebar`,
 *   a FIXED token alpha (never a slider), so a [NockerlFacetedBackground] behind
 *   it whispers through (the Nockerl-voice look). One-translucent-layer-max still
 *   holds: the facet is the OPAQUE ground, this panel is the ONE translucent
 *   layer above it.
 * - [NockerlNavSurfaceStyle.SOLID] is the opaque `chromeSurface` plane, matching
 *   the top bar: no see-through.
 *
 * A hairline on the content-facing edge separates the rail from the app.
 *
 * @param modifier outer modifier (size the host region; the panel fills its height).
 * @param mode inline (persistent rail, default) or overlay (drawer + scrim).
 * @param side which edge the panel anchors to (default [NockerlNavSurfaceSide.LEFT]).
 * @param width the panel width.
 * @param surface solid (opaque chrome) or translucent (facet whispers through).
 * @param onScrimClick overlay-mode dismiss (tapping the scrim); ignored inline.
 * @param content the nav body (nav items, header, footer), a [ColumnScope].
 */
@Composable
fun NockerlNavSurface(
    modifier: Modifier = Modifier,
    mode: NockerlNavSurfaceMode = NockerlNavSurfaceMode.INLINE,
    side: NockerlNavSurfaceSide = NockerlNavSurfaceSide.LEFT,
    width: Dp = 248.dp,
    surface: NockerlNavSurfaceStyle = NockerlNavSurfaceStyle.TRANSLUCENT,
    onScrimClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = LocalNockerlColors.current
    val onLeft = side == NockerlNavSurfaceSide.LEFT

    Box(modifier = modifier) {
        // OVERLAY = the drawer role: a scrim behind the panel, tap to dismiss.
        if (mode == NockerlNavSurfaceMode.OVERLAY) {
            Box(
                modifier =
                    Modifier
                        .matchParentSize()
                        .background(colors.scrim)
                        .then(
                            if (onScrimClick != null) {
                                Modifier.clickable(onClick = onScrimClick)
                            } else {
                                Modifier
                            },
                        ),
            )
        }

        // The sidebar surface: the ONE translucent layer (LAW-5) by default, or
        // the opaque chrome plane when the host opts into SOLID.
        Column(
            modifier =
                Modifier
                    .align(if (onLeft) Alignment.TopStart else Alignment.TopEnd)
                    .fillMaxHeight()
                    .width(width)
                    .background(
                        when (surface) {
                            NockerlNavSurfaceStyle.SOLID -> colors.chromeSurface
                            NockerlNavSurfaceStyle.TRANSLUCENT -> colors.surfaceTranslucencySidebar
                        },
                    )
                    // A hairline on the CONTENT-facing edge (right of a left rail,
                    // left of a right rail) separates the rail from the app.
                    .drawBehind {
                        val hairline = HAIRLINE_PX * density
                        val x = if (onLeft) size.width - hairline else 0f
                        drawRect(
                            color = colors.chromeHairline,
                            topLeft = Offset(x, 0f),
                            size = Size(hairline, size.height),
                        )
                    },
            content = content,
        )
    }
}

/**
 * The nav-surface **opacity options** (R5-14 ): both ratified, token-driven,
 * mirroring the web's `navSurface: 'solid' | 'translucent'`.
 */
enum class NockerlNavSurfaceStyle {
    /** Opaque `chromeSurface`: matches the top bar, no see-through. */
    SOLID,

    /** The sole LAW-5 carve-out: `surfaceTranslucencySidebar`, facet whispers through. */
    TRANSLUCENT,
}

/** The unified nav-surface modes: persistent rail vs drawer overlay. */
enum class NockerlNavSurfaceMode {
    /** The persistent nav-rail / sidebar. No scrim, app stays live. */
    INLINE,

    /** The drawer, with a scrim behind the panel. */
    OVERLAY,
}

/** The edge the nav surface anchors to. */
enum class NockerlNavSurfaceSide {
    /** Anchored to the leading edge. */
    LEFT,

    /** Anchored to the trailing edge. */
    RIGHT,
}

/** Content-edge hairline thickness (scaled by density in the draw scope). */
private const val HAIRLINE_PX = 1f
