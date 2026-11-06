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
 * bridge from the merged `config` to the real dropdown engine (`MultiSelectEngine`
 * in `multiselect.ts`), the public `el.controller` facade, declarative `<option>`
 * parsing, form association, and the CSS-var sugar.
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
  toObject,
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
  type Presentation,
} from '@keenmate/web-components-core';
import { MultiSelectEngine } from './multiselect';
import type {
  MultiSelectConfig,
  MultiSelectContext,
  MultiSelectController,
  MessageOptions,
  SelectEventDetail,
  DeselectEventDetail,
  ChangeEventDetail,
  ValueFormatErrorEventDetail,
  AddEventDetail,
  ReadyEventDetail,
  OpenEventDetail,
  CloseEventDetail,
  MultiSelectActionEventDetail,
} from './types';
import { toDefaultValue, parseDefaultValue } from './converters';
import { parseOptionsData, OPTIONS_FORMATS, type OptionsFormat } from './option-formats';
import styles from './css/main.css?inline';
import { dataLogger } from './logger';

/** Floating-UI placement values, shared by the two tooltip-placement enums. */
const PLACEMENTS = [
  'top', 'top-start', 'top-end',
  'bottom', 'bottom-start', 'bottom-end',
  'left', 'left-start', 'left-end',
  'right', 'right-start', 'right-end',
] as const;

/** `labels`: a plain object of strings (property or JSON attribute). */
const isLabels = (v: unknown): v is Record<string, string> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'string');

/** Any callback input. */
const cb = (): ReturnType<typeof toFunction> => toFunction();

// ============================================================================
// INPUT TABLE — the whole @keenmate/web-multiselect public surface, one row each
// ============================================================================
const INPUTS: readonly InputDef[] = [
  // ── Strings (cosmetic → update). Optional ones are nullable: absent → null ─
  { configKey: 'dropdownMinWidth',        attribute: 'dropdown-min-width',          converter: toText({ isNullable: true }),            on: 'update', description: 'Minimum width of the dropdown panel (any CSS length).' },
  { configKey: 'dropdownMaxWidth',        attribute: 'dropdown-max-width',          converter: toText({ isNullable: true }),            on: 'update', description: 'Maximum width of the dropdown panel (any CSS length).' },
  { configKey: 'maxHeight',               attribute: 'max-height',                  converter: toText({ default: '20rem' }),          on: 'update', description: 'Maximum height of the dropdown list before it scrolls.' },
  { configKey: 'name',             attribute: 'name',                        converter: toText({ isNullable: true }),            on: 'reinit', description: 'HTML form field name/id used for the hidden input(s).' },
  { configKey: 'customStyles',            attribute: 'custom-styles',               converter: toText({ isNullable: true }),            on: 'update', description: 'Raw CSS injected into the Shadow DOM — the declarative alternative to `getCustomStylesCallback`. The value is a full stylesheet (selectors and all), dropped verbatim into a replaceable style slot at the top of the shadow root. `getCustomStylesCallback` takes precedence when both are set.' },

  // ── CSS-var sugar (mirrored to a host style prop in reinit()/update()) ────
  { configKey: 'dropdownWidth',           attribute: 'dropdown-width',              converter: toText({ isNullable: true }),            on: 'update', description: 'Fixed dropdown width; mirrored to the `--ms-dropdown-width` CSS variable.' },
  { configKey: 'selectedPopoverWidth',    attribute: 'selected-popover-width',      converter: toText({ isNullable: true }),            on: 'update', description: 'Selected-items popover width; mirrored to `--ms-selected-popover-width`.' },

  // ── Member properties (structural → reinit; optional → nullable) ─────────
  { configKey: 'valueMember',             attribute: 'value-member',                converter: toText({ isNullable: true, default: 'value' }), shouldReflect: true, on: 'reinit', description: 'Property name on an option object that holds its value. Default: `value`.' },
  { configKey: 'displayValueMember',      attribute: 'display-value-member',        converter: toText({ isNullable: true, default: 'label' }), shouldReflect: true, on: 'reinit', description: 'Property name that holds an option display label. Default: `label`.' },
  { configKey: 'searchValueMember',       attribute: 'search-value-member',         converter: toText({ isNullable: true }), shouldReflect: true, on: 'reinit', description: 'Property name searched against (falls back to the display value).' },
  { configKey: 'iconMember',              attribute: 'icon-member',                 converter: toText({ isNullable: true, default: 'icon' }), shouldReflect: true, on: 'reinit', description: 'Property name that holds an option icon. Default: `icon`.' },
  { configKey: 'subtitleMember',          attribute: 'subtitle-member',             converter: toText({ isNullable: true, default: 'subtitle' }), shouldReflect: true, on: 'reinit', description: 'Property name that holds an option subtitle. Default: `subtitle`.' },
  { configKey: 'fullTitleMember',         attribute: 'full-title-member',           converter: toText({ isNullable: true }), shouldReflect: true, on: 'reinit', description: 'Property name that holds an option full/long title.' },
  { configKey: 'groupMember',             attribute: 'group-member',                converter: toText({ isNullable: true, default: 'group' }), shouldReflect: true, on: 'reinit', description: 'Property name used to group options under headers. Default: `group`.' },
  { configKey: 'isDisabledMember',          attribute: 'is-disabled-member',             converter: toText({ isNullable: true, default: 'disabled' }), shouldReflect: true, on: 'reinit', description: 'Property name that marks an option disabled. Default: `disabled`.' },

  // ── Tree of options (structural → reinit; optional → nullable) ───────────
  { configKey: 'pathMember',              attribute: 'path-member',                 converter: toText({ isNullable: true }), shouldReflect: true, on: 'reinit', description: 'Property name holding a node materialized tree path.' },
  { configKey: 'parentPathMember',        attribute: 'parent-path-member',          converter: toText({ isNullable: true }), shouldReflect: true, on: 'reinit', description: 'Property name holding a node parent path.' },
  { configKey: 'levelMember',             attribute: 'level-member',                converter: toText({ isNullable: true }), shouldReflect: true, on: 'reinit', description: 'Property name holding a node depth level.' },
  { configKey: 'hasChildrenMember',       attribute: 'has-children-member',         converter: toText({ isNullable: true }), shouldReflect: true, on: 'reinit', description: 'Property name flagging that a node has children.' },
  { configKey: 'isSelectableMember',      attribute: 'is-selectable-member',        converter: toText({ isNullable: true }), shouldReflect: true, on: 'reinit', description: 'Property name marking whether a node can be selected.' },
  { configKey: 'treePathSeparator',       attribute: 'tree-path-separator',         converter: toText({ default: '.' }), shouldReflect: true, on: 'reinit', description: 'Separator between segments in a materialized tree path.' },
  { configKey: 'isTreeEnabled',           converter: toBool('tristate'), on: 'reinit', type: 'boolean', description: 'Force tree mode on/off. Property-only; when unset (null) tree mode auto-enables if a path source (path-member / getPathCallback) is present.' },
  { configKey: 'checkboxMode',            attribute: 'checkbox-mode',               converter: toEnum(['independent', 'cascade'] as const, { default: 'cascade' }), shouldReflect: true, on: 'update',
    description: `Tree checkbox interaction.
- \`cascade\` (default) — checks a node's whole subtree and shows a tristate (checked / indeterminate / unchecked) box on branches. This is what most tree-select UIs do, so it's the default.
- \`independent\` — toggles only the clicked node, ignoring ancestors/descendants.

Tree + multiple only — has no effect on flat lists or single-select (there is no subtree to cascade into).` },
  { configKey: 'cascadeSelectPolicy',     attribute: 'cascade-select-policy',       converter: toEnum(['rolled-up', 'leaves', 'all'] as const, { default: 'rolled-up' }), shouldReflect: true, on: 'update',
    description: `In \`cascade\` mode, which values a selection emits (badges / form / change):
- \`rolled-up\` (default) — minimal cover: a fully-selected subtree collapses to its root; partially-selected branches emit their individually-checked descendants.
- \`leaves\` — only the checked leaf-level nodes.
- \`all\` — every fully-checked node (branches and leaves).` },
  { configKey: 'groupSelectMode',         attribute: 'group-select-mode',           converter: toEnum(['none', 'cascade'] as const, { default: 'none' }), shouldReflect: true, on: 'update',
    description: `Group-header selection in a FLAT (non-tree) grouped, multi-select list.
- \`none\` (default) — group headers are inert labels.
- \`cascade\` — each header shows a tristate checkbox that checks/unchecks all of that group's currently-visible members; a partially-selected group reads indeterminate. The group itself is never a selected value (getValue / badges / form carry member values only).

Flat + multiple only — no effect in tree mode (use \`checkbox-mode\`) or single-select.` },

  // ── Enums ────────────────────────────────────────────────────────────────
  { configKey: 'badgesDisplayMode',       attribute: 'badges-display-mode',         converter: toEnum(['badges', 'count', 'compact', 'partial', 'none'] as const, { default: 'badges' }), on: 'update', description: 'How the current selection is shown in the control.' },
  { configKey: 'badgesPosition',          attribute: 'badges-position',             converter: toEnum(['top', 'bottom', 'left', 'right'] as const, { default: 'bottom' }), on: 'update', description: 'Where the badges/selection appear relative to the input.' },
  { configKey: 'badgesThresholdMode',     attribute: 'badges-threshold-mode',       converter: toEnum(['count', 'partial'] as const, { default: 'count' }), on: 'update', description: 'How `badgesThreshold` is interpreted: collapse to a count badge, or keep partial badges + a "more" badge.' },
  { configKey: 'selectedOrder',           attribute: 'selected-order',              converter: toEnum(['as-selected', 'label-asc', 'label-desc', 'member', 'custom'] as const, { default: 'as-selected' }), shouldReflect: true, on: 'update',
    description: `Order of the CURRENTLY-SELECTED items where they are displayed — badges, partial mode (which items sit behind the "+N more" badge), and the selected-items popover. Display only: \`selectedValue\`, the form output, and \`selectedOptions\` keep as-selected (insertion) order, and the options dropdown is never reordered.
- \`as-selected\` (default) — the order items were picked.
- \`label-asc\` / \`label-desc\` — by the badge label, A→Z / Z→A (locale-aware).
- \`member\` — by the \`selected-order-member\` property (or \`getSelectedOrderCallback\`); numeric keys sort numerically, everything else with a locale string compare.
- \`custom\` — delegate to \`selectedOrderCompareCallback\`.` },
  { configKey: 'selectedOrderMember',     attribute: 'selected-order-member',       converter: toText({ isNullable: true }), shouldReflect: true, on: 'update', description: 'Property name used as the sort key when `selected-order="member"`. Sorts the SELECTED-items display only (not the dropdown). Overridden by `getSelectedOrderCallback`.' },
  { configKey: 'searchMode',              attribute: 'search-mode',                 converter: toEnum(['filter', 'navigate'] as const, { default: 'filter' }), on: 'reinit', description: 'Whether typing filters the list or navigates it.' },
  { configKey: 'searchBehavior',          attribute: 'search-behavior',             converter: toEnum(['normalized', 'case-insensitive', 'exact'] as const, { default: 'normalized' }), on: 'update', description: 'How internal search normalizes text: `normalized` ignores case and diacritics, `case-insensitive` ignores case only, `exact` matches both. Live: re-runs the current search. Not applied to `searchCallback` or `regex` matching.' },
  { configKey: 'searchMatch',             attribute: 'search-match',                converter: toEnum(['contains', 'equals', 'starts-with', 'word-starts-with', 'ends-with', 'word-ends-with', 'regex'] as const, { default: 'contains' }), on: 'update', description: 'Where internal search looks for the term: `contains`, `equals` (the whole value, e.g. codes), `starts-with` / `ends-with` (whole value), `word-starts-with` / `word-ends-with` (any word), or `regex` (tested against the raw search value; an invalid pattern keeps the last valid result). Live: re-runs the current search.' },
  { configKey: 'overlayGroup',            attribute: 'overlay-group',               converter: toText({ isNullable: true }), on: 'reinit', description: 'Scope the "one overlay open at a time" coordination to a named group. Overlays (multiselects, datepickers, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group.' },
  { configKey: 'actionsLayout',           attribute: 'actions-layout',              converter: toEnum(['nowrap', 'wrap'] as const, { default: 'nowrap' }), on: 'reinit', description: 'Whether the action bar wraps or stays on one line.' },
  { configKey: 'actionsPosition',         attribute: 'actions-position',            converter: toEnum(['top', 'bottom'] as const, { default: 'top' }), on: 'reinit', description: 'Whether the action bar sits above or below the list.' },
  { configKey: 'actionsAlign',            attribute: 'actions-align',               converter: toEnum(['stretch', 'left', 'right', 'center', 'space-between'] as const, { default: 'stretch' }), on: 'update', description: 'Horizontal alignment of the action buttons.' },
  { configKey: 'checkboxAlign',           attribute: 'checkbox-align',              converter: toEnum(['top', 'center', 'bottom'] as const, { default: 'center' }), on: 'update', description: 'Vertical alignment of an option checkbox.' },
  { configKey: 'valueFormat',             attribute: 'value-format',                converter: toEnum(['text', 'json', 'array'] as const, { default: 'json' }), on: 'reinit', description: 'The SUBMITTED form value (and `el.value`): `json` (default) — one field, a JSON array (`["a","b"]`); `text` — one field, the values joined by `value-separator` (`a,b`); `array` — one `name[]` field per value. Also the grammar of the `value` attribute / property. `getValueFormatCallback` overrides it.' },
  { configKey: 'valueSeparator',          attribute: 'value-separator',             converter: toText({ default: ',' }), on: 'reinit', description: 'Joins the values in the `text` value format (e.g. `value-separator="|"` → `a|b`) and splits a `text` `value` attribute / property. Default `,`.' },
  { configKey: 'badgeTooltipPlacement',   attribute: 'badge-tooltip-placement',     converter: toEnum(PLACEMENTS, { default: 'top' }), on: 'update', description: 'Preferred placement of a badge tooltip relative to its badge (floating-ui placement).' },
  { configKey: 'optionTooltipPlacement',  attribute: 'option-tooltip-placement',    converter: toEnum(PLACEMENTS, { default: 'top-start' }), on: 'update', description: 'Preferred placement of an option tooltip (floating-ui placement).' },
  { configKey: 'presentation',            attribute: 'presentation',                converter: toEnum(['auto', 'floating', 'fullscreen'] as const, { default: 'auto' }), shouldReflect: true, on: 'update',
    description: 'How the open dropdown is presented. `auto` (default) keeps the floating panel on desktop/tablet and switches to a full-screen overlay on phone-sized touch devices (touch primary + shorter viewport side < 600px, orientation-robust); `floating` forces the anchored panel everywhere; `fullscreen` forces the full-screen overlay on any device (handy for previews/testing). Resolved reactively from the device/viewport environment. Tune it per device class page-wide with responsive rules (`window.components["web-multiselect"].responsive`).' },
  { configKey: 'shouldFullscreenAutofocus',     attribute: 'fullscreen-autofocus',        converter: toBool('default-false'), on: 'update',
    description: 'In the phone fullscreen overlay, auto-focus the search field on open (pops the soft keyboard immediately). Default `false`: the sheet opens with the list visible and the keyboard closed, appearing only when the user taps the search. Set `true` to type-to-filter right away. No effect in the floating presentation.' },

  // ── Numbers ──────────────────────────────────────────────────────────────
  { configKey: 'badgesThreshold',         attribute: 'badges-threshold',            converter: toInt(),               on: 'update', description: 'Threshold at which badges collapse to a count/compact view.' },
  { configKey: 'maxVisibleBadgeCount',        attribute: 'max-visible-badge-count',          converter: toInt(),               on: 'update', description: 'Maximum number of badges rendered before overflow.' },
  { configKey: 'collapseBadgesBelow',     attribute: 'collapse-badges-below',       converter: toInt(),               on: 'update', description: 'Container-responsive opt-in (off by default). When set to a px width, the control watches its OWN border box (not the window, via the core `sizeChanged` hook / a shared ResizeObserver) and collapses `badges-display-mode` to `count` ("N selected") while the box is narrower than this — so a picker in a narrow column/sidebar never overflows with pills, even on a wide monitor. Widening past the threshold restores the configured badges mode. Element-only: the override is applied to the live picker, never to your `badges-display-mode` config.' },
  { configKey: 'minSearchLength',         attribute: 'min-search-length',           converter: toInt({ default: 0 }), on: 'update', description: 'Minimum characters before searching/filtering starts.' },
  { configKey: 'searchDebounce',          attribute: 'search-debounce',             converter: toInt({ default: 0 }), on: 'update', description: 'Debounce delay in ms before the async `searchCallback` fires (local filtering is instant).' },
  { configKey: 'virtualScrollThreshold',  attribute: 'virtual-scroll-threshold',    converter: toInt({ default: 100 }), on: 'reinit', description: 'Option count above which virtual scrolling turns on.' },
  { configKey: 'virtualScrollItemHeight',            attribute: 'virtual-scroll-item-height',               converter: toInt({ default: 50 }), on: 'update', description: 'Fixed row height in pixels used by virtual scrolling (a bare integer — a unit is rejected).' },
  { configKey: 'badgeHeight',             attribute: 'badge-height',                converter: toInt({ min: 1 }), on: 'update', description: 'Row height in pixels (a bare integer — a unit is rejected) of the selected-items popover in virtual-scroll mode (100+ selected). Unset (default): `--ms-badge-height`, the height of every other badge, so the rows match the badges in the control and follow a theme. Set it only to force a different row height.' },
  { configKey: 'virtualScrollOverscan',     attribute: 'virtual-scroll-overscan',       converter: toInt({ default: 10 }), on: 'update', description: 'Extra rows rendered above/below the viewport when virtualizing.' },
  { configKey: 'badgeTooltipDelay',       attribute: 'badge-tooltip-delay',         converter: toInt({ default: 100 }), on: 'update', description: 'Delay in ms before a badge tooltip appears.' },
  { configKey: 'badgeTooltipOffset',      attribute: 'badge-tooltip-offset',        converter: toInt({ default: 8 }), on: 'update', description: 'Gap in pixels between a badge and its tooltip (a bare integer — a unit is rejected).' },
  { configKey: 'optionTooltipDelay',      attribute: 'option-tooltip-delay',        converter: toInt(),               on: 'update', description: 'Delay in ms before an option tooltip appears (falls back to badgeTooltipDelay).' },
  { configKey: 'optionTooltipOffset',     attribute: 'option-tooltip-offset',       converter: toInt(),               on: 'update', description: 'Gap in pixels between an option and its tooltip (a bare integer — a unit is rejected).' },

  // ── Booleans (default true) ──────────────────────────────────────────────
  { configKey: 'isDisabled',              attribute: 'disabled',                    converter: toBool('presence'), shouldReflect: true, on: 'update', description: 'Disable the control: no interaction, not focusable, the value is not submitted with the form (like a native `disabled` control). A disabled ancestor `<fieldset>` disables it too (core `isEffectivelyDisabled`).' },
  { configKey: 'isReadonly',              attribute: 'readonly',                    converter: toBool('presence'), shouldReflect: true, on: 'update', description: 'Read-only control: the user can\'t change the selection and the dropdown doesn\'t open, but the control stays focusable and its value IS submitted. Programmatic `setSelected()` still works.' },
  { configKey: 'isMultiple',       attribute: 'multiple',                    converter: toBool('default-true'), on: 'reinit', description: 'Allow selecting multiple options. When off, selecting one replaces the previous.' },
  { configKey: 'isGroupsAllowed',         attribute: 'allow-groups',                converter: toBool('default-true'), on: 'reinit', description: 'Allow grouping options under group headers.' },
  { configKey: 'isCheckboxesShown',       attribute: 'show-checkboxes',             converter: toBool('default-true'), on: 'reinit', description: 'Show a checkbox on each option.' },
  { configKey: 'isActionsSticky',         attribute: 'actions-sticky',              converter: toBool('default-true'), on: 'update', description: 'Keep the action bar pinned while the list scrolls.' },
  { configKey: 'shouldLockPlacement',       attribute: 'lock-placement',              converter: toBool('default-true'), on: 'update', description: 'Keep the dropdown initial placement instead of flipping when it fits.' },
  { configKey: 'isSearchEnabled',         attribute: 'enable-search',               converter: toBool('default-true'), on: 'reinit', description: 'Show the search input.' },
  { configKey: 'shouldKeepOptionsOnSearch',   attribute: 'keep-options-on-search',      converter: toBool('default-true'), on: 'update', description: 'With `searchCallback` (hybrid search), keep showing the initial options when the dropdown opens and while the search term is shorter than `min-search-length`.' },
  { configKey: 'shouldKeepSearchOnClose', attribute: 'keep-search-on-close', converter: toBool('tristate'), on: 'update', type: 'boolean', description: 'Preserve the search text and filtered results after the dropdown closes. Unset: kept in multi-select, cleared in single-select.' },
  { configKey: 'isSelectedPopoverEnabled', attribute: 'enable-selected-popover',     converter: toBool('default-true'), on: 'update', description: 'Allow the selected-items popover to open (from the count/compact/"+X more" badge or the in-input counter). Turn off when you render your own selection UI, so those affordances become inert.' },

  // ── Booleans (default false) ─────────────────────────────────────────────
  { configKey: 'tabBehavior',             attribute: 'tab-behavior',                converter: toEnum(['select-focused', 'select-navigated', 'close'] as const, { isNullable: true }), on: 'update', description: 'What Tab / Shift+Tab does while the dropdown is open, before focus moves on: `select-focused` selects the focused option (including the first match focused while typing), `select-navigated` only one the user arrowed to, `close` selects nothing. Unset: `select-focused` in single-select, `close` in multi-select. Tab never deselects.' },
  { configKey: 'shouldCloseOnSelect',         attribute: 'close-on-select',             converter: toBool('default-false'), on: 'update', description: 'Close the dropdown immediately after a selection.' },
  { configKey: 'isAddNewAllowed',         attribute: 'allow-add-new',               converter: toBool('default-false'), on: 'reinit', description: 'Allow adding a new option from the search text.' },
  { configKey: 'isCounterShown',          attribute: 'show-counter',                converter: toBool('default-false'), on: 'update', description: 'Show a selected-count indicator.' },
  { configKey: 'isClearShown',            attribute: 'show-clear',                  converter: toBool('default-false'), on: 'update', description: 'Show an inline clear (✕) button inside the input that wipes the whole selection. Appears only while something is selected and the control is enabled; clicking it clears the selection and any search text, fires `change`, and refocuses.' },
  { configKey: 'isBadgeFullTitleShown',   attribute: 'show-badge-full-title',       converter: toBool('default-false'), on: 'update', description: 'Show the full title on badges instead of the short label.' },
  { configKey: 'isVirtualScrollEnabled',  attribute: 'enable-virtual-scroll',       converter: toBool('default-false'), on: 'reinit', description: 'Force virtual scrolling on regardless of the threshold.' },
  { configKey: 'isBadgeTooltipsEnabled',  attribute: 'enable-badge-tooltips',       converter: toBool('default-false'), on: 'update', description: 'Enable tooltips on badges.' },
  { configKey: 'isOptionTooltipsEnabled', attribute: 'enable-option-tooltips',      converter: toBool('default-false'), on: 'update', description: 'Enable tooltips on options.' },
  { configKey: 'shouldReserveIconSlot',      attribute: 'reserve-icon-slot',           converter: toBool('default-false'), on: 'update', description: 'Reserve a fixed-width icon gutter on every option row, including icon-less rows, so all labels share one start column (useful when a list mixes icon and icon-less rows).' },
  { configKey: 'shouldOptionTooltipFollowCursor', attribute: 'option-tooltip-follow-cursor', converter: toBool('default-false'), on: 'update', description: 'Make option tooltips follow the pointer.' },
  { configKey: 'isSearchModeToggleShown',  attribute: 'show-search-mode-toggle',      converter: toBool('default-false'), on: 'update', description: 'Show a clickable toggle in the phone fullscreen overlay search header that flips `search-mode` between `filter` and `navigate` live. Fullscreen-only; no effect in the floating presentation or when search is disabled.' },

  // ── Special attributes ───────────────────────────────────────────────────
  { configKey: 'defaultValue',            attribute: 'value',                       converter: toDefaultValue(), default: [], on: 'reinit', type: 'Array<string | number> | string', description: 'Initial selection (native `defaultValue`: also the form-reset target; the live selection is `selectedValue`, the live submitted value `value`). The `value` attribute is parsed per `value-format`, the same grammar the control submits: `json` (default) / `array` → a JSON array (`["a","b"]`) or a bare fallback split on `value-separator` (`a,b`); `text` → the values joined by `value-separator` (`a,b,c`). Property: an array of values.' },

  // ── Complex property (data) ──────────────────────────────────────────────
  { configKey: 'options',                                                            converter: toObjectArray(),        on: 'update', getLiveValue: (el) => liveOptions(el), type: 'ReadonlyArray<Record<string, unknown>>', description: 'The array of option objects to render. The JS API — assign `el.options` directly. Reading `el.options` after the first build returns the LIVE option list (whatever source fed it — <option> children / `data-options` / this property — plus added-new options; same as `controller.options`); before the build, or while a write is pending, it returns the assigned value. Applied IN PLACE (no rebuild): an open dropdown stays open and the selection/scroll survive, so assigning a fresh array on every parent re-render is cheap. To re-render after mutating option objects in place (e.g. a `disabled` flag) or changing external state a render callback reads, call `el.refresh()` instead. For HTML authoring use the `data-options` attribute (parsed per `data-options-format`) or declarative <option> children; both feed the same list and take precedence over this property in the order: <option> children > property > data-options.' },
  { configKey: 'shouldPruneMissingSelection', attribute: 'prune-missing-selection',  converter: toBool('default-false'), on: 'update', type: 'boolean', description: 'When the option set is replaced (assigning `options` / `data-options`), drop any selected value whose option is no longer present. Default off: selections are KEPT even if their option leaves the list — the safe default for search/paged lists where an item can drop out of the current page yet stay a valid pick. Turn on when a list replacement means the domain changed (e.g. an item was deleted server-side) and a value with no matching option should stop being reported by `selectedValue`. The prune is silent (no select/deselect/change).' },
  { configKey: 'optionsSource', attribute: 'data-options',                            converter: toText({ isNullable: true }), on: 'reinit', type: 'string', description: 'HTML-authoring source for the option list, parsed per `data-options-format`. Reactive: changing either attribute re-renders. Prefer the `options` property in JS; a set `options` property and declarative <option> children both win over this.' },
  { configKey: 'optionsFormat', attribute: 'data-options-format',                     converter: toEnum(OPTIONS_FORMATS, { default: 'json' }), on: 'reinit', type: "'json' | 'csv' | 'plain'", description: 'How to parse the `data-options` attribute: `json` (a JSON array of objects or [value, label] tuples), `csv` (rows split on `data-options-row-splitter`, cells on `data-options-splitter`; the first row is a header — map columns via *-member), or `plain` (bare values split on both splitters -> [value, label] tuples, value === label). Default `json`.' },
  { configKey: 'optionsSplitter', attribute: 'data-options-splitter',                 converter: toText({ default: ',' }), on: 'reinit', type: 'string', description: 'Field/cell delimiter for the `csv` and `plain` `data-options` formats. Default `,`. Escapes `\\t` `\\n` `\\r` are honoured (e.g. `data-options-splitter="\\t"` for TSV). Ignored for `json`.' },
  { configKey: 'optionsRowSplitter', attribute: 'data-options-row-splitter',          converter: toText({ default: '\n' }), on: 'reinit', type: 'string', description: 'Row/record delimiter for the `csv` and `plain` `data-options` formats. Default newline. Escapes honoured (e.g. `data-options-row-splitter=";"` for single-line data). Ignored for `json`.' },
  { configKey: 'actionButtons',                                                      converter: toValue({ validate: (v): v is unknown[] => Array.isArray(v) }), on: 'reinit', type: "Array<'select-all' | 'clear-selection' | MultiSelectActionItem>", description: 'Action buttons (core action items) in the dropdown header/footer: built-ins as strings or items (`[\'select-all\', \'clear-selection\']`) and custom items (`{ id, text, icon, onClick }`). Each activation fires the `action` event. Property-only; none when unset.' },
  { configKey: 'labels',                  attribute: 'labels',                      converter: toObject({ validate: isLabels }), on: 'update', type: 'MultiSelectLabels', description: 'Every UI string (rulebook D-NC-24): placeholders (`selectPlaceholder`, `searchPlaceholder`, `filterPlaceholder`, `navigatePlaceholder`, `noDataPlaceholder`), empty states (`noData` = no options, `noResults` = search miss), `searching`, `noDisplayValue`, `searchHint`, `addNew` / `addNewPending` (`{value}`), counters (`selectedCount`, `moreCount`, `{count}`), `selectedPopoverTitle`, fullscreen match counters, and the ARIA labels (`close`, `clearAllSelections`, `clearSearch`, `showFullLabel`, `removeItem` `{item}`, `removeHiddenItems`, `groupSelected`, `andMore`, `prevMatch`, `nextMatch`) plus the action-button texts (`selectAll`, `clearSelection`). Partial — an unset key falls back to its English default; an empty string = deliberately empty. Property (object) or JSON attribute (`labels=\'{"noResults":"Nic"}\'`). A change rebuilds the picker (selection kept).' },

  // ── Callbacks: data shape (structural → reinit). Every callback takes ONE ctx ─
  { configKey: 'getValueCallback',        converter: cb(), on: 'reinit', type: '(ctx: ItemContext) => string | number', description: 'Extract an option value from `ctx.option` (overrides valueMember).' },
  { configKey: 'getPathCallback',         converter: cb(), on: 'reinit', type: '(ctx: ItemContext) => string', description: 'Extract a node tree path from `ctx.option` (enables tree mode; overrides pathMember).' },
  { configKey: 'getGroupCallback',        converter: cb(), on: 'reinit', type: '(ctx: ItemContext) => string', description: 'Extract the group name from `ctx.option` (overrides groupMember).' },
  { configKey: 'getIsDisabledCallback',   converter: cb(), on: 'reinit', type: '(ctx: ItemContext) => boolean', description: 'Whether the option `ctx.option` is disabled (overrides isDisabledMember).' },
  { configKey: 'getIsSelectableCallback', converter: cb(), on: 'reinit', type: '(ctx: TreeNodeContext) => boolean', description: 'Whether a tree node can be selected (`ctx.option`, `ctx.node`; overrides is-selectable-member).' },
  { configKey: 'getSearchValueCallback',  converter: cb(), on: 'reinit', type: '(ctx: ItemContext) => string | object', description: 'What `ctx.option` is searched against (overrides searchValueMember). Internal search needs a string; an object is for a custom searchCallback (ctx.entries). Computed once per item.' },
  { configKey: 'searchCallback',          converter: cb(), on: 'reinit', type: '(ctx: MultiSelectSearchContext) => unknown[] | Promise<unknown[]>', description: 'Custom / async search. `ctx.term` (typed, or what getSearchTermCallback returned), `ctx.signal` (aborted when superseded), `ctx.entries` (every option with its search value). Return the filtered options.' },

  // ── Callbacks: display / render (cosmetic → update) ──────────────────────
  { configKey: 'getDisplayValueCallback',        converter: cb(), on: 'update', type: '(ctx: ItemContext) => string', description: 'Compute the display label for `ctx.option` (overrides displayValueMember).' },
  { configKey: 'getBadgeDisplayCallback',        converter: cb(), on: 'update', type: '(ctx: BadgeContentRenderContext) => string', description: 'Compute the text shown on a badge.' },
  { configKey: 'getBadgeClassCallback',          converter: cb(), on: 'update', type: '(ctx: BadgeContentRenderContext) => string | string[]', description: 'Extra CSS class(es) for a badge.' },
  { configKey: 'getSelectedOrderCallback',       converter: cb(), on: 'update', type: '(ctx: ItemContext) => string | number', description: 'Sort key for the selected-items display when `selected-order="member"` (overrides `selected-order-member`).' },
  { configKey: 'selectedOrderCompareCallback',   converter: cb(), on: 'update', type: '(ctx: SelectedOrderCompareContext) => number', description: 'Comparator for the selected-items display when `selected-order="custom"`: `({ a, b }) => number` (the `Array.prototype.sort` result contract).' },
  { configKey: 'getIconCallback',                converter: cb(), on: 'update', type: '(ctx: ItemContext) => string', description: 'Icon for `ctx.option` (overrides iconMember).' },
  { configKey: 'getSubtitleCallback',            converter: cb(), on: 'update', type: '(ctx: ItemContext) => string', description: 'Subtitle for `ctx.option` (overrides subtitleMember).' },
  { configKey: 'getFullTitleCallback',           converter: cb(), on: 'update', type: '(ctx: ItemContext) => string', description: 'Full title for `ctx.option` (used by badges when show-badge-full-title is on).' },
  { configKey: 'getCounterCallback',             converter: cb(), on: 'update', type: '(ctx: CounterContext) => string', description: 'Render the badges-area count text: `ctx.count` ("N selected"), plus `ctx.moreCount` for the "+X more" badge.' },
  { configKey: 'getCountLabelCallback',          converter: cb(), on: 'update', type: '(ctx: CountLabelContext) => string', description: 'Format the small count chip shared by the in-input counter and each group header count (`ctx.selectedCount`, `ctx.totalCount`, `ctx.groupName` on a header; default `[selected]`). One callback drives both.' },
  { configKey: 'getValueFormatCallback',         converter: cb(), on: 'update', type: '(ctx: ValueFormatContext) => string', description: 'Serialize `ctx.selectedValues` for form submission (one field; also what `el.value` returns). Overrides `value-format` / `value-separator`. Assigning `el.value` still parses per `value-format`.' },
  { configKey: 'getBadgeTooltipCallback',        converter: cb(), on: 'update', type: '(ctx: BadgeContentRenderContext) => string | HTMLElement', description: 'Tooltip content for a badge.' },
  { configKey: 'getOptionTooltipCallback',       converter: cb(), on: 'update', type: '(ctx: OptionContentRenderContext) => string | HTMLElement', description: 'Tooltip content for an option row.' },
  { configKey: 'getRemoveButtonTooltipCallback', converter: cb(), on: 'update', type: '(ctx: BadgeContentRenderContext) => string', description: 'Tooltip text for a badge remove button.' },
  { configKey: 'getSelectedItemClassCallback',   converter: cb(), on: 'update', type: '(ctx: BadgeContentRenderContext) => string | string[]', description: 'Extra CSS class(es) for a selected item in the popover.' },
  { configKey: 'renderOptionContentCallback',    converter: cb(), on: 'update', type: '(ctx: OptionContentRenderContext) => string | HTMLElement', description: 'Custom render for an option row; may return HTML or an element. A `[data-action]` element inside fires the `action` event (source `option`) instead of toggling the row.' },
  { configKey: 'renderLoadingCallback',          converter: cb(), on: 'update', type: '(ctx: LoaderRenderContext) => void | (() => void)', description: 'Draw a loading state yourself (shared loader, core SPEC §12.14): `ctx` = `{ component, context, containerElement, element, label }`, `context` `search` (async search, `labels.searching`) or `add-new` (async `beforeAddCallback`, `labels.addNewPending`). Fill `containerElement` (already `role="status"` + `aria-label`); optionally return a cleanup. Beats the page-wide `window.components.renderLoadingCallback`; unset = the default `.ms__loader` (`--ms-loader-*` tokens).' },
  { configKey: 'renderBadgeContentCallback',     converter: cb(), on: 'update', type: '(ctx: BadgeContentRenderContext) => string | HTMLElement', description: 'Custom render for a badge content (fills the built-in pill); may return HTML or an element.' },
  { configKey: 'renderBadgeCallback',            converter: cb(), on: 'update', type: '(ctx: BadgeContentRenderContext) => string | HTMLElement | null', description: 'Custom render for the WHOLE badge (main area), not just its content — return the entire pill/card. The component wraps it in `.ms__badge.ms__badge--custom` with `data-value` and delegates removal to any inner element with `data-ms-action="remove"` (or `.ms__badge-remove`); a `[data-action]` element fires the `action` event (source `badge`). Return null/empty to fall back to the default pill for that item.' },
  { configKey: 'renderGroupLabelContentCallback', converter: cb(), on: 'update', type: '(ctx: GroupLabelRenderContext) => string | HTMLElement', description: 'Customize a group label; may return an HTML string or element. `ctx` carries `groupName` plus the group members + selection (e.g. `ctx.selectedCount`) so a custom header can show a per-group count.' },
  { configKey: 'renderSelectedContentCallback',  converter: cb(), on: 'update', type: '(ctx: SelectedContentRenderContext) => string', description: 'Custom render for the single-select selected value (`ctx.option`).' },
  { configKey: 'renderSelectedItemContentCallback', converter: cb(), on: 'update', type: '(ctx: BadgeContentRenderContext) => string | HTMLElement', description: 'Custom render for one selected item in the popover (`ctx.isInPopover` is true).' },
  { configKey: 'getCustomStylesCallback',        converter: cb(), on: 'update', type: '(ctx: MultiSelectContext) => string | null', description: 'Return a CSS string injected into the component via a replaceable style slot (§12.8). Takes precedence over the `custom-styles` attribute when both are set.' },

  // ── Callbacks: before-hooks (`false` cancels; a value replaces) ──────────
  { configKey: 'beforeSearchCallback',    converter: cb(), on: 'update', type: '(ctx: BeforeSearchContext) => string | false | void | Promise<string | false | void>', description: 'Runs before a search with `ctx.term`: return a rewritten term, `false` to skip the search (the full list shows), or nothing to continue.' },
  { configKey: 'getSearchTermCallback',   converter: cb(), on: 'update', type: "(ctx: SearchTermCallbackContext) => string | RegExp | object | null", description: 'Prepare `ctx.term` for matching (after beforeSearchCallback). For internal search (`ctx.target === "internal"`) return a string (used as-is) or RegExp; for searchCallback return anything — it arrives as ctx.term. Live: re-runs the current search.' },
  { configKey: 'beforeSelectCallback',    converter: cb(), on: 'update', type: '(ctx: BeforeSelectContext) => void | false | Promise<void | false>', description: 'Runs before a user gesture selects an option (`ctx.option`, `ctx.source`) — once per option, also for Select-All / group checkboxes. Return `false` to veto (explain it with `ctx.controller.showMessage`). May be async.' },
  { configKey: 'beforeDeselectCallback',  converter: cb(), on: 'update', type: '(ctx: BeforeDeselectContext) => void | false | Promise<void | false>', description: 'Runs before a user gesture deselects an option (row, badge ×, Clear-All, inline ✕, …) — once per option. Return `false` to veto. May be async.' },
  { configKey: 'beforeAddCallback',       converter: cb(), on: 'update', type: '(ctx: AddContext) => unknown | false | void | Promise<unknown | false | void>', description: 'Runs when the user creates an option from the typed text (`ctx.value`). Return the new option (appended + selected), `false` to cancel (no `add` event), or nothing to only fire `add` and create it yourself. May be async (a spinner shows).' },
  { configKey: 'getAddNewTextCallback',   converter: cb(), on: 'update', type: '(ctx: AddContext) => string', description: 'Compute the "add new" prompt label from `ctx.value` (returns plain text). Takes precedence over `labels.addNew`.' },
  { configKey: 'beforeKeydownCallback',   converter: cb(), on: 'update', type: '(ctx: KeydownContext) => void | false', description: 'Runs before the built-in keyboard handling (`ctx.event`, `ctx.key`, state; drive the picker via `ctx.controller`). Return `false` to suppress the built-in handling of the key. Synchronous.' },
  { configKey: 'beforeActionCallback',    converter: cb(), on: 'update', type: '(detail: MultiSelectActionEventDetail) => void | false | Promise<void | false>', description: 'Runs before an action item (button or `data-action` trigger) activates: return `false` to cancel its onClick, the `action` event and the built-in. May be async.' },
];

// Outward events (core §12.5). Each installs a camelCase `on<Name>` twin that core
// calls with the detail (not the CustomEvent) right before dispatching. Details carry
// `controller` / `element` (non-enumerable) and the presentation flags.
type MultiSelectEvents = {
  select: SelectEventDetail;
  deselect: DeselectEventDetail;
  change: ChangeEventDetail;
  add: AddEventDetail;
  action: MultiSelectActionEventDetail;
  ready: ReadyEventDetail;
  open: OpenEventDetail;
  close: CloseEventDetail;
  'value-format-error': ValueFormatErrorEventDetail;
};
const EVENTS = [
  { name: 'select', description: 'An option was selected. `detail.option` is the selected option; `detail.selectedOptions` / `detail.selectedValues` are the full selection. Twin: `onSelect(detail)`.' },
  { name: 'deselect', description: 'An option was removed from the selection. `detail.option` is that option. Twin: `onDeselect(detail)`.' },
  { name: 'change', description: 'The selection changed. `detail.selectedOptions` / `detail.selectedValues` are the full selection. Twin: `onChange(detail)`.' },
  { name: 'add', description: 'The user chose to create a new option from the typed text (via the "add new" prompt or Enter) — requires `allow-add-new`. `detail.value` is the typed text; `detail.option` is the created item when `beforeAddCallback` returned one. Twin: `onAdd(detail)`.' },
  { name: 'action', description: 'An action button or a `data-action` trigger (in option / badge content or a `showMessage` element) was activated. `detail`: `action` (`select-all` | `clear-selection` | `custom`), `id`, `item`, `source` (`action-buttons` | `option` | `badge` | `message`), `option` (for option / badge triggers), `sourceEvent`, `triggerElement`, `dataset`, plus the selection snapshot. Fires after the item’s `onClick` and the built-in behaviour (the selection snapshot is the state after it). Twin: `onAction(detail)`.' },
  { name: 'ready', description: 'The picker was built for the first time (once per element lifetime; core `BlissElement`). Fires right after the first build — during upgrade for a normal element, or when the `defer` gate is released (`el.release()` / removing `defer`). The host then also has the `ready` attribute and matches `:state(ready)`; `el.whenReady()` resolves. `detail`: `controller` / `element`. Twin: `onReady(detail)`.' },
  { name: 'open', description: 'The dropdown opened (floating panel or the phone fullscreen overlay) — by the user or `open()`. `detail`: `controller` / `element` + the presentation flags. Twin: `onOpen(detail)`.' },
  { name: 'close', description: 'The dropdown closed — any reason (Escape, outside click, selection with `close-on-select`, Tab, another overlay opening, `close()`). `detail`: `controller` / `element` + the presentation flags. Twin: `onClose(detail)`.' },
  { name: 'value-format-error', description: '`getValueFormatCallback` threw: an empty string was written into the hidden input, the host is marked invalid (`customError`, message = `labels.valueFormatError`) so the form will not submit (unless `novalidate`), and the error is logged. The next successful format clears it. `detail.error` = what was thrown, `detail.value` = the selected values the callback got. Twin: `onValueFormatError(detail)`.' },
] as const;

/**
 * configKeys that are NOT part of the picker's `MultiSelectConfig` — handled by
 * this element directly (CSS-var sugar, initial values). Stripped
 * before the merged config is handed to the picker.
 */
// Live `options` getter (core `getLiveValue`, SPEC §4.1). Assigned in the class's static block
// so it can read the private engine; no flush (a staged write keeps the getter on the stored value).
let liveOptions: (el: HTMLElement) => ReadonlyArray<Record<string, unknown>> | undefined = () => undefined;

const NON_PICKER_KEYS = new Set(['isDisabled', 'dropdownWidth', 'selectedPopoverWidth', 'defaultValue', 'optionsSource', 'optionsFormat', 'optionsSplitter', 'optionsRowSplitter', 'presentation', 'collapseBadgesBelow', 'customStyles', 'getCustomStylesCallback']);

/** A torn-down picker's live state, carried to the next build (see #buildPicker). */
type HeldSelection<T> = {
  /** Raw selection keys in order — including values whose option isn't loaded yet. */
  selection: string[];
  selectedOptions: T[];
  selectedValue: string | number | (string | number)[] | null;
  formValue: string | string[];
};

/** CSS-var sugar: configKey → the host CSS custom property it mirrors to. */
const CSS_VARS: Record<string, string> = {
  dropdownWidth: '--ms-dropdown-width',
  selectedPopoverWidth: '--ms-selected-popover-width',
};

// getCustomStylesCallback dev-mode lint (see #checkCustomStyleVars). The set of
// `--ms-*` variables the stylesheet reads is computed once from the (static)
// bundled stylesheet. Empty when the CSS isn't inlined (e.g. under vitest),
// which the check treats as "no ground truth" and skips.
let consumedMsVarsCache: Set<string> | null = null;
function consumedMsVars(): Set<string> {
  return (consumedMsVarsCache ??= extractConsumedCssVars(styles, '--ms-'));
}

export class MultiSelectElement<T = any> extends BlissElement<MultiSelectEvents, MultiSelectController<T>> {
  // Opt into the form-associated custom element lifecycle so form.reset() and
  // form.elements see the control.
  static formAssociated = true;

  protected static override inputs = INPUTS;
  protected static override events = EVENTS;

  // Type-only: core installs the `on<Name>` twins at runtime (§12.5); each is
  // called with the event detail (not the CustomEvent), right before the event.
  declare onSelect: ((detail: SelectEventDetail<T>) => void) | null;
  declare onDeselect: ((detail: DeselectEventDetail<T>) => void) | null;
  declare onChange: ((detail: ChangeEventDetail<T>) => void) | null;
  declare onAdd: ((detail: AddEventDetail<T>) => void) | null;
  declare onAction: ((detail: MultiSelectActionEventDetail<T>) => void) | null;
  declare onReady: ((detail: ReadyEventDetail<T>) => void) | null;
  declare onOpen: ((detail: OpenEventDetail<T>) => void) | null;
  declare onClose: ((detail: CloseEventDetail<T>) => void) | null;
  declare onValueFormatError: ((detail: ValueFormatErrorEventDetail<T>) => void) | null;

  static {
    liveOptions = (el) => (el instanceof MultiSelectElement ? el.#picker?.getController().options : undefined);
  }

  #shadow: ShadowRoot;
  #picker?: MultiSelectEngine<T>;
  // A `value` property assigned while no picker exists — applied on the next build.
  #pendingValue: string | readonly (string | number)[] | null = null;
  // The live state of a picker torn down by a removal (removedCallback) — re-seeded when
  // the element is attached again, and what the getters report while it is detached.
  #heldState?: HeldSelection<T>;
  #container?: HTMLDivElement;
  // The `value` (defaultValue) JSON of the last build. Lets a rebuild tell an explicit
  // `value` (defaultValue) change (honour the new default) apart from a cosmetic/structural
  // reinit or a re-attach (keep the live selection). See #buildPicker.
  #lastDefaultValueJSON?: string;
  #customStyles: StyleSlot | null = null;
  // Dev-mode getCustomStylesCallback lint: unknown --ms-* names already warned about.
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

    // Reveal the input placeholder one frame after upgrade: `data-placeholder-ready`
    // gates ONLY the placeholder opacity fade-in (controls.css). Distinct from
    // core's `ready` attribute (the first build) — this flag is cosmetic and safe to pre-seed
    // in SSR (the LiveView wrapper does, so LV's data-* stripping on phx-update="ignore"
    // elements can't tear it off). Renamed from the ambiguous `data-ready`.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.setAttribute('data-placeholder-ready', ''));
    } else {
      this.setAttribute('data-placeholder-ready', '');
    }
  }

  /**
   * Called by the browser when the surrounding <form> is reset. Restores the
   * initial selection — the `value` (defaultValue) input (or declarative
   * `<option selected>` children), like a native `<select>` restoring its
   * `selected` options — or clears when there is none. Selecting from JS never
   * rewrites `value` (defaultValue) (it doesn't reflect), so it stays the reset
   * default. A reset is not a user action: no `select`/`deselect`/`change`.
   */
  formResetCallback(): void {
    this.flush();
    if (!this.#picker) {
      // Deferred / detached: forget the assigned or held selection — the next build seeds
      // the default, exactly what a reset of a built picker leaves.
      this.#pendingValue = null;
      this.#heldState = undefined;
      return;
    }
    const initial = this.#resolveDefaultValue() ?? [];
    // A single-select holds one value — same rule as the first build.
    this.#picker?.setSelected(this.config.isMultiple === false ? initial.slice(0, 1) : initial);
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
    // Core's `defer` gate holds reinit() itself until release().
    if (this.isConnected) this.#rebuildPicker();
  }

  /** Cosmetic change: mirror CSS vars / custom styles, patch the picker in place. */
  protected override update(partial: Record<string, unknown>): void {
    this.#mirrorCssVars(partial);
    if ('getCustomStylesCallback' in partial || 'customStyles' in partial) this.#applyCustomStyles();

    // Everything else goes to the live picker as an in-place patch. Forward `null`
    // verbatim — it's the clear signal under core's null-clear contract, and the
    // picker's `Object.assign(this.options, partial)` + falsy/`?? default` reads
    // resolve it as a reset. NON_PICKER_KEYS are handled above.
    const pickerPartial: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (NON_PICKER_KEYS.has(key)) continue;
      // Collapsed by `collapse-badges-below`: the new mode is stored in config and lands
      // when the box widens again (#restoreBadgesMode) — forwarding it now would undo the collapse.
      if (key === 'badgesDisplayMode' && this.#badgesCollapsed) continue;
      pickerPartial[key] = value;
    }
    // `options` resolves through the same source precedence as a build (<option> children >
    // property > `data-options`), so an assignment can't show a list a rebuild would replace.
    if ('options' in pickerPartial) pickerPartial.options = this.#resolveOptionData(pickerPartial.options as T[] | null | undefined);
    if (this.#picker && Object.keys(pickerPartial).length > 0) {
      if (!this.#picker.updateOptions(pickerPartial as Partial<MultiSelectConfig<T>>)) this.#rebuildPicker();
    }

    // `presentation` is element-only (NON_PICKER_KEYS) — the picker never sees
    // the raw setting. When the author changes the attribute we re-resolve it
    // against the current environment ourselves (environmentChanged only fires on an
    // env change, not an attribute change).
    if ('presentation' in partial) this.#applyPresentation(getEnvironment());

    // `collapseBadgesBelow` is element-only too — re-evaluate against the current
    // box when the threshold is set/changed/cleared (the `sizeChanged` hook only fires
    // on a box change, not an attribute change).
    if ('collapseBadgesBelow' in partial) this.#applyBadgeCollapse(this.offsetWidth);
  }

  /** `disabled` input or ancestor `<fieldset disabled>` flipped (core): apply it in place. */
  protected override disabledChanged(isDisabled: boolean): void {
    this.#picker?.setDisabled(isDisabled);
  }

  /** Activate: ensure the picker exists (a removal tore it down in removedCallback()). */
  protected override connect(): void {
    if (!this.#picker) this.#rebuildPicker();
  }

  /**
   * Deactivate: close the dropdown, keep the picker. A DOM move (reorder, into a dialog /
   * portal) reconnects in the same task, so the selection, "add new" options and the rest
   * of the live state survive it; a real removal is handled by removedCallback().
   */
  protected override disconnect(): void {
    this.#picker?.close();
  }

  /** Still detached a frame after disconnect (core): a removal — hold the state, release the picker. */
  protected override removedCallback(): void {
    if (!this.#picker) return;
    this.#heldState = this.#captureState(this.#picker);
    this.#picker.destroy();
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

  /** Resolve `presentation` against `env` and relay it to the live picker. */
  #applyPresentation(env: EnvironmentSnapshot): void {
    const mode = (this.config.presentation as Presentation | null) ?? 'auto';
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

  // ── container-responsive badge collapse (core §12.9 `sizeChanged`) ─────────────

  /** Whether the live picker is currently forced to the collapsed count view. */
  #badgesCollapsed = false;

  /**
   * This element's own border box changed (core §12.9 `sizeChanged`). Overriding the
   * hook opts us into a shared page-wide ResizeObserver, subscribed on connect and
   * dropped on disconnect. Unlike `environmentChanged`/`viewportChanged` (the
   * WINDOW), this is our OWN box — a picker in a 400px sidebar on a 2560px monitor
   * reflows on its width, not the viewport's. We only act when `collapse-badges-
   * below` is set; otherwise it's a cheap no-op.
   */
  protected override sizeChanged({ width }: ElementSize): void {
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

  /**
   * (Re)build the picker, carrying the live state over: from the current picker (a reinit
   * from a structural change) or the state held since a removal (re-attach). First build:
   * neither exists.
   */
  #rebuildPicker(): void {
    const held = this.#picker ? this.#captureState(this.#picker) : this.#heldState;
    this.#heldState = undefined;
    this.#picker?.destroy();
    this.#picker = undefined;
    this.#buildPicker(held);
  }

  #captureState(picker: MultiSelectEngine<T>): HeldSelection<T> {
    return {
      selection: picker.getSelectionSnapshot(),
      selectedOptions: picker.selectedOptions,
      selectedValue: picker.selectedValue,
      formValue: picker.getFormValue(),
    };
  }

  #buildPicker(held?: HeldSelection<T>): void {
    this.#ensureContainer();
    this.#parseDeclarativeOptionsOnce();

    const cfg = this.#assembleConfig();

    // Seed the picker's initial selection, by precedence:
    // 1. a `value` property assigned while no picker existed (an explicit current value);
    // 2. the held live selection — even an empty one (the user cleared it) — UNLESS the
    //    consumer changed `value` (defaultValue) since the last build: a new default wins;
    // 3. the default (`value` / defaultValue, or declarative `<option selected>`).
    // The held selection keeps values whose option isn't loaded yet, so "options not there
    // yet" can't be mistaken for "cleared".
    const pendingValue = this.#pendingValue;
    this.#pendingValue = null;
    const defaultValues = this.#resolveDefaultValue();
    const defaultJSON = JSON.stringify(defaultValues ?? null);
    const isHeldKept = pendingValue === null && held !== undefined && defaultJSON === this.#lastDefaultValueJSON;
    const initialValues = pendingValue !== null ? this.#parseValue(pendingValue)
      : isHeldKept ? held!.selection
      : defaultValues;
    this.#lastDefaultValueJSON = defaultJSON;

    // The picker reads initial values off the container dataset.
    if (initialValues && initialValues.length > 0) {
      this.#container!.dataset.defaultValue = JSON.stringify(initialValues);
    } else {
      delete this.#container!.dataset.defaultValue;
    }

    this.#picker = new MultiSelectEngine<T>(this.#container!, cfg as any);
    // Selected options the new list lacks ("add new" ones, from a re-parsed source) stay selected.
    if (isHeldKept) this.#picker.adoptSelectedOptions(held!.selectedOptions);
    this.#applyCustomStyles();
    // A fresh picker starts 'floating'; re-assert the resolved presentation so a
    // rebuild (reinit) doesn't drop a fullscreen setting until the next env change.
    this.#applyPresentation(getEnvironment());
    // Likewise re-assert the container-responsive badge collapse: the fresh picker
    // is at the base badges mode, so reset our flag and re-evaluate the current box
    // (the throttled `sizeChanged` hook would otherwise leave it uncollapsed until the
    // next box change). offsetWidth is the layout width (no transforms) — the same number
    // core's sizeChanged() reports since rc18, so the first read and the hook agree.
    this.#badgesCollapsed = false;
    this.#applyBadgeCollapse(this.offsetWidth);
  }

  #ensureContainer(): void {
    if (this.#container) return;
    const container = document.createElement('div');
    container.setAttribute('data-multiselect', '');
    if (this.className) container.className = this.className;
    this.#shadow.appendChild(container);
    // Per-instance slot for getCustomStylesCallback CSS, kept at the top of the
    // root so consumer @import/@font-face rules work; re-setting replaces it.
    this.#customStyles = createStyleSlot(this.#shadow, { position: 'first', cssClass: 'ms-custom-styles' });
    this.#container = container;
  }

  /**
   * Build the picker config from the merged `this.config`, minus the keys the
   * picker doesn't own, plus the runtime wiring (event bridges, container, host,
   * declarative option data, counter default).
   */
  #assembleConfig(): Record<string, unknown> {
    // Canonical engine-config assembly (core §6 null-clear contract): a shallow copy
    // of the merged config with the element-only keys removed and every `null` kept.
    // A cleared nullable input arrives as `null` and the picker resolves it falsily
    // (truthiness / `?? default`), so the clear lands — same result the old delete-null
    // loop produced, now via the one shared assembler instead of a per-component loop.
    const cfg = this.engineConfig(NON_PICKER_KEYS);

    cfg.options = this.#resolveOptionData(cfg.options as T[] | null | undefined);

    // Event bridges: the engine builds each detail (with the context) and reports it
    // through its on* options; the element dispatches it (core calls the on<Name> twin).
    cfg.onSelect = (detail: SelectEventDetail<T>) => this.emit('select', detail);
    cfg.onDeselect = (detail: DeselectEventDetail<T>) => this.emit('deselect', detail);
    cfg.onChange = (detail: ChangeEventDetail<T>) => this.emit('change', detail);
    cfg.onAdd = (detail: AddEventDetail<T>) => this.emit('add', detail);
    cfg.onAction = (detail: MultiSelectActionEventDetail<T>) => this.emit('action', detail);
    cfg.onOpen = (detail: OpenEventDetail<T>) => this.emit('open', detail);
    cfg.onClose = (detail: CloseEventDetail<T>) => this.emit('close', detail);
    cfg.onValueFormatError = (detail: ValueFormatErrorEventDetail<T>) => this.emit('value-format-error', detail);
    // A throwing getValueFormatCallback → customError validity (core SPEC §6.6); null clears it.
    cfg.formatValidityCallback = (failure, message) => this.setFormatError(failure ? failure.error ?? message : null, message);

    // Container (shadow) for the dropdown/hint/popover; host for light-DOM inputs. Contexts
    // carry THIS element and its (rebuild-proof) controller, not the engine's own.
    // Effective disabled state: the `disabled` input OR a disabled ancestor <fieldset> (core).
    cfg.isDisabled = this.isEffectivelyDisabled;
    cfg.container = this.#shadow as unknown as HTMLElement;
    cfg.hostElement = this;
    cfg.controller = this.controller;
    return cfg;
  }

  /**
   * Option-data precedence: declarative <option> children > the `options` property (JS) >
   * the `data-options` attribute (parsed per data-options-format). Shared by a build and an
   * in-place `options` update. `optionsSource`/`optionsFormat` are reactive inputs (observed
   * by the table), so a change to either re-runs this on reinit.
   */
  #resolveOptionData(property: T[] | null | undefined): T[] | null | undefined {
    if (this.#hasDeclarativeOptions && this.#declarativeOptions) {
      if (property && property.length > 0) {
        dataLogger.warn('[MultiSelectElement] Both declarative <option> elements and programmatic .options detected. Using declarative options.');
      }
      return this.#declarativeOptions;
    }
    if (property && property.length > 0) return property;
    const source = this.config.optionsSource as string | null | undefined;
    if (source == null) return property;
    const format = (this.config.optionsFormat as OptionsFormat) ?? 'json';
    const { options: parsed, error } = parseOptionsData(source, format, {
      splitter: this.config.optionsSplitter as string | undefined,
      rowSplitter: this.config.optionsRowSplitter as string | undefined,
    });
    if (error) dataLogger.error(`[MultiSelectElement] ${error}`);
    return parsed as T[];
  }

  #resolveDefaultValue(): (string | number)[] | undefined {
    if (this.#declarativeSelectedValues && this.#declarativeSelectedValues.length > 0) {
      return this.#declarativeSelectedValues;
    }
    const fromConfig = parseDefaultValue(this.config.defaultValue as string | (string | number)[] | undefined, this.config.valueFormat as string | undefined, this.config.valueSeparator as string | undefined);
    return fromConfig.length > 0 ? fromConfig : undefined;
  }

  /** Parse a `value` (attribute grammar) per the current `value-format` / `value-separator`. */
  #parseValue(value: string | readonly (string | number)[]): (string | number)[] {
    return parseDefaultValue(value, this.config.valueFormat as string | undefined, this.config.valueSeparator as string | undefined);
  }

  // ── §12.8 custom styles ───────────────────────────────────────────────────

  #applyCustomStyles(): void {
    const slot = this.#customStyles;
    if (!slot) return;
    // The JS callback wins when both are set; the `custom-styles` attribute is the
    // static fallback (raw CSS string). Neither → clear the slot.
    const callback = this.config.getCustomStylesCallback as ((ctx: MultiSelectContext<T>) => string | null | undefined) | null | undefined;
    const staticCss = (this.config.customStyles as string | null | undefined) ?? null;
    if (typeof callback !== 'function') {
      slot.set(staticCss);
      if (import.meta.env?.DEV && staticCss) this.#checkCustomStyleVars(staticCss);
      return;
    }
    try {
      const css = callback(this.withContext({}) as unknown as MultiSelectContext<T>);
      slot.set(css);
      if (import.meta.env?.DEV && css) this.#checkCustomStyleVars(css);
    } catch (e) {
      dataLogger.warn('[MultiSelectElement] getCustomStylesCallback threw', e);
      // Callback blew up — fall back to the static attribute CSS if present.
      slot.set(staticCss);
    }
  }

  /**
   * Dev-only lint: warn when `getCustomStylesCallback` *sets* a `--ms-*` variable
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
    // (see the call site), per-instance de-dup, and the (instance-logger) message.
    for (const { name, suggestions } of lintCssVars(css, { prefix: '--ms-', consumed })) {
      if (this.#warnedCssVars.has(name)) continue;
      this.#warnedCssVars.add(name);
      this.log.UI.warn(
        `getCustomStylesCallback sets "${name}", which no ` +
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

  // ── non-input public API ──────────────────────────────────────────────────

  /** The selection — a scalar (or null) in single-select, an array in multi-select. Same as `controller.selectedValue`. */
  get selectedValue(): string | number | (string | number)[] | null {
    this.flush(); // apply a pending `options = …` before reading live picker state
    return this.#picker ? this.#picker.selectedValue : this.#heldState?.selectedValue ?? null;
  }

  /**
   * The current value — exactly what the form submits under `name`: a string for
   * `value-format="json"` (default) / `"text"` / `getValueFormatCallback`, a `string[]`
   * (one per `name[]` field) for `"array"`. Works without `name` too.
   * Assigning accepts the same form (parsed like the `value` attribute, per `value-format`
   * / `value-separator`; an array is taken as the values) and sets the selection silently
   * (no select/deselect/change), without touching the `value` attribute — that stays
   * `defaultValue`, the `form.reset()` target.
   */
  get value(): string | string[] {
    this.flush();
    if (this.#picker) return this.#picker.getFormValue();
    if (this.#pendingValue === null && this.#heldState) return this.#heldState.formValue; // removed: the last value
    // Not built yet: the pending assignment / default value, in the submitted form.
    const isArray = this.config.valueFormat === 'array' && !this.config.getValueFormatCallback;
    const values = this.#pendingValue !== null ? this.#parseValue(this.#pendingValue) : this.#resolveDefaultValue() ?? [];
    if (isArray) return values.map((v) => String(v));
    if (this.config.getValueFormatCallback) return '';
    return this.config.valueFormat === 'text' ? values.join((this.config.valueSeparator as string | undefined) ?? ',') : JSON.stringify(values);
  }
  set value(val: string | readonly (string | number)[] | null) {
    this.flush();
    const v = val ?? '';
    if (this.#picker) this.#picker.setSelected(this.#parseValue(v));
    else this.#pendingValue = v;
  }

  /** The first selected option (the only one in single-select), or null. Same as `controller.selectedOption`. */
  get selectedOption(): T | null {
    this.flush();
    return this.#picker ? this.#picker.selectedOption : this.#heldState?.selectedOptions[0] ?? null;
  }

  /** The selected option objects, in selection order. Same as `controller.selectedOptions`. */
  get selectedOptions(): T[] {
    this.flush();
    return this.#picker ? this.#picker.selectedOptions : [...(this.#heldState?.selectedOptions ?? [])];
  }

  /** The option whose value equals `value` (compared as strings), or `null` — also finds a selected option no longer in `options`. Same as `controller.getOptionByValue()`. */
  getOptionByValue(value: string | number): T | null {
    this.flush();
    return this.#picker?.getOptionByValue(value) ?? null;
  }

  setSelected(values: (string | number)[], opts: { notify?: boolean } = {}): void {
    // Preserve the synchronous `el.options = data; el.setSelected(sel)` contract:
    // property writes coalesce on a microtask, so flush the pending rebuild first
    // or the picker would still hold the pre-write options (count/options mismatch).
    this.flush();
    this.#picker?.setSelected(values, opts);
  }

  /**
   * Re-render from the CURRENT option set without re-ingesting it — the companion to the
   * `options` setter. Assign `el.options = …` when the SET changed (a new array, items
   * added/removed/reordered); call `refresh()` when the same objects were mutated in place
   * (e.g. toggling a `disabled` flag) or when external state a render callback reads
   * (`getIsDisabledCallback`, an i18n label map, custom renderers) changed — there is nothing to
   * assign in that case. Silent: fires no select/deselect/change. No-op before the picker is
   * built (while a `defer` gate is held, options/callbacks are wired and land on release).
   */
  refresh(): void {
    this.flush(); // land any pending `options = …` write before recomputing the view
    this.#picker?.refresh();
  }

  /**
   * Surface a transient message ("toast") on top of the component — visible even in the
   * fullscreen overlay, where page-level UI is hidden behind the sheet. Content is text or
   * an element; `opts.type` sets the tone and `opts.autoHideMs` the auto-dismiss (0 =
   * sticky). Same as `el.controller.showMessage` — the way a veto callback explains itself.
   */
  showMessage(content: string | HTMLElement, opts?: MessageOptions): void {
    this.flush();
    this.#picker?.showMessage(content, opts);
  }

  /** Dismiss the transient message shown by {@link showMessage}, if any. */
  hideMessage(): void {
    this.#picker?.hideMessage();
  }

  /** Whether a {@link showMessage} message is currently shown. Same as `controller.isMessageShown`. */
  get isMessageShown(): boolean {
    return this.#picker?.isMessageShown ?? false;
  }

  // ── scroll-to API ───────────────────────────────────────────────────────────

  /**
   * Clear the search box and restore the full option list (does not touch the selection — use
   * `controller.clearSelection()` for that). Pair with {@link scrollToValue} to reveal then scroll to an option
   * a search had filtered out: `el.clearSearch(); el.scrollToValue(v)`.
   */
  clearSearch(): void {
    this.flush();
    this.#picker?.clearSearch();
  }

  /** The current search box text (empty string when nothing is typed). Read via this getter, write with {@link search}. Same as `controller.searchTerm`. */
  get searchTerm(): string {
    this.flush();
    return this.#picker?.searchTerm ?? '';
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
   * Scroll the open dropdown to the option at `index` (into the current filtered list). Resolves
   * `true` once scrolled, `false` if closed or out of range. Deferred internally so `el.open(); el.scrollToIndex(i)` works.
   */
  scrollToIndex(index: number, opts?: { block?: ScrollLogicalPosition }): Promise<boolean> {
    this.flush();
    return this.#picker?.scrollToIndex(index, opts) ?? Promise.resolve(false);
  }

  /**
   * Scroll the open dropdown to the option with this `value`. Resolves `false` if it isn't in the
   * currently visible list (filtered out by search, or under a collapsed tree branch) — call
   * {@link clearSearch} / expand first.
   */
  scrollToValue(value: string | number, opts?: { block?: ScrollLogicalPosition }): Promise<boolean> {
    this.flush();
    return this.#picker?.scrollToValue(value, opts) ?? Promise.resolve(false);
  }

  /**
   * Scroll to a group: its header in standard rendering, or the group's first option in
   * virtual-scroll mode (no headers there). Resolves `false` in tree mode or if the group is empty
   * in the current filtered list.
   */
  scrollToGroup(name: string, opts?: { block?: ScrollLogicalPosition }): Promise<boolean> {
    this.flush();
    return this.#picker?.scrollToGroup(name, opts) ?? Promise.resolve(false);
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

  /** Final teardown (core `destroy()`): release the picker for good — never rebuilt. */
  protected override destroyCallback(): void {
    this.#picker?.destroy();
    this.#picker = undefined;
    this.#heldState = undefined;
    // ElementInternals outlive the element's teardown (core): drop a format-error validity.
    this.setFormatError(null);
  }

  /**
   * The public facade (`el.controller`, and `controller` on every callback ctx and event
   * detail). Delegates to the current engine, so it survives rebuilds; applies pending property
   * writes first (`flush`). Reads return empty values before the first build.
   */
  protected override createController(): MultiSelectController<T> {
    const engine = () => {
      this.flush();
      return this.#picker?.getController();
    };
    const call = <K extends keyof MultiSelectController<T>>(name: K) =>
      ((...args: unknown[]) => (engine()?.[name] as ((...a: unknown[]) => unknown) | undefined)?.(...args)) as MultiSelectController<T>[K];
    return {
      get selectedOptions() { return engine()?.selectedOptions ?? []; },
      get selectedOption() { return engine()?.selectedOption ?? null; },
      get selectedValue() { return engine()?.selectedValue ?? null; },
      get options() { return engine()?.options ?? []; },
      get searchTerm() { return engine()?.searchTerm ?? ''; },
      get isOpen() { return engine()?.isOpen ?? false; },
      get isMessageShown() { return engine()?.isMessageShown ?? false; },
      setSelected: call('setSelected'),
      selectAll: call('selectAll'),
      clearSelection: call('clearSelection'),
      toggleValue: call('toggleValue'),
      selectValue: call('selectValue'),
      deselectValue: call('deselectValue'),
      toggleFocused: call('toggleFocused'),
      open: call('open'),
      close: call('close'),
      toggle: call('toggle'),
      search: call('search'),
      clearSearch: call('clearSearch'),
      scrollToValue: (value) => engine()?.scrollToValue(value) ?? Promise.resolve(false),
      getOptionByValue: (value) => engine()?.getOptionByValue(value) ?? null,
      scrollToGroup: (group) => engine()?.scrollToGroup(group) ?? Promise.resolve(false),
      scrollToIndex: (index) => engine()?.scrollToIndex(index) ?? Promise.resolve(false),
      refresh: call('refresh'),
      focusNext: call('focusNext'),
      focusPrevious: call('focusPrevious'),
      focusFirst: call('focusFirst'),
      focusLast: call('focusLast'),
      focusPageUp: call('focusPageUp'),
      focusPageDown: call('focusPageDown'),
      focusNextMatch: call('focusNextMatch'),
      focusPreviousMatch: call('focusPreviousMatch'),
      focusIndex: call('focusIndex'),
      showMessage: call('showMessage'),
      hideMessage: call('hideMessage'),
    };
  }

  /** Presentation flags on every event detail the element emits itself (e.g. `ready`). */
  protected override eventContext(): object | undefined {
    return this.#picker?.presentationCtx();
  }
}

// Importing this module registers the element (back-compat contract). The full
// global-API publish + logger-bundle wiring happens in index.ts via
// registerComponent(); both defines are idempotent, so importing either works.
if (typeof customElements !== 'undefined' && !customElements.get('web-multiselect')) {
  customElements.define('web-multiselect', MultiSelectElement);
}
