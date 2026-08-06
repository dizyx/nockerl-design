package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlCardShape
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlSurface

/**
 * The **dialog**, the ONE modal confirm surface (R5-17 ), brought up as
 * native design-system truth mirroring the web `NockerlDialog` composite:
 *
 * - **Lifted card on the sheet rung.** A [NockerlSurface] card (16dp radius,
 *   `cardSurface1`, Level4, neutral hairline): the modal is the most lifted
 *   plane on screen.
 * - **Inset top-left icon.** The optional header mark is the
 *   [NockerlStatusDisc] `inset` variant: a RECESSED intent well ("fields
 *   sink") so nothing competes with the card's own lift. Never a raised coin
 *   here.
 * - **FLAT/OUTLINE CTAs, never a filled primary** (the r4 D1 emphasis budget,
 *   extended: lifted modal = outline actions). Confirm renders
 *   [NockerlButtonVariant.TERTIARY] (outline cyan) on the default [tone] and
 *   [NockerlButtonVariant.DESTRUCTIVE] (outline red) on
 *   [NockerlDialogTone.DESTRUCTIVE], the SAME outline treatment either way.
 *   Dismiss is the quiet [NockerlButtonVariant.GHOST].
 *
 * This is the modal HOST (a [Dialog] window + the card). For hosts that manage
 * their own windowing (and for deterministic goldens, which cannot capture a
 * modal window), compose [NockerlDialogCard] directly.
 *
 * @param onDismissRequest scrim-tap / back dismiss.
 * @param title the dialog title.
 * @param confirmLabel the confirm CTA label (outline cyan, or red when destructive).
 * @param onConfirm confirm tapped.
 * @param modifier outer modifier for the card.
 * @param body optional supporting body text.
 * @param icon optional header intent: rendered as the INSET status well.
 * @param tone default (cyan confirm) or destructive (red confirm).
 * @param dismissLabel optional dismiss CTA (ghost); `null` hides it.
 */
@Composable
fun NockerlDialog(
    onDismissRequest: () -> Unit,
    title: String,
    confirmLabel: String,
    onConfirm: () -> Unit,
    modifier: Modifier = Modifier,
    body: String? = null,
    icon: NockerlAlertIntent? = null,
    tone: NockerlDialogTone = NockerlDialogTone.DEFAULT,
    dismissLabel: String? = null,
) {
    Dialog(onDismissRequest = onDismissRequest) {
        NockerlDialogCard(
            title = title,
            confirmLabel = confirmLabel,
            onConfirm = onConfirm,
            modifier = modifier,
            body = body,
            icon = icon,
            tone = tone,
            dismissLabel = dismissLabel,
            onDismiss = onDismissRequest,
        )
    }
}

/**
 * The dialog's **card**: the lifted panel [NockerlDialog] hosts in a modal
 * window. Public so custom windowing hosts (and static captures) can compose
 * the exact same panel; all treatment lives here.
 *
 * @param title the dialog title.
 * @param confirmLabel the confirm CTA label.
 * @param onConfirm confirm tapped.
 * @param modifier outer modifier.
 * @param body optional supporting body text.
 * @param icon optional header intent: the INSET status well.
 * @param tone default (outline-cyan confirm) or destructive (outline-red).
 * @param dismissLabel optional ghost dismiss label; `null` hides it.
 * @param onDismiss dismiss tapped (required when [dismissLabel] is set).
 */
@Composable
fun NockerlDialogCard(
    title: String,
    confirmLabel: String,
    onConfirm: () -> Unit,
    modifier: Modifier = Modifier,
    body: String? = null,
    icon: NockerlAlertIntent? = null,
    tone: NockerlDialogTone = NockerlDialogTone.DEFAULT,
    dismissLabel: String? = null,
    onDismiss: (() -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current

    NockerlSurface(
        modifier = modifier,
        shape = NockerlCardShape,
        color = colors.cardSurface1,
        // The modal is the MOST lifted plane on screen, the sheet rung.
        elevation = NockerlElevation.Level4,
        border = colors.cardHairline,
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (icon != null) {
                // The INSET intent well sinks into the lifted card
                // (a raised coin would compete with the card's lift).
                NockerlStatusDisc(intent = icon, inset = true)
            }
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = colors.onCard,
            )
            if (body != null) {
                Text(
                    text = body,
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.onCardMuted,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
            ) {
                if (dismissLabel != null && onDismiss != null) {
                    NockerlButton(
                        text = dismissLabel,
                        onClick = onDismiss,
                        variant = NockerlButtonVariant.GHOST,
                    )
                }
                // The confirm is NEVER a filled primary, outline cyan
                // by default, outline red when destructive (same treatment).
                NockerlButton(
                    text = confirmLabel,
                    onClick = onConfirm,
                    variant =
                        when (tone) {
                            NockerlDialogTone.DEFAULT -> NockerlButtonVariant.TERTIARY
                            NockerlDialogTone.DESTRUCTIVE -> NockerlButtonVariant.DESTRUCTIVE
                        },
                )
            }
        }
    }
}

/** The dialog tones: drives the OUTLINE confirm's hue, never a fill. */
enum class NockerlDialogTone {
    /** Standard confirm: outline cyan ([NockerlButtonVariant.TERTIARY]). */
    DEFAULT,

    /** Irreversible confirm: outline red ([NockerlButtonVariant.DESTRUCTIVE]). */
    DESTRUCTIVE,
}
