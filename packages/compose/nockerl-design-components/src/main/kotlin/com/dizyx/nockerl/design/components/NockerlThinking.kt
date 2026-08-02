package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlPanelShape
import com.dizyx.nockerl.design.tokens.NockerlSurface
import com.dizyx.nockerl.design.tokens.nockerlLitSurface
import com.dizyx.nockerl.design.tokens.nockerlShadow

/**
 * The **thinking / reasoning** card is the agent's chain-of-thought surface (R5-6
 * ), brought up as native design-system truth. It fixes two things the app
 * had wrong: the brain glyph sat BARE, and the panel was a double box (an
 * accordion nested inside a parent).
 *
 * - **Brain in a FILLED WARM TILE, never bare** (law §6: color rides a filled
 *   tile). The glyph is knocked out to the canvas ink over an `accentWarm`
 *   control-radius tile with a catch-light + slight lift, the same family-tile
 *   idiom as the tool-call card icon.
 * - **ONE clean card, de-nested** (like the tool-call cards): a single warm-hued
 *   panel instead of the old box-in-a-box, built from a faint `accentWarm`
 *   surface tint + a defined warm hairline (the special-notice §10 hue).
 *
 * Collapsible in the app; here [expanded] is controlled by the caller (so the
 * reasoning shows/hides deterministically and the golden can capture both).
 *
 * @param label the header label (e.g. `"Thinking"` while streaming, `"Reasoning"`).
 * @param modifier outer modifier (typically `fillMaxWidth()`).
 * @param reasoning the chain-of-thought text; shown only when [expanded].
 * @param expanded whether the reasoning body is visible + the chevron points up.
 * @param onToggle optional expand/collapse tap; omit to render a static header.
 * @param toggleDescription the chevron's a11y name by expanded state (English
 *   defaults; 1.0 strings stance).
 */
@Composable
fun NockerlThinking(
    label: String = "Thinking",
    modifier: Modifier = Modifier,
    reasoning: String? = null,
    expanded: Boolean = false,
    onToggle: (() -> Unit)? = null,
    toggleDescription: (expanded: Boolean) -> String = { if (it) "Collapse" else "Expand" },
) {
    val colors = LocalNockerlColors.current
    val warm = colors.accentWarm

    NockerlSurface(
        modifier = modifier.fillMaxWidth(),
        shape = NockerlPanelShape,
        // ONE warm card: a faint warm surface tint + (below) a defined warm hairline.
        color = lerp(colors.cardSurface1, warm, THINKING_SURFACE_MIX),
        elevation = NockerlElevation.Level1,
        border = lerp(colors.cardHairline, warm, THINKING_BORDER_MIX),
    ) {
        Column(
            modifier =
                (if (onToggle != null) Modifier.clickable(onClick = onToggle) else Modifier)
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ThinkingBrainTile(warm = warm)
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onCard,
                    modifier = Modifier.weight(1f),
                )
                if (onToggle != null) {
                    Icon(
                        imageVector = Icons.Filled.KeyboardArrowDown,
                        contentDescription = toggleDescription(expanded),
                        tint = colors.onCardMuted,
                        modifier = Modifier.size(18.dp).rotate(if (expanded) 180f else 0f),
                    )
                }
            }
            if (expanded && reasoning != null) {
                Text(
                    text = reasoning,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onCard,
                )
            }
        }
    }
}

/**
 * The **filled warm brain tile** is an `accentWarm` control-radius square (slight
 * lift + top catch-light) with the brain glyph knocked out to the canvas ink. The
 * tool-call family-tile idiom (§6: color in a filled tile, never bare).
 */
@Composable
private fun ThinkingBrainTile(warm: Color) {
    val colors = LocalNockerlColors.current
    Box(
        contentAlignment = Alignment.Center,
        modifier =
            Modifier
                .size(28.dp)
                .nockerlShadow(elevation = NockerlElevation.Level1, shape = NockerlControlShape)
                .clip(NockerlControlShape)
                .background(warm)
                .nockerlLitSurface(shape = NockerlControlShape),
    ) {
        Icon(
            imageVector = NockerlBrainIcon,
            contentDescription = null,
            tint = colors.canvas,
            modifier = Modifier.size(18.dp),
        )
    }
}

/** Faint warm tint lerped into the single card's surface (§10: whispered). */
private const val THINKING_SURFACE_MIX = 0.06f

/** Hairline→warm mix: the defined warm edge of the single card. */
private const val THINKING_BORDER_MIX = 0.30f

/**
 * The **brain glyph** as a self-contained [ImageVector] (the standard Material
 * `psychology` path). `Icons.Filled.Psychology` (what the app uses) lives in the
 * BANNED icons-extended artifact, so it's built here to keep the module on
 * icons-core; `Icon` tints the black fill.
 */
private val NockerlBrainIcon: ImageVector =
    ImageVector
        .Builder(
            name = "NockerlBrain",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f,
        ).addPath(
            pathData =
                PathParser()
                    .parsePathString(
                        "M13 8.57c-.79 0-1.43.64-1.43 1.43s.64 1.43 1.43 1.43 1.43-.64 1.43" +
                            "-1.43-.64-1.43-1.43-1.43zM13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2c" +
                            "-.25.33-.01.8.4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4" +
                            "-6.32 0-3.87-3.13-7-7-7zm3 7c0 .13-.01.26-.02.39l.83.66c.08.06.1.1" +
                            "6.05.25l-.8 1.39c-.05.09-.16.12-.24.09l-.99-.4c-.21.16-.43.29-.67." +
                            "39L14 13.83c-.01.1-.1.17-.2.17h-1.6c-.1 0-.18-.07-.2-.17l-.15-1.06" +
                            "c-.25-.1-.47-.23-.68-.39l-.99.4c-.09.03-.2 0-.24-.09l-.8-1.39c-.05" +
                            "-.08-.03-.19.05-.25l.84-.66c-.01-.13-.02-.26-.02-.39s.02-.27.04-.3" +
                            "9l-.83-.66c-.08-.06-.1-.16-.05-.25l.8-1.39c.05-.09.16-.12.24-.09l." +
                            "99.4c.21-.16.43-.29.67-.39L11.8 6.17c.02-.1.1-.17.2-.17h1.6c.1 0 ." +
                            "18.07.2.17l.15 1.06c.24.1.47.23.68.39l.99-.4c.09-.03.2 0 .24.09l.8" +
                            " 1.39c.05.08.03.19-.05.25l-.83.66c.01.12.02.25.02.38z",
                    ).toNodes(),
            fill = SolidColor(Color.Black),
        ).build()
