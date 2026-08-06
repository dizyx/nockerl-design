// NockerlProductMark: a product's own mark, from the package's asset catalog.
//
// The house mark is `NockerlLogo` and is drawn in code: three overlapping triangles on a
// three shade ink ladder that adapts to the theme. This is the other half, the per product
// art (Nockerl, Voice, Security, CtxMS, Design), which arrives as a compiled asset catalog
// because it is real artwork rather than three paths.
//
// THE SPLIT IS DELIBERATE. `NockerlLogo` is NOT backed by the catalog and should not be:
// flattening it into an image would lose the depth ladder it draws, which is the whole
// reason it is code. A product mark has no such structure, and an asset gives it light and
// dark switching plus vector scaling at any size for free. Both exist; they are not
// interchangeable and neither replaces the other.
//
// Pairs with the `mark:` parameter on `NockerlRecordingHUD` and `NockerlLockup`, so a
// product that must not show the house mark can lead with its own and still get the
// component's anatomy:
//
//     NockerlRecordingHUD(phase: .recording, mark: NockerlProductMark(.voice))
//
// The default size is `NockerlRecordingHUD.markHeight`, so the mark lands exactly where the
// house mark sat without the caller doing arithmetic.

import SwiftUI

/// The products this framework dresses, each with a mark in the package's asset catalog.
///
/// The raw value is the catalog imageset name, which is also the file stem in
/// `logos/app-icons`, so the three stay in step by construction rather than by convention.
public enum NockerlProduct: String, CaseIterable, Hashable, Sendable {
    /// The parent brand. Available as art for surfaces that want the mark as an image; the
    /// code drawn ``NockerlLogo`` remains the right choice where its depth ladder matters.
    case nockerl
    case voice
    case security
    case ctxms
    case design

    /// The mark as a SwiftUI `Image`, resolved from the package bundle.
    ///
    /// Light and dark cuts are selected by the catalog from the current appearance, so this
    /// needs no colour scheme argument. Use ``NockerlProductMark`` unless you need to apply
    /// your own sizing, since this image is unsized and will take whatever space it is
    /// offered.
    public var image: Image {
        Image(rawValue, bundle: .module)
    }
}

/// A product's mark, sized and ready to drop into a component's `mark:` slot.
///
///     NockerlRecordingHUD(phase: .recording, mark: NockerlProductMark(.voice))
///     NockerlLockup(product: "Voice", mark: NockerlProductMark(.voice, size: 28))
///
/// The default size matches the HUD's leading mark, so the common case needs no arithmetic.
/// The marks are square, so one dimension sizes both.
public struct NockerlProductMark: View {
    private let product: NockerlProduct
    private let size: CGFloat
    private let accessibilityLabel: String?

    /// Create a product mark.
    /// - Parameters:
    ///   - product: which product's art to draw.
    ///   - size: the rendered edge, defaulting to the HUD's leading-mark height so a mark
    ///     dropped into that slot sits exactly where the house mark sat.
    ///   - accessibilityLabel: the a11y name, or `nil` (the default) when a sibling wordmark
    ///     or the host component already names it. Marks are usually decorative: the HUD
    ///     carries its own live label, and the lockup has the word beside it.
    public init(
        _ product: NockerlProduct,
        size: CGFloat = NockerlRecordingHUD.markHeight,
        accessibilityLabel: String? = nil
    ) {
        self.product = product
        self.size = size
        self.accessibilityLabel = accessibilityLabel
    }

    public var body: some View {
        product.image
            .resizable()
            // The art is square and full bleed, so this only guards against a future mark
            // that is not: it fits rather than distorting.
            .aspectRatio(contentMode: .fit)
            .frame(width: size, height: size)
            .accessibilityLabel(accessibilityLabel ?? "")
            .accessibilityHidden(accessibilityLabel == nil)
    }
}
