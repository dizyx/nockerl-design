// NockerlAccordion: a few collapsible sections (ratified B4, adjudication 2026-07-02).
//
// ONE disclosure grammar on every platform: a single TRAILING chevron that ROTATES
// 180° on expand (a transform, law §7). Voice's old leading chevron.right/down
// icon-swap is retired. A `mode` selects single-open (default) or multiple-open.
//
//  (mirrors the ratified react AccordionItem 1:1 on the semantic contract, not
// mechanics): a per-item `headerAccessory` (always-visible header controls: a
// delete button + count badge, which fire INDEPENDENTLY and never toggle the row)
// + EXTERNAL expansion (`expanded:` binding) so a host can drive/observe which
// sections are open (e.g. auto-open a freshly-added item). The react per-item
// `expanded`/`onExpandedChange`/`defaultExpanded` maps to this group's idiom: the
// controlled `expanded: Binding<Set<String>>` (like `NockerlToggle`'s `isOn:`) vs
// the uncontrolled, self-managed `initiallyExpanded` (= `defaultExpanded`).
//
// Reduced-motion-safe: the rotation + reveal animate only when Reduce Motion is off;
// otherwise state changes snap. Expansion semantics are identical to Compose
// (`resolveAccordionExpansion`, the same pure function, tested on both rails).

import SwiftUI

/// One accordion section.
public struct NockerlAccordionItem: Identifiable {
    /// Stable identity.
    public let id: String
    /// The header title.
    public let title: String
    /// The collapsible body (type-erased so sections can differ).
    public let content: AnyView
    /// ALWAYS-VISIBLE header controls pinned to the trailing edge, LEFT of the
    /// chevron, rendered OUTSIDE the toggle so interactive controls (a
    /// delete `NockerlIconButton`, a count `NockerlBadge`) fire independently and
    /// NEVER toggle the row. Present collapsed AND expanded. `nil` = none.
    public let headerAccessory: AnyView?

    /// Create a section (no header accessory).
    public init(id: String, title: String, @ViewBuilder content: () -> some View) {
        self.id = id
        self.title = title
        self.content = AnyView(content())
        self.headerAccessory = nil
    }

    /// Create a section with an always-visible header accessory.
    /// - Parameters:
    ///   - headerAccessory: trailing header controls (left of the chevron). Their
    ///     own taps fire independently; they never toggle the row.
    public init(
        id: String,
        title: String,
        @ViewBuilder headerAccessory: () -> some View,
        @ViewBuilder content: () -> some View
    ) {
        self.id = id
        self.title = title
        self.headerAccessory = AnyView(headerAccessory())
        self.content = AnyView(content())
    }
}

/// The ratified disclosure modes (B4).
public enum NockerlAccordionMode: Equatable {
    /// One section open at a time: opening one closes the rest (the default).
    case single
    /// Sections open and close independently.
    case multiple
}

/// The shared expansion semantics (identical to Compose): toggle `id`; in
/// `.single` an open section replaces the set. Internal + pure = testable.
func resolveAccordionExpansion(
    current: Set<String>,
    id: String,
    mode: NockerlAccordionMode
) -> Set<String> {
    if current.contains(id) { return current.subtracting([id]) }
    if mode == .single { return [id] }
    return current.union([id])
}

/// A few collapsible sections with the ratified trailing rotating chevron.
public struct NockerlAccordion: View {
    private let items: [NockerlAccordionItem]
    private let mode: NockerlAccordionMode
    private let initiallyExpanded: Set<String>
    private let externalExpanded: Binding<Set<String>>?
    private let zebra: Bool

    /// Create an accordion.
    /// - Parameters:
    ///   - items: the sections, in order.
    ///   - mode: single-open (default) or multiple-open.
    ///   - initiallyExpanded: ids expanded on first appearance (uncontrolled; the
    ///     `defaultExpanded` semantic). Ignored when [expanded] is supplied.
    ///   - expanded: CONTROLLED expansion. When set, the host owns the set
    ///     of open ids (drive it to auto-open a newly-added item; observe it to
    ///     react). Omit for the self-managed (uncontrolled) accordion.
    public init(
        items: [NockerlAccordionItem],
        mode: NockerlAccordionMode = .single,
        initiallyExpanded: Set<String> = [],
        expanded: Binding<Set<String>>? = nil,
        zebra: Bool = false
    ) {
        self.items = items
        self.mode = mode
        self.initiallyExpanded = initiallyExpanded
        self.externalExpanded = expanded
        self.zebra = zebra
    }

    public var body: some View {
        AccordionBody(
            items: items,
            mode: mode,
            initiallyExpanded: initiallyExpanded,
            externalExpanded: externalExpanded,
            zebra: zebra
        )
    }

    private struct AccordionBody: View {
        let items: [NockerlAccordionItem]
        let mode: NockerlAccordionMode
        let initiallyExpanded: Set<String>
        let externalExpanded: Binding<Set<String>>?
        let zebra: Bool

        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.accessibilityReduceMotion) private var reduceMotion
        @State private var internalExpanded: Set<String>

        init(
            items: [NockerlAccordionItem],
            mode: NockerlAccordionMode,
            initiallyExpanded: Set<String>,
            externalExpanded: Binding<Set<String>>?,
            zebra: Bool
        ) {
            self.zebra = zebra
            self.items = items
            self.mode = mode
            self.initiallyExpanded = initiallyExpanded
            self.externalExpanded = externalExpanded
            _internalExpanded = State(initialValue: initiallyExpanded)
        }

        /// Controlled (the host's binding) when provided, else the internal state.
        private var expandedSet: Set<String> {
            externalExpanded?.wrappedValue ?? internalExpanded
        }

        /// Toggle an id, writing back to whichever store owns expansion. Reduced
        /// motion snaps; otherwise the rotation + reveal ease.
        private func toggle(_ id: String) {
            let next = resolveAccordionExpansion(current: expandedSet, id: id, mode: mode)
            if reduceMotion {
                apply(next)
            } else {
                withAnimation(.nockerlStandard(NockerlMotionDuration.base)) { apply(next) }
            }
        }

        private func apply(_ next: Set<String>) {
            if let external = externalExpanded {
                external.wrappedValue = next
            } else {
                internalExpanded = next
            }
        }

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)

            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    let isExpanded = expandedSet.contains(item.id)
                    //  zebra, an EXPERIMENTAL alternating-row wash on EVEN
                    // (1-based) rows: onCard @ 4%, a resting surface tone beneath the
                    // hairlines/selection. Default off = byte-identical.
                    let zebraFill = (zebra && index % 2 == 1) ? palette.onCard.opacity(0.04) : Color.clear

                    VStack(spacing: 0) {
                    // The header is a SIBLING layout: the title is the ONE
                    // named toggle; the accessory sits OUTSIDE it (left of the
                    // chevron) so its own taps never toggle; the chevron is a
                    // redundant toggle affordance, hidden from assistive tech.
                    HStack(spacing: NockerlSpace.space2) {
                        Button {
                            toggle(item.id)
                        } label: {
                            HStack(spacing: 0) {
                                Text(item.title)
                                    .font(.nockerl(size: NockerlFontSize.size14, weight: .light))
                                    .foregroundColor(palette.onCard)
                                Spacer(minLength: 0)
                            }
                            .frame(minHeight: NockerlSize.minTouch)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityValue(isExpanded ? "Expanded" : "Collapsed")

                        // The always-visible accessory: independent taps.
                        if let accessory = item.headerAccessory {
                            accessory
                        }

                        // The ONE chevron: trailing, rotating (transform, law §7).
                        // A redundant toggle affordance: the title button is the
                        // named toggle, so this is hidden from AT.
                        Button {
                            toggle(item.id)
                        } label: {
                            Image(systemName: "chevron.down")
                                .font(.system(size: NockerlFontSize.size12, weight: .medium))
                                .foregroundColor(palette.onCardMuted)
                                .rotationEffect(.degrees(isExpanded ? 180 : 0))
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityHidden(true)
                    }
                    .padding(.horizontal, NockerlSpace.space4)

                    if isExpanded {
                        item.content
                            .padding(.horizontal, NockerlSpace.space4)
                            .padding(.vertical, NockerlSpace.space2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    }
                    .background(zebraFill)

                    if index < items.count - 1 {
                        Rectangle()
                            .fill(palette.cardHairline)
                            .frame(height: NockerlSpace.spacePx)
                    }
                }
            }
        }
    }
}
