package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The **app shell**: the top-level scaffold as a PURE COMPOSITION of the
 * corrected components, so every toolbar/nav/lockup fix propagates here
 * automatically: [NockerlFacetedBackground] (the praised ground), a
 * [NockerlNavSurface] nav region (the ONE translucent layer, ), an optional
 * [NockerlTopBar], and the content region. This shell draws NOTHING bespoke.
 *
 * **Modes are EXPANDED + RAIL only** ([NockerlAppShellLayout]). The
 * compact/bottom-navigation mode is KILLED per the ratified /#2596c
 * (bottom nav is dead; the enum simply has no such case).
 *
 * **Brand-placement rule (#2596b): the main nav owns the brand.** When the nav
 * surface is present, its header composes the REAL [NockerlLockup] and the top
 * bar carries only a title/actions ([NockerlTopBar.showBrand] stays false).
 * Logo/title duplication between top bar and left nav is impossible by
 * construction here.
 *
 * **Platform presets** (#2596d, product guidance, expressed as configurations):
 * - **Android**, top bar PRESENT: `NockerlAppShell(topBarTitle = "...", …)`.
 * - **Voice**, LEFT-NAV ONLY, no top bar: `NockerlAppShell(topBarTitle = null)`.
 * - **Web**: a mixture (the web shell mixes per breakpoint; not a native preset).
 *
 * @param nav the nav-surface body (nav items; the shell prepends the brand
 *   lockup header per the brand rule), a [ColumnScope].
 * @param modifier outer modifier (typically fills the window).
 * @param layout [NockerlAppShellLayout.EXPANDED] (default) or RAIL (narrow).
 * @param topBarTitle the top bar's title; `null` = NO top bar (the Voice preset).
 * @param topBarActions optional top-bar trailing actions, a [RowScope].
 * @param product the brand lockup's cyan product word (nav header).
 * @param animateBackground drift the facet tone-wave (default). `false` freezes
 *   it at phase 0, for reduced-motion hosts and DETERMINISTIC snapshots (an
 *   infinite transition has no stable capture frame; the  lesson).
 * @param navSurface the nav rail's opacity option (R5-14 ): TRANSLUCENT
 *   (default: the facet whispers through, the Voice look) or SOLID (opaque
 *   chrome, matches the top bar). Mirrors the web's `navSurface` prop.
 * @param content the content region, laid over the faceted ground.
 */
@Composable
fun NockerlAppShell(
    nav: @Composable ColumnScope.() -> Unit,
    modifier: Modifier = Modifier,
    layout: NockerlAppShellLayout = NockerlAppShellLayout.EXPANDED,
    topBarTitle: String? = null,
    topBarActions: (@Composable RowScope.() -> Unit)? = null,
    product: String? = null,
    animateBackground: Boolean = true,
    navSurface: NockerlNavSurfaceStyle = NockerlNavSurfaceStyle.TRANSLUCENT,
    content: @Composable () -> Unit,
) {
    Box(modifier = modifier.fillMaxSize()) {
        // 1) The praised signature ground: opaque, behind everything.
        NockerlFacetedBackground(modifier = Modifier.matchParentSize(), animate = animateBackground)

        Column(modifier = Modifier.fillMaxSize()) {
            // 2) Optional top chrome (Android preset). Never carries the brand
            //    here. The nav below owns it (brand-placement rule).
            if (topBarTitle != null) {
                NockerlTopBar(title = topBarTitle, actions = topBarActions)
            }

            Row(modifier = Modifier.fillMaxSize()) {
                // 3) The nav region: translucent over the facet by default, or
                //    the opaque option: headed by the REAL brand lockup
                //    (nav owns the brand).
                NockerlNavSurface(width = layout.navWidth, surface = navSurface) {
                    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp)) {
                        // RAIL shows the mark alone (no room for the wordmark);
                        // EXPANDED shows the full lockup with the product word.
                        if (layout == NockerlAppShellLayout.RAIL) {
                            NockerlLogo(size = 24.dp)
                        } else {
                            NockerlLockup(product = product, size = 22.dp)
                        }
                    }
                    nav()
                }

                // 4) The content region, on the facet ground beside the nav.
                Box(modifier = Modifier.weight(1f).padding(16.dp)) {
                    content()
                }
            }
        }
    }
}

/**
 * The shell layouts (#2596c): EXPANDED + RAIL **only**. The compact/bottom-nav
 * mode is ratified-dead and deliberately has no case here.
 */
enum class NockerlAppShellLayout(
    /** The nav-surface width for this layout. */
    val navWidth: Dp,
) {
    /** Full sidebar: brand lockup + labeled nav items. */
    EXPANDED(248.dp),

    /** Icon-only rail: the mark alone; labels hidden. */
    RAIL(72.dp),
}
