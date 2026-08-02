package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The shared **NockerlListItem grammar**: the one row vocabulary every Nockerl
 * list speaks, ratified in Design Review #1 (Decision 4).
 *
 * Decision 4 keeps the two list *identities* deliberately distinct: tasks render
 * as a dense flat **tree** (chevrons, indentation, ticket numbers); notifications
 * as lifted, collapsible **cards**. It unifies the one bit that was arbitrary:
 * the **leading status mark**. Tasks used an 18dp status icon, notifications an
 * 8dp colored dot. The decision is that *both* adopt the same small status
 * **icon** ("shape + color beats color-only for accessibility"), via this one
 * shared grammar.
 *
 * This file therefore provides exactly two shared pieces, and nothing that would
 * collapse the two layouts into one:
 * - [NockerlLeadingStatusMark], the unified leading status mark: a status ICON
 *   at the canonical [NockerlListItemDefaults.LeadingMarkSize], tinted by a
 *   semantic status color. This is the single carrier of a row's status.
 * - [NockerlListItemRow], the row *scaffolding*: a leading-mark slot, a content
 *   slot, and an optional trailing slot, with the canonical leading→content gap
 *   and shared vertical centering. Each list fills [content] with its own
 *   distinct anatomy (ticket # + title + subtask badge for tasks; source badge +
 *   title + time-ago for notifications), so the card-vs-tree identity is fully
 *   preserved: only the leading mark + spacing are unified.
 *
 * Status colors and icons MUST come from the consumer's semantic status
 * mappings over the token palette (e.g. a `statusIcon()` / `statusColor()`
 * pair), never a raw call-site `Color(0x…)` or a hardcoded icon size.
 */
object NockerlListItemDefaults {
    /**
     * Canonical size of the leading status mark across every list: small enough
     * to keep the dense task tree tight, large enough to read a shape (not just a
     * color). Inherited from the task list's original 18dp status icon, now the
     * one shared value so every list marks status identically.
     */
    val LeadingMarkSize: Dp = 18.dp

    /** Canonical gap between the leading status mark and the row content. */
    val LeadingGap: Dp = 10.dp
}

/**
 * The unified **leading status mark**: a status [icon] rendered at the canonical
 * [NockerlListItemDefaults.LeadingMarkSize] and tinted by [tint].
 *
 * This is the shared leading mark every list row uses (Decision 4): an icon, not
 * a color-only dot, so status reads by *shape and* color. The caller supplies the
 * icon and tint from its own semantic status tokens: a task list passes
 * `statusIcon(task.status)` / `statusColor(task.status)`; an inbox passes its
 * notification-status icon + color. So this composable carries no status logic
 * of its own, only the shared geometry.
 *
 * @param icon the status icon (from a semantic `statusIcon`-style mapping).
 * @param tint the status color (from a semantic `statusColor`-style token).
 * @param contentDescription accessibility label for the status (e.g. the status
 *   display name); pass `null` only when an adjacent label already names it.
 * @param modifier optional modifier for the mark.
 * @param size override the mark size; defaults to the canonical shared size.
 */
@Composable
fun NockerlLeadingStatusMark(
    icon: ImageVector,
    tint: Color,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    size: Dp = NockerlListItemDefaults.LeadingMarkSize,
) {
    Icon(
        imageVector = icon,
        contentDescription = contentDescription,
        modifier = modifier.size(size),
        tint = tint,
    )
}

/**
 * Shared row **scaffolding** for the NockerlListItem grammar: a leading status
 * mark, then the row content, with an optional trailing slot, all vertically
 * centered and separated by the canonical [NockerlListItemDefaults.LeadingGap].
 *
 * This unifies the *leading-mark placement and spacing* across lists while
 * leaving each list's body entirely its own: [content] is a [RowScope] the caller
 * fills with whatever its layout needs (a task tree puts a ticket number,
 * title, and subtask badge here; an inbox card puts a source badge, title,
 * time-ago, and chevron here). The card-vs-tree distinction lives in those bodies
 * and in the surfaces that wrap this row, never here.
 *
 * The row applies no padding, height, background, or click of its own: callers
 * supply those via [modifier] so a tree's fixed dense row height and a card's
 * inner padding both keep working unchanged.
 *
 * @param leadingMark the leading status mark, typically a [NockerlLeadingStatusMark].
 * @param modifier outer modifier (height, padding, click) supplied by the caller.
 * @param trailing optional trailing content pinned after [content] (e.g. a chevron).
 * @param content the row body, laid out in a [androidx.compose.foundation.layout.RowScope]
 *   between the leading mark and any [trailing] content.
 */
@Composable
fun NockerlListItemRow(
    leadingMark: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    trailing: (@Composable () -> Unit)? = null,
    content: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        leadingMark()
        Spacer(modifier = Modifier.width(NockerlListItemDefaults.LeadingGap))
        content()
        trailing?.invoke()
    }
}
