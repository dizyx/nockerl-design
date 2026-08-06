// NockerlHudStyleSelector: the opt-in, keyboard-first EXPAND-UP style drawer for the
// recording HUD (spec: hud-selector-drawer-spec.md, the design lead  + Q4 to Q6). Additive:
// a consumer passes `styleSelector:` to `NockerlRecordingHUD`; omit it (default `nil`)
// and the base HUD is BYTE-IDENTICAL (G1/G2: the drawer view is never constructed).
//
// Law compliance: §2 (the `border.width.floating` cyan edge on the panel CONTAINER, because
// the drawer floats over content; its ROWS take the thin `border.width.selection` instead, per
// : the signature border rides the container only, never every child), §4 (the drawer
// is a 12px control-radius PANEL, not a pill), §5 (solid `chromeSurface`, no frost), §6
// (the selected row reads by OUTLINE: accent border + accent ink + trailing check, NO
// wash), §7 (open/close animate height+opacity; the chevron rotates; the cursor's ink
// crossfades), §9 (macOS-native ↑/↓ navigate, Return/Space commit, Esc/Tab dismiss,
// focus-trapped).
//
// v1.17.0: THE KEYBOARD CURSOR IS INK, NOT A BOX. It used to draw an inset neutral
// border, which put TWO competing rectangles in one small floating pill whenever the cursor
// sat off the selected row. Now: arrowing moves cyan INK, committing moves the BOX (border +
// check). One box on screen, never two. Same "state reads by ink, not extra chrome or
// weight" principle as the v1.16.2 tab-label fix and the border-weight normalization.

import SwiftUI

/// A dictation style the drawer can switch to. `id` is the consumer's own identifier;
/// `label` is the row text; `systemImage` is an OPTIONAL leading SF Symbol (icon =
/// shape+color dual-code, law §6, never a bare colored dot).
public struct NockerlHudStyle: Identifiable, Equatable {
    /// The consumer's opaque style id (framework ships no style taxonomy, law §12).
    public let id: String
    /// The row label.
    public let label: String
    /// Optional leading SF Symbol; `nil` renders label-only.
    public let systemImage: String?

    /// Create a style.
    public init(id: String, label: String, systemImage: String? = nil) {
        self.id = id
        self.label = label
        self.systemImage = systemImage
    }
}

/// Opt-in configuration for the HUD's expand-up style drawer (additive). Passing this to
/// ``NockerlRecordingHUD/init(phase:elapsedLabel:levels:errorMessage:transcribingLabel:pausedLabel:resultPastedLabel:resultCopiedLabel:showBrand:animate:animateBars:showsCancel:cancelLabel:accessibilityLabel:entrance:styleSelector:onCancel:)``
/// equips the pill with a keyboard-first drawer that expands UPWARD to switch the active
/// dictation style. Omit it (default `nil`) and the base HUD is unchanged.
public struct NockerlHudStyleSelector {
    /// The switchable styles, in display order (top-to-bottom in the drawer).
    public let styles: [NockerlHudStyle]
    /// The currently-active style's `id` (the resting label + the checked row).
    public let selectedID: String
    /// Two-way open state: the HOST owns it; the drawer reads + toggles it. Default-closed.
    @Binding public var isOpen: Bool
    /// `true` (default) shows a trailing disclosure chevron + the active style label INSIDE
    /// the pill's constant-height content band; `false` keeps the pill visually identical to
    /// base (the drawer is keyboard-only). (Q4)
    public let showsResting: Bool
    /// VoiceOver label for the drawer container.
    public let accessibilityLabel: String
    /// Fired when a style is COMMITTED (Return / Space / click), NOT on arrow-navigation.
    public let onSelect: (NockerlHudStyle) -> Void
    /// OPTIONAL host-controlled highlight (v1.13.0). The HUD ships in a `.nonactivatingPanel`
    /// that never becomes key, so the drawer's INTERNAL keyboard can never fire. A host that
    /// owns the event capture drives up/down by writing the highlighted style `id` here.
    /// `nil` (the default, every existing call site) = the drawer keeps its own internal
    /// `@State` highlight + `DrawerKeyboard`, UNCHANGED. Non-`nil` = the drawer reads the
    /// highlight from this binding and STANDS DOWN its internal keyboard (a pure view: the
    /// host drives nav via ``nextHighlight(from:direction:in:)`` and commits via `onSelect`).
    public let highlightedID: Binding<String?>?

    /// Create a selector config.
    public init(
        styles: [NockerlHudStyle],
        selectedID: String,
        isOpen: Binding<Bool>,
        showsResting: Bool = true,
        accessibilityLabel: String = "Dictation style",
        onSelect: @escaping (NockerlHudStyle) -> Void,
        highlightedID: Binding<String?>? = nil
    ) {
        self.styles = styles
        self.selectedID = selectedID
        self._isOpen = isOpen
        self.showsResting = showsResting
        self.accessibilityLabel = accessibilityLabel
        self.onSelect = onSelect
        self.highlightedID = highlightedID
    }

    /// The active style (or the first, if the id is stale).
    var activeStyle: NockerlHudStyle? {
        styles.first { $0.id == selectedID } ?? styles.first
    }

    /// PURE host-nav helper (v1.13.0): the next highlighted style `id` after moving up/down,
    /// matching the drawer's INTERNAL wrap semantics EXACTLY (so host-driven nav == internal
    /// nav, no drift). `current == nil` (or not found) → the natural end for the direction:
    /// `.down` → the first row, `.up` → the last.
    public static func nextHighlight(
        from current: String?,
        direction: NockerlHudHighlightDirection,
        in styles: [NockerlHudStyle]
    ) -> String? {
        guard !styles.isEmpty else { return nil }
        let ids = styles.map(\.id)
        guard let index = current.flatMap({ id in ids.firstIndex(of: id) }) else {
            return direction == .down ? ids.first : ids.last
        }
        let delta = direction == .down ? 1 : -1
        let n = ids.count
        return ids[((index + delta) % n + n) % n]
    }
}

/// The direction the HOST moves the HUD drawer's keyboard highlight (v1.13.0 controlled mode).
public enum NockerlHudHighlightDirection: Equatable {
    /// Move the highlight up one row (wraps top → bottom), mirroring the internal `↑`.
    case up
    /// Move the highlight down one row (wraps bottom → top), mirroring the internal `↓`.
    case down
}

/// The expand-up drawer PANEL (internal, rendered by ``NockerlRecordingHUD`` only when the
/// selector is open, so the base HUD never constructs it). Solid `chromeSurface`, the §2
/// cyan edge, 12px control radius; rows read selection by outline (§6).
struct NockerlHudStyleDrawer: View {
    let selector: NockerlHudStyleSelector

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    /// The keyboard-cursor row (cyan INK, never a box; the box belongs to selection alone).
    @State private var highlighted: Int = 0
    @FocusState private var focused: Bool

    /// The drawer's max width (v1.13.0 ASK 2): a long style label ("Southern California")
    /// truncates instead of stretching the panel across the screen. ~220pt (design review).
    static let maxWidth: CGFloat = 220

    /// How hard the keyboard CURSOR leans on weight, on top of its cyan ink.
    ///
    /// §11 caps type at 500, so a bump is `.medium` MAX, never semibold. The two candidates
    ///
    /// - ``inkOnly``: the cursor is cyan and nothing else. Fully **interpolatable**: the ink
    ///   crossfades between rows with no discrete step, which is the purest read of §7 and of
    ///   the v1.16.2 "uniform weight both states, hierarchy from ink never weight" ruling.
    /// - ``inkAndWeight``: cyan plus one weight step, so the cursor is locatable at a glance
    ///   while arrowing. Costs a **non-interpolatable** font swap (SwiftUI cannot tween weight),
    ///   so the ink crossfades smoothly but the weight pops.
    enum CursorStance {
        /// Cyan ink only: the cursor never changes weight (selection keeps its own step).
        case inkOnly
        /// Cyan ink + a single `.medium` step on the cursor row.
        case inkAndWeight

        /// Resolve the row's type weight for this stance.
        func weight(isSelected: Bool, isHighlighted: Bool) -> Font.Weight {
            switch self {
            case .inkOnly:
                return isSelected ? .medium : .light
            case .inkAndWeight:
                return (isSelected || isHighlighted) ? .medium : .light
            }
        }
    }

    /// The shipped stance. Defaults to the recommendation (cyan + one `.medium` step);
    /// flip to `.inkOnly` if the design lead prefers the purer, fully-interpolatable cursor.
    static let cursorStance: CursorStance = .inkAndWeight

    var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let shape = RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)

        let panel = VStack(spacing: 0) {
            ForEach(Array(selector.styles.enumerated()), id: \.element.id) { index, style in
                row(index: index, style: style, palette: palette)
            }
        }
        .padding(NockerlSpace.space1)
        // §5: SOLID chrome (same material as the pill; not frosted).
        .background(palette.chromeSurface)
        .clipShape(shape)
        // §2: the 1.5pt cyan floating edge on the panel container.
        .overlay { shape.strokeBorder(palette.accentPrimary, lineWidth: NockerlFloatingBorder.width) }
        // The lit-from-above catch-light (the pill's inset highlight, reused).
        .overlay {
            shape.strokeBorder(
                LinearGradient(colors: [palette.surfaceHighlight, .clear], startPoint: .top, endPoint: .center),
                lineWidth: NockerlSpace.spacePx
            )
        }
        .shadow(
            color: palette.shadowTint.opacity(NockerlShadowTintAlpha.level3),
            radius: NockerlElevation.level3,
            x: 0,
            y: NockerlElevation.level3 / 2
        )
        // v1.13.0 ASK 2: cap the panel width; a long label truncates (.tail) instead of
        // spanning the screen. Keeps the §2 cyan edge (the overlay above, within the frame).
        .frame(maxWidth: Self.maxWidth)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(selector.accessibilityLabel)

        // v1.13.0 ASK 1: the INTERNAL keyboard fires ONLY when the host isn't driving. With
        // `highlightedID != nil` the HOST owns up/down (the HUD's non-activating panel never
        // becomes key), so the drawer STANDS DOWN its DrawerKeyboard + @State and reads the
        // highlight from the binding: a pure view, no NSEvent monitor, no global tap.
        if selector.highlightedID == nil {
            panel
                .modifier(DrawerKeyboard(
                    focused: $focused,
                    onMove: move,
                    onCommit: commitHighlighted,
                    onClose: close
                ))
                .onAppear {
                    // Open lands the highlight on the SELECTED row (start where you are, §2.1).
                    highlighted = selector.styles.firstIndex { $0.id == selector.selectedID } ?? 0
                    focused = true
                }
        } else {
            // v1.13.0 DRIVEN mode is fully passive: the internal keyboard is stood down (above),
            // and the focus effect is DISABLED so no key-window 'faint light square' ring
            // frames the open drawer. The nav highlight is CYAN INK off `highlightedID`
            // (v1.17.0/ dropped the inset neutral border), NOT a SwiftUI focus ring.
            if #available(macOS 14.0, *) {
                panel.focusEffectDisabled()
            } else {
                panel
            }
        }
    }

    /// One drawer row. The v1.17.0 THREE-STATE model, one box on screen, never two:
    ///
    /// | state             | ink                | weight   | chrome                |
    /// |-------------------|--------------------|----------|-----------------------|
    /// | resting           | `onChrome`         | `.light` | none                  |
    /// | CURSOR (arrowed)  | `accentPrimary`    | `.medium`| **none**, INK ONLY    |
    /// | SELECTED          | `accentPrimary`    | `.medium`| thin border + check   |
    /// | cursor + SELECTED | `accentPrimary`    | `.medium`| thin border + check   |
    ///
    /// NOTE the last row: under the shipped `.inkAndWeight` stance the cursor is INVISIBLE
    /// once it lands on the selected row (both terms are `isSelected || isHighlighted`), and
    /// that is the state the drawer OPENS in. Pinned by `testCursorCollapsesIntoSelectionOnTheSameRow`
    /// and rendered as the third column of the preview, open for the design lead's ruling.
    ///
    /// Arrowing moves INK; committing moves the BOX. Before v1.17.0 the keyboard cursor drew
    /// a second inset neutral border, so a selected row + an arrowed-over row put TWO competing
    /// rectangles in one small floating pill. Same principle as the v1.16.2 tab-label fix and
    /// : focus/selection reads via cyan INK, never via extra chrome or weight.
    private func row(index: Int, style: NockerlHudStyle, palette: NockerlPalette) -> some View {
        let isSelected = style.id == selector.selectedID
        // v1.13.0: controlled (host-driven) highlight reads the binding; else the internal cursor.
        let isHighlighted: Bool = {
            if let hl = selector.highlightedID {
                return style.id == hl.wrappedValue
            }
            return index == highlighted
        }()
        // The CURSOR is cyan ink, the same accent as selection, because the selected row is
        // told apart by its BOX + check, not by its hue.
        let ink = (isSelected || isHighlighted) ? palette.accentPrimary : palette.onChrome
        let weight = Self.cursorStance.weight(isSelected: isSelected, isHighlighted: isHighlighted)
        let rowShape = RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)

        return HStack(spacing: NockerlSpace.space2) {
            if let symbol = style.systemImage {
                Image(systemName: symbol)
                    .font(.system(size: NockerlFontSize.size14, weight: .medium))
                    .foregroundColor(ink)
            }
            Text(style.label)
                .font(.nockerl(size: NockerlFontSize.size14, weight: weight))
                .foregroundColor(ink)
                .lineLimit(1)
                .truncationMode(.tail)   // v1.13.0 ASK 2: long labels truncate, not stretch.
            Spacer(minLength: NockerlSpace.space3)
            if isSelected {
                Image(systemName: "checkmark")
                    .font(.system(size: NockerlFontSize.size12, weight: .semibold))
                    .foregroundColor(palette.accentPrimary)
            }
        }
        .padding(.horizontal, NockerlSpace.space2)
        .padding(.vertical, NockerlSpace.space2)
        .frame(minHeight: NockerlSize.minTouch, alignment: .leading)
        .frame(maxWidth: .infinity, alignment: .leading)
        // §6 selection by OUTLINE: the thin accentPrimary edge (no wash), softened to
        // `opacity.selection` at `widthSelection`, matching the NockerlNavRow reference.
        //
        // This is the ONLY box in the drawer. v1.17.0 removed the keyboard cursor's
        // second, inset neutral border: a selected row plus an arrowed-over row used to put TWO
        // competing rectangles inside one small floating pill. The cursor now reads as cyan INK
        // (above), so arrowing moves ink and only COMMITTING moves this box.
        .overlay {
            rowShape.strokeBorder(
                isSelected ? palette.accentPrimary.opacity(NockerlBorderOpacity.selection) : Color.clear,
                lineWidth: NockerlBorder.widthSelection
            )
        }
        // §7: animate on the RESOLVED `isHighlighted`, not the internal `highlighted` index.
        // In host-DRIVEN mode (`selector.highlightedID` non-nil) the internal @State never
        // changes, so keying off it left the driven cursor un-animated: a hard per-row toggle.
        // Keying off the resolved value crossfades the cursor's ink as it moves between rows in
        // BOTH nav modes. (Color is interpolatable; the weight step is a discrete font swap.
        // See `cursorStance`.)
        .animation(reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.fast), value: isHighlighted)
        .animation(reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.fast), value: isSelected)
        .contentShape(Rectangle())
        .onTapGesture { commit(style) }
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
        .accessibilityLabel(style.label)
    }

    /// Move the keyboard cursor, wrapping (arrows navigate; they do NOT commit).
    private func move(_ delta: Int) {
        let n = selector.styles.count
        guard n > 0 else { return }
        highlighted = ((highlighted + delta) % n + n) % n
    }

    /// Commit the highlighted style (Return / Space).
    private func commitHighlighted() {
        guard selector.styles.indices.contains(highlighted) else { return }
        commit(selector.styles[highlighted])
    }

    /// Commit a style: fire onSelect + close.
    private func commit(_ style: NockerlHudStyle) {
        selector.onSelect(style)
        selector.isOpen = false
    }

    /// Close with no selection change (Esc / Tab).
    private func close() {
        selector.isOpen = false
    }
}

/// The macOS-native keyboard wiring for the drawer (↑/↓ navigate, Return/Space commit,
/// Esc/Tab dismiss). `.onKeyPress` is macOS 14+; on older systems the drawer is
/// pointer-operable (graceful degradation: the deployment floor is macOS 12).
private struct DrawerKeyboard: ViewModifier {
    @FocusState.Binding var focused: Bool
    let onMove: (Int) -> Void
    let onCommit: () -> Void
    let onClose: () -> Void

    func body(content: Content) -> some View {
        #if os(macOS)
        if #available(macOS 14.0, *) {
            content
                .focusable()
                .focused($focused)
                .onKeyPress(.upArrow) { onMove(-1); return .handled }
                .onKeyPress(.downArrow) { onMove(1); return .handled }
                .onKeyPress(.return) { onCommit(); return .handled }
                .onKeyPress(.space) { onCommit(); return .handled }
                .onKeyPress(.escape) { onClose(); return .handled }
                .onKeyPress(.tab) { onClose(); return .ignored }
        } else {
            content
        }
        #else
        content
        #endif
    }
}
