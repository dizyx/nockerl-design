package com.dizyx.nockerl.design.tokens

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Build a Material 3 [ColorScheme] from a semantic [NockerlColors] palette.
 *
 * This is the bridge that lets the ~390 existing `colorScheme.*` call-sites
 * re-theme automatically: every M3 slot the app actually uses is mapped onto a
 * semantic token. The base scheme ([darkColorScheme] vs [lightColorScheme]) is
 * chosen by the canvas lightness so M3's own defaults for unmapped slots stay
 * sensible.
 *
 * **Chrome is always cohesive with the canvas.** The `background` +
 * `surface`/`surfaceVariant`/`surfaceContainer*` roles map onto the *card plane*
 * ([NockerlColors.cardSurface1] tiers), which each palette keeps in its own
 * canvas family: lifted dark-gray tiers on the dark canvas, white/near-white
 * tiers on the light canvas. So the root window, the input bar, the floating
 * action buttons, the workspace pill, and the tab bar all read as the same
 * family as the page background. The content cards (message bubbles, pull-up
 * sheets) ride the [NockerlColors.cardAlt] plane.
 *
 * Mapping highlights:
 * - `background` ← [NockerlColors.canvas]
 * - `surface` / `surfaceVariant` / `surfaceContainer*` ← the canvas-family card tiers
 * - `primary` ← [NockerlColors.accentPrimary]; `secondary`/`tertiary` ← others
 * - `onSurface` ← [NockerlColors.onCard]; `onSurfaceVariant` ← [NockerlColors.onCardMuted]
 * - `error` ← [NockerlColors.statusError]; `outline` ← [NockerlColors.divider]
 *
 * @param c the semantic palette to map.
 */
private fun colorSchemeFrom(c: NockerlColors): ColorScheme {
    val isLightCanvas = c.canvas.luminance() > 0.5f
    val base = if (isLightCanvas) lightColorScheme() else darkColorScheme()
    return base.copy(
        primary = c.accentPrimary,
        onPrimary = pickOn(c.accentPrimary),
        primaryContainer = c.accentPrimarySoft,
        onPrimaryContainer = c.accentPrimary,
        // Secondary is mapped to the brand CYAN accent, not the teal tertiary.
        // Rationale (Design Review #1, Decision 1): M3's tonal controls
        // (`FilledTonalButton`, `secondaryContainer` chips) read their fill from
        // this slot, and pointing it at the teal `accentTertiary` is exactly what
        // made raw M3 buttons render teal while custom buttons rendered cyan. The
        // app is cyan-locked, so every M3-driven control now lands on cyan too.
        // (New code should prefer the token-driven Nockerl button, which never
        // touches this slot.)
        secondary = c.accentPrimary,
        onSecondary = pickOn(c.accentPrimary),
        secondaryContainer = c.accentPrimarySoft,
        onSecondaryContainer = c.accentPrimary,
        tertiary = c.accentQuaternary,
        onTertiary = pickOn(c.accentQuaternary),
        tertiaryContainer = c.accentQuaternarySoft,
        onTertiaryContainer = c.accentQuaternary,
        background = c.canvas,
        onBackground = c.onCanvas,
        // Chrome surfaces ride the canvas family. The card-surface tiers are
        // authored to sit in the same family as the canvas (lifted dark-gray on
        // Dark, white/near-white on Light) and lift only subtly, so mapping the
        // whole `surface` + `surfaceContainer` ladder onto them keeps every
        // M3-driven chrome element (root window, input bar, FABs, progress
        // tracks) cohesive with the page background.
        // `surface` is the resting tier; the container ladder rises low → high.
        surface = c.cardSurface1,
        onSurface = c.onCard,
        surfaceVariant = c.cardSurface2,
        onSurfaceVariant = c.onCardMuted,
        surfaceContainerLowest = c.canvas,
        surfaceContainerLow = c.cardSurface1,
        surfaceContainer = c.cardSurface1,
        surfaceContainerHigh = c.cardSurface2,
        surfaceContainerHighest = c.cardSurface3,
        inverseSurface = c.onCanvas,
        inverseOnSurface = c.canvas,
        outline = c.divider,
        outlineVariant = c.outlineSubtle,
        error = c.statusError,
        onError = pickOn(c.statusError),
        errorContainer = c.statusError.copy(alpha = 0.16f),
        onErrorContainer = c.statusError,
        scrim = c.scrim,
    )
}

/**
 * Choose a readable on-color (near-white or near-black) for an arbitrary accent
 * fill, based on its luminance. Keeps text/icon contrast safe on accent buttons
 * regardless of the active palette's hue.
 */
private fun pickOn(background: Color): Color =
    if (background.luminance() >
        0.55f
    ) {
        Color(0xFF1A1A1A)
    } else {
        Color(0xFFF7F7F7)
    }

/**
 * Nockerl Material 3 theme, driven by the selected [mode].
 *
 * Resolves [mode] to a concrete [NockerlColors]: [ThemeMode.SYSTEM] follows the
 * OS dark-mode setting via [isSystemInDarkTheme]. Provides [LocalNockerlColors]
 * (so components can read tokens directly) AND maps the palette onto the M3
 * [ColorScheme] (so existing `colorScheme.*` usages re-theme for free).
 *
 * **System bars follow the canvas.** The status- and navigation-bar backgrounds
 * are painted with the palette canvas (the app draws edge-to-edge over them, and
 * the legacy bar-color fallback matches so older devices never flash a stark
 * panel behind the clock/wifi/battery). The icon appearance follows the canvas
 * lightness (dark icons on the light canvas, light icons on the dark canvas)
 * so the system glyphs always have contrast.
 *
 * This theme is safe to host outside an [Activity] (library `@Preview`, tests, or
 * a non-Activity `Context`): the system-bar `SideEffect` is skipped in inspection
 * mode and no-ops when the host view's context is not an [Activity].
 *
 * @param mode the selected theme mode (Light / Dark / System).
 * @param content the composable content to theme.
 */
@Composable
fun NockerlTheme(
    mode: ThemeMode = ThemeMode.DEFAULT,
    content: @Composable () -> Unit,
) {
    val systemInDark = isSystemInDarkTheme()
    val colors = remember(mode, systemInDark) { mode.colors(systemInDark) }
    val colorScheme = remember(mode, systemInDark) { colorSchemeFrom(colors) }
    val lightCanvas = colors.canvas.luminance() > 0.5f

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            // Safe cast + early return: this theme can be hosted outside an
            // Activity (library @Preview, other apps' contexts), where the old
            // `as Activity` cast would crash. When there is no Activity there is
            // no window to paint, so skip the system-bar styling entirely.
            val activity = view.context as? Activity ?: return@SideEffect
            val window = activity.window
            // Paint the system-bar backgrounds with the canvas so the area behind
            // the status/nav bars is the page canvas, not a stale light surface.
            // The app draws edge-to-edge over the bars; these colors are the
            // legacy fallback that keeps pre-edge-to-edge devices cohesive too.
            val canvasArgb = colors.canvas.toArgb()
            @Suppress("DEPRECATION")
            window.statusBarColor = canvasArgb
            @Suppress("DEPRECATION")
            window.navigationBarColor = canvasArgb
            val controller = WindowCompat.getInsetsController(window, view)
            // Light canvas -> dark (appearance-light) bar icons, and vice versa.
            controller.isAppearanceLightStatusBars = lightCanvas
            controller.isAppearanceLightNavigationBars = lightCanvas
        }
    }

    CompositionLocalProvider(LocalNockerlColors provides colors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = NockerlTypography,
            content = content,
        )
    }
}
