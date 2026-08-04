package com.dizyx.nockerl.design.gallery

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.airbnb.android.showkase.annotation.ShowkaseComposable
import com.dizyx.nockerl.design.components.NockerlCombobox
import com.dizyx.nockerl.design.components.NockerlExtendedFab
import com.dizyx.nockerl.design.components.NockerlFab
import com.dizyx.nockerl.design.components.NockerlFabAction
import com.dizyx.nockerl.design.components.NockerlFabMenu
import com.dizyx.nockerl.design.components.NockerlFabSize
import com.dizyx.nockerl.design.components.NockerlFormSection
import com.dizyx.nockerl.design.components.NockerlSelect
import com.dizyx.nockerl.design.components.NockerlSettingsRow
import com.dizyx.nockerl.design.components.NockerlStep
import com.dizyx.nockerl.design.components.NockerlStepper
import com.dizyx.nockerl.design.components.NockerlStepperOrientation
import com.dizyx.nockerl.design.components.NockerlTextField

/**
 * Gallery entries for the **action + form-scaffold family**: the FAB ramp
 * ([NockerlFab] / [NockerlExtendedFab], ratified solid accent, B13), the lifted
 * form section ([NockerlFormSection], B8), and the select trigger
 * ([NockerlSelect], C5: the open menu is a popup and cannot be statically
 * captured; the trigger states are).
 *
 * @see GalleryGroup
 */

/** The FAB ramp (small/standard/large + extended) on the ratified solid accent. */
@ShowkaseComposable(name = "Fab · Sizes + extended", group = GROUP)
@Preview
@Composable
fun GalleryFabs() {
    GalleryGroup {
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            NockerlFab(
                icon = Icons.Filled.Add,
                contentDescription = "New session",
                onClick = {},
                size = NockerlFabSize.SMALL,
            )
            NockerlFab(
                icon = Icons.Filled.Add,
                contentDescription = "New session",
                onClick = {},
            )
            NockerlFab(
                icon = Icons.Filled.Add,
                contentDescription = "New session",
                onClick = {},
                size = NockerlFabSize.LARGE,
            )
            NockerlExtendedFab(
                text = "Compose",
                onClick = {},
                icon = Icons.AutoMirrored.Filled.Send,
            )
        }
    }
}

/** The FAB speed-dial, expanded: each row is ONE cohesive lifted pill. */
@ShowkaseComposable(name = "Fab · Speed-dial menu", group = GROUP)
@Preview
@Composable
fun GalleryFabMenu() {
    GalleryGroup {
        NockerlFabMenu(
            icon = Icons.Filled.Add,
            contentDescription = "Create",
            expanded = true,
            onExpandedChange = {},
            actions =
                listOf(
                    NockerlFabAction(Icons.AutoMirrored.Filled.Send, "New session") {},
                    NockerlFabAction(Icons.Filled.Star, "New team") {},
                    NockerlFabAction(Icons.Filled.Search, "Search") {},
                ),
        )
    }
}

/** The lifted form section: eyebrow + description + fields on the card. */
@ShowkaseComposable(name = "FormSection · Lifted card", group = GROUP)
@Preview
@Composable
fun GalleryFormSection() {
    GalleryGroupFullWidth {
        NockerlFormSection(
            title = "Gateway",
            description = "Connection settings for the execution plane.",
            modifier = Modifier.fillMaxWidth(),
        ) {
            NockerlTextField(
                value = "nockerl.dizyx.com",
                onValueChange = {},
                label = "Host",
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlSettingsRow(label = "Streaming", value = "Enabled", onClick = {})
        }
    }
}

/** Select trigger states: placeholder, selected value, and disabled. */
@ShowkaseComposable(name = "Select · Trigger states", group = GROUP)
@Preview
@Composable
fun GallerySelects() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlSelect(
                label = "Model",
                options = listOf("Large", "Medium", "Small"),
                selected = null,
                onSelect = {},
                optionLabel = { it },
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlSelect(
                label = "Model",
                options = listOf("Large", "Medium", "Small"),
                selected = "Medium",
                onSelect = {},
                optionLabel = { it },
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlSelect(
                label = "Model",
                options = listOf("Large"),
                selected = "Large",
                onSelect = {},
                optionLabel = { it },
                enabled = false,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/** Combobox trigger states (C5 sibling of Select): empty, selected, disabled. */
@ShowkaseComposable(name = "Combobox · Trigger states", group = GROUP)
@Preview
@Composable
fun GalleryComboboxes() {
    GalleryGroupFullWidth {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlCombobox(
                label = "Model",
                options = listOf("Large", "Medium", "Small"),
                selected = null,
                onSelect = {},
                optionLabel = { it },
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlCombobox(
                label = "Model",
                options = listOf("Large", "Medium", "Small"),
                selected = "Medium",
                onSelect = {},
                optionLabel = { it },
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlCombobox(
                label = "Model",
                options = listOf("Large"),
                selected = "Large",
                onSelect = {},
                optionLabel = { it },
                enabled = false,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/** Pickers: a fixed-past month + a fixed time keep the goldens stable. */
@ShowkaseComposable(name = "DatePicker · Contract", group = GROUP)
@Preview
@Composable
fun GalleryDatePicker() {
    GalleryGroupFullWidth {
        com.dizyx.nockerl.design.components.NockerlDatePicker(
            // 2025-06-15 UTC, a FIXED past month so the today-marker never
            // enters the captured grid (golden determinism).
            selectedDateMillis = 1_749_945_600_000L,
            onDateSelected = {},
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** The range MODE: a FIXED past range (2025-06-10 → 2025-06-20) for determinism. */
@ShowkaseComposable(name = "DatePicker · Range mode", group = GROUP)
@Preview
@Composable
fun GalleryDateRangePicker() {
    GalleryGroupFullWidth {
        com.dizyx.nockerl.design.components.NockerlDateRangePicker(
            // Fixed past range so the today-marker never enters the grid.
            startDateMillis = 1_749_513_600_000L, // 2025-06-10 UTC
            endDateMillis = 1_750_377_600_000L, // 2025-06-20 UTC
            onRangeSelected = { _, _ -> },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** The M3 clock dial under the shared contract (fixed 9:30, 24h pinned). */
@ShowkaseComposable(name = "TimePicker · Contract", group = GROUP)
@Preview
@Composable
fun GalleryTimePicker() {
    GalleryGroupFullWidth {
        com.dizyx.nockerl.design.components.NockerlTimePicker(
            hour = 9,
            minute = 30,
            onTimeSelected = { _, _ -> },
            minuteStep = 5,
            is24Hour = true,
        )
    }
}

/** The stepper (B14): CYAN progress discs (horizontal, mid-flow). */
@ShowkaseComposable(name = "Stepper · Horizontal", group = GROUP)
@Preview
@Composable
fun GalleryStepperHorizontal() {
    GalleryGroupFullWidth {
        NockerlStepper(
            steps =
                listOf(
                    NockerlStep("Connect"),
                    NockerlStep("Configure"),
                    NockerlStep("Review"),
                    NockerlStep("Launch"),
                ),
            current = 2,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** The vertical stepper with descriptions + an error state on the current step. */
@ShowkaseComposable(name = "Stepper · Vertical + error", group = GROUP)
@Preview
@Composable
fun GalleryStepperVertical() {
    GalleryGroupFullWidth {
        NockerlStepper(
            steps =
                listOf(
                    NockerlStep(
                        "Connect",
                        description = "Gateway reachable.",
                    ),
                    NockerlStep(
                        "Verify",
                        description = "Credentials could not be validated.",
                    ),
                    NockerlStep("Finish"),
                ),
            current = 1,
            orientation = NockerlStepperOrientation.VERTICAL,
            errorAt = 1,
        )
    }
}
