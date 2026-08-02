package com.dizyx.nockerl.design.tokens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Reusable surface/card building blocks and shadow/gradient helpers for the
 * redesign. These are the primitives every re-skinned component will compose on
 * top of, so the whole app shares one card "feel": token-driven surface color,
 * a SUBTLE color-tinted drop shadow (depth from shadow, never glow), chamfered
 * or rounded geometry, and an optional gradient brush.
 *
 * @see NockerlColors
 * @see ChamferedCornerShape
 */

/** Subtle elevation presets. Deliberately minor: "quality over size". */
object NockerlElevation {
    /** Resting hairline lift (tier 1: chips, inline rows). */
    val Level1: Dp = 2.dp

    /** Standard card lift (tier 2: most cards). */
    val Level2: Dp = 5.dp

    /** Raised card lift (tier 3: agent cards, input bar, popovers). */
    val Level3: Dp = 9.dp

    /**
     * The sheet rung (tier 4: sheets, dialogs, floating toasts). Completes the
     * web's L1 to L4 ladder on Compose; value = the `elevation.sheet` token (14).
     */
    val Level4: Dp = 14.dp
}

/**
 * The **signature floating-over-content border width** (design-laws §2). Any fixed
 * element that floats over a scrollable / other-content area carries the signature
 * THICK cyan (`accentPrimary`) border on its floating PARENT container, training
 * the eye that *a thick cyan border = a layer hovering above content*. This is the
 * ratified "thick" weight, matched to the native Kotlin chat-input pill
 * (`ChatInputBar`), a step up from the 1dp hairline. The border rides the floating
 * container ONLY. Controls inside keep their own treatment.
 *
 * v1.17.0: now an ALIAS onto the generated [NockerlBorder.widthFloating] token rather than a
 * hand-authored 1.5.dp (the drift the `border.width` token set exists to prevent). Kept as a
 * named symbol because consumers already call it, and because the NAME carries the intent:
 * it says "this element floats", which `widthFloating` alone at a call site does not.
 */
val NockerlFloatingBorderWidth: Dp = NockerlBorder.widthFloating

/**
 * Map a [NockerlElevation] blur rung to its lift-shadow OPACITY: the generated
 * [NockerlShadowTintAlpha] ladder (0.28/0.30/0.33/0.35), paired 1:1 with the blur
 * levels. Any off-ladder [Dp] falls back to the [NockerlShadowTintAlpha.level2]
 * mid-rung (the card default). This is the Compose analogue of the web
 * `--elevation-shadow-tint-alpha-*` mix and Swift `NockerlCardElevation.tintAlpha`.
 */
fun shadowTintAlphaFor(elevation: Dp): Float =
    when (elevation) {
        NockerlElevation.Level1 -> NockerlShadowTintAlpha.level1
        NockerlElevation.Level2 -> NockerlShadowTintAlpha.level2
        NockerlElevation.Level3 -> NockerlShadowTintAlpha.level3
        NockerlElevation.Level4 -> NockerlShadowTintAlpha.sheet
        else -> NockerlShadowTintAlpha.level2
    }

/**
 * Apply a subtle, palette-tinted drop shadow clipped to [shape].
 *
 * Wraps [Modifier.shadow] but routes both the ambient and spot shadow colors
 * through the palette's [NockerlColors.shadowTint] (near-black on Dark, a cool
 * slate-blue on Light) so the depth reads as expertly-lit rather than a flat
 * black drop. The tint is applied at the rung's lift OPACITY, the generated
 * [NockerlShadowTintAlpha] ladder (via [shadowTintAlphaFor]), so the shadow
 * deepens per rung exactly like the web `color-mix` scale and the Swift
 * `NockerlCardElevation.tintAlpha`. `clip = false` keeps the shadow soft outside
 * the bounds; callers clip their own content separately.
 *
 * @param elevation shadow elevation; prefer a [NockerlElevation] preset.
 * @param shape the silhouette the shadow is cast from.
 * @param tint shadow color (defaults to the active palette's shadow tint); its
 *   own alpha is multiplied by [tintAlpha].
 * @param tintAlpha the lift-shadow opacity (defaults to the [NockerlShadowTintAlpha]
 *   rung for [elevation]). Pass an explicit value for bespoke non-ladder shadows
 *   (e.g. the alert coin's 40% mix) to keep them off the ladder.
 */
@Composable
fun Modifier.nockerlShadow(
    elevation: Dp = NockerlElevation.Level2,
    shape: Shape = NockerlCardShape,
    tint: Color = LocalNockerlColors.current.shadowTint,
    tintAlpha: Float = shadowTintAlphaFor(elevation),
): Modifier {
    val tinted = tint.copy(alpha = tint.alpha * tintAlpha)
    return this.shadow(
        elevation = elevation,
        shape = shape,
        clip = false,
        ambientColor = tinted,
        spotColor = tinted,
    )
}

/**
 * Map a surface [NockerlElevation] rung to its HARD-OFFSET downward y-offset: the generated
 * [Elevation] ladder (2.5 / 5 / 9 / 14 dp), the v1.17.0 model where the `elevation.*` token
 * IS the offset (not a blur). Any off-ladder [Dp] falls back to the [Elevation.level2] card
 * default. The companion of [shadowTintAlphaFor], which supplies the matching rung opacity.
 */
private fun offsetFor(elevation: Dp): Dp =
    when (elevation) {
        NockerlElevation.Level1 -> Elevation.level1
        NockerlElevation.Level2 -> Elevation.level2
        NockerlElevation.Level3 -> Elevation.level3
        NockerlElevation.Level4 -> Elevation.sheet
        else -> Elevation.level2
    }

/**
 * Apply the **HARD-OFFSET** lifted-surface shadow (v1.17.0, ratified), a crisp drop
 * cast straight DOWN: blur 0 ([Elevation.blur]), x 0, y = the rung's [offsetFor] y-offset,
 * tinted at the rung's [shadowTintAlphaFor] opacity. Nothing spills sideways or above the top
 * edge, so the lift agrees with the recessed well's inner-top-shade (ONE top-down source).
 *
 * Compose's [Modifier.shadow] always Gaussian-blurs and cannot express a 0-blur box-shadow, so
 * the faithful nearest equivalent is to STAMP the [shape]'s own outline, translated straight
 * down by the offset token and filled with the palette [shadowTint] at the rung alpha, a solid
 * (un-blurred) silhouette peeking out the bottom edge, i.e. the exact hard edge that
 * [Elevation.blur] = 0.dp encodes. Drawn BEHIND content and NOT clipped, so it reads outside
 * the surface bounds like a real drop.
 *
 * This is the CARD / SURFACE recipe's shadow; the softer [nockerlShadow] stays for bespoke
 * off-ladder shadows (FABs, the input pill, popovers, etc.).
 */
@Composable
fun Modifier.nockerlHardShadow(
    elevation: Dp = NockerlElevation.Level2,
    shape: Shape = NockerlCardShape,
    tint: Color = LocalNockerlColors.current.shadowTint,
    tintAlpha: Float = shadowTintAlphaFor(elevation),
): Modifier {
    val tinted = tint.copy(alpha = tint.alpha * tintAlpha)
    val offsetPx = with(LocalDensity.current) { offsetFor(elevation).toPx() }
    return this.drawBehind {
        // blur is a constant 0 (Elevation.blur) → a solid outline IS the crisp hard edge.
        val outline = shape.createOutline(size, layoutDirection, this)
        translate(top = offsetPx) {
            drawOutline(outline = outline, color = tinted)
        }
    }
}

/**
 * Default thickness of the [nockerlLitSurface] top-edge highlight: a single
 * hairline, the "~1px" sheen from the review's lit-material study.
 */
private val LitHighlightThickness: Dp = 1.dp

/**
 * Draw the **"lit from above" top-edge highlight**, the companion to
 * [nockerlShadow]. Paints a faint ~1px light along the surface's TOP edge so
 * that, paired with the tinted drop shadow below, the surface reads as lit by a
 * single overhead source (the un-flat, un-generic version of depth: no glow, no
 * glass).
 *
 * The highlight color comes from the semantic [NockerlColors.surfaceHighlight]
 * token (never a raw call-site [Color]); the alpha is baked into the token. The
 * sheen is drawn as a thin vertical gradient that fades to transparent within
 * [thickness] of the top edge and is clipped to [shape] so it hugs rounded /
 * chamfered / bubble corners. Drawn ON TOP of content (after it) so it sits on
 * the very edge like a real catch-light.
 *
 * Most callers get this for free via [NockerlSurface] / [NockerlCard]; reach for
 * it directly only when applying the shared material to a bespoke surface that
 * doesn't go through those primitives.
 *
 * @param shape the silhouette the highlight is clipped to (match the surface's).
 * @param highlight the sheen color (defaults to the active palette token).
 * @param thickness how far the highlight fades from the top edge (~1px).
 */
@Composable
fun Modifier.nockerlLitSurface(
    shape: Shape = NockerlCardShape,
    highlight: Color = LocalNockerlColors.current.surfaceHighlight,
    thickness: Dp = LitHighlightThickness,
): Modifier {
    val thicknessPx = with(LocalDensity.current) { thickness.toPx() }.coerceAtLeast(1f)
    return this
        .clip(shape)
        .drawWithContent {
            drawContent()
            // A thin top→transparent vertical gradient = a single catch-light on
            // the top edge. Clamped so only the first `thicknessPx` is painted.
            drawRect(
                brush =
                    Brush.verticalGradient(
                        colors = listOf(highlight, Color.Transparent),
                        startY = 0f,
                        endY = thicknessPx,
                        tileMode = TileMode.Clamp,
                    ),
            )
        }
}

/**
 * Default depth of the [nockerlRecessedSurface] inner top shadow.
 */
private val RecessDepth: Dp = 2.dp

/**
 * The default strength of the recessed inner shadow: the canonical 45% mix of
 * the shadow tint (the callout well's ratified `inset 0 1px level1` treatment).
 */
private const val RECESS_TINT_ALPHA = 0.45f

/**
 * Draw the **recessed-well inner shadow**, the INVERSE of [nockerlLitSurface]:
 * a faint shadow falling from the surface's TOP edge inward, so the plane reads
 * SUNKEN into the page ("cards lift, fields sink", design-laws §2). This is the
 * callout / input-well material: no outer drop shadow, an inner top shade only.
 *
 * The shade color derives from [NockerlColors.shadowTint] at a fixed mix (law
 * §5: tints come from tokens at fixed alphas), painted as a thin top→transparent
 * gradient clipped to [shape].
 *
 * @param shape the silhouette the shade is clipped to.
 * @param tint the shadow hue (defaults to the palette shadow tint).
 * @param depth how far the inner shade falls from the top edge.
 */
@Composable
fun Modifier.nockerlRecessedSurface(
    shape: Shape = NockerlPanelShape,
    tint: Color = LocalNockerlColors.current.shadowTint,
    depth: Dp = RecessDepth,
): Modifier {
    val depthPx = with(LocalDensity.current) { depth.toPx() }.coerceAtLeast(1f)
    val shade = tint.copy(alpha = tint.alpha * RECESS_TINT_ALPHA)
    return this
        .clip(shape)
        .drawWithContent {
            drawContent()
            drawRect(
                brush =
                    Brush.verticalGradient(
                        colors = listOf(shade, Color.Transparent),
                        startY = 0f,
                        endY = depthPx,
                        tileMode = TileMode.Clamp,
                    ),
            )
        }
}

/**
 * The **shape-following recessed taper**: the recessed inner shadow that
 * WRAPS the full [shape] (arc / rounded corners), for CIRCULAR / pill inset wells
 * (the EmptyState icon, the status coin) where a top-only band looks abrupt. Aligns
 * to the web canon's inset-shadow: a top-weighted RADIAL shade that follows the top
 * arc and tapers down both sides + a bottom RADIAL catch-light tracing the bottom
 * arc ("fields sink"). Both are clipped to [shape]. Rectangular wells keep
 * [nockerlRecessedSurface] (a top band reads fine on a flat edge).
 *
 * @param shape the silhouette the taper is clipped to (Circle / pill).
 */
@Composable
fun Modifier.nockerlInsetTaper(
    shape: Shape,
    tint: Color = LocalNockerlColors.current.shadowTint,
    highlight: Color = LocalNockerlColors.current.surfaceHighlight,
): Modifier {
    val shade = tint.copy(alpha = tint.alpha * RECESS_TINT_ALPHA)
    return this
        .clip(shape)
        .drawWithContent {
            drawContent()
            // TOP inner shade: a top-weighted radial (center biased DOWN) so the
            // shade hugs the TOP arc and tapers toward the center-bottom; wraps the
            // full curve, no abrupt top band.
            drawRect(
                brush =
                    Brush.radialGradient(
                        colors = listOf(Color.Transparent, shade),
                        center = Offset(size.width / 2f, size.height * 0.78f),
                        radius = size.height * 0.88f,
                    ),
            )
            // BOTTOM inner catch-light: a radial (center biased UP) so the crisp
            // highlight traces the BOTTOM arc.
            drawRect(
                brush =
                    Brush.radialGradient(
                        colors = listOf(Color.Transparent, highlight),
                        center = Offset(size.width / 2f, size.height * 0.18f),
                        radius = size.height * 0.9f,
                    ),
            )
        }
}

/**
 * A vertical gradient brush between two card surfaces, the subtle top-lit sheen
 * the mockup applies to agent/team cards and accent buttons. Defaults to a faint
 * [NockerlColors.cardSurface2] → [NockerlColors.cardSurface1] fall.
 *
 * @param top the upper gradient stop.
 * @param bottom the lower gradient stop.
 */
@Composable
fun nockerlSurfaceGradient(
    top: Color = LocalNockerlColors.current.cardSurface2,
    bottom: Color = LocalNockerlColors.current.cardSurface1,
): Brush = Brush.verticalGradient(colors = listOf(top, bottom))

/**
 * EXPERIMENTAL card gradient (, opt-in): a subtle theme-following DIAGONAL
 * sheen for `nockerlSurface(gradient = nockerlCardGradient())`. Mirrors the react
 * `gradient` opt-in: 160° (top-trailing → bottom-leading) between two adjacent
 * NEUTRAL surface levels ([NockerlColors.cardSurface2] → [NockerlColors.cardSurface1]),
 * a ~1-step delta (a gentle sheen, NOT the loud featured cyan). NOT ratified canon;
 * default (no gradient) stays the flat surface, byte-identical.
 */
@Composable
fun nockerlCardGradient(
    top: Color = LocalNockerlColors.current.cardSurface2,
    bottom: Color = LocalNockerlColors.current.cardSurface1,
): Brush =
    Brush.linearGradient(
        colors = listOf(top, bottom),
        start = Offset(Float.POSITIVE_INFINITY, 0f),
        end = Offset(0f, Float.POSITIVE_INFINITY),
    )

/**
 * Foundational surface primitive: a [Box] with the token surface (solid color or
 * [gradient]), the shared "lit from above" material of a crisp HARD-OFFSET drop
 * shadow straight below ([nockerlHardShadow]) paired with a faint top-edge highlight
 * above ([nockerlLitSurface]), chamfered/rounded geometry, and an optional
 * hairline border.
 *
 * Most callers should use the higher-level [NockerlCard]; reach for
 * [NockerlSurface] when you need full control over the brush or are building a
 * non-card element (pill, glyph, sheet) that still wants the shared depth + geometry.
 *
 * @param modifier outer modifier (size, click, alignment).
 * @param shape silhouette for shadow, clip, and border.
 * @param color solid fill; ignored when [gradient] is non-null.
 * @param gradient optional gradient fill; overrides [color] when set.
 * @param elevation drop-shadow elevation (a [NockerlElevation] preset).
 * @param border optional hairline border color.
 * @param onClick when non-null, the surface is the ONE tappable-card affordance:
 *   a [clickable] composed INSIDE the clip so the platform press indication
 *   (ripple on Android; design-laws §9, feedback is platform-native) stays
 *   bounded by the silhouette. `null` (default) keeps the surface a pure visual.
 * @param content composable content, laid out inside the surface.
 */
@Composable
fun NockerlSurface(
    modifier: Modifier = Modifier,
    shape: Shape = NockerlCardShape,
    color: Color = LocalNockerlColors.current.cardSurface1,
    gradient: Brush? = null,
    elevation: Dp = NockerlElevation.Level2,
    border: Color? = null,
    borderWidth: Dp = 1.dp,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit,
) {
    val clipped = modifier.nockerlHardShadow(elevation = elevation, shape = shape).clip(shape)
    // The tappable-card affordance: clickable AFTER the clip so the ripple hugs
    // the card silhouette; the resting recipe is untouched when onClick is null.
    val base = if (onClick != null) clipped.clickable(onClick = onClick) else clipped
    val filled =
        if (gradient != null) {
            base.background(brush = gradient, shape = shape)
        } else {
            base.background(color = color, shape = shape)
        }
    val bordered =
        if (border != null) filled.border(borderWidth, border, shape) else filled
    // Fold in the "lit from above" top-edge highlight (the companion to the drop
    // shadow above) so every NockerlSurface/NockerlCard shares one material:
    // shadow below + a faint catch-light on the top edge. Token-driven, applied
    // app-wide here rather than per-call-site.
    val lit = bordered.nockerlLitSurface(shape = shape)
    Box(modifier = lit, content = content)
}

/**
 * The app-wide card composable, a [NockerlSurface] preconfigured for the
 * redesign's lifted card look: tier-1 card surface, the standard rounded (or
 * caller-supplied chamfered) shape, the shared lit-from-above material (a subtle
 * tinted shadow below + a faint top-edge highlight), and the card hairline. Used
 * for chat bubbles, tool/agent panels, sheet rows, list cards (anywhere the
 * mockup shows a lifted plane).
 *
 * Pass a [ChamferedCornerShape] for the deliberate angled-corner accents, or a
 * [gradient] for the agent/team-card sheen.
 *
 * @param modifier outer modifier (size, click, alignment).
 * @param shape card silhouette (defaults to [NockerlCardShape]).
 * @param color solid card fill; ignored when [gradient] is set.
 * @param gradient optional gradient fill for the top-lit sheen.
 * @param elevation drop-shadow elevation.
 * @param border hairline color (defaults to the palette card hairline; pass
 *   `null` for no border).
 * @param onClick when non-null, the card is tappable: the ONE tappable-card
 *   affordance (platform ripple bounded by the card shape); `null` = static.
 * @param content card content.
 */
@Composable
fun NockerlCard(
    modifier: Modifier = Modifier,
    shape: Shape = NockerlCardShape,
    color: Color = LocalNockerlColors.current.cardSurface1,
    gradient: Brush? = null,
    elevation: Dp = NockerlElevation.Level2,
    border: Color? = LocalNockerlColors.current.cardHairline,
    borderWidth: Dp = 1.dp,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit,
) {
    NockerlSurface(
        modifier = modifier,
        shape = shape,
        color = color,
        gradient = gradient,
        elevation = elevation,
        border = border,
        borderWidth = borderWidth,
        onClick = onClick,
        content = content,
    )
}

/**
 * Convenience overload of [bubbleShape] returning a [RoundedCornerShape] for the
 * assistant/user message bubbles, re-exported here so card call-sites only need
 * one import. See [bubbleShape] for parameter semantics.
 */
@Composable
fun rememberBubbleShape(
    tail: BubbleTail,
    radius: Dp = 20.dp,
    tailRadius: Dp = 6.dp,
): RoundedCornerShape = bubbleShape(tail = tail, radius = radius, tailRadius = tailRadius)
