// NockerlFailedTurn: the ONE calm failure-state grammar for chat surfaces.
//
// Replaces the old all-red filled failure cards (ChatBubble delivery-failed,
// AgentMessage stream-failed, ToolCallCard error) with a single quiet treatment
// derived from the alert-family canon:
//
//   - The Banner inline-alert anatomy, which supersedes the recessed well:
//     a NEUTRAL cardSurface1 plane (never a
//     red/pink tint fill), LIFTED (neutral L2 drop + top catch-light), traced by
//     the banner's whisper-red border (the canon 22% mix). The INSET error disc
//     leads; red rides border + disc glyph + title only.
//   - The DANGER coin (NockerlStatusDisc) leads, TOP-aligned to the first text
//     line: the disc side of the old mis-alignment (complaint (b)).
//   - The trailing cluster closes complaint (b) on the ACTION side: [trailingActions]
//     then retry are grouped in a CENTER-aligned sub-HStack so they share ONE
//     baseline, and retry is a .compact refresh ICON-button matched to the host's
//     trailing icons (v1.13.2: the old .sm text ghost read off-axis against them;
//     .top alone never equalized the text-vs-icon heights). The retry slot reserves
//     a FIXED compact footprint, so the retry-glyph <-> busy-spinner swap never
//     resizes or reflows the row.
//   - Just "failed" + retry: a short title in the error hue (sentence case, never
//     shouting), an optional detail line in normal ink, and an optional compact
//     retry icon. No "couldn't-send / not-delivered" pile-up (complaint (a)).
//
// One view serves all three hosts by varying title/detail; the praised same-sender
// grouping is unaffected (this is the turn's body, not its envelope). Mirrors the
// Compose NockerlFailedTurn 1:1.

import SwiftUI

/// The shared calm failure card (see the file header). Pass `onRetry: nil` for a
/// display-only failure with no action. The  slots are ADDITIVE and stay
/// inside the ratified banner grammar: [timestamp]/[duration] are a quiet
/// metadata line in the existing text column; [trailingActions] joins the
/// existing quiet action area; [isRetrying] swaps the retry icon for the small
/// accent busy spinner (busy = accent, the live canon: the control-busy
/// treatment, not a new grammar element).
public struct NockerlFailedTurn<TrailingActions: View>: View {
    private let title: String
    private let detail: String?
    private let onRetry: (() -> Void)?
    private let retryLabel: String
    private let timestamp: String?
    private let duration: String?
    private let isRetrying: Bool
    private let retryingLabel: String
    private let trailingActions: TrailingActions?

    /// Create a failed-turn card with extra trailing actions.
    /// - Parameters:
    ///   - title: the short failure label (default "Failed").
    ///   - detail: an optional one-line explanation ("The gateway returned a 502.").
    ///   - onRetry: optional retry callback; renders a trailing compact retry icon.
    ///   - retryLabel: the retry action label (default "Retry").
    ///   - timestamp: optional PRE-FORMATTED time ("14:02" / "2m ago"); the host
    ///     formats. Joined to [duration] with the dot separator.
    ///   - duration: optional pre-formatted length ("0:41").
    ///   - isRetrying: `true` shows the small accent busy spinner in place of the
    ///     retry ghost (you can't retry mid-retry), the control-busy canon.
    ///   - retryingLabel: the spinner's a11y name (default "Retrying"; strings stance).
    ///   - trailingActions: quiet extra actions (reveal, delete: ghost/compact
    ///     icon buttons) joining the trailing action area BEFORE the retry icon.
    public init(
        title: String = "Failed",
        detail: String? = nil,
        onRetry: (() -> Void)? = nil,
        retryLabel: String = "Retry",
        timestamp: String? = nil,
        duration: String? = nil,
        isRetrying: Bool = false,
        retryingLabel: String = "Retrying",
        @ViewBuilder trailingActions: () -> TrailingActions
    ) {
        self.title = title
        self.detail = detail
        self.onRetry = onRetry
        self.retryLabel = retryLabel
        self.timestamp = timestamp
        self.duration = duration
        self.isRetrying = isRetrying
        self.retryingLabel = retryingLabel
        self.trailingActions = trailingActions()
    }

    public var body: some View {
        FailedTurnBody(
            title: title,
            detail: detail,
            onRetry: onRetry,
            retryLabel: retryLabel,
            timestamp: timestamp,
            duration: duration,
            isRetrying: isRetrying,
            retryingLabel: retryingLabel,
            trailingActions: trailingActions
        )
    }

    /// Environment-reading render body.
    private struct FailedTurnBody: View {
        let title: String
        let detail: String?
        let onRetry: (() -> Void)?
        let retryLabel: String
        let timestamp: String?
        let duration: String?
        let isRetrying: Bool
        let retryingLabel: String
        let trailingActions: TrailingActions?

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let danger = NockerlAlertIntent.danger.color(in: palette)
            let shape = RoundedRectangle(cornerRadius: NockerlRadius.panel, style: .continuous)

            HStack(alignment: .top, spacing: NockerlSpace.space3) {
                NockerlStatusDisc(intent: .danger, inset: true)

                VStack(alignment: .leading, spacing: NockerlSpace.space1) {
                    Text(title)
                        .font(.nockerl(size: NockerlFontSize.size14, weight: .medium))
                        .foregroundColor(danger)
                    if let detail {
                        Text(detail)
                            .font(.nockerl(size: NockerlFontSize.size14, weight: .light))
                            .foregroundColor(palette.onCardMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    // The quiet metadata line: pre-formatted, dot-joined,
                    // one size quieter than the detail. Text in the existing
                    // column: no new grammar element.
                    let meta = [timestamp, duration].compactMap { $0 }.joined(separator: " · ")
                    if !meta.isEmpty {
                        Text(meta)
                            .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                            .foregroundColor(palette.onCardMuted)
                    }
                }

                Spacer(minLength: 0)

                // The quiet trailing action area (banner grammar ): [trailingActions]
                // then retry, grouped as ONE CENTER-aligned compact icon row so every
                // control shares a baseline. The red state stays on border + disc + title.
                // (v1.13.2: was direct children of the .top HStack, so the .sm text retry
                // read off-axis against the .compact trailing icons.)
                if trailingActions != nil || onRetry != nil || isRetrying {
                    HStack(alignment: .center, spacing: NockerlSpace.space3) {
                        if let trailingActions {
                            trailingActions
                        }
                        if onRetry != nil || isRetrying {
                            // The retry slot reserves a FIXED compact footprint (space8: the
                            // .compact NockerlIconButton visual box), so the retry-glyph <->
                            // busy-spinner swap never resizes or reflows the row.
                            ZStack {
                                if isRetrying {
                                    // Busy = the small ACCENT spinner (the live canon) riding the
                                    // slot, the control-busy treatment (the switch's in-thumb
                                    // spinner precedent), never a new grammar element.
                                    ProgressView()
                                        .controlSize(.small)
                                        .tint(palette.accentPrimary)
                                        .accessibilityLabel(retryingLabel)
                                } else if let onRetry {
                                    // Retry is a .compact refresh ICON-button matched to the
                                    // host's trailing icons (v1.13.2), not the old .sm text
                                    // ghost. `label:` carries the a11y name (= retryLabel).
                                    NockerlIconButton(
                                        systemName: "arrow.clockwise",
                                        label: retryLabel,
                                        style: .plain,
                                        density: .compact,
                                        tint: .neutral,
                                        action: onRetry
                                    )
                                }
                            }
                            .frame(width: NockerlSpace.space8, height: NockerlSpace.space8)
                        }
                    }
                }
            }
            .padding(.horizontal, NockerlSpace.space4)
            .padding(.vertical, NockerlSpace.space3)
            // NEUTRAL plane, never a red/pink tint (the pink-on-Light class);
            // the banner material lifts it: top catch-light + neutral L2 drop.
            .background(palette.cardSurface1)
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(palette.surfaceHighlight)
                    .frame(height: NockerlSpace.spacePx)
            }
            .clipShape(shape)
            .overlay {
                // The banner's whisper-red border, the canon 22% mix.
                shape.strokeBorder(
                    NockerlContrast.mix(
                        danger,
                        into: palette.cardHairline,
                        fraction: NockerlAlertMetrics.bannerBorderMix
                    ),
                    lineWidth: NockerlSpace.spacePx
                )
            }
            .shadow(
                color: palette.shadowTint.opacity(NockerlShadowTintAlpha.level2),
                radius: NockerlElevation.level2,
                x: 0,
                y: NockerlElevation.level2 / 2
            )
        }
    }
}


/// Actions-less convenience: the pre- signature, source-compatible (plus
/// the additive metadata/progress params).
public extension NockerlFailedTurn where TrailingActions == EmptyView {
    init(
        title: String = "Failed",
        detail: String? = nil,
        onRetry: (() -> Void)? = nil,
        retryLabel: String = "Retry",
        timestamp: String? = nil,
        duration: String? = nil,
        isRetrying: Bool = false,
        retryingLabel: String = "Retrying"
    ) {
        self.title = title
        self.detail = detail
        self.onRetry = onRetry
        self.retryLabel = retryLabel
        self.timestamp = timestamp
        self.duration = duration
        self.isRetrying = isRetrying
        self.retryingLabel = retryingLabel
        self.trailingActions = nil
    }
}
