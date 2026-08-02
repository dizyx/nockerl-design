package com.dizyx.nockerl.design.gallery

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Stop
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.airbnb.android.showkase.annotation.ShowkaseComposable
import com.dizyx.nockerl.design.components.NockerlButton
import com.dizyx.nockerl.design.components.NockerlButtonVariant
import com.dizyx.nockerl.design.components.NockerlCopyButton
import com.dizyx.nockerl.design.components.NockerlIconButton
import com.dizyx.nockerl.design.components.NockerlIconButtonStyle
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * Gallery entries for the **button family**: the unified [NockerlButton] fill
 * ladder (all five [NockerlButtonVariant]s plus the enabled/disabled treatment)
 * and the two [NockerlIconButton] idioms.
 *
 * Each `@ShowkaseComposable` is a single gallery entry: it appears in any
 * Showkase browser host AND is rendered to a per-theme PNG by the Roborazzi
 * screenshot test. Entries are theme-agnostic (they read the palette via
 * [LocalNockerlColors]); the surrounding theme decides dark vs light.
 *
 * @see GalleryGroup
 */

// ─── NockerlButton: fill ladder ───────────────────────────────────────────────

/**
 * The full enabled fill ladder: one button per [NockerlButtonVariant]. Laid out
 * as TWO rows (3 + 2): five buttons in one row overflow the 411dp capture
 * device and wrap labels mid-word, which would ship a broken-looking golden.
 */
@ShowkaseComposable(name = "Button · Variants (enabled)", group = GROUP)
@Preview
@Composable
fun GalleryButtonVariants() {
    GalleryGroup {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NockerlButton(text = "Primary", onClick = {}, variant = NockerlButtonVariant.PRIMARY)
            NockerlButton(text = "Secondary", onClick = {}, variant = NockerlButtonVariant.SECONDARY)
            NockerlButton(text = "Tertiary", onClick = {}, variant = NockerlButtonVariant.TERTIARY)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NockerlButton(text = "Ghost", onClick = {}, variant = NockerlButtonVariant.GHOST)
            NockerlButton(text = "Delete", onClick = {}, variant = NockerlButtonVariant.DESTRUCTIVE)
        }
    }
}

/** The same fill ladder with every variant disabled (the dimmed treatment). */
@ShowkaseComposable(name = "Button · Variants (disabled)", group = GROUP)
@Preview
@Composable
fun GalleryButtonVariantsDisabled() {
    GalleryGroup {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NockerlButton(
                text = "Primary",
                onClick = {},
                variant = NockerlButtonVariant.PRIMARY,
                enabled = false,
            )
            NockerlButton(
                text = "Secondary",
                onClick = {},
                variant = NockerlButtonVariant.SECONDARY,
                enabled = false,
            )
            NockerlButton(
                text = "Tertiary",
                onClick = {},
                variant = NockerlButtonVariant.TERTIARY,
                enabled = false,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NockerlButton(
                text = "Ghost",
                onClick = {},
                variant = NockerlButtonVariant.GHOST,
                enabled = false,
            )
            NockerlButton(
                text = "Delete",
                onClick = {},
                variant = NockerlButtonVariant.DESTRUCTIVE,
                enabled = false,
            )
        }
    }
}

// ─── NockerlIconButton: the two idioms ────────────────────────────────────────

/**
 * The icon-button vocabulary: a [NockerlIconButtonStyle.PLAIN] glyph (enabled +
 * disabled) and the [NockerlIconButtonStyle.FILLED_CIRCLE] send/stop slot (the
 * cyan send circle plus the error-red stop circle).
 */
@ShowkaseComposable(name = "IconButton · Plain + filled-circle", group = GROUP)
@Preview
@Composable
fun GalleryIconButtons() {
    GalleryGroup {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            NockerlIconButton(
                icon = Icons.Filled.MoreVert,
                contentDescription = "More",
                onClick = {},
            )
            NockerlIconButton(
                icon = Icons.Filled.Add,
                contentDescription = "Add",
                onClick = {},
                enabled = false,
            )
            NockerlIconButton(
                icon = Icons.AutoMirrored.Filled.Send,
                contentDescription = "Send",
                onClick = {},
                style = NockerlIconButtonStyle.FILLED_CIRCLE,
                size = 48.dp,
            )
            NockerlIconButton(
                icon = Icons.Filled.Stop,
                contentDescription = "Stop",
                onClick = {},
                style = NockerlIconButtonStyle.FILLED_CIRCLE,
                accent = LocalNockerlColors.current.statusError,
                size = 48.dp,
            )
        }
    }
}

/**
 * Copy-button states: the resting copy glyph and the **bare cyan confirm check**
 * (no fill, R5-13). The confirm is stateful/timed in real use; the controlled
 * overload renders both endpoints deterministically for the golden.
 */
@ShowkaseComposable(name = "CopyButton · Idle + confirmed", group = GROUP)
@Preview
@Composable
fun GalleryCopyButton() {
    GalleryGroup {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            NockerlCopyButton(copied = false, onClick = {})
            NockerlCopyButton(copied = true, onClick = {})
        }
    }
}
