package com.dizyx.nockerl.design.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import kotlinx.coroutines.delay

/**
 * The **copy button**: the ONE copy affordance for every "copy code / copy
 * message" surface (R5-13 ), brought up as native design-system truth so all
 * copy buttons compose this single component (exactly what the R5-4 hand-roll gate
 * protects) rather than hand-rolling the confirm.
 *
 * It composes [NockerlIconButton] in the `PLAIN` (no-fill) style, swapping only the
 * glyph + tint on confirm. **The confirm is a BARE CYAN CHECKMARK with no fill
 * background** (matching the web, `fa56340`): tapping fires [onCopy] and flips the
 * muted copy glyph to `accentPrimary` [Icons.Filled.Check] for a beat, then reverts.
 * The subtle glyph-only confirm reads as "copied", never as a filled checkbox.
 *
 * @param onCopy the copy action (the caller writes to the clipboard).
 * @param modifier outer modifier.
 * @param size the touch-target size (defaults to the 40dp icon-button size).
 */
@Composable
fun NockerlCopyButton(
    onCopy: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    copyContentDescription: String = "Copy",
    copiedContentDescription: String = "Copied",
) {
    var copied by remember { mutableStateOf(false) }
    LaunchedEffect(copied) {
        if (copied) {
            delay(COPY_CONFIRM_MS)
            copied = false
        }
    }
    NockerlCopyButton(
        copied = copied,
        onClick = {
            onCopy()
            copied = true
        },
        modifier = modifier,
        size = size,
        copyContentDescription = copyContentDescription,
        copiedContentDescription = copiedContentDescription,
    )
}

/**
 * The **controlled** copy button: the caller owns [copied] (and the revert timing).
 * Most hosts want the stateful [NockerlCopyButton] overload above; this variant is
 * for callers that already track the copied state (and for deterministic goldens).
 *
 * @param copied `true` renders the bare cyan confirm check; `false` the copy glyph.
 * @param onClick tapped (the caller both copies AND flips [copied]).
 * @param modifier outer modifier.
 * @param size the touch-target size.
 */
@Composable
fun NockerlCopyButton(
    copied: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    copyContentDescription: String = "Copy",
    copiedContentDescription: String = "Copied",
) {
    val colors = LocalNockerlColors.current
    NockerlIconButton(
        icon = if (copied) Icons.Filled.Check else NockerlCopyIcon,
        contentDescription = if (copied) copiedContentDescription else copyContentDescription,
        onClick = onClick,
        modifier = modifier,
        style = NockerlIconButtonStyle.PLAIN,
        // Confirm = a BARE cyan check (no fill, PLAIN style); idle = a muted copy glyph.
        tint = if (copied) colors.accentPrimary else colors.onChromeMuted,
        size = size,
    )
}

/** How long the bare cyan check lingers after a copy before reverting. */
private const val COPY_CONFIRM_MS = 1500L

/**
 * The **copy glyph** as a self-contained [ImageVector] (the standard Material
 * `content_copy` path). `Icons.Filled.ContentCopy` lives in the BANNED
 * icons-extended artifact, so it's built here to keep the module on icons-core.
 */
private val NockerlCopyIcon: ImageVector =
    ImageVector
        .Builder(
            name = "NockerlCopy",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f,
        ).addPath(
            pathData =
                PathParser()
                    .parsePathString(
                        "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1z" +
                            "m3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z" +
                            "m0 16H8V7h11v14z",
                    ).toNodes(),
            fill = SolidColor(androidx.compose.ui.graphics.Color.Black),
        ).build()
