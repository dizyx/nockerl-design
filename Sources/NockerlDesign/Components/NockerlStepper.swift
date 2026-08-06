// NockerlStepper: process steps for wizards/flows (stepper.mdx).
//
// 32pt discs on the pill silhouette:
//   - DONE:      solid `accentPrimary` + checkmark knockout. **CYAN is the terminal /
//                progress seal (B14 ratified: flow completion is brand progress; green
//                stays for validation messages)**. No green anywhere here.
//   - CURRENT:   solid accent + the step number (reduce-fills, 2026-07-13: the
//                `accentPrimarySoft` halo wash is DROPPED; the accent disc + cyan
//                connectors carry "which step is current", state by indicator not fill).
//   - UPCOMING:  a recessed `canvasAlt` well with a `divider` border, muted number.
//   - ERROR:     solid `statusError` + ✕ knockout (pair with visible error text, law §13).
//
// Connectors: 3pt lines on the squared track radius (`divider` un-reached, solid
// accent completed). Horizontal (labels below) + vertical (labels beside, 360pt
// footprint = size.container.lg). State semantics are ONE pure function shared with
// Compose (`nockerlStepVisualState`), contract-tested on this rail.

import SwiftUI

/// One step of a ``NockerlStepper``.
public struct NockerlStep {
    /// The step label.
    public let label: String
    /// Optional supporting line (vertical orientation only).
    public let description: String?

    /// Create a step.
    public init(_ label: String, description: String? = nil) {
        self.label = label
        self.description = description
    }
}

/// Stepper layout axis.
public enum NockerlStepperOrientation: Equatable {
    /// Discs in a row, labels below.
    case horizontal
    /// Discs in a left rail, labels beside. Clamps to the 360pt footprint.
    case vertical
}

/// The visual state of one step (shared semantics with Compose).
enum NockerlStepVisualState: Equatable {
    case done, current, upcoming, error
}

/// Resolve a step's visual state, the identical rule on both platforms.
func nockerlStepVisualState(index: Int, current: Int, errorAt: Int?) -> NockerlStepVisualState {
    if index == current, errorAt == current { return .error }
    if index < current { return .done }
    if index == current { return .current }
    return .upcoming
}

/// Process steps with the ratified cyan progress discs.
public struct NockerlStepper: View {
    private let steps: [NockerlStep]
    private let current: Int
    private let orientation: NockerlStepperOrientation
    private let errorAt: Int?
    private let onStepClick: ((Int) -> Void)?

    /// Geometry (the ratified recipe).
    static let discSize: CGFloat = NockerlSpace.space8
    static let connectorThickness: CGFloat = 3
    static let ringWidth: CGFloat = NockerlSpace.space1
    static let horizontalColumnWidth: CGFloat = 72
    /// Vertical footprint: the `size.container.lg` token (360).
    static let verticalMaxWidth: CGFloat = 360

    /// Create a stepper.
    /// - Parameters:
    ///   - steps: the steps, in order.
    ///   - current: zero-based active index.
    ///   - orientation: horizontal (default) or vertical.
    ///   - errorAt: step index in the error state (honored when == current).
    ///   - onStepClick: when set, DONE steps become tappable (jump back only).
    public init(
        steps: [NockerlStep],
        current: Int,
        orientation: NockerlStepperOrientation = .horizontal,
        errorAt: Int? = nil,
        onStepClick: ((Int) -> Void)? = nil
    ) {
        self.steps = steps
        self.current = current
        self.orientation = orientation
        self.errorAt = errorAt
        self.onStepClick = onStepClick
    }

    public var body: some View {
        StepperBody(
            steps: steps,
            current: current,
            orientation: orientation,
            errorAt: errorAt,
            onStepClick: onStepClick
        )
    }

    private struct StepperBody: View {
        let steps: [NockerlStep]
        let current: Int
        let orientation: NockerlStepperOrientation
        let errorAt: Int?
        let onStepClick: ((Int) -> Void)?

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            switch orientation {
            case .horizontal: horizontal(palette: palette)
            case .vertical: vertical(palette: palette)
            }
        }

        private func horizontal(palette: NockerlPalette) -> some View {
            HStack(alignment: .top, spacing: 0) {
                ForEach(steps.indices, id: \.self) { index in
                    let state = nockerlStepVisualState(index: index, current: current, errorAt: errorAt)
                    if index > 0 {
                        connector(done: index <= current, palette: palette)
                            .frame(minWidth: NockerlSpace.space5)
                            // Center the 3pt line on the disc row (ring inset included).
                            .padding(.top, NockerlStepper.ringWidth + (NockerlStepper.discSize - NockerlStepper.connectorThickness) / 2)
                    }
                    stepColumn(index: index, step: steps[index], state: state, palette: palette)
                }
            }
        }

        private func vertical(palette: NockerlPalette) -> some View {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(steps.indices, id: \.self) { index in
                    let state = nockerlStepVisualState(index: index, current: current, errorAt: errorAt)
                    let isLast = index == steps.count - 1

                    HStack(alignment: .top, spacing: NockerlSpace.space3) {
                        VStack(spacing: NockerlSpace.space1) {
                            disc(index: index, state: state, palette: palette)
                            if !isLast {
                                RoundedRectangle(cornerRadius: NockerlRadius.track, style: .continuous)
                                    .fill(index < current ? palette.accentPrimary : palette.divider)
                                    .frame(width: NockerlStepper.connectorThickness)
                                    .frame(minHeight: NockerlSpace.space5)
                            }
                        }
                        .frame(width: NockerlStepper.discSize + NockerlStepper.ringWidth * 2)

                        VStack(alignment: .leading, spacing: NockerlSpace.space05) {
                            label(steps[index].label, state: state, palette: palette)
                            if let description = steps[index].description {
                                Text(description)
                                    .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                                    .foregroundColor(palette.onCardMuted)
                            }
                        }
                        .padding(.top, NockerlStepper.ringWidth)
                    }
                    .padding(.bottom, isLast ? 0 : NockerlSpace.space3)
                }
            }
            .frame(maxWidth: NockerlStepper.verticalMaxWidth, alignment: .leading)
        }

        @ViewBuilder
        private func stepColumn(
            index: Int,
            step: NockerlStep,
            state: NockerlStepVisualState,
            palette: NockerlPalette
        ) -> some View {
            let column = VStack(spacing: NockerlSpace.space2) {
                disc(index: index, state: state, palette: palette)
                label(step.label, state: state, palette: palette)
                    .multilineTextAlignment(.center)
            }
            .frame(width: NockerlStepper.horizontalColumnWidth)

            if let onStepClick, state == .done {
                Button {
                    onStepClick(index)
                } label: {
                    column.contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            } else {
                column
            }
        }

        /// The 32pt step disc, per-state per the ratified recipe.
        @ViewBuilder
        private func disc(index: Int, state: NockerlStepVisualState, palette: NockerlPalette) -> some View {
            let core = ZStack {
                switch state {
                case .done, .current, .error:
                    let fill = state == .error ? palette.statusError : palette.accentPrimary
                    Circle().fill(fill)
                    // The shared top catch-light, the same surfaceHighlight token.
                    Circle()
                        .strokeBorder(
                            LinearGradient(
                                colors: [palette.surfaceHighlight, .clear],
                                startPoint: .top,
                                endPoint: .center
                            ),
                            lineWidth: NockerlSpace.spacePx
                        )
                    if state == .current {
                        Text("\(index + 1)")
                            .font(.nockerl(size: NockerlFontSize.size14, weight: .medium))
                            .foregroundColor(palette.onAccent)
                    } else {
                        Image(systemName: state == .done ? "checkmark" : "xmark")
                            .font(.system(size: NockerlFontSize.size12, weight: .medium))
                            .foregroundColor(palette.onAccent)
                    }
                case .upcoming:
                    Circle().fill(palette.canvasAlt)
                    Circle().strokeBorder(palette.divider, lineWidth: NockerlSpace.spacePx)
                    Text("\(index + 1)")
                        .font(.nockerl(size: NockerlFontSize.size14, weight: .medium))
                        .foregroundColor(palette.onCardMuted)
                }
            }
            .frame(width: NockerlStepper.discSize, height: NockerlStepper.discSize)
            .shadow(
                color: state == .upcoming ? .clear : palette.shadowTint.opacity(NockerlCardElevation.level1.tintAlpha),
                radius: NockerlElevation.level1,
                x: 0,
                y: NockerlElevation.level1 / 2
            )
            .accessibilityLabel(accessibleName(for: state, index: index))

            // Reduce-fills (law §6): the CURRENT step reads via its accent DISC + the cyan
            // connectors; the accentPrimarySoft "which step is current" halo wash is dropped
            // (state by the indicator, not a fill). Uniform ring padding keeps discs aligned.
            core.padding(NockerlStepper.ringWidth)
        }

        private func label(_ text: String, state: NockerlStepVisualState, palette: NockerlPalette) -> Text {
            Text(text)
                .font(.nockerl(size: NockerlFontSize.size12, weight: state == .upcoming ? .light : .medium))
                .foregroundColor(
                    state == .error
                        ? palette.statusError
                        : (state == .upcoming ? palette.onCardMuted : palette.onCard)
                )
        }

        private func connector(done: Bool, palette: NockerlPalette) -> some View {
            RoundedRectangle(cornerRadius: NockerlRadius.track, style: .continuous)
                .fill(done ? palette.accentPrimary : palette.divider)
                .frame(height: NockerlStepper.connectorThickness)
                .frame(maxWidth: .infinity)
        }

        private func accessibleName(for state: NockerlStepVisualState, index: Int) -> String {
            let position = "Step \(index + 1) of \(steps.count)"
            switch state {
            case .done: return "\(position), completed"
            case .current: return "\(position), current"
            case .upcoming: return "\(position), upcoming"
            case .error: return "\(position), failed"
            }
        }
    }
}
