package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * The **approval content** anatomy is the host-agnostic approval
 * body, a 1:1 mirror of the react `NockerlApprovalContent` (builder-1 owns the
 * anatomy; this is the compose implementation of the SAME contract):
 *
 * `title?` (only for header-less hosts) → `preview` → `options` → `riskNote`
 * → `actions?`: pure content, NO overlay/scrim/chrome. Sheet hosts omit
 * [actions] here and PIN [NockerlApprovalActions] in the sheet footer instead;
 * panel/dialog hosts render it inline.
 *
 * @param preview the subject being approved (tool card, command well, plan).
 * @param modifier outer modifier.
 * @param title optional heading, ONLY for hosts without their own header.
 * @param options optional decision inputs (radio/checkbox/field rows).
 * @param riskNote optional risk callout (a DANGER/WARNING banner or callout).
 * @param actions optional inline action row. Omit in sheet hosts (footer-pinned).
 */
@Composable
fun NockerlApprovalContent(
    preview: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    title: String? = null,
    options: (@Composable () -> Unit)? = null,
    riskNote: (@Composable () -> Unit)? = null,
    actions: (@Composable () -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (title != null) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = colors.onCard,
            )
        }
        preview()
        options?.invoke()
        riskNote?.invoke()
        actions?.invoke()
    }
}

/**
 * The **approval actions** row is exported SEPARATELY (mirror of the react
 * export) so sheet hosts can PIN it in [NockerlSheetFooter] while panel/dialog
 * hosts render it INLINE with no wrapper required (freeze triage: the former
 * RowScope receiver was vestigial friction and is gone pre-1.0). The ratified CTA grammar (Dialog r5 ): OUTLINE
 * confirm ([NockerlButtonVariant.TERTIARY], or [NockerlButtonVariant.DESTRUCTIVE]
 * outline-red when [destructive]) + GHOST cancel, never a filled primary.
 *
 * @param confirmLabel the confirm CTA label.
 * @param onConfirm confirm tapped.
 * @param onCancel cancel tapped.
 * @param modifier outer modifier.
 * @param cancelLabel the cancel label (default "Cancel").
 * @param destructive `true` renders the confirm as outline-red.
 * @param confirmDisabled gates the confirm (e.g. until options are answered) and
 *   wires cross-slot when the row is pinned in a sheet footer.
 */
@Composable
fun NockerlApprovalActions(
    confirmLabel: String,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
    cancelLabel: String = "Cancel",
    destructive: Boolean = false,
    confirmDisabled: Boolean = false,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        NockerlButton(
            text = cancelLabel,
            onClick = onCancel,
            variant = NockerlButtonVariant.GHOST,
        )
        NockerlButton(
            text = confirmLabel,
            onClick = onConfirm,
            enabled = !confirmDisabled,
            variant =
                if (destructive) NockerlButtonVariant.DESTRUCTIVE else NockerlButtonVariant.TERTIARY,
        )
    }
}

/**
 * The **approval sheet** is the ANDROID-IDIOM host (the RATIFIED hosting
 * stance): approvals use ONE shared
 * anatomy ([NockerlApprovalContent] + [NockerlApprovalActions]) hosted
 * platform-idiomatically. On Android / touch / mobile widths the anatomy
 * rides THIS sheet shell; web/desktop hosts it in inline panels (law §9
 * honor-the-platform; the anatomy is the drift-guard, §12). Tool / Plan /
 * AskUserQuestion approvals are VIEWS of the anatomy, never components.
 *
 * The shell: the extended [NockerlBottomSheet] with the header (title +
 * optional nested back) on top, the scrollable approval body in the middle,
 * and [NockerlApprovalActions] PINNED in the [NockerlSheetFooter] (its upward
 * scroll-under cue wired to the body's scroll state).
 *
 * @param onDismissRequest scrim/back dismissal.
 * @param title the sheet header title.
 * @param confirmLabel the pinned confirm CTA label.
 * @param onConfirm confirm tapped.
 * @param preview the subject being approved.
 * @param modifier forwarded to the sheet.
 * @param subheading optional header supporting line.
 * @param onBack optional nested-sheet back affordance.
 * @param options optional decision inputs.
 * @param riskNote optional risk callout.
 * @param cancelLabel the cancel label (cancel also dismisses).
 * @param destructive `true` = outline-red confirm.
 * @param confirmDisabled gates the pinned confirm.
 *
 * Custom sheet behavior (detents, state observation) is the escape hatch:
 * compose [NockerlBottomSheet] directly and place the anatomy + footer
 * yourself. This shell deliberately exposes NO experimental foreign types
 * (freeze triage: the former `SheetState?` param leaked M3's experimental
 * surface into a stable signature and is gone pre-1.0; the remaining OptIn is
 * implementation-side only, so no experimental type appears in this signature).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NockerlApprovalSheet(
    onDismissRequest: () -> Unit,
    title: String,
    confirmLabel: String,
    onConfirm: () -> Unit,
    preview: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    subheading: String? = null,
    onBack: (() -> Unit)? = null,
    options: (@Composable () -> Unit)? = null,
    riskNote: (@Composable () -> Unit)? = null,
    cancelLabel: String = "Cancel",
    destructive: Boolean = false,
    confirmDisabled: Boolean = false,
) {
    val scroll = rememberScrollState()

    val body: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit = {
        NockerlSheetHeader(
            title = title,
            subheading = subheading,
            onBack = onBack,
            scrolledUnder = scroll.value > 0,
        )
        Column(
            modifier =
                Modifier
                    .weight(1f, fill = false)
                    .verticalScroll(scroll)
                    .padding(horizontal = 20.dp, vertical = 12.dp),
        ) {
            NockerlApprovalContent(
                preview = preview,
                options = options,
                riskNote = riskNote,
                // No title (the sheet header carries it) and no inline actions
                // (they are PINNED in the footer below).
            )
        }
        NockerlSheetFooter(scrolledUnder = scroll.value < scroll.maxValue) {
            NockerlApprovalActions(
                confirmLabel = confirmLabel,
                onConfirm = onConfirm,
                onCancel = onDismissRequest,
                cancelLabel = cancelLabel,
                destructive = destructive,
                confirmDisabled = confirmDisabled,
            )
        }
    }

    NockerlBottomSheet(
        onDismissRequest = onDismissRequest,
        modifier = modifier,
        content = body,
    )
}
