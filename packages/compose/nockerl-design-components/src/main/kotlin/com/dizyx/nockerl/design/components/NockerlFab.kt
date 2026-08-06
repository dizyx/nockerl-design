package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.nockerlLitSurface
import com.dizyx.nockerl.design.tokens.nockerlShadow

/**
 * The **floating action button**, the one floating affordance (fab.mdx), on the
 * RATIFIED solid treatment: a SOLID `accentPrimary` circle (never a
 * gradient, never the tonal scroll-chip drift) with a contrast-picked glyph, the
 * level-3 floating-chrome drop + the shared `surfaceHighlight` catch-light.
 *
 * A round FAB is icon-only, so its accessible name is REQUIRED. The extended
 * form ([NockerlExtendedFab]) carries a visible label on the control radius
 * (extended FABs are not circles: law §4 keeps true circles rare).
 *
 * @param icon the glyph.
 * @param contentDescription the REQUIRED accessible name (icon-only control).
 * @param onClick invoked on tap (platform ripple, law §9).
 * @param modifier outer modifier (position it from the host scaffold).
 * @param size the ratified ramp (defaults to [NockerlFabSize.STANDARD]).
 * @param enabled when `false`, dimmed, non-interactive, and grounded (no lift).
 */
@Composable
fun NockerlFab(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: NockerlFabSize = NockerlFabSize.STANDARD,
    enabled: Boolean = true,
) {
    require(contentDescription.isNotBlank()) {
        "NockerlFab requires a non-empty accessible name: an icon-only control is unnamed otherwise (design-laws §13)."
    }
    val colors = LocalNockerlColors.current
    val fill =
        if (enabled) colors.accentPrimary else colors.accentPrimary.copy(alpha = DISABLED_ALPHA)
    val glyph =
        if (enabled) {
            pickOnAccent(colors.accentPrimary)
        } else {
            pickOnAccent(colors.accentPrimary).copy(alpha = DISABLED_ALPHA)
        }
    // Disabled FABs stay visible but GROUNDED: the lift disappears (fab.mdx).
    val lifted =
        if (enabled) {
            modifier.nockerlShadow(elevation = NockerlElevation.Level3, shape = CircleShape)
        } else {
            modifier
        }

    Box(
        modifier =
            lifted
                .size(size.diameter)
                .clip(CircleShape)
                .background(fill)
                .nockerlLitSurface(shape = CircleShape)
                .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            modifier = Modifier.size(size.iconSize),
            tint = glyph,
        )
    }
}

/**
 * The **extended FAB**: icon + visible label on the control radius (12dp; an
 * extended FAB is not a circle). Same solid-accent + catch-light + level-3 lift.
 *
 * @param text the visible label (also the accessible name).
 * @param onClick invoked on tap.
 * @param modifier outer modifier.
 * @param icon optional leading glyph.
 * @param enabled when `false`, dimmed, non-interactive, grounded.
 */
@Composable
fun NockerlExtendedFab(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true,
) {
    val colors = LocalNockerlColors.current
    val fill =
        if (enabled) colors.accentPrimary else colors.accentPrimary.copy(alpha = DISABLED_ALPHA)
    val glyph =
        if (enabled) {
            pickOnAccent(colors.accentPrimary)
        } else {
            pickOnAccent(colors.accentPrimary).copy(alpha = DISABLED_ALPHA)
        }
    val lifted =
        if (enabled) {
            modifier.nockerlShadow(elevation = NockerlElevation.Level3, shape = NockerlControlShape)
        } else {
            modifier
        }

    Box(
        modifier =
            lifted
                .height(NockerlFabSize.STANDARD.diameter)
                .clip(NockerlControlShape)
                .background(fill)
                .nockerlLitSurface(shape = NockerlControlShape)
                .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null, // named by the visible label
                    modifier = Modifier.size(NockerlFabSize.STANDARD.iconSize),
                    tint = glyph,
                )
            }
            Text(
                text = text.uppercase(),
                style = NockerlControlTextStyle,
                color = glyph,
            )
        }
    }
}

/** One speed-dial action: its glyph, label, and tap handler. */
data class NockerlFabAction(
    /** The action glyph (accent-tinted inside the row pill). */
    val icon: ImageVector,
    /** The visible label (also the row's accessible name). */
    val label: String,
    /** Invoked on tap. */
    val onClick: () -> Unit,
)

/**
 * The **FAB speed-dial**: a trigger FAB that reveals a stack of actions.
 * Each action row is ONE cohesive affordance (rework of the disjointed
 * white-label + separate floating icon-button): a single lifted card pill
 * carrying the accent glyph AND the label on one surface, with ONE hit target,
 * ONE level-2 drop, and the shared catch-light, grounded in the elevation ladder
 * like every other lifted surface, not two loose pieces on the scrim.
 *
 * Justified right (the idiom): rows right-align above the trigger. The menu
 * is CONTROLLED: the host owns [expanded]; tapping the trigger toggles it.
 *
 * @param icon the trigger FAB glyph.
 * @param contentDescription the trigger's REQUIRED accessible name.
 * @param actions the speed-dial actions, top to bottom.
 * @param expanded whether the action rows are shown.
 * @param onExpandedChange invoked when the trigger toggles the menu.
 * @param modifier outer modifier (position from the host scaffold).
 */
@Composable
fun NockerlFabMenu(
    icon: ImageVector,
    contentDescription: String,
    actions: List<NockerlFabAction>,
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.End,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (expanded) {
            actions.forEach { action -> NockerlFabMenuRow(action) }
        }
        NockerlFab(
            icon = icon,
            contentDescription = contentDescription,
            onClick = { onExpandedChange(!expanded) },
        )
    }
}

/** ONE cohesive speed-dial row: accent glyph + label on a single lifted pill. */
@Composable
private fun NockerlFabMenuRow(action: NockerlFabAction) {
    val colors = LocalNockerlColors.current
    Row(
        modifier =
            Modifier
                // One lift, one surface, one catch-light: the whole row is the
                // affordance (not a label chip + a separate icon button).
                .nockerlShadow(elevation = NockerlElevation.Level2, shape = NockerlControlShape)
                .clip(NockerlControlShape)
                .background(colors.cardSurface1)
                .nockerlLitSurface(shape = NockerlControlShape)
                .clickable(onClick = action.onClick)
                .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = action.icon,
            contentDescription = null, // the visible label names the row
            modifier = Modifier.size(20.dp),
            tint = colors.accentPrimary,
        )
        Text(
            text = action.label,
            style = MaterialTheme.typography.labelLarge,
            color = colors.onCard,
        )
    }
}

/** The ratified FAB size ramp (fab.mdx: 40 / 56 / 72 with 20 / 24 / 32 glyphs). */
enum class NockerlFabSize(
    /** Circle diameter. */
    val diameter: Dp,
    /** Glyph size inside the circle. */
    val iconSize: Dp,
) {
    /** 40dp: compact hosts. */
    SMALL(40.dp, 20.dp),

    /** 56dp: the default. */
    STANDARD(56.dp, 24.dp),

    /** 72dp: hero surfaces. */
    LARGE(72.dp, 32.dp),
}
