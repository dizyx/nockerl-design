import SwiftUI

/// Leading status mark for a `NockerlSelectOption`: STATUS tokens only (cyan is
/// reserved for the selected-row check; selection != status on color).
public enum NockerlSelectStatus: Equatable, Sendable {
    case success, warning, error, info, idle
}

/// One row in a `NockerlSelect`, the Swift twin of the web `NockerlSelectOption`
/// (value/label/secondary/status/group/disabled).
public struct NockerlSelectOption: Identifiable, Equatable, Sendable {
    /// Stable identity + the value carried into the trigger.
    public let value: String
    /// Primary line, the option's accessible name.
    public let label: String
    /// Supporting line under the label.
    public var secondary: String?
    /// Leading status mark: status colors only, never cyan.
    public var status: NockerlSelectStatus?
    /// Bucket; options sharing a `group` render under one header (when `grouped`).
    public var group: String?
    /// Inert + still legible (never invisible).
    public var disabled: Bool

    public var id: String { value }

    public init(
        value: String,
        label: String,
        secondary: String? = nil,
        status: NockerlSelectStatus? = nil,
        group: String? = nil,
        disabled: Bool = false
    ) {
        self.value = value
        self.label = label
        self.secondary = secondary
        self.status = status
        self.group = group
        self.disabled = disabled
    }
}

/// The plainest picker: pick ONE value from a fixed list (no typing). The Swift twin of
/// the web/Compose `NockerlSelect` (nockerl-design ).
///
/// A recessed WELL trigger (fields sink): canvasAlt fill + inner top catch-shadow + a
/// hairline at rest, the thin cyan SELECTION edge while OPEN (a choice-in-progress state,
/// not a focus ring; macOS supplies the focus ring), and a warm border on error. It drops
/// a LIFTED popover of rows: a leading status dot + primary label + secondary line, group
/// headers, and a cyan check on the chosen row.
///
/// Interaction honors macOS: a native popover gives edge-aware anchoring (it drops UP near
/// the screen bottom), outside-click / Esc dismiss, and focus scoping for free. Keyboard
/// (in the open list): ↑ ↓ move the active row, Home / End jump, type a letter to jump
/// (type-ahead), Return / Space commit, Esc closes.
///
/// A11y: the trigger is a button announcing its value + expanded state; each row is a
/// selectable option announcing its selected state.
public struct NockerlSelect: View {
    private let options: [NockerlSelectOption]
    @Binding private var selection: String
    private let placeholder: String
    private let isLoading: Bool
    private let errorText: String?
    private let emptyText: String
    private let grouped: Bool

    @Environment(\.colorScheme) private var colorScheme
    @State private var open = false
    @State private var active = 0
    @State private var typeBuffer = ""
    @State private var contentHeight: CGFloat = NockerlSize.selectMaxHeight
    @FocusState private var listFocused: Bool

    public init(
        options: [NockerlSelectOption],
        selection: Binding<String>,
        placeholder: String = "Select…",
        isLoading: Bool = false,
        errorText: String? = nil,
        emptyText: String = "Nothing to choose",
        grouped: Bool = false
    ) {
        self.options = options
        self._selection = selection
        self.placeholder = placeholder
        self.isLoading = isLoading
        self.errorText = errorText
        self.emptyText = emptyText
        self.grouped = grouped
    }

    private var navigable: [NockerlSelectOption] { options.filter { !$0.disabled } }
    private var selected: NockerlSelectOption? { options.first { $0.value == selection } }
    private var hasSelection: Bool { selected != nil }
    private var isError: Bool { errorText != nil }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        VStack(alignment: .leading, spacing: NockerlSpace.space1) {
            trigger(palette)
                .popover(isPresented: $open) { listbox(palette) }
            if let errorText {
                HStack(spacing: NockerlSpace.space1) {
                    Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 11))
                    Text(errorText)
                        .font(.system(size: NockerlFontSize.size12, weight: .light))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .foregroundStyle(palette.statusError)
            }
        }
    }

    // MARK: - Trigger (recessed well button)

    @ViewBuilder
    private func trigger(_ palette: NockerlPalette) -> some View {
        Button { toggle() } label: {
            HStack(spacing: 8) {
                if let status = selected?.status { dot(status, palette, size: 9) }
                Text(triggerText)
                    .nockerlType(.bodyMedium)
                    .lineLimit(1)
                    .truncationMode(.middle)
                    .foregroundStyle(hasSelection ? palette.accentPrimary : palette.onCanvasMuted)
                Spacer(minLength: 0)
                if isLoading { ProgressView().controlSize(.small) }
                Image(systemName: open ? "chevron.up" : "chevron.down")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(palette.onCardMuted)   // muted, never cyan
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(palette.canvasAlt)
            // "Fields sink": the recessed-well inner top-shade (most visible in light mode).
            .overlay(alignment: .top) {
                LinearGradient(colors: [palette.shadowTint.opacity(0.45), .clear], startPoint: .top, endPoint: .bottom)
                    .frame(height: NockerlSpace.space05)
                    .allowsHitTesting(false)
            }
            .clipShape(RoundedRectangle(cornerRadius: NockerlRadius.control))
            // Resting = plain hairline; cyan marks the OPEN (choice-in-progress) state; error is warm.
            // An open trigger is a SELECTION/CHOICE state, so its cyan edge is the THIN
            // `widthSelection` @ `opacity.selection` (the NockerlNavRow reference), NOT the thick
            // `widthFloating` weight. Thick cyan is reserved for surfaces that FLOAT ON TOP of
            // content. Here that is the popover below, never the trigger itself.
            .overlay(
                RoundedRectangle(cornerRadius: NockerlRadius.control)
                    .strokeBorder(
                        isError
                            ? palette.statusError
                            : (open
                                ? palette.accentPrimary.opacity(NockerlBorderOpacity.selection)
                                : palette.cardHairline),
                        lineWidth: isError
                            ? 1.5
                            : (open ? NockerlBorder.widthSelection : NockerlSpace.spacePx)
                    )
            )
            .animation(.easeInOut(duration: 0.15), value: open)
        }
        .buttonStyle(.plain)
        .disabled(options.isEmpty && !isLoading)
        .accessibilityLabel(triggerText)
        .accessibilityValue(hasSelection ? triggerText : "empty")
        .accessibilityHint("Press to choose from \(options.count) options")
        .accessibilityAddTraits(open ? [.isButton, .isSelected] : .isButton)
    }

    private var triggerText: String {
        if let selected { return selected.label }
        if isLoading { return "Loading…" }
        if options.isEmpty { return emptyText }
        return placeholder
    }

    // MARK: - Listbox popover

    @ViewBuilder
    private func listbox(_ palette: NockerlPalette) -> some View {
        ScrollViewReader { proxy in
            let list = ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(options.enumerated()), id: \.element.id) { index, option in
                        if grouped, let header = groupHeader(at: index) {
                            Text(header.uppercased())
                                .font(.system(size: NockerlFontSize.size10, weight: .semibold))
                                .tracking(0.5)
                                .foregroundStyle(palette.onCardMuted)
                                .padding(.horizontal, NockerlSpace.space2)
                                .padding(.top, NockerlSpace.space2)
                                .padding(.bottom, NockerlSpace.space1)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        row(option, palette).id(option.value)
                    }
                }
                .padding(NockerlSpace.space1)
                .background(
                    GeometryReader { geo in
                        Color.clear.preference(key: NockerlSelectContentHeightKey.self, value: geo.size.height)
                    }
                )
            }
            .frame(minWidth: 320, maxWidth: 460)
            // Hug the content up to selectMaxHeight: a short list = a short popover (no dead
            // space below the last row); a long list caps at max and scrolls.
            .frame(height: min(contentHeight, NockerlSize.selectMaxHeight))
            .onPreferenceChange(NockerlSelectContentHeightKey.self) { contentHeight = $0 }
            // The native popover supplies the lift + rounding + arrow; we fill its content
            // edge-to-edge with the brand card surface so the ROWS read as our design.
            .background(palette.cardSurface1)
            .focusable()
            .focused($listFocused)
            .onAppear {
                active = max(0, navigable.firstIndex { $0.value == selection } ?? 0)
                listFocused = true
                scroll(proxy)
            }

            // Full keyboard model on macOS 14+ (where onKeyPress exists); mouse-only below.
            if #available(macOS 14.0, *) {
                list
                    .onKeyPress(.downArrow) { move(1); scroll(proxy); return .handled }
                    .onKeyPress(.upArrow) { move(-1); scroll(proxy); return .handled }
                    .onKeyPress(.home) { active = 0; scroll(proxy); return .handled }
                    .onKeyPress(.end) { active = max(0, navigable.count - 1); scroll(proxy); return .handled }
                    .onKeyPress(.return) { commitActive(); return .handled }
                    .onKeyPress(.space) { commitActive(); return .handled }
                    .onKeyPress(.escape) { open = false; return .handled }
                    .onKeyPress { press in typeahead(press.characters); scroll(proxy); return .handled }
            } else {
                list
            }
        }
        .accessibilityAddTraits(.isModal)
    }

    @ViewBuilder
    private func row(_ option: NockerlSelectOption, _ palette: NockerlPalette) -> some View {
        let isSelected = option.value == selection
        let isActive = !option.disabled && navigable.firstIndex(of: option) == active
        HStack(spacing: NockerlSpace.space2) {
            if let status = option.status { dot(status, palette, size: 9) }
            VStack(alignment: .leading, spacing: 1) {
                Text(option.label)
                    .font(.system(size: NockerlFontSize.size14))
                    // Reduce-fills: the SELECTED option reads via accent INK (+ the accent
                    // border + the check), not a wash.
                    .foregroundStyle(
                        option.disabled
                            ? palette.onCardMuted
                            : (isSelected ? palette.accentPrimary : palette.onCard)
                    )
                    .lineLimit(1)
                if let secondary = option.secondary {
                    Text(secondary)
                        .font(.system(size: NockerlFontSize.size12, weight: .light))
                        .foregroundStyle(palette.onCardMuted)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: NockerlSpace.space2)
            if isSelected {
                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(palette.accentPrimary)   // cyan check, reserved for selection
            }
        }
        .padding(.horizontal, NockerlSpace.space2)
        .padding(.vertical, NockerlSpace.space2)
        .frame(maxWidth: .infinity, alignment: .leading)
        // Reduce-fills (law §6): the SELECTED option carries NO wash. It reads via the
        // accent BORDER + accent ink + the check indicator. Only the transient keyboard-
        // ACTIVE row keeps a neutral `cardSurface2` material highlight (not an accent wash).
        .background(
            RoundedRectangle(cornerRadius: NockerlRadius.control)
                .fill(isActive ? palette.cardSurface2 : Color.clear)
        )
        // The selection edge is the THIN `widthSelection` @ `opacity.selection`, matching
        // the NockerlNavRow reference. Selection reads via cyan INK + the check, never via WEIGHT.
        .overlay(
            RoundedRectangle(cornerRadius: NockerlRadius.control)
                .strokeBorder(
                    (isSelected || isActive)
                        ? palette.accentPrimary.opacity(NockerlBorderOpacity.selection)
                        : .clear,
                    lineWidth: NockerlBorder.widthSelection
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: NockerlRadius.control))
        .contentShape(Rectangle())
        .onTapGesture { commit(option) }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(option.secondary.map { "\(option.label), \($0)" } ?? option.label)
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }

    private func dot(_ status: NockerlSelectStatus, _ palette: NockerlPalette, size: CGFloat) -> some View {
        Circle().fill(statusColor(status, palette)).frame(width: size, height: size)
    }

    private func statusColor(_ status: NockerlSelectStatus, _ palette: NockerlPalette) -> Color {
        switch status {
        case .success: return palette.statusSuccess
        case .warning: return palette.statusWarning
        case .error: return palette.statusError
        case .info: return palette.onCardMuted   // no cyan for status dots (law)
        case .idle: return palette.divider
        }
    }

    private func groupHeader(at index: Int) -> String? {
        guard let group = options[index].group else { return nil }
        if index == 0 { return group }
        return options[index - 1].group == group ? nil : group
    }

    // MARK: - Behavior

    private func toggle() {
        guard !(options.isEmpty && !isLoading) else { return }
        open.toggle()
    }

    private func move(_ delta: Int) {
        guard !navigable.isEmpty else { return }
        active = (active + delta + navigable.count) % navigable.count
    }

    private func commitActive() {
        guard navigable.indices.contains(active) else { return }
        commit(navigable[active])
    }

    private func commit(_ option: NockerlSelectOption) {
        guard !option.disabled else { return }
        selection = option.value
        open = false
    }

    /// Type-ahead: jump to the next option whose label starts with the typed run.
    private func typeahead(_ characters: String) {
        let key = characters.lowercased()
        guard key.count == 1, let scalar = key.unicodeScalars.first,
              CharacterSet.alphanumerics.contains(scalar) else { return }
        typeBuffer = typeBuffer.isEmpty ? key : typeBuffer + key
        let query = typeBuffer
        let start = typeBuffer.count == 1 ? active + 1 : active
        for offset in 0..<navigable.count {
            let idx = (start + offset) % navigable.count
            if navigable[idx].label.lowercased().hasPrefix(query) { active = idx; break }
        }
        Task { try? await Task.sleep(nanoseconds: 650_000_000); typeBuffer = "" }
    }

    private func scroll(_ proxy: ScrollViewProxy) {
        guard navigable.indices.contains(active) else { return }
        withAnimation(.easeOut(duration: 0.1)) { proxy.scrollTo(navigable[active].value, anchor: .center) }
    }
}

/// Measures the popover's intrinsic content height so the listbox can hug short lists
/// (content height) while capping tall ones at `NockerlSize.selectMaxHeight`.
private struct NockerlSelectContentHeightKey: PreferenceKey {
    static var defaultValue: CGFloat { 0 }
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}
