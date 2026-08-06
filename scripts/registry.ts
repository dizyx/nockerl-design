#!/usr/bin/env bun
/**
 * registry.ts: the shared component registry for the graph gates.
 *
 * The canonical, machine-checkable hierarchy (TIER) + the file-discovery helpers used
 * by BOTH check-deps.ts (the import-graph / tier gate) and compose-graph.ts (the
 * composition-contract gate). One home so the two gates never drift on what a
 * component is, what tier it sits in, or how a file name maps to a component name.
 */
import { Glob } from 'bun';
import { basename, join } from 'node:path';

// Components now live in TWO roots: the published react PACKAGE (the extracted 39
// primitives + behaviors + composites) and the SITE (demos, brand marks, docs-infra).
// Both gates scan both roots so the graph spans the real published boundary.
export const SCAN_DIRS = [
  join(import.meta.dir, '..', 'packages/react/src'),
  join(import.meta.dir, '..', 'site/src/components'),
];

/** True if an (absolute) component file lives in the published @dizyx/nockerl-react package. */
export const isPackageFile = (abs: string): boolean => abs.includes('/packages/react/src/');

// Canonical tiers. 1=primitive · 2=behavior/overlay · 3=composite · 4=pattern/shell.
// 5=docs-infra (may compose anything; not a shipped design component).
export const TIER: Record<string, number> = {
  // brand primitives (shared, already reused)
  NockerlLogo: 1, NockerlLockup: 1,
  // docs infrastructure
  Example: 5, PropsTable: 5, StatusBadge: 5, PlatformTabs: 5, SiteTitle: 5, TypeSpecimen: 5, ComposeGraph: 5,
  // tier 1: primitives
  Icon: 1, Surface: 1, Field: 1, StatusDisc: 1, Well: 1, ProgressTrack: 1,
  Button: 1, IconButton: 1, Link: 1, Chip: 1, Badge: 1, Avatar: 1, StatusDot: 1, Spinner: 1,
  ProgressBar: 1, Slider: 1, Divider: 1, Checkbox: 1, Switch: 1, Card: 1, TextField: 1, TextArea: 1, Kbd: 1,
  FacetedBackground: 1, SegmentedControl: 1, Skeleton: 1, BrandMark: 1, Sparkline: 1, Gauge: 1,
  LineChart: 1, BarChart: 1, CircularProgress: 1, PageDots: 1, DefinitionTrigger: 1,
  // tier 2: behaviors / overlays / row
  Tooltip: 2, Popover: 2, Menu: 2, ListItem: 2, NavItem: 2, Calendar: 2, ListboxOption: 2, Overlay: 2,
  // tier 3: composites
  Dialog: 3, Drawer: 3, BottomSheet: 3, Banner: 3, Callout: 3, Toast: 3, SplitButton: 3, Combobox: 3,
  Select: 3, MultiSelect: 3, DatePicker: 3, DateRangePicker: 3, TimePicker: 3, SearchField: 3,
  Pagination: 3, Tabs: 3, Breadcrumbs: 3, Accordion: 3, Stepper: 3, Table: 3, Tree: 3, ChatBubble: 3,
  AgentMessage: 3, ToolCallCard: 3, StatCard: 3, KeyValue: 3, ContextGauge: 3, DiffViewer: 3,
  FileUpload: 3, EmptyState: 3, RecordingHud: 3, CodeBlock: 3, OtpInput: 3, FieldValidation: 3,
  MarkdownContent: 3, List: 3, Fab: 3, RadioGroup: 3, Chart: 3, Timeline: 3,
  // The FloatingPills canon promoted into the package as two composites
  // (the demo file keeps the FloatingPills name but is a package-backed harness now).
  SessionChip: 3, SessionChipsBar: 3,
  // Agent-console orchestration telemetry (web-first true gaps)
  JobRow: 3, NodeCell: 3, ClusterGrid: 4, TodoWidget: 3,
  // tier 4: patterns / shells
  AppShell: 4, TopBar: 4, Sidebar: 4, BottomNav: 4, Panel: 4, CommandPalette: 4,
  Wizard: 4, LongPressPop: 4, FormLayout: 4, Toolbar: 4,
};

export const TIER_NAME = ['', 'primitive', 'behavior', 'composite', 'pattern', 'docs-infra'];

/** component name for a file path: basename minus extension minus trailing "Demo". */
export const nameOf = (p: string): string => basename(p).replace(/\.(tsx|astro)$/, '').replace(/Demo$/, '');

/** All component source files across both roots, as ABSOLUTE paths, sorted. */
export const listComponentFiles = (): string[] => {
  const out: string[] = [];
  for (const root of SCAN_DIRS) for (const rel of new Glob('**/*.{tsx,astro}').scanSync(root)) out.push(join(root, rel));
  return out.sort();
};
