// NockerlLockup: the canonical brand lockup `[mark] Nockerl` (+ optional product
// word), the ONE lockup for every surface (law §11). "Nockerl" runs EXTRALIGHT (thin
// / 200) in the surface ink; the product word runs REGULAR (400) in the cyan accent;
// both SENTENCE CASE (never uppercase), tight (-0.03em) with a tight gap; the mark is
// slightly taller than the text. The product word is a PARAMETER, and cyan lives ONLY
// here. Mirrors the Compose NockerlLockup.

import SwiftUI

/// The Nockerl brand lockup (see the file header). `NockerlLockup()` → mark +
/// monochrome "Nockerl"; `NockerlLockup(product: "Voice")` → adds the cyan 400 word.
public struct NockerlLockup: View {
    private let product: String?
    private let size: CGFloat
    private let tone: NockerlLogoTone?
    private let stacked: Bool

    /// Create a lockup.
    /// - Parameters:
    ///   - product: optional product word (set in cyan 400); omit for the monochrome
    ///     wordmark alone.
    ///   - size: the MARK height (the wordmark is optically sized from it).
    ///   - tone: force the mark's ink ladder, or `nil` (default) for theme-aware.
    ///   - stacked: stack the wordmark beneath the mark instead of inline.
    public init(
        product: String? = nil,
        size: CGFloat = 28,
        tone: NockerlLogoTone? = nil,
        stacked: Bool = false
    ) {
        self.product = product
        self.size = size
        self.tone = tone
        self.stacked = stacked
    }

    public var body: some View {
        LockupBody(product: product, size: size, tone: tone, stacked: stacked)
    }

    private struct LockupBody: View {
        let product: String?
        let size: CGFloat
        let tone: NockerlLogoTone?
        let stacked: Bool

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let wordmarkSize = size * 0.9 // law §11: wordmark is 0.9× the mark
            let wordGap = wordmarkSize * 0.14 // inter-word gap 0.14em
            let markGap = size * 0.34 // mark→wordmark gap 0.34×

            let wordmark = HStack(alignment: .firstTextBaseline, spacing: wordGap) {
                Text("Nockerl")
                    .font(.nockerl(size: wordmarkSize, weight: .thin)) // 200
                    .brandTracked(fontSize: wordmarkSize)
                    .foregroundColor(palette.onCanvas)
                if let product {
                    Text(product)
                        .font(.nockerl(size: wordmarkSize, weight: .regular)) // 400
                        .brandTracked(fontSize: wordmarkSize)
                        .foregroundColor(palette.accentPrimary)
                }
            }

            if stacked {
                VStack(spacing: size * 0.2) {
                    NockerlLogo(size: size, tone: tone, accessibilityLabel: nil)
                    wordmark
                }
            } else {
                HStack(alignment: .center, spacing: markGap) {
                    NockerlLogo(size: size, tone: tone, accessibilityLabel: nil)
                    wordmark
                }
            }
        }
    }
}

private extension View {
    /// The ratified -0.03em brand tracking, guarded for the macOS-12 / iOS-15 floor
    /// (`.tracking` is macOS 13 / iOS 16). No-op below the floor.
    @ViewBuilder
    func brandTracked(fontSize: CGFloat) -> some View {
        if #available(macOS 13, iOS 16, tvOS 16, watchOS 9, *) {
            self.tracking(fontSize * -0.03)
        } else {
            self
        }
    }
}
