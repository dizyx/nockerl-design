package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.nockerlInsetTaper

/**
 * The **inset icon** is the ratified INFORMATIONAL icon treatment ( canon,
 * law ): a glyph that SINKS into a recessed disc well ("fields sink") rather
 * than sitting on a raised filled-circle. the design lead's "super classy" direction,
 * first shipped on the EmptyState mark and now the canon for any purely
 * informational icon (EmptyState, Banner marks, panel-header cogs).
 *
 * **NEVER clickable (law ).** Flat/plain + filled-circle icons signal
 * *interactive*; the inset treatment signals *informational*. This composable
 * deliberately exposes NO click handler. An inset icon with an `onClick` is a
 * law violation by construction, so the type makes it impossible.
 *
 * The well is the recessed grammar: circular, with a MUTED glyph on `canvasAlt`
 * + a hairline. The inner shade FOLLOWS the circle ([nockerlInsetTaper], ): a
 * top-weighted radial that wraps the arc + a bottom catch-light, not an abrupt band. Three tones mirror
 * the web `.nk-es__well` variants exactly:
 * - [NockerlInsetIconTone.NEUTRAL]: muted `onCardMuted` mark on the plain well.
 * - [NockerlInsetIconTone.BRAND] is earned cyan: `accentPrimary` on `accentPrimarySoft`.
 * - [NockerlInsetIconTone.ERROR] is warm status: `statusError` on a 12% wash.
 *
 * @param icon the informational glyph.
 * @param contentDescription the a11y name, or `null` when a sibling label already
 *   carries the meaning (e.g. an EmptyState title), then the mark is decorative.
 * @param modifier outer modifier.
 * @param tone the well tint (default neutral).
 */
@Composable
fun NockerlInsetIcon(
    icon: ImageVector,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    tone: NockerlInsetIconTone = NockerlInsetIconTone.NEUTRAL,
) {
    val colors = LocalNockerlColors.current
    val glyph: Color
    val fill: Color
    val border: Color
    when (tone) {
        NockerlInsetIconTone.NEUTRAL -> {
            glyph = colors.onCardMuted
            fill = colors.canvasAlt
            border = colors.cardHairline
        }
        NockerlInsetIconTone.BRAND -> {
            glyph = colors.accentPrimary
            fill = colors.accentPrimarySoft
            border = colors.accentPrimary.copy(alpha = BRAND_BORDER_ALPHA)
        }
        NockerlInsetIconTone.ERROR -> {
            glyph = colors.statusError
            fill = colors.statusError.copy(alpha = ERROR_FILL_ALPHA)
            border = colors.statusError.copy(alpha = ERROR_BORDER_ALPHA)
        }
    }

    Box(
        modifier =
            modifier
                .size(WELL_SIZE)
                .nockerlInsetTaper(shape = CircleShape)
                .background(fill, CircleShape)
                .border(1.dp, border, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = glyph,
            modifier = Modifier.size(GLYPH_SIZE),
        )
    }
}

/** The informational inset-icon tones, mirroring the web `.nk-es__well` variants. */
enum class NockerlInsetIconTone {
    /** Muted neutral mark: the default informational look. */
    NEUTRAL,

    /** Earned cyan: first-run / brand-positive empty states. */
    BRAND,

    /** Warm status-error: failure / problem states (never color alone). */
    ERROR,
}

/** Well diameter: the web `space-16` (64). */
private val WELL_SIZE: Dp = 64.dp

/** Glyph diameter inside the well: the web `space-8` (32). */
private val GLYPH_SIZE: Dp = 32.dp

/** Brand border alpha (web `accentPrimary 24%`). */
private const val BRAND_BORDER_ALPHA = 0.24f

/** Error fill wash alpha (web `statusError 12%`). */
private const val ERROR_FILL_ALPHA = 0.12f

/** Error border alpha (web `statusError 30%`). */
private const val ERROR_BORDER_ALPHA = 0.30f
