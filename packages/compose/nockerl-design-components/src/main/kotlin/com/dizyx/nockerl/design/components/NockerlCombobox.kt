package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape

/**
 * The **combobox**: pick from a list you can FILTER BY TYPING (combobox docs).
 * The input rides the shared recessed field well (the same
 * [nockerlFieldColors] treatment as every input), a persistent [label] is
 * bundled (law §14), and the platform [ExposedDropdownMenuBox] anchors the
 * option list (law §9). Filtering is live, case-insensitive substring on the
 * option label; the selected row carries the RATIFIED trailing cyan check; an
 * empty filter result shows the quiet "No matches" line (never an error color).
 *
 * Single-select v1. The multi-select token form is web-first per the page and
 * arrives with a later slice.
 *
 * @param T the option type.
 * @param label the REQUIRED persistent label.
 * @param options the full choice list (filtered live by the query).
 * @param selected the current selection, or `null`.
 * @param onSelect invoked with the picked option (fills the field, closes).
 * @param optionLabel maps an option to its display string.
 * @param modifier outer modifier (typically `fillMaxWidth()`).
 * @param placeholder hint while empty.
 * @param enabled when `false`, dimmed and non-interactive.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun <T> NockerlCombobox(
    label: String,
    options: List<T>,
    selected: T?,
    onSelect: (T) -> Unit,
    optionLabel: (T) -> String,
    modifier: Modifier = Modifier,
    placeholder: String = "Type to filter…",
    enabled: Boolean = true,
) {
    val colors = LocalNockerlColors.current
    var expanded by remember { mutableStateOf(false) }
    // The query: user-typed text; a selection replaces it with the option label.
    var query by remember(selected) { mutableStateOf(selected?.let(optionLabel) ?: "") }

    // Live case-insensitive substring filter (the ratified type-to-filter).
    val filtered =
        remember(query, options) {
            if (query.isBlank()) {
                options
            } else {
                options.filter { optionLabel(it).contains(query.trim(), ignoreCase = true) }
            }
        }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { if (enabled) expanded = it },
        modifier = modifier,
    ) {
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                expanded = true
            },
            modifier =
                Modifier
                    .fillMaxWidth()
                    .menuAnchor(type = ExposedDropdownMenuAnchorType.PrimaryEditable, enabled = enabled),
            enabled = enabled,
            label = { Text(label) },
            placeholder = { Text(placeholder) },
            singleLine = true,
            shape = NockerlControlShape,
            colors = nockerlFieldColors(),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            if (filtered.isEmpty()) {
                // Quiet empty state: informational, never error-colored.
                DropdownMenuItem(
                    text = {
                        Text(
                            text = "No matches",
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.onCardMuted,
                        )
                    },
                    onClick = {},
                    enabled = false,
                )
            } else {
                filtered.forEach { option ->
                    val isSelected = option == selected
                    DropdownMenuItem(
                        text = { Text(optionLabel(option)) },
                        onClick = {
                            expanded = false
                            query = optionLabel(option)
                            onSelect(option)
                        },
                        trailingIcon =
                            if (isSelected) {
                                {
                                    // The RATIFIED selected marker: a trailing cyan check.
                                    Icon(
                                        imageVector = Icons.Filled.Check,
                                        contentDescription = "Selected",
                                        tint = colors.accentPrimary,
                                        modifier = Modifier.size(18.dp),
                                    )
                                }
                            } else {
                                null
                            },
                    )
                }
            }
        }
    }
}
