// NockerlTabs: the first-class Swift sectioned-content switcher (v1.15.0).
//
// The bespoke Nockerl tabs-with-panels for SwiftUI. Ported 1:1 from the canonical web
// `NockerlTabs` (packages/react/src/composites/Tabs.tsx) + Compose `NockerlTabs.kt`: a row of
// tabs, each owning a panel that swaps in below, with ONE cyan indicator that SLIDES + resizes
// to the active tab (never a filled pill), roving keyboard nav, count badges, a
// disabled tab, an optional dirty/close affordance, and a scrollable overflow row with edge
// fades. The panel is `panelStyle`-driven (v1.16.0): `.well` (default) is a recessed FLAT
// ground (`NockerlWell(.container)`) that liftable cards sit ON, so a panel holding cards
// reads with depth, not a card-on-card blend (§2/§3); `.card` is a lifted `NockerlCard`-weight
// surface for plain content. Either way, the CONTAINED bar native `TabView` lacked (Voice's
// B12-amend trigger, 2026-07-17; NOT a §2 cyan float, since §2 is for floating-over-content).
//
// DISTINCT from ``NockerlSegmented``: that flips mutually-exclusive MODES with NO panel (one
// pill on a connected track). NockerlTabs NAVIGATE SECTION content: each tab owns a panel; the
// indicator is a thin underline. Use NockerlSegmented for a single-select toolbar; NockerlTabs
// when each option reveals its own panel.
//
// a11y is table stakes (design-laws §13; mirrors ``NockerlSelect``): the tablist is one focus
// scope; Left/Right (or Up/Down) MOVE + auto-activate (wrap, skip disabled), Home/End jump,
// Return/Space activate, typeahead first-letter, Delete closes (when closable). Inactive tabs
// are MUTED, only the ACTIVE tab gets the cyan label + underline (Android retired all-cyan tabs).
// The indicator SLIDES (transform). It never tweens its fill; under Reduce Motion it teleports.

import SwiftUI

/// The tab indicator treatment: `underline` (default, a sliding cyan line on a baseline
/// hairline) | `enclosed` (the SAME sliding underline seated inside a recessed well).
public enum NockerlTabsVariant: Equatable {
    /// The sliding cyan underline on a full-width baseline hairline.
    case underline
    /// The sliding cyan underline seated inside a recessed ``NockerlWell`` (never a filled pill).
    case enclosed
}

/// Tab height + padding + type role: `sm` (compact) | `md` (default).
public enum NockerlTabsSize: Equatable {
    case sm
    case md

    var fontSize: CGFloat { self == .sm ? NockerlFontSize.size12 : NockerlFontSize.size14 }
    var hPad: CGFloat { self == .sm ? NockerlSpace.space3 : NockerlSpace.space4 }
    var vPad: CGFloat { self == .sm ? NockerlSpace.space2 : NockerlSpace.space3 }
    var minHeight: CGFloat { self == .sm ? NockerlSpace.space8 : NockerlSpace.space10 }
}

/// How the tabs content-panel reads (v1.16.0). A container that HOLDS liftable cards is GROUND
/// (a flat well), not itself a card. Otherwise panel + cards are the same lifted-card treatment
/// and BLEND with no depth (§2/§3). So `.well` is the default.
public enum NockerlTabsPanelStyle: Equatable {
    /// A recessed, FLAT ground: a ``NockerlWell`` `.container`. Content placed inside LIFTS OFF
    /// it, so a panel holding `NockerlCard`s / form sections reads with depth instead of blending
    /// card-on-card. The DEFAULT (a tab panel is a container that holds liftable content).
    case well
    /// A lifted CARD surface (`NockerlCard`-weight: a light L1 lift + neutral hairline) for
    /// PLAIN content (text, controls) that is NOT itself a stack of liftable cards.
    case card
}

/// One tab. `value` is the stable identity emitted on selection (and the panel key); `label`
/// is the accessible name. The panel body is supplied by the ``NockerlTabs`` `panel:` builder
/// keyed on `value` (not stored here: SwiftUI panels are views, not data).
public struct NockerlTabItem: Identifiable {
    /// Stable value emitted on selection (and used as the panel key).
    public let value: String
    /// Visible label, the tab's accessible name carrier.
    public let label: String
    /// Optional leading glyph, ANY view (Voice passes its OpenRouter asset + an SF Symbol);
    /// the framework need not own the glyphs. Tints with the label via `foregroundStyle`.
    public let icon: AnyView?
    /// Optional trailing count badge (soft-accent, NOT a status color).
    public let count: Int?
    /// Inert + clearly-seen single tab (skipped by arrow keys).
    public let disabled: Bool
    /// UNSAVED marker: a small neutral trailing dot (the editor "dirty" idiom). Yields to the
    /// close affordance when the tabs are closable.
    public let dirty: Bool
    /// OPTIONAL per-tab status dot (v1.15.0), DISTINCT from the selection indicator. Marks
    /// e.g. "this tab is the active engine" even when ANOTHER tab is currently viewed. Uses the
    /// ``NockerlStatusDot`` status ladder (no cyan-for-status, law §10); leading, `.quiet` size.
    public let statusDot: NockerlStatusDotStatus?

    public var id: String { value }

    /// Create a tab item.
    /// - Parameters:
    ///   - value: stable identity + panel key.
    ///   - label: visible label + accessible name.
    ///   - icon: an OPTIONAL leading glyph. Wrap any view in `AnyView(...)`; `nil` for none.
    ///   - count: an OPTIONAL trailing count badge.
    ///   - disabled: inert + legible; skipped by arrow keys. Default `false`.
    ///   - dirty: the unsaved neutral dot. Default `false`.
    ///   - statusDot: an OPTIONAL per-tab status dot (active-engine marker), distinct from
    ///     selection. Default `nil`.
    public init(
        value: String,
        label: String,
        icon: AnyView? = nil,
        count: Int? = nil,
        disabled: Bool = false,
        dirty: Bool = false,
        statusDot: NockerlStatusDotStatus? = nil
    ) {
        self.value = value
        self.label = label
        self.icon = icon
        self.count = count
        self.disabled = disabled
        self.dirty = dirty
        self.statusDot = statusDot
    }
}

/// The first-class Nockerl tabs component. A CONTROLLED tablist (`selection` binding) of tabs,
/// each owning a panel (the `panel:` builder). See the file header for the full a11y + motion
/// contract. `Panel` is the panel body view type.
public struct NockerlTabs<Panel: View>: View {
    private let tabs: [NockerlTabItem]
    @Binding private var selection: String
    private let label: String
    private let variant: NockerlTabsVariant
    private let size: NockerlTabsSize
    private let panelStyle: NockerlTabsPanelStyle
    private let onClose: ((String) -> Void)?
    private let panel: (String) -> Panel

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var indicatorNS
    @FocusState private var tablistFocused: Bool
    @State private var overflowing = false

    /// Create a tabs component.
    /// - Parameters:
    ///   - tabs: the tabs, left-to-right.
    ///   - selection: the active tab `value` (controlled, exactly one selected).
    ///   - label: the accessible name for the whole tablist.
    ///   - variant: `underline` (default) | `enclosed`.
    ///   - size: `sm` | `md` (default).
    ///   - panelStyle: how the content panel reads: `.well` (default; a recessed FLAT ground
    ///     that liftable cards sit ON) | `.card` (a lifted surface for plain content). (v1.16.0)
    ///   - onClose: when set, tabs grow a close affordance and Delete closes the selected tab
    ///     (the host removes the tab + moves selection; this only reports the value).
    ///   - panel: the body for a tab `value` (the active tab's body is shown in the content panel).
    public init(
        tabs: [NockerlTabItem],
        selection: Binding<String>,
        label: String,
        variant: NockerlTabsVariant = .underline,
        size: NockerlTabsSize = .md,
        panelStyle: NockerlTabsPanelStyle = .well,
        onClose: ((String) -> Void)? = nil,
        @ViewBuilder panel: @escaping (String) -> Panel
    ) {
        self.tabs = tabs
        self._selection = selection
        self.label = label
        self.variant = variant
        self.size = size
        self.panelStyle = panelStyle
        self.onClose = onClose
        self.panel = panel
    }

    // MARK: - Navigation (pure, testable)

    /// The next ENABLED tab value after `value`, moving `step` (+1 / -1) with WRAP and skipping
    /// disabled tabs. `value` not found → the first (step > 0) or last enabled. Pure, the unit
    /// the keyboard model is tested against.
    public static func nextEnabled(from value: String, step: Int, in tabs: [NockerlTabItem]) -> String? {
        let enabled = tabs.filter { !$0.disabled }.map(\.value)
        guard !enabled.isEmpty else { return nil }
        guard let i = enabled.firstIndex(of: value) else { return step > 0 ? enabled.first : enabled.last }
        let n = enabled.count
        return enabled[((i + step) % n + n) % n]
    }

    private var enabledValues: [String] { tabs.filter { !$0.disabled }.map(\.value) }

    // MARK: - Body

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        VStack(alignment: .leading, spacing: 0) {
            keyboardTablist(palette)
            panelView(palette)
        }
    }

    // MARK: - Tablist (+ keyboard)

    /// The tablist wrapped in the full keyboard model (macOS 14+ where `onKeyPress` exists;
    /// pointer-only below). Mirrors ``NockerlSelect``: arrows MOVE + auto-activate, Home/End
    /// jump, typeahead first-letter, Delete closes. The whole tablist is one focus scope.
    @ViewBuilder
    private func keyboardTablist(_ palette: NockerlPalette) -> some View {
        let list = tablist(palette)
            .focusable()
            .focused($tablistFocused)
            .accessibilityElement(children: .contain)
            .accessibilityLabel(label)

        if #available(macOS 14.0, *) {
            list
                // v1.15.1: suppress macOS's default focus ring around the whole tab row; focus
                // reads via the cyan sliding underline + the selected label (the roving model).
                // Same pattern as the HUD driven-mode fix; keyboard nav + VoiceOver unchanged.
                .focusEffectDisabled()
                .onKeyPress(.leftArrow) { move(-1); return .handled }
                .onKeyPress(.rightArrow) { move(1); return .handled }
                .onKeyPress(.upArrow) { move(-1); return .handled }
                .onKeyPress(.downArrow) { move(1); return .handled }
                .onKeyPress(.home) { jump(toFirst: true); return .handled }
                .onKeyPress(.end) { jump(toFirst: false); return .handled }
                .onKeyPress(.return) { return .handled }   // selection auto-activates on move
                .onKeyPress(.space) { return .handled }
                .onKeyPress(.delete) { close(selection); return .handled }   // deletable-tabs pattern
                .onKeyPress { press in typeahead(press.characters); return .handled }
        } else {
            list
        }
    }

    @ViewBuilder
    private func tablist(_ palette: NockerlPalette) -> some View {
        switch variant {
        case .underline:
            // A baseline hairline; the row scrolls horizontally with edge fades on overflow.
            // (Auto-scroll-active-into-view on an overflowing row is deferred: v1 scrolls
            // manually; keyboard nav still moves selection + slides the indicator.)
            ScrollView(.horizontal, showsIndicators: false) {
                tabRow(palette)
                    .background(
                        GeometryReader { geo in
                            Color.clear.preference(key: NockerlTabsWidthKey.self, value: geo.size.width)
                        }
                    )
            }
            .background(
                GeometryReader { geo in
                    Color.clear.preference(key: NockerlTabsContainerWidthKey.self, value: geo.size.width)
                }
            )
            .onPreferenceChange(NockerlTabsWidthKey.self) { width in
                contentWidth = width
                overflowing = contentWidth > containerWidth + 1
            }
            .onPreferenceChange(NockerlTabsContainerWidthKey.self) { width in
                containerWidth = width
                overflowing = contentWidth > containerWidth + 1
            }
            .overlay(alignment: .leading) { edgeFade(palette, leading: true) }
            .overlay(alignment: .trailing) { edgeFade(palette, leading: false) }
            .overlay(alignment: .bottom) {
                Rectangle().fill(palette.cardHairline).frame(height: NockerlSpace.spacePx)
            }
        case .enclosed:
            // The SAME sliding underline row, seated inside a recessed well (reuses ``NockerlWell``).
            tabRow(palette)
                .nockerlWell(.field)
        }
    }

    @State private var contentWidth: CGFloat = 0
    @State private var containerWidth: CGFloat = 0

    private func tabRow(_ palette: NockerlPalette) -> some View {
        HStack(spacing: NockerlSpace.space1) {
            ForEach(tabs) { item in
                tabView(item, palette: palette)
            }
        }
        // The indicator SLIDES via matchedGeometry (transform-only, law §7); teleports under
        // Reduce Motion (still moves, just no slide). The fill never tweens.
        .animation(
            reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.base),
            value: selection
        )
    }

    private func tabView(_ item: NockerlTabItem, palette: NockerlPalette) -> some View {
        let isSelected = item.value == selection
        let ink = item.disabled
            ? palette.onCardMuted
            : (isSelected ? palette.accentPrimary : palette.onCardMuted)

        return HStack(spacing: NockerlSpace.space2) {
            if let status = item.statusDot {
                // Per-tab active-engine marker, distinct from the cyan selection underline.
                NockerlStatusDot(status: status, size: .quiet)
            }
            if let icon = item.icon {
                icon.foregroundStyle(ink)
            }
            Text(item.label)
                // Outfit token face, uniform .medium (law §11 caps weight at 500). Selection
                // reads via the cyan ink + the sliding underline, never via extra weight.
                .font(.nockerl(size: size.fontSize, weight: .medium))
                .foregroundStyle(ink)
                .lineLimit(1)
                .fixedSize()
            if let count = item.count {
                countBadge(count, isSelected: isSelected, palette: palette)
            }
            trailing(item, palette: palette)
        }
        .padding(.horizontal, size.hPad)
        .padding(.vertical, size.vPad)
        .frame(minHeight: size.minHeight)
        .opacity(item.disabled ? 0.45 : 1)
        // The sliding cyan underline: ONE element, matched across tabs so it slides to the
        // active tab; never a filled pill.
        // The underline is an indicator BAR, not an outline, so it is exempt in KIND
        // from the thin-selection-border rule and stays SOLID (its presence is ink + full-tab
        // length + weight). But 2pt read too heavy against the nav, so it takes the deliberate
        // half-step `widthIndicator`: clearly thinner than 2pt, still one step above the 1pt
        // selection borders because a 1pt underline risks reading as an accidental text-
        // underline hairline. It is the PRIMARY indicator: its job is to be seen.
        .overlay(alignment: .bottom) {
            if isSelected {
                Capsule(style: .continuous)
                    .fill(palette.accentPrimary)
                    .frame(height: NockerlBorder.widthIndicator)
                    .matchedGeometryEffect(id: "nockerlTabIndicator", in: indicatorNS)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { if !item.disabled { select(item.value) } }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(item.label)
        .accessibilityAddTraits(a11yTraits(item, isSelected: isSelected))
        .id(item.value)
    }

    /// VoiceOver traits: a disabled tab is inert (no button trait); the active tab reads as
    /// selected. (SwiftUI has no explicit tab/tablist role, so traits + labels carry it.)
    private func a11yTraits(_ item: NockerlTabItem, isSelected: Bool) -> AccessibilityTraits {
        if item.disabled { return [] }
        return isSelected ? [.isButton, .isSelected] : [.isButton]
    }

    private func countBadge(_ count: Int, isSelected: Bool, palette: NockerlPalette) -> some View {
        Text("\(count)")
            .font(.system(size: NockerlFontSize.size10, weight: .semibold))
            .foregroundStyle(isSelected ? palette.accentPrimary : palette.onCardMuted)
            .padding(.horizontal, NockerlSpace.space1)
            .frame(minWidth: NockerlSpace.space4, minHeight: NockerlSpace.space4)
            // Soft-accent when active (NOT a status color); a quiet neutral wash at rest.
            .background(
                Capsule().fill(
                    isSelected ? palette.accentPrimary.opacity(0.16) : palette.onCard.opacity(0.10)
                )
            )
    }

    @ViewBuilder
    private func trailing(_ item: NockerlTabItem, palette: NockerlPalette) -> some View {
        if onClose != nil {
            // Closable: a quiet pointer X (keyboard closes via Delete; the X stays a pointer
            // affordance). A tap target, not a focus-stealing Button.
            Image(systemName: "xmark")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(palette.onCardMuted)
                .padding(NockerlSpace.space05)
                .contentShape(Rectangle())
                .onTapGesture { close(item.value) }
                .accessibilityLabel("Close \(item.label)")
        } else if item.dirty {
            Circle()
                .fill(palette.onCardMuted)
                .frame(width: 6, height: 6)
                .accessibilityHidden(true)
        }
    }

    @ViewBuilder
    private func edgeFade(_ palette: NockerlPalette, leading: Bool) -> some View {
        if overflowing {
            LinearGradient(
                colors: leading ? [palette.canvas, .clear] : [.clear, palette.canvas],
                startPoint: .leading,
                endPoint: .trailing
            )
            .frame(width: NockerlSpace.space8)
            .allowsHitTesting(false)
        }
    }

    // MARK: - Panel

    private func panelView(_ palette: NockerlPalette) -> some View {
        // Content cross-fades on tab change (opacity is interpolatable, frozen under Reduce
        // Motion): the `.id(selection)` swap fades out/in inside the animated container.
        let body = ZStack(alignment: .topLeading) {
            panel(selection)
                .id(selection)
                .transition(.opacity)
        }
        .frame(maxWidth: .infinity, minHeight: NockerlSize.panelMin, alignment: .topLeading)
        // Content spaces itself off the panel edge (space5). This is the ONLY padding for the
        // `.well` style: `NockerlWell(.container)` is UNPADDED ground, so cards inside sit space5
        // off the edge (mirrors StylesView's listContainer); `.card` keeps the same inner pad.
        .padding(NockerlSpace.space5)

        return panelSurface(body, palette: palette)
            .padding(.top, NockerlSpace.space4)
            .animation(reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.base), value: selection)
            .accessibilityElement(children: .contain)
            .accessibilityLabel(selectedLabel)
    }

    /// The panel surface per ``NockerlTabsPanelStyle`` (v1.16.0). `.well` (default) is a recessed
    /// FLAT ground (`NockerlWell(.container)`) that liftable cards sit ON, so a panel HOLDING
    /// cards reads with depth instead of blending card-on-card (§2/§3). `.card` is a lifted
    /// `NockerlCard`-weight surface (light L1 lift + neutral `cardHairline`) for PLAIN content
    /// (NOT the §2 cyan floating edge; that is for elements floating OVER content, not a container).
    @ViewBuilder
    private func panelSurface<Content: View>(_ content: Content, palette: NockerlPalette) -> some View {
        switch panelStyle {
        case .well:
            content.nockerlWell(.container)
        case .card:
            content.nockerlSurface(
                variant: .card,
                level: .level1,
                borderColor: palette.cardHairline,
                borderWidth: NockerlSpace.spacePx
            )
        }
    }

    private var selectedLabel: String {
        tabs.first { $0.value == selection }?.label ?? label
    }

    // MARK: - Behavior

    private func select(_ value: String) {
        guard let item = tabs.first(where: { $0.value == value }), !item.disabled else { return }
        selection = value
    }

    private func move(_ step: Int) {
        if let next = Self.nextEnabled(from: selection, step: step, in: tabs) { select(next) }
    }

    private func jump(toFirst: Bool) {
        let enabled = enabledValues
        if let value = toFirst ? enabled.first : enabled.last { select(value) }
    }

    private func close(_ value: String) {
        onClose?(value)
    }

    /// Type-ahead: jump selection to the next enabled tab whose label starts with the typed run.
    private func typeahead(_ characters: String) {
        let key = characters.lowercased()
        guard key.count == 1, let scalar = key.unicodeScalars.first,
              CharacterSet.alphanumerics.contains(scalar) else { return }
        let enabled = tabs.filter { !$0.disabled }
        guard !enabled.isEmpty else { return }
        let start = (enabled.firstIndex { $0.value == selection } ?? -1) + 1
        for offset in 0..<enabled.count {
            let item = enabled[(start + offset) % enabled.count]
            if item.label.lowercased().hasPrefix(key) { select(item.value); break }
        }
    }
}

// MARK: - Overflow measurement

/// The tab ROW's content width (for the overflow edge-fade heuristic).
private struct NockerlTabsWidthKey: PreferenceKey {
    static var defaultValue: CGFloat { 0 }
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

/// The tablist CONTAINER width (compared to the row width to detect overflow).
private struct NockerlTabsContainerWidthKey: PreferenceKey {
    static var defaultValue: CGFloat { 0 }
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

#if DEBUG
struct NockerlTabs_Previews: PreviewProvider {
    private struct Demo: View {
        @State private var section = "overview"
        var body: some View {
            NockerlTabs(
                tabs: [
                    NockerlTabItem(value: "overview", label: "Overview",
                                   icon: AnyView(Image(systemName: "square.grid.2x2"))),
                    NockerlTabItem(value: "activity", label: "Activity", count: 3,
                                   statusDot: .success),
                    NockerlTabItem(value: "settings", label: "Settings"),
                    NockerlTabItem(value: "archived", label: "Archived", disabled: true),
                ],
                selection: $section,
                label: "Project sections"
            ) { value in
                Text("Panel: \(value)")
                    .font(.system(size: NockerlFontSize.size14))
            }
            .padding(NockerlSpace.space6)
            .frame(width: 460)
        }
    }

    static var previews: some View {
        Demo().previewDisplayName("NockerlTabs · underline")
    }
}
#endif
