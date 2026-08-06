package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.nockerlLitSurface
import com.dizyx.nockerl.design.tokens.nockerlRecessedSurface
import com.dizyx.nockerl.design.tokens.nockerlShadow

/**
 * The canonical **alert intent map**: the ONE home for the alert family's color
 * bindings (mirrors the web's `ALERT_INTENT`; single-sourced so Banner / Toast /
 * Callout can never diverge).
 *
 * - Cyan is reserved for [INFO] ONLY (design-laws §10): the canonized info
 *   mapping on every platform is `accentPrimary` (Voice uses the same accent
 *   slot; there is no separate info-status token by design).
 * - [NOTICE] is the sanctioned warm accent (`accentWarm`), a non-status tone.
 * - All other warms are status signals ([SUCCESS] / [WARNING] / [DANGER]).
 */
enum class NockerlAlertIntent {
    /** Informational: brand cyan (`accentPrimary`). */
    INFO,

    /** Success: `statusSuccess`. */
    SUCCESS,

    /** Warning: `statusWarning`. */
    WARNING,

    /** Danger / error: `statusError`. */
    DANGER,

    /** Special notice: the warm accent (`accentWarm`), decorative not status. */
    NOTICE,
    ;

    /** The intent's full-strength hue. */
    fun color(colors: NockerlColors): Color =
        when (this) {
            INFO -> colors.accentPrimary
            SUCCESS -> colors.statusSuccess
            WARNING -> colors.statusWarning
            DANGER -> colors.statusError
            NOTICE -> colors.accentWarm
        }

    /**
     * The intent's soft wash: the dedicated soft token where one exists
     * (info/notice), otherwise the hue at the canonical 16% alert wash (the same
     * fixed-alpha rule the web's `color-mix(… 16%)` encodes; law §5).
     */
    fun softColor(colors: NockerlColors): Color =
        when (this) {
            INFO -> colors.accentPrimarySoft
            NOTICE -> colors.accentWarmSoft
            SUCCESS -> colors.statusSuccess.copy(alpha = ALERT_SOFT_WASH_ALPHA)
            WARNING -> colors.statusWarning.copy(alpha = ALERT_SOFT_WASH_ALPHA)
            DANGER -> colors.statusError.copy(alpha = ALERT_SOFT_WASH_ALPHA)
        }

    /**
     * The intent's disc glyph: the Material equivalents the alert docs map the
     * web SVGs onto (the disc supplies the colored circle; the glyph is the
     * knockout stencil).
     */
    val icon: ImageVector
        get() =
            when (this) {
                INFO -> Icons.Filled.Info
                SUCCESS -> Icons.Filled.Check
                WARNING -> Icons.Filled.Warning
                DANGER -> Icons.Filled.Close
                NOTICE -> Icons.Filled.Star
            }
}

/** The fixed soft-wash alpha for intents without a dedicated soft token. */
internal const val ALERT_SOFT_WASH_ALPHA = 0.16f

/**
 * The **status disc**: the signature "filled status-color icon disc" every
 * alert leads with (design-laws §6: status lives in a coin, never a left rail).
 * A 24dp circle filled with the intent hue, a 16dp glyph knocked out in the
 * CANVAS ink (the dark ground), a whisper of neutral drop shadow below and a
 * stronger top catch-light above, a small dimensional coin.
 *
 * Decorative by design: the HOST alert carries the semantic text, so the disc
 * itself exposes no accessibility content.
 *
 * **Inset variant.** With `inset = true` the coin INVERTS into a
 * RECESSED WELL: a soft intent wash + a whisper intent border + the inner top
 * shade ([nockerlRecessedSurface]), with the intent color moving onto the GLYPH.
 * It SINKS instead of lifting ("cards lift, fields sink"), for marks that sit
 * ON a lifted plane (the dialog header), where a raised coin would compete with
 * the card's own lift. Mirrors the web StatusDisc `inset` prop exactly.
 *
 * @param intent the alert intent (drives fill + glyph).
 * @param modifier outer modifier.
 * @param color override the fill (defaults to the intent hue).
 * @param inset render as the recessed well (glyph carries the color) instead of
 *   the raised filled coin.
 */
@Composable
fun NockerlStatusDisc(
    intent: NockerlAlertIntent,
    modifier: Modifier = Modifier,
    color: Color = intent.color(LocalNockerlColors.current),
    inset: Boolean = false,
) {
    val colors = LocalNockerlColors.current
    if (inset) {
        // The RECESSED well: wash + whisper border + inner top shade; the intent
        // hue rides the GLYPH. No drop shadow, no catch-light. It sinks.
        Box(
            modifier =
                modifier
                    .size(DISC_SIZE)
                    .nockerlRecessedSurface(shape = CircleShape)
                    .background(color = intent.softColor(colors), shape = CircleShape)
                    .border(1.dp, color.copy(alpha = INSET_BORDER_ALPHA), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = intent.icon,
                contentDescription = null, // decorative: the host carries the text
                modifier = Modifier.size(DISC_ICON_SIZE),
                tint = color,
            )
        }
        return
    }
    Box(
        modifier =
            modifier
                .size(DISC_SIZE)
                // Neutral drop below the coin: a BESPOKE (off-ladder) shadow tint at
                // the canon 40% mix; pass tintAlpha explicitly so nockerlShadow keeps
                // it off the shadowTintAlpha lift ladder.
                .nockerlShadow(
                    elevation = NockerlElevation.Level1,
                    shape = CircleShape,
                    tintAlpha = DISC_SHADOW_MIX,
                )
                // The intent fill…
                .background(color = color, shape = CircleShape)
                // …then the coin's catch-light on top: STRONGER than a card's, the
                // core-white primitive at the canon 28% mix (clips to the circle).
                .nockerlLitSurface(
                    shape = CircleShape,
                    highlight = Color.White.copy(alpha = DISC_HIGHLIGHT_MIX),
                ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = intent.icon,
            contentDescription = null, // decorative: the host alert carries the text
            modifier = Modifier.size(DISC_ICON_SIZE),
            tint = colors.canvas,
        )
    }
}

/** Disc diameter: the ratified 24dp coin. */
private val DISC_SIZE = 24.dp

/** Knockout glyph size: 16dp inside the 24dp coin. */
private val DISC_ICON_SIZE = 16.dp

/** Whisper intent border alpha on the INSET well (mirrors the web 30%). */
private const val INSET_BORDER_ALPHA = 0.30f

/** Neutral drop mix under the coin (canon 40% of the shadow tint). */
private const val DISC_SHADOW_MIX = 0.4f

/** Core-white catch-light mix on the coin's top edge (canon 28%). */
private const val DISC_HIGHLIGHT_MIX = 0.28f
