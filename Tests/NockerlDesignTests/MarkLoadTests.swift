// Runtime proof that every product mark RESOLVES from the package bundle, and an honest
// account of where that can actually be checked.
//
// The failure being guarded is a resource that compiles but does not resolve: `.copy`
// instead of `.process`, a renamed imageset, a catalog that stopped syncing. All of those
// build cleanly and render nothing, and no other gate in this repo would notice.
//
// WHICH BUILD SYSTEM IS RUNNING MATTERS, AND THIS IS THE THING TO KNOW.
// An asset catalog only becomes loadable after `actool` compiles it into `Assets.car`.
// `actool` belongs to the Xcode build system. Building this package with plain
// `swift build` copies `Marks.xcassets` into the bundle UNCOMPILED, so nothing resolves,
// however correct the catalog is. Building it through Xcode, which is what a real consumer
// does when it resolves this package as a dependency, runs `actool` and the marks resolve.
//
// So these tests detect which situation they are in: under Xcode they assert resolution in
// full, and under `swift build` they SKIP with the reason stated, rather than failing the
// rail or, worse, passing while checking nothing. A skip is visible in the output; a silent
// no-op would not be.
import XCTest
import SwiftUI
@testable import NockerlDesign

#if canImport(AppKit)
import AppKit
#elseif canImport(UIKit)
import UIKit
#endif

final class MarkLoadTests: XCTestCase {

    /// True when `actool` has run, which is the only state in which images can resolve.
    private var catalogWasCompiled: Bool {
        Bundle.module.url(forResource: "Assets", withExtension: "car") != nil
    }

    private func skipUnlessCompiled() throws {
        try XCTSkipUnless(
            catalogWasCompiled,
            """
            The asset catalog was not compiled in this build, so no mark can resolve. That is \
            expected under `swift build`, which does not run actool, and is NOT a defect in the \
            catalog. Build through xcodebuild to exercise these assertions.
            """
        )
    }

    // ── Checkable under either build system ──────────────────────────────────────────

    /// The catalog must reach the bundle in one form or the other. This catches a resource
    /// declaration dropped or misspelled in Package.swift.
    func testCatalogShipsInTheBundle() {
        let compiled = Bundle.module.url(forResource: "Assets", withExtension: "car")
        let raw = Bundle.module.url(forResource: "Marks", withExtension: "xcassets")
        XCTAssertTrue(
            compiled != nil || raw != nil,
            "neither a compiled Assets.car nor a raw Marks.xcassets is in Bundle.module, so the "
                + "resource is not being shipped by Package.swift at all"
        )
    }

    /// Every product must have an imageset with both cuts. Under `swift build` the raw
    /// directory is inspectable, which is a real check even without actool.
    func testEveryProductHasAnImageset() throws {
        guard let raw = Bundle.module.url(forResource: "Marks", withExtension: "xcassets") else {
            throw XCTSkip("the catalog was compiled, so the raw imagesets are not inspectable")
        }
        for product in NockerlProduct.allCases {
            let dir = raw.appendingPathComponent("\(product.rawValue).imageset")
            XCTAssertTrue(
                FileManager.default.fileExists(atPath: dir.path),
                "\(product.rawValue).imageset is missing from the shipped catalog"
            )
            for cut in ["\(product.rawValue).svg", "\(product.rawValue)-on-dark.svg"] {
                XCTAssertTrue(
                    FileManager.default.fileExists(atPath: dir.appendingPathComponent(cut).path),
                    "\(cut) is missing from \(product.rawValue).imageset"
                )
            }
        }
    }

    func testTheProductSetIsTheExpectedFive() {
        XCTAssertEqual(
            Set(NockerlProduct.allCases.map(\.rawValue)),
            ["nockerl", "voice", "security", "ctxms", "design"]
        )
    }

    // ── Real resolution, meaningful only once actool has run ─────────────────────────

    func testEveryProductMarkResolvesFromTheBundle() throws {
        try skipUnlessCompiled()
        for product in NockerlProduct.allCases {
            #if canImport(AppKit)
            let image = Bundle.module.image(forResource: product.rawValue)
            XCTAssertNotNil(image, "\(product.rawValue) did not resolve from Bundle.module")
            let size = try XCTUnwrap(image).size
            XCTAssertGreaterThan(size.width, 0, "\(product.rawValue) resolved with zero width")
            XCTAssertGreaterThan(size.height, 0, "\(product.rawValue) resolved with zero height")
            #elseif canImport(UIKit)
            XCTAssertNotNil(
                UIImage(named: product.rawValue, in: .module, compatibleWith: nil),
                "\(product.rawValue) did not resolve from Bundle.module"
            )
            #endif
        }
    }

    #if canImport(AppKit)
    /// Both cuts must resolve AND differ. If the dark cut lost its luminosity appearance the
    /// catalog still returns an image, just the light one on a dark surface, which is the
    /// silent version of this bug.
    func testLightAndDarkCutsAreDistinct() throws {
        try skipUnlessCompiled()
        for product in NockerlProduct.allCases {
            let image = try XCTUnwrap(Bundle.module.image(forResource: product.rawValue))
            var lightData: Data?
            var darkData: Data?
            NSAppearance(named: .aqua)?.performAsCurrentDrawingAppearance {
                lightData = image.tiffRepresentation
            }
            NSAppearance(named: .darkAqua)?.performAsCurrentDrawingAppearance {
                darkData = image.tiffRepresentation
            }
            XCTAssertNotNil(lightData, "\(product.rawValue) produced no light rendering")
            XCTAssertNotNil(darkData, "\(product.rawValue) produced no dark rendering")
            XCTAssertNotEqual(
                lightData, darkData,
                "\(product.rawValue) renders identically in both appearances, so the dark cut is "
                    + "not being applied"
            )
        }
    }

    /// The mark must paint pixels rather than resolving to an empty image.
    func testMarksRenderNonEmpty() throws {
        try skipUnlessCompiled()
        for product in NockerlProduct.allCases {
            let image = try XCTUnwrap(Bundle.module.image(forResource: product.rawValue))
            image.size = NSSize(width: 64, height: 64)
            let rep = try XCTUnwrap(
                NSBitmapImageRep(
                    bitmapDataPlanes: nil, pixelsWide: 64, pixelsHigh: 64,
                    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
                )
            )
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
            image.draw(in: NSRect(x: 0, y: 0, width: 64, height: 64))
            NSGraphicsContext.restoreGraphicsState()

            var painted = 0
            for x in stride(from: 0, to: 64, by: 2) {
                for y in stride(from: 0, to: 64, by: 2)
                where (rep.colorAt(x: x, y: y)?.alphaComponent ?? 0) > 0.05 {
                    painted += 1
                }
            }
            XCTAssertGreaterThan(
                painted, 20,
                "\(product.rawValue) drew almost nothing at 64pt, so it resolved but is blank"
            )
        }
    }
    #endif
}
