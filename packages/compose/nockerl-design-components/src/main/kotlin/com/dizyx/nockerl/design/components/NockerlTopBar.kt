package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * The **top bar**: the app's top chrome strip on the `chromeSurface` plane with
 * a bottom `chromeHairline`, mirroring the corrected web TopBar.
 *
 * **Brand-placement rule: the MAIN NAV owns the brand.** When the shell
 * shows a nav surface, the top bar carries a plain [title] (+ actions) and NO
 * lockup: never duplicate the logo/title between top bar and left nav. Pass
 * [showBrand]=true ONLY when the top bar is the sole chrome (no nav surface,
 * the Android phone preset), in which case it composes the REAL [NockerlLockup]
 * (so every lockup fix propagates here automatically).
 *
 * @param modifier outer modifier (typically `fillMaxWidth()` from the shell).
 * @param title the screen/app title (ignored when [showBrand] renders the lockup).
 * @param showBrand compose the brand lockup instead of the title, ONLY for
 *   shells with no nav surface (the brand-placement rule).
 * @param product the lockup's cyan product word (used when [showBrand]).
 * @param actions trailing action slot (icon buttons etc.), a [RowScope].
 */
@Composable
fun NockerlTopBar(
    modifier: Modifier = Modifier,
    title: String? = null,
    showBrand: Boolean = false,
    product: String? = null,
    actions: (@Composable RowScope.() -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current

    Row(
        modifier =
            modifier
                .fillMaxWidth()
                .height(TOP_BAR_HEIGHT)
                .background(colors.chromeSurface)
                // The bottom hairline separates the chrome from the content plane.
                .drawBehind {
                    val hairline = HAIRLINE_PX * density
                    drawRect(
                        color = colors.chromeHairline,
                        topLeft = Offset(0f, size.height - hairline),
                        size = Size(size.width, hairline),
                    )
                }.padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (showBrand) {
            // The REAL lockup (the top bar is the sole chrome here): mark
            // slightly taller than the text, cyan product word (canon).
            NockerlLockup(product = product, size = 22.dp)
        } else if (title != null) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = colors.onChrome,
            )
        }
        Box(modifier = Modifier.weight(1f))
        if (actions != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                content = actions,
            )
        }
    }
}

/** Top-bar height: the standard chrome strip. */
private val TOP_BAR_HEIGHT = 56.dp

/** Bottom hairline thickness (scaled by density in the draw scope). */
private const val HAIRLINE_PX = 1f
