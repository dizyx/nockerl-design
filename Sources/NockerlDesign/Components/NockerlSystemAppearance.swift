// NockerlSystemAppearance: automatic light/dark palette resolution, the
// missing piece for the mechanical NockerlTheme → NockerlPalette client migration.
//
// SwiftUI views should keep using `@Environment(\.colorScheme)` +
// ``NockerlPalette/resolve(_:)``. This wrapper exists for the OTHER contexts a
// macOS client has, the ones where appearance must be OBSERVED, not inherited:
// AppKit windows (the Voice HUD panel, the menu-bar item), model layers, anything
// without a SwiftUI environment. On macOS it tracks `NSApp.effectiveAppearance`
// live (KVO); elsewhere it falls back to the initial scheme and manual updates.

import SwiftUI
#if os(macOS)
import AppKit
#endif

/// An observable system-appearance tracker resolving the active ``NockerlPalette``.
/// Use from AppKit/model contexts; SwiftUI views should prefer the environment.
public final class NockerlSystemAppearance: ObservableObject {
    /// The current scheme (`.dark` / `.light`), kept live on macOS.
    @Published public private(set) var colorScheme: ColorScheme

    /// The palette resolved for ``colorScheme``, re-published on every change.
    public var palette: NockerlPalette { NockerlPalette.resolve(colorScheme) }

    #if os(macOS)
    private var observation: NSKeyValueObservation?
    #endif

    /// Create a tracker.
    /// - Parameter initial: the starting scheme where detection is unavailable
    ///   (defaults to `.dark`, the Nockerl-native ground).
    public init(initial: ColorScheme = .dark) {
        #if os(macOS)
        colorScheme = Self.schemeFromAppKit() ?? initial
        // Track the app-wide effective appearance. Fires on the System
        // Settings toggle and on per-app appearance overrides.
        observation = NSApplication.shared.observe(
            \.effectiveAppearance,
            options: [.new]
        ) { [weak self] _, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                let next = Self.schemeFromAppKit() ?? initial
                if next != self.colorScheme { self.colorScheme = next }
            }
        }
        #else
        colorScheme = initial
        #endif
    }

    /// Manually override the scheme (clients with their own appearance setting).
    public func set(_ scheme: ColorScheme) {
        colorScheme = scheme
    }

    #if os(macOS)
    private static func schemeFromAppKit() -> ColorScheme? {
        let match = NSApplication.shared.effectiveAppearance
            .bestMatch(from: [.darkAqua, .aqua])
        switch match {
        case .darkAqua: return .dark
        case .aqua: return .light
        default: return nil
        }
    }
    #endif
}
