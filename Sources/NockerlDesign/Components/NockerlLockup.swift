// NockerlLockup: the canonical brand lockup `[mark] Nockerl` (+ optional product
// word), the ONE lockup for every surface (law §11). "Nockerl" runs EXTRALIGHT (thin
// / 200) in the surface ink; the product word runs REGULAR (400) in the cyan accent;
// both SENTENCE CASE (never uppercase), tight (-0.03em) with a tight gap; the mark is
// slightly taller than the text. The product word is a PARAMETER, and cyan lives ONLY
// here. Mirrors the Compose NockerlLockup.

import SwiftUI

/// The Nockerl brand lockup (see the file header). `NockerlLockup()` → mark +
/// monochrome "Nockerl"; `NockerlLockup(product: "Voice")` → adds the cyan 400 word.
///
/// The mark is substitutable, for a product that must not show the house mark. Everything
/// else stays ours: the two weights, the sentence case, the tracking, and both gaps, which
/// are derived from `size` rather than passed in.
///
/// NOT GENERIC, for the same reason as `NockerlRecordingHUD`: making the type generic over
/// the mark breaks every consumer that spells the type instead of inferring it. The mark is
/// erased to `AnyView` in the initialiser so no existing source has to change.
public struct NockerlLockup: View {
    private let product: String?
    private let size: CGFloat
    private let tone: NockerlLogoTone?
    private let stacked: Bool
    private let mark: AnyView?

    /// Create a lockup.
    /// - Parameters:
    ///   - product: optional product word (set in cyan 400); omit for the monochrome
    ///     wordmark alone.
    ///   - size: the MARK height (the wordmark is optically sized from it).
    ///   - tone: force the mark's ink ladder, or `nil` (default) for theme-aware.
    ///   - stacked: stack the wordmark beneath the mark instead of inline.
    ///   - mark: the leading mark, defaulting to the house `NockerlLogo` at `size`. Supply
    ///     one to lead with a product's own art while keeping the lockup's typography and
    ///     spacing. A supplied mark owns its own sizing, since `size` also drives the
    ///     wordmark and both gaps: pass art already sized to `size` to sit where the house
    ///     mark sits.
    public init<Mark: View>(
        product: String? = nil,
        size: CGFloat = 28,
        tone: NockerlLogoTone? = nil,
        stacked: Bool = false,
        // A value rather than a `@ViewBuilder` closure, matching the HUD. See the note there:
        // a builder parameter changes how an unlabeled trailing closure is matched, and a
        // leading mark is a single expression.
        mark: Mark
    ) {
        self.product = product
        self.size = size
        self.tone = tone
        self.stacked = stacked
        self.mark = AnyView(mark)
    }

    /// The lockup with the house mark, the existing signature unchanged.
    ///
    /// This is a second initialiser rather than a default argument on the one above, which is
    /// where this differs from `NockerlRecordingHUD`. The HUD's default mark is a constant
    /// size, so a default expression can build it. The house mark here has to inherit `size`
    /// and `tone` from sibling parameters, and a Swift default argument cannot refer to other
    /// parameters. So the mark stays optional and the house mark is resolved at render time,
    /// where those values are in scope.
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
        self.mark = nil
    }

    public var body: some View {
        LockupBody(product: product, size: size, tone: tone, stacked: stacked, mark: mark)
    }

    private struct LockupBody: View {
        let product: String?
        let size: CGFloat
        let tone: NockerlLogoTone?
        let stacked: Bool
        let mark: AnyView?

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

            // The supplied mark, or the house mark at the lockup's size when none was given.
            let leadingMark = mark ?? AnyView(
                NockerlLogo(size: size, tone: tone, accessibilityLabel: nil)
            )

            if stacked {
                VStack(spacing: size * 0.2) {
                    leadingMark
                    wordmark
                }
            } else {
                HStack(alignment: .center, spacing: markGap) {
                    leadingMark
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
