// NockerlDatePickers: the shared date/time picker CONTRACT on SwiftUI.
//
// Wraps the platform `DatePicker` (law §9, native interaction; the CONTRACT unifies):
//   - `weekStartsOn` (0=Sunday…6=Saturday): DEFAULTS to the device locale; the explicit
//     override IS honored here. SwiftUI derives its calendar from the environment, so a
//     custom `Calendar.firstWeekday` flows in (Apple's firstWeekday is 1-based).
//   - `entryMode` (`default | dial | wheel | text`): defaults to the platform idiom
//     (graphical calendar / wheel where native). `dial` is not an Apple idiom and falls
//     back to the default (documented, per the contract's fallback rule).
//   - `minuteStep` / `min` / `max`: the shared web API. SwiftUI's DatePicker has no
//     native minute stepping. Selections SNAP to the step on change (the documented
//     clamping behavior, same pure rule as Compose); `min`/`max` clamp via the native
//     range parameter.

import SwiftUI

/// The shared entry-mode vocabulary.
public enum NockerlPickerEntryMode: Equatable {
    /// The platform idiom (graphical calendar on macOS/iOS).
    case `default`
    /// Not an Apple idiom; falls back to `.default` (documented).
    case dial
    /// The wheel (iOS native; on macOS falls back to `.default`).
    case wheel
    /// Keyboard/field entry.
    case text
}

/// Snap a minute value to the nearest step (the contract's documented clamping;
/// identical semantics to Compose's `nockerlSnapMinutes`). `step <= 1` is a
/// no-op; 60 wraps to 0.
public func nockerlSnapMinutes(_ minute: Int, step: Int) -> Int {
    let clamped = min(max(minute, 0), 59)
    guard step > 1 else { return clamped }
    let snapped = (Int((Double(clamped) / Double(step)).rounded()) * step) % 60
    return min(max(snapped, 0), 59)
}

/// A date (or time) picker under the shared contract.
///
/// Unavailable on tvOS/watchOS: SwiftUI ships no comparable `DatePicker` there
/// within this package's platform floors.
@available(tvOS, unavailable)
@available(watchOS, unavailable)
public struct NockerlDatePicker: View {
    private let label: String
    private let selection: Binding<Date>
    private let displayedComponents: DatePickerComponents
    private let weekStartsOn: Int?
    private let entryMode: NockerlPickerEntryMode
    private let minuteStep: Int
    private let bounds: ClosedRange<Date>?

    /// Create a picker.
    /// - Parameters:
    ///   - label: the REQUIRED persistent label (law §14).
    ///   - selection: the bound date.
    ///   - displayedComponents: `.date`, `.hourAndMinute`, or both.
    ///   - weekStartsOn: 0=Sunday…6=Saturday; `nil` follows the device locale
    ///     (the contract default).
    ///   - entryMode: shared vocabulary; unsupported values fall back (KDoc'd).
    ///   - minuteStep: snap increment for time selection (1 = free).
    ///   - min: earliest selectable instant (inclusive).
    ///   - max: latest selectable instant (inclusive).
    public init(
        _ label: String,
        selection: Binding<Date>,
        displayedComponents: DatePickerComponents = [.date],
        weekStartsOn: Int? = nil,
        entryMode: NockerlPickerEntryMode = .default,
        minuteStep: Int = 1,
        min: Date? = nil,
        max: Date? = nil
    ) {
        self.label = label
        self.displayedComponents = displayedComponents
        self.weekStartsOn = weekStartsOn
        self.entryMode = entryMode
        self.minuteStep = minuteStep
        self.bounds = Self.range(min: min, max: max)
        // The snapping binding: writes snap the minute component to the step
        // (the documented clamping; no native stepping exists).
        if minuteStep > 1 {
            self.selection = Binding(
                get: { selection.wrappedValue },
                set: { newValue in
                    selection.wrappedValue = Self.snappingMinutes(of: newValue, step: minuteStep)
                }
            )
        } else {
            self.selection = selection
        }
    }

    public var body: some View {
        PickerBody(
            label: label,
            selection: selection,
            displayedComponents: displayedComponents,
            weekStartsOn: weekStartsOn,
            entryMode: entryMode,
            bounds: bounds
        )
    }

    /// Environment-reading render body (scheme-correct brand tint).
    private struct PickerBody: View {
        let label: String
        let selection: Binding<Date>
        let displayedComponents: DatePickerComponents
        let weekStartsOn: Int?
        let entryMode: NockerlPickerEntryMode
        let bounds: ClosedRange<Date>?

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let base = styled(rawPicker).tint(palette.accentPrimary)

            // weekStartsOn: honored via the environment calendar (Apple
            // firstWeekday is 1-based Sunday=1; the contract is 0-based).
            if let weekStartsOn {
                base.environment(\.calendar, NockerlDatePicker.calendar(firstWeekday: weekStartsOn))
            } else {
                base
            }
        }

        @ViewBuilder
        private var rawPicker: some View {
            if let bounds {
                DatePicker(label, selection: selection, in: bounds, displayedComponents: displayedComponents)
            } else {
                DatePicker(label, selection: selection, displayedComponents: displayedComponents)
            }
        }

        /// Map the shared entry-mode vocabulary onto the platform styles.
        /// `.dial` is not an Apple idiom and `.wheel` is iOS-only, so the
        /// documented fallbacks land on the platform default.
        @ViewBuilder
        private func styled(_ picker: some View) -> some View {
            #if os(iOS)
            switch entryMode {
            case .wheel: picker.datePickerStyle(.wheel)
            case .text: picker.datePickerStyle(.compact)
            case .default, .dial: picker.datePickerStyle(.graphical)
            }
            #elseif os(macOS)
            switch entryMode {
            case .text: picker.datePickerStyle(.field)
            case .default, .dial, .wheel: picker.datePickerStyle(.graphical)
            }
            #else
            picker
            #endif
        }
    }

    /// Build the environment calendar for an explicit week start (0-based → 1-based).
    static func calendar(firstWeekday zeroBased: Int) -> Calendar {
        var calendar = Calendar.autoupdatingCurrent
        calendar.firstWeekday = (zeroBased.clamped(to: 0...6)) + 1
        return calendar
    }

    /// Snap a date's minute component to the step (shared rule with Compose).
    static func snappingMinutes(of date: Date, step: Int) -> Date {
        let calendar = Calendar.autoupdatingCurrent
        let minute = calendar.component(.minute, from: date)
        let snapped = nockerlSnapMinutes(minute, step: step)
        guard snapped != minute else { return date }
        return calendar.date(bySetting: .minute, value: snapped, of: date) ?? date
    }

    private static func range(min: Date?, max: Date?) -> ClosedRange<Date>? {
        switch (min, max) {
        case let (lower?, upper?): return lower...upper
        case let (lower?, nil): return lower...Date.distantFuture
        case let (nil, upper?): return Date.distantPast...upper
        case (nil, nil): return nil
        }
    }
}

/// The **range MODE** of the date-picker family: a start→end
/// date range on the ONE contract, so a standalone range picker is unnecessary.
///
/// SwiftUI ships NO graphical contiguous-range picker, so honor-the-platform
/// (law §9) renders the range as two coordinated ``NockerlDatePicker``s: the
/// end is floored at the start and the start capped at the end, so the pair can
/// never invert. This is the Apple-idiomatic range affordance; the Compose half
/// uses M3's `DateRangePicker`. Same contract, platform-appropriate interaction.
///
/// Unavailable on tvOS/watchOS (as the single picker is).
@available(tvOS, unavailable)
@available(watchOS, unavailable)
public struct NockerlDateRangePicker: View {
    private let startLabel: String
    private let endLabel: String
    @Binding private var start: Date
    @Binding private var end: Date
    private let min: Date?
    private let max: Date?

    /// Create a range picker.
    /// - Parameters:
    ///   - startLabel: the start field's persistent label (default "Start").
    ///   - endLabel: the end field's persistent label (default "End").
    ///   - start: the bound range start.
    ///   - end: the bound range end.
    ///   - min: earliest selectable instant (inclusive).
    ///   - max: latest selectable instant (inclusive).
    public init(
        startLabel: String = "Start",
        endLabel: String = "End",
        start: Binding<Date>,
        end: Binding<Date>,
        min: Date? = nil,
        max: Date? = nil
    ) {
        self.startLabel = startLabel
        self.endLabel = endLabel
        self._start = start
        self._end = end
        self.min = min
        self.max = max
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: NockerlSpace.space4) {
            // Start: capped at the current end so it can never exceed it.
            NockerlDatePicker(startLabel, selection: $start, min: min, max: end)
            // End: floored at the current start so the range can never invert.
            NockerlDatePicker(endLabel, selection: $end, min: start, max: max)
        }
    }
}

private extension Int {
    /// Clamp into a closed range.
    func clamped(to range: ClosedRange<Int>) -> Int {
        Swift.min(Swift.max(self, range.lowerBound), range.upperBound)
    }
}
