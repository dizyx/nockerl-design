package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * The **brand lockup** is the canonical `[mark] Nockerl` (+ optional product word),
 * the ONE lockup for every surface (law §11). "Nockerl" runs EXTRALIGHT (200) in
 * the surface ink; the product word runs REGULAR (400) in the cyan accent; both are
 * SENTENCE CASE (never uppercase), set tight (-0.03em) with a tight gap. The mark is
 * slightly taller than the text. The product word is a PARAMETER (Voice / Dashboard /
 * Console / …) so a rename is one call-site change, and cyan lives ONLY here.
 *
 * The optical ratios ARE the spec (law §11), kept in one place so "one lockup" stays
 * literally one definition: mark-gap 0.34×, wordmark 0.9×, inter-word gap 0.14em.
 *
 * @param modifier outer modifier.
 * @param product optional product word (set in cyan 400); omit for the monochrome
 *   wordmark alone.
 * @param size the MARK height (the wordmark is optically sized from it).
 * @param tone force the mark's ink ladder, or `null` (default) for theme-aware.
 * @param stacked stack the wordmark beneath the mark instead of inline.
 */
@Composable
fun NockerlLockup(
    modifier: Modifier = Modifier,
    product: String? = null,
    size: Dp = 28.dp,
    tone: NockerlLogoTone? = null,
    stacked: Boolean = false,
) {
    val colors = LocalNockerlColors.current
    // Interpret the mark-height magnitude as sp for the wordmark because the brand lockup
    // scales as ONE unit (the web sets font-size = mark_h × 0.9 in px).
    val wordmarkSp = (size.value * WORDMARK_RATIO).sp
    val wordGap = (size.value * WORDMARK_RATIO * INTER_WORD_RATIO).dp

    val wordmark: @Composable () -> Unit = {
        Row(horizontalArrangement = Arrangement.spacedBy(wordGap)) {
            Text(
                text = "Nockerl",
                fontSize = wordmarkSp,
                fontWeight = FontWeight.W200,
                letterSpacing = BRAND_TRACKING,
                color = colors.onCanvas,
                modifier = Modifier.alignByBaseline(),
            )
            if (product != null) {
                Text(
                    text = product,
                    fontSize = wordmarkSp,
                    fontWeight = FontWeight.W400,
                    letterSpacing = BRAND_TRACKING,
                    color = colors.accentPrimary,
                    modifier = Modifier.alignByBaseline(),
                )
            }
        }
    }

    if (stacked) {
        Column(
            modifier = modifier,
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(size * STACKED_GAP_RATIO),
        ) {
            NockerlLogo(size = size, tone = tone, contentDescription = null)
            wordmark()
        }
    } else {
        Row(
            modifier = modifier,
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(size * MARK_GAP_RATIO),
        ) {
            NockerlLogo(size = size, tone = tone, contentDescription = null)
            wordmark()
        }
    }
}

/** Wordmark font size as a fraction of the mark height (law §11). */
private const val WORDMARK_RATIO = 0.9f

/** Inline mark→wordmark gap as a fraction of the mark height. */
private const val MARK_GAP_RATIO = 0.34f

/** Stacked mark→wordmark gap as a fraction of the mark height. */
private const val STACKED_GAP_RATIO = 0.2f

/** Inter-word (Nockerl↔product) gap as a fraction of the wordmark size (0.14em). */
private const val INTER_WORD_RATIO = 0.14f

/** The brand tracking: the ratified -0.03em. */
private val BRAND_TRACKING = (-0.03).em
