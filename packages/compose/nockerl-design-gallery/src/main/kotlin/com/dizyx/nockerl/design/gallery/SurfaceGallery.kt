package com.dizyx.nockerl.design.gallery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.airbnb.android.showkase.annotation.ShowkaseComposable
import com.dizyx.nockerl.design.components.NockerlAccordion
import com.dizyx.nockerl.design.components.NockerlAccordionItem
import com.dizyx.nockerl.design.components.NockerlAlertIntent
import com.dizyx.nockerl.design.components.NockerlAppShell
import com.dizyx.nockerl.design.components.NockerlAppShellLayout
import com.dizyx.nockerl.design.components.NockerlBottomSheet
import com.dizyx.nockerl.design.components.NockerlButton
import com.dizyx.nockerl.design.components.NockerlButtonSize
import com.dizyx.nockerl.design.components.NockerlButtonVariant
import com.dizyx.nockerl.design.components.NockerlChip
import com.dizyx.nockerl.design.components.NockerlDialogCard
import com.dizyx.nockerl.design.components.NockerlDialogTone
import com.dizyx.nockerl.design.components.NockerlEmptyState
import com.dizyx.nockerl.design.components.NockerlFacetedBackground
import com.dizyx.nockerl.design.components.NockerlFormSection
import com.dizyx.nockerl.design.components.NockerlInsetIcon
import com.dizyx.nockerl.design.components.NockerlInsetIconTone
import com.dizyx.nockerl.design.components.NockerlLeadingStatusMark
import com.dizyx.nockerl.design.components.NockerlListItemRow
import com.dizyx.nockerl.design.components.NockerlNavSurface
import com.dizyx.nockerl.design.components.NockerlNavSurfaceStyle
import com.dizyx.nockerl.design.components.NockerlSettingsRow
import com.dizyx.nockerl.design.components.NockerlSheetFooter
import com.dizyx.nockerl.design.components.NockerlSheetGrip
import com.dizyx.nockerl.design.components.NockerlSheetHeader
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlCard
import com.dizyx.nockerl.design.tokens.NockerlSurface
import com.dizyx.nockerl.design.tokens.nockerlSurfaceGradient

/**
 * Gallery entries for the **surface + list family**: the lifted card
 * ([NockerlCard]), the lower-level surface primitive with a gradient
 * ([NockerlSurface]), the shared list row grammar ([NockerlListItemRow] +
 * [NockerlLeadingStatusMark]) across the palette's task-status ladder, and the
 * bottom-sheet grip ([NockerlSheetGrip]).
 *
 * [NockerlBottomSheet] itself is deliberately NOT an entry: it is a modal
 * `ModalBottomSheet` host that needs a window to attach to, which a static
 * capture cannot show meaningfully. The grip + the alt-plane tokens it uses
 * are showcased instead (same coverage the canonical app gallery had).
 *
 * Each `@ShowkaseComposable` is one gallery entry, browsable via any Showkase
 * host and rendered to a per-theme PNG by the Roborazzi screenshot test.
 *
 * @see GalleryGroup
 */

/** The standard lifted card with the shared lit-from-above material + hairline. */
@ShowkaseComposable(name = "Card · Lifted surface", group = GROUP)
@Preview
@Composable
fun GalleryCard() {
    GalleryGroupFullWidth {
        NockerlCard(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(text = "Nockerl design system")
                Text(text = "A lifted card: tinted drop shadow below, catch-light on top.")
            }
        }
    }
}

/**
 * The lower-level [NockerlSurface] primitive carrying the top-lit
 * [nockerlSurfaceGradient] sheen used on agent/team cards.
 */
@ShowkaseComposable(name = "Surface · Gradient sheen", group = GROUP)
@Preview
@Composable
fun GallerySurfaceGradient() {
    GalleryGroupFullWidth {
        NockerlSurface(
            modifier = Modifier.fillMaxWidth(),
            gradient = nockerlSurfaceGradient(),
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(text = "Agent surface")
                Text(text = "NockerlSurface with the cardSurface2 -> cardSurface1 gradient.")
            }
        }
    }
}

/**
 * The shared list-row grammar shown once per task-status slot of the palette's
 * categorical [com.dizyx.nockerl.design.tokens.TaskColors], so every
 * [NockerlLeadingStatusMark] (icon + semantic color) is visible side by side:
 * the unified leading mark from Design Review #1, Decision 4. Icons mirror
 * client #1's status mapping; the colors are the library's own token slots.
 */
@ShowkaseComposable(name = "ListItem · Leading status marks", group = GROUP)
@Preview
@Composable
fun GalleryListItemStatusMarks() {
    GalleryGroupFullWidth {
        val task = LocalNockerlColors.current.task
        val marks =
            listOf(
                Triple("Todo", Icons.Outlined.RadioButtonUnchecked, task.statusTodo),
                Triple("In progress", Icons.Filled.Sync, task.statusInProgress),
                Triple("Blocked", Icons.Filled.Block, task.statusBlocked),
                Triple("Done", Icons.Filled.CheckCircle, task.statusDone),
                Triple("Cancelled", Icons.Filled.Cancel, task.statusCancelled),
            )
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            marks.forEach { (name, icon, tint) ->
                NockerlListItemRow(
                    leadingMark = {
                        NockerlLeadingStatusMark(
                            icon = icon,
                            tint = tint,
                            contentDescription = name,
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(text = name)
                }
            }
        }
    }
}

/** The bottom-sheet drag handle: the on-palette `.sheet-grip` bar. */
@ShowkaseComposable(name = "BottomSheet · Grip", group = GROUP)
@Preview
@Composable
fun GalleryBottomSheetGrip() {
    GalleryGroupFullWidth {
        NockerlSheetGrip()
    }
}

/** The signature faceted field. Frame-0 (phase 0) is deterministic. */
@ShowkaseComposable(name = "FacetedBackground · Signature field", group = GROUP)
@Preview
@Composable
fun GalleryFacetedBackground() {
    GalleryGroupFullWidth {
        Box(modifier = Modifier.fillMaxWidth().height(220.dp)) {
            // animate = false → frozen at phase 0, so the golden is deterministic
            // (an infinite transition has no stable Roborazzi capture frame).
            NockerlFacetedBackground(modifier = Modifier.matchParentSize(), animate = false)
        }
    }
}

/** The informational inset-icon treatment ( / law ): the 3 ratified tones. */
@ShowkaseComposable(name = "InsetIcon · Informational tones", group = GROUP)
@Preview
@Composable
fun GalleryInsetIcon() {
    GalleryGroup {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            NockerlInsetIcon(
                icon = Icons.Filled.Search,
                contentDescription = "No results",
                tone = NockerlInsetIconTone.NEUTRAL,
            )
            NockerlInsetIcon(
                icon = Icons.Filled.Add,
                contentDescription = "Get started",
                tone = NockerlInsetIconTone.BRAND,
            )
            NockerlInsetIcon(
                icon = Icons.Filled.Warning,
                contentDescription = "Failed to load",
                tone = NockerlInsetIconTone.ERROR,
            )
        }
    }
}

/** The empty state ( first host): inset mark -> title -> description -> action. */
@ShowkaseComposable(name = "EmptyState · Inset mark + copy + action", group = GROUP)
@Preview
@Composable
fun GalleryEmptyState() {
    GalleryGroupFullWidth {
        NockerlEmptyState(
            icon = Icons.Filled.Search,
            title = "No sessions yet",
            description = "Start a conversation and it will show up here.",
            tone = NockerlInsetIconTone.BRAND,
            action = {
                NockerlButton(
                    text = "New session",
                    onClick = {},
                    size = NockerlButtonSize.SM,
                )
            },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** Sheet header: the persistent hairline (resting) + the on-scroll elevation cue. */
@ShowkaseComposable(name = "SheetHeader · Scroll-under separation", group = GROUP)
@Preview
@Composable
fun GallerySheetHeader() {
    GalleryGroupFullWidth {
        val colors = LocalNockerlColors.current
        val gradient = Brush.verticalGradient(listOf(colors.cardAlt, colors.canvasAlt))
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            // RESTING: only the neutral hairline separates the header.
            Column(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(gradient),
            ) {
                NockerlSheetHeader(title = "Settings", subheading = "Resting - hairline only")
                Spacer(modifier = Modifier.height(48.dp))
            }
            // SCROLLED-UNDER: the elevation cue fades in below the hairline.
            Column(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(gradient),
            ) {
                NockerlSheetHeader(
                    title = "Cluster",
                    subheading = "Content scrolled beneath - cue on",
                    scrolledUnder = true,
                )
                Spacer(modifier = Modifier.height(48.dp))
            }
        }
    }
}

/**
 * Sheet header with the optional LEADING ICON: a plain functional glyph
 * on the title line, neutral on-plane ink. Never a status disc, never cyan. The
 * divider below is UNCHANGED (a separate entry so the scroll-under golden stays
 * pristine). With and without a subheading (which indents past the icon).
 */
@ShowkaseComposable(name = "SheetHeader · Leading icon", group = GROUP)
@Preview
@Composable
fun GallerySheetHeaderLeadingIcon() {
    GalleryGroupFullWidth {
        val colors = LocalNockerlColors.current
        val gradient = Brush.verticalGradient(listOf(colors.cardAlt, colors.canvasAlt))
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(gradient),
            ) {
                NockerlSheetHeader(
                    title = "Settings",
                    leadingIcon = Icons.Filled.Settings,
                )
                Spacer(modifier = Modifier.height(40.dp))
            }
            Column(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(gradient),
            ) {
                NockerlSheetHeader(
                    title = "Sync",
                    subheading = "Subheading indents past the icon",
                    leadingIcon = Icons.Filled.Sync,
                )
                Spacer(modifier = Modifier.height(40.dp))
            }
        }
    }
}

/** NavSurface: the ONE translucent nav-rail floated over the facet ground. */
@ShowkaseComposable(name = "NavSurface · Translucent rail over facet", group = GROUP)
@Preview
@Composable
fun GalleryNavSurface() {
    GalleryGroupFullWidth {
        val colors = LocalNockerlColors.current
        Box(modifier = Modifier.fillMaxWidth().height(260.dp)) {
            // The OPAQUE faceted ground (frozen for a deterministic golden).
            NockerlFacetedBackground(modifier = Modifier.matchParentSize(), animate = false)
            // The ONE translucent layer: the sidebar surface. The facet whispers through.
            NockerlNavSurface(width = 180.dp) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(text = "Sessions", color = colors.onChrome)
                    Text(text = "Files", color = colors.onChromeMuted)
                    Text(text = "Tasks", color = colors.onChromeMuted)
                    Text(text = "Settings", color = colors.onChromeMuted)
                }
            }
        }
    }
}

/**
 * Dialog card (R5-17 ): the lifted modal panel, with an INSET header icon (the
 * recessed intent well, never a raised coin on the lifted card) + FLAT/OUTLINE
 * CTAs (outline-cyan confirm on default, outline-red on destructive, never a
 * filled primary). Captured via [NockerlDialogCard] (a modal window has no
 * stable capture frame; the BottomSheet precedent).
 */
@ShowkaseComposable(name = "Dialog · Inset icon + outline CTAs", group = GROUP)
@Preview
@Composable
fun GalleryDialogCard() {
    GalleryGroupFullWidth {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            NockerlDialogCard(
                title = "Fork session?",
                body = "A copy of this session continues from the current turn.",
                icon = NockerlAlertIntent.INFO,
                confirmLabel = "Fork",
                onConfirm = {},
                dismissLabel = "Cancel",
                onDismiss = {},
                modifier = Modifier.fillMaxWidth(),
            )
            NockerlDialogCard(
                title = "Delete workspace?",
                body = "Every session under it is removed. This cannot be undone.",
                icon = NockerlAlertIntent.DANGER,
                tone = NockerlDialogTone.DESTRUCTIVE,
                confirmLabel = "Delete",
                onConfirm = {},
                dismissLabel = "Cancel",
                onDismiss = {},
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/**
 * NavSurface SOLID option (R5-14 ): the opaque `chromeSurface` rail, matching
 * the top bar, NO see-through (side-by-side foil to the translucent default above;
 * both options are token-driven).
 */
@ShowkaseComposable(name = "NavSurface · Solid rail (opaque option)", group = GROUP)
@Preview
@Composable
fun GalleryNavSurfaceSolid() {
    GalleryGroupFullWidth {
        val colors = LocalNockerlColors.current
        Box(modifier = Modifier.fillMaxWidth().height(260.dp)) {
            // Same frozen facet ground, but the SOLID rail hides it completely.
            NockerlFacetedBackground(modifier = Modifier.matchParentSize(), animate = false)
            NockerlNavSurface(width = 180.dp, surface = NockerlNavSurfaceStyle.SOLID) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(text = "Sessions", color = colors.onChrome)
                    Text(text = "Files", color = colors.onChromeMuted)
                    Text(text = "Tasks", color = colors.onChromeMuted)
                    Text(text = "Settings", color = colors.onChromeMuted)
                }
            }
        }
    }
}

/** AppShell, ANDROID preset: top bar present + rail nav; brand owned by the nav. */
@ShowkaseComposable(name = "AppShell · Android preset (top bar + rail)", group = GROUP)
@Preview
@Composable
fun GalleryAppShellAndroid() {
    GalleryGroupFullWidth {
        val colors = LocalNockerlColors.current
        Box(modifier = Modifier.fillMaxWidth().height(300.dp)) {
            NockerlAppShell(
                layout = NockerlAppShellLayout.RAIL,
                topBarTitle = "Sessions",
                animateBackground = false, // deterministic golden (the  lesson)
                nav = {
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Text(text = "S", color = colors.onChrome)
                        Text(text = "F", color = colors.onChromeMuted)
                        Text(text = "T", color = colors.onChromeMuted)
                    }
                },
            ) {
                NockerlCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Content region on the facet ground.",
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        }
    }
}

/** AppShell, VOICE preset: LEFT-NAV ONLY, no top bar; the nav owns the brand lockup. */
@ShowkaseComposable(name = "AppShell · Voice preset (left-nav only)", group = GROUP)
@Preview
@Composable
fun GalleryAppShellVoice() {
    GalleryGroupFullWidth {
        val colors = LocalNockerlColors.current
        Box(modifier = Modifier.fillMaxWidth().height(300.dp)) {
            NockerlAppShell(
                layout = NockerlAppShellLayout.EXPANDED,
                topBarTitle = null, // the Voice preset: NO top bar
                product = "Voice",
                animateBackground = false, // deterministic golden
                nav = {
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(text = "Dictation", color = colors.onChrome)
                        Text(text = "History", color = colors.onChromeMuted)
                        Text(text = "Settings", color = colors.onChromeMuted)
                    }
                },
            ) {
                NockerlCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Voice: left-nav only, brand in the nav.",
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        }
    }
}

/**
 * The settings-section grammar: [NockerlFormSection] with the two new
 * slots, a trailing HEADER ACCESSORY on the eyebrow (where an info tip rides;
 * a plain glyph here) and a FOOTER under the card hairline (hint text). The base
 * form-section golden is unchanged (both slots default null).
 */
@ShowkaseComposable(name = "FormSection · Settings slots", group = GROUP)
@Preview
@Composable
fun GalleryFormSectionSettings() {
    GalleryGroupFullWidth {
        val colors = LocalNockerlColors.current
        NockerlFormSection(
            title = "Transcription",
            description = "Provider and endpoint",
            headerAccessory = {
                Icon(
                    imageVector = Icons.Filled.Info,
                    contentDescription = "About transcription",
                    tint = colors.onCardMuted,
                    modifier = Modifier.size(16.dp),
                )
            },
            footer = {
                Text(
                    text = "Changes apply to the next recording.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onCardMuted,
                )
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            NockerlSettingsRow(label = "Provider", value = "Local model", onClick = {})
            NockerlSettingsRow(label = "Endpoint", value = "localhost:8080", onClick = {})
        }
    }
}

/**
 * The VocabRow COMPOSITION ( gate 3, deliberately NOT a component): an
 * expandable vocabulary row is [NockerlAccordion] (single-open, rotating
 * chevron: the disclosure canon) whose item content is a [NockerlChip] strip
 * (the misspelling tags). Everything here is existing canon; a dedicated
 * component only becomes warranted if adoption audits show this shell
 * hand-rolled with drift.
 */
@ShowkaseComposable(name = "VocabRow · Accordion + chips composition", group = GROUP)
@Preview
@Composable
fun GalleryVocabRowComposition() {
    GalleryGroupFullWidth {
        NockerlAccordion(
            items =
                listOf(
                    NockerlAccordionItem(id = "nockerl", title = "Nockerl") {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NockerlChip(text = "Nockerel", onClick = {}, onRemove = {})
                            NockerlChip(text = "Knockerl", onClick = {}, onRemove = {})
                            NockerlChip(text = "Nokerl", onClick = {}, onRemove = {})
                        }
                    },
                    NockerlAccordionItem(id = "dizyx", title = "Dizyx") {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NockerlChip(text = "Disyx", onClick = {}, onRemove = {})
                        }
                    },
                ),
            initiallyExpanded = setOf("nockerl"),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/**
 * Sheet footer + nested-back header: the header leads with the back
 * chevron; the PINNED footer never scrolls away. Its inverted separation cue
 * (hairline on top + shadow fading UP, shown engaged here) signals content
 * still scrolls beneath. Actions carry the ratified CTA grammar (outline
 * confirm / ghost cancel).
 */
@ShowkaseComposable(name = "SheetFooter · Pinned actions + back", group = GROUP)
@Preview
@Composable
fun GallerySheetFooter() {
    GalleryGroupFullWidth {
        val colors = LocalNockerlColors.current
        val gradient = Brush.verticalGradient(listOf(colors.cardAlt, colors.canvasAlt))
        Column(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(gradient),
        ) {
            NockerlSheetHeader(
                title = "Approve tool",
                subheading = "Nested view - back returns to the parent sheet",
                onBack = {},
            )
            Spacer(modifier = Modifier.height(56.dp))
            NockerlSheetFooter(scrolledUnder = true) {
                NockerlButton(text = "Cancel", onClick = {}, variant = NockerlButtonVariant.GHOST)
                NockerlButton(text = "Approve", onClick = {}, variant = NockerlButtonVariant.TERTIARY)
            }
        }
    }
}
