package com.dizyx.nockerl.design.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlBorder
import com.dizyx.nockerl.design.tokens.NockerlBorderOpacity
import com.dizyx.nockerl.design.tokens.NockerlControlShape
import com.dizyx.nockerl.design.tokens.nockerlRecessedSurface

/**
 * The **select**: pick ONE from a fixed list (select docs). The
 * trigger is the shared recessed field well ("fields sink"): `canvasAlt` inset on
 * the 12dp control radius with a hairline border, a persistent [label] above
 * (never placeholder-as-label, law §14), and a trailing chevron that ROTATES on
 * open (transform, law §7). Options open in the platform [DropdownMenu]
 * (law §9) where the selected row carries the RATIFIED trailing cyan check:
 * selection is marked by the check, never by color alone.
 *
 * @param T the option type.
 * @param label the REQUIRED persistent label above the trigger.
 * @param options the choices, in order.
 * @param selected the current selection, or `null` for the placeholder state.
 * @param onSelect invoked with the picked option (the menu closes itself).
 * @param optionLabel maps an option to its display string.
 * @param modifier outer modifier (typically `fillMaxWidth()`).
 * @param placeholder shown muted while nothing is selected.
 * @param enabled when `false`, dimmed and non-interactive.
 */
@Composable
fun <T> NockerlSelect(
    label: String,
    options: List<T>,
    selected: T?,
    onSelect: (T) -> Unit,
    optionLabel: (T) -> String,
    modifier: Modifier = Modifier,
    placeholder: String = "Select…",
    enabled: Boolean = true,
) {
    val colors = LocalNockerlColors.current
    var expanded by remember { mutableStateOf(false) }
    // Chevron rotation is the open affordance (interpolatable transform only).
    val chevronAngle by animateFloatAsState(
        targetValue = if (expanded) 180f else 0f,
        label = "nockerlSelectChevron",
    )
    val valueText = selected?.let(optionLabel)

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = colors.onCardMuted,
        )
        Box {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .defaultMinSize(minHeight = SELECT_MIN_HEIGHT)
                        .nockerlRecessedSurface(shape = NockerlControlShape)
                        .background(
                            if (enabled) colors.canvasAlt else colors.canvasAlt.copy(alpha = DISABLED_ALPHA),
                        ).border(
                            // OPEN is a SELECTION state, not a floating edge: the trigger
                            // stays IN the page (it is not hovering on top of content), so the cyan
                            // takes the thin selection weight at the softened selection alpha. The
                            // resting edge is a NEUTRAL hairline, not a selection outline, so it
                            // keeps its own full-strength 1dp.
                            width = if (expanded) NockerlBorder.widthSelection else 1.dp,
                            color =
                                if (expanded) {
                                    colors.accentPrimary.copy(alpha = NockerlBorderOpacity.selection)
                                } else {
                                    colors.cardHairline
                                },
                            shape = NockerlControlShape,
                        ).clip(NockerlControlShape)
                        .clickable(enabled = enabled) { expanded = true }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = valueText ?: placeholder,
                    style = MaterialTheme.typography.bodyMedium,
                    color =
                        when {
                            !enabled -> colors.onCardMuted.copy(alpha = DISABLED_ALPHA)
                            valueText == null -> colors.onCardMuted
                            else -> colors.onCard
                        },
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    imageVector = Icons.Filled.KeyboardArrowDown,
                    contentDescription = null, // state is carried by the menu semantics
                    tint = colors.onCardMuted,
                    modifier = Modifier.rotate(chevronAngle),
                )
            }
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
            ) {
                options.forEach { option ->
                    val isSelected = option == selected
                    DropdownMenuItem(
                        text = { Text(optionLabel(option)) },
                        onClick = {
                            expanded = false
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

/** Trigger minimum height: the `size.minTouch` 44dp floor. */
private val SELECT_MIN_HEIGHT = 44.dp
