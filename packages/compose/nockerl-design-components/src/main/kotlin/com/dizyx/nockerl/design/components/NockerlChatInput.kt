package com.dizyx.nockerl.design.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlFloatingBorderWidth
import com.dizyx.nockerl.design.tokens.NockerlMotionDuration
import com.dizyx.nockerl.design.tokens.NockerlMotionEasing
import com.dizyx.nockerl.design.tokens.NockerlPillShape
import com.dizyx.nockerl.design.tokens.NockerlSize
import com.dizyx.nockerl.design.tokens.nockerlShadow

/**
 * The **chat input**: the canonical FLOATING PILL bottom-of-chat input, brought
 * up from the Android app (chat/ui/ChatInputBar.kt) as design-system truth.
 * The praised design is KEPT verbatim: a large, fully-rounded pill that
 * FLOATS above the message cards (chrome plane + a crisp accent edge + the L3
 * lift, never a glow), laid out `[attach] [text field] [send/mic]`.
 *
 * **The one refinement: a CLEAN send↔mic switch.** The trailing 48dp
 * accent circle is a single toggle: SEND when there's text (auto), MIC when
 * empty; a long-press flips a manual override. The glyph CROSS-FADES + scales
 * between mic and send on the fast/standard motion tokens.
 *
 * **The adoption contract (mirrors the react API 1:1).** Generic over
 * app-specific, one shared contract on both platforms:
 * - [leadingAccessory] is a generic slot that REPLACES the built-in attach button
 *   entirely when provided (any control cluster; the caller owns its a11y).
 *   Precedence: `leadingAccessory ?: (onAttach → built-in attach button)`.
 * - [attachments] + [onRemoveAttachment] are the pending-attachments MODEL:
 *   non-empty renders the real [NockerlAttachmentPopover] directly ABOVE the
 *   pill (the canonical integration) inside the component.
 * - [contextAccessory] is a generic slot riding above the pill, BELOW the
 *   attachments (stack order: attachments → context → pill). Session chips and
 *   the Recording HUD ride here, deliberately untyped, never session-typed.
 * - With NO accessories the component renders the BARE PILL, byte-identical to
 *   the pre-2682 output. With ANY accessory a self-contained HOST STACK owns
 *   the chat-column cap (the pill defers its own cap, so no double-cap).
 * - [maxLines] + [onHaptic] are the compose-side NEEDS-PARAM additions ([onHaptic]
 *   is compose-only per the contract; the default is a no-op).
 *
 * @param value the message text.
 * @param onValueChange text edits.
 * @param onSend fired when the action button is in SEND mode and tapped.
 * @param onMic fired when the action button is in MIC mode and tapped.
 * @param modifier outer modifier (the host places the composite).
 * @param placeholder the empty-field hint.
 * @param enabled when `false`, dimmed + inert.
 * @param onAttach zero-config built-in attach button; ignored when
 *   [leadingAccessory] is provided.
 * @param attachIcon the built-in attach glyph (default `+`).
 * @param leadingAccessory generic leading slot that REPLACES the built-in attach.
 * @param attachments pending attachments; non-empty renders the popover above.
 * @param onRemoveAttachment remove tapped on an attachment thumbnail.
 * @param contextAccessory generic slot above the pill, below the attachments.
 * @param maxLines max visible text lines before the field scrolls (default 5).
 * @param onHaptic compose-only haptic hook, fired per interaction (no-op default).
 * @param attachContentDescription the built-in attach button's a11y name.
 * @param sendContentDescription the action circle's a11y name in SEND mode.
 * @param micContentDescription the action circle's a11y name in MIC mode.
 */
@Composable
fun NockerlChatInput(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    onMic: () -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Message Nockerl…",
    enabled: Boolean = true,
    onAttach: (() -> Unit)? = null,
    attachIcon: ImageVector = Icons.Filled.Add,
    leadingAccessory: (@Composable () -> Unit)? = null,
    attachments: List<Painter> = emptyList(),
    onRemoveAttachment: ((Int) -> Unit)? = null,
    contextAccessory: (@Composable () -> Unit)? = null,
    maxLines: Int = 5,
    onHaptic: (NockerlChatInputHapticEvent) -> Unit = {},
    attachContentDescription: String = "Attach",
    sendContentDescription: String = "Send",
    micContentDescription: String = "Voice input",
) {
    val hasAccessories = attachments.isNotEmpty() || contextAccessory != null

    if (!hasAccessories) {
        // BARE PILL: byte-identical to the pre-2682 render (cap + center).
        Box(modifier = modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
            ChatInputPill(
                value = value,
                onValueChange = onValueChange,
                onSend = onSend,
                onMic = onMic,
                placeholder = placeholder,
                enabled = enabled,
                onAttach = onAttach,
                attachIcon = attachIcon,
                leadingAccessory = leadingAccessory,
                maxLines = maxLines,
                onHaptic = onHaptic,
                attachContentDescription = attachContentDescription,
                sendContentDescription = sendContentDescription,
                micContentDescription = micContentDescription,
                capWidth = true,
            )
        }
        return
    }

    // HOST STACK: the self-contained integration column. It owns the
    // chat-column cap; attachments align start, the context slot centers, and
    // the pill defers its own cap (no double-cap).
    Box(modifier = modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
        Column(
            modifier = Modifier.widthIn(max = NockerlSize.chatBubbleMax).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (attachments.isNotEmpty()) {
                NockerlAttachmentPopover(
                    attachments = attachments,
                    onRemove = { onRemoveAttachment?.invoke(it) },
                    enabled = enabled,
                )
            }
            if (contextAccessory != null) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    contextAccessory()
                }
            }
            ChatInputPill(
                value = value,
                onValueChange = onValueChange,
                onSend = onSend,
                onMic = onMic,
                placeholder = placeholder,
                enabled = enabled,
                onAttach = onAttach,
                attachIcon = attachIcon,
                leadingAccessory = leadingAccessory,
                maxLines = maxLines,
                onHaptic = onHaptic,
                attachContentDescription = attachContentDescription,
                sendContentDescription = sendContentDescription,
                micContentDescription = micContentDescription,
                capWidth = false,
            )
        }
    }
}

/** The compose-only haptic hook's interaction events. */
enum class NockerlChatInputHapticEvent {
    /** The send action fired. */
    SEND,

    /** The mic action fired. */
    MIC,

    /** The long-press send↔mic mode toggle fired. */
    MODE_TOGGLE,
}

/** The floating pill itself, shared by the bare and host-stack paths. */
@Composable
private fun ChatInputPill(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    onMic: () -> Unit,
    placeholder: String,
    enabled: Boolean,
    onAttach: (() -> Unit)?,
    attachIcon: ImageVector,
    leadingAccessory: (@Composable () -> Unit)?,
    maxLines: Int,
    onHaptic: (NockerlChatInputHapticEvent) -> Unit,
    attachContentDescription: String,
    sendContentDescription: String,
    micContentDescription: String,
    capWidth: Boolean,
) {
    val colors = LocalNockerlColors.current
    val accent = colors.accentPrimary

    // Auto mode: SEND when there's content, MIC when empty. A long-press sets a
    // manual override (true = send, false = mic); it clears the moment a send fires.
    var override by remember { mutableStateOf<Boolean?>(null) }
    val sendMode = override ?: value.isNotBlank()

    Surface(
        color = colors.chromeSurface,
        shape = NockerlPillShape,
        // The signature THICK cyan edge (design-laws §2) trains the eye that
        // this pill is a fixed layer floating over the scrolling cards below.
        border = BorderStroke(NockerlFloatingBorderWidth, accent),
        modifier =
            (if (capWidth) Modifier.widthIn(max = NockerlSize.chatBubbleMax) else Modifier)
                .fillMaxWidth()
                // L3: floating chrome the message cards scroll UNDER.
                .nockerlShadow(elevation = NockerlElevation.Level3, shape = NockerlPillShape),
    ) {
        Row(
            // The pill's rounded ends eat horizontal space, so the trailing circle
            // gets a touch more inset (15) than the leading glyph (12).
            modifier = Modifier.fillMaxWidth().padding(start = 12.dp, end = 15.dp, top = 6.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Precedence: leadingAccessory REPLACES the built-in attach.
            if (leadingAccessory != null) {
                leadingAccessory()
            } else if (onAttach != null) {
                NockerlIconButton(
                    icon = attachIcon,
                    contentDescription = attachContentDescription,
                    onClick = onAttach,
                    enabled = enabled,
                    tint = colors.onChromeMuted,
                    size = 36.dp,
                )
            }

            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.weight(1f),
                enabled = enabled,
                placeholder = { Text(text = placeholder, color = colors.onChromeMuted) },
                maxLines = maxLines,
                shape = NockerlPillShape,
                // Transparent borders so the field reads as part of the pill (not a
                // box-in-a-box); ink rides the chrome on-tokens, cursor is the accent.
                colors =
                    OutlinedTextFieldDefaults.colors(
                        focusedTextColor = colors.onChrome,
                        unfocusedTextColor = colors.onChrome,
                        cursorColor = accent,
                        focusedBorderColor = androidx.compose.ui.graphics.Color.Transparent,
                        unfocusedBorderColor = androidx.compose.ui.graphics.Color.Transparent,
                    ),
            )

            Spacer(modifier = Modifier.width(4.dp))

            ChatActionButton(
                sendMode = sendMode,
                enabled = enabled,
                sendContentDescription = sendContentDescription,
                micContentDescription = micContentDescription,
                onSend = {
                    onHaptic(NockerlChatInputHapticEvent.SEND)
                    override = null
                    onSend()
                },
                onMic = {
                    onHaptic(NockerlChatInputHapticEvent.MIC)
                    onMic()
                },
                onToggle = {
                    onHaptic(NockerlChatInputHapticEvent.MODE_TOGGLE)
                    override = !sendMode
                },
            )
        }
    }
}

/**
 * The trailing 48dp send/mic circle, the one refinement. Tap fires the current
 * mode; long-press flips it (routed through [longPressPop] for the pop feedback).
 * The glyph CROSS-FADES + scales between mic and send so the switch is one clean,
 * legible morph, not a same-color hard-swap.
 */
@Composable
private fun ChatActionButton(
    sendMode: Boolean,
    enabled: Boolean,
    sendContentDescription: String,
    micContentDescription: String,
    onSend: () -> Unit,
    onMic: () -> Unit,
    onToggle: () -> Unit,
) {
    val colors = LocalNockerlColors.current
    val fill =
        if (enabled) colors.accentPrimary else colors.accentPrimary.copy(alpha = DISABLED_ALPHA)
    val glyph = pickOnAccent(colors.accentPrimary)

    Box(
        contentAlignment = Alignment.Center,
        modifier =
            Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(fill)
                .longPressPop(
                    enabled = enabled,
                    onTap = { if (sendMode) onSend() else onMic() },
                    onLongPress = onToggle,
                    rippleColor = glyph,
                    haptic = true,
                ).semantics { contentDescription = if (sendMode) sendContentDescription else micContentDescription },
    ) {
        AnimatedContent(
            targetState = sendMode,
            transitionSpec = {
                // One clean morph: the incoming glyph fades + scales UP as the
                // outgoing fades + scales DOWN, on the fast/standard motion tokens.
                (
                    fadeIn(tween(NockerlMotionDuration.fastMs, easing = NockerlMotionEasing.standard)) +
                        scaleIn(
                            tween(NockerlMotionDuration.fastMs, easing = NockerlMotionEasing.standard),
                            initialScale = 0.6f,
                        )
                ).togetherWith(
                    fadeOut(tween(NockerlMotionDuration.fastMs, easing = NockerlMotionEasing.standard)) +
                        scaleOut(
                            tween(NockerlMotionDuration.fastMs, easing = NockerlMotionEasing.standard),
                            targetScale = 0.6f,
                        ),
                )
            },
            label = "nockerlChatSendMic",
        ) { isSend ->
            Icon(
                imageVector = if (isSend) Icons.AutoMirrored.Filled.Send else NockerlMicIcon,
                contentDescription = null,
                tint = glyph,
            )
        }
    }
}

/**
 * The **mic glyph** as a self-contained [ImageVector] (the standard Material mic
 * path): the send/mic circle needs a microphone, but `Icons.Filled.Mic` lives in
 * the BANNED icons-extended artifact. Built here from the path data so the
 * published module stays on icons-core; `Icon` tints the black fill.
 */
private val NockerlMicIcon: ImageVector =
    ImageVector
        .Builder(
            name = "NockerlMic",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f,
        ).addPath(
            pathData =
                PathParser()
                    .parsePathString(
                        "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" +
                            "m5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z",
                    ).toNodes(),
            fill = SolidColor(androidx.compose.ui.graphics.Color.Black),
        ).build()
