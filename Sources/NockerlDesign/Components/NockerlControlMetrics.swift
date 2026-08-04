// NockerlControlMetrics: RETIRED (v1.15.0). Intentionally a tombstone (no symbols).
//
// This file mirrored `size.minTouch` as `NockerlControlMetrics.minTouchTarget` before the Swift
// token build emitted a `NockerlSize` enum. Now that `NockerlSize.minTouch` ships (generated from
// `tokens/semantic/size.json`), the mirror is vestigial. Every consumer reads `NockerlSize.minTouch`
// directly (v1.15.0 migration). Its unrelated tenant `NockerlA11y` (the accessible-name helper)
// moved to its own home, `NockerlA11y.swift`.
//
// Kept as an empty tombstone rather than a hard delete, so an incremental file-scoped push
// overlays it cleanly; safe to remove entirely in a later housekeeping pass.
