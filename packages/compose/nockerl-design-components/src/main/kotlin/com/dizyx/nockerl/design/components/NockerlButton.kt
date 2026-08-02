package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlColors

/**
 * The one button vocabulary for the app: a token-driven **cyan fill ladder**
 * that retires the audit's "~9 button languages / 7+ radii" finding.
 *
 * Every variant shares the single control radius (the NockerlButtonRadius,
 * 12dp, via [NockerlControlShape]) and pulls every color from the semantic
 * [NockerlColors] palette: no hardcoded `Color(0x...)`, no raw dp radii, no
 * dependence on Material's `secondary`/tonal slots. Ratified in Nockerl Design
 * Review #1 (Dashboard project 96).
 *
 * The ladder is intentionally cyan-locked so hierarchy reads by *weight*, not by
 * hue: a solid cyan call-to-action, a soft tonal echo, a quiet outline, a
 * text-only whisper, plus one red branch for destructive intent.
 *
 * @property fill the resting background fill (transparent for outline/text styles).
 * @property content the label/icon color.
 * @property border the outline stroke color, or `null` for no border.
 */
enum class NockerlButtonVariant {
    /**
     * **Primary** is the filled cyan call-to-action. One per surface: "Sign in",
     * "Approve", "Create". Solid [NockerlColors.accentPrimary] with a readable
     * on-accent label.
     */
    PRIMARY,

    /**
     * **Secondary** is the soft *tonal* cyan echo: a low-alpha
     * [NockerlColors.accentPrimarySoft] fill plus a thin cyan hairline and cyan
     * label. The supporting action next to a Primary (e.g. "Allow all" beside
     * "Approve").
     */
    SECONDARY,

    /**
     * **Tertiary** is outlined cyan: transparent fill, a 1dp
     * [NockerlColors.accentPrimary] border, cyan label. A low-emphasis action
     * that still carries the accent ("Archive all", "Edit").
     */
    TERTIARY,

    /**
     * **Ghost** is text only: no fill, no border, neutral
     * [NockerlColors.onCanvas] label. The quietest action ("Cancel",
     * "Dismiss") reads as a link, never competes with a filled button.
     */
    GHOST,

    /**
     * **Destructive** is the red branch: transparent fill, a
     * [NockerlColors.statusError] border and label. Reserved for irreversible /
     * dangerous actions ("Delete", "Reject"). Kept outlined (not filled) so a
     * destructive action is deliberate, not the loudest thing on screen.
     */
    DESTRUCTIVE,
}

/** Resolve a [NockerlButtonVariant] to its concrete fill/content/border colors. */
private data class VariantColors(
    val fill: Color,
    val content: Color,
    val border: Color?,
)

@Composable
private fun NockerlButtonVariant.resolve(colors: NockerlColors): VariantColors =
    when (this) {
        NockerlButtonVariant.PRIMARY ->
            VariantColors(
                fill = colors.accentPrimary,
                content = pickOnAccent(colors.accentPrimary),
                border = null,
            )

        NockerlButtonVariant.SECONDARY ->
            VariantColors(
                fill = colors.accentPrimarySoft,
                content = colors.accentPrimary,
                border = colors.accentPrimary,
            )

        NockerlButtonVariant.TERTIARY ->
            VariantColors(
                fill = Color.Transparent,
                content = colors.accentPrimary,
                border = colors.accentPrimary,
            )

        NockerlButtonVariant.GHOST ->
            VariantColors(
                fill = Color.Transparent,
                content = colors.onCanvas,
                border = null,
            )

        NockerlButtonVariant.DESTRUCTIVE ->
            VariantColors(
                fill = Color.Transparent,
                content = colors.statusError,
                border = colors.statusError,
            )
    }

/**
 * The shared size ramp (ratified r2, B1): visual heights 32/40/48 with per-size
 * type + padding: web `sm/md/lg` parity. The TOUCH target never shrinks below
 * the platform floor: the button composes Compose Material's
 * `minimumInteractiveComponentSize` (48dp on Android, law §14) around the
 * visual box, so a `SM` button LOOKS 32dp but stays fully tappable.
 */
enum class NockerlButtonSize(
    /** Visual min height of the control box. */
    val height: Dp,
    /** Per-size content padding (web sm/md/lg parity). */
    val padding: PaddingValues,
) {
    /** 32dp: dense toolbars, inline rows. */
    SM(32.dp, PaddingValues(horizontal = 12.dp, vertical = 4.dp)),

    /** 40dp: the default control height. */
    MD(40.dp, PaddingValues(horizontal = 16.dp, vertical = 8.dp)),

    /** 48dp: hero / block actions. */
    LG(48.dp, PaddingValues(horizontal = 20.dp, vertical = 12.dp)),
}

/**
 * The unified Nockerl button. Renders one of the five [NockerlButtonVariant]
 * styles at the shared control radius, with the content laid out in a centered
 * [Row] (so callers can pass an icon + label).
 *
 * Use this for *every* tappable label affordance in the app. Reserve the pill
 * (the NockerlPillShape) for chips and the input bar; reserve a true circle for
 * the send/stop slot ([NockerlIconButton]'s send style).
 *
 * @param text the button label.
 * @param onClick invoked on tap.
 * @param modifier outer modifier (size, weight, alignment). Height is intrinsic
 *   to the content padding; pass `Modifier.fillMaxWidth()` for a block button.
 * @param variant the fill-ladder style (defaults to [NockerlButtonVariant.PRIMARY]).
 * @param size the shared sm/md/lg ramp (defaults to [NockerlButtonSize.MD]);
 *   the touch target never drops below the platform floor.
 * @param enabled when `false`, the button is dimmed and non-interactive.
 * @param contentPadding inner padding around the content row.
 * @param maxLines maximum label lines before the text ellipsizes (defaults to
 *   [Int.MAX_VALUE], no cap). Pass `1` for a single-line button whose label
 *   must not wrap (e.g. a width-capped selector).
 * @param leadingContent optional content (typically an `Icon`) placed before the
 *   label; receives the variant's content color via `LocalContentColor`.
 */
@Composable
fun NockerlButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: NockerlButtonVariant = NockerlButtonVariant.PRIMARY,
    size: NockerlButtonSize = NockerlButtonSize.MD,
    enabled: Boolean = true,
    contentPadding: PaddingValues = size.padding,
    maxLines: Int = Int.MAX_VALUE,
    leadingContent: (@Composable () -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current
    val v = variant.resolve(colors)
    val content = if (enabled) v.content else v.content.copy(alpha = DISABLED_ALPHA)
    val fill = if (enabled) v.fill else v.fill.copy(alpha = v.fill.alpha * DISABLED_ALPHA)
    val border =
        v.border?.let { if (enabled) it else it.copy(alpha = DISABLED_ALPHA) }

    NockerlControlContainer(
        onClick = onClick,
        enabled = enabled,
        fill = fill,
        border = border,
        minWidth = size.height,
        minHeight = size.height,
        // Ratified B1: the solid primary wears the top catch-light (enabled only,
        // a dimmed disabled fill stays flat).
        litHighlight = variant == NockerlButtonVariant.PRIMARY && enabled,
        // Touch floor: the visual box may be 32dp (SM); the interactive area keeps
        // the platform minimum (48dp on Android, law §14).
        modifier = modifier.minimumInteractiveComponentSize(),
    ) {
        CompositionLocalProvider(LocalContentColor provides content) {
            Row(
                modifier = Modifier.padding(contentPadding),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                leadingContent?.invoke()
                Text(
                    text = text,
                    style =
                        if (size == NockerlButtonSize.SM) {
                            NockerlControlTextStyle.copy(fontSize = 12.sp)
                        } else {
                            NockerlControlTextStyle
                        },
                    color = content,
                    maxLines = maxLines,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
