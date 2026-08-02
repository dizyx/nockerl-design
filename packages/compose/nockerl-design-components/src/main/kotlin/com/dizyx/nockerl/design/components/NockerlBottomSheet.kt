package com.dizyx.nockerl.design.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlColors
import com.dizyx.nockerl.design.tokens.NockerlMotionDuration
import com.dizyx.nockerl.design.tokens.NockerlMotionEasing
import com.dizyx.nockerl.design.tokens.NockerlShadowTintAlpha
import com.dizyx.nockerl.design.tokens.NockerlTheme

/**
 * The shared bottom-sheet shell: every pull-up sheet routes through this so
 * they all share one look, matching the ratified `.sheet` treatment: a gentle
 * vertical gradient on the sheet container (the alternate content plane
 * [NockerlColors.cardAlt] at the TOP falling to [NockerlColors.canvasAlt]
 * toward the BOTTOM, per Design Review #2's ratified `.sheetFix`, "one consistent
 * treatment for all"), a palette scrim, and a token-tinted drag handle. Because
 * the gradient lives on the shared shell, every sheet in a consuming app reads
 * identically instead of each tinting its own plane. Content composes inside
 * the sheet's [ColumnScope] exactly as with a raw [ModalBottomSheet].
 *
 * A consumer MAY still paint a stronger brush on its own inner scrolling column
 * ON TOP of this shared ground (client #1's cluster sheet does exactly that:
 * its ratified signature, Review #2); that is intentional layering, not a
 * special case in this shell.
 *
 * **Why it re-maps the M3 colorScheme for its content:** the app-wide
 * [NockerlTheme] maps `surface`/`onSurface` onto the *chrome* card plane
 * ([NockerlColors.cardSurface1] / [NockerlColors.onCard]), the canvas family.
 * Sheets instead want the dedicated alternate plane ([NockerlColors.cardAlt] /
 * [NockerlColors.onCardAlt]): a gentle lifted plane in each palette (off-white on
 * Light, a touch above the canvas on Dark). To keep every default-M3 child (text,
 * text fields, checkboxes, list rows) legible against that plane without
 * re-coloring each call-site, the
 * wrapper provides a child [MaterialTheme] whose surface family points at the
 * alternate plane while leaving the accent/error slots untouched.
 *
 * @param onDismissRequest invoked when the sheet is dismissed (scrim tap, swipe).
 * @param modifier outer modifier forwarded to the [ModalBottomSheet].
 * @param sheetState the sheet's [SheetState]; defaults to a non-partial sheet.
 * @param contentWindowInsets insets applied to the sheet content; defaults to
 *   M3's standard sheet insets. Pass `WindowInsets(0)` for full-bleed content.
 * @param content the sheet body, laid out in a [ColumnScope].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NockerlBottomSheet(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    sheetState: SheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
    contentWindowInsets: @Composable () -> WindowInsets = { BottomSheetDefaults.windowInsets },
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = LocalNockerlColors.current
    val base = MaterialTheme.colorScheme
    // Gentle vertical gradient on the sheet body, Review #2's ratified
    // `.sheetFix` (`linear-gradient(180deg, #2C313A, #111317)`), expressed
    // purely through semantic tokens: the sheet base [cardAlt] at the top
    // falling to the deeper [canvasAlt] at the bottom (both stops match the
    // ratified hexes exactly on Dark, no derived value). On Light the same
    // token pair gives a softer, appropriate off-white fall (cardAlt #FAFBFC →
    // canvasAlt #E9EBEE).
    //
    // It is painted on a [Column] wrapping the *entire* sheet body, the drag
    // handle AND the content (below), NOT on the [ModalBottomSheet] `modifier`.
    // The M3 `modifier` lands on the sheet's inner Surface *before* its draggable
    // offset / fillMaxWidth, so a `background` there bleeds over the scrim and the
    // whole window and defeats the partial-height anchor: every sheet would
    // render full-screen and opaque. Backing the body column keeps the M3 Surface
    // content-sized and correctly offset: the translucent scrim shows the dimmed
    // screen behind and partial/half sheets stay partial. `containerColor` is
    // transparent so this gradient is the sole visible ground.
    //
    // The grip lives INSIDE this column (M3 `dragHandle` is null) so the gradient
    // backs the handle region too. Earlier the grip was M3's `dragHandle`, which
    // renders in the sheet's own column slot ABOVE this gradient column; with a
    // transparent container that handle/top strip had no background and the scrim
    // showed through it, so the sheet read as "cut off" at the top. Hosting the
    // grip on the same gradient ground makes the whole body one solid panel. The
    // column is [fillMaxWidth] so the panel spans edge-to-edge even when content
    // is narrow, and clips to the sheet's [BottomSheetDefaults] expanded shape so
    // the rounded top reads. It carries no height constraint, so callers that ask
    // for a tall sheet (e.g. `fillMaxHeight(0.92f)` on their first child) still
    // get it and partial sheets stay partial.
    val sheetShape = BottomSheetDefaults.ExpandedShape
    val sheetGradient: Brush =
        Brush.verticalGradient(colors = listOf(colors.cardAlt, colors.canvasAlt))
    // Re-point the surface family at the alternate (sheet) plane so default-M3
    // children get correct contrast; accents, error, and primary stay as-is.
    val sheetScheme =
        base.copy(
            surface = colors.cardAlt,
            onSurface = colors.onCardAlt,
            surfaceVariant = colors.cardAlt2,
            onSurfaceVariant = colors.onCardAltMuted,
            surfaceContainerLowest = colors.cardAlt,
            surfaceContainerLow = colors.cardAlt,
            surfaceContainer = colors.cardAlt2,
            surfaceContainerHigh = colors.cardAlt2,
            surfaceContainerHighest = colors.cardAlt2,
            outline = colors.altHairline,
            outlineVariant = colors.altHairline,
        )
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        // Forward the caller [modifier] untouched. The gradient is NOT applied
        // here (see the note above): a background on the M3 `modifier` paints
        // over the scrim/whole window and breaks partial-height sizing.
        modifier = modifier,
        sheetState = sheetState,
        shape = sheetShape,
        // Transparent so the gradient [Column] below is the only visible ground.
        containerColor = Color.Transparent,
        contentColor = colors.onCardAlt,
        scrimColor = colors.scrim,
        contentWindowInsets = contentWindowInsets,
        // No M3 drag handle: the grip is hosted inside the gradient column below
        // so the gradient backs it too and no transparent strip remains on top.
        dragHandle = null,
    ) {
        // `this` is the M3 sheet's ColumnScope, but the body is laid out inside
        // the gradient [Column] below. The caller's `weight`/`align` resolve
        // against that column (it is the receiver of `content`).
        MaterialTheme(
            colorScheme = sheetScheme,
            typography = MaterialTheme.typography,
            shapes = MaterialTheme.shapes,
        ) {
            // Back the WHOLE sheet body (grip + content) with the token
            // gradient, clipped to the sheet shape. Full width so the panel spans
            // edge-to-edge; no height constraint so the M3 Surface stays
            // content-sized (scrim + partial/tall height survive). The grip sits
            // first so the gradient runs from the rounded top edge down, with the
            // handle on the same plane as the content: one solid panel.
            Column(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .clip(sheetShape)
                        .background(brush = sheetGradient),
            ) {
                NockerlSheetGrip()
                content()
            }
        }
    }
}

/**
 * The sheet drag handle is the ratified `.sheet-grip`: a short rounded bar in the
 * muted on-plane token. Replaces M3's default pill so the handle stays on-palette.
 *
 * Hosted directly inside the sheet's gradient body column (not M3's `dragHandle`
 * slot), so it fills width and centers the bar itself rather than relying on M3
 * to center the handle.
 *
 * Public so the design gallery can showcase the exact same grip the sheets use
 * (single source of truth); regular sheet callers never invoke it directly.
 * [NockerlBottomSheet] hosts it.
 */
@Composable
fun NockerlSheetGrip() {
    val colors = LocalNockerlColors.current
    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(top = 10.dp, bottom = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier =
                Modifier
                    .size(width = 42.dp, height = 5.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(colors.onCardAltMuted.copy(alpha = 0.4f)),
        )
    }
}

/**
 * A **sheet header**: the title/subheading zone that stays pinned while
 * a sheet's list/settings scroll BENEATH it. Without a separation cue the header
 * text reads as "cut off" when content slides under; this provides it:
 *
 * - a PERSISTENT hairline (the sheet plane's neutral `altHairline`, dark-gray
 *   per theme, NEVER the warm accent), so the header is always demarcated; and
 * - an on-scroll ELEVATION cue: when [scrolledUnder] is `true`, a soft neutral
 *   shadow fades DOWN from the hairline onto the passing content (the shadow
 *   tint, interpolated in, per law §7). The strip is reserved either way, so the
 *   cue never shifts layout.
 *
 * The praised sheet gradient is untouched: the header is transparent over it and
 * only adds the hairline + shadow. Place it as the FIRST child of a
 * [NockerlBottomSheet] (below the grip); wire [scrolledUnder] from the content's
 * scroll state (e.g. `listState.canScrollBackward`).
 *
 * @param title the header title.
 * @param modifier outer modifier.
 * @param subheading optional supporting line under the title.
 * @param leadingIcon optional decorative glyph shown top-left, centered on the
 *   title line (e.g. a settings cog beside "Settings"); rides the neutral on-plane
 *   ink, never a status disc, never cyan. The divider is unchanged.
 * @param onBack optional NESTED-SHEET back affordance (WS2): the header leads
 *   with a chevron icon button; view swapping stays host-owned (mirror of the
 *   react onBack).
 * @param backContentDescription the back affordance's a11y name.
 * @param scrolledUnder `true` when content is scrolled beneath the header,
 *   strengthens the separation with the elevation cue.
 */
@Composable
fun NockerlSheetHeader(
    title: String,
    modifier: Modifier = Modifier,
    subheading: String? = null,
    leadingIcon: ImageVector? = null,
    onBack: (() -> Unit)? = null,
    backContentDescription: String = "Back",
    scrolledUnder: Boolean = false,
) {
    val colors = LocalNockerlColors.current
    // The cue interpolates in/out (law §7), a settled value in a static capture.
    val cue by animateFloatAsState(
        targetValue = if (scrolledUnder) 1f else 0f,
        animationSpec = tween(NockerlMotionDuration.fastMs, easing = NockerlMotionEasing.standard),
        label = "nockerlSheetHeaderCue",
    )

    Column(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (onBack != null) {
                    // Nested-sheet back: leads the header (WS2 mirror).
                    NockerlIconButton(
                        icon = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        contentDescription = backContentDescription,
                        onClick = onBack,
                        tint = colors.onCardAlt,
                        size = 28.dp,
                        iconSize = 18.dp,
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                }
                if (leadingIcon != null) {
                    // Optional leading glyph, centered on the TITLE line. Neutral
                    // on-plane ink, NOT a status disc, NOT cyan; decorative (no a11y name,
                    // the title carries the accessible name).
                    Icon(
                        imageVector = leadingIcon,
                        contentDescription = null,
                        tint = colors.onCardAlt,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                }
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.onCardAlt,
                )
            }
            if (subheading != null) {
                Text(
                    text = subheading,
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.onCardAltMuted,
                    // Indent under the title text (past the icon) when one is present.
                    modifier = if (leadingIcon != null) Modifier.padding(start = 30.dp) else Modifier,
                )
            }
        }

        // The separation strip: a persistent hairline at its top edge, then a
        // soft shadow that fades down into the content when scrolledUnder.
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(HEADER_SHADOW_STRIP)
                    .drawBehind {
                        val hairlinePx = HAIRLINE_PX * density
                        // Neutral dark-gray hairline (NOT orange), always present.
                        drawRect(
                            color = colors.altHairline,
                            topLeft = Offset.Zero,
                            size = Size(size.width, hairlinePx),
                        )
                        // The on-scroll elevation cue: shadow tint fading downward.
                        if (cue > 0f) {
                            drawRect(
                                brush =
                                    Brush.verticalGradient(
                                        colors =
                                            listOf(
                                                colors.shadowTint.copy(
                                                    alpha = colors.shadowTint.alpha * HEADER_SHADOW_ALPHA * cue,
                                                ),
                                                Color.Transparent,
                                            ),
                                        startY = hairlinePx,
                                        endY = size.height,
                                    ),
                                topLeft = Offset(0f, hairlinePx),
                                size = Size(size.width, size.height - hairlinePx),
                            )
                        }
                    },
        )
    }
}

/**
 * A **sheet footer** (WS2) is the PINNED action bar that never scrolls away:
 * place it as the LAST child of a sheet whose scrollable middle carries
 * `weight(1f)`, and it stays put while content scrolls BENEATH. The separation
 * strip is the header cue INVERTED: a persistent hairline on the footer's top
 * edge with a soft shadow fading UPWARD onto the passing content while
 * [scrolledUnder] is `true` (wire `listState.canScrollForward`).
 *
 * The action row is end-aligned at the ratified CTA rhythm. Pair it with the
 * approval grammar (outline confirm / ghost cancel).
 *
 * @param modifier outer modifier.
 * @param scrolledUnder `true` while content can still scroll beneath the footer.
 * @param content the actions, a [RowScope] (end-aligned, 8dp apart).
 */
@Composable
fun NockerlSheetFooter(
    modifier: Modifier = Modifier,
    scrolledUnder: Boolean = false,
    content: @Composable RowScope.() -> Unit,
) {
    val colors = LocalNockerlColors.current
    val cue by animateFloatAsState(
        targetValue = if (scrolledUnder) 1f else 0f,
        animationSpec = tween(NockerlMotionDuration.fastMs, easing = NockerlMotionEasing.standard),
        label = "nockerlSheetFooterCue",
    )

    Column(modifier = modifier.fillMaxWidth()) {
        // The INVERTED separation strip: hairline on the BOTTOM edge of the
        // strip (the footer's top), shadow fading UP onto the passing content.
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(HEADER_SHADOW_STRIP)
                    .drawBehind {
                        val hairlinePx = HAIRLINE_PX * density
                        drawRect(
                            color = colors.altHairline,
                            topLeft = Offset(0f, size.height - hairlinePx),
                            size = Size(size.width, hairlinePx),
                        )
                        if (cue > 0f) {
                            drawRect(
                                brush =
                                    Brush.verticalGradient(
                                        colors =
                                            listOf(
                                                Color.Transparent,
                                                colors.shadowTint.copy(
                                                    alpha = colors.shadowTint.alpha * HEADER_SHADOW_ALPHA * cue,
                                                ),
                                            ),
                                        startY = 0f,
                                        endY = size.height - hairlinePx,
                                    ),
                                topLeft = Offset.Zero,
                                size = Size(size.width, size.height - hairlinePx),
                            )
                        }
                    },
        )
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
            verticalAlignment = Alignment.CenterVertically,
            content = content,
        )
    }
}

/** Reserved separation strip height (hairline + the soft on-scroll shadow). */
private val HEADER_SHADOW_STRIP = 6.dp

/** Hairline thickness in dp-units (scaled by density in the draw scope). */
private const val HAIRLINE_PX = 1f

/**
 * Peak alpha of the on-scroll shadow cue (of the shadow tint), the level-1 rung of
 * the generated [NockerlShadowTintAlpha] lift ladder (0.28). `val` (not `const`)
 * because it reads the token object.
 */
private val HEADER_SHADOW_ALPHA = NockerlShadowTintAlpha.level1
