package com.dizyx.nockerl.design.gallery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.airbnb.android.showkase.annotation.ShowkaseComposable
import com.dizyx.nockerl.design.components.NockerlAgentTranscriptPanel
import com.dizyx.nockerl.design.components.NockerlAgentWidget
import com.dizyx.nockerl.design.components.NockerlAlertIntent
import com.dizyx.nockerl.design.components.NockerlApprovalActions
import com.dizyx.nockerl.design.components.NockerlApprovalContent
import com.dizyx.nockerl.design.components.NockerlBanner
import com.dizyx.nockerl.design.components.NockerlCheckbox
import com.dizyx.nockerl.design.components.NockerlClusterGrid
import com.dizyx.nockerl.design.components.NockerlJobRow
import com.dizyx.nockerl.design.components.NockerlJobState
import com.dizyx.nockerl.design.components.NockerlNodeCell
import com.dizyx.nockerl.design.components.NockerlNodeMetric
import com.dizyx.nockerl.design.components.NockerlSpawnBlockCard
import com.dizyx.nockerl.design.components.NockerlSpawnChildCard
import com.dizyx.nockerl.design.components.NockerlSpawnStatus
import com.dizyx.nockerl.design.components.NockerlStatusDotStatus
import com.dizyx.nockerl.design.components.NockerlTodoItem
import com.dizyx.nockerl.design.components.NockerlTodoState
import com.dizyx.nockerl.design.components.NockerlTodoWidget
import com.dizyx.nockerl.design.components.NockerlTranscriptItem
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * Gallery entries for the **agent & spawn family**, tool-card-family
 * siblings: the spawn block + child cards (and the agent-run widget as it lands).
 *
 * RUNNING pulses are frozen (`animate = false`): deterministic goldens.
 *
 * @see GalleryGroup
 */

/**
 * Spawn cards: a RUNNING block with three children across the lifecycle
 * ladder (running · done · failed), plus a standalone completed block. The
 * agent-family tile leads, the status chip trails, children stack at the card
 * rhythm.
 */
@ShowkaseComposable(name = "SpawnCards · Block + children", group = GROUP)
@Preview
@Composable
fun GallerySpawnCards() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            NockerlSpawnBlockCard(
                title = "Research sweep",
                subtitle = "3 agents · large-4",
                status = NockerlSpawnStatus.RUNNING,
                elapsed = "1m 12s",
                animate = false,
            ) {
                NockerlSpawnChildCard(
                    name = "docs-reader",
                    status = NockerlSpawnStatus.SUCCESS,
                    model = "small",
                    elapsed = "24s",
                    animate = false,
                )
                NockerlSpawnChildCard(
                    name = "code-searcher",
                    status = NockerlSpawnStatus.RUNNING,
                    model = "medium",
                    elapsed = "48s",
                    animate = false,
                )
                NockerlSpawnChildCard(
                    name = "api-prober",
                    status = NockerlSpawnStatus.ERROR,
                    model = "small",
                    elapsed = "12s",
                    animate = false,
                )
            }
            NockerlSpawnBlockCard(
                title = "Golden re-baseline",
                status = NockerlSpawnStatus.SUCCESS,
                elapsed = "3m 02s",
                animate = false,
            )
        }
    }
}

/**
 * Agent-run widget: identity-led (avatar + name + mono model badge)
 * with the shared lifecycle chip: running (pulse frozen), done, failed.
 */
@ShowkaseComposable(name = "AgentWidget · Lifecycle", group = GROUP)
@Preview
@Composable
fun GalleryAgentWidget() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlAgentWidget(
                name = "Design Builder 2",
                status = NockerlSpawnStatus.RUNNING,
                model = "large-4",
                elapsed = "2m 40s",
                detail = "Recording goldens for the spawn cards",
                animate = false,
            )
            NockerlAgentWidget(
                name = "Docs Reader",
                status = NockerlSpawnStatus.SUCCESS,
                model = "small",
                elapsed = "18s",
                animate = false,
            )
            NockerlAgentWidget(
                name = "API Prober",
                status = NockerlSpawnStatus.ERROR,
                detail = "gateway 502 on /v1/models",
                animate = false,
            )
        }
    }
}

/** One UTC day in millis (fixed-epoch gallery data). */
private const val GALLERY_DAY = 86_400_000L

/**
 * Transcript panel: the composition shell, keyed lazy rows (real
 * shipped cells), a day marker at the UTC boundary, and the floating
 * jump-to-latest affordance (visible because the capture rests at the TOP of
 * an overflowing panel, deterministic). autoFollow off for the static frame.
 */
@ShowkaseComposable(name = "TranscriptPanel · Shell", group = GROUP)
@Preview
@Composable
fun GalleryTranscriptPanel() {
    val items =
        listOf(
            NockerlTranscriptItem(key = "m1", epochMillis = GALLERY_DAY * 100 + 1_000L) {
                NockerlSpawnChildCard(
                    name = "docs-reader",
                    status = NockerlSpawnStatus.SUCCESS,
                    model = "small",
                    elapsed = "24s",
                    animate = false,
                    modifier = Modifier.fillMaxWidth(),
                )
            },
            NockerlTranscriptItem(key = "m2", epochMillis = GALLERY_DAY * 100 + 2_000L) {
                NockerlSpawnChildCard(
                    name = "code-searcher",
                    status = NockerlSpawnStatus.SUCCESS,
                    model = "medium",
                    elapsed = "48s",
                    animate = false,
                    modifier = Modifier.fillMaxWidth(),
                )
            },
            NockerlTranscriptItem(key = "m3", epochMillis = GALLERY_DAY * 101 + 1_000L) {
                NockerlAgentWidget(
                    name = "API Prober",
                    status = NockerlSpawnStatus.ERROR,
                    detail = "gateway 502 on /v1/models",
                    animate = false,
                    modifier = Modifier.fillMaxWidth(),
                )
            },
            NockerlTranscriptItem(key = "m4", epochMillis = GALLERY_DAY * 101 + 2_000L) {
                NockerlSpawnChildCard(
                    name = "retry-prober",
                    status = NockerlSpawnStatus.RUNNING,
                    model = "small",
                    elapsed = "8s",
                    animate = false,
                    modifier = Modifier.fillMaxWidth(),
                )
            },
        )
    GalleryGroupFullWidth {
        NockerlAgentTranscriptPanel(
            items = items,
            autoFollow = false,
            dayLabel = { if (it == GALLERY_DAY * 101) "Saturday" else "Friday" },
            modifier = Modifier.fillMaxWidth().height(170.dp),
        )
    }
}

/**
 * Approval anatomy configs: TOOL approval (mono command preview +
 * DANGER risk banner + destructive outline confirm) and ASK-USER (checkbox
 * options + a DISABLED confirm until answered). The anatomy is captured
 * directly (the modal sheet host has no stable golden frame: the DialogCard
 * precedent); in the sheet, the actions row is PINNED in the SheetFooter.
 */
@ShowkaseComposable(name = "ApprovalContent · Tool + ask-user", group = GROUP)
@Preview
@Composable
fun GalleryApprovalContent() {
    val colors = LocalNockerlColors.current
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // TOOL approval, destructive.
            NockerlApprovalContent(
                title = "Run shell command?",
                preview = {
                    Text(
                        text = "rm -rf build/ && ./gradlew clean",
                        style = MaterialTheme.typography.bodySmall,
                        fontFamily = FontFamily.Monospace,
                        color = colors.onCard,
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.canvasAlt)
                                .padding(12.dp),
                    )
                },
                riskNote = {
                    NockerlBanner(
                        message = "Deletes the build directory irreversibly.",
                        intent = NockerlAlertIntent.DANGER,
                        modifier = Modifier.fillMaxWidth(),
                    )
                },
                actions = {
                    Row {
                        NockerlApprovalActions(
                            confirmLabel = "Run",
                            onConfirm = {},
                            onCancel = {},
                            destructive = true,
                        )
                    }
                },
            )
            // ASK-USER: options gate the confirm.
            NockerlApprovalContent(
                title = "Which providers should stay enabled?",
                preview = {
                    Text(
                        text = "The session keeps only the providers you select.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onCardMuted,
                    )
                },
                options = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        NockerlCheckbox(
                            state = ToggleableState.On,
                            onStateChange = {},
                            label = "Local cluster",
                        )
                        NockerlCheckbox(
                            state = ToggleableState.Off,
                            onStateChange = {},
                            label = "OpenRouter",
                        )
                    }
                },
                actions = {
                    Row {
                        NockerlApprovalActions(
                            confirmLabel = "Apply",
                            onConfirm = {},
                            onCancel = {},
                            confirmDisabled = true,
                        )
                    }
                },
            )
        }
    }
}

/**
 * Job / notification rows: the ListItem-grammar shell across states,
 * UNREAD success (full voice + count badge), READ warning (dimmed ink), READ
 * error, and QUEUED (muted clock). The RUNNING spinner is motion, so it is
 * deliberately NOT captured (the search-field precedent); the state is
 * documented instead.
 */
@ShowkaseComposable(name = "JobRow · States + read-unread", group = GROUP)
@Preview
@Composable
fun GalleryJobRow() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            NockerlJobRow(
                title = "Index rebuilt",
                detail = "finished in 4m 12s · 3,412 documents",
                state = NockerlJobState.SUCCESS,
                time = "2m ago",
                unread = true,
                count = 3,
            )
            NockerlJobRow(
                title = "Token budget at 85%",
                detail = "long sessions may compact",
                state = NockerlJobState.WARNING,
                time = "18m ago",
            )
            NockerlJobRow(
                title = "Push failed",
                detail = "the proxy returned 502",
                state = NockerlJobState.ERROR,
                time = "1h ago",
            )
            NockerlJobRow(
                title = "Nightly re-baseline",
                state = NockerlJobState.QUEUED,
                time = "queued",
            )
        }
    }
}

/**
 * Cluster mosaic: NodeCell tiles wrap in the grid shell. Each tile
 * carries a health dot + name + role badge, then mono metric values with a
 * sparkline trend and gauge-band pressure bars (cyan < .60 / amber < .85 /
 * red), shown across the status ladder.
 */
@ShowkaseComposable(name = "ClusterGrid · Node mosaic", group = GROUP)
@Preview
@Composable
fun GalleryClusterGrid() {
    GalleryGroupFullWidth {
        NockerlClusterGrid {
            NockerlNodeCell(
                name = "node-1 · GB10",
                status = NockerlStatusDotStatus.SUCCESS,
                statusLabel = "online",
                badge = "GPU · prod",
                metrics =
                    listOf(
                        NockerlNodeMetric("MEM", "87 / 119 GB", ratio = 0.73f),
                        NockerlNodeMetric("UTIL", "62%", series = listOf(0.2f, 0.5f, 0.4f, 0.8f, 0.6f, 0.9f)),
                    ),
            )
            NockerlNodeCell(
                name = "node-2 · GB10",
                status = NockerlStatusDotStatus.WARNING,
                statusLabel = "degraded",
                badge = "GPU · sandbox",
                metrics =
                    listOf(
                        NockerlNodeMetric("MEM", "112 / 119 GB", ratio = 0.94f),
                        NockerlNodeMetric("TEMP", "83 C", ratio = 0.55f),
                    ),
            )
        }
    }
}

/**
 * Todo widget: the read-only plan card. It carries a mono count, the
 * cyan segments meter (filled done cells read as progress, not status), and the
 * step ladder: done (dimmed, seen ink), blocked (warm reason line), pending
 * (muted ring). The RUNNING spinner is motion, so it is deliberately NOT
 * captured (the search-field precedent); the state is documented instead.
 */
@ShowkaseComposable(name = "TodoWidget · Plan progress", group = GROUP)
@Preview
@Composable
fun GalleryTodoWidget() {
    GalleryGroupFullWidth {
        NockerlTodoWidget(
            title = "Release checklist",
            items =
                listOf(
                    NockerlTodoItem("Record goldens", NockerlTodoState.DONE),
                    NockerlTodoItem("Push the compose mirror", NockerlTodoState.DONE),
                    NockerlTodoItem(
                        "Bless the site VRT baselines",
                        NockerlTodoState.BLOCKED,
                        detail = "waiting on the both-themes eyeball",
                    ),
                    NockerlTodoItem("Report to the PM", NockerlTodoState.PENDING),
                ),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/**
 * The PLAN approval view (per the ratified one-anatomy stance): the
 * anatomy's preview slot carries the rendered plan content (the host app
 * renders its markdown; representative structured text here) with the standard
 * outline confirm. It is a VIEW of the anatomy, never a separate component.
 */
@ShowkaseComposable(name = "ApprovalContent · Plan", group = GROUP)
@Preview
@Composable
fun GalleryApprovalPlan() {
    val colors = LocalNockerlColors.current
    GalleryGroupFullWidth {
        NockerlApprovalContent(
            title = "Approve this plan?",
            preview = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.canvasAlt)
                            .padding(12.dp),
                ) {
                    Text(
                        text = "Migrate the settings screens",
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.onCard,
                    )
                    Text(
                        text =
                            "1. Adopt NockerlFormSection on all four panes\n" +
                                "2. Swap the provider selector to NockerlSegmented\n" +
                                "3. Replace hand-rolled tips with NockerlInfoTip",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onCardMuted,
                    )
                }
            },
            actions = {
                Row {
                    NockerlApprovalActions(
                        confirmLabel = "Approve plan",
                        onConfirm = {},
                        onCancel = {},
                    )
                }
            },
        )
    }
}
