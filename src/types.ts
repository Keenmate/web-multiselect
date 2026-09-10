/**
 * Type definitions for the MultiSelect component
 */

import type { Placement } from '@keenmate/web-components-core/positioning';
import type { PresentationContext } from '@keenmate/web-components-core';
import type { LTreeNode } from './tree/ltree-node';


/**
 * Position of the badges container relative to the input
 */
export type BadgesPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Search input display mode
 */
export type SearchInputMode = 'normal' | 'readonly' | 'hidden';

/**
 * Value format for serialization (forms and callbacks)
 */
export type ValueFormat = 'json' | 'csv' | 'array';

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
 * Visual tone of a transient message shown via `showMessage()` (or a veto callback's
 * returned reason string). Each maps to a `.ms__message--{variant}` theming hook.
 */
export type MessageVariant = 'info' | 'warning' | 'error' | 'success';

/**
 * Options for `showMessage()` — the transient toast the component can surface on top of
 * itself. It exists mainly so a veto (or any consumer feedback) is visible in the
 * fullscreen overlay, where page-level UI is covered by the sheet.
 */
export interface MessageOptions {
    /** Visual tone. Default `'info'`. */
    variant?: MessageVariant;
    /** Auto-dismiss after this many ms. `0` keeps it until replaced, tapped, or the panel closes. Default `3000`. */
    duration?: number;
    /**
     * Where the message anchors relative to the control in the **floating/anchored** case
     * (a floating-ui `Placement`, e.g. `'top'`, `'bottom-start'`, `'right'`). Default
     * `'bottom'`. Ignored when a fullscreen overlay is open — there the message is pinned
     * to the bottom-centre of the viewport.
     */
    placement?: Placement;
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
 * Context provided to renderOptionContentCallback.
 *
 * Extends the shared {@link PresentationContext} from `@keenmate/web-components-core`, so it
 * also carries `presentation` (`'floating' | 'modal' | 'fullscreen'` — this component only ever
 * emits `floating`/`fullscreen`), `isFullscreen`, and `isModal`. Branch on `isFullscreen` to
 * render leaner content in the phone overlay. Reactive: swapping presentation re-renders and
 * re-invokes the callback with the new value.
 */
export interface OptionContentRenderContext extends PresentationContext {
    /** Index of the option in the filtered list */
    index: number;
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
    /** Tree only: 0-based indentation depth (`level - 1`), matching `--ms-tree-depth`. */
    depth?: number;
    /** Tree only: the node's materialized path (e.g. "1.1.2"). */
    path?: string;
    /** Tree only: the node is selectable (branches marked non-selectable are `false`). */
    isSelectable?: boolean;
    /** Tree only: cascade tristate — a partially-checked branch (some but not all descendants). */
    isIndeterminate?: boolean;
}

/**
 * Context provided to renderBadgeContentCallback
 */
export interface BadgeContentRenderContext extends PresentationContext {
    /** Current badges display mode */
    displayMode: BadgesDisplayMode;
    /** Whether the badge is being rendered in the selected items popover */
    isInPopover: boolean;
}

/**
 * Imperative facade handed to `keydownCallback` so a consumer can drive the picker without
 * reaching into internals. Every method mirrors a built-in keyboard action.
 */
export interface MultiSelectKeyboardController<T = any> {
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
    /** Toggle the currently focused option (no-op if nothing is focused). */
    toggleFocused(): void;
    /** Toggle a specific option by its value (select ⇄ deselect). */
    toggleValue(value: string | number): void;
    /** Select a specific option by its value (no-op if already selected). */
    selectValue(value: string | number): void;
    /** Deselect a specific option by its value (no-op if not selected). */
    deselectValue(value: string | number): void;
    /** Open / close the dropdown. */
    open(): void;
    close(): void;
    /** Set the search box text (runs the search). */
    setSearch(term: string): void;
    /** Clear the search box and reset the visible list. */
    clearSearch(): void;
}

/**
 * Context passed to `keydownCallback`, which runs before all built-in keyboard handling.
 * Return `true` to mark the key fully handled (the component then runs none of its own
 * key logic — you own `preventDefault`); return `false`/`undefined` to fall through to the
 * defaults. Mirrors the veto-hook shape used across KM components.
 */
export interface MultiSelectKeydownContext<T = any> {
    /** The raw keyboard event — call `preventDefault()` yourself if you handle the key. */
    event: KeyboardEvent;
    /** `event.key`, for convenience. */
    key: string;
    /** Whether the dropdown is currently open. */
    isOpen: boolean;
    /** How the open panel is presented (`floating` / `fullscreen`). */
    presentation: 'floating' | 'fullscreen';
    /** The current search term. */
    searchTerm: string;
    /** Index of the focused option in the filtered list (`-1` when nothing is focused). */
    focusedIndex: number;
    /** The focused option object, or `null`. */
    focusedOption: T | null;
    /** The options currently visible (after filtering). */
    filteredOptions: ReadonlyArray<T>;
    /** The currently selected values. */
    selectedValues: ReadonlyArray<string>;
    /** Imperative actions mirroring the built-in keyboard behavior. */
    controller: MultiSelectKeyboardController<T>;
}

/**
 * Action button configuration for dropdown actions (Select All, Clear All, custom actions)
 * @template T The type of data items
 */
export interface ActionButton<T = any> {
    /** Action identifier ('select-all', 'clear-all', or 'custom' for custom actions) */
    action: 'select-all' | 'clear-all' | 'custom';
    /** Button text label */
    text: string;
    /** Optional CSS class(es) to add to the button */
    cssClass?: string;
    /**
     * 1-based row this button belongs to (default `1`). Buttons sharing a `row` render on the same
     * horizontal line; different values stack into multiple rows. Row 1 sits at the panel's outer edge
     * and higher rows stack inward toward the options list — so with `actions-position="top"` row 1 is
     * the topmost line, and with `actions-position="bottom"` row 1 is the bottommost line.
     */
    row?: number;
    /** Optional tooltip text */
    tooltip?: string;
    /** Static visibility - set to false to hide button */
    isVisible?: boolean;
    /** Static disabled state - set to true to disable button */
    isDisabled?: boolean;
    /** Custom click handler (required for 'custom' action) */
    onClick?: (multiselect: any) => void | Promise<void>;
    /** Dynamic visibility callback - return false to hide button (takes priority over isVisible) */
    getIsVisibleCallback?: (multiselect: any) => boolean;
    /** Dynamic disabled state callback - return true to disable button (takes priority over isDisabled) */
    getIsDisabledCallback?: (multiselect: any) => boolean;
    /** Dynamic text callback - return button text (takes priority over text) */
    getTextCallback?: (multiselect: any) => string;
    /** Dynamic CSS class callback - return class name(s) (takes priority over cssClass) */
    getClassCallback?: (multiselect: any) => string | string[];
    /** Dynamic tooltip callback - return tooltip text (takes priority over tooltip) */
    getTooltipCallback?: (multiselect: any) => string;
}

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

    /** Member property name for value/ID extraction */
    valueMember?: string;
    /** Callback to extract value/ID from item */
    getValueCallback?: (item: T) => string | number;

    /** Member property name for display value extraction */
    displayValueMember?: string;
    /** Callback to extract display value from item */
    getDisplayValueCallback?: (item: T) => string;
    /** Callback to customize badge display text (defaults to display value if not provided) */
    getBadgeDisplayCallback?: (item: T) => string;

    /**
     * Member property name for a "full title" — a fully-qualified label that ships with the
     * data (e.g. a breadcrumb like "Fruit / Pome fruit / Apple"). It is never computed by the
     * component. When `isBadgeFullTitleShown` is on, badges display this instead of the display
     * value (falling back to the display value when an option has none).
     */
    fullTitleMember?: string;
    /** Callback to extract the full title from an item (takes precedence over `fullTitleMember`). */
    getFullTitleCallback?: (item: T) => string;
    /** Callback to add custom CSS classes to badges - return string or array of class names */
    getBadgeClassCallback?: (item: T) => string | string[];
    /** Callback to inject custom CSS into Shadow DOM - return CSS string for styling custom classes */
    customStylesCallback?: () => string;

    /** Member property name for search value extraction */
    searchValueMember?: string;
    /** Callback to extract search value from item */
    getSearchValueCallback?: (item: T) => string;

    /** Member property name for icon extraction */
    iconMember?: string;
    /** Callback to extract icon from item */
    getIconCallback?: (item: T) => string;

    /** Member property name for subtitle extraction */
    subtitleMember?: string;
    /** Callback to extract subtitle from item */
    getSubtitleCallback?: (item: T) => string;

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
    getPathCallback?: (item: T) => string;
    /** Member holding an option's parent path (otherwise derived from its path). */
    parentPathMember?: string;
    /** Member holding an option's depth/level (otherwise derived from its path). */
    levelMember?: string;
    /** Member holding a precomputed hasChildren flag (otherwise derived from the tree). */
    hasChildrenMember?: string;
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
     * `isSelectableMember`). Receives the built tree node, so `node.hasChildren` /
     * `node.level` are available — e.g. `(node) => !node.hasChildren` for a
     * leaves-only tree. Tree mode only.
     */
    getIsSelectableCallback?: (node: LTreeNode<T>) => boolean;

    /**
     * Tree checkbox interaction. `independent` (default) toggles only the clicked
     * node. `cascade` checks a node's whole subtree and shows a tristate
     * (checked / indeterminate / unchecked) box on branches. Tree + multiple only.
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

    /** Member property name for group extraction */
    groupMember?: string;
    /** Callback to extract group from item */
    getGroupCallback?: (item: T) => string;
    /** Callback to customize group label content (can return HTML) */
    renderGroupLabelContentCallback?: (groupName: string) => string | HTMLElement;

    /** Member property name for disabled state extraction */
    disabledMember?: string;
    /** Callback to extract disabled state from item */
    getDisabledCallback?: (item: T) => boolean;

    // ========================================================================
    // CUSTOM RENDERING CALLBACKS
    // ========================================================================

    /** Custom renderer for dropdown option content - return HTML string or HTMLElement */
    renderOptionContentCallback?: (item: T, context: OptionContentRenderContext) => string | HTMLElement;
    /** Custom renderer for badge content (main badges area) - return HTML string or HTMLElement */
    renderBadgeContentCallback?: (item: T, context: BadgeContentRenderContext) => string | HTMLElement;
    /**
     * Custom renderer for the WHOLE badge (main badges area) — return HTML string or HTMLElement
     * for the entire pill/card, not just its content. Unlike renderBadgeContentCallback (which fills
     * the built-in pill), this replaces the badge markup entirely. The component wraps your output in
     * a `.ms__badge.ms__badge--custom` element carrying `data-value`, and delegates removal to any
     * element inside it with `data-action="remove"` (or the built-in `.ms__badge-remove` class) — so
     * put a remove control in your markup and the component handles the deselect. Falls back to the
     * default pill for a given item if the callback returns null/empty. Main badges area only (the
     * selected-items popover keeps using renderSelectedItemContentCallback).
     */
    renderBadgeCallback?: (item: T, context: BadgeContentRenderContext) => string | HTMLElement | null | undefined;
    /** Custom renderer for selected item content in popover - return HTML string or HTMLElement */
    renderSelectedItemContentCallback?: (item: T) => string | HTMLElement;
    /** Callback to add custom CSS classes to selected items in popover - return string or array of class names */
    getSelectedItemClassCallback?: (item: T) => string | string[];
    /** Custom renderer for selected item display in single-select mode - return plain text */
    renderSelectedContentCallback?: (item: T) => string;

    // ========================================================================
    // FORM INTEGRATION & VALUE FORMATTING
    // ========================================================================

    /** HTML form field ID/name for hidden input */
    formFieldId?: string;
    /**
     * Format for value serialization (hidden form inputs and callbacks). Default: `json`.
     *
     * - `json` — a JSON array string, e.g. `["a","b"]`
     * - `csv` — comma-separated values, e.g. `a,b`
     * - `array` — one hidden input per value (`name[]` entries)
     */
    valueFormat?: ValueFormat;
    /** Custom callback to format value */
    getValueFormatCallback?: (selectedValues: (string | number)[]) => string;

    // ========================================================================
    // BOOLEAN OPTIONS (internal names with 'is' prefix)
    // ========================================================================

    /** Allow multiple selections (internal: isMultipleEnabled) */
    isMultipleEnabled?: boolean;
    /** Enable search/filtering (internal: isSearchEnabled) */
    isSearchEnabled?: boolean;
    /** Allow grouping of options (internal: isGroupsAllowed) */
    isGroupsAllowed?: boolean;
    /** Action buttons configuration (Select All, Clear All, custom actions) */
    actionButtons?: ActionButton<T>[];
    /** Show checkboxes next to options (internal: isCheckboxesShown) */
    isCheckboxesShown?: boolean;
    /** Keep Select All/Clear All buttons fixed at top while scrolling (internal: isActionsSticky) */
    isActionsSticky?: boolean;
    /** Close dropdown after selecting an option (internal: isCloseOnSelect) */
    isCloseOnSelect?: boolean;
    /**
     * In the phone fullscreen overlay, auto-focus the search field when it opens — which
     * pops the soft keyboard immediately. Default `false`: the sheet opens showing the list
     * (keyboard closed), and the keyboard appears only when the user taps the search. Set
     * `true` to type-to-filter right away (matches native pickers). No effect in the floating
     * presentation. (internal: fullscreenAutofocus) */
    fullscreenAutofocus?: boolean;
    /** Lock dropdown placement after first open (internal: isPlacementLocked) */
    isPlacementLocked?: boolean;
    /** Allow adding new options not in the list (internal: isAddNewAllowed) */
    isAddNewAllowed?: boolean;
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
    /** Keep initial options visible when searchCallback is active and search term is empty/short (internal: isKeepOptionsOnSearch) */
    isKeepOptionsOnSearch?: boolean;
    /** Keep search text and filtered results when dropdown closes (default: true) */
    shouldKeepSearchOnClose?: boolean;
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

    /** Hint text shown above the input while the dropdown is open. */
    searchHint?: string;
    /** Placeholder text for the search input (shown while search is usable) */
    searchPlaceholder?: string;
    /**
     * Placeholder shown when search is disabled (input acts as a picker rather than a search box).
     * Applies when `isSearchEnabled` is false or `searchInputMode` is 'readonly'/'hidden'.
     * Default: "Pick an option..."
     */
    selectPlaceholder?: string;
    /**
     * Placeholder shown when there are no options to choose from (e.g. an unresolved cascade parent).
     * Opt-in: when unset, the normal search/select placeholder is used even with an empty list.
     * Lets users see there is no data without opening the dropdown.
     */
    noDataPlaceholder?: string;
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
     * - `partial` — keep up to `badgesMaxVisible` badges and add a "+X more" badge
     */
    badgesThresholdMode?: BadgesThresholdMode;
    /** Maximum height for dropdown */
    maxHeight?: string;
    /** Message shown when no results found */
    emptyMessage?: string;
    /** Message shown while loading async data */
    loadingMessage?: string;
    /**
     * How the search input behaves. Default: `normal`.
     *
     * - `normal` — editable search box
     * - `readonly` — visible but not editable (acts as a picker; uses `selectPlaceholder`)
     * - `hidden` — no search box at all
     */
    searchInputMode?: SearchInputMode;
    /**
     * Search behavior mode. Default: `filter`.
     *
     * - `filter` — hide options that don't match
     * - `navigate` — keep all options visible and jump focus to matches
     */
    searchMode?: SearchMode;
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
    badgesMaxVisible?: number | null;
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
    optionHeight?: number;
    /** Fixed height for each badge in selected items popover in pixels (required for virtual scroll, default: 36) */
    badgeHeight?: number;
    /** Buffer size for virtual scroll - items above/below viewport (default: 10) */
    virtualScrollBuffer?: number;

    // ========================================================================
    // CALLBACK FUNCTIONS
    // ========================================================================

    /** Pre-process search term before calling searchCallback. Return null to prevent search. Use for accent removal, validation, etc. */
    beforeSearchCallback?: ((searchTerm: string) => string | null) | null;
    /**
     * Interceptor: runs before an option is selected via user interaction.
     * Receives the option about to be added and the current selection (before the change).
     * Return `false` to block the selection; return `true`/`undefined` to allow. Return a
     * **string** to block AND surface it as a message (see `showMessage`) — the touch-safe
     * way to explain a veto in the fullscreen overlay, where page-level UI is hidden behind
     * it. Silent otherwise — a blocked action fires no event. Bypassed by programmatic
     * `setSelected` and the Select-All action button.
     */
    beforeSelectCallback?: ((option: T, selectedOptions: T[]) => boolean | string | void) | null;
    /**
     * Interceptor: runs before an option is deselected via user interaction — the dropdown
     * option toggle, a badge's remove (×) button, the selected-items popover's remove button,
     * and the "remove hidden" badge (checked per item). Receives the option about to be
     * removed and the current selection (before the change). Return `false` to block the
     * deselection; return `true`/`undefined` to allow. Return a **string** to block AND
     * surface it as a message (see `showMessage`). Silent otherwise — a blocked action fires
     * no event. Bypassed by programmatic `setSelected` and the Clear-All action button.
     */
    beforeDeselectCallback?: ((option: T, selectedOptions: T[]) => boolean | string | void) | null;
    /**
     * Async function to load data: `(searchTerm, signal) => Promise<options[]>`.
     * The optional second argument is an `AbortSignal` that fires when a newer search
     * supersedes this one (or the component is destroyed). Wire it into your `fetch`
     * to cancel the in-flight request; ignoring it is fine — stale results are discarded.
     */
    searchCallback?: ((searchTerm: string, signal?: AbortSignal) => Promise<T[]>) | null;
    /** Callback to add a new option when isAddNewAllowed is true */
    addNewCallback?: ((value: string) => T | Promise<T>) | null;
    /**
     * Intercept keyboard input before the built-in handling. Runs on every keydown (open or
     * closed) with a {@link MultiSelectKeydownContext} carrying the event, current state, and a
     * {@link MultiSelectKeyboardController}. Return `true` to mark the key fully handled — the
     * component then runs none of its own key logic (you own `preventDefault`); return
     * `false`/`undefined` to fall through to the defaults. Use it to remap keys (Vim `j`/`k`),
     * add shortcuts (Ctrl+A → select all), or suppress a default. Property-only.
     */
    keydownCallback?: ((context: MultiSelectKeydownContext<T>) => boolean | void) | null;
    /** Event handler: an option was selected (fire-and-forget; return value ignored). Mirrors the bubbling `select` CustomEvent on the element. */
    onSelect?: ((option: T) => void) | null;
    /** Event handler: an option was deselected (fire-and-forget). Mirrors the bubbling `deselect` CustomEvent on the element. */
    onDeselect?: ((option: T) => void) | null;
    /** Event handler: the selection set changed (fire-and-forget). Mirrors the bubbling `change` CustomEvent on the element. */
    onChange?: ((selectedOptions: T[]) => void) | null;
    /** Callback to format count badge text (for i18n/pluralization). When moreCount is provided, it's for the "+X more" badge in partial mode. */
    getCounterCallback?: ((count: number, moreCount?: number) => string) | null;

    // ========================================================================
    // TOOLTIP OPTIONS
    // ========================================================================

    /** Enable tooltips on selected item badges (internal: isBadgeTooltipsEnabled) */
    isBadgeTooltipsEnabled?: boolean;
    /** Callback to generate custom tooltip content for a badge */
    getBadgeTooltipCallback?: ((item: T) => string | HTMLElement) | null;
    /** Callback to generate custom tooltip text for a remove button */
    getRemoveButtonTooltipCallback?: ((item: T) => string) | null;
    /** Format string for remove button tooltip text. Use {0} as placeholder for item name. Default: "Remove {0}" */
    removeButtonTooltipText?: string;
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
    /** Callback to generate custom tooltip content for a dropdown option. Default: display value, plus subtitle on the next line when present. */
    getOptionTooltipCallback?: ((item: T) => string | HTMLElement) | null;
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
    isOptionTooltipFollowCursor?: boolean;

    // ========================================================================
    // OTHER OPTIONS
    // ========================================================================

    /** Container element for dropdown/hint/popover (for Shadow DOM support) */
    container?: HTMLElement | null;

    /** Host element for appending hidden inputs (for form integration with shadow DOM) */
    hostElement?: HTMLElement;
}

/**
 * Event detail structure for multiselect events
 * @template T The type of data items
 */
export interface MultiSelectEventDetail<T = any> {
    /** Currently selected options */
    selectedOptions: T[];
    /** Selected values array */
    selectedValues: (string | number)[];
    /** The option that triggered the event (for select/deselect) */
    option?: T;
}

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

/**
 * Legacy options interface
 * @deprecated Use MultiSelectConfig<T> instead
 */
export interface MultiSelectOptions extends MultiSelectConfig<MultiSelectOption> {
    options?: MultiSelectOption[];
    searchCallback?: ((searchTerm: string, signal?: AbortSignal) => Promise<MultiSelectOption[]>) | null;
    addNewCallback?: ((value: string) => MultiSelectOption | Promise<MultiSelectOption>) | null;
    onSelect?: ((option: MultiSelectOption) => void) | null;
    onDeselect?: ((option: MultiSelectOption) => void) | null;
    onChange?: ((selectedOptions: MultiSelectOption[]) => void) | null;
}
