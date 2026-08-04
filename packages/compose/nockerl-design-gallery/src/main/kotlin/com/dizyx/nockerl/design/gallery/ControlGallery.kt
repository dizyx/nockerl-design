package com.dizyx.nockerl.design.gallery

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Sync
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.airbnb.android.showkase.annotation.ShowkaseComposable
import com.dizyx.nockerl.design.components.NockerlCheckbox
import com.dizyx.nockerl.design.components.NockerlCheckboxSize
import com.dizyx.nockerl.design.components.NockerlChip
import com.dizyx.nockerl.design.components.NockerlSegmented
import com.dizyx.nockerl.design.components.NockerlSegmentedSize
import com.dizyx.nockerl.design.components.NockerlSettingsRow

/**
 * Gallery entries for the **control family**: the chip ([NockerlChip]), the
 * segmented control ([NockerlSegmented]), and the tappable settings/list row
 * ([NockerlSettingsRow]).
 *
 * Each `@ShowkaseComposable` is one gallery entry: browsable via any Showkase
 * host and rendered to a per-theme PNG by the Roborazzi screenshot test.
 *
 * @see GalleryGroup
 */

/** The chip contract (C6 union): selected, unselected, removable, and disabled. */
@ShowkaseComposable(name = "Chip · Selected + unselected", group = GROUP)
@Preview
@Composable
fun GalleryChips() {
    GalleryGroup {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NockerlChip(text = "Primary", onClick = {}, selected = true)
            NockerlChip(text = "Feature", onClick = {}, selected = false)
            NockerlChip(text = "Removable", onClick = {}, selected = false, onRemove = {})
            NockerlChip(text = "Disabled", onClick = {}, selected = false, enabled = false)
        }
    }
}

/** Option type for the segmented-control gallery entry. */
private enum class GallerySegment(
    val display: String,
) {
    ALL("All"),
    UNREAD("Unread"),
    ARCHIVED("Archived"),
}

/** A full-width 3-segment control with the middle segment active. */
@ShowkaseComposable(name = "Segmented · 3 segments", group = GROUP)
@Preview
@Composable
fun GallerySegmented() {
    GalleryGroupFullWidth {
        NockerlSegmented(
            options = GallerySegment.entries.toList(),
            selected = GallerySegment.UNREAD,
            onSelect = {},
            label = { it.display },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/**
 * Settings rows: a label-with-value row, a plain label row, and a disabled row
 * (the standardized tappable list-row silhouette).
 */
@ShowkaseComposable(name = "SettingsRow · Value + plain + disabled", group = GROUP)
@Preview
@Composable
fun GallerySettingsRows() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlSettingsRow(label = "Theme", value = "System", onClick = {})
            NockerlSettingsRow(label = "Notifications", onClick = {})
            NockerlSettingsRow(label = "Disabled", value = "Off", onClick = {}, enabled = false)
        }
    }
}

/** The accordion (B4): trailing rotating chevron, first section expanded. */
@ShowkaseComposable(name = "Accordion · Single mode", group = GROUP)
@Preview
@Composable
fun GalleryAccordion() {
    GalleryGroupFullWidth {
        com.dizyx.nockerl.design.components.NockerlAccordion(
            items =
                listOf(
                    com.dizyx.nockerl.design.components.NockerlAccordionItem("what", "What is Nockerl?") {
                        androidx.compose.material3.Text(
                            text = "An AI development platform.",
                            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                            color = com.dizyx.nockerl.design.tokens.LocalNockerlColors.current.onCardMuted,
                        )
                    },
                    com.dizyx.nockerl.design.components.NockerlAccordionItem("tokens", "How do tokens ship?") {
                        androidx.compose.material3.Text(
                            text = "As versioned packages per platform.",
                            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                            color = com.dizyx.nockerl.design.tokens.LocalNockerlColors.current.onCardMuted,
                        )
                    },
                ),
            initiallyExpanded = setOf("what"),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** The accordion header accessory: always-visible controls (count badge +
 *  delete) pinned in the COLLAPSED header, left of the chevron. They fire
 *  independently and never toggle the row. */
@ShowkaseComposable(name = "Accordion · Header accessory", group = GROUP)
@Preview
@Composable
fun GalleryAccordionHeaderAccessory() {
    GalleryGroupFullWidth {
        com.dizyx.nockerl.design.components.NockerlAccordion(
            items =
                listOf(
                    com.dizyx.nockerl.design.components.NockerlAccordionItem(
                        id = "drafts",
                        title = "Drafts",
                        headerAccessory = {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                            ) {
                                com.dizyx.nockerl.design.components.NockerlBadge(
                                    text = "3",
                                    tone = com.dizyx.nockerl.design.components.NockerlBadgeTone.ACCENT,
                                )
                                com.dizyx.nockerl.design.components.NockerlIconButton(
                                    icon = Icons.Filled.Close,
                                    contentDescription = "Delete drafts",
                                    onClick = {},
                                )
                            }
                        },
                        content = {
                            androidx.compose.material3.Text(
                                text = "Three unsaved drafts.",
                                style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                                color = com.dizyx.nockerl.design.tokens.LocalNockerlColors.current.onCardMuted,
                            )
                        },
                    ),
                ),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/**
 * Accordion · Zebra (EXPERIMENTAL opt-in): alternating-row wash. EVEN
 * (1-based) rows take onCard @ 4%, odd rows plain (light/dark/light/dark). A
 * resting surface tone beneath hairlines/selection. Default off = flat rows.
 */
@ShowkaseComposable(name = "Accordion · Zebra (experimental)", group = GROUP)
@Preview
@Composable
fun GalleryAccordionZebra() {
    GalleryGroupFullWidth {
        com.dizyx.nockerl.design.components.NockerlAccordion(
            items =
                listOf("Sampling", "Workspace", "Advanced", "About").map { t ->
                    com.dizyx.nockerl.design.components.NockerlAccordionItem(id = t, title = t) {
                        androidx.compose.material3.Text(
                            text = "$t details.",
                            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                            color = com.dizyx.nockerl.design.tokens.LocalNockerlColors.current.onCardMuted,
                        )
                    }
                },
            mode = com.dizyx.nockerl.design.components.NockerlAccordionMode.MULTIPLE,
            zebra = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** Tabs (B12): the sliding accent indicator resting under the active tab. */
@ShowkaseComposable(name = "Tabs · Sliding indicator", group = GROUP)
@Preview
@Composable
fun GalleryTabs() {
    GalleryGroupFullWidth {
        com.dizyx.nockerl.design.components.NockerlTabs(
            tabs = listOf("Sessions", "Files", "Tasks"),
            selectedIndex = 1,
            onSelect = {},
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** Enclosed tabs: the underline sits INSIDE a recessed well, never a filled pill. */
@ShowkaseComposable(name = "Tabs · Enclosed underline", group = GROUP)
@Preview
@Composable
fun GalleryTabsEnclosed() {
    GalleryGroupFullWidth {
        com.dizyx.nockerl.design.components.NockerlTabs(
            tabs = listOf("Sessions", "Files", "Tasks"),
            selectedIndex = 1,
            onSelect = {},
            variant = com.dizyx.nockerl.design.components.NockerlTabsVariant.ENCLOSED,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** The ratified tri-state checkbox ( port): off well, contained ON, distinct MIXED dash. */
@ShowkaseComposable(name = "Checkbox · Tri-state + disabled", group = GROUP)
@Preview
@Composable
fun GalleryCheckboxes() {
    GalleryGroupFullWidth {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            NockerlCheckbox(
                state = ToggleableState.Off,
                onStateChange = {},
                label = "Stream responses",
                description = "Tokens render as they arrive.",
            )
            NockerlCheckbox(
                state = ToggleableState.On,
                onStateChange = {},
                label = "Enable memory",
            )
            NockerlCheckbox(
                state = ToggleableState.Indeterminate,
                onStateChange = {},
                label = "All projects",
                description = "Some children selected.",
            )
            NockerlCheckbox(
                state = ToggleableState.On,
                onStateChange = {},
                label = "Locked setting",
                enabled = false,
                size = NockerlCheckboxSize.SM,
            )
        }
    }
}

/**
 * Segmented extensions: per-segment leading icons, a DISABLED segment
 * (dims + inert while the rest stay live), and the dense SM tier for tight
 * settings rows. The base 3-segment golden above is unchanged (defaults).
 */
@ShowkaseComposable(name = "Segmented · Icons + disabled + SM", group = GROUP)
@Preview
@Composable
fun GallerySegmentedExtensions() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            NockerlSegmented(
                options = listOf("Local", "Cloud", "Auto"),
                selected = "Local",
                onSelect = {},
                label = { it },
                segmentIcon = {
                    when (it) {
                        "Local" -> Icons.Filled.Star
                        "Cloud" -> Icons.Filled.Sync
                        else -> Icons.Filled.CheckCircle
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlSegmented(
                options = listOf("Dark", "Light", "System"),
                selected = "System",
                onSelect = {},
                label = { it },
                segmentEnabled = { it != "Light" },
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlSegmented(
                options = listOf("Off", "On"),
                selected = "On",
                onSelect = {},
                label = { it },
                size = NockerlSegmentedSize.SM,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
