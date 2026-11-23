/**
 * Type definitions for the MultiSelect component
 */

import type { Placement } from '@keenmate/web-components-core/positioning';
import type { PresentationContext, ComponentContext, RenderLoadingCallback, RenderIconCallback, ResponsiveMap, ResponsiveCallback } from '@keenmate/web-components-core';
import type { TranslateCallback } from '@keenmate/web-components-core/locale';
import type { ActionItem, ActionEventDetail } from '@keenmate/web-components-core/actions';
import type { LTreeNode } from './utils/ltree-node';
import type { OptionsFormat } from './option-formats';
import type {
    SearchBehavior,
    SearchMatch,
    SearchTermContext,
    PreparedSearchTerm,
    SearchEntry,
    SearchCallbackContext,
} from '@keenmate/web-components-core/search';

// Search vocabulary lives in core (`/search`, shared with other Keenmate components);
// re-exported so this package's public types are unchanged.
export type { SearchBehavior, SearchMatch, SearchTermContext, PreparedSearchTerm, SearchEntry, SearchCallbackContext };


/**
 * Position of the badges container relative to the input
 */
export type BadgesPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Value format for serialization (forms and callbacks)
 */
export type ValueFormat = 'text' | 'json' | 'array';

/**
 * Threshold behavior mode when badges exceed threshold
 */
export type BadgesThresholdMode = 'count' | 'partial';

/**
 * Display mode for selected items (badges area)
 */
export type BadgesDisplayMode = 'badges' | 'count' | 'compact' | 'partial' | 'none';

/**
 * Search behavior mode
 * - 'filter': Hide non-matching options (default)
 * - 'navigate': Keep all options visible, jump to matches
 */
export type SearchMode = 'filter' | 'navigate';

/**
 * What Tab (and Shift+Tab) does while the dropdown is open. Tab always closes the dropdown and
 * lets focus move on; this decides whether it selects something first.
 *
 * - `select-focused` — select the focused option, including the first match that is
 *   focused automatically while typing (type `cesky kru`, Tab). Default for single-select.
 * - `select-navigated` — select the focused option only if the user moved the focus
 *   (arrow keys, PageUp/PageDown, Home/End); an automatic highlight from typing is ignored.
 * - `close` — select nothing. Default for multi-select.
 *
 * Tab only ever adds: in multi-select an already-selected option stays selected.
 */
export type TabBehavior = 'select-focused' | 'select-navigated' | 'close';

/**
 * Visual variant of a transient message shown via `controller.showMessage()`. Each maps to a
 * `.ms__message--{variant}` theming hook.
 */
export type MessageVariant = 'info' | 'warning' | 'danger' | 'success';

/**
 * Options for `showMessage()` — the transient toast the component can surface on top of
 * itself. It exists mainly so a veto (or any consumer feedback) is visible in the
 * fullscreen overlay, where page-level UI is covered by the sheet.
 */
export interface MessageOptions {
    /** Visual variant. Default `'info'`. */
    variant?: MessageVariant;
    /** Auto-dismiss after this many ms. `0` keeps it until replaced, tapped, or the panel closes. Default `3000`. */
    autoHideMs?: number;
    /**
     * Where the message anchors relative to the control in the **floating/anchored** case
     * (a floating-ui `Placement`, e.g. `'top'`, `'bottom-start'`, `'right'`). Default
     * `'bottom'`. Ignored when a fullscreen overlay is open — there the message is pinned
     * to the bottom-centre of the viewport.
     */
    placement?: Placement;
}

/**
 * Every user-facing string of the component (rulebook D-NC-24), for internationalization. Keys are
 * flat `<elementType>.<name>` (`placeholders.search`, `messages.noResults`, `ariaLabels.close`,
 * `tooltips.removeItem`, …); a control with both an aria-label and a tooltip has one key of each.
 * Set a partial map via the `labels` property or the `labels` JSON attribute
 * (`labels='{"messages.noResults":"Nic"}'`) — short keys or full ones (`web-multiselect.messages.noResults`);
 * page-wide: `window.components.locale.labels['web-multiselect.<key>']`. Any unset (`undefined`) key falls back to its English default, while `''` means deliberately empty (renders nothing).
 * A dynamic text gets its text spot's context as `{ ctx }` (rulebook D-NC-24): a template reads `{ctx.<path>}`
 * (`{ctx.count}`, `{ctx.value}`), numbers locale-formatted; a `translateCallback` gets the same object as
 * `params.ctx` (numbers raw). Each key below names its context type and what `ctx.count` is — the number the
 * text's noun agrees with, for an i18n library's plural rules. English defaults put no plural noun after a
 * number (`Matches: {ctx.count}`), so one template fits every count.
 */
export interface MultiSelectLabels {
    /** Closed-input placeholder when search is disabled (`enable-search="false"`, picker mode). ctx: `PlaceholderContext` — `ctx.count` = the selection count. Default: `Pick an option…`. */
    'placeholders.select'?: string;
    /** Search input placeholder while the search-mode toggle is hidden. ctx: `PlaceholderContext` — `{ctx.selectedCount}`, `{ctx.totalCount}`, …; `ctx.count` = the selection count. Default: `Search…`. */
    'placeholders.search'?: string;
    /** Search placeholder in `filter` mode while the search-mode toggle is shown (`show-search-mode-toggle`). ctx: `PlaceholderContext` — `ctx.count` = the selection count. Default: `Filter…`. */
    'placeholders.filter'?: string;
    /** Search placeholder in `navigate` mode while the search-mode toggle is shown. ctx: `PlaceholderContext` — `ctx.count` = the selection count. Default: `Search…`. */
    'placeholders.navigate'?: string;
    /** Closed-input placeholder when there are no options at all (e.g. an unresolved cascade parent). ctx: `PlaceholderContext` — `ctx.count` = the selection count. Default: empty = off (the normal placeholder shows). */
    'placeholders.noData'?: string;
    /** Dropdown text when there are no options at all (nothing to search). HTML allowed. Default: `No data`. */
    'messages.noData'?: string;
    /** Dropdown text when options exist but the search matched nothing (also the fullscreen match counter's "none"). HTML allowed. Default: `No results found`. */
    'messages.noResults'?: string;
    /** Dropdown text while an async `searchCallback` search is in flight. HTML allowed. Default: `Searching…`. */
    'messages.searching'?: string;
    /** Screen-reader announcement (core `announce()`) when a pick brings the selection to the `maxSelectedCount` limit. ctx: `LimitContext` — `{ctx.max}`, `{ctx.selectedCount}`; `ctx.count` = `ctx.max`. Default: `Limit reached: {ctx.max}`. */
    'messages.limitReached'?: string;
    /** Text shown for an option that has no display value (no display member / tuple slot / callback result). Default: `[N/A]`. */
    'labels.noDisplayValue'?: string;
    /** Small hint under the search input while the dropdown is open. Default: empty = no hint. */
    'labels.searchHint'?: string;
    /** "Add new" prompt (`allow-add-new`). ctx: `AddContext` (`getAddNewTextCallback` wins) — `{ctx.value}` = the typed text (escaped); no `ctx.count`. Trusted HTML otherwise. Default: `Add "{ctx.value}"`. */
    'labels.addNew'?: string;
    /** Pending "add new" prompt while an async `beforeAddCallback` runs. ctx: `AddContext` — `{ctx.value}` = the typed text; no `ctx.count`. Default: `Adding "{ctx.value}"…`. */
    'messages.addNewPending'?: string;
    /** Badges-area count text. ctx: `CounterContext` (`getCounterCallback` wins) — `ctx.count` = `ctx.selectedCount` (the selection count). Default: `{ctx.count} selected`. */
    'labels.selectedCount'?: string;
    /** The "+X more" badge text. ctx: `CounterContext` (`getCounterCallback` wins) — `ctx.count` = `ctx.moreCount` (the hidden items); `{ctx.selectedCount}` = all selected. Default: `+{ctx.count} more`. */
    'labels.moreCount'?: string;
    /** Selected-items popover header. ctx: `SelectionCountContext` — `ctx.count` = `ctx.selectedCount`. Default: `Selected Items ({ctx.count})`. */
    'headers.selectedPopover'?: string;
    /** Fullscreen navigate-mode position. ctx: `MatchCountContext` — `{ctx.position}`, `{ctx.total}`; `ctx.count` = `ctx.total` (the matches). Default: `{ctx.position} of {ctx.total}`. */
    'labels.matchPosition'?: string;
    /** Fullscreen navigate-mode match count (no match focused). ctx: `MatchCountContext` — `ctx.count` = `ctx.total` (the matches; `ctx.position` is `null`). Default: `Matches: {ctx.count}`. */
    'labels.matchCount'?: string;
    /** Popover / fullscreen close button. Default: `Close`. */
    'ariaLabels.close'?: string;
    /** Inline ✕ clear button (`show-clear`) and the count-mode clear (×) button. Default: `Clear all selections`. */
    'ariaLabels.clearAllSelections'?: string;
    /** Fullscreen search clear (✕). Default: `Clear search`. */
    'ariaLabels.clearSearch'?: string;
    /** Option info affordance that reveals a clipped label. Default: `Show full label`. */
    'ariaLabels.showFullLabel'?: string;
    /** Badge remove (×) aria-label. ctx: `RemoveItemContext` — `{ctx.displayValue}` = the badge text; no `ctx.count`. Default: `Remove {ctx.displayValue}`. */
    'ariaLabels.removeItem'?: string;
    /** Badge remove (×) tooltip (`enable-badge-tooltips`). ctx: `RemoveItemContext` (`getRemoveButtonTooltipCallback` wins) — `{ctx.displayValue}`; no `ctx.count`. Default: `Remove {ctx.displayValue}`. */
    'tooltips.removeItem'?: string;
    /** "+N more" badge remove (×) aria-label. ctx: `CounterContext` (the "+X more" badge's) — `ctx.count` = `ctx.moreCount` (the hidden items). Default: `Remove hidden items: {ctx.count}`. */
    'ariaLabels.removeHiddenItems'?: string;
    /** "+N more" badge remove (×) tooltip (`enable-badge-tooltips`). ctx: `CounterContext` (the "+X more" badge's) — `ctx.count` = `ctx.moreCount` (the hidden items). Default: `Remove hidden items: {ctx.count}`. */
    'tooltips.removeHiddenItems'?: string;
    /** Group-header selected-count chip aria-label. ctx: `CountLabelContext` (the chip's, as `getCountLabelCallback` gets it) — `ctx.count` = `ctx.selectedCount`; `{ctx.groupName}`, `{ctx.totalCount}`. Default: `{ctx.count} selected`. */
    'ariaLabels.groupSelected'?: string;
    /** Counter tooltip overflow tail (beyond 12 items). ctx: `CounterTooltipContext` — `ctx.count` = `ctx.remainingCount` (the items not listed). Default: `…and {ctx.count} more`. */
    'tooltips.andMore'?: string;
    /** Fullscreen navigate-mode "previous match" button. Default: `Previous match`. */
    'ariaLabels.prevMatch'?: string;
    /** Fullscreen navigate-mode "next match" button. Default: `Next match`. */
    'ariaLabels.nextMatch'?: string;
    /** Fullscreen search-mode toggle (`show-search-mode-toggle`) aria-label while in navigate mode. Default: `Switch to filter mode`. */
    'ariaLabels.switchToFilterMode'?: string;
    /** Fullscreen search-mode toggle `title` while in navigate mode. Default: `Switch to filter mode`. */
    'tooltips.switchToFilterMode'?: string;
    /** Fullscreen search-mode toggle aria-label while in filter mode. Default: `Switch to navigate mode`. */
    'ariaLabels.switchToNavigateMode'?: string;
    /** Fullscreen search-mode toggle `title` while in filter mode. Default: `Switch to navigate mode`. */
    'tooltips.switchToNavigateMode'?: string;
    /** Text of the built-in `select-all` action button. Default: `Select all`. */
    'buttons.selectAll'?: string;
    /** Text of the built-in `clear-selection` action button. Default: `Clear all`. */
    'buttons.clearSelection'?: string;
    /** Validation message when `getValueFormatCallback` throws (the host turns invalid, the form won't submit). Default: `The value could not be formatted.`. */
    'errors.valueFormat'?: string;
    /** Validation message while `required` and nothing is selected (`validity.valueMissing`; the form won't submit). ctx: `MultiSelectContext` (no count). Default: `Select an item.`. */
    'errors.required'?: string;
    /** Validation message while fewer than `minSelectedCount` options are selected (at least one; `validity.rangeUnderflow`). ctx: `MinSelectedContext` — `{ctx.min}`, `{ctx.selectedCount}`, `{ctx.missing}`; `ctx.count` = `ctx.min`. Default: `Select at least {ctx.min}.`. */
    'errors.minSelected'?: string;
    /** Validation message while more than `maxSelectedCount` options are selected (only a programmatic value can get there; `validity.rangeOverflow`). ctx: `MaxSelectedContext` — `{ctx.max}`, `{ctx.selectedCount}`, `{ctx.excess}`; `ctx.count` = `ctx.max`. Default: `Select at most {ctx.max}.`. */
    'errors.maxSelected'?: string;
}

/**
 * Layout mode for action buttons container
 * - 'nowrap': Buttons stay in single row (default)
 * - 'wrap': Buttons wrap to multiple rows when needed
 */
export type ActionsLayout = 'nowrap' | 'wrap';
/** Where the action-buttons block sits in the dropdown panel. */
export type ActionsPosition = 'top' | 'bottom';
/** Horizontal arrangement of buttons within an action row. `stretch` = full-width (default). */
export type ActionsAlign = 'stretch' | 'left' | 'right' | 'center' | 'space-between';

/**
 * Base of every callback `ctx` and every event detail: the public {@link MultiSelectController}
 * (`controller`) and the host element (`element`) — both non-enumerable, so `JSON.stringify` /
 * logs / LiveView `pushEvent(…, e.detail)` see only the data — plus the shared
 * {@link PresentationContext} fields (`presentation`: `'floating' | 'fullscreen'` here,
 * `isFullscreen`, `isModal`), so any callback can render leaner in the phone overlay.
 */
export interface MultiSelectContext<T = any> extends ComponentContext<MultiSelectController<T>>, PresentationContext {}

/** `ctx` of the per-option callbacks (`getValueCallback`, `getIconCallback`, …): the option is `option`. */
export interface ItemContext<T = any> extends MultiSelectContext<T> {
    /** The option this call is about. */
    option: T;
}

/** `ctx` of `getIsSelectableCallback` — the option plus its built tree node. */
export interface TreeNodeContext<T = any> extends ItemContext<T> {
    /** The built tree node (`node.hasChildren`, `node.level`, `node.path`, …). */
    node: LTreeNode<T>;
}

/**
 * `ctx` of `renderOptionContentCallback` / `getOptionTooltipCallback` — one dropdown row.
 * Reactive: swapping presentation re-renders and re-invokes the callback with the new value.
 */
export interface OptionContentRenderContext<T = any> extends ItemContext<T> {
    /** Index of the option in the filtered list */
    optionIndex: number;
    /** Whether the option is currently selected */
    isSelected: boolean;
    /** Whether the option is currently focused (keyboard navigation) */
    isFocused: boolean;
    /** Whether the option matches the current search term (navigate mode only) */
    isMatched: boolean;
    /** Whether the option is disabled */
    isDisabled: boolean;

    // --- Tree fields (present only when rendering a tree-mode node) ---
    /** True when this row is a tree node (path-member / tree mode). Absent/false for flat options. */
    isTreeNode?: boolean;
    /** Tree only: the node has children (a branch). */
    isBranch?: boolean;
    /** Tree only: the node has no children (a leaf). */
    isLeaf?: boolean;
    /** Tree only: number of direct children (0 for a leaf). */
    childCount?: number;
    /** Tree only: 1-based depth level as derived from the path (top level = 1). */
    level?: number;
    /** Tree only: 0-based indentation depth (`level - 1`), the depth the row is indented by. */
    depth?: number;
    /** Tree only: the node's materialized path (e.g. "1.1.2"). */
    path?: string;
    /** Tree only: the node is selectable (branches marked non-selectable are `false`). */
    isSelectable?: boolean;
    /** Tree only: cascade tristate — a partially-checked branch (some but not all descendants). */
    isIndeterminate?: boolean;
}

/**
 * `ctx` of the badge callbacks (`renderBadgeContentCallback`, `renderBadgeCallback`,
 * `renderSelectedItemContentCallback`, `getBadgeDisplayCallback`, `getBadgeClassCallback`,
 * `getSelectedItemClassCallback`, `getBadgeTooltipCallback`, `getRemoveButtonTooltipCallback`).
 * Outside a badge render (selected-order sorting, the counter tooltip) `displayMode` is the
 * configured mode and `isInPopover` is `false`.
 */
export interface BadgeContentRenderContext<T = any> extends ItemContext<T> {
    /** Current badges display mode */
    displayMode: BadgesDisplayMode;
    /** Whether the badge is being rendered in the selected items popover */
    isInPopover: boolean;
}

/**
 * `ctx` of `getRemoveButtonTooltipCallback` and the label context of `ariaLabels.removeItem` /
 * `tooltips.removeItem`: the badge's {@link BadgeContentRenderContext} plus the text the badge shows.
 */
export interface RemoveItemContext<T = any> extends BadgeContentRenderContext<T> {
    /** The badge text (`getBadgeDisplayCallback` / the display value). */
    displayValue: string;
}

/** `ctx` of `renderSelectedContentCallback` (the single-select selected-value display). */
export type SelectedContentRenderContext<T = any> = ItemContext<T>;

/**
 * `ctx` of `renderGroupLabelContentCallback`, so a custom group header can reflect the
 * selection — e.g. render a "3 / 8" count next to the title. The selection fields are
 * meaningful mainly under `groupSelectMode: 'cascade'` (a flat multi-select grouped list).
 * Under the default rendering (no callback) the component draws the count itself; with a
 * callback, YOU own the content and can render the count however you like from these fields.
 */
export interface GroupLabelRenderContext<T = any> extends MultiSelectContext<T> {
    /** The group name. */
    groupName: string;
    /** The group's currently-visible (filtered) members, in render order. */
    members: T[];
    /** The subset of `members` that are currently selected (includes disabled-but-selected). */
    selectedMembers: T[];
    /** `selectedMembers.length` — the number to show "behind the group title". */
    selectedCount: number;
    /** `members.length` — total visible members in the group. */
    memberCount: number;
    /** Visible, non-disabled members — the cascade "select-all" denominator. */
    selectableCount: number;
    /** Tristate roll-up of the group under cascade selection. */
    checkState: 'checked' | 'indeterminate' | 'unchecked';
}

/**
 * A text about the selection size — the label context of `headers.selectedPopover` (the
 * selected-items popover header). Base of {@link CounterContext}.
 */
export interface SelectionCountContext<T = any> extends MultiSelectContext<T> {
    /** Number of selected items. */
    selectedCount: number;
    /** The number the text's noun agrees with (plural rules): `selectedCount`. */
    count: number;
}

/**
 * `ctx` of `getCounterCallback` — the badges-area "N selected" / "+X more" text — and the label context
 * of `labels.selectedCount`, `labels.moreCount` and the "+X more" badge's remove (×) labels
 * (`ariaLabels.removeHiddenItems` / `tooltips.removeHiddenItems`).
 */
export interface CounterContext<T = any> extends SelectionCountContext<T> {
    /** Partial / compact mode: the number of items behind the "+X more" badge. Absent for the plain count. */
    moreCount?: number;
    /** The number the text's noun agrees with: `moreCount` when set (the "+X more" items), else `selectedCount`. */
    count: number;
}

/** `ctx` of `getCountLabelCallback` — the small count chip (in-input counter, group headers). */
export interface CountLabelContext<T = any> extends MultiSelectContext<T> {
    /** Selected count. */
    selectedCount: number;
    /** In-input counter: the whole option list; group header: that group's member count. */
    totalCount: number;
    /** Set when the chip belongs to a group header. */
    groupName?: string;
    /** The number the text's noun agrees with: `selectedCount`. */
    count: number;
}

/** Label context of `tooltips.andMore` — the tail of the counter chip's tooltip list (capped at 12 items). */
export interface CounterTooltipContext<T = any> extends MultiSelectContext<T> {
    /** Items listed in the tooltip. */
    shownCount: number;
    /** All items behind the counter. */
    totalCount: number;
    /** Items not listed (`totalCount - shownCount`). */
    remainingCount: number;
    /** The number the text's noun agrees with: `remainingCount`. */
    count: number;
}

/** Label context of the fullscreen navigate-mode match counter (`labels.matchPosition` / `labels.matchCount`). */
export interface MatchCountContext<T = any> extends MultiSelectContext<T> {
    /** 1-based position of the focused match; `null` when no match is focused (`labels.matchCount`). */
    position: number | null;
    /** Number of matches. */
    total: number;
    /** The number the text's noun agrees with: `total` (the matches — "3 of 12" agrees with 12). */
    count: number;
}

/** The `placeholders.*` label key a {@link PlaceholderContext} is about. */
export type PlaceholderKey = 'placeholders.search' | 'placeholders.filter' | 'placeholders.navigate' | 'placeholders.select' | 'placeholders.noData';

/**
 * The label context of every `placeholders.*` key (`{ctx.selectedCount}`, …; a `translateCallback` gets it
 * as `params.ctx`): which placeholder is about to show and the state it describes. Recomputed on every
 * selection change (open or closed), search-mode switch, open / close and labels / locale change.
 */
export interface PlaceholderContext<T = any> extends MultiSelectContext<T> {
    /** The label key the component picked: search disabled → `placeholders.select`; the search-mode toggle
     *  shown → `placeholders.filter` / `.navigate` by mode; otherwise `placeholders.search`; no options at all
     *  and a non-empty `placeholders.noData` → `placeholders.noData`. */
    key: PlaceholderKey;
    /** The current search mode. */
    searchMode: SearchMode;
    /** Whether the dropdown is open. */
    isOpen: boolean;
    /** Number of selected items. */
    selectedCount: number;
    /** Number of options (the whole list). */
    totalCount: number;
    /** The pick limit (`maxSelectedCount`, multiple mode), or `null` when there is none. */
    maxSelectedCount: number | null;
    /** Picks left under the limit (`0` at / over it), or `null` when there is no limit. */
    remaining: number | null;
    /** The minimum (`minSelectedCount`, multiple mode), or `null` when there is none. */
    minSelectedCount: number | null;
    /** Picks still missing to reach the minimum (`0` once it is met), or `null` when there is no minimum.
     *  The placeholder stays visible once the minimum is met ("Select 0 more"), so prefer it in
     *  `errors.minSelected` (shown only while ≥ 1) or behind a `translateCallback` zero form. */
    missing: number | null;
    /** The number the text's noun agrees with: `missing` while the minimum isn't met, else `remaining` when a
     *  limit is set (`Select up to {ctx.remaining} more`), otherwise `selectedCount`. */
    count: number;
}

/**
 * The label context of `errors.minSelected` — the `minSelectedCount` constraint (`validity.rangeUnderflow`),
 * set while 1 … min−1 options are selected.
 */
export interface MinSelectedContext<T = any> extends MultiSelectContext<T> {
    /** The minimum (`minSelectedCount`). */
    min: number;
    /** Number of selected items. */
    selectedCount: number;
    /** Picks missing to reach the minimum (`min − selectedCount`). */
    missing: number;
    /** The number the text's noun agrees with: `min`. */
    count: number;
}

/**
 * The label context of `errors.maxSelected` — the `maxSelectedCount` constraint (`validity.rangeOverflow`),
 * set while more options are selected than the limit (only a programmatic value gets there).
 */
export interface MaxSelectedContext<T = any> extends MultiSelectContext<T> {
    /** The maximum (`maxSelectedCount`). */
    max: number;
    /** Number of selected items. */
    selectedCount: number;
    /** Selected items above the maximum (`selectedCount − max`). */
    excess: number;
    /** The number the text's noun agrees with: `max`. */
    count: number;
}

/**
 * The label context of `messages.limitReached` — announced (core `announce()`) when a pick brings the
 * selection to the `maxSelectedCount` limit.
 */
export interface LimitContext<T = any> extends MultiSelectContext<T> {
    /** The limit (`maxSelectedCount`). */
    max: number;
    /** Number of selected items (the limit or more — a programmatic value is not truncated). */
    selectedCount: number;
    /** The number the text's noun agrees with: `max`. */
    count: number;
}

/** `ctx` of `getValueFormatCallback` — serialize the selection for the hidden form input. */
export interface ValueFormatContext<T = any> extends MultiSelectContext<T> {
    selectedValues: (string | number)[];
    selectedOptions: T[];
}

/** `ctx` of `getAddNewTextCallback` and `beforeAddCallback` — the typed text. */
export interface AddContext<T = any> extends MultiSelectContext<T> {
    /** The typed text (trimmed). */
    value: string;
}

/** `ctx` of `beforeSearchCallback`. */
export interface BeforeSearchContext<T = any> extends MultiSelectContext<T> {
    /** The term as typed. */
    term: string;
}

/** `ctx` of `getSearchTermCallback` (`term`, `target`, `behavior`, `match` from core `/search`). */
export interface SearchTermCallbackContext<T = any> extends SearchTermContext, MultiSelectContext<T> {}

/**
 * `ctx` of `searchCallback` (`signal`, `entries` from core `/search`). `term` is the term to
 * search for: the typed text (after `beforeSearchCallback`), or — when `getSearchTermCallback`
 * is set — whatever it returned for `target: 'callback'` (a string, RegExp or object; type it via
 * `TTerm`). `entries[i].data` is the option.
 */
export interface MultiSelectSearchContext<T = any, TTerm = string> extends SearchCallbackContext<T, TTerm>, MultiSelectContext<T> {}

/** `ctx` of `selectedOrderCompareCallback` — compare two selected options (`Array.prototype.sort` contract). */
export interface SelectedOrderCompareContext<T = any> extends MultiSelectContext<T> {
    a: T;
    b: T;
}

/**
 * Which gesture is about to change the selection — `source` on {@link BeforeSelectContext}.
 * `option` = a dropdown row (click, Enter, Tab, `controller.toggleValue` …); `badge` = a badge /
 * popover remove (×) or the "+N more" remove; `group` = a group-header checkbox; `select-all` /
 * `clear-selection` = those built-in actions (and `controller.selectAll()` / `clearSelection()`); `clear` =
 * the inline ✕ or the count badge's ×.
 */
export type SelectionSource = 'option' | 'badge' | 'group' | 'select-all' | 'clear-selection' | 'clear';

/**
 * `ctx` of `beforeSelectCallback` / `beforeDeselectCallback`. Called once per option, also
 * for bulk gestures (Select-All, a group checkbox, Clear-All) — a vetoed option is skipped
 * and the rest still apply.
 */
export interface BeforeSelectContext<T = any> extends MultiSelectContext<T> {
    /** The option about to be selected / deselected. */
    option: T;
    /** The selection before the change. */
    selectedOptions: T[];
    selectedValues: (string | number)[];
    /** The gesture behind the change. */
    source: SelectionSource;
}
export type BeforeDeselectContext<T = any> = BeforeSelectContext<T>;

/**
 * The public facade — `el.controller`, and `controller` on every callback `ctx` and event
 * detail. Delegates to the live picker, so it survives rebuilds. Interactive methods
 * (`toggleValue`, `selectValue`, `selectAll`, …) behave like the matching gesture, vetoes
 * included; `setSelected` is the programmatic, veto-free path.
 */
export interface MultiSelectController<T = any> {
    // ── read current state ───────────────────────────────────────────────
    /** The selected option objects, in selection order (same as `el.selectedOptions`). */
    readonly selectedOptions: T[];
    /** The first selected option (the only one in single-select), or null (same as `el.selectedOption`). */
    readonly selectedOption: T | null;
    /** The selection as returned to forms/consumers — scalar or array per `multiple` (same as `el.selectedValue`). */
    readonly selectedValue: string | number | (string | number)[] | null;
    /** All available options (post assignment, pre-filter). */
    readonly options: ReadonlyArray<T>;
    /** The option whose value equals `value` (compared as strings — `1` finds `'1'`), or `null`. Also finds a selected option that is no longer in `options` (e.g. picked from async search results). */
    getOptionByValue(value: string | number): T | null;
    /** The current search box text (same as `el.searchTerm`). */
    readonly searchTerm: string;
    /** Whether the dropdown is open. */
    readonly isOpen: boolean;

    // ── mutate the selection ─────────────────────────────────────────────
    /** Replace the selection. Silent by default; pass `{ notify: true }` to emit ONE aggregate `change`. Bypasses the vetoes. */
    setSelected(values: (string | number)[], opts?: { notify?: boolean }): void;
    /** Select every selectable visible option (like the `select-all` action; vetoes apply per option). */
    selectAll(): void;
    /** Clear the whole selection (like the `clear-selection` action; vetoes apply per option). */
    clearSelection(): void;
    /** Toggle a single option by its value (select ⇄ deselect). */
    toggleValue(value: string | number): void;
    /** Select a specific option by its value (no-op if already selected). */
    selectValue(value: string | number): void;
    /** Deselect a specific option by its value (no-op if not selected). */
    deselectValue(value: string | number): void;
    /** Toggle the currently focused option (no-op if nothing is focused). */
    toggleFocused(): void;

    // ── drive the dropdown ───────────────────────────────────────────────
    open(): void;
    close(): void;
    toggle(): void;
    /** Set the search box text (runs the search, exactly as if typed). */
    search(term: string): void;
    /** Clear the search box and restore the full list (does not touch the selection). */
    clearSearch(): void;
    /** Scroll a specific option / group / index into view. Resolves `true` once scrolled, `false` when it isn't in the visible list. */
    scrollToValue(value: string | number): Promise<boolean>;
    scrollToGroup(group: string): Promise<boolean>;
    scrollToIndex(index: number): Promise<boolean>;
    /** Re-render from the current option set (after mutating options in place). */
    refresh(): void;

    // ── keyboard focus (open dropdown) ───────────────────────────────────
    /** Move focus to the next / previous option. */
    focusNext(): void;
    focusPrevious(): void;
    /** Move focus to the first / last option. */
    focusFirst(): void;
    focusLast(): void;
    /** Move focus by a page (10 rows). */
    focusPageUp(): void;
    focusPageDown(): void;
    /** Navigate-mode only: jump focus to the next / previous match. */
    focusNextMatch(): void;
    focusPreviousMatch(): void;
    /** Focus a specific index in the filtered list (ignored if out of range). */
    focusIndex(index: number): void;

    // ── feedback ─────────────────────────────────────────────────────────
    /** Surface a transient message ("toast"), visible even in the fullscreen overlay. */
    showMessage(content: string | HTMLElement, opts?: MessageOptions): void;
    /** Dismiss the transient message, if any. */
    hideMessage(): void;
    /** Whether a message is currently shown (same as `el.isMessageShown`). */
    readonly isMessageShown: boolean;
}

/**
 * `ctx` of `beforeKeydownCallback`, which runs before all built-in keyboard handling.
 * Return `false` to suppress the built-in handling of the key (you own `preventDefault`);
 * return nothing to fall through to the defaults. Must answer synchronously.
 */
export interface KeydownContext<T = any> extends MultiSelectContext<T> {
    /** The raw keyboard event — call `preventDefault()` yourself if you handle the key. */
    event: KeyboardEvent;
    /** `event.key`, for convenience. */
    key: string;
    /** Whether the dropdown is currently open. */
    isOpen: boolean;
    /** The current search term. */
    searchTerm: string;
    /** Index of the focused option in the filtered list (`-1` when nothing is focused). */
    focusedIndex: number;
    /** The focused option object, or `null`. */
    focusedOption: T | null;
    /** The options currently visible (after filtering). */
    filteredOptions: ReadonlyArray<T>;
    /** The currently selected values. */
    selectedValues: (string | number)[];
}

/**
 * What made the dropdown scroll an option into view on its own — `beforeScrollCallback`'s `source`:
 * - `'keyboard'` — a focus move (arrow keys, Page Up / Down, Home / End, the fullscreen ▲ / ▼, the
 *   controller `focus*()` methods);
 * - `'search'` — navigate mode jumped to the match of the typed term;
 * - `'open'` — the dropdown opened and centres the focused (selected) option;
 * - `'api'` — `scrollToIndex()` / `scrollToValue()` / `scrollToGroup()`.
 */
export type MultiSelectScrollSource = 'keyboard' | 'search' | 'open' | 'api';

/** The scroll the dropdown is about to do (`beforeScrollCallback`'s `options`; a returned partial is merged over it). */
export interface MultiSelectScrollOptions {
    /** Vertical alignment: `'nearest'` scrolls only as far as needed; `'start'` / `'center'` / `'end'` align. */
    block: ScrollLogicalPosition;
    /** `'auto'` (instant) or `'smooth'`. Virtual scroll always jumps instantly. */
    behavior: ScrollBehavior;
}

/**
 * `ctx` of `beforeScrollCallback` — the dropdown is about to scroll an option (or a group header)
 * into view on its own. Return `false` to skip the scroll, or a partial `options` to replace the
 * defaults. Must answer synchronously.
 */
export interface BeforeScrollContext<T = any> extends MultiSelectContext<T> {
    /** The option about to be revealed — `null` when it is a group header (`scrollToGroup()`). */
    option: T | null;
    /** Its index in the visible (filtered) list; for a group header, the group's first option. */
    index: number;
    /** The group name, for `scrollToGroup()`; otherwise `undefined`. */
    group?: string;
    /** Why the dropdown scrolls. */
    source: MultiSelectScrollSource;
    /** The list's scroll container (the virtual-scroll viewport in virtual mode) — `null` when the list doesn't scroll (it fits). */
    container: HTMLElement | null;
    /** What the dropdown is about to use (its defaults for this `source` and presentation). */
    options: MultiSelectScrollOptions;
}

/**
 * `ctx` of the action-item callbacks (`getTextCallback`, `getIsVisibleCallback`, …): a
 * snapshot of the selection. At activation (`onClick`, `beforeActionCallback`, `onAction` /
 * the `action` event) the core action fields are added — see {@link MultiSelectActionEventDetail}.
 */
export interface ActionContext<T = any> extends MultiSelectContext<T> {
    /** Currently selected scalar values. */
    selectedValues: (string | number)[];
    /** Currently selected option objects, in selection order. */
    selectedOptions: T[];
    /** All available options (post assignment). */
    options: ReadonlyArray<T>;
    /** `selectedOptions.length` — convenience. */
    selectedCount: number;
    /** `options.length` — convenience (the Select-All denominator). */
    optionCount: number;
    /** Whether the dropdown is currently open. */
    isOpen: boolean;
    /** The current search term. */
    searchTerm: string;
    /**
     * For a `data-action` trigger rendered inside an option row or a badge (`source`
     * `'option'` / `'badge'`): that option.
     */
    option?: T;
}

/** The built-in action names. */
export type MultiSelectAction = 'select-all' | 'clear-selection';

/**
 * One action button (core `ActionItem`): a built-in (`{ action: 'select-all' }`, or the string
 * shorthand `'select-all'`) or a custom item (`{ id: 'export', text: 'Export', onClick }`).
 * Every dynamic field is a static value plus a `get*Callback(ctx)` that wins when set.
 */
export interface MultiSelectActionItem<T = any> extends ActionItem<ActionContext<T>, MultiSelectAction> {
    /**
     * 1-based row this button belongs to (default `1`). Buttons sharing a `row` render on the same
     * horizontal line; different values stack into multiple rows. Row 1 sits at the panel's outer edge
     * and higher rows stack inward toward the options list — so with `actions-position="top"` row 1 is
     * the topmost line, and with `actions-position="bottom"` row 1 is the bottommost line.
     */
    row?: number;
}

/**
 * Detail of the `action` event, and the argument of `onAction`, an item's `onClick` and
 * `beforeActionCallback`: the {@link ActionContext} plus `action`, `id`, `item`, `source`
 * (`'action-buttons'` | `'option'` | `'badge'` | `'message'`), `sourceEvent`,
 * `triggerElement`, `dataset`.
 */
export type MultiSelectActionEventDetail<T = any> = ActionEventDetail<ActionContext<T>, MultiSelectAction>;

/**
 * Generic configuration options for the MultiSelect component
 * @template T The type of data items
 */
export interface MultiSelectConfig<T = any> {
    // ========================================================================
    // DATA AND OPTIONS
    // ========================================================================

    /** Options array - can be objects or [key, value] tuples */
    options?: T[];

    // ========================================================================
    // MEMBER/CALLBACK PROPERTIES (following svelte-treeview pattern)
    // ========================================================================

    /** Member property name for value/ID extraction. Default `'value'`; `getValueCallback` overrides it. Primitive options (strings/numbers) are their own value. */
    valueMember?: string;
    /** Callback to extract value/ID from an option (`ctx.option`) */
    getValueCallback?: (ctx: ItemContext<T>) => string | number;

    /** Member property name for display value extraction. Default `'label'`; `getDisplayValueCallback` overrides it. Primitive options display themselves. */
    displayValueMember?: string;
    /** Callback to extract the display value from an option (`ctx.option`) */
    getDisplayValueCallback?: (ctx: ItemContext<T>) => string;
    /**
     * Callback to customize badge display text (defaults to display value if not provided).
     * `ctx` is the {@link BadgeContentRenderContext} (`item`, `displayMode`, `isInPopover`,
     * presentation); outside a badge render (selected-order sorting, the counter tooltip)
     * `displayMode` is the configured mode and `isInPopover` is `false`.
     */
    getBadgeDisplayCallback?: (ctx: BadgeContentRenderContext<T>) => string;

    /**
     * Order of the CURRENTLY-SELECTED items *where they are displayed* — badges, partial mode
     * (i.e. which items sit behind the "+N more" badge), and the selected-items popover. This is a
     * display concern only: `selectedValue`, the form output, and `selectedOptions` always keep
     * as-selected (insertion) order regardless of this setting, and the options dropdown is never
     * reordered.
     * - `as-selected` (default) — the order items were picked.
     * - `label-asc` / `label-desc` — by the badge label, A→Z / Z→A (the `locale`'s collation, numeric-aware).
     * - `member` — by the `selectedOrderMember` property (or `getSelectedOrderCallback`); numeric
     *   keys sort numerically, everything else with a locale string compare.
     * - `custom` — delegate to `selectedOrderCompareCallback`.
     */
    selectedOrder?: 'as-selected' | 'label-asc' | 'label-desc' | 'member' | 'custom';
    /** Property name used as the sort key when `selectedOrder === 'member'` (selected-items display only). */
    selectedOrderMember?: string;
    /** Extract the sort key when `selectedOrder === 'member'` (overrides `selectedOrderMember`). */
    getSelectedOrderCallback?: (ctx: ItemContext<T>) => string | number;
    /**
     * Comparator used when `selectedOrder === 'custom'`: `({ a, b }) => number` with the
     * standard `Array.prototype.sort` result contract (negative: `a` first).
     */
    selectedOrderCompareCallback?: (ctx: SelectedOrderCompareContext<T>) => number;

    /**
     * Member property name for a "full title" — a fully-qualified label that ships with the
     * data (e.g. a breadcrumb like "Fruit / Pome fruit / Apple"). It is never computed by the
     * component. When `isBadgeFullTitleShown` is on, badges display this instead of the display
     * value (falling back to the display value when an option has none).
     */
    fullTitleMember?: string;
    /** Callback to extract the full title from an option (takes precedence over `fullTitleMember`). */
    getFullTitleCallback?: (ctx: ItemContext<T>) => string;
    /**
     * Callback to add custom CSS classes to badges - return string or array of class names.
     * `ctx` is the badge's {@link BadgeContentRenderContext} (the same one
     * {@link renderBadgeContentCallback} gets), so classes can react to `displayMode` /
     * `isInPopover` / presentation.
     */
    getBadgeClassCallback?: (ctx: BadgeContentRenderContext<T>) => string | string[];
    /** Callback to inject custom CSS into Shadow DOM - return CSS string for styling custom classes */
    getCustomStylesCallback?: (ctx: MultiSelectContext<T>) => string | null;
    /**
     * Static CSS string injected into the Shadow DOM (attribute alternative to
     * `getCustomStylesCallback`, via the `custom-styles` attribute). The value is a
     * raw stylesheet — selectors and all — dropped verbatim into the same
     * replaceable style slot. `getCustomStylesCallback` wins when both are set.
     */
    customStyles?: string;

    /** Member property name for search value extraction */
    searchValueMember?: string;
    /**
     * Callback to extract the search value from an item. Internal search needs a **string**;
     * an object (e.g. `{ title, zip }`) is for your own `searchCallback`, which receives it via
     * `ctx.entries` — internal search then falls back to the display value. Called once
     * per item; the result is cached until the options change.
     */
    getSearchValueCallback?: (ctx: ItemContext<T>) => string | object;

    /** Member property name for icon extraction. Default `'icon'`; `getIconCallback` overrides it. */
    iconMember?: string;
    /** Callback to extract the icon from an option (`ctx.option`) */
    getIconCallback?: (ctx: ItemContext<T>) => string;
    /**
     * Reserve a fixed-width icon gutter on every option row, even rows that have no
     * icon. Off by default (icon-less rows pull their label into the gutter). Turn it
     * on when a list mixes icon and icon-less rows and you want all labels to share one
     * start column — most visible in tree mode, where depth indent already shifts rows
     * (internal: shouldReserveIconSlot).
     */
    shouldReserveIconSlot?: boolean;

    /** Member property name for subtitle extraction. Default `'subtitle'`; `getSubtitleCallback` overrides it. */
    subtitleMember?: string;
    /** Callback to extract the subtitle from an option (`ctx.option`) */
    getSubtitleCallback?: (ctx: ItemContext<T>) => string;

    // ========================================================================
    // TREE OF OPTIONS (hierarchical, always fully expanded)
    // ========================================================================

    /**
     * Enable tree mode: options are rendered as a hierarchy, indented by depth.
     * Auto-enabled when a path source (`pathMember`/`getPathCallback`) is set;
     * pass `false` to force it off. The tree is always fully expanded — there is
     * no collapse (use @keenmate/web-treeview if you need expand/collapse).
     */
    isTreeEnabled?: boolean;
    /** Member property name holding each option's materialized dot-path (e.g. "1.2.3"). */
    pathMember?: string;
    /** Callback returning an option's materialized dot-path (takes precedence over pathMember). */
    getPathCallback?: (ctx: ItemContext<T>) => string;
    /** Member holding an option's parent path (otherwise derived from its path). */
    parentPathMember?: string;
    /** Member holding an option's depth/level (otherwise derived from its path). */
    levelMember?: string;
    /** Member holding a precomputed hasChildren flag (otherwise derived from the tree). */
    hasChildrenMember?: string;
    /** Callback returning an option's parent path (takes precedence over parentPathMember). */
    getParentPathCallback?: (ctx: ItemContext<T>) => string;
    /** Callback returning an option's depth/level (takes precedence over levelMember). */
    getLevelCallback?: (ctx: ItemContext<T>) => number;
    /** Callback returning an option's precomputed hasChildren flag (takes precedence over hasChildrenMember). */
    getHasChildrenCallback?: (ctx: ItemContext<T>) => boolean;
    /** Path separator for tree paths. Default: "." */
    treePathSeparator?: string;
    /**
     * Member holding a per-option `isSelectable` flag for tree mode. A node with a
     * falsy value renders normally (NOT greyed like `disabled`) but has no checkbox,
     * is skipped by keyboard focus, and cannot be toggled or picked by Select-All.
     * Options default to selectable. Tree mode only.
     */
    isSelectableMember?: string;
    /**
     * Callback deciding whether a tree node is selectable (takes precedence over
     * `isSelectableMember`). `ctx.node` is the built tree node, so `node.hasChildren` /
     * `node.level` are available — e.g. `({ node }) => !node.hasChildren` for a
     * leaves-only tree. Tree mode only.
     */
    getIsSelectableCallback?: (ctx: TreeNodeContext<T>) => boolean;

    /**
     * Tree checkbox interaction. `cascade` (default) checks a node's whole subtree
     * and shows a tristate (checked / indeterminate / unchecked) box on branches —
     * what most tree-select UIs do. `independent` toggles only the clicked node.
     * Tree + multiple only (no subtree to cascade otherwise). Unset → cascade.
     */
    checkboxMode?: 'independent' | 'cascade';
    /**
     * In `cascade` mode, which values a selection emits (badges / form / change).
     *
     *   - `rolled-up` (default) — minimal cover: a fully-selected subtree collapses
     *     to its root ("complete node"); partially-selected branches emit their
     *     individually-checked descendants. Rolls to the nearest selectable
     *     descendant when the complete node itself is non-selectable.
     *   - `leaves` — only the checked leaf-level nodes.
     *   - `all` — every fully-checked node (branches and leaves), like web-treeview.
     */
    cascadeSelectPolicy?: 'rolled-up' | 'leaves' | 'all';

    /** Member property name for group extraction. Default `'group'`; `getGroupCallback` overrides it. */
    groupMember?: string;
    /** Callback to extract the group from an option (`ctx.option`) */
    getGroupCallback?: (ctx: ItemContext<T>) => string;
    /**
     * Callback to customize group label content (can return HTML). `ctx` is a
     * {@link GroupLabelRenderContext}: `groupName` plus the group's members and selection
     * (e.g. `selectedCount`), so a custom header can show a per-group count.
     */
    renderGroupLabelContentCallback?: (ctx: GroupLabelRenderContext<T>) => string | HTMLElement | null | undefined | false;
    /**
     * Group-header selection in a flat (non-tree) grouped, multi-select list.
     * - `none` (default) — group headers are inert labels.
     * - `cascade` — each header shows a **tristate** checkbox that checks/unchecks
     *   all of that group's currently-visible members. The group itself is never a
     *   selected value (`selectedValue`/badges/form carry member values only); a
     *   partially-selected group reads indeterminate. Flat + multiple only — no
     *   effect in tree mode (use `checkboxMode`) or single-select.
     */
    groupSelectMode?: 'none' | 'cascade';

    /** Member property name for disabled state extraction. Default `'disabled'`; `getIsDisabledCallback` overrides it. */
    isDisabledMember?: string;
    /** Callback deciding whether an option (`ctx.option`) is disabled (overrides `isDisabledMember`) */
    getIsDisabledCallback?: (ctx: ItemContext<T>) => boolean;

    // ========================================================================
    // CUSTOM RENDERING CALLBACKS
    // Every render*ContentCallback / renderBadgeCallback result is read by core `renderSlotHtml`:
    // a string is HTML, `null` / `undefined` = the built-in content, `false` = empty (no badge for
    // renderBadgeCallback); an element is serialized — markup only, its listeners don't survive.
    // ========================================================================

    /**
     * Custom renderer for dropdown option content - return HTML string or HTMLElement. A
     * `[data-action]` element inside fires the `action` event (`source: 'option'`, `option`)
     * instead of toggling the row.
     */
    renderOptionContentCallback?: (ctx: OptionContentRenderContext<T>) => string | HTMLElement | null | undefined | false;
    /**
     * Draw a loading state yourself (SPEC §12.14 shared loader). Called with
     * `{ component, context, containerElement, element, label }` — `context` is `'search'`
     * (async `searchCallback` in flight, label `labels['messages.searching']`) or `'add-new'` (async
     * `beforeAddCallback` in flight, label `labels['messages.addNewPending']`). Fill `containerElement`
     * (it already carries `role="status"` + `aria-label`); optionally return a cleanup.
     * Beats the page-wide `window.components.renderLoadingCallback`; unset → the default
     * `.ms__loader` drawn from the `--ms-loader-*` tokens.
     */
    renderLoadingCallback?: RenderLoadingCallback | null;
    /**
     * This element's icon hook (core `renderIcon`, SPEC §12.33). Asked for an option / action-button
     * icon string that is not markup and not a built-in name (built-ins are reserved, no hook sees
     * them), BEFORE the page-wide `window.components.renderIconCallback`. Return markup (`''` = no
     * icon), or `null` / `undefined` = not mine (the page hook, then the icon-font / text rule).
     * `ctx` carries `{ component, element, prefix: 'ms' }` + `option` (an option icon) or `item`
     * (an action button).
     */
    renderIconCallback?: RenderIconCallback | null;
    /**
     * This element's own label translator (core `/locale`). Asked for every label key this instance's
     * `labels` did not set, BEFORE the page-wide `window.components.locale.translateCallback`. Gets
     * `{ component, key, template, params, locale }` (`key` = the full `web-multiselect.<elementType>.<name>`,
     * `params` raw); return the string, or `null` / `undefined` = not mine (the page-wide callback,
     * then the page dictionary / English default). A change rebuilds the picker (selection kept).
     */
    translateCallback?: TranslateCallback | null;
    /** Custom renderer for badge content (main badges area) - return HTML string or HTMLElement */
    renderBadgeContentCallback?: (ctx: BadgeContentRenderContext<T>) => string | HTMLElement | null | undefined | false;
    /**
     * Custom renderer for the WHOLE badge (main badges area) — return HTML string or HTMLElement
     * for the entire pill/card, not just its content. Unlike renderBadgeContentCallback (which fills
     * the built-in pill), this replaces the badge markup entirely. The component wraps your output in
     * a `.ms__badge.ms__badge--custom` element carrying `data-value`, and delegates removal to any
     * element inside it with `data-ms-action="remove"` (or the built-in `.ms__badge-remove` class) — so
     * put a remove control in your markup and the component handles the deselect. A `[data-action]`
     * element inside fires the `action` event (`source: 'badge'`, `option`). Falls back to the
     * default pill for a given item if the callback returns null/empty. Main badges area only (the
     * selected-items popover keeps using renderSelectedItemContentCallback).
     */
    renderBadgeCallback?: (ctx: BadgeContentRenderContext<T>) => string | HTMLElement | null | undefined | false;
    /**
     * Custom renderer for selected item content in the selected-items popover — return HTML string
     * or HTMLElement. `ctx` is a {@link BadgeContentRenderContext} (a popover item is rendered
     * through the same badge path): `isInPopover` is `true`.
     */
    renderSelectedItemContentCallback?: (ctx: BadgeContentRenderContext<T>) => string | HTMLElement | null | undefined | false;
    /**
     * Callback to add custom CSS classes to selected items in popover - return string or array of
     * class names. `ctx` is the popover item's {@link BadgeContentRenderContext} (`isInPopover`
     * is `true`) — the same one {@link renderSelectedItemContentCallback} gets.
     */
    getSelectedItemClassCallback?: (ctx: BadgeContentRenderContext<T>) => string | string[];
    /**
     * Custom renderer for the selected item display in single-select mode — return plain text (it
     * becomes the input value). `ctx.option` is the selected option.
     */
    renderSelectedContentCallback?: (ctx: SelectedContentRenderContext<T>) => string;

    // ========================================================================
    // FORM INTEGRATION & VALUE FORMATTING
    // ========================================================================

    /** HTML form field ID/name for hidden input */
    name?: string;
    /**
     * Format for value serialization (hidden form inputs and callbacks). Default: `json`.
     *
     * - `text` — one field, the values joined by `valueSeparator` (default `,`), e.g. `a,b`
     * - `json` — a JSON array string, e.g. `["a","b"]`
     * - `array` — one hidden input per value (`name[]` entries)
     */
    valueFormat?: ValueFormat;
    /** Joins the values in the `text` value format (and splits a `text` `value`). Default `,`. */
    valueSeparator?: string;
    /** Custom callback to format the submitted value (`ctx.selectedValues`, `ctx.selectedOptions`) */
    getValueFormatCallback?: (ctx: ValueFormatContext<T>) => string;
    /** Twin of the `value-format-error` event: `getValueFormatCallback` threw (engine use; on the element, assign `el.onValueFormatError`). */
    onValueFormatError?: ((detail: ValueFormatErrorEventDetail<T>) => void) | null;
    /**
     * @internal Element bridge: called after every hidden-input write with the format failure
     * (`null` = formatted fine; boxed so a thrown `null` still counts) and the `valueFormatError`
     * label; the element maps it onto its form validity (core `setFormatError`) and, the write being a
     * value change, re-evaluates `required` and the count rules (core `refreshRequired`).
     */
    onFormatValidity?: ((failure: { error: unknown } | null, message?: string) => void) | null;

    // ========================================================================
    // BOOLEAN OPTIONS (internal names with 'is' prefix)
    // ========================================================================

    /** Allow multiple selections (internal: isMultiple) */
    isMultiple?: boolean;
    /**
     * Disabled control (`disabled` attribute): no interaction, not focusable, not submitted with
     * the form. A disabled ancestor `<fieldset>` disables it too. Default `false`.
     */
    isDisabled?: boolean;
    /**
     * Read-only control (`readonly` attribute): the selection can't be changed by the user and the
     * dropdown doesn't open, but the control stays focusable and its value IS submitted.
     * Programmatic `setSelected()` still works. Default `false`.
     */
    isReadonly?: boolean;
    /** Enable search/filtering (internal: isSearchEnabled) */
    isSearchEnabled?: boolean;
    /** Allow grouping of options (internal: isGroupsAllowed) */
    isGroupsAllowed?: boolean;
    /**
     * Action buttons (core `ActionItem`s): built-ins as strings or items
     * (`['select-all', 'clear-selection']`, `{ action: 'select-all', text: 'All' }`) and custom items
     * (`{ id: 'export', text: 'Export', onClick: (d) => … }`). None when unset.
     */
    actionButtons?: (MultiSelectAction | MultiSelectActionItem<T>)[];
    /**
     * Runs before any action item (button or `data-action` trigger) is activated: return
     * `false` to cancel its `onClick`, the `action` event and the built-in behaviour. May be async
     * (the item is busy meanwhile).
     */
    beforeActionCallback?: ((detail: MultiSelectActionEventDetail<T>) => void | false | Promise<void | false>) | null;
    /** Twin of the `action` event (engine use; on the element, assign `el.onAction`). */
    onAction?: ((detail: MultiSelectActionEventDetail<T>) => void) | null;
    /** Show checkboxes next to options (internal: isCheckboxesShown) */
    isCheckboxesShown?: boolean;
    /** Keep Select All/Clear All buttons fixed at top while scrolling (internal: isActionsSticky) */
    isActionsSticky?: boolean;
    /** Close dropdown after selecting an option (internal: shouldCloseOnSelect) */
    shouldCloseOnSelect?: boolean;
    /**
     * Close the floating dropdown when the page (or a scroll container around the control) scrolls,
     * like a native select on desktop. Default true (internal: shouldCloseOnScroll)
     */
    shouldCloseOnScroll?: boolean;
    /**
     * When the option set is replaced (assigning `options` / `data-options`), drop any selected
     * value whose option is no longer present. Default `false` — selections are KEPT even if
     * their option leaves the list, which is the safe default for search/paged lists where an
     * item can drop out of the current page yet remain a valid pick. Turn on when the list
     * replacement means the domain itself changed (e.g. an item was deleted server-side) and a
     * value with no matching option should stop being reported by `selectedValue` (internal:
     * shouldPruneMissingSelection).
     */
    shouldPruneMissingSelection?: boolean;
    /**
     * In the phone fullscreen overlay, auto-focus the search field when it opens — which
     * pops the soft keyboard immediately. Default `false`: the sheet opens showing the list
     * (keyboard closed), and the keyboard appears only when the user taps the search. Set
     * `true` to type-to-filter right away (matches native pickers). No effect in the floating
     * presentation. (internal: shouldFullscreenAutofocus) */
    shouldFullscreenAutofocus?: boolean;
    /** Lock dropdown placement after first open (internal: shouldLockPlacement) */
    shouldLockPlacement?: boolean;
    /**
     * Allow adding new options not in the list (internal: isAddNewAllowed).
     * When on and a search yields no matches, the empty dropdown shows a clickable
     * "add new" prompt (text from `labels['labels.addNew']` / `getAddNewTextCallback`) instead of
     * the `labels['messages.noResults']` text; choosing it (click or Enter) runs `beforeAddCallback` and fires
     * the `add` event.
     */
    isAddNewAllowed?: boolean;
    /**
     * Dynamically compute the "add new" prompt label from the typed text (`ctx.value`). Takes
     * precedence over `labels['labels.addNew']`. Returns plain text (inserted as text, not HTML). Use it for
     * i18n or context-aware wording, e.g. `({ value }) => \`Add new member: ${value}\``.
     */
    getAddNewTextCallback?: ((ctx: AddContext<T>) => string) | null;
    /** Show count badge next to toggle icon (internal: isCounterShown) */
    isCounterShown?: boolean;
    /**
     * Show an inline clear (✕) button inside the input that wipes the whole selection.
     * Appears only while something is selected (and the control is enabled). Clicking it
     * clears the selection and any search text, fires `change`, and refocuses the input.
     * Default `false`. (internal: isClearShown)
     */
    isClearShown?: boolean;
    /**
     * Scope the "one overlay open at a time" coordination to a named group. Overlays
     * (multiselects, datepickers, external popovers) sharing a group dismiss each other
     * when one opens; different groups are independent. Unset = the default (ungrouped)
     * group, in which every ungrouped overlay coordinates. (internal: overlayGroup)
     */
    overlayGroup?: string;
    /**
     * Allow the selected-items popover to open. Defaults to `true`. The popover is triggered by
     * the count / compact / "+X more" badge and by the in-input counter (`isCounterShown`). Set
     * to `false` when you render your own selection UI (e.g. an external container fed by the
     * `change` event) — the badge and counter still show the count, but clicking them does nothing
     * and they lose the pointer cursor. (internal: isSelectedPopoverEnabled)
     */
    isSelectedPopoverEnabled?: boolean;
    /**
     * Make badges display each option's `fullTitleMember` / `getFullTitleCallback` value
     * instead of its display value. Falls back to the display value for options without a
     * full title. An explicit `getBadgeDisplayCallback` still takes precedence. Off by default.
     */
    isBadgeFullTitleShown?: boolean;
    /** Keep initial options visible when searchCallback is active and search term is empty/short (internal: shouldKeepOptionsOnSearch) */
    shouldKeepOptionsOnSearch?: boolean;
    /**
     * Keep search text and filtered results when the dropdown closes. Unset (`null`) = keep in
     * multi-select (reopen and keep picking from the same results), clear in single-select
     * (the term is finished once a value is picked or focus leaves the field).
     */
    shouldKeepSearchOnClose?: boolean | null;
    /** Enable virtual scrolling for large datasets (internal: isVirtualScrollEnabled) */
    isVirtualScrollEnabled?: boolean;

    // ========================================================================
    // STRING OPTIONS
    // ========================================================================

    /**
     * Vertical alignment of checkboxes relative to option content. Default: `center`.
     *
     * - `top` — align to the top of the row
     * - `center` — vertically centered
     * - `bottom` — align to the bottom of the row
     */
    checkboxAlign?: 'top' | 'center' | 'bottom';

    /** Minimum width for the dropdown (e.g., '20rem', '300px') */
    dropdownMinWidth?: string | null;
    /** Maximum width for the dropdown (e.g., '40rem', '500px') */
    dropdownMaxWidth?: string | null;
    /**
     * Display mode for selected items in the badges area. Default: `badges`.
     *
     * - `badges` — one removable badge per selected option
     * - `count` — a single "N selected" count badge
     * - `compact` — condensed badges (first few, tighter spacing)
     * - `partial` — a limited number of badges plus a "+X more" badge
     * - `none` — hide the badges area entirely
     */
    badgesDisplayMode?: BadgesDisplayMode;
    /**
     * Position of the badges container relative to the input. Default: `bottom`.
     *
     * - `top` — above the input
     * - `bottom` — below the input
     * - `left` — to the left of the input
     * - `right` — to the right of the input
     */
    badgesPosition?: BadgesPosition;
    /**
     * How the display switches once `badgesThreshold` is exceeded. Default: `count`.
     *
     * - `count` — collapse all selections into a single count badge
     * - `partial` — keep up to `maxVisibleBadgeCount` badges and add a "+X more" badge
     */
    badgesThresholdMode?: BadgesThresholdMode;
    /** Maximum height for dropdown */
    maxHeight?: string;
    /** ARIA labels / short UI strings for i18n (see {@link MultiSelectLabels}). Partial; unset
     *  keys fall back to their English defaults. */
    labels?: MultiSelectLabels;
    /** BCP-47 locale for the numbers in labels and the group count chip (`cs-CZ` → `1 234`) and for text
     *  sorting (`selectedOrder` labels, tree siblings: `cs-CZ` sorts "ch" after "h").
     *  Unset = the page-wide `window.components.locale`, else the browser language. */
    locale?: string | null;
    /**
     * Search behavior mode. Default: `filter`.
     *
     * - `filter` — hide options that don't match
     * - `navigate` — keep all options visible and jump focus to matches
     */
    searchMode?: SearchMode;
    /**
     * How internal search normalizes text. Default `normalized`.
     *
     * - `normalized` — ignores case and diacritics (`ces` matches `Český`)
     * - `case-insensitive` — ignores case only (the pre-2.6 behavior)
     * - `exact` — case- and diacritic-sensitive
     *
     * Every mode compares Unicode-normalized (NFC) text and the match highlight follows the
     * same rules. Internal search only — no effect on `searchCallback`, nor on `regex` matching.
     */
    searchBehavior?: SearchBehavior;
    /**
     * Where internal search looks for the term. Default `contains`. See `SearchMatch`.
     * `regex` tests the raw search value, ignoring `searchBehavior`; an invalid pattern keeps
     * the last valid result. Internal search only.
     */
    searchMatch?: SearchMatch;
    /**
     * What Tab does while the dropdown is open. Unset (`null`) = `select-focused` in
     * single-select, `close` in multi-select. See `TabBehavior`.
     */
    tabBehavior?: TabBehavior | null;
    /**
     * Show a clickable mode toggle in the phone fullscreen overlay's search header that
     * flips `searchMode` between `filter` and `navigate` live (no reopen). Default `false`.
     *
     * The overlay has room for the affordance and touch users can't reach the desktop
     * `Ctrl`+`Arrow` match-stepping, so this exposes both modes on the device where it
     * matters most. The toggle sits at the leading edge of the search field; its icon
     * reflects the current mode (magnifier = navigate, funnel = filter). No effect in the
     * floating presentation or when search is disabled/hidden.
     */
    isSearchModeToggleShown?: boolean;
    /**
     * Layout mode for the action buttons. Default: `nowrap`.
     *
     * - `nowrap` — buttons stay on a single row
     * - `wrap` — buttons wrap onto multiple rows
     */
    actionsLayout?: ActionsLayout;
    /**
     * Where the action-buttons block sits in the dropdown. Default: `top`.
     *
     * - `top` — above the options list
     * - `bottom` — sticky footer below the options list
     */
    actionsPosition?: ActionsPosition;
    /**
     * Horizontal arrangement of buttons within a row. Default: `stretch`.
     *
     * - `stretch` — full-width, evenly divided
     * - `left` — packed to the start
     * - `right` — packed to the end
     * - `center` — centered
     * - `space-between` — spread to the edges with gaps between
     */
    actionsAlign?: ActionsAlign;

    // ========================================================================
    // NUMBER OPTIONS
    // ========================================================================

    /** Auto-switch from badges to count when threshold is exceeded */
    badgesThreshold?: number | null;
    /** Maximum number of badges to show in partial mode (used with thresholdMode='partial') */
    maxVisibleBadgeCount?: number | null;
    /**
     * Multiple mode: the most options the USER may pick (a positive integer; `null` / unset = no limit;
     * single mode ignores it). At the limit the unselected options are not selectable — click, Enter /
     * Space, a group checkbox, "add new", `controller.selectValue()` / `toggleValue()` — they render
     * `aria-disabled="true"` + `ms__option--limit`; deselecting frees a slot. Select All (and a group
     * checkbox) picks only up to the limit, in display order. Reaching the limit is announced once
     * (`labels['messages.limitReached']`). A programmatic value (`el.value`, `setSelected()`)
     * is NOT truncated — that is the app's call; lowering the limit below the current selection keeps the
     * selection and only blocks adding; while the selection is above the limit the host is invalid
     * (`validity.rangeOverflow`, `labels['errors.maxSelected']`). Placeholders read the
     * remaining picks as `{ctx.remaining}` (`PlaceholderContext`). Attribute `max-selected-count`.
     */
    maxSelectedCount?: number | null;
    /**
     * Multiple mode: the fewest options a submitted selection may hold (a positive integer; `null` / unset =
     * no minimum; single mode ignores it). A form constraint, not a pick block: while 1 … min−1 options are
     * selected the host is invalid (`validity.rangeUnderflow`, `labels['errors.minSelected']`) and the form
     * won't submit. An EMPTY selection is not checked (like a native min rule on an empty field) — add
     * `required` for that (`valueMissing`). The picks still missing are `{ctx.missing}` in
     * `errors.minSelected` (`MinSelectedContext`) and in the placeholder (`PlaceholderContext`, `0` once met). Attribute `min-selected-count`.
     */
    minSelectedCount?: number | null;
    /** Minimum search length before loading data */
    minSearchLength?: number;
    /**
     * Debounce delay in milliseconds before the async `searchCallback` is invoked.
     * Each keystroke resets the timer, so only the last input in a burst fires a request.
     * Applies to the async `searchCallback` path only — local in-memory filtering stays instant.
     * Default: 0 (no debounce — callback runs on every keystroke).
     */
    searchDebounce?: number;
    /** Minimum items before virtual scroll activates (default: 100) */
    virtualScrollThreshold?: number;
    /** Fixed height for each option in pixels (required for virtual scroll, default: 50) */
    virtualScrollItemHeight?: number;
    /** Row height (px) of the selected-items popover in virtual-scroll mode. Unset (default): `--ms-badge-height`, matching every other badge. */
    badgeHeight?: number;
    /** Buffer size for virtual scroll - items above/below viewport (default: 10) */
    virtualScrollOverscan?: number;

    // ========================================================================
    // CALLBACK FUNCTIONS
    // ========================================================================

    /**
     * Runs before any search (internal or `searchCallback`) with `ctx.term`. Return a rewritten
     * term (string) to search for that instead, `false` to skip the search (the full list shows),
     * or nothing to continue.
     */
    beforeSearchCallback?: ((ctx: BeforeSearchContext<T>) => string | false | void) | null;
    /**
     * Prepare the term for matching (runs after `beforeSearchCallback`). Replaces the default
     * preparation (trim + `normalizeSearchText` per `searchBehavior`, or compiling a pattern
     * for `searchMatch: 'regex'`).
     *
     * - `ctx.target === 'internal'`: return a **string** (used as-is — normalize it to
     *   match the prepared option values, e.g. with `normalizeSearchText`) or a **RegExp**
     *   (tested against the raw search value, whatever `searchMatch` is). E.g. turn `ha-324/56`
     *   into `/ha\W*324\W*56/i`.
     * - `ctx.target === 'callback'`: return anything — it reaches `searchCallback` as
     *   `ctx.term`, objects included.
     *
     * `ctx.term` is the term to prepare. `null` / `undefined` / `''` means no search.
     */
    getSearchTermCallback?: ((ctx: SearchTermCallbackContext<T>) => PreparedSearchTerm) | null;
    /**
     * Runs before an option is selected by a user gesture (`ctx.source`: a row, a group checkbox,
     * Select-All, …) — once per option, also for bulk gestures. Return `false` to block it (a
     * vetoed option fires no event; the rest of a bulk change still applies); return nothing to
     * allow. Explain a veto with `ctx.controller.showMessage(…)` — the touch-safe way, visible
     * in the fullscreen overlay. May be async. Bypassed by programmatic `setSelected`.
     */
    beforeSelectCallback?: ((ctx: BeforeSelectContext<T>) => void | false | Promise<void | false>) | null;
    /**
     * Runs before an option is deselected by a user gesture — the dropdown row toggle, a badge /
     * popover remove (×), the "+N more" remove, a group checkbox, Clear-All, the inline ✕ —
     * once per option. Return `false` to block it; nothing to allow. May be async. Bypassed by
     * programmatic `setSelected` and form reset.
     */
    beforeDeselectCallback?: ((ctx: BeforeDeselectContext<T>) => void | false | Promise<void | false>) | null;
    /**
     * Your own search (a search engine like FlexSearch, a server, …), sync or async:
     * `(ctx) => options[] | Promise<options[]>`. Replaces internal search; `searchBehavior` /
     * `searchMatch` don't apply.
     *
     * - `ctx.term` — the term: the typed text (after `beforeSearchCallback`), or what
     *   `getSearchTermCallback` returned for `target: 'callback'` (may be an object).
     * - `ctx.signal` — an `AbortSignal` that fires when a newer search supersedes this one (or the
     *   component is destroyed). Wire it into your `fetch`; ignoring it is fine — stale results
     *   are discarded.
     * - `ctx.entries` — every option with its raw search value, built on first access.
     */
    searchCallback?: ((ctx: MultiSelectSearchContext<T, any>) => T[] | Promise<T[]>) | null;
    /**
     * Runs when the user chooses to create an option from the typed text (`ctx.value`) — the
     * "add new" row or Enter, with `isAddNewAllowed` on. May be async (the prompt shows a spinner).
     *
     * - return the new option → it is appended to the list, selected, and the `add` event fires
     *   with it. A rich option object renders through the same `get*` / `render*` callbacks.
     * - return `false` → cancel: nothing is added, the search stays, no `add` event.
     * - return nothing (or omit the callback) → only the `add` event fires (without `option`),
     *   so you can create the option yourself (open a modal, POST, then assign `options`).
     */
    beforeAddCallback?: ((ctx: AddContext<T>) => T | false | void | Promise<T | false | void>) | null;
    /** Twin of the `add` event (engine use; on the element, assign `el.onAdd`). */
    onAdd?: ((detail: AddEventDetail<T>) => void) | null;
    /**
     * Intercept keyboard input before the built-in handling. Runs on every keydown (open or
     * closed) with a {@link KeydownContext} carrying the event and current state; drive the picker
     * through `ctx.controller` (`focusNext()`, `toggleFocused()`, `selectAll()`, …). Return `false`
     * to suppress the built-in handling of the key (you own `preventDefault`); return nothing to
     * fall through. Must answer synchronously. Use it to remap keys (Vim `j`/`k`), add shortcuts
     * (Ctrl+A → select all), or suppress a default. Property-only.
     */
    beforeKeydownCallback?: ((ctx: KeydownContext<T>) => void | false) | null;
    /**
     * Runs before the dropdown scrolls an option into view on its own (keyboard move, navigate-mode
     * search, reveal on open, the `scrollTo*()` methods) with a {@link BeforeScrollContext}. Return
     * `false` to skip the scroll, a partial {@link MultiSelectScrollOptions} to replace the defaults,
     * or nothing for the defaults. Must answer synchronously. Property-only.
     */
    beforeScrollCallback?: ((ctx: BeforeScrollContext<T>) => void | false | Partial<MultiSelectScrollOptions>) | null;
    /** Twin of the `select` event (engine use; on the element, assign `el.onSelect`). */
    onSelect?: ((detail: SelectEventDetail<T>) => void) | null;
    /** Twin of the `deselect` event (engine use; on the element, assign `el.onDeselect`). */
    onDeselect?: ((detail: DeselectEventDetail<T>) => void) | null;
    /** Twin of the `change` event (engine use; on the element, assign `el.onChange`). */
    onChange?: ((detail: ChangeEventDetail<T>) => void) | null;
    /** The dropdown opened (`open` event). */
    onOpen?: ((detail: OpenEventDetail<T>) => void) | null;
    /** The dropdown closed — any reason (`close` event). */
    onClose?: ((detail: CloseEventDetail<T>) => void) | null;
    /**
     * Formats the badges-area count/summary text: the `count` mode badge ("N selected") and the
     * partial-mode "+X more" badge (when `ctx.moreCount` is set). NOT the small `[N]` chip — that's
     * {@link getCountLabelCallback}. For i18n/pluralization.
     */
    getCounterCallback?: ((ctx: CounterContext<T>) => string) | null;
    /**
     * Formats the small count CHIP shared by the in-input counter (`show-counter`) and each group
     * header's per-group count. Distinct from {@link getCounterCallback}, which formats the
     * badges-area "N selected" / "+X more" text. `ctx.selectedCount` / `ctx.totalCount`: for the
     * in-input counter `totalCount` is the whole option list; for a group header it's that group's
     * member count (and `ctx.groupName` is set). Return the label as plain text. Default
     * `[selected]` (e.g. `[3]`). Set it to `` ({ selectedCount, totalCount }) => `${selectedCount}/${totalCount}` ``
     * for an "x / y" style. One callback drives both so they always read the same way.
     */
    getCountLabelCallback?: ((ctx: CountLabelContext<T>) => string) | null;

    // ========================================================================
    // TOOLTIP OPTIONS
    // ========================================================================

    /** Enable tooltips on selected item badges (internal: isBadgeTooltipsEnabled) */
    isBadgeTooltipsEnabled?: boolean;
    /**
     * Callback to generate custom tooltip content for a badge. `ctx` is the badge's
     * {@link BadgeContentRenderContext} — the same one {@link renderBadgeContentCallback} gets.
     */
    getBadgeTooltipCallback?: ((ctx: BadgeContentRenderContext<T>) => string | HTMLElement) | null;
    /** Callback to generate custom tooltip text for a badge remove button (`ctx`: {@link RemoveItemContext} — the badge's context plus `displayValue`). */
    getRemoveButtonTooltipCallback?: ((ctx: RemoveItemContext<T>) => string) | null;
    /**
     * Tooltip placement relative to the badge (Floating UI `Placement`). Default: `top`.
     *
     * One of: `top`, `top-start`, `top-end`, `bottom`, `bottom-start`, `bottom-end`,
     * `left`, `left-start`, `left-end`, `right`, `right-start`, `right-end`.
     */
    badgeTooltipPlacement?: Placement;
    /** Delay before showing tooltip in milliseconds */
    badgeTooltipDelay?: number;
    /** Offset distance for tooltip in pixels */
    badgeTooltipOffset?: number;

    /** Enable tooltips on dropdown options (internal: isOptionTooltipsEnabled) */
    isOptionTooltipsEnabled?: boolean;
    /**
     * Callback to generate custom tooltip content for a dropdown option. Default: display value, plus
     * subtitle on the next line when present. `ctx` is the row's {@link OptionContentRenderContext}
     * (`option`, `optionIndex`, `isSelected`, `isFocused`, `isMatched`, `isDisabled`, presentation), the
     * same one {@link renderOptionContentCallback} gets.
     */
    getOptionTooltipCallback?: ((ctx: OptionContentRenderContext<T>) => string | HTMLElement) | null;
    /**
     * Option tooltip placement (Floating UI `Placement`). Default `top-start`
     * (anchored to the row's start edge, so it doesn't center on a full-width row).
     * Use `left`/`right` (or their start/end variants) for a narrow multiselect.
     *
     * One of: `top`, `top-start`, `top-end`, `bottom`, `bottom-start`, `bottom-end`,
     * `left`, `left-start`, `left-end`, `right`, `right-start`, `right-end`.
     */
    optionTooltipPlacement?: Placement;
    /** Delay before showing an option tooltip (ms). Falls back to `badgeTooltipDelay`, then `100`. */
    optionTooltipDelay?: number;
    /** Offset distance for an option tooltip (px). Falls back to `badgeTooltipOffset`, then `8`. */
    optionTooltipOffset?: number;
    /** Anchor the option tooltip to the mouse pointer and follow it across the row (best for full-width rows). Default `false`. */
    shouldOptionTooltipFollowCursor?: boolean;

    // ========================================================================
    // OTHER OPTIONS
    // ========================================================================

    /** Container element for dropdown/hint/popover (for Shadow DOM support) */
    container?: HTMLElement | null;

    /**
     * Whether the control is right-to-left. The element passes core's `isRtl` (the effective CSS
     * `direction`: `dir` on the host or any ancestor, or a CSS `direction` rule). Unset (standalone
     * engine): the computed `direction` of the host.
     */
    isRtl?: () => boolean;

    /**
     * Host element: hidden form inputs are appended to it, and it is `element` on every callback
     * `ctx` / event detail.
     */
    hostElement?: HTMLElement;
    /** The public facade put on every callback `ctx` / event detail (the element passes its rebuild-proof `el.controller`). */
    controller?: MultiSelectController<T>;
    /**
     * The values selected when the engine is built (the element passes its resolved `value` /
     * defaultValue, or the selection held across a rebuild). A single-select keeps only the first.
     */
    initialSelection?: ReadonlyArray<string | number> | null;
}

/** {@link MultiSelectConfig} members that are engine wiring, not `<web-multiselect>` inputs. */
type MultiSelectEngineOnlyKey = `on${string}` | 'container' | 'hostElement' | 'controller' | 'isRtl' | 'initialSelection';

/** Engine members the element types differently (a CSS length takes a number = px; no `null`). */
type MultiSelectElementRetypedKey = 'dropdownMinWidth' | 'dropdownMaxWidth' | 'maxHeight' | 'badgesThreshold' | 'maxVisibleBadgeCount';

/**
 * Every configKey a `<web-multiselect>` element accepts, exactly its input-table rows (core
 * `docs/usage.md` → "Typing the properties", rulebook C-CA-16): the picker options
 * ({@link MultiSelectConfig}) minus the engine wiring, plus the element-only inputs
 * (`presentation`, the widths, `collapseBadgesBelow`, the `value` default and the `data-options`
 * source). Merged into `MultiSelectElement`, so `el.maxHeight = 300` is typed; also the config
 * type a responsive rule targets. A CSS length takes a number (pixels); `undefined` (or removing
 * the attribute) resets an input, `null` only clears a nullable one.
 */
export interface MultiSelectElementConfig<T = any> extends Omit<MultiSelectConfig<T>, MultiSelectEngineOnlyKey | MultiSelectElementRetypedKey> {
    /** Minimum dropdown width, a CSS length (a number = px). Attribute `dropdown-min-width`. */
    dropdownMinWidth?: string | number;
    /** Maximum dropdown width, a CSS length (a number = px). Attribute `dropdown-max-width`. */
    dropdownMaxWidth?: string | number;
    /** Maximum dropdown list height, a CSS length (a number = px). Default `20rem`. Attribute `max-height`. */
    maxHeight?: string | number;
    /** Threshold at which the badges collapse (see `badgesThresholdMode`). Attribute `badges-threshold`. */
    badgesThreshold?: number;
    /** Maximum number of badges in `partial` mode. Attribute `max-visible-badge-count`. */
    maxVisibleBadgeCount?: number;
    /** How the open dropdown is presented: `auto` (fullscreen on phones, floating elsewhere), `floating`, `fullscreen`. Attribute `presentation`. */
    presentation?: 'auto' | 'floating' | 'fullscreen';
    /** Fixed dropdown width, a CSS length (a number = px). Attribute `dropdown-width`. */
    dropdownWidth?: string | number;
    /** Selected-items popover width, a CSS length (a number = px). Attribute `selected-popover-width`. */
    selectedPopoverWidth?: string | number;
    /** Collapse the badges to the count view below this host width (px). Attribute `collapse-badges-below`. */
    collapseBadgesBelow?: number;
    /** The initial selection (native `defaultValue`, the form-reset target). Attribute `value` (parsed per `value-format`). */
    defaultValue?: ReadonlyArray<string | number> | string;
    /** A selection is required: while nothing is selected the host is invalid (`validity.valueMissing`, `labels['errors.required']`) and the form won't submit; readonly / disabled are never missing. Attribute `required` (reflects). */
    isRequired?: boolean;
    /** HTML-authoring option source, parsed per `optionsFormat`. Attribute `data-options`. */
    optionsSource?: string | null;
    /** How `data-options` is parsed. Default `json`. Attribute `data-options-format`. */
    optionsFormat?: OptionsFormat;
    /** Cell delimiter of the `csv` / `plain` `data-options` formats. Default `,`. Attribute `data-options-splitter`. */
    optionsSplitter?: string;
    /** Row delimiter of the `csv` / `plain` `data-options` formats. Default newline. Attribute `data-options-row-splitter`. */
    optionsRowSplitter?: string;
}

/**
 * Responsive rules map (core SPEC §6.7): `{ device?, breakpoint? }`, each keyed `mobile` /
 * `tablet` / `desktop` → partial element config. `device` = device class (touch capability,
 * then short side), `breakpoint` = window-width bucket (768 / 1024px); device wins per key. Set it page-wide (`window.components.responsive`), per tag
 * (`window.components['web-multiselect'].responsive`) or per instance (`el.responsive`,
 * JSON attribute `responsive`).
 */
export type MultiSelectResponsiveMap<T = any> = ResponsiveMap<MultiSelectElementConfig<T>>;

/**
 * Computed responsive rule (core SPEC §6.7): `(ctx) => partial config | undefined`
 * (`null` from the instance callback = ignore every page rule). `ctx.config` is the
 * element's BASE config. Page-wide, per tag, or per instance (`el.responsiveCallback`).
 */
export type MultiSelectResponsiveCallback<T = any> = ResponsiveCallback<MultiSelectElementConfig<T>>;

/** Detail of the `select` / `deselect` events (and the `onSelect` / `onDeselect` twins). */
export interface SelectEventDetail<T = any> extends MultiSelectContext<T> {
    /** The option that was selected / deselected. */
    option: T;
    /** The full selection after the change. */
    selectedOptions: T[];
    selectedValues: (string | number)[];
}
export type DeselectEventDetail<T = any> = SelectEventDetail<T>;

/** Detail of the `change` event (and `onChange`). */
export interface ChangeEventDetail<T = any> extends MultiSelectContext<T> {
    selectedOptions: T[];
    selectedValues: (string | number)[];
}

/** Detail of the `value-format-error` event (and `onValueFormatError`): `getValueFormatCallback` threw. */
export interface ValueFormatErrorEventDetail<T = any> extends MultiSelectContext<T> {
    /** What the callback threw. */
    error: unknown;
    /** The selected values the callback was given (the unformatted value). */
    value: (string | number)[];
}

/** Detail of the `add` event (and `onAdd`). */
export interface AddEventDetail<T = any> extends MultiSelectContext<T> {
    /** The typed text. */
    value: string;
    /** The created option, when `beforeAddCallback` returned one. */
    option?: T;
    selectedOptions: T[];
    selectedValues: (string | number)[];
}

/** Detail of the `ready` event (and `onReady`): the context only. */
export type ReadyEventDetail<T = any> = MultiSelectContext<T>;

/** `open` event detail: the context only (`controller`, `element`, presentation flags). */
export type OpenEventDetail<T = any> = MultiSelectContext<T>;

/**
 * Why the dropdown closed:
 * - `'api'` — `close()`, `toggle()`, `isOpen = false`, the controller;
 * - `'toggle'` — a click / tap on the control while open;
 * - `'escape'` / `'tab'` — the key;
 * - `'select'` — a selection closed it (single-select, `close-on-select`);
 * - `'outside-click'` — a click outside the control and the dropdown;
 * - `'scroll'` — the page (or a scroller around the control) scrolled (`close-on-scroll`);
 * - `'reference-removed'` — the control left the page while the dropdown was open (core rc20);
 * - `'overlay'` — another overlay opened (another picker, the selected-items popover);
 * - `'parent'` — the overlay it was opened from closed;
 * - `'back'` — the Back gesture closed the fullscreen sheet;
 * - `'close-button'` — the fullscreen sheet's ✕;
 * - `'disabled'` — the control became disabled / readonly;
 * - `'destroy'` — torn down while open (reinit, DOM move, `destroy()`).
 */
export type DropdownCloseReason =
    | 'api' | 'toggle' | 'escape' | 'tab' | 'select' | 'outside-click' | 'scroll' | 'resize'
    | 'reference-removed' | 'overlay' | 'parent' | 'back' | 'close-button' | 'disabled' | 'destroy';

/** `close` event detail: the context (`controller`, `element`, presentation flags) + why it closed. */
export type CloseEventDetail<T = any> = MultiSelectContext<T> & { reason: DropdownCloseReason };

/**
 * Legacy interface for backward reference
 * Note: New code should use generic types with member/callback properties
 * @deprecated Use generic types with valueMember/displayValueMember instead
 */
export interface MultiSelectOption {
    /** Unique identifier for the option */
    value: string;
    /** Display label */
    label: string;
    /** Optional icon or emoji */
    icon?: string;
    /** Optional subtitle/description */
    subtitle?: string;
    /** Optional group name */
    group?: string;
    /** Whether the option is disabled */
    disabled?: boolean;
}
