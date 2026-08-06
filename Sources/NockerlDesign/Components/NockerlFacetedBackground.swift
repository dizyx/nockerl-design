// NockerlFacetedBackground: the Nockerl signature surface (package port).
//
// An animated low-poly triangle field behind content: large soft facets, each a
// whisper of tonal variation off the `chatBg` token, with a slow (~18s) tone-wave
// drifting diagonally. Calm, geometric, on-brand (the mark is a triangle). Never
// glow/aurora.
//
// MAX-SMOOTHNESS TECHNIQUE (the native-butter contract):
// 1. `TimelineView(.animation)`: CAPPED at 20fps via `minimumInterval` (v1.14.0
//    perf cut; was uncapped up to the display's 120fps, ~55% of a CPU core idle).
//    For the slow ~18s sine the per-frame luminance step is ~0.001 (sub-perceptual),
//    so the look is IDENTICAL at a fraction of the CPU. The phase still derives
//    continuously from the frame timestamp, nothing ticks; `paused` (or Reduce
//    Motion) stops the schedule outright so an idle / window-occluded host drops to
//    0 CPU while the static field stays on screen.
// 2. Geometry is CACHED per size (a one-slot memo). Per-frame work is only the
//    facet re-tint fills; no mesh rebuild, no hashing per frame (the Voice
//    original rebuilt the mesh every frame).
// 3. All randomness is the deterministic integer hash `nockerlFacetJitter01`,
//    IDENTICAL to Compose, so both platforms render the SAME field and nothing
//    ever re-rolls or shimmers.
// 4. Reduce Motion freezes the wave at phase 0: the field stays faceted (the
//    static grain remains) but stops drifting.
//
// Geometry/constants ported 1:1 from the canonical Compose implementation.

import SwiftUI

/// One triangular facet: corners, baked tonal offset, and diagonal position.
struct NockerlFacet {
    let a: CGPoint
    let b: CGPoint
    let c: CGPoint
    let staticDelta: Double
    let diagonalPos: Double
}

/// Deterministic pseudo-random in `0..<1` from two integer grid indices, the
/// SAME mixed-bit hash as Compose (`nockerlFacetJitter01`), so both platforms
/// render the identical field.
func nockerlFacetJitter01(_ x: Int32, _ y: Int32) -> Double {
    var h = x &* 374_761_393 &+ y &* 668_265_263
    h = (h ^ Int32(bitPattern: UInt32(bitPattern: h) >> 13)) &* 1_274_126_177
    h = h ^ Int32(bitPattern: UInt32(bitPattern: h) >> 16)
    return Double(h & 0xFFFFFF) / 16_777_216.0
}

/// Total luminance delta for a facet at animation `phase` (radians): baked
/// static delta + `amplitude * sin(phase + diagonalPos * 2π)`. Pure.
func nockerlFacetLuminanceDelta(
    staticDelta: Double,
    diagonalPos: Double,
    phase: Double,
    amplitude: Double = NockerlFacetedBackground.waveAmplitude
) -> Double {
    staticDelta + amplitude * sin(phase + diagonalPos * 2 * .pi)
}

/// Build the low-poly triangulation covering `size` (cells of `cell` points):
/// point grid with one extra ring beyond each edge, interior points nudged by
/// the deterministic hash, cells split into two triangles alternating the
/// diagonal by parity. Pure + unit-testable; identical geometry to Compose.
func nockerlBuildFacetField(
    size: CGSize,
    cell: CGFloat,
    jitterFraction: CGFloat = 0.34
) -> [NockerlFacet] {
    guard size.width > 0, size.height > 0, cell > 0 else { return [] }

    let cols = Int(size.width / cell) + 2
    let rows = Int(size.height / cell) + 2
    let jitter = cell * jitterFraction
    let diagSpan = max(size.width + size.height, 1)

    func point(_ col: Int, _ row: Int) -> CGPoint {
        let baseX = CGFloat(col) * cell
        let baseY = CGFloat(row) * cell
        let edge = col <= 0 || row <= 0 || col >= cols - 1 || row >= rows - 1
        if edge { return CGPoint(x: baseX, y: baseY) }
        let dx = (nockerlFacetJitter01(Int32(col), Int32(row)) - 0.5) * 2 * jitter
        let dy = (nockerlFacetJitter01(Int32(col + 101), Int32(row + 211)) - 0.5) * 2 * jitter
        return CGPoint(x: baseX + CGFloat(dx), y: baseY + CGFloat(dy))
    }

    func facet(
        _ tri: (CGPoint, CGPoint, CGPoint),
        _ col: Int,
        _ row: Int,
        _ half: Int
    ) -> NockerlFacet {
        let cx = (tri.0.x + tri.1.x + tri.2.x) / 3
        let cy = (tri.0.y + tri.1.y + tri.2.y) / 3
        let diagonalPos = min(max(Double((cx + cy) / diagSpan), 0), 1)
        let staticDelta =
            (nockerlFacetJitter01(Int32(col * 2 + half), Int32(row)) - 0.5) * 2
                * NockerlFacetedBackground.staticFacetJitter
        return NockerlFacet(
            a: tri.0, b: tri.1, c: tri.2,
            staticDelta: staticDelta, diagonalPos: diagonalPos
        )
    }

    var facets: [NockerlFacet] = []
    facets.reserveCapacity(cols * rows * 2)
    for row in 0..<(rows - 1) {
        for col in 0..<(cols - 1) {
            let tl = point(col, row)
            let tr = point(col + 1, row)
            let br = point(col + 1, row + 1)
            let bl = point(col, row + 1)
            let splitTlBr = (col + row) % 2 == 0
            let tri1 = splitTlBr ? (tl, tr, br) : (tl, tr, bl)
            let tri2 = splitTlBr ? (tl, br, bl) : (tr, br, bl)
            facets.append(facet(tri1, col, row, 0))
            facets.append(facet(tri2, col, row, 1))
        }
    }
    return facets
}

/// The faceted background fills its parent behind content. Reads `chatBg` +
/// `canvasEdge` from the palette, so it tracks the active theme.
public struct NockerlFacetedBackground: View {
    /// Nominal facet cell edge (Compose: 128dp), kept large so the mesh reads as
    /// a few big facets.
    static let cellSize: CGFloat = 128
    /// One full tone-wave cycle (seconds).
    static let wavePeriod: TimeInterval = 18
    /// Peak luminance swing the moving tone-wave adds to a facet.
    static let waveAmplitude: Double = 0.05
    /// Static per-facet luminance jitter range (±) baked at build.
    static let staticFacetJitter: Double = 0.022
    /// Alpha of the facet-edge hairline.
    static let edgeAlpha: Double = 0.05

    /// Freeze the tone-wave when `true`: the `TimelineView` schedule stops (0 CPU)
    /// while the faceted field stays on screen. Hosts set this when their window is
    /// occluded / backgrounded. Composed with Reduce Motion. Default `false`.
    private let paused: Bool

    /// Create the field.
    /// - Parameter paused: freeze the tone-wave (0 CPU) but keep the static field;
    ///   default `false` (the animating, pre-1.14.0 behavior).
    public init(paused: Bool = false) {
        self.paused = paused
    }

    public var body: some View {
        FieldBody(paused: paused)
    }

    /// One-slot geometry memo: the mesh rebuilds only when the size changes.
    /// A reference type mutated during draw, which is deliberate: the TimelineView
    /// is what drives invalidation, the cache never needs to.
    private final class FieldCache {
        var size: CGSize = .zero
        var facets: [NockerlFacet] = []

        func facets(for size: CGSize) -> [NockerlFacet] {
            if size != self.size {
                self.size = size
                facets = nockerlBuildFacetField(size: size, cell: NockerlFacetedBackground.cellSize)
            }
            return facets
        }
    }

    private struct FieldBody: View {
        let paused: Bool
        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.accessibilityReduceMotion) private var reduceMotion
        @State private var cache = FieldCache()

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let base = palette.chatBg
            let edge = palette.canvasEdge.opacity(NockerlFacetedBackground.edgeAlpha)

            // 20fps cap (v1.14.0): `minimumInterval` throttles the schedule from the
            // display's up-to-120fps to 20fps: sub-perceptual for the ~18s sine, ~6x
            // cheaper. `paused` (host occlusion) or Reduce Motion stops it entirely.
            TimelineView(.animation(minimumInterval: 1.0 / 20.0, paused: reduceMotion || paused)) { timeline in
                Canvas { context, size in
                    // Continuous phase from the frame timestamp. A full sine
                    // cycle wraps seamlessly. Reduce Motion pins it to 0.
                    let phase: Double
                    if reduceMotion {
                        phase = 0
                    } else {
                        let t = timeline.date.timeIntervalSinceReferenceDate
                        let period = NockerlFacetedBackground.wavePeriod
                        phase = (t.truncatingRemainder(dividingBy: period) / period) * 2 * .pi
                    }

                    context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(base))
                    for facet in cache.facets(for: size) {
                        let delta = nockerlFacetLuminanceDelta(
                            staticDelta: facet.staticDelta,
                            diagonalPos: facet.diagonalPos,
                            phase: phase
                        )
                        var path = Path()
                        path.move(to: facet.a)
                        path.addLine(to: facet.b)
                        path.addLine(to: facet.c)
                        path.closeSubpath()
                        context.fill(path, with: .color(NockerlContrast.shift(base, by: delta)))
                        context.stroke(path, with: .color(edge), lineWidth: 0.75)
                    }
                }
            }
        }
    }
}
