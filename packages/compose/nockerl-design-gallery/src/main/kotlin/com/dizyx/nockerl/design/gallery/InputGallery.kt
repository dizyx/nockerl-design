package com.dizyx.nockerl.design.gallery

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.requiredWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.painter.ColorPainter
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.airbnb.android.showkase.annotation.ShowkaseComposable
import com.dizyx.nockerl.design.components.NockerlAlertIntent
import com.dizyx.nockerl.design.components.NockerlAttachmentPopover
import com.dizyx.nockerl.design.components.NockerlBanner
import com.dizyx.nockerl.design.components.NockerlChatInput
import com.dizyx.nockerl.design.components.NockerlRecordingHud
import com.dizyx.nockerl.design.components.NockerlRecordingHudPhase
import com.dizyx.nockerl.design.components.NockerlSearchField
import com.dizyx.nockerl.design.components.NockerlTextField
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * Gallery entries for the **input-well family**: the text field
 * ([NockerlTextField]) and the search field ([NockerlSearchField]), both on the
 * shared recessed-well treatment ("fields sink", design-laws §2).
 *
 * The search field's loading spinner is motion: deliberately NOT captured
 * (goldens stay deterministic); the empty + populated states are.
 *
 * @see GalleryGroup
 */

/** Text-field states: resting with helper, populated, error, and disabled. */
@ShowkaseComposable(name = "TextField · States", group = GROUP)
@Preview
@Composable
fun GalleryTextFields() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlTextField(
                value = "",
                onValueChange = {},
                label = "Email",
                placeholder = "you@nockerl.ai",
                helperText = "Work address preferred",
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlTextField(
                value = "user@example.com",
                onValueChange = {},
                label = "Email",
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlTextField(
                value = "not-an-email",
                onValueChange = {},
                label = "Email",
                errorText = "Enter a valid email address",
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlTextField(
                value = "Locked value",
                onValueChange = {},
                label = "Read-only",
                enabled = false,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/** Search-field states: empty (magnifier + hint) and populated (clear affordance). */
@ShowkaseComposable(name = "SearchField · Empty + populated", group = GROUP)
@Preview
@Composable
fun GallerySearchFields() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlSearchField(
                value = "",
                onValueChange = {},
                placeholder = "Search sessions",
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlSearchField(
                value = "deployment",
                onValueChange = {},
                placeholder = "Search sessions",
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/**
 * Chat-input states: the floating pill in its two resting modes: **empty → MIC**
 * (the trailing circle offers voice) and **with text → SEND** (the circle commits
 * the message). Both show the leading attach affordance. The send↔mic morph itself
 * is motion (fast/standard tokens): the golden captures its two settled endpoints,
 * not the crossfade in flight.
 */
@ShowkaseComposable(name = "ChatInput · Mic + send", group = GROUP)
@Preview
@Composable
fun GalleryChatInput() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            NockerlChatInput(
                value = "",
                onValueChange = {},
                onSend = {},
                onMic = {},
                onAttach = {},
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlChatInput(
                value = "Ship the design system",
                onValueChange = {},
                onSend = {},
                onMic = {},
                onAttach = {},
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/**
 * Attachment-popover states: a single pending thumbnail and a multi-thumbnail
 * cluster, each a floating tile (L3 lift + warm agent-family "dismissable" edge)
 * with a compact red remove badge, the exact frame that pops ABOVE the chat pill
 * on attach. Deterministic [ColorPainter] tiles stand in for the picked images.
 */
@ShowkaseComposable(name = "AttachmentPopover · Single + cluster", group = GROUP)
@Preview
@Composable
fun GalleryAttachmentPopover() {
    val colors = LocalNockerlColors.current
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlAttachmentPopover(
                attachments = listOf(ColorPainter(colors.accentTertiary)),
                onRemove = {},
            )
            NockerlAttachmentPopover(
                attachments =
                    listOf(
                        ColorPainter(colors.accentTertiary),
                        ColorPainter(colors.accentQuaternary),
                        ColorPainter(colors.accentSecondary),
                    ),
                onRemove = {},
            )
        }
    }
}

/** Fixed equalizer levels: a deterministic stand-in for the live audio meter. */
private val DemoAmplitudes = listOf(0.35f, 0.7f, 0.5f, 0.95f, 0.6f)

/** The paused frozen-frame levels (value-exact from the web). */
private val PausedAmplitudes = listOf(0.32f, 0.74f, 0.5f, 0.86f, 0.4f)

/**
 * Recording HUD: the floating "Nockerl is listening" pill, leading brand mark
 * (the fix), pulsing status dot, elapsed timer, live equalizer, ghost Cancel.
 * Captured with `animate = false` so the infinite pulse is frozen at peak.
 */
@ShowkaseComposable(name = "RecordingHud · Listening", group = GROUP)
@Preview
@Composable
fun GalleryRecordingHud() {
    GalleryGroupFullWidth {
        NockerlRecordingHud(
            elapsedLabel = "0:07",
            onCancel = {},
            amplitudes = DemoAmplitudes,
            animate = false,
        )
    }
}

/**
 * Recording HUD · Error: the failed phase, a warn triangle + error text
 * (color + icon + text, never color alone), and the §2 border rides statusWarning
 * (the web canon: warning, not error-red). No dot / timer / meter in this phase.
 */
@ShowkaseComposable(name = "RecordingHud · Error", group = GROUP)
@Preview
@Composable
fun GalleryRecordingHudError() {
    GalleryGroupFullWidth {
        NockerlRecordingHud(
            phase = NockerlRecordingHudPhase.ERROR,
            errorMessage = "Couldn't reach the transcription service.",
            animate = false,
        )
    }
}

/**
 * Recording HUD · Paused: the held phase, a static dimmed dot, the muted
 * timer, a FROZEN muted-bar meter, and the "Paused" status word. Value-exact frozen
 * frame from the web.
 */
@ShowkaseComposable(name = "RecordingHud · Paused", group = GROUP)
@Preview
@Composable
fun GalleryRecordingHudPaused() {
    GalleryGroupFullWidth {
        NockerlRecordingHud(
            phase = NockerlRecordingHudPhase.PAUSED,
            elapsedLabel = "0:41",
            amplitudes = PausedAmplitudes,
            animate = false,
        )
    }
}

/**
 * Recording HUD · Phase heights: the three deterministic phases STACKED so
 * the constant-height fix is VRT-CHECKABLE: every pill is the SAME height (top +
 * bottom edges align); only WIDTH varies per phase. Width-transition + entrance/exit
 * are motion (eyeball-only).
 */
@ShowkaseComposable(name = "RecordingHud · Phase heights", group = GROUP)
@Preview
@Composable
fun GalleryRecordingHudPhaseHeights() {
    GalleryGroupFullWidth {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            NockerlRecordingHud(
                phase = NockerlRecordingHudPhase.RECORDING,
                elapsedLabel = "0:07",
                amplitudes = DemoAmplitudes,
                animate = false,
            )
            NockerlRecordingHud(
                phase = NockerlRecordingHudPhase.PAUSED,
                elapsedLabel = "0:41",
                amplitudes = PausedAmplitudes,
                animate = false,
            )
            NockerlRecordingHud(
                phase = NockerlRecordingHudPhase.ERROR,
                errorMessage = "Couldn't reach the transcription service.",
                animate = false,
            )
            NockerlRecordingHud(
                phase = NockerlRecordingHudPhase.RESULT,
                pasted = true,
                animate = false,
            )
        }
    }
}

/**
 * Recording HUD · Result: the SUCCESS phase, a statusSuccess checkmark +
 * "Pasted" (or "Copied"), dropping the dot/timer/meter (like transcribing); the §2
 * accent edge stays. Constant-height band; only width differs.
 */
@ShowkaseComposable(name = "RecordingHud · Result", group = GROUP)
@Preview
@Composable
fun GalleryRecordingHudResult() {
    GalleryGroupFullWidth {
        NockerlRecordingHud(
            phase = NockerlRecordingHudPhase.RESULT,
            pasted = true,
            animate = false,
        )
    }
}

/**
 * Chat-input × RecordingHUD integration: the HUD pops directly ABOVE the
 * pill on the same L3 chrome layer, both tracing the cyan accent edge: the exact
 * stack the user sees mid-capture. Frozen pulse for a deterministic golden.
 */
@ShowkaseComposable(name = "ChatInput × RecordingHud", group = GROUP)
@Preview
@Composable
fun GalleryChatInputRecordingHud() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlRecordingHud(
                elapsedLabel = "0:07",
                onCancel = {},
                amplitudes = DemoAmplitudes,
                animate = false,
            )
            NockerlChatInput(
                value = "",
                onValueChange = {},
                onSend = {},
                onMic = {},
                onAttach = {},
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/**
 * Wide-stage width caps: at the UNFOLDED 840dp width the chat-input pill
 * clamps to `size.chat.bubbleMax` (460dp) and the banner to `size.chat.bannerMax`
 * (540dp), both CENTERED: content never stretches edge-to-edge on wide chat
 * surfaces. (Narrow stages sit under the caps, so the other goldens are
 * unaffected; this entry is the wide proof.)
 */
@ShowkaseComposable(name = "WidthCaps · Wide stage 840dp", group = GROUP)
@Preview
@Composable
fun GalleryWidthCapsWide() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.requiredWidth(840.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            NockerlChatInput(
                value = "Capped at bubbleMax on wide",
                onValueChange = {},
                onSend = {},
                onMic = {},
                onAttach = {},
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlBanner(
                message = "Capped at bannerMax on wide surfaces.",
                intent = NockerlAlertIntent.INFO,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/**
 * The adoption contract, integrated: the ATTACHMENTS MODEL renders the
 * real popover above the pill and the generic CONTEXT slot (here the frozen
 * Recording HUD) rides between them, all inside the component's own host
 * stack, which owns the chat-column cap (stack order: attachments → context →
 * pill). The bare-pill resting goldens are unchanged (accessories default
 * empty; byte-identical path).
 */
@ShowkaseComposable(name = "ChatInput · Integrated stack", group = GROUP)
@Preview
@Composable
fun GalleryChatInputIntegratedStack() {
    val colors = LocalNockerlColors.current
    GalleryGroupFullWidth {
        NockerlChatInput(
            value = "",
            onValueChange = {},
            onSend = {},
            onMic = {},
            onAttach = {},
            attachments =
                listOf(
                    ColorPainter(colors.accentTertiary),
                    ColorPainter(colors.accentQuaternary),
                ),
            onRemoveAttachment = {},
            contextAccessory = {
                NockerlRecordingHud(
                    elapsedLabel = "0:12",
                    onCancel = {},
                    amplitudes = listOf(0.4f, 0.8f, 0.55f, 0.9f, 0.6f),
                    animate = false,
                )
            },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
