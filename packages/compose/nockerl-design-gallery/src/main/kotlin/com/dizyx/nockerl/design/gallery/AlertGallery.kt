package com.dizyx.nockerl.design.gallery

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.airbnb.android.showkase.annotation.ShowkaseComposable
import com.dizyx.nockerl.design.components.NockerlAlertIntent
import com.dizyx.nockerl.design.components.NockerlBanner
import com.dizyx.nockerl.design.components.NockerlCallout
import com.dizyx.nockerl.design.components.NockerlCalloutTone
import com.dizyx.nockerl.design.components.NockerlFailedTurn
import com.dizyx.nockerl.design.components.NockerlThinking
import com.dizyx.nockerl.design.components.NockerlToast

/**
 * Gallery entries for the **alert family**: banner ([NockerlBanner]), toast
 * ([NockerlToast]), and callout ([NockerlCallout]), all led by the StatusDisc
 * coin over the canonical intent map.
 *
 * Toast timing/stacking is host machinery. The entries capture the VIEWS.
 *
 * @see GalleryGroup
 */

/** Every banner intent, plus the titled + action + dismiss anatomy. */
@ShowkaseComposable(name = "Banner · Intents", group = GROUP)
@Preview
@Composable
fun GalleryBanners() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlBanner(
                message = "Workspace restored from the last snapshot.",
                intent = NockerlAlertIntent.SUCCESS,
                title = "Restored",
                actionLabel = "Undo",
                onAction = {},
                onDismiss = {},
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlBanner(
                message = "A new gateway version is available.",
                intent = NockerlAlertIntent.INFO,
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlBanner(
                message = "Token budget at 85%. Long sessions may compact.",
                intent = NockerlAlertIntent.WARNING,
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlBanner(
                message = "The cluster is unreachable.",
                intent = NockerlAlertIntent.DANGER,
                onDismiss = {},
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlBanner(
                message = "Scheduled maintenance this Sunday.",
                intent = NockerlAlertIntent.NOTICE,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/** Toast states: plain, titled + action, and dismissible danger. */
@ShowkaseComposable(name = "Toast · Intents", group = GROUP)
@Preview
@Composable
fun GalleryToasts() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlToast(message = "Session saved.", intent = NockerlAlertIntent.SUCCESS)
            NockerlToast(
                message = "Model switched to the local cluster.",
                intent = NockerlAlertIntent.INFO,
                title = "Switched",
                actionLabel = "View",
                onAction = {},
            )
            NockerlToast(
                message = "Push failed: check the proxy.",
                intent = NockerlAlertIntent.DANGER,
                onDismiss = {},
            )
        }
    }
}

/** The plain callout tone ladder on the recessed well. */
@ShowkaseComposable(name = "Callout · Tones", group = GROUP)
@Preview
@Composable
fun GalleryCalloutTones() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlCallout(
                message = "The gateway retries pushes twice before surfacing an error.",
                tone = NockerlCalloutTone.NOTE,
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlCallout(
                message = "Scope pushes with --files to keep shared trees safe.",
                tone = NockerlCalloutTone.TIP,
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlCallout(
                message = "Re-recording goldens rewrites the tracked PNG tree.",
                tone = NockerlCalloutTone.WARNING,
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlCallout(
                message = "Deleting a workspace removes every session under it.",
                tone = NockerlCalloutTone.CAUTION,
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlCallout(
                message = "The registry moves to GitHub Packages next release.",
                tone = NockerlCalloutTone.NOTICE,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/** The two special callout treatments: IMPORTANT nested frames + QUOTE. */
@ShowkaseComposable(name = "Callout · Important + quote", group = GROUP)
@Preview
@Composable
fun GalleryCalloutSpecials() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            NockerlCallout(
                message =
                    "Tokens are the only source of design values: no hardcoded " +
                        "hexes, radii, or fonts in any client.",
                tone = NockerlCalloutTone.IMPORTANT,
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlCallout(
                message = "Design is thinking made visual.",
                tone = NockerlCalloutTone.QUOTE,
                cite = "Saul Bass",
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/** The calm failure grammar: lifted alert, danger coin, minimal red, retry. */
@ShowkaseComposable(name = "FailedTurn · Calm failure grammar", group = GROUP)
@Preview
@Composable
fun GalleryFailedTurn() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Bare: just "Failed" + retry (the ChatBubble delivery-failed case).
            NockerlFailedTurn(
                onRetry = {},
                modifier = Modifier.fillMaxWidth(),
            )
            // With detail (the AgentMessage stream-failed / ToolCallCard error case).
            NockerlFailedTurn(
                title = "Response failed",
                detail = "The gateway returned a 502. Your prompt was not lost.",
                onRetry = {},
                modifier = Modifier.fillMaxWidth(),
            )
            // Display-only (no action), multi-line detail.
            NockerlFailedTurn(
                title = "Tool error",
                detail = "read_file: path outside the workspace root was refused.",
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/**
 * The thinking / reasoning card: brain in a filled warm tile (not bare),
 * ONE de-nested warm card. Collapsed header + expanded (reasoning shown) states.
 */
@ShowkaseComposable(name = "Thinking · Brain tile + single card", group = GROUP)
@Preview
@Composable
fun GalleryThinking() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Collapsed (streaming): "Thinking" header only.
            NockerlThinking(
                label = "Thinking",
                onToggle = {},
                modifier = Modifier.fillMaxWidth(),
            )
            // Expanded: "Reasoning" + the chain-of-thought body.
            NockerlThinking(
                label = "Reasoning",
                reasoning =
                    "The request needs the failed turn to LIFT off the surface, " +
                        "so I reversed the recessed well to the banner material and kept the red state.",
                expanded = true,
                onToggle = {},
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
