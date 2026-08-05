// @dizyx/nockerl-react - public barrel (the semver surface).
//
// MAINTAINED BY HAND. It used to be generated, and the header said so long after the
// generator was deleted, which is worse than no comment: it tells you edits here will be
// overwritten, so you go looking for a script that does not exist. Adding a component
// means adding its line below. Per-component `compose` consts and default exports are
// deliberately NOT re-exported: `compose` is the contract the composition gate reads,
// and the named exports are the stable API.
//
// Every relative specifier ends in .js, including the ones that resolve to .ts sources.
// That is what Node's ESM resolver requires, and the package tsconfig uses NodeNext so
// the compiler rejects a missing extension rather than emitting something only Bun and
// bundlers can load.

export { ALERT_INTENT, type AlertIntent, type IntentColors } from './alertIntents.js';
export { NOCKERL_CALENDAR_STYLES, NockerlCalendar, MONTHS, WEEKDAYS, addDays, addMonths, buildGrid, fromDay, key, monIndex, sameDay, toDay, type NockerlCalendarMode, type NockerlCalendarProps, type Day } from './behaviors/Calendar.js';
export { NOCKERL_LISTBOX_OPTION_STYLES, NockerlListboxOption, listboxRun, type NockerlListboxOptionProps, type ListboxOptionRun, type NockerlListboxOptionStatus } from './behaviors/ListboxOption.js';
export { NOCKERL_LIST_ITEM_STYLES, NockerlListItem, type NockerlListItemProps, type NockerlListItemStatus } from './behaviors/ListItem.js';
export { NOCKERL_MENU_STYLES, NockerlMenu, type ItemKind, type MenuItem, type NockerlMenuProps, type MenuTriggerApi, type OpenState } from './behaviors/Menu.js';
export { NOCKERL_NAV_ITEM_STYLES, NockerlNavItem, type NavItemCount, type NockerlNavItemLayout, type NockerlNavItemProps, type NockerlNavItemStatus } from './behaviors/NavItem.js';
export { NOCKERL_OVERLAY_STYLES, NockerlOverlay, type NockerlOverlayPlacement, type NockerlOverlayProps, type NockerlOverlayRenderApi } from './behaviors/Overlay.js';
export { NOCKERL_POPOVER_STYLES, NockerlPopover, type NockerlPopoverHandle, type NockerlPopoverProps, type Side } from './behaviors/Popover.js';
export { NOCKERL_TOOLTIP_STYLES, NockerlTooltip, type TooltipConfig, type NockerlTooltipProps, type NockerlTooltipRenderArgs, type NockerlTooltipTriggerProps } from './behaviors/Tooltip.js';
export { assertComposeChildren, isContainer, tierOf, type ComposeContract, type ComposeTier, type ContainerContract, type LeafContract, type SlotAccepts, type SlotSpec } from './compose-contract.js';
export { NOCKERL_APPROVAL_CONTENT_STYLES, NockerlApprovalActions, NockerlApprovalContent, type NockerlApprovalActionsProps, type NockerlApprovalContentProps } from './composites/ApprovalContent.js';
export { NOCKERL_ATTACHMENT_POPOVER_STYLES, NockerlAttachmentPopover, type NockerlAttachment, type NockerlAttachmentPopoverProps } from './composites/AttachmentPopover.js';
export { NOCKERL_BANNER_STYLES, NockerlBanner, type NockerlBannerIntent, type NockerlBannerProps } from './composites/Banner.js';
export { NOCKERL_BOTTOM_SHEET_STYLES, NockerlBottomSheet, type NockerlBottomSheetProps, type SheetDetent } from './composites/BottomSheet.js';
export { NOCKERL_CALLOUT_STYLES, NockerlCallout, type NockerlCalloutProps, type NockerlCalloutTone } from './composites/Callout.js';
export { NOCKERL_CHAT_INPUT_STYLES, NockerlChatInput, type NockerlChatInputProps } from './composites/ChatInput.js';
export { NOCKERL_CLUSTER_GRID_STYLES, NockerlClusterGrid, type NockerlClusterGridProps } from './composites/ClusterGrid.js';
export { NOCKERL_DEV_STATUS_BAR_STYLES, NockerlDevStatusBar, NockerlDevStatusSegment, type NockerlDevStatusBarProps, type NockerlDevStatusSegmentProps } from './composites/DevStatusBar.js';
export { NOCKERL_DIALOG_STYLES, NockerlDialog, type NockerlDialogProps } from './composites/Dialog.js';
export { NOCKERL_FILE_EXPLORER_STYLES, NockerlFileExplorer, type NockerlFileExplorerProps } from './composites/FileExplorer.js';
export { NOCKERL_DRAWER_STYLES, NockerlDrawer, NockerlNavSurface, type NockerlDrawerProps, type NockerlNavSurfaceProps, type DrawerEdge, type DrawerMode, type NavSurfaceMode, type NavSurfaceSide } from './composites/Drawer.js';
export { NOCKERL_JOB_ROW_STYLES, NockerlJobRow, type NockerlJobRowProps, type NockerlJobState } from './composites/JobRow.js';
export { NOCKERL_NODE_CELL_STYLES, NockerlNodeCell, type NockerlNodeCellProps, type NockerlNodeMetric } from './composites/NodeCell.js';
export { NOCKERL_PAGINATION_STYLES, NockerlPagination, pageTokens, type NockerlPaginationProps, type NockerlPaginationVariant } from './composites/Pagination.js';
export { NOCKERL_RADIO_GROUP_STYLES, NockerlRadioGroup, type NockerlRadioGroupProps, type RadioOption, type RadioSize } from './composites/RadioGroup.js';
export { NOCKERL_SELECT_STYLES, NockerlSelect, type NockerlSelectProps, type NockerlSelectOption, type NockerlSelectSize, type NockerlSelectStatus } from './composites/Select.js';
export { NOCKERL_SESSION_CHIP_STYLES, NockerlContextChip, NockerlSessionChip, contextLineColor, type NockerlContextChipProps, type NockerlSessionChipDot, type NockerlSessionChipProps } from './composites/SessionChip.js';
export { NOCKERL_SESSION_CHIPS_BAR_STYLES, NockerlSessionChipsBar, type NockerlSessionChipsBarProps } from './composites/SessionChipsBar.js';
export { NOCKERL_STEPPER_STYLES, NockerlStepper, type Step, type StepStatus, type NockerlStepperOrientation, type NockerlStepperProps } from './composites/Stepper.js';
export { NOCKERL_TABLE_STYLES, NockerlTable, type NockerlTableProps, type NockerlTableColumn, type NockerlTableSort, type NockerlTableAlign, type NockerlTableSortDir, type NockerlTableDensity } from './composites/Table.js';
export { NOCKERL_TABS_STYLES, NockerlTabs, type TabItemDef, type NockerlTabsProps, type NockerlTabsSize, type NockerlTabsVariant } from './composites/Tabs.js';
export { NOCKERL_TOAST_STYLES, NockerlToast, type NockerlToastProps, type NockerlToastIntent } from './composites/Toast.js';
export { NOCKERL_TODO_WIDGET_STYLES, NockerlTodoWidget, type NockerlTodoItem, type NockerlTodoState, type NockerlTodoWidgetProps } from './composites/TodoWidget.js';
export { NOCKERL_TREE_STYLES, NockerlTree, type NockerlTreeProps, type NockerlTreeNode, type NockerlTreeFileType, type NockerlTreeSelectable } from './composites/Tree.js';
export { NOCKERL_AVATAR_STYLES, NockerlAvatar, NockerlAvatarStack, type NockerlAvatarProps, type NockerlAvatarShape, type NockerlAvatarSize, type Presence } from './primitives/Avatar.js';
export { NOCKERL_BADGE_STYLES, NockerlBadge, type NockerlBadgeProps, type NockerlBadgeSize, type NockerlBadgeTone, type NockerlBadgeVariant } from './primitives/Badge.js';
export { NockerlLanguageBadge, type NockerlLanguageBadgeProps } from './primitives/LanguageBadge.js';
export { nockerlLanguageLabel } from './languageLabel.js';
export { NOCKERL_BAR_CHART_STYLES, NockerlBarChart, type NockerlBarChartProps, type ChartBar } from './primitives/BarChart.js';
export { NOCKERL_BUTTON_STYLES, NockerlButton, type NockerlButtonProps, type NockerlButtonSize, type NockerlButtonVariant } from './primitives/Button.js';
export { NOCKERL_CHECKBOX_STYLES, NockerlCheckbox, type NockerlCheckboxProps, type NockerlCheckboxSize, type CheckedState } from './primitives/Checkbox.js';
export { NOCKERL_CHIP_STYLES, NockerlChip, type NockerlChipProps } from './primitives/Chip.js';
export { NOCKERL_CIRCULAR_PROGRESS_STYLES, NockerlCircularProgress, type NockerlCircularProgressProps } from './primitives/CircularProgress.js';
export { NOCKERL_DEFINITION_TRIGGER_STYLES, NockerlDefinitionTrigger, type NockerlDefinitionTriggerProps } from './primitives/DefinitionTrigger.js';
export { NOCKERL_DIVIDER_STYLES, NockerlDivider, type NockerlDividerOrientation, type NockerlDividerProps, type NockerlDividerTone } from './primitives/Divider.js';
export { NOCKERL_FACETED_BACKGROUND_STYLES, NockerlFacetedBackground, type NockerlFacetedBackgroundProps } from './primitives/FacetedBackground.js';
export { NOCKERL_TEXT_AREA_STYLES, NOCKERL_TEXT_FIELD_STYLES, NockerlTextArea, NockerlTextField, type FieldState, type FieldStatus, type NockerlTextAreaProps, type NockerlTextFieldProps } from './primitives/Field.js';
export { GAUGE_BAND_FILL, GAUGE_BAND_WORD, GAUGE_HIGH, GAUGE_LOW, NOCKERL_GAUGE_STYLES, NockerlGauge, gaugeBand, type GaugeBand, type NockerlGaugeProps, type NockerlGaugeShape } from './primitives/Gauge.js';
export { ICONS, ICON_SIZE, NockerlIcon, type IconName, type NockerlIconProps, type IconSizeToken } from './primitives/Icon.js';
export { NOCKERL_ICON_BUTTON_STYLES, NockerlIconButton, type NockerlIconButtonProps, type NockerlIconButtonStyle } from './primitives/IconButton.js';
export { NOCKERL_KBD_STYLES, NockerlKbd, type NockerlKbdProps } from './primitives/Kbd.js';
export { NOCKERL_LINE_CHART_STYLES, NockerlLineChart, type ChartSeries, type NockerlLineChartProps } from './primitives/LineChart.js';
export { NOCKERL_LINK_STYLES, NockerlLink, type NockerlLinkProps, type NockerlLinkVariant } from './primitives/Link.js';
export { NOCKERL_PAGE_DOTS_STYLES, NockerlPageDots, type NockerlPageDotsProps } from './primitives/PageDots.js';
export { NOCKERL_PROGRESS_TRACK_STYLES, NockerlProgressSegments, NockerlProgressTrack, TONE_FILL, TONE_HI, type NockerlProgressSegmentsProps, type ProgressSize, type ProgressTone, type NockerlProgressTrackProps } from './primitives/ProgressTrack.js';
export { NOCKERL_SEGMENTED_CONTROL_STYLES, SEGMENT_ICONS, NockerlSegmentedControl, type Segment, type SegmentSize, type NockerlSegmentedControlProps } from './primitives/SegmentedControl.js';
export { NockerlRangeSlider, NOCKERL_SLIDER_STYLES, NockerlSlider, fmt, type NockerlRangeSliderProps, type NockerlSliderProps, type NockerlSliderSize } from './primitives/Slider.js';
export { NOCKERL_SPARKLINE_STYLES, NockerlSparkline, sparkPath, type NockerlSparklineProps } from './primitives/Sparkline.js';
export { NOCKERL_SPINNER_STYLES, NockerlSpinner, type NockerlSpinnerProps, type NockerlSpinnerSize, type NockerlSpinnerTone } from './primitives/Spinner.js';
export { NOCKERL_STATUS_DISC_STYLES, NockerlStatusDisc, type NockerlStatusDiscProps } from './primitives/StatusDisc.js';
export { NOCKERL_STATUS_DOT_STYLES, NockerlStatusDot, type NockerlStatusDotProps, type StatusKind, type StatusSize } from './primitives/StatusDot.js';
export { NockerlSurface, type NockerlSurfaceLevel, type NockerlSurfaceProps, type NockerlSurfaceVariant } from './primitives/Surface.js';
export { NOCKERL_SWITCH_STYLES, NockerlSwitch, type NockerlSwitchProps, type NockerlSwitchSize } from './primitives/Switch.js';
export { NOCKERL_WELL_STYLES, NockerlWell, type NockerlWellLayout, type NockerlWellProps } from './primitives/Well.js';
