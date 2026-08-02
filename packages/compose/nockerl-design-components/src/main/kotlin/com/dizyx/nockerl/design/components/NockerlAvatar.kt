package com.dizyx.nockerl.design.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * The standardized **avatar**: person/session identity as a clipped disc with a
 * strict fallback ladder (avatar.mdx): image → initials. Unifies the raw
 * `Image(...).clip(CircleShape)` pattern client #1 re-derives (32dp in the top
 * bar, 40dp in the settings sheet) into one wrapper with the ratified size ramp.
 *
 * - **Image**: pass a [painter] (the library takes a [Painter], never an image
 *   loader dependency. Hand it `painterResource(...)` or a Coil painter).
 * - **Initials**: derived from [name] ("Ada Lovelace" → "PM") on the soft
 *   accent wash; a blank name renders the "?" placeholder glyph.
 * - **Presence**: an optional bottom-right dot ([presence], pass a palette dot
 *   token), notched into the host surface via a [presenceRing] ring so the dot
 *   reads anchored, not floating. The dot is decorative here. Fold the state
 *   into [contentDescription] ("the design lead, active"), never color alone (law §13).
 *
 * @param name the person/session name (drives initials + the default a11y name).
 * @param modifier outer modifier.
 * @param painter optional avatar image; initials render when `null`.
 * @param size the ratified diameter ramp (default [NockerlAvatarSize.SM], 32dp).
 * @param shape [CircleShape] (default): the rounded-square variant is a proposed
 *   alternative; pass the control shape once that ratifies.
 * @param presence optional presence-dot color (a `dot*` palette token).
 * @param presenceRing the notch ring color: match the HOST surface the avatar
 *   sits on (defaults to `cardSurface1`).
 * @param contentDescription accessible name (defaults to [name]).
 */
@Composable
fun NockerlAvatar(
    name: String,
    modifier: Modifier = Modifier,
    painter: Painter? = null,
    size: NockerlAvatarSize = NockerlAvatarSize.SM,
    shape: Shape = CircleShape,
    presence: Color? = null,
    presenceRing: Color = LocalNockerlColors.current.cardSurface1,
    contentDescription: String? = null,
) {
    val colors = LocalNockerlColors.current
    // Distinct local: the semantics receiver's property shadows the parameter.
    val accessibleName = contentDescription ?: name

    Box(modifier = modifier.semantics { this.contentDescription = accessibleName }) {
        Box(
            modifier = Modifier.size(size.diameter).clip(shape),
            contentAlignment = Alignment.Center,
        ) {
            if (painter != null) {
                Image(
                    painter = painter,
                    contentDescription = null, // named by the outer semantics
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxSize().background(colors.accentPrimarySoft),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = nockerlAvatarInitials(name),
                        style = size.initialsStyle(),
                        // 500 is the bold cap (law §11). Initials are medium, never bold.
                        fontWeight = FontWeight.Medium,
                        color = colors.accentPrimary,
                        maxLines = 1,
                    )
                }
            }
        }

        if (presence != null) {
            // Bottom-right presence dot, notched by a host-surface ring.
            Box(
                modifier =
                    Modifier
                        .align(Alignment.BottomEnd)
                        .size(NockerlStatusDotDefaults.LoudSize + PRESENCE_RING_WIDTH * 2)
                        .clip(CircleShape)
                        .background(presenceRing),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier =
                        Modifier
                            .size(NockerlStatusDotDefaults.LoudSize)
                            .clip(CircleShape)
                            .background(presence),
                )
            }
        }
    }
}

/** The ratified avatar diameter ramp (avatar.mdx). */
enum class NockerlAvatarSize(
    /** The disc diameter. */
    val diameter: Dp,
) {
    /** 24dp: dense rows, stacks. */
    XS(24.dp),

    /** 32dp: chrome (client #1's top bar). */
    SM(32.dp),

    /** 40dp: sheets and headers (client #1's settings sheet). */
    MD(40.dp),

    /** 48dp: profile blocks. */
    LG(48.dp),

    /** 64dp: hero identity. */
    XL(64.dp),
    ;

    /** The initials type role scaled to the disc. */
    @Composable
    fun initialsStyle() =
        when (this) {
            XS, SM -> MaterialTheme.typography.labelMedium
            MD, LG -> MaterialTheme.typography.titleSmall
            XL -> MaterialTheme.typography.titleLarge
        }
}

/**
 * Derive avatar initials: first letter of the first + last whitespace-separated
 * tokens, uppercased ("Ada Lovelace" → "PM"; "Nockerl" → "N"); a blank name
 * falls back to the "?" placeholder glyph.
 */
internal fun nockerlAvatarInitials(name: String): String {
    val tokens = name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
    return when {
        tokens.isEmpty() -> "?"
        tokens.size == 1 -> tokens.first().take(1).uppercase()
        else -> (tokens.first().take(1) + tokens.last().take(1)).uppercase()
    }
}

/** Presence-ring thickness: the notch that anchors the dot into the host surface. */
private val PRESENCE_RING_WIDTH = 2.dp
