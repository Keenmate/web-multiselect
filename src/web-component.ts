/**
 * `<web-multiselect>` — the custom element, now built on
 * `@keenmate/web-components-core` (`BlissElement`).
 *
 * All the custom-element plumbing that used to live here by hand — the
 * `ATTRIBUTE_TABLE`, `observedAttributes`, `attributeChangedCallback`,
 * `parseAttrValue`, the `setAttributes` batch, and the ~40 property/callback
 * getters/setters — is now declared ONCE as a core input table (`static inputs`)
 * plus an event table (`static events`). Core owns parsing, validation,
 * reactivity coalescing, reflection, and the managed `on<Name>` handler
 * properties. This file keeps only what is genuinely multiselect-specific: the
 * bridge from the merged `config` to the real dropdown engine (`WebMultiSelect`
 * in `multiselect.ts`), declarative `<option>` parsing, form association, the
 * CSS-var sugar, and the debug panel.
 *
 * Reactivity is declared per input via `on:`:
 *   - `reinit`  — data shape / layout mode → rebuild the picker.
 *   - `update`  — cosmetics → `picker.updateOptions(partial)` in place.
 * A mixed batch runs `reinit()` only (the rebuild absorbs the update keys).
 */
import {
  BlissElement,
  toBool,
  toEnum,
  toInt,
  toText,
  toFunction,
  toObjectArray,
  toValue,
  adoptStyles,
  createStyleSlot,
  extractConsumedCssVars,
  lintCssVars,
  getEnvironment,
  resolvePresentation,
  type InputDef,
  type StyleSlot,
  type EnvironmentSnapshot,
  type ElementSize,
  type MobilePresentation,
} from '@keenmate/web-components-core';
import { WebMultiSelect } from './multiselect';
import type {
  MultiSelectConfig,
  MultiSelectEventDetail,
  OptionContentRenderContext,
  BadgeContentRenderContext,
  MessageOptions,
} from './types';
import { toInitialValues } from './converters';
import { parseOptionsData, OPTIONS_FORMATS, type OptionsFormat } from './option-formats';
import styles from './css/main.css?inline';
import { dataLogger } from './logger';

// Type declarations for build-time constants
declare const __VERSION__: string;

/** Floating-UI placement values, shared by the two tooltip-placement enums. */
const PLACEMENTS = [
  'top', 'top-start', 'top-end',
  'bottom', 'bottom-start', 'bottom-end',
  'left', 'left-start', 'left-end',
  'right', 'right-start', 'right-end',
] as const;

/** Any callback input. */
const cb = (): ReturnType<typeof toFunction> => toFunction();

// ============================================================================
// INPUT TABLE — the whole @keenmate/web-multiselect public surface, one row each
// ============================================================================
const INPUTS: readonly InputDef[] = [
  // ── Strings (cosmetic → update). Optional ones are nullable: absent → null ─
  { configKey: 'searchHint',              attribute: 'search-hint',                 converter: toText({ isNullable: true }),            on: 'update', description: 'Small hint text shown beneath the search input.' },
  { configKey: 'searchPlaceholder',       attribute: 'search-placeholder',          converter: toText({ isNullable: true }),          on: 'update', description: 'Placeholder text for the search input. When unset it defaults to "Search..."; if `show-search-mode-toggle` is on, the default instead becomes mode-aware ("Search…" in navigate, "Filter…" in filter). An explicit value always wins and stays fixed.' },
  { configKey: 'selectPlaceholder',       attribute: 'select-placeholder',          converter: toText({ default: 'Pick an option...' }), on: 'update', description: 'Placeholder shown on the control when nothing is selected.' },
  { configKey: 'noDataPlaceholder',       attribute: 'no-data-placeholder',         converter: toText({ isNullable: true }),            on: 'update', description: 'Text shown when there are no options at all.' },
  { configKey: 'dropdownMinWidth',        attribute: 'dropdown-min-width',          converter: toText({ isNullable: true }),            on: 'update', description: 'Minimum width of the dropdown panel (any CSS length).' },
  { configKey: 'dropdownMaxWidth',        attribute: 'dropdown-max-width',          converter: toText({ isNullable: true }),            on: 'update', description: 'Maximum width of the dropdown panel (any CSS length).' },
  { configKey: 'maxHeight',               attribute: 'max-height',                  converter: toText({ default: '20rem' }),          on: 'update', description: 'Maximum height of the dropdown list before it scrolls.' },
  { configKey: 'emptyMessage',            attribute: 'empty-message',               converter: toText({ default: 'No results found' }), on: 'update', description: 'Message shown when a search yields no matches.' },
  { configKey: 'addNewText',              attribute: 'add-new-text',                converter: toText({ isNullable: true }),          on: 'update', description: 'Template for the clickable "add new" prompt shown (when `allow-add-new` is on) in place of the empty message once a search yields no matches. `{value}` is replaced with the typed text. Default: `Add "{value}"`. A `getAddNewTextCallback` wins.' },
  { configKey: 'addNewPendingText',       attribute: 'add-new-pending-text',        converter: toText({ isNullable: true }),          on: 'update', description: 'Template for the pending prompt (spinner + text) shown while an async `addNewCallback` runs. `{value}` is replaced with the typed text. Default: `Adding "{value}"…`.' },
  { configKey: 'loadingMessage',          attribute: 'loading-message',             converter: toText({ default: 'Loading...' }),     on: 'update', description: 'Message shown while options are loading.' },
  { configKey: 'removeButtonTooltipText', attribute: 'remove-button-tooltip-text',  converter: toText({ isNullable: true }),            on: 'update', description: 'Tooltip text for a badge remove (×) button.' },
  { configKey: 'formFieldId',             attribute: 'name',                        converter: toText({ isNullable: true }),            on: 'reinit', description: 'HTML form field name/id used for the hidden input(s).' },

  // ── CSS-var sugar (mirrored to a host style prop in reinit()/update()) ────
  { configKey: 'dropdownWidth',           attribute: 'dropdown-width',              converter: toText({ isNullable: true }),            on: 'update', description: 'Fixed dropdown width; mirrored to the `--ms-dropdown-width` CSS variable.' },
  { configKey: 'selectedPopoverWidth',    attribute: 'selected-popover-width',      converter: toText({ isNullable: true }),            on: 'update', description: 'Selected-items popover width; mirrored to `--ms-selected-popover-width`.' },

  // ── Member properties (structural → reinit; optional → nullable) ─────────
  { configKey: 'valueMember',             attribute: 'value-member',                converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name on an option object that holds its value.' },
  { configKey: 'displayValueMember',      attribute: 'display-value-member',        converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name that holds an option display label.' },
  { configKey: 'searchValueMember',       attribute: 'search-value-member',         converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name searched against (falls back to the display value).' },
  { configKey: 'iconMember',              attribute: 'icon-member',                 converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name that holds an option icon.' },
  { configKey: 'subtitleMember',          attribute: 'subtitle-member',             converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name that holds an option subtitle.' },
  { configKey: 'fullTitleMember',         attribute: 'full-title-member',           converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name that holds an option full/long title.' },
  { configKey: 'groupMember',             attribute: 'group-member',                converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name used to group options under headers.' },
  { configKey: 'disabledMember',          attribute: 'disabled-member',             converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name that marks an option disabled.' },

  // ── Tree of options (structural → reinit; optional → nullable) ───────────
  { configKey: 'pathMember',              attribute: 'path-member',                 converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name holding a node materialized tree path.' },
  { configKey: 'parentPathMember',        attribute: 'parent-path-member',          converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name holding a node parent path.' },
  { configKey: 'levelMember',             attribute: 'level-member',                converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name holding a node depth level.' },
  { configKey: 'hasChildrenMember',       attribute: 'has-children-member',         converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name flagging that a node has children.' },
  { configKey: 'isSelectableMember',      attribute: 'is-selectable-member',        converter: toText({ isNullable: true }), reflect: true, on: 'reinit', description: 'Property name marking whether a node can be selected.' },
  { configKey: 'treePathSeparator',       attribute: 'tree-path-separator',         converter: toText({ default: '.' }), reflect: true, on: 'reinit', description: 'Separator between segments in a materialized tree path.' },
  { configKey: 'isTreeEnabled',           converter: toBool('tristate'), on: 'reinit', type: 'boolean', description: 'Force tree mode on/off. Property-only; when unset (null) tree mode auto-enables if a path source (path-member / getPathCallback) is present.' },
  { configKey: 'checkboxMode',            attribute: 'checkbox-mode',               converter: toEnum(['independent', 'cascade'] as const, { default: 'independent' }), reflect: true, on: 'update',
    description: `Tree checkbox interaction.
- \`independent\` (default) — toggles only the clicked node.
- \`cascade\` — checks a node whole subtree and shows a tristate (checked / indeterminate / unchecked) box on branches.

Tree + multiple only.` },
  { configKey: 'cascadeSelectPolicy',     attribute: 'cascade-select-policy',       converter: toEnum(['rolled-up', 'leaves', 'all'] as const, { default: 'rolled-up' }), reflect: true, on: 'update',
    description: `In \`cascade\` mode, which values a selection emits (badges / form / change):
- \`rolled-up\` (default) — minimal cover: a fully-selected subtree collapses to its root; partially-selected branches emit their individually-checked descendants.
- \`leaves\` — only the checked leaf-level nodes.
- \`all\` — every fully-checked node (branches and leaves).` },

  // ── Enums ────────────────────────────────────────────────────────────────
  { configKey: 'badgesDisplayMode',       attribute: 'badges-display-mode',         converter: toEnum(['badges', 'count', 'compact', 'partial', 'none'] as const, { default: 'badges' }), on: 'reinit', description: 'How the current selection is shown in the control.' },
  { configKey: 'badgesPosition',          attribute: 'badges-position',             converter: toEnum(['top', 'bottom', 'left', 'right'] as const, { default: 'bottom' }), on: 'reinit', description: 'Where the badges/selection appear relative to the input.' },
  { configKey: 'badgesThresholdMode',     attribute: 'badges-threshold-mode',       converter: toEnum(['count', 'partial'] as const, { default: 'count' }), on: 'update', description: 'How `badgesThreshold` is interpreted: collapse to a count badge, or keep partial badges + a "more" badge.' },
  { configKey: 'searchInputMode',         attribute: 'search-input-mode',           converter: toEnum(['normal', 'readonly', 'hidden'] as const, { default: 'normal' }), on: 'reinit', description: 'Search field mode: editable, read-only, or hidden.' },
  { configKey: 'searchMode',              attribute: 'search-mode',                 converter: toEnum(['filter', 'navigate'] as const, { default: 'filter' }), on: 'reinit', description: 'Whether typing filters the list or navigates it.' },
  { configKey: 'overlayGroup',            attribute: 'overlay-group',               converter: toText({ isNullable: true }), on: 'reinit', description: 'Scope the "one overlay open at a time" coordination to a named group. Overlays (multiselects, datepickers, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group.' },
  { configKey: 'actionsLayout',           attribute: 'actions-layout',              converter: toEnum(['nowrap', 'wrap'] as const, { default: 'nowrap' }), on: 'reinit', description: 'Whether the action bar wraps or stays on one line.' },
  { configKey: 'actionsPosition',         attribute: 'actions-position',            converter: toEnum(['top', 'bottom'] as const, { default: 'top' }), on: 'reinit', description: 'Whether the action bar sits above or below the list.' },
  { configKey: 'actionsAlign',            attribute: 'actions-align',               converter: toEnum(['stretch', 'left', 'right', 'center', 'space-between'] as const, { default: 'stretch' }), on: 'update', description: 'Horizontal alignment of the action buttons.' },
  { configKey: 'checkboxAlign',           attribute: 'checkbox-align',              converter: toEnum(['top', 'center', 'bottom'] as const, { default: 'center' }), on: 'update', description: 'Vertical alignment of an option checkbox.' },
  { configKey: 'valueFormat',             attribute: 'value-format',                converter: toEnum(['json', 'csv', 'array'] as const, { default: 'json' }), on: 'reinit', description: 'Serialization format the control emits its value in.' },
  { configKey: 'badgeTooltipPlacement',   attribute: 'badge-tooltip-placement',     converter: toEnum(PLACEMENTS, { default: 'top' }), on: 'update', description: 'Preferred placement of a badge tooltip relative to its badge (floating-ui placement).' },
  { configKey: 'optionTooltipPlacement',  attribute: 'option-tooltip-placement',    converter: toEnum(PLACEMENTS, { default: 'top-start' }), on: 'update', description: 'Preferred placement of an option tooltip (floating-ui placement).' },
  { configKey: 'mobilePresentation',      attribute: 'mobile-presentation',         converter: toEnum(['auto', 'floating', 'fullscreen'] as const, { default: 'auto' }), reflect: true, on: 'update',
    description: 'How the open dropdown is presented on phones. `auto` (default) keeps the floating panel on desktop/tablet and switches to a full-screen overlay on phone-sized touch devices (touch primary + shorter viewport side < 600px, orientation-robust); `floating` forces the anchored panel everywhere; `fullscreen` forces the full-screen overlay on any device (handy for previews/testing). Resolved reactively from the device/viewport environment.' },
  { configKey: 'fullscreenAutofocus',     attribute: 'fullscreen-autofocus',        converter: toBool('default-false'), on: 'update',
    description: 'In the phone fullscreen overlay, auto-focus the search field on open (pops the soft keyboard immediately). Default `false`: the sheet opens with the list visible and the keyboard closed, appearing only when the user taps the search. Set `true` to type-to-filter right away. No effect in the floating presentation.' },

  // ── Numbers ──────────────────────────────────────────────────────────────
  { configKey: 'badgesThreshold',         attribute: 'badges-threshold',            converter: toInt(),               on: 'update', description: 'Threshold at which badges collapse to a count/compact view.' },
  { configKey: 'badgesMaxVisible',        attribute: 'badges-max-visible',          converter: toInt(),               on: 'update', description: 'Maximum number of badges rendered before overflow.' },
  { configKey: 'collapseBadgesBelow',     attribute: 'collapse-badges-below',       converter: toInt(),               on: 'update', description: 'Container-responsive opt-in (off by default). When set to a px width, the control watches its OWN border box (not the window, via the core `resized` hook / a shared ResizeObserver) and collapses `badges-display-mode` to `count` ("N selected") while the box is narrower than this — so a picker in a narrow column/sidebar never overflows with pills, even on a wide monitor. Widening past the threshold restores the configured badges mode. Element-only: the override is applied to the live picker, never to your `badges-display-mode` config.' },
  { configKey: 'minSearchLength',         attribute: 'min-search-length',           converter: toInt({ default: 0 }), on: 'update', description: 'Minimum characters before searching/filtering starts.' },
  { configKey: 'searchDebounce',          attribute: 'search-debounce',             converter: toInt({ default: 0 }), on: 'update', description: 'Debounce delay in ms applied to the search input.' },
  { configKey: 'virtualScrollThreshold',  attribute: 'virtual-scroll-threshold',    converter: toInt({ default: 100 }), on: 'reinit', description: 'Option count above which virtual scrolling turns on.' },
  { configKey: 'optionHeight',            attribute: 'option-height',               converter: toInt({ default: 50 }), on: 'update', description: 'Fixed row height in px used by virtual scrolling.' },
  { configKey: 'badgeHeight',             attribute: 'badge-height',                converter: toInt({ default: 36 }), on: 'update', description: 'Fixed badge height in px used for layout/virtualization.' },
  { configKey: 'virtualScrollBuffer',     attribute: 'virtual-scroll-buffer',       converter: toInt({ default: 10 }), on: 'update', description: 'Extra rows rendered above/below the viewport when virtualizing.' },
  { configKey: 'badgeTooltipDelay',       attribute: 'badge-tooltip-delay',         converter: toInt({ default: 100 }), on: 'update', description: 'Delay in ms before a badge tooltip appears.' },
  { configKey: 'badgeTooltipOffset',      attribute: 'badge-tooltip-offset',        converter: toInt({ default: 8 }), on: 'update', description: 'Gap in px between a badge and its tooltip.' },
  { configKey: 'optionTooltipDelay',      attribute: 'option-tooltip-delay',        converter: toInt(),               on: 'update', description: 'Delay in ms before an option tooltip appears (falls back to badgeTooltipDelay).' },
  { configKey: 'optionTooltipOffset',     attribute: 'option-tooltip-offset',       converter: toInt(),               on: 'update', description: 'Gap in px between an option and its tooltip.' },

  // ── Booleans (default true) ──────────────────────────────────────────────
  { configKey: 'isMultipleEnabled',       attribute: 'multiple',                    converter: toBool('default-true'), on: 'reinit', description: 'Allow selecting multiple options. When off, selecting one replaces the previous.' },
  { configKey: 'isGroupsAllowed',         attribute: 'allow-groups',                converter: toBool('default-true'), on: 'reinit', description: 'Allow grouping options under group headers.' },
  { configKey: 'isCheckboxesShown',       attribute: 'show-checkboxes',             converter: toBool('default-true'), on: 'reinit', description: 'Show a checkbox on each option.' },
  { configKey: 'isActionsSticky',         attribute: 'sticky-actions',              converter: toBool('default-true'), on: 'update', description: 'Keep the action bar pinned while the list scrolls.' },
  { configKey: 'isPlacementLocked',       attribute: 'lock-placement',              converter: toBool('default-true'), on: 'update', description: 'Keep the dropdown initial placement instead of flipping when it fits.' },
  { configKey: 'isSearchEnabled',         attribute: 'enable-search',               converter: toBool('default-true'), on: 'reinit', description: 'Show the search input.' },
  { configKey: 'isKeepOptionsOnSearch',   attribute: 'keep-options-on-search',      converter: toBool('default-true'), on: 'update', description: 'Keep already-selected options visible while filtering.' },
  { configKey: 'shouldKeepSearchOnClose', attribute: 'should-keep-search-on-close', converter: toBool('default-true'), on: 'update', description: 'Preserve the search text after the dropdown closes.' },
  { configKey: 'isSelectedPopoverEnabled', attribute: 'enable-selected-popover',     converter: toBool('default-true'), on: 'update', description: 'Allow the selected-items popover to open (from the count/compact/"+X more" badge or the in-input counter). Turn off when you render your own selection UI, so those affordances become inert.' },

  // ── Booleans (default false) ─────────────────────────────────────────────
  { configKey: 'isCloseOnSelect',         attribute: 'close-on-select',             converter: toBool('default-false'), on: 'update', description: 'Close the dropdown immediately after a selection.' },
  { configKey: 'isAddNewAllowed',         attribute: 'allow-add-new',               converter: toBool('default-false'), on: 'reinit', description: 'Allow adding a new option from the search text.' },
  { configKey: 'isCounterShown',          attribute: 'show-counter',                converter: toBool('default-false'), on: 'update', description: 'Show a selected-count indicator.' },
  { configKey: 'isClearShown',            attribute: 'show-clear',                  converter: toBool('default-false'), on: 'update', description: 'Show an inline clear (✕) button inside the input that wipes the whole selection. Appears only while something is selected and the control is enabled; clicking it clears the selection and any search text, fires `change`, and refocuses.' },
  { configKey: 'isBadgeFullTitleShown',   attribute: 'show-badge-full-title',       converter: toBool('default-false'), on: 'update', description: 'Show the full title on badges instead of the short label.' },
  { configKey: 'isVirtualScrollEnabled',  attribute: 'enable-virtual-scroll',       converter: toBool('default-false'), on: 'reinit', description: 'Force virtual scrolling on regardless of the threshold.' },
  { configKey: 'isBadgeTooltipsEnabled',  attribute: 'enable-badge-tooltips',       converter: toBool('default-false'), on: 'update', description: 'Enable tooltips on badges.' },
  { configKey: 'isOptionTooltipsEnabled', attribute: 'enable-option-tooltips',      converter: toBool('default-false'), on: 'update', description: 'Enable tooltips on options.' },
  { configKey: 'isOptionTooltipFollowCursor', attribute: 'option-tooltip-follow-cursor', converter: toBool('default-false'), on: 'update', description: 'Make option tooltips follow the pointer.' },
  { configKey: 'isSearchModeToggleShown',  attribute: 'show-search-mode-toggle',      converter: toBool('default-false'), on: 'update', description: 'Show a clickable toggle in the phone fullscreen overlay search header that flips `search-mode` between `filter` and `navigate` live. Fullscreen-only; no effect in the floating presentation or when search is disabled.' },

  // ── Special attributes ───────────────────────────────────────────────────
  { configKey: 'initialValues',           attribute: 'initial-values',              converter: toInitialValues(), default: [], on: 'reinit', type: 'Array<string | number>', description: 'Values selected on first render. Accepts a JSON array (`["a","b"]`) or a bare CSV (`a,b,c`).' },
  { configKey: 'showDebugInfo',           attribute: 'show-debug-info',             converter: toBool('default-false'), on: 'update', description: 'Render an in-component debug panel.', deprecated: 'Use per-instance logging (el.enableLogging()) instead.' },

  // ── Render gate (element-only; NON_PICKER) ───────────────────────────────
  { configKey: 'deferRender',             attribute: 'defer',                       converter: toBool('presence'), on: 'reinit',
    description: 'Hold the initial render. When the `defer` attribute is present on upgrade the component builds nothing (it only reserves space) — so options, callbacks (e.g. `customStylesCallback`) and event listeners can all be wired first, then released with `el.ready()` (or by removing the `defer` attribute, for server-driven frameworks). The release builds the picker ONCE with everything already in place, avoiding the upgrade-then-restyle flash. Absent (default): builds immediately on connect. Latched — once released the gate never re-closes.' },

  // ── Complex property (data) ──────────────────────────────────────────────
  { configKey: 'options',                                                            converter: toObjectArray(),        on: 'reinit', type: 'ReadonlyArray<Record<string, unknown>>', description: 'The array of option objects to render. The JS API — assign `el.options` directly. For HTML authoring use the `data-options` attribute (parsed per `data-options-format`) or declarative <option> children; both feed the same list and take precedence over this property in the order: <option> children > property > data-options.' },
  { configKey: 'optionsSource', attribute: 'data-options',                            converter: toText({ isNullable: true }), on: 'reinit', type: 'string', description: 'HTML-authoring source for the option list, parsed per `data-options-format`. Reactive: changing either attribute re-renders. Prefer the `options` property in JS; a set `options` property and declarative <option> children both win over this.' },
  { configKey: 'optionsFormat', attribute: 'data-options-format',                     converter: toEnum(OPTIONS_FORMATS, { default: 'json' }), on: 'reinit', type: "'json' | 'csv' | 'plain'", description: 'How to parse the `data-options` attribute: `json` (a JSON array of objects or [value, label] tuples), `csv` (rows split on `data-options-row-splitter`, cells on `data-options-splitter`; the first row is a header — map columns via *-member), or `plain` (bare values split on both splitters -> [value, label] tuples, value === label). Default `json`.' },
  { configKey: 'optionsSplitter', attribute: 'data-options-splitter',                 converter: toText({ default: ',' }), on: 'reinit', type: 'string', description: 'Field/cell delimiter for the `csv` and `plain` `data-options` formats. Default `,`. Escapes `\\t` `\\n` `\\r` are honoured (e.g. `data-options-splitter="\\t"` for TSV). Ignored for `json`.' },
  { configKey: 'optionsRowSplitter', attribute: 'data-options-row-splitter',          converter: toText({ default: '\n' }), on: 'reinit', type: 'string', description: 'Row/record delimiter for the `csv` and `plain` `data-options` formats. Default newline. Escapes honoured (e.g. `data-options-row-splitter=";"` for single-line data). Ignored for `json`.' },
  { configKey: 'actionButtons',                                                      converter: toValue({ validate: (v): v is unknown[] => Array.isArray(v) }), on: 'reinit', type: 'Array<Record<string, unknown>>', description: 'Custom action buttons for the dropdown footer/header. Property-only; when unset the default Select-All / Clear buttons apply.' },

  // ── Callbacks: data shape (structural → reinit) ──────────────────────────
  { configKey: 'getValueCallback',        converter: cb(), on: 'reinit', type: '(item: unknown) => string | number', description: 'Extract an option value (overrides valueMember).' },
  { configKey: 'getPathCallback',         converter: cb(), on: 'reinit', type: '(item: unknown) => string', description: 'Extract a node tree path (enables tree mode; overrides pathMember).' },
  { configKey: 'getGroupCallback',        converter: cb(), on: 'reinit', type: '(item: unknown) => string', description: 'Extract the group name from an option (overrides groupMember).' },
  { configKey: 'getDisabledCallback',     converter: cb(), on: 'reinit', type: '(item: unknown) => boolean', description: 'Whether an option is disabled (overrides disabledMember).' },
  { configKey: 'getIsSelectableCallback', converter: cb(), on: 'reinit', type: '(node: unknown) => boolean', description: 'Whether a tree node can be selected (overrides is-selectable-member).' },
  { configKey: 'getSearchValueCallback',  converter: cb(), on: 'reinit', type: '(item: unknown) => string', description: 'Text an option is searched against (overrides searchValueMember).' },
  { configKey: 'searchCallback',          converter: cb(), on: 'reinit', type: '(searchTerm: string, signal?: AbortSignal) => Promise<unknown[]>', description: 'Custom / async search; return the filtered options.' },

  // ── Callbacks: display / render (cosmetic → update) ──────────────────────
  { configKey: 'getDisplayValueCallback',        converter: cb(), on: 'update', type: '(item: unknown) => string', description: 'Compute the display label for an option (overrides displayValueMember).' },
  { configKey: 'getBadgeDisplayCallback',        converter: cb(), on: 'update', type: '(item: unknown) => string', description: 'Compute the text shown on an option badge.' },
  { configKey: 'getBadgeClassCallback',          converter: cb(), on: 'update', type: '(item: unknown) => string | string[]', description: 'Extra CSS class(es) for an option badge.' },
  { configKey: 'getIconCallback',                converter: cb(), on: 'update', type: '(item: unknown) => string', description: 'Icon for an option (overrides iconMember).' },
  { configKey: 'getSubtitleCallback',            converter: cb(), on: 'update', type: '(item: unknown) => string', description: 'Subtitle for an option (overrides subtitleMember).' },
  { configKey: 'getFullTitleCallback',           converter: cb(), on: 'update', type: '(item: unknown) => string', description: 'Full title for an option (used by badges when show-badge-full-title is on).' },
  { configKey: 'getCounterCallback',             converter: cb(), on: 'update', type: '(count: number, moreCount?: number) => string', description: 'Render the selected-count label.' },
  { configKey: 'getValueFormatCallback',         converter: cb(), on: 'update', type: '(selectedValues: (string | number)[]) => string', description: 'Serialize the selected values for form submission.' },
  { configKey: 'getBadgeTooltipCallback',        converter: cb(), on: 'update', type: '(item: unknown) => string | HTMLElement', description: 'Tooltip content for an option badge.' },
  { configKey: 'getOptionTooltipCallback',       converter: cb(), on: 'update', type: '(item: unknown) => string | HTMLElement', description: 'Tooltip content for an option row.' },
  { configKey: 'getRemoveButtonTooltipCallback', converter: cb(), on: 'update', type: '(item: unknown) => string', description: 'Tooltip text for a badge remove button.' },
  { configKey: 'getSelectedItemClassCallback',   converter: cb(), on: 'update', type: '(item: unknown) => string | string[]', description: 'Extra CSS class(es) for a selected item.' },
  { configKey: 'renderOptionContentCallback',    converter: cb(), on: 'update', type: '(item: unknown, context: OptionContentRenderContext) => string | HTMLElement', description: 'Custom render for an option row; may return HTML or an element.' },
  { configKey: 'renderBadgeContentCallback',     converter: cb(), on: 'update', type: '(item: unknown, context: BadgeContentRenderContext) => string | HTMLElement', description: 'Custom render for a badge content (fills the built-in pill); may return HTML or an element.' },
  { configKey: 'renderBadgeCallback',            converter: cb(), on: 'update', type: '(item: unknown, context: BadgeContentRenderContext) => string | HTMLElement | null', description: 'Custom render for the WHOLE badge (main area), not just its content — return the entire pill/card. The component wraps it in `.ms__badge.ms__badge--custom` with `data-value` and delegates removal to any inner element with `data-action="remove"` (or `.ms__badge-remove`). Return null/empty to fall back to the default pill for that item.' },
  { configKey: 'renderGroupLabelContentCallback', converter: cb(), on: 'update', type: '(groupName: string) => string | HTMLElement', description: 'Customize a group label; may return an HTML string or element.' },
  { configKey: 'renderSelectedContentCallback',  converter: cb(), on: 'update', type: '(item: unknown) => string', description: 'Custom render for the whole selected area.' },
  { configKey: 'renderSelectedItemContentCallback', converter: cb(), on: 'update', type: '(item: unknown) => string | HTMLElement', description: 'Custom render for one selected item.' },
  { configKey: 'customStylesCallback',           converter: cb(), on: 'update', type: '() => string', description: 'Returns a CSS string injected into the component via a replaceable style slot (§12.8).' },

  // ── Callbacks: before-hooks (behavior-shaping) ───────────────────────────
  { configKey: 'beforeSearchCallback',    converter: cb(), on: 'update', type: '(searchTerm: string) => string | null', description: 'Runs before a search; return a rewritten term or null to veto.' },
  { configKey: 'beforeSelectCallback',    converter: cb(), on: 'update', type: '(option: unknown, selectedOptions: unknown[]) => boolean | string | void', description: 'Runs before selecting; return false to veto, or a string to veto and show it as a message.' },
  { configKey: 'beforeDeselectCallback',  converter: cb(), on: 'update', type: '(option: unknown, selectedOptions: unknown[]) => boolean | string | void', description: 'Runs before deselecting; return false to veto, or a string to veto and show it as a message.' },
  { configKey: 'addNewCallback',          converter: cb(), on: 'update', type: '(value: string) => unknown | null | undefined | Promise<unknown | null | undefined>', description: 'Create a new option from the typed text. May return a rich option object (renders via the same get*/render* callbacks as any option). Async + cancelable: return null/undefined to abort (no add, no `add` event). Omit entirely to handle creation yourself via the `add` event.' },
  { configKey: 'getAddNewTextCallback',   converter: cb(), on: 'update', type: '(value: string) => string', description: 'Dynamically compute the "add new" prompt label from the typed text (returns plain text). Takes precedence over `add-new-text`.' },
  { configKey: 'keydownCallback',         converter: cb(), on: 'update', type: '(context: MultiSelectKeydownContext) => boolean | void', description: 'Intercept keydown before built-in handling; return true to suppress the default. Gets the event, current state, and an imperative controller.' },
];

// Outward events (core §12.5). These install managed `onSelect`/`onDeselect`/
// `onChange` handler properties — each receives the CustomEvent, exactly like
// addEventListener. NOTE: this replaces the old bare-arg `onSelect(option)`
// callbacks; consumers now read `e.detail.option` (breaking, rides the 2.0 bump).
type MultiSelectEvents = {
  select: MultiSelectEventDetail;
  deselect: MultiSelectEventDetail;
  change: MultiSelectEventDetail;
  add: MultiSelectEventDetail;
  ready: undefined;
};
const EVENTS = [
  { name: 'select', description: 'An option was selected. `detail.option` is the selected option; `detail.selectedOptions`/`detail.selectedValues` are the full selection.' },
  { name: 'deselect', description: 'An option was removed from the selection. `detail.option` is that option.' },
  { name: 'change', description: 'The selection changed. `detail.selectedOptions`/`detail.selectedValues` are the full selection.' },
  { name: 'add', description: 'The user chose to create a new option from the typed text (via the "add new" prompt or Enter) — requires `allow-add-new`. `detail.value` is the typed text; `detail.option` is the created item when `addNewCallback` produced one.' },
  { name: 'ready', description: 'The picker was built and painted for the first time (once per element lifetime). Fires right after the first build — synchronously during upgrade for a normal element, or when the render gate is released (`el.ready()` / removing `defer`) for a deferred one. No detail.' },
] as const;

/**
 * configKeys that are NOT part of the picker's `MultiSelectConfig` — handled by
 * this element directly (CSS-var sugar, debug panel, initial values). Stripped
 * before the merged config is handed to the picker.
 */
const NON_PICKER_KEYS = new Set(['dropdownWidth', 'selectedPopoverWidth', 'showDebugInfo', 'initialValues', 'optionsSource', 'optionsFormat', 'optionsSplitter', 'optionsRowSplitter', 'mobilePresentation', 'collapseBadgesBelow', 'deferRender']);

/** CSS-var sugar: configKey → the host CSS custom property it mirrors to. */
const CSS_VARS: Record<string, string> = {
  dropdownWidth: '--ms-dropdown-width',
  selectedPopoverWidth: '--ms-selected-popover-width',
};

// customStylesCallback dev-mode lint (see #checkCustomStyleVars). The set of
// `--ms-*` variables the stylesheet reads is computed once from the (static)
// bundled stylesheet. Empty when the CSS isn't inlined (e.g. under vitest),
// which the check treats as "no ground truth" and skips.
let consumedMsVarsCache: Set<string> | null = null;
function consumedMsVars(): Set<string> {
  return (consumedMsVarsCache ??= extractConsumedCssVars(styles, '--ms-'));
}

/**
 * Member defaults written into each parsed option when declarative
 * <option>/<optgroup> children were used, and only for members the consumer
 * hasn't otherwise configured (attribute, property, or get*Callback).
 */
const DECLARATIVE_MEMBER_DEFAULTS: ReadonlyArray<{ key: keyof MultiSelectConfig; member: string; callbackKey: string }> = [
  { key: 'valueMember',        member: 'value',    callbackKey: 'getValueCallback' },
  { key: 'displayValueMember', member: 'label',    callbackKey: 'getDisplayValueCallback' },
  { key: 'groupMember',        member: 'group',    callbackKey: 'getGroupCallback' },
  { key: 'iconMember',         member: 'icon',     callbackKey: 'getIconCallback' },
  { key: 'subtitleMember',     member: 'subtitle', callbackKey: 'getSubtitleCallback' },
  { key: 'disabledMember',     member: 'disabled', callbackKey: 'getDisabledCallback' },
];

export class MultiSelectElement<T = any> extends BlissElement<MultiSelectEvents> {
  // Opt into the form-associated custom element lifecycle so form.reset() and
  // form.elements see the control.
  static formAssociated = true;

  protected static override inputs = INPUTS;
  protected static override events = EVENTS;

  // Type-only: core installs the managed accessors at runtime (§12.5).
  declare onSelect: ((e: CustomEvent<MultiSelectEventDetail<T>>) => void) | null;
  declare onDeselect: ((e: CustomEvent<MultiSelectEventDetail<T>>) => void) | null;
  declare onChange: ((e: CustomEvent<MultiSelectEventDetail<T>>) => void) | null;
  declare onAdd: ((e: CustomEvent<MultiSelectEventDetail<T>>) => void) | null;
  declare onReady: ((e: CustomEvent<undefined>) => void) | null;

  #shadow: ShadowRoot;
  #picker?: WebMultiSelect<T>;
  #container?: HTMLDivElement;
  // Render gate (`defer`): true once released via ready() / attribute removal /
  // the first build. Latched — the gate never re-closes. See #renderHeld().
  #released = false;
  #customStyles: StyleSlot | null = null;
  // Dev-mode customStylesCallback lint: unknown --ms-* names already warned about.
  #warnedCssVars = new Set<string>();

  // Declarative <option>/<optgroup> state (parsed once from light DOM).
  #declParsed = false;
  #hasDeclarativeOptions = false;
  #declarativeOptions?: T[];
  #declarativeSelectedValues?: (string | number)[];

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });

    // Form association: `static formAssociated = true` makes the element
    // participate; core's lazy `this.internals` / public `el.form` getter expose
    // the associated <form> (so e.g. Phoenix LiveView's `target.form` delegation
    // resolves). No local attachInternals — core owns the single attach.

    // §12.8: static shell CSS via one shared, cached CSSStyleSheet (per string),
    // replacing the per-instance inline <style>.
    adoptStyles(this.#shadow, styles);

    // Mark ready on the next frame so placeholder-visibility CSS can key off it.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.setAttribute('data-ready', ''));
    } else {
      this.setAttribute('data-ready', '');
    }
  }

  /**
   * Called by the browser when the surrounding <form> is reset. Clears the
   * picker's selection so the control participates in the standard reset.
   */
  formResetCallback(): void {
    this.#picker?.clearAll();
  }

  // ── core lifecycle hooks ──────────────────────────────────────────────────

  /** Runtime writing-direction switch (core observes `dir`): re-mirror the live
   *  picker. Layout mostly follows the inherited `direction` (logical properties);
   *  refreshDirection() fixes the parts pinned at build time (the `.ms--rtl` class
   *  and the panels' explicit `dir`). The initial direction is read by the build. */
  protected override directionChanged(_isRTL: boolean): void {
    this.#picker?.refreshDirection();
  }

  /** Structural change (or first connect): mirror CSS vars, then (re)build the picker. */
  protected override reinit(): void {
    this.#mirrorAllCssVars();
    // reinit() runs on first connect (isConnected true) and on later on:'reinit'
    // changes. Build/rebuild here; connect() covers the plain-reconnect case.
    // While the render gate is held (`defer` set, not yet released) skip the
    // build — config keeps accumulating and lands whole on release. Removing the
    // `defer` attribute flips deferRender false, so this same reinit then builds.
    if (this.isConnected && !this.#renderHeld()) this.#rebuildPicker();
  }

  /** Cosmetic change: mirror CSS vars / custom styles / debug, patch the picker in place. */
  protected override update(partial: Record<string, unknown>): void {
    this.#mirrorCssVars(partial);
    if ('customStylesCallback' in partial) this.#applyCustomStyles();
    if ('showDebugInfo' in partial) this.#syncDebugPanel();

    // Everything else goes to the live picker as an in-place patch; null clears
    // (matches the old `undefined` semantics), NON_PICKER_KEYS are handled above.
    const pickerPartial: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (NON_PICKER_KEYS.has(key)) continue;
      pickerPartial[key] = value === null ? undefined : value;
    }
    if (this.#picker && Object.keys(pickerPartial).length > 0) {
      if (!this.#picker.updateOptions(pickerPartial as Partial<MultiSelectConfig<T>>)) this.#rebuildPicker();
    }

    // `mobilePresentation` is element-only (NON_PICKER_KEYS) — the picker never sees
    // the raw setting. When the author changes the attribute we re-resolve it
    // against the current environment ourselves (environmentChanged only fires on an
    // env change, not an attribute change).
    if ('mobilePresentation' in partial) this.#applyPresentation(getEnvironment());

    // `collapseBadgesBelow` is element-only too — re-evaluate against the current
    // box when the threshold is set/changed/cleared (the `resized` hook only fires
    // on a box change, not an attribute change).
    if ('collapseBadgesBelow' in partial) this.#applyBadgeCollapse(this.getBoundingClientRect().width);
  }

  /** Activate: ensure the picker exists (a DOM move destroyed it in disconnect()). */
  protected override connect(): void {
    if (!this.#picker && !this.#renderHeld()) this.#buildPicker();
  }

  /** Whether the initial render is being held by the `defer` gate (not yet released). */
  #renderHeld(): boolean {
    return this.config.deferRender === true && !this.#released;
  }

  /** Deactivate: tear the picker down (rebuilt on the next connect). */
  protected override disconnect(): void {
    this.#picker?.destroy();
    this.#picker = undefined;
  }

  /**
   * Device/viewport/orientation changed (core §12.9). Overriding this opts the
   * element into the shared environment observable — core subscribes on connect
   * (firing immediately with the current snapshot) and unsubscribes on disconnect.
   * We map it to the picker's floating/fullscreen presentation; the immediate fire
   * lands right after `connect()` builds the picker, so the initial presentation is
   * set before the dropdown can open.
   */
  protected override environmentChanged(env: EnvironmentSnapshot): void {
    this.#applyPresentation(env);
  }

  /** Resolve `mobile-presentation` against `env` and relay it to the live picker. */
  #applyPresentation(env: EnvironmentSnapshot): void {
    const mode = (this.config.mobilePresentation as MobilePresentation | null) ?? 'auto';
    // Class-only policy (core §12.9): `resolvePresentation` classifies the device
    // (`classifyDevice`) and applies the default map — fullscreen on a phone, floating
    // on tablet/desktop, which is exactly what this picker renders. The capability gate
    // means a *narrowed desktop window* stays `desktop` → floating, never a sheet.
    // `mode` is constrained to auto|floating|fullscreen by the attribute converter and we
    // pass no overrides, so the `modal` tier can't occur; degrade it to fullscreen
    // defensively (multiselect has no modal presentation) rather than let it reach the
    // picker.
    const resolved = resolvePresentation(mode, env);
    this.#picker?.setPresentation(resolved === 'modal' ? 'fullscreen' : resolved);
  }

  // ── container-responsive badge collapse (core §12.9 `resized`) ─────────────

  /** Whether the live picker is currently forced to the collapsed count view. */
  #badgesCollapsed = false;

  /**
   * This element's own border box changed (core §12.9 `resized`). Overriding the
   * hook opts us into a shared page-wide ResizeObserver, subscribed on connect and
   * dropped on disconnect. Unlike `environmentChanged`/`viewportChanged` (the
   * WINDOW), this is our OWN box — a picker in a 400px sidebar on a 2560px monitor
   * reflows on its width, not the viewport's. We only act when `collapse-badges-
   * below` is set; otherwise it's a cheap no-op.
   */
  protected override resized({ width }: ElementSize): void {
    this.#applyBadgeCollapse(width);
  }

  /**
   * Resolve `collapse-badges-below` against `width` and relay the decision to the
   * live picker. The override is pushed via `updateOptions` (never written back to
   * `this.config`), so `this.config.badgesDisplayMode` stays the consumer's truth
   * and widening past the threshold restores it exactly. A structural JS decision,
   * so it lives here rather than in a CSS container query.
   */
  #applyBadgeCollapse(width: number): void {
    const threshold = this.config.collapseBadgesBelow as number | null | undefined;
    // Feature off (attribute unset) → lift any collapse we applied, then bail.
    if (threshold == null) {
      if (this.#badgesCollapsed) { this.#badgesCollapsed = false; this.#restoreBadgesMode(); }
      return;
    }
    // width 0 = not laid out yet (the hook fires post-layout, but guard anyway).
    const collapse = width > 0 && width < threshold;
    if (collapse === this.#badgesCollapsed) return;
    this.#badgesCollapsed = collapse;
    if (collapse) this.#pushBadgesMode('count');
    else this.#restoreBadgesMode();
  }

  /** Re-assert the consumer's configured badges mode from the pristine base config. */
  #restoreBadgesMode(): void {
    const base = (this.config.badgesDisplayMode as MultiSelectConfig<T>['badgesDisplayMode']) ?? 'badges';
    this.#pushBadgesMode(base);
  }

  /** Relay a badges-display-mode override to the live picker (never written to `this.config`). */
  #pushBadgesMode(mode: MultiSelectConfig<T>['badgesDisplayMode']): void {
    this.#picker?.updateOptions({ badgesDisplayMode: mode } as Partial<MultiSelectConfig<T>>);
  }

  // ── picker lifecycle ──────────────────────────────────────────────────────

  #rebuildPicker(): void {
    this.#picker?.destroy();
    this.#picker = undefined;
    this.#buildPicker();
  }

  #buildPicker(): void {
    this.#ensureContainer();
    this.#parseDeclarativeOptionsOnce();

    const cfg = this.#assembleConfig();

    // The picker reads initial values off the container dataset.
    const initialValues = this.#resolveInitialValues();
    if (initialValues && initialValues.length > 0) {
      this.#container!.dataset.initialValues = JSON.stringify(initialValues);
    } else {
      delete this.#container!.dataset.initialValues;
    }

    this.#picker = new WebMultiSelect<T>(this.#container!, cfg as any);
    this.#applyCustomStyles();
    this.#syncDebugPanel();
    // A fresh picker starts 'floating'; re-assert the resolved presentation so a
    // rebuild (reinit) doesn't drop a fullscreen setting until the next env change.
    this.#applyPresentation(getEnvironment());
    // Likewise re-assert the container-responsive badge collapse: the fresh picker
    // is at the base badges mode, so reset our flag and re-evaluate the current box
    // (the throttled `resized` hook would otherwise leave it uncollapsed until the
    // next box change). getBoundingClientRect is the synchronous read core suggests.
    this.#badgesCollapsed = false;
    this.#applyBadgeCollapse(this.getBoundingClientRect().width);

    // First build of this element's lifetime: latch the gate open (a later
    // re-added `defer` must not re-hold), reflect `is-ready` for CSS hooks
    // (`:host([defer]:not([is-ready]))` stops reserving space), and announce
    // `ready` once. `is-ready`'s presence is the once-guard: a rebuild (reinit)
    // or a disconnect/reconnect re-enters #buildPicker but never re-fires.
    if (!this.hasAttribute('is-ready')) {
      this.#released = true;
      this.setAttribute('is-ready', '');
      this.emit('ready');
    }
  }

  #ensureContainer(): void {
    if (this.#container) return;
    const container = document.createElement('div');
    container.setAttribute('data-multiselect', '');
    if (this.className) container.className = this.className;
    this.#shadow.appendChild(container);
    // Per-instance slot for customStylesCallback CSS, kept at the top of the
    // root so consumer @import/@font-face rules work; re-setting replaces it.
    this.#customStyles = createStyleSlot(this.#shadow, { position: 'first', className: 'ms-custom-styles' });
    this.#container = container;
  }

  /**
   * Build the picker config from the merged `this.config`, minus the keys the
   * picker doesn't own, plus the runtime wiring (event bridges, container, host,
   * declarative option data + member defaults, counter default).
   */
  #assembleConfig(): Record<string, unknown> {
    const cfg: Record<string, unknown> = { ...this.config };
    // Drop element-only keys and normalize "unset" (null) → absent, so the picker
    // sees exactly what the old hand-coded parser handed it (undefined).
    for (const key of NON_PICKER_KEYS) delete cfg[key];
    for (const key of Object.keys(cfg)) {
      if (cfg[key] === null) delete cfg[key];
    }

    // Option-data precedence: declarative <option> children > the `options`
    // property (JS) > the `data-options` attribute (parsed per data-options-format).
    // `optionsSource`/`optionsFormat` are reactive inputs (observed by the table),
    // so this whole derivation re-runs on reinit when either attribute changes —
    // no hand-rolled getAttribute, no non-reactive parse.
    let optionData = cfg.options as T[] | undefined;
    if (this.#hasDeclarativeOptions && this.#declarativeOptions) {
      if (optionData && optionData.length > 0) {
        dataLogger.warn('[MultiSelectElement] Both declarative <option> elements and programmatic .options detected. Using declarative options.');
      }
      optionData = this.#declarativeOptions;
    } else if (!optionData || optionData.length === 0) {
      const source = this.config.optionsSource as string | null | undefined;
      if (source != null) {
        const format = (this.config.optionsFormat as OptionsFormat) ?? 'json';
        const { options: parsed, error } = parseOptionsData(source, format, {
          splitter: this.config.optionsSplitter as string | undefined,
          rowSplitter: this.config.optionsRowSplitter as string | undefined,
        });
        if (error) dataLogger.error(`[MultiSelectElement] ${error}`);
        optionData = parsed as T[];
      }
    }
    cfg.options = optionData;

    // Declarative member defaults: only when <option> children were parsed and
    // the member isn't otherwise configured (member key or its get*Callback).
    if (this.#hasDeclarativeOptions) {
      for (const { key, member, callbackKey } of DECLARATIVE_MEMBER_DEFAULTS) {
        if (cfg[key] === undefined && !cfg[callbackKey]) cfg[key] = member;
      }
    }

    // Counter callback default (matches the historical fallback text).
    if (!cfg.getCounterCallback) {
      cfg.getCounterCallback = (count: number, moreCount?: number) =>
        moreCount !== undefined ? `+${moreCount} more` : `${count} selected`;
    }

    // Event bridges: the picker fires these; we re-emit as bubbling/composed
    // CustomEvents (the managed on<Name> handler properties fire as listeners).
    cfg.onSelect = (option: T) => {
      this.emit('select', {
        option,
        selectedOptions: this.#picker?.getSelected() ?? [],
        selectedValues: this.#collectSelectedValues(),
      });
    };
    cfg.onDeselect = (option: T) => {
      this.emit('deselect', {
        option,
        selectedOptions: this.#picker?.getSelected() ?? [],
        selectedValues: this.#collectSelectedValues(),
      });
    };
    cfg.onChange = (selectedOptions: T[]) => {
      this.emit('change', {
        selectedOptions,
        selectedValues: this.#collectSelectedValues(),
      });
    };
    cfg.onAddNew = (detail: { value: string; option?: T }) => {
      this.emit('add', {
        value: detail.value,
        option: detail.option,
        selectedOptions: this.#picker?.getSelected() ?? [],
        selectedValues: this.#collectSelectedValues(),
      });
    };

    // Container (shadow) for the dropdown/hint/popover; host for light-DOM inputs.
    cfg.container = this.#shadow as unknown as HTMLElement;
    cfg.hostElement = this;
    return cfg;
  }

  #resolveInitialValues(): (string | number)[] | undefined {
    if (this.#declarativeSelectedValues && this.#declarativeSelectedValues.length > 0) {
      return this.#declarativeSelectedValues;
    }
    const fromConfig = this.config.initialValues as (string | number)[] | undefined;
    return fromConfig && fromConfig.length > 0 ? fromConfig : undefined;
  }

  #collectSelectedValues(): (string | number)[] {
    const val = this.#picker?.getValue();
    if (val == null) return [];
    return Array.isArray(val) ? val : [val];
  }

  // ── §12.8 custom styles ───────────────────────────────────────────────────

  #applyCustomStyles(): void {
    const slot = this.#customStyles;
    if (!slot) return;
    const callback = this.config.customStylesCallback as (() => string | null | undefined) | null | undefined;
    if (typeof callback !== 'function') {
      slot.clear();
      return;
    }
    try {
      const css = callback();
      slot.set(css);
      if (import.meta.env?.DEV && css) this.#checkCustomStyleVars(css);
    } catch (e) {
      dataLogger.warn('[MultiSelectElement] customStylesCallback threw', e);
      slot.clear();
    }
  }

  /**
   * Dev-only lint: warn when `customStylesCallback` *sets* a `--ms-*` variable
   * that no web-multiselect style ever reads (`var(--ms-…)`) — a misspelled or
   * renamed variable fails silently otherwise (e.g. `--ms-badge-text-background`
   * instead of `--ms-badge-text-bg`). Guarded by `import.meta.env.DEV`, so it's
   * stripped from the production build and never fires for shipped consumers.
   * De-duped per instance. If you genuinely define a `--ms-*` var for your own
   * custom-rendered content, ignore the warning (or use a different prefix).
   */
  #checkCustomStyleVars(css: string): void {
    const consumed = consumedMsVars();
    if (consumed.size === 0) return; // stylesheet not inlined (e.g. vitest) — no ground truth
    // Pure lint lives in core (lintCssVars); the element owns only the dev gate
    // (see the call site), per-instance de-dup, and the console message.
    for (const { name, suggestions } of lintCssVars(css, { prefix: '--ms-', consumed })) {
      if (this.#warnedCssVars.has(name)) continue;
      this.#warnedCssVars.add(name);
      console.warn(
        `[web-multiselect] customStylesCallback sets "${name}", which no ` +
          `web-multiselect style consumes — it will have no effect.` +
          (suggestions.length ? ` Did you mean: ${suggestions.join(', ')}?` : '') +
          ` (If it's for your own custom-rendered content, ignore this.)`
      );
    }
  }

  // ── CSS-var sugar ─────────────────────────────────────────────────────────

  #mirrorAllCssVars(): void {
    for (const key of Object.keys(CSS_VARS)) this.#setVar(CSS_VARS[key], this.config[key]);
  }

  #mirrorCssVars(partial: Record<string, unknown>): void {
    for (const key of Object.keys(CSS_VARS)) {
      if (key in partial) this.#setVar(CSS_VARS[key], partial[key]);
    }
  }

  #setVar(name: string, value: unknown): void {
    if (value == null || value === '') this.style.removeProperty(name);
    else this.style.setProperty(name, String(value));
  }

  // ── declarative <option> parsing (light DOM, once) ────────────────────────

  #parseDeclarativeOptionsOnce(): void {
    if (this.#declParsed) return;
    this.#declParsed = true;
    const parsed = this.#parseDeclarativeOptions();
    if (parsed) {
      this.#declarativeOptions = parsed as T[];
      this.#hasDeclarativeOptions = true;
    }
  }

  #parseDeclarativeOptions(): any[] | null {
    const children = Array.from(this.children);
    if (children.length === 0) return null;

    const options: any[] = [];
    let hasValidOptions = false;

    const parseOption = (option: HTMLOptionElement, group?: string): void => {
      const parsed: any = {
        value: option.value || option.textContent?.trim() || '',
        label: option.textContent?.trim() || option.value || '',
      };
      if (group) parsed.group = group;
      if (option.hasAttribute('selected')) {
        (this.#declarativeSelectedValues ??= []).push(parsed.value);
      }
      if (option.hasAttribute('disabled')) parsed.disabled = true;
      if (option.hasAttribute('data-icon')) parsed.icon = option.getAttribute('data-icon');
      if (option.hasAttribute('data-subtitle')) parsed.subtitle = option.getAttribute('data-subtitle');
      options.push(parsed);
      hasValidOptions = true;
    };

    for (const child of children) {
      if (child.tagName === 'OPTION') {
        parseOption(child as HTMLOptionElement);
      } else if (child.tagName === 'OPTGROUP') {
        const optgroup = child as HTMLOptGroupElement;
        const groupLabel = optgroup.label || optgroup.getAttribute('label') || 'Group';
        for (const option of Array.from(optgroup.querySelectorAll('option'))) {
          parseOption(option, groupLabel);
        }
      }
    }

    if (!hasValidOptions) return null;

    dataLogger.debug(`[MultiSelectElement] Parsed ${options.length} declarative options from Light DOM`);
    // Clean up the parsed light-DOM children.
    for (const child of children) {
      if (child.tagName === 'OPTION' || child.tagName === 'OPTGROUP') child.remove();
    }
    return options;
  }

  // ── debug panel (deprecated; kept for back-compat) ────────────────────────

  #syncDebugPanel(): void {
    const existing = this.#shadow.querySelector('.ms__debug-info');
    if (existing) existing.remove();
    if (!this.config.showDebugInfo) return;

    const debugContainer = document.createElement('div');
    debugContainer.className = 'ms__debug-info';
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Debug Info';
    const statsDiv = document.createElement('div');
    statsDiv.className = 'ms__debug-stats';
    details.appendChild(summary);
    details.appendChild(statsDiv);
    debugContainer.appendChild(details);
    this.#shadow.appendChild(debugContainer);
    this.#updateDebugInfo();
  }

  #updateDebugInfo(): void {
    const statsDiv = this.#shadow.querySelector('.ms__debug-stats');
    if (!statsDiv || !this.#picker) return;

    const version = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'unknown';
    const totalInstances = (typeof window !== 'undefined' && window.components?.['web-multiselect']?.getInstances().length) || 0;
    const selectedCount = this.#picker.getSelected().length;
    const totalOptions = (this.config.options as unknown[] | undefined)?.length || 0;
    const pickerAny = this.#picker as any;

    statsDiv.innerHTML = `
      <span>Version: ${version}</span>
      <span>Total Instances: ${totalInstances}</span>
      <span>Options: ${totalOptions}</span>
      <span>Filtered: ${pickerAny.filteredOptions?.length || 0}</span>
      <span>Selected: ${selectedCount}</span>
      <span>Dropdown: ${pickerAny.isOpen ? 'Open' : 'Closed'}</span>
      <span>Search: ${pickerAny.searchTerm || 'none'}</span>
      <span>Loading: ${pickerAny.isLoading ? 'Yes' : 'No'}</span>
    `;
    setTimeout(() => {
      if (this.config.showDebugInfo) this.#updateDebugInfo();
    }, 500);
  }

  // ── non-input public API ──────────────────────────────────────────────────

  /** Form field name (mirrors the `name` attribute → `formFieldId`). */
  get name(): string | null {
    return this.getAttribute('name');
  }

  set name(value: string | null) {
    if (value) this.setAttribute('name', value);
    else this.removeAttribute('name');
  }

  get selectedValue(): string | number | (string | number)[] | null {
    this.flush(); // apply a pending `options = …` before reading live picker state
    return this.#picker?.selectedValue ?? null;
  }

  get selectedItem(): T | null {
    this.flush();
    return this.#picker?.selectedItem ?? null;
  }

  getSelected(): T[] {
    this.flush();
    return this.#picker ? this.#picker.getSelected() : [];
  }

  setSelected(values: (string | number)[], opts: { notify?: boolean } = {}): void {
    // Preserve the synchronous `el.options = data; el.setSelected(sel)` contract:
    // property writes coalesce on a microtask, so flush the pending rebuild first
    // or the picker would still hold the pre-write options (count/options mismatch).
    this.flush();
    this.#picker?.setSelected(values, opts);
  }

  getValue(): string | number | (string | number)[] | null {
    this.flush();
    return this.#picker ? this.#picker.getValue() : null;
  }

  /**
   * Surface a transient message ("toast") on top of the component — visible even in the
   * fullscreen overlay, where page-level UI is hidden behind the sheet. Content is text or
   * an element; `opts.variant` sets the tone and `opts.duration` the auto-dismiss (0 =
   * sticky). Also reached automatically when a `beforeSelect`/`beforeDeselect` callback
   * returns a reason string.
   */
  showMessage(content: string | HTMLElement, opts?: MessageOptions): void {
    this.flush();
    this.#picker?.showMessage(content, opts);
  }

  /** Dismiss the transient message shown by {@link showMessage}, if any. */
  hideMessage(): void {
    this.#picker?.hideMessage();
  }

  // ── scroll-to API ───────────────────────────────────────────────────────────

  /**
   * Clear the search box and restore the full option list (does not touch the selection — use
   * {@link clearAll} for that). Pair with {@link scrollToValue} to reveal then scroll to an option
   * a search had filtered out: `el.clearSearch(); el.scrollToValue(v)`.
   */
  clearSearch(): void {
    this.flush();
    this.#picker?.clearSearch();
  }

  /** The current search box text (empty string when nothing is typed). Read via this getter, write with {@link search}. */
  get searchText(): string {
    this.flush();
    return this.#picker?.searchText ?? '';
  }

  /**
   * Programmatically set the search text and filter, as if the user typed it (runs
   * `beforeSearchCallback` / `minSearchLength` / async `searchCallback`). Does not open the dropdown
   * — call {@link open} if you want it visible. Pass `''` to clear (same as {@link clearSearch}).
   */
  search(term: string): void {
    this.flush();
    this.#picker?.search(term);
  }

  /**
   * Scroll the open dropdown to the option at `index` (into the current filtered list). Returns
   * false if closed or out of range. Deferred internally so `el.open(); el.scrollToIndex(i)` works.
   */
  scrollToIndex(index: number, opts?: { block?: ScrollLogicalPosition }): boolean {
    this.flush();
    return this.#picker?.scrollToIndex(index, opts) ?? false;
  }

  /**
   * Scroll the open dropdown to the option with this `value`. Returns false if it isn't in the
   * currently visible list (filtered out by search, or under a collapsed tree branch) — call
   * {@link clearSearch} / expand first.
   */
  scrollToValue(value: string | number, opts?: { block?: ScrollLogicalPosition }): boolean {
    this.flush();
    return this.#picker?.scrollToValue(value, opts) ?? false;
  }

  /**
   * Scroll to a group: its header in standard rendering, or the group's first option in
   * virtual-scroll mode (no headers there). Returns false in tree mode or if the group is empty
   * in the current filtered list.
   */
  scrollToGroup(name: string, opts?: { block?: ScrollLogicalPosition }): boolean {
    this.flush();
    return this.#picker?.scrollToGroup(name, opts) ?? false;
  }

  // ── imperative open/close API (flush pending writes, then delegate) ─────────

  /** Open the dropdown. */
  open(): void {
    this.flush();
    this.#picker?.open();
  }

  /** Close the dropdown. */
  close(): void {
    this.flush();
    this.#picker?.close();
  }

  /** Toggle the dropdown open/closed. */
  toggle(): void {
    this.flush();
    this.#picker?.toggle();
  }

  /** Whether the dropdown is currently open. Assigning opens/closes it. */
  get isOpen(): boolean {
    this.flush();
    return this.#picker?.isOpen ?? false;
  }

  set isOpen(value: boolean) {
    this.flush();
    if (this.#picker) this.#picker.isOpen = value;
  }

  destroy(): void {
    this.#picker?.destroy();
  }

  // ── render gate (`defer`) ───────────────────────────────────────────────────

  /**
   * Release the `defer` render gate: build the picker now (once), with every
   * option, callback and listener wired while deferred already in place. No-op
   * when the element wasn't deferred or is already built. `flush()` first so a
   * synchronous `el.options = …; el.customStylesCallback = …; el.ready()` lands
   * those pending writes in the single build rather than after it. Latched — the
   * gate never re-closes. Fires the `ready` event on the first build.
   */
  ready(): void {
    this.#released = true;
    this.flush(); // apply pending input writes (may itself build via reinit())
    if (this.isConnected && !this.#picker) this.#buildPicker();
  }

  /** Whether the picker has been built (the `ready` event has fired). False while a `defer` gate is still held. */
  get isReady(): boolean {
    return this.hasAttribute('is-ready');
  }
}

// Importing this module registers the element (back-compat contract). The full
// global-API publish + logger-bundle wiring happens in index.ts via
// registerComponent(); both defines are idempotent, so importing either works.
if (typeof customElements !== 'undefined' && !customElements.get('web-multiselect')) {
  customElements.define('web-multiselect', MultiSelectElement);
}
