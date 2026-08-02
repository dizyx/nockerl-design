// NockerlTree: the recursive hierarchy (file tree / subtree) for SwiftUI.
//
// Mirrors the ratified tree (tree.mdx). Per the page's Swift column AND law §9
// (honor the platform), this rides SwiftUI's native hierarchical `List`, so
// platform disclosure chevrons, indentation, and keyboard/VoiceOver behavior come
// from the system. It brands the rows: folder/file glyphs, single-select with
// the soft-accent wash + cyan ink (never a bespoke gesture layer).
//
// Scope: single-select. Multi-select tri-state checkboxes, git-status badges, and
// async-loading folders are web/Android-first follow-ups per the page, not
// silently faked here.

import SwiftUI

/// One node of a ``NockerlTree``: a folder (with children) or a leaf file.
public struct NockerlTreeNode: Identifiable, Equatable {
    /// The node kind. Decides the glyph and whether children are expected.
    public enum Kind: Equatable {
        /// An expandable branch.
        case folder
        /// A leaf.
        case file
    }

    /// Stable identity (path-like ids read best: `"src/components/Button.tsx"`).
    public let id: String
    /// The display name.
    public let name: String
    /// Folder or file.
    public let kind: Kind
    /// Child nodes: `nil` for leaves (an EMPTY array renders an expandable,
    /// empty folder; `nil` renders a leaf without a disclosure).
    public let children: [NockerlTreeNode]?

    /// Create a node.
    /// - Parameters:
    ///   - id: stable identity.
    ///   - name: display name.
    ///   - kind: folder or file (defaults to `.file` when children is `nil`,
    ///     `.folder` otherwise; pass explicitly to override).
    ///   - children: child nodes (folders only).
    public init(
        id: String,
        name: String,
        kind: Kind? = nil,
        children: [NockerlTreeNode]? = nil
    ) {
        self.id = id
        self.name = name
        self.kind = kind ?? (children == nil ? .file : .folder)
        self.children = children
    }
}

/// A recursive, expandable tree over ``NockerlTreeNode``s with single selection.
public struct NockerlTree: View {
    private let nodes: [NockerlTreeNode]
    private let selected: String?
    private let onSelect: (NockerlTreeNode) -> Void
    private let label: String

    /// Create a tree.
    /// - Parameters:
    ///   - nodes: the root nodes.
    ///   - selected: the selected node id (or `nil`).
    ///   - label: the REQUIRED accessible name for the whole tree ("Project files").
    ///   - onSelect: invoked with the tapped node (folders AND files: the caller
    ///     decides whether folder taps navigate or only disclose).
    public init(
        nodes: [NockerlTreeNode],
        selected: String? = nil,
        label: String,
        onSelect: @escaping (NockerlTreeNode) -> Void
    ) {
        assert(
            NockerlA11y.accessibleName(from: label) != nil,
            "NockerlTree requires a non-empty accessible label (design-laws §13)."
        )
        self.nodes = nodes
        self.selected = selected
        self.label = label
        self.onSelect = onSelect
    }

    public var body: some View {
        TreeBody(nodes: nodes, selected: selected, onSelect: onSelect)
            .accessibilityLabel(label)
    }

    /// Environment-reading render body.
    private struct TreeBody: View {
        let nodes: [NockerlTreeNode]
        let selected: String?
        let onSelect: (NockerlTreeNode) -> Void

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)

            // The native hierarchical List: platform disclosure + indentation.
            List(nodes, children: \.children) { node in
                TreeRow(
                    node: node,
                    isSelected: node.id == selected,
                    palette: palette,
                    onSelect: onSelect
                )
            }
        }
    }

    /// One branded row: glyph + name, thin cyan selection BORDER + cyan ink (reduce-fills:
    /// state by outline, not fill; no wash).
    private struct TreeRow: View {
        let node: NockerlTreeNode
        let isSelected: Bool
        let palette: NockerlPalette
        let onSelect: (NockerlTreeNode) -> Void

        var body: some View {
            Button {
                onSelect(node)
            } label: {
                HStack(spacing: NockerlSpace.space2) {
                    Image(systemName: node.kind == .folder ? "folder" : "doc")
                        .foregroundColor(isSelected ? palette.accentPrimary : palette.onCardMuted)
                    Text(node.name)
                        .font(.nockerl(size: NockerlFontSize.size14, weight: .light))
                        .foregroundColor(isSelected ? palette.accentPrimary : palette.onCard)
                    Spacer(minLength: 0)
                }
                .padding(.vertical, NockerlSpace.space05)
                .padding(.horizontal, NockerlSpace.space1)
                // Reduce-fills (law §6): selection reads via a thin cyan BORDER + the cyan
                // glyph/label ink, never a wash.
                .overlay(
                    RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)
                        .strokeBorder(
                            isSelected
                                ? palette.accentPrimary.opacity(NockerlBorderOpacity.selection)
                                : Color.clear,
                            lineWidth: NockerlBorder.widthSelection
                        )
                )
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(isSelected ? .isSelected : [])
        }
    }
}
