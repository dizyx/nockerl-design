// NockerlMotion: the SwiftUI bridge for the RATIFIED motion tokens (r3).
//
// The generated `NockerlMotionDuration` (seconds) + `NockerlMotionEasing` (bezier
// control points) are raw values; this extension turns them into `Animation`s so
// components write `.animation(.nockerlStandard(NockerlMotionDuration.fast))` and
// never re-type a curve. The pulse keeps `easeInOut` (a symmetric autoreversing
// rhythm); everything directional rides the standard curve.

import SwiftUI

public extension Animation {
    /// The standard Nockerl transition, `motion.easing.standard` at [duration].
    static func nockerlStandard(_ duration: TimeInterval) -> Animation {
        let c = NockerlMotionEasing.standard
        return .timingCurve(c.x1, c.y1, c.x2, c.y2, duration: duration)
    }

    /// The entrance ease, `motion.easing.emphasized` at [duration].
    static func nockerlEmphasized(_ duration: TimeInterval) -> Animation {
        let c = NockerlMotionEasing.emphasized
        return .timingCurve(c.x1, c.y1, c.x2, c.y2, duration: duration)
    }

    /// The exit ease, `motion.easing.exit` at [duration].
    static func nockerlExit(_ duration: TimeInterval) -> Animation {
        let c = NockerlMotionEasing.exit
        return .timingCurve(c.x1, c.y1, c.x2, c.y2, duration: duration)
    }
}
