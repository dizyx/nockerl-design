// NockerlRecordingHUD: the floating "Nockerl is listening" pill on Swift, aligned
// VALUE-EXACT to the web canon (site RecordingHudDemo.tsx) per the design lead's
// ruling: "look just like the web version, but in Swift." Twin of the Compose
// NockerlRecordingHud.
//
// ANATOMY (left → right, showBrand default true):
//   [ NockerlLogo (16, theme ink) ] → [ gray vertical divider ] → [ CONTENT that
//   MORPHS per phase ] → [ optional trailing ghost Cancel ]
//
// THE COLOR SPLIT (the core fix that kills the over-warming, law §10): the record DOT
// is the ONLY warm element (statusError); the TIMER is THEME INK (onCanvas, never
// red); the METER bars are accentPrimary (brand cyan). The pill carries the §2
// floating accent edge (accentPrimary; statusWarning in the error phase only).
//
// PHASES ( folded in, the full dictation lifecycle, not recording-only):
//   recording:    pulsing red dot → mono timer (ink) → live cyan equalizer
//   paused:       static dimmed dot → muted timer → frozen muted equalizer → "Paused"
//   transcribing: indeterminate spinner → "Transcribing…"
//   error:        warn triangle → error text (2-line); pill border → statusWarning
//
// Golden determinism: the dot pulse + the meter are the infinite bits.
// Pass `animate: false` to freeze the dot at peak; the equalizer draws the supplied
// levels directly (a fixed list is deterministic). Per-bar ease is opt-in
// (`animateBars`, default off) at the web's ~80ms.

import SwiftUI

/// The §2 floating-over-content signature border (design-laws §2): any fixed
/// element floating over scrollable content carries this THICK cyan border on
/// its floating PARENT container. Twin of the Compose `NockerlFloatingBorderWidth`.
///
/// v1.17.0 made this an ALIAS onto the generated `NockerlBorder.widthFloating` token rather than
/// a hand-authored 1.5 (the drift the `border.width` token set exists to prevent). Kept as a
/// named public symbol because consumers already call it, and because the NAME is the point:
/// it says "this element floats", which `widthFloating` alone at a call site does not.
public enum NockerlFloatingBorder {
    /// The ratified "thick" weight, matched to the native chat-input pill.
    public static let width: CGFloat = NockerlBorder.widthFloating
}

/// The HUD's dictation phase, mirroring the web `HudPhase`. Drives
/// which content morphs in after the fixed logo + divider, plus the pill's border
/// tone (`error` → statusWarning).
public enum NockerlRecordingHudPhase: Equatable {
    /// Live capture: pulsing red dot → mono timer (ink) → live cyan meter.
    case recording
    /// Held: static dimmed dot → muted timer → frozen muted meter → "Paused".
    case paused
    /// Post-capture: indeterminate spinner → "Transcribing…" (no dot/timer/meter).
    case transcribing
    /// Failed: warn triangle → error text; the pill border rides statusWarning.
    case error
    /// Success: a checkmark → "Pasted"/"Copied" (drops the dot/timer/meter, like
    /// transcribing). The §2 accent edge stays. `pasted` = pasted-vs-copied.
    case result(pasted: Bool)
}

/// The HUD's opt-in entrance/exit ( bonus, additive, and the default `.none`
/// preserves the current in-place appearance). Motion is EYEBALL-only.
public enum NockerlRecordingHudEntrance: Equatable {
    /// No transition: appears/disappears in place (the default, unchanged).
    case none
    /// Pops UP from the bottom screen edge on insert, shoots back DOWN on removal
    /// (slide + fade). The HOST toggles the HUD's presence inside `withAnimation`;
    /// this equips the pill with the bottom-edge transition. Holds still while live.
    case fromBottom
}

/// The floating recording HUD pill (see the file header), value-exact to the web
/// canon. `phase` selects the morphing content; the logo + divider are fixed.
public struct NockerlRecordingHUD: View {
    private let phase: NockerlRecordingHudPhase
    private let elapsedLabel: String
    private let levels: [CGFloat]
    private let errorMessage: String
    private let transcribingLabel: String
    private let pausedLabel: String
    private let resultPastedLabel: String
    private let resultCopiedLabel: String
    private let showBrand: Bool
    private let animate: Bool
    private let animateBars: Bool
    private let showsCancel: Bool
    private let cancelLabel: String
    private let accessibilityLabelOverride: String?
    private let entrance: NockerlRecordingHudEntrance
    private let styleSelector: NockerlHudStyleSelector?
    private let onCancel: () -> Void

    @State private var pulsed = false
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Create a recording HUD.
    /// - Parameters:
    ///   - phase: the dictation phase (default `.recording`).
    ///   - elapsedLabel: the pre-formatted elapsed time (`m:ss`) for recording / paused.
    ///   - levels: per-bar levels (0…1) for the equalizer in recording / paused.
    ///   - errorMessage: the failure text (the `.error` phase).
    ///   - transcribingLabel: the transcribing status word.
    ///   - pausedLabel: the paused status word.
    ///   - resultPastedLabel: the success word when `.result(pasted: true)`.
    ///   - resultCopiedLabel: the success word when `.result(pasted: false)`.
    ///   - showBrand: `false` drops BOTH the logo and the divider (embedded chrome).
    ///   - animate: `false` freezes the dot pulse at peak (reduced-motion / snapshots).
    ///   - animateBars: opt-in ~80ms ease on each bar height (; default off).
    ///   - showsCancel: render the trailing ghost Cancel (default `false`, since the host
    ///     usually owns its own controls, law §9).
    ///   - cancelLabel: the ghost Cancel's label.
    ///   - accessibilityLabel: overrides the phase's combined live label.
    ///   - entrance: opt-in entrance/exit (; default `.none` = in place).
    ///   - onCancel: the ghost Cancel action.
    public init(
        phase: NockerlRecordingHudPhase = .recording,
        elapsedLabel: String = "",
        levels: [CGFloat] = [],
        errorMessage: String = "",
        transcribingLabel: String = "Transcribing…",
        pausedLabel: String = "Paused",
        resultPastedLabel: String = "Pasted",
        resultCopiedLabel: String = "Copied",
        showBrand: Bool = true,
        animate: Bool = true,
        animateBars: Bool = false,
        showsCancel: Bool = false,
        cancelLabel: String = "Cancel",
        accessibilityLabel: String? = nil,
        entrance: NockerlRecordingHudEntrance = .none,
        styleSelector: NockerlHudStyleSelector? = nil,
        onCancel: @escaping () -> Void = {}
    ) {
        self.phase = phase
        self.elapsedLabel = elapsedLabel
        self.levels = levels
        self.errorMessage = errorMessage
        self.transcribingLabel = transcribingLabel
        self.pausedLabel = pausedLabel
        self.resultPastedLabel = resultPastedLabel
        self.resultCopiedLabel = resultCopiedLabel
        self.showBrand = showBrand
        self.animate = animate
        self.animateBars = animateBars
        self.showsCancel = showsCancel
        self.cancelLabel = cancelLabel
        self.accessibilityLabelOverride = accessibilityLabel
        self.entrance = entrance
        self.styleSelector = styleSelector
        self.onCancel = onCancel
    }

    public var body: some View {
        if let styleSelector {
            // OPT-IN: the pill gains the expand-up drawer above it. The pill's OWN frame is
            // unchanged (§3.1). Only the panel above appears/collapses. The drawer view is
            // constructed ONLY in this branch (G1/G2: the base tree is never touched).
            VStack(spacing: NockerlSpace.space2) {
                if styleSelector.isOpen {
                    NockerlHudStyleDrawer(selector: styleSelector)
                        .transition(
                            reduceMotion
                                ? .opacity
                                : .scale(scale: 0.85, anchor: .bottom).combined(with: .opacity)
                        )
                }
                pill(restingStyle: styleSelector.showsResting ? styleSelector.activeStyle : nil)
            }
            .animation(
                reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.base),
                value: styleSelector.isOpen
            )
        } else {
            // BASE (default nil): byte-identical to today's HUD (no drawer, no VStack).
            pill(restingStyle: nil)
        }
    }

    /// The floating pill: the base HUD tree. `restingStyle` (non-nil only when a selector
    /// with `showsResting` is present) injects the disclosure chevron + active-style label
    /// into the constant-height content band; `nil` renders today's exact pill.
    @ViewBuilder
    private func pill(restingStyle: NockerlHudStyle?) -> some View {
        let palette = NockerlPalette.resolve(colorScheme)
        // The border rides the accent edge everywhere except error (statusWarning).
        let borderColor = phase == .error ? palette.statusWarning : palette.accentPrimary

        HStack(spacing: NockerlSpace.space3) {
            if showBrand {
                // The brand mark LEADS (task 2623), theme-adaptive ink, never cyan.
                NockerlLogo(size: 16)
                // The slight gray vertical divider (the web nk-hud__rule): 1×24.
                Rectangle()
                    .fill(palette.divider)
                    .frame(width: NockerlSpace.spacePx, height: NockerlSpace.space6)
            }

            // A CONSTANT content band (space6 = the divider height) so
            // EVERY phase renders at the same pill height; only WIDTH varies.
            content(palette: palette)
                .frame(height: NockerlSpace.space6)
                // v1.12.2 FIX 2: the recording readout (record-dot + count-up timer + wave)
                // WINS the horizontal space, so a long trailing style label WIDENS the pill
                // instead of squeezing the timer/wave (which overlapped + truncated the timer
                // to "…"). Inert in the base pill (it hugs its content, with no compression, so
                // base stays byte-identical, G2).
                .layoutPriority(1)

            if let restingStyle {
                // The resting style affordance: a trailing divider + the active-style
                // label. UNCONTROLLED (highlightedID == nil): a CLICKABLE `.plain` Button +
                // rotating chevron (mouse/keyboard open, v1.12.2). DRIVEN (v1.13.0,
                // highlightedID != nil): JUST the label, NO chevron, NO click affordance (the
                // non-activating pill is click-through; the host owns open/nav/commit, so a
                // chevron/keycap would falsely imply clickability).
                Rectangle()
                    .fill(palette.divider)
                    .frame(width: NockerlSpace.spacePx, height: NockerlSpace.space6)
                if styleSelector?.highlightedID == nil {
                    Button {
                        styleSelector?.isOpen.toggle()
                    } label: {
                        HStack(spacing: NockerlSpace.space1) {
                            Text(restingStyle.label)
                                .font(.nockerl(size: NockerlFontSize.size12, weight: .medium))
                                .foregroundColor(palette.onChromeMuted)
                                .lineLimit(1)
                            Image(systemName: "chevron.down")
                                .font(.system(size: NockerlFontSize.size10, weight: .semibold))
                                .foregroundColor(palette.onChromeMuted)
                                .rotationEffect(.degrees((styleSelector?.isOpen ?? false) ? 180 : 0))
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Dictation style, \(restingStyle.label)")
                    .accessibilityHint("Opens the style menu")
                } else {
                    // DRIVEN: a passive label only (no chevron, no click; host-driven).
                    Text(restingStyle.label)
                        .font(.nockerl(size: NockerlFontSize.size12, weight: .medium))
                        .foregroundColor(palette.onChromeMuted)
                        .lineLimit(1)
                }
            }

            if showsCancel {
                NockerlButton(cancelLabel, variant: .ghost, size: .sm, action: onCancel)
            }
        }
        .padding(.vertical, NockerlSpace.space2)
        .padding(.horizontal, NockerlSpace.space4)
        .background(palette.chromeSurface)
        .clipShape(Capsule(style: .continuous))
        .overlay {
            // The §2 signature edge (accent), or statusWarning in the error phase.
            Capsule(style: .continuous)
                .strokeBorder(borderColor, lineWidth: NockerlFloatingBorder.width)
        }
        .overlay {
            // The lit-from-above top catch-light (the web's inset highlight).
            Capsule(style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [palette.surfaceHighlight, .clear],
                        startPoint: .top,
                        endPoint: .center
                    ),
                    lineWidth: NockerlSpace.spacePx
                )
        }
        // L3 blur (raised/popover rung, matching the chat-input's float); the lift
        // opacity reads the shadowTintAlpha ladder at the matching level3 rung (0.33),
        // consistent with the L3 blur AND the Compose twin (which derives L3 from the rung).
        .shadow(
            color: palette.shadowTint.opacity(NockerlShadowTintAlpha.level3),
            radius: NockerlElevation.level3,
            x: 0,
            y: NockerlElevation.level3 / 2
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel(accessibilityLabelOverride ?? liveLabel)
        // Height is constant (the band above), so this animates only the
        // WIDTH: a smooth grow/shrink as the phase's content changes. Border-tone
        // and content also cross-fade on the same curve.
        .animation(.easeInOut(duration: 0.28), value: phase)
        // Opt-in entrance/exit: the host toggles presence in `withAnimation`; this
        // equips the pill to slide up from / down to the bottom edge (default none).
        .transition(
            entrance == .fromBottom
                ? .move(edge: .bottom).combined(with: .opacity)
                : .identity
        )
    }

    /// The morphing content after the logo + divider (one row per phase).
    @ViewBuilder
    private func content(palette: NockerlPalette) -> some View {
        switch phase {
        case .recording, .paused:
            let paused = phase == .paused
            HStack(spacing: NockerlSpace.space3) {
                // The ONE warm element: the record dot (statusError).
                Circle()
                    .fill(palette.statusError)
                    .frame(width: 8, height: 8)
                    .opacity(dotOpacity)
                    .onAppear {
                        guard animate, phase == .recording else { return }
                        withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                            pulsed = true
                        }
                    }

                // The timer: MONO + tabular (never jitters), THEME INK (never red).
                Text(elapsedLabel)
                    .font(.nockerlMono(size: NockerlFontSize.size12).monospacedDigit())
                    .foregroundColor(paused ? palette.onChromeMuted : palette.onCanvas)

                if !levels.isEmpty {
                    RecordingEqualizer(
                        levels: levels,
                        color: paused ? palette.onChromeMuted : palette.accentPrimary,
                        animateBars: animateBars && !paused
                    )
                }

                if paused {
                    statusWord(pausedLabel, palette: palette)
                }
            }

        case .transcribing:
            HStack(spacing: NockerlSpace.space2) {
                ProgressView()
                    .controlSize(.small)
                    .tint(palette.accentPrimary)
                statusWord(transcribingLabel, palette: palette)
            }

        case .error:
            HStack(spacing: NockerlSpace.space2) {
                // Color + ICON + TEXT (never color alone), the warm warning token.
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(palette.statusWarning)
                Text(errorMessage)
                    .font(.nockerl(size: NockerlFontSize.size12, weight: .regular))
                    .foregroundColor(palette.onChrome)
                    .lineLimit(1)
            }

        case let .result(pasted):
            HStack(spacing: NockerlSpace.space2) {
                // The completion glyph is BRAND cyan, not status-green: brand owns the
                // completion moment; the check glyph + Pasted/Copied label already carry the
                // success semantic, so color goes brand not status; unifies the HUD palette
                // (meters + §2 edge already cyan; green check was the lone outlier).
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(palette.accentPrimary)
                statusWord(pasted ? resultPastedLabel : resultCopiedLabel, palette: palette)
            }
        }
    }

    /// The status word (Paused / Transcribing…): sans, medium, on-chrome ink.
    private func statusWord(_ text: String, palette: NockerlPalette) -> some View {
        Text(text)
            .font(.nockerl(size: NockerlFontSize.size12, weight: .medium))
            .foregroundColor(palette.onChrome)
            .lineLimit(1)
    }

    /// The record dot's opacity: paused static .5; recording pulses 1↔.3 (frozen 1).
    private var dotOpacity: Double {
        if phase == .paused { return 0.5 }
        if animate && pulsed { return 0.3 }
        return 1
    }

    /// The visually-hidden live label per phase (a11y: pill reads as status).
    private var liveLabel: String {
        switch phase {
        case .recording: return "Recording, \(elapsedLabel)"
        case .paused: return "Paused at \(elapsedLabel)"
        case .transcribing: return transcribingLabel
        case .error: return "Error: \(errorMessage)"
        case let .result(pasted): return pasted ? resultPastedLabel : resultCopiedLabel
        }
    }
}

/// The compact VU equalizer: 5 centered bars, log-normalized EXACTLY like both
/// shipped apps (`ln(raw+1)/ln(32768)`, raw = level × 32767, clamped to [0.08, 1]).
/// Geometry is LITERAL (barWidth 3, gap 3, height 20): identical across platforms,
/// not tokens. Only HEIGHT animates (opt-in ~80ms ease).
private struct RecordingEqualizer: View {
    let levels: [CGFloat]
    let color: Color
    let animateBars: Bool

    /// Log-normalize a raw 0…1 level to a bar height in points (the app math).
    private func barHeight(_ level: CGFloat) -> CGFloat {
        let raw = Double(max(0, min(level, 1))) * 32_767
        let normalized = log(raw + 1) / log(32_768)
        let clamped = max(0.08, min(1, normalized))
        return CGFloat(clamped) * 20
    }

    var body: some View {
        HStack(alignment: .center, spacing: 3) {
            ForEach(levels.indices, id: \.self) { index in
                Capsule(style: .continuous)
                    .fill(color)
                    .frame(width: 3, height: barHeight(levels[index]))
                    .animation(animateBars ? .easeOut(duration: 0.08) : nil, value: levels[index])
            }
        }
        .frame(height: 20)
    }
}
