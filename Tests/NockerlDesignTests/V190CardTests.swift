// v1.9.0 #2: NockerlCard `selected:` variant instantiation tests. No Swift snapshot
// harness exists (conformance = CI compile + instantiation), so these assert the new
// selectable-card shapes build across the axes that matter: unselected (the byte-
// identical default), selected (accentPrimary edge, no wash), selected + tappable, and the
// call-site ink pattern (the caller tints its own name from the `selected` it passes).

import SwiftUI
import XCTest

@testable import NockerlDesign

final class V190CardTests: XCTestCase {
    /// Every selectable-card shape must instantiate without trapping.
    func testCardSelectedVariantInstantiatesEveryShape() {
        // Unselected static card (the ratified default, byte-identical).
        _ = NockerlCard {
            Text("Resting").padding()
        }

        // Selected static card: accent edge + accentPrimarySoft wash.
        _ = NockerlCard(selected: true) {
            Text("Chosen").padding()
        }

        // Selected + tappable: the selectable-canvas-card affordance.
        _ = NockerlCard(selected: true, onTap: {}) {
            Text("Pick me").padding()
        }

        // Unselected + tappable, explicit elevation (selection defaults to false).
        _ = NockerlCard(elevation: .level3, onTap: {}) {
            Text("Tap").padding()
        }
    }

    /// The documented call-site ink pattern: the consumer already holds `selected`, so it
    /// tints its own name ink to `accentPrimary` (the NavRow active-ink pattern). The
    /// card owns border + wash, the caller owns content ink.
    func testCardSelectedCallSiteInkPattern() {
        _ = SelectableRow(isSelected: true)
        _ = SelectableRow(isSelected: false)
    }

    /// A stand-in selectable card: the caller tints its name from the SAME `selected` it
    /// passes to the card. No environment plumbing.
    private struct SelectableRow: View {
        let isSelected: Bool
        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            NockerlCard(selected: isSelected, onTap: {}) {
                Text("Model")
                    .foregroundColor(isSelected ? palette.accentPrimary : palette.onCard)
                    .padding()
            }
        }
    }
}
