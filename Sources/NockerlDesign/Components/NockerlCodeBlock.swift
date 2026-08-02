// NockerlCodeBlock: the dedicated code-display surface for SwiftUI.
//
// Mirrors the ratified code block (code-block.mdx): a RECESSED monospace well
// ("fields sink", law §2: code is content you read, set into the page) with an
// optional filename header, a copy affordance, optional line numbers, and
// horizontal scrolling. Lines NEVER wrap by default. Replaces Voice's raw
// `.monospaced` Text (the page's drift aside).
//
// Font note: the ratified code face is Space Mono (law §11), but the Swift token
// build does not yet emit a mono type role and the package bundles no fonts, so
// this renders the PLATFORM monospaced design (no font-family literal is
// hardcoded; the token-emission + bundling gap is the flagged follow-up, same
// class as the size.minTouch mirror).
//
// Scope: syntax highlighting, highlight-lines, and the unified-diff mode are
// documented follow-ups (the page ships them web-first); the well + header +
// gutter + copy is the ratified core every platform shares.

import SwiftUI

/// A recessed monospace code well with an optional filename header, copy button,
/// and line-number gutter. Content scrolls horizontally; it never soft-wraps
/// unless [wrap] is set.
public struct NockerlCodeBlock: View {
    private let code: String
    private let filename: String?
    private let language: String?
    private let showLineNumbers: Bool
    private let wrap: Bool

    /// How long the "copied" confirmation shows before reverting (~2s per spec).
    static let copyConfirmationSeconds: TimeInterval = 2

    /// Create a code block.
    /// - Parameters:
    ///   - code: the source text (rendered verbatim).
    ///   - filename: optional header title ("build.gradle.kts"); the header also
    ///     hosts the copy button, and renders whenever a filename is present.
    ///   - language: optional code language ("kotlin"). Renders the shared
    ///     language badge in the header trailing slot.
    ///   - showLineNumbers: render the muted right-aligned gutter.
    ///   - wrap: soft-wrap long lines instead of scrolling (default `false`;
    ///     horizontal scroll is the idiom).
    public init(
        _ code: String,
        filename: String? = nil,
        language: String? = nil,
        showLineNumbers: Bool = false,
        wrap: Bool = false
    ) {
        self.code = code
        self.filename = filename
        self.language = language
        self.showLineNumbers = showLineNumbers
        self.wrap = wrap
    }

    public var body: some View {
        CodeBlockBody(
            code: code,
            filename: filename,
            language: language,
            showLineNumbers: showLineNumbers,
            wrap: wrap
        )
    }

    /// Split code into display lines (a trailing newline does not add a phantom
    /// empty line). Internal so the gutter contract is testable.
    static func lines(of code: String) -> [String] {
        var lines = code.components(separatedBy: "\n")
        if lines.last?.isEmpty == true, lines.count > 1 {
            lines.removeLast()
        }
        return lines
    }

    /// Environment-reading render body.
    private struct CodeBlockBody: View {
        let code: String
        let filename: String?
        let language: String?
        let showLineNumbers: Bool
        let wrap: Bool

        @Environment(\.colorScheme) private var colorScheme
        @State private var copied = false

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let shape = RoundedRectangle(cornerRadius: NockerlRadius.panel, style: .continuous)

            VStack(alignment: .leading, spacing: 0) {
                if filename != nil || language != nil || NockerlClipboard.isAvailable {
                    header(palette: palette)
                }
                content(palette: palette)
            }
            .background(palette.canvasAlt)
            .clipShape(shape)
            .overlay(shape.strokeBorder(palette.cardHairline, lineWidth: NockerlSpace.spacePx))
        }

        /// Filename + copy affordance row.
        private func header(palette: NockerlPalette) -> some View {
            HStack(spacing: NockerlSpace.space2) {
                if let language {
                    NockerlBadge.language(language)
                }
                if let filename {
                    Text(filename)
                        .font(.nockerlMono(size: NockerlFontSize.size12))
                        .foregroundColor(palette.onCardMuted)
                }
                Spacer(minLength: 0)
                if NockerlClipboard.isAvailable {
                    NockerlIconButton(
                        Image(systemName: copied ? "checkmark" : "doc.on.doc"),
                        label: copied ? "Copied" : "Copy code"
                    ) {
                        NockerlClipboard.copy(code)
                        copied = true
                        DispatchQueue.main.asyncAfter(
                            deadline: .now() + NockerlCodeBlock.copyConfirmationSeconds
                        ) {
                            copied = false
                        }
                    }
                }
            }
            .padding(.leading, NockerlSpace.space3)
            .padding(.trailing, NockerlSpace.space1)
        }

        /// The code body: gutter + text, horizontally scrolling unless wrapping.
        @ViewBuilder
        private func content(palette: NockerlPalette) -> some View {
            let codeText = HStack(alignment: .top, spacing: NockerlSpace.space3) {
                if showLineNumbers {
                    gutter(palette: palette)
                }
                Text(code)
                    .font(.nockerlMono(size: NockerlFontSize.size12))
                    .foregroundColor(palette.onCard)
                    .nockerlTextSelectable()
                    .fixedSize(horizontal: !wrap, vertical: false)
            }
            .padding(.horizontal, NockerlSpace.space3)
            .padding(.vertical, NockerlSpace.space2)

            if wrap {
                codeText
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    codeText
                }
            }
        }

        /// Muted right-aligned line numbers.
        private func gutter(palette: NockerlPalette) -> some View {
            VStack(alignment: .trailing, spacing: 0) {
                ForEach(Array(NockerlCodeBlock.lines(of: code).indices), id: \.self) { index in
                    Text(String(index + 1))
                        .font(.nockerlMono(size: NockerlFontSize.size12))
                        .foregroundColor(palette.onCardMuted)
                }
            }
        }
    }
}

private extension View {
    /// `.textSelection(.enabled)` where the platform has it (macOS/iOS); a
    /// pass-through on tvOS/watchOS, which ship no text-selection API.
    @ViewBuilder
    func nockerlTextSelectable() -> some View {
        #if os(iOS) || os(macOS)
        self.textSelection(.enabled)
        #else
        self
        #endif
    }
}

/// Minimal cross-platform clipboard shim for the copy affordance. Unavailable on
/// watchOS/tvOS (no general pasteboard). The copy button simply doesn't render
/// there; text selection remains the fallback.
enum NockerlClipboard {
    /// Whether the running platform has a general pasteboard.
    static var isAvailable: Bool {
        #if os(macOS) || os(iOS)
        return true
        #else
        return false
        #endif
    }

    /// Put [text] on the general pasteboard (no-op where unavailable).
    static func copy(_ text: String) {
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #elseif os(iOS)
        UIPasteboard.general.string = text
        #endif
    }
}
