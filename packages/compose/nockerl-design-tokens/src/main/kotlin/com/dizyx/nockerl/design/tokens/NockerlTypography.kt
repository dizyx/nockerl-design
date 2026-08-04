// Hand-written semantic type layer for the Compose tokens package.
// This is NOT generated. It binds the generated NockerlType ramp (NockerlTokens.kt)
// to a Material 3 Typography backed by the bundled Outfit variable font.

package com.dizyx.nockerl.design.tokens

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight

/**
 * Outfit: the ratified Nockerl typeface.
 *
 * A single variable font ([R.font.nockerl_outfit_variable]) exposed as one [Font] per weight
 * actually used by the thin-forward ramp, driven through Compose variable-font support
 * ([FontVariation.weight]). Space Grotesk (the apps' legacy face) is intentionally NOT ported.
 */
@OptIn(ExperimentalTextApi::class)
private val Outfit =
    FontFamily(
        Font(
            R.font.nockerl_outfit_variable,
            weight = FontWeight.Thin,
            variationSettings = FontVariation.Settings(FontVariation.weight(100)),
        ),
        Font(
            R.font.nockerl_outfit_variable,
            weight = FontWeight.ExtraLight,
            variationSettings = FontVariation.Settings(FontVariation.weight(200)),
        ),
        Font(
            R.font.nockerl_outfit_variable,
            weight = FontWeight.Light,
            variationSettings = FontVariation.Settings(FontVariation.weight(300)),
        ),
        Font(
            R.font.nockerl_outfit_variable,
            weight = FontWeight.Medium,
            variationSettings = FontVariation.Settings(FontVariation.weight(500)),
        ),
    )

/**
 * Builds a Material 3 [TextStyle] for one role from a generated [NockerlTextStyle], so the ramp
 * (weight + size + line-height) is single-sourced from [NockerlType]. Nothing is hardcoded here.
 */
private fun role(s: NockerlTextStyle): TextStyle =
    TextStyle(
        fontFamily = Outfit,
        fontWeight = FontWeight(s.fontWeight),
        fontSize = s.fontSize,
        lineHeight = s.lineHeight,
    )

/**
 * Material 3 [Typography] for Nockerl on Compose.
 *
 * The thin-forward type system on the **Outfit** typeface (ratified): weight ramps
 * *down* as size goes *up* (a display is the thinnest thing on the page), and **500 (medium) is
 * the hard bold cap**, so the system never sets type heavier than 500.
 *
 * Every role is assembled from the matching [NockerlType] entry via [role], so the family, weight,
 * size, and line-height all flow from the generated tokens (NockerlTokens.kt). There are no
 * hardcoded weights or sizes in this file.
 */
val NockerlTypography: Typography =
    Typography(
        displayLarge = role(NockerlType.displayLarge),
        displayMedium = role(NockerlType.displayMedium),
        displaySmall = role(NockerlType.displaySmall),
        headlineLarge = role(NockerlType.headlineLarge),
        headlineMedium = role(NockerlType.headlineMedium),
        headlineSmall = role(NockerlType.headlineSmall),
        titleLarge = role(NockerlType.titleLarge),
        titleMedium = role(NockerlType.titleMedium),
        titleSmall = role(NockerlType.titleSmall),
        bodyLarge = role(NockerlType.bodyLarge),
        bodyMedium = role(NockerlType.bodyMedium),
        bodySmall = role(NockerlType.bodySmall),
        labelLarge = role(NockerlType.labelLarge),
        labelMedium = role(NockerlType.labelMedium),
        labelSmall = role(NockerlType.labelSmall),
    )

/**
 * The section **eyebrow** role (v1.18.0), the ONE shared uppercase-overline style: Outfit /
 * 12sp / **500** / 16sp line-height (the generated [NockerlType.eyebrow]). This is NOT a Material 3
 * [Typography] slot, so it is exposed as a standalone [TextStyle] (assembled via the same [role]
 * helper, so family/weight/size/line-height still flow from the generated tokens, with nothing
 * hardcoded). Consumers apply the `.uppercase()` + the surface-appropriate muted ink at the call
 * site (see [com.dizyx.nockerl.design.components.NockerlFormSection]).
 */
val NockerlEyebrow: TextStyle = role(NockerlType.eyebrow)
