package com.dizyx.nockerl.design.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlMotionDuration
import com.dizyx.nockerl.design.tokens.NockerlMotionEasing

/**
 * The standardized **accordion**, a few collapsible sections on the ratified
 * disclosure grammar: ONE grammar on every platform, a single
 * **THE disclosure-grammar reference.** The family (Accordion,
 * ListItem-expandable, ToolCallCard accordion, Panel/Well collapse) shares ONE
 * grammar: a TRAILING chevron-down rotating 180° + a vertical reveal, BOTH on
 * the base duration + standard easing motion tokens. The other three quad
 * members live app-side today and adopt this exact spec at extraction.
 *
 * **trailing chevron that ROTATES** 180° on expand (a transform, law §7: the
 * Compose icon-swap and Voice's leading chevron-swap idioms are both retired),
 * and a [mode] param: [NockerlAccordionMode.SINGLE] (default; opening one
 * closes the rest) or [NockerlAccordionMode.MULTIPLE] (independent sections).
 *
 * Reduced-motion-safe: the rotation and the height reveal are interpolatable
 * transforms driven by the animation system, so the OS-level "remove
 * animations" setting (animator scale 0) snaps them instantly.
 *
 * Use an accordion for a FEW collapsible sections, a tree for recursive
 * nesting, a plain list for flat rows (tree.mdx do/don't).
 *
 * @param items the sections, in order.
 * @param modifier outer modifier (typically `fillMaxWidth()`).
 * @param mode single-open (default) or multiple-open.
 * @param initiallyExpanded ids expanded on first composition (uncontrolled; the
 *   `defaultExpanded` semantic). Ignored when [expanded] is supplied.
 * @param expanded CONTROLLED expansion: when non-null the caller HOISTS the
 *   open-id set (drive it to auto-open a newly-added item; observe it to react); pair
 *   with [onExpandedChange]. Null = the self-managed (uncontrolled) accordion.
 * @param onExpandedChange fires with the requested next open-id set on a toggle.
 * @param zebra EXPERIMENTAL opt-in: an alternating-row wash (EVEN 1-based
 *   rows take onCard @ 4%; odd rows plain), a resting surface tone BENEATH the
 *   hairlines/selection. Default false = flat rows, byte-identical. NOT ratified.
 */
@Composable
fun NockerlAccordion(
    items: List<NockerlAccordionItem>,
    modifier: Modifier = Modifier,
    mode: NockerlAccordionMode = NockerlAccordionMode.SINGLE,
    initiallyExpanded: Set<String> = emptySet(),
    expanded: Set<String>? = null,
    onExpandedChange: ((Set<String>) -> Unit)? = null,
    zebra: Boolean = false,
) {
    val colors = LocalNockerlColors.current
    var internalExpanded by remember { mutableStateOf(initiallyExpanded) }
    val currentExpanded = expanded ?: internalExpanded

    Column(modifier = modifier) {
        items.forEachIndexed { index, item ->
            val isExpanded = item.id in currentExpanded
            // The ONE chevron: trailing, rotating (transform only, law §7).
            val chevronAngle by animateFloatAsState(
                targetValue = if (isExpanded) 180f else 0f,
                // The ONE disclosure motion: base duration + standard ease,
                // identical to the Swift accordion and the whole reveal below.
                animationSpec = tween(NockerlMotionDuration.baseMs, easing = NockerlMotionEasing.standard),
                label = "nockerlAccordionChevron",
            )
            //  zebra: EXPERIMENTAL alternating wash on EVEN (1-based) rows.
            val zebraColor = if (zebra && index % 2 == 1) colors.onCard.copy(alpha = 0.04f) else Color.Transparent

            androidx.compose.foundation.layout.Column(modifier = Modifier.fillMaxWidth().background(zebraColor)) {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .defaultMinSize(minHeight = ACCORDION_HEADER_MIN_HEIGHT)
                            .clickable {
                                val next = resolveAccordionExpansion(currentExpanded, item.id, mode)
                                if (onExpandedChange != null) onExpandedChange(next) else internalExpanded = next
                            }.semantics {
                                stateDescription = if (isExpanded) "Expanded" else "Collapsed"
                            }.padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.onCard,
                        modifier = Modifier.weight(1f),
                    )
                    // The always-visible header accessory: a sibling AFTER the
                    // weighted title, BEFORE the chevron. Its own interactive controls
                    // consume their taps, so they fire independently and never toggle the
                    // row (the Compose mechanic for the react "outside the toggle" rule).
                    item.headerAccessory?.invoke()
                    Icon(
                        imageVector = Icons.Filled.KeyboardArrowDown,
                        contentDescription = null, // state carried by stateDescription
                        tint = colors.onCardMuted,
                        modifier = Modifier.rotate(chevronAngle),
                    )
                }

                AnimatedVisibility(
                    visible = isExpanded,
                    // Reveal rides the SAME base/standard spec as the chevron: one
                    // disclosure grammar, matching the Swift rail.
                    enter =
                        expandVertically(
                            animationSpec = tween(NockerlMotionDuration.baseMs, easing = NockerlMotionEasing.standard),
                        ),
                    exit =
                        shrinkVertically(
                            animationSpec = tween(NockerlMotionDuration.baseMs, easing = NockerlMotionEasing.standard),
                        ),
                ) {
                    Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                        item.content()
                    }
                }
            }

            if (index < items.lastIndex) {
                HorizontalDivider(color = colors.cardHairline)
            }
        }
    }
}

/** One accordion section. */
data class NockerlAccordionItem(
    /** Stable identity. */
    val id: String,
    /** The header title. */
    val title: String,
    /**
     * ALWAYS-VISIBLE header controls pinned to the trailing edge, LEFT of the
     * chevron: a delete [NockerlIconButton] + a count [NockerlBadge]. Their
     * own clicks are consumed, so they fire independently and never toggle the row.
     * Present collapsed AND expanded. `null` = none. Declared BEFORE [content] so the
     * trailing-lambda `NockerlAccordionItem(id, title) { … }` call form still binds
     * the lambda to [content].
     */
    val headerAccessory: (@Composable () -> Unit)? = null,
    /** The collapsible body. */
    val content: @Composable () -> Unit,
)

/** The ratified disclosure modes (B4). */
enum class NockerlAccordionMode {
    /** One section open at a time: opening one closes the rest (the default). */
    SINGLE,

    /** Sections open and close independently. */
    MULTIPLE,
}

/**
 * The shared expansion semantics (identical on Swift): toggle [id]; in
 * [NockerlAccordionMode.SINGLE] an open section replaces the set, so at most
 * one id survives. Internal + pure so the contract is testable.
 */
internal fun resolveAccordionExpansion(
    current: Set<String>,
    id: String,
    mode: NockerlAccordionMode,
): Set<String> =
    when {
        id in current -> current - id
        mode == NockerlAccordionMode.SINGLE -> setOf(id)
        else -> current + id
    }

/** Header rows honor the 44dp touch floor (`size.minTouch`). */
private val ACCORDION_HEADER_MIN_HEIGHT = 44.dp
