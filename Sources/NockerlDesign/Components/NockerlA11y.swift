// NockerlA11y: shared accessibility plumbing for the component family (design-laws §13:
// state and icon-only controls are never unnamed).
//
// Extracted from the retired `NockerlControlMetrics` (v1.15.0): that file mirrored
// `size.minTouch` before the Swift build emitted `NockerlSize`; now that `NockerlSize.minTouch`
// ships, the metric constant is gone and consumers read the token directly. `NockerlA11y` was
// the file's OTHER tenant (a pure a11y helper, unrelated to the metric), so it moves here to
// its own home rather than dying with the vestigial metrics enum.

import SwiftUI

/// Shared accessibility plumbing for the component family (design-laws §13: state and
/// icon-only controls are never unnamed).
enum NockerlA11y {
    /// Normalize a caller-supplied accessible name: trims whitespace/newlines and
    /// returns `nil` when nothing meaningful remains, the one gate every component
    /// with a required name routes through.
    static func accessibleName(from label: String) -> String? {
        let trimmed = label.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}
