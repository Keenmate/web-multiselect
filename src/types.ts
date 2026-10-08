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
 * Context handed to `renderSelectedContentCallback` (single-select selected-value display). Carries
 * only the shared {@link PresentationContext} fields (`presentation` / `isFullscreen` / `isModal`),
 * so the single-select label can render leaner in the phone fullscreen overlay.
 */
export type SelectedContentRenderContext = PresentationContext;

/**
 * Context handed to `renderGroupLabelContentCallback` as its second argument, so a custom group
 * header can reflect the selection — e.g. render a "3 / 8" count next to the title. The fields are
 * populated for every group header; the selection fields are meaningful mainly under
 * `groupSelectMode: 'cascade'` (a flat multi-select grouped list). Under the default rendering
 * (no callback) the component draws the count itself; with a callback, YOU own the content and can
 * render the count however you like from these fields.
 *
 * Like {@link OptionContentRenderContext} / {@link BadgeContentRenderContext}, it extends the
 * shared {@link PresentationContext} (`presentation` / `isFullscreen` / `isModal`), so a group
 * header can also render leaner in the phone fullscreen overlay.
 */
export interface GroupLabelRenderContext<T = any> extends PresentationContext {
    /** The group name (identical to the callback's first argument). */
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
 * Imperative facade for driving a live picker from a callback without reaching into internals.
 * Shared base of the callback controllers: {@link MultiSelectKeyboardController} (handed to
 * `keydownCallback`) extends it with focus-navigation, and {@link ActionContext} exposes it to
 * the action-button callbacks. Every method mirrors a public element method.
 */
export interface MultiSelectController<T = any> {
    // ── read current state ───────────────────────────────────────────────
    /** The selected option objects, in selection order (mirrors `el.getSelected()`). */
    getSelected(): T[];
    /** The selection as returned to forms/consumers — scalar or array per `multiple` (mirrors `el.getValue()`). */
    getValue(): string | number | (string | number)[] | null;
    /** All available options (post assignment, pre-filter). */
    getOptions(): ReadonlyArray<T>;

    // ── mutate the selection ─────────────────────────────────────────────
    /** Replace the selection. Silent by default; pass `{ notify: true }` to emit ONE aggregate `change`. */
    setSelected(values: (string | number)[], opts?: { notify?: boolean }): void;
    /** Select every selectable option. */
    selectAll(): void;
    /** Clear the whole selection. */
    clearAll(): void;
    /** Toggle a single option by its value (select ⇄ deselect). */
    toggleValue(value: string | number): void;

    // ── drive the dropdown ───────────────────────────────────────────────
    open(): void;
    close(): void;
    toggle(): void;
    /** Set the search box text (runs the search, exactly as if typed). */
    search(term: string): void;
    /** Clear the search box and restore the full list (does not touch the selection). */
    clearSearch(): void;
    /** Scroll a specific option / group / index into view. */
    scrollToValue(value: string | number): void;
    scrollToGroup(group: string): void;
    scrollToIndex(index: number): void;

    // ── feedback ─────────────────────────────────────────────────────────
    /** Surface a transient message ("toast"), visible even in the fullscreen overlay. */
    showMessage(content: string | HTMLElement, opts?: MessageOptions): void;
    /** Dismiss the transient message, if any. */
    hideMessage(): void;
}

/**
 * Imperative facade handed to `keydownCallback`: the shared {@link MultiSelectController} plus the
 * focus-navigation methods that only make sense mid-keystroke. Every method mirrors a built-in
 * keyboard action.
 */
export interface MultiSelectKeyboardController<T = any> extends MultiSelectController<T> {
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
    /** Select a specific option by its value (no-op if already selected). */
    selectValue(value: string | number): void;
    /** Deselect a specific option by its value (no-op if not selected). */
    deselectValue(value: string | number): void;
    /** @deprecated Alias of {@link MultiSelectController.search}. */
    setSearch(term: string): void;
}

/**
 * Context handed (as the additive 2nd argument) to the action-button callbacks —
 * {@link ActionButton.getTextCallback} / `getIsVisibleCallback` / `getIsDisabledCallback` /
 * `getClassCallback` / `getTooltipCallback` — and to the `onClick` event. A typed snapshot of
 * live state plus a {@link MultiSelectController} facade, replacing reliance on the untyped picker
 * instance passed as the first argument. Extends {@link PresentationContext}, so a callback can
 * branch on how the panel is presented (floating vs fullscreen), consistent with the render callbacks.
 */
export interface ActionContext<T = any> extends PresentationContext {
    /** The action button config entry this callback belongs to. */
    button: ActionButton<T>;
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
    /** Imperative facade — drive the picker (selection / dropdown / search / messages). */
    controller: MultiSelectController<T>;
    /** Escape hatch: the host custom element, for anything not on the controller. */
    element: HTMLElement & Record<string, any>;
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
    /**
     * Custom click handler (required for 'custom' action). The 1st arg is the live picker
     * instance (as before); the additive 2nd arg is a typed {@link ActionContext} (state +
     * controller). One-argument handlers keep working.
     */
    onClick?: (multiselect: any, context?: ActionContext<T>) => void | Promise<void>;
    /** Dynamic visibility callback - return false to hide button (takes priority over isVisible). Additive 2nd arg: {@link ActionContext}. */
    getIsVisibleCallback?: (multiselect: any, context?: ActionContext<T>) => boolean;
    /** Dynamic disabled state callback - return true to disable button (takes priority over isDisabled). Additive 2nd arg: {@link ActionContext}. */
    getIsDisabledCallback?: (multiselect: any, context?: ActionContext<T>) => boolean;
    /** Dynamic text callback - return button text (takes priority over text). Additive 2nd arg: {@link ActionContext}. */
    getTextCallback?: (multiselect: any, context?: ActionContext<T>) => string;
    /** Dynamic CSS class callback - return class name(s) (takes priority over cssClass). Additive 2nd arg: {@link ActionContext}. */
    getClassCallback?: (multiselect: any, context?: ActionContext<T>) => string | string[];
    /** Dynamic tooltip callback - return tooltip text (takes priority over tooltip). Additive 2nd arg: {@link ActionContext}. */
    getTooltipCallback?: (multiselect: any, context?: ActionContext<T>) => string;
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
    /**
     * Callback to customize badge display text (defaults to display value if not provided).
     * The second argument is additive: when the value is computed while rendering a specific
     * badge/popover item it receives that item's {@link BadgeContentRenderContext} (`displayMode`,
     * `isInPopover`, and the shared presentation fields); it is **absent** when the value is needed
     * outside a render (e.g. selected-order sorting, the counter chip's title), so one-argument
     * callbacks keep working. Treat `context` as optional.
     */
    getBadgeDisplayCallback?: (item: T, context?: BadgeContentRenderContext) => string;

    /**
     * Order of the CURRENTLY-SELECTED items *where they are displayed* — badges, partial mode
     * (i.e. which items sit behind the "+N more" badge), and the selected-items popover. This is a
     * display concern only: `getValue()`, the form output, and `getSelected()` always keep
     * as-selected (insertion) order regardless of this setting, and the options dropdown is never
     * reordered.
     * - `as-selected` (default) — the order items were picked.
     * - `label-asc` / `label-desc` — by the badge label, A→Z / Z→A (locale-aware).
     * - `member` — by the `selectedOrderMember` property (or `getSelectedOrderCallback`); numeric
     *   keys sort numerically, everything else with a locale string compare.
     * - `custom` — delegate to `selectedOrderCompareCallback`.
     */
    selectedOrder?: 'as-selected' | 'label-asc' | 'label-desc' | 'member' | 'custom';
    /** Property name used as the sort key when `selectedOrder === 'member'` (selected-items display only). */
    selectedOrderMember?: string;
    /** Extract the sort key when `selectedOrder === 'member'` (overrides `selectedOrderMember`). */
    getSelectedOrderCallback?: (item: T) => string | number;
    /** Comparator used when `selectedOrder === 'custom'`; standard `(a,b) => number` contract. */
    selectedOrderCompareCallback?: (a: T, b: T) => number;

    /**
     * Member property name for a "full title" — a fully-qualified label that ships with the
     * data (e.g. a breadcrumb like "Fruit / Pome fruit / Apple"). It is never computed by the
     * component. When `isBadgeFullTitleShown` is on, badges display this instead of the display
     * value (falling back to the display value when an option has none).
     */
    fullTitleMember?: string;
    /** Callback to extract the full title from an item (takes precedence over `fullTitleMember`). */
    getFullTitleCallback?: (item: T) => string;
    /**
     * Callback to add custom CSS classes to badges - return string or array of class names.
     * Additive 2nd arg: receives the badge's {@link BadgeContentRenderContext} when invoked during
     * a badge render (the same context {@link renderBadgeContentCallback} gets), so classes can react
     * to `displayMode` / `isInPopover` / presentation. Optional — one-argument callbacks keep working.
     */
    getBadgeClassCallback?: (item: T, context?: BadgeContentRenderContext) => string | string[];
    /** Callback to inject custom CSS into Shadow DOM - return CSS string for styling custom classes */
    customStylesCallback?: () => string;
    /**
     * Static CSS string injected into the Shadow DOM (attribute alternative to
     * `customStylesCallback`, via the `custom-styles` attribute). The value is a
     * raw stylesheet — selectors and all — dropped verbatim into the same
     * replaceable style slot. `customStylesCallback` wins when both are set.
     */
    customStyles?: string;

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

    /** Member property name for group extraction */
    groupMember?: string;
    /** Callback to extract group from item */
    getGroupCallback?: (item: T) => string;
    /**
     * Callback to customize group label content (can return HTML). Receives the group name and a
     * {@link GroupLabelRenderContext} with the group's members and selection (e.g. `selectedCount`),
     * so a custom header can show a per-group count. The second argument is additive — existing
     * one-argument callbacks keep working.
     */
    renderGroupLabelContentCallback?: (groupName: string, context: GroupLabelRenderContext<T>) => string | HTMLElement;
    /**
     * Group-header selection in a flat (non-tree) grouped, multi-select list.
     * - `none` (default) — group headers are inert labels.
     * - `cascade` — each header shows a **tristate** checkbox that checks/unchecks
     *   all of that group's currently-visible members. The group itself is never a
     *   selected value (`getValue()`/badges/form carry member values only); a
     *   partially-selected group reads indeterminate. Flat + multiple only — no
     *   effect in tree mode (use `checkboxMode`) or single-select.
     */
    groupSelectMode?: 'none' | 'cascade';

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
    /**
     * Custom renderer for selected item content in the selected-items popover — return HTML string
     * or HTMLElement. Receives a {@link BadgeContentRenderContext} (2nd arg) since a popover item
     * is rendered through the same badge path: `isInPopover` is `true`, plus the shared
     * presentation fields. The second argument is additive; one-argument callbacks keep working.
     */
    renderSelectedItemContentCallback?: (item: T, context: BadgeContentRenderContext) => string | HTMLElement;
    /**
     * Callback to add custom CSS classes to selected items in popover - return string or array of
     * class names. Additive 2nd arg: receives the {@link BadgeContentRenderContext} for the popover
     * item (`isInPopover` is `true`) — the same context {@link renderSelectedItemContentCallback}
     * gets. Optional — one-argument callbacks keep working.
     */
    getSelectedItemClassCallback?: (item: T, context?: BadgeContentRenderContext) => string | string[];
    /**
     * Custom renderer for the selected item display in single-select mode — return plain text (it
     * becomes the input value). Receives a {@link SelectedContentRenderContext} (2nd arg) carrying
     * the shared presentation fields. The second argument is additive; one-argument callbacks keep
     * working.
     */
    renderSelectedContentCallback?: (item: T, context: SelectedContentRenderContext) => string;

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
     * When the option set is replaced (assigning `options` / `data-options`), drop any selected
     * value whose option is no longer present. Default `false` — selections are KEPT even if
     * their option leaves the list, which is the safe default for search/paged lists where an
     * item can drop out of the current page yet remain a valid pick. Turn on when the list
     * replacement means the domain itself changed (e.g. an item was deleted server-side) and a
     * value with no matching option should stop being reported by `getValue()` (internal:
     * isPruneMissingSelectionEnabled).
     */
    isPruneMissingSelectionEnabled?: boolean;
    /**
     * In the phone fullscreen overlay, auto-focus the search field when it opens — which
     * pops the soft keyboard immediately. Default `false`: the sheet opens showing the list
     * (keyboard closed), and the keyboard appears only when the user taps the search. Set
     * `true` to type-to-filter right away (matches native pickers). No effect in the floating
     * presentation. (internal: fullscreenAutofocus) */
    fullscreenAutofocus?: boolean;
    /** Lock dropdown placement after first open (internal: isPlacementLocked) */
    isPlacementLocked?: boolean;
    /**
     * Allow adding new options not in the list (internal: isAddNewAllowed).
     * When on and a search yields no matches, the empty dropdown shows a clickable
     * "add new" prompt (text from `addNewText` / `getAddNewTextCallback`) instead of
     * the `emptyMessage`; choosing it (click or Enter) fires the `add` event and, if
     * `addNewCallback` is set, materializes + selects the created option.
     */
    isAddNewAllowed?: boolean;
    /**
     * Template for the clickable "add new" prompt (see `isAddNewAllowed`). The substring
     * `{value}` is replaced with the (HTML-escaped) typed text. Default: `Add "{value}"`.
     * `getAddNewTextCallback` takes precedence. (internal: addNewText)
     */
    addNewText?: string;
    /**
     * Dynamically compute the "add new" prompt label from the typed text. Takes precedence
     * over `addNewText`. Returns plain text (inserted as text, not HTML). Use it for i18n or
     * context-aware wording, e.g. `(v) => \`Add new member: ${v}\``.
     */
    getAddNewTextCallback?: ((value: string) => string) | null;
    /**
     * Template for the pending prompt shown (spinner + this text) while an async `addNewCallback`
     * is in flight. `{value}` is replaced with the (HTML-escaped) typed text. Default:
     * `Adding "{value}"…`. (internal: addNewPendingText)
     */
    addNewPendingText?: string;
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
    /**
     * Callback to create the new option object from the typed text when `isAddNewAllowed` is on.
     * Return (or resolve to) the new option — it is appended to the list and auto-selected. The
     * returned `T` can be a rich option object (icon/subtitle/custom-render fields and all): it flows
     * through the same `get*` / `render*` callbacks as any other option, so the created row and its
     * badge render exactly like the rest.
     *
     * **Cancelable (async):** return `null` or `undefined` (or a Promise of either) to abort — nothing
     * is added or selected, the search is left intact, and the `add` event does NOT fire. Use it for
     * async validation, a confirm dialog, or a server round-trip that may say no. The cancel sentinel
     * is strictly `null`/`undefined` (checked with `== null`), so a falsy-but-valid option in
     * primitive mode (`0`, `false`, `""`) still creates normally.
     *
     * Omit the callback entirely to handle creation yourself via the `add` event / `onAddNew` (e.g.
     * open a modal, POST to a server, then add the option imperatively).
     */
    addNewCallback?: ((value: string) => T | null | undefined | Promise<T | null | undefined>) | null;
    /**
     * Event handler: the user chose to create a new option from the typed text (via the "add new"
     * row or Enter). `value` is the typed text; `option` is the created item when `addNewCallback`
     * produced one (absent otherwise). Mirrors the bubbling `add` CustomEvent on the element.
     */
    onAddNew?: ((detail: { value: string; option?: T }) => void) | null;
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
    /**
     * Formats the badges-area count/summary text: the `count` mode badge ("N selected") and the
     * partial-mode "+X more" badge (when `moreCount` is provided). NOT the small `[N]` chip — that's
     * {@link getCountLabelCallback}. For i18n/pluralization.
     */
    getCounterCallback?: ((count: number, moreCount?: number) => string) | null;
    /**
     * Formats the small count CHIP shared by the in-input counter (`show-counter`) and each group
     * header's per-group count. Distinct from {@link getCounterCallback}, which formats the
     * badges-area "N selected" / "+X more" text. Receives `selected` and `total`: for the in-input
     * counter `total` is the whole option list; for a group header it's that group's member count.
     * Return the label as plain text. Default `[selected]` (e.g. `[3]`). Set it to
     * `` (s, t) => `${s}/${t}` `` for an "x / y" style. One callback drives both so they always
     * read the same way.
     */
    getCountLabelCallback?: ((selected: number, total: number) => string) | null;

    // ========================================================================
    // TOOLTIP OPTIONS
    // ========================================================================

    /** Enable tooltips on selected item badges (internal: isBadgeTooltipsEnabled) */
    isBadgeTooltipsEnabled?: boolean;
    /**
     * Callback to generate custom tooltip content for a badge. Additive 2nd arg: receives the
     * badge's {@link BadgeContentRenderContext} (`displayMode` / `isInPopover` / presentation), the
     * same context {@link renderBadgeContentCallback} gets. Optional — one-argument callbacks keep working.
     */
    getBadgeTooltipCallback?: ((item: T, context?: BadgeContentRenderContext) => string | HTMLElement) | null;
    /**
     * Callback to generate custom tooltip text for a remove button. Additive 2nd arg: the badge's
     * {@link BadgeContentRenderContext}. Optional — one-argument callbacks keep working.
     */
    getRemoveButtonTooltipCallback?: ((item: T, context?: BadgeContentRenderContext) => string) | null;
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
    /**
     * Callback to generate custom tooltip content for a dropdown option. Default: display value, plus
     * subtitle on the next line when present. Additive 2nd arg: receives the row's
     * {@link OptionContentRenderContext} (`index`, `isSelected`, `isFocused`, `isMatched`,
     * `isDisabled`, presentation), the same context {@link renderOptionContentCallback} gets, so an
     * option tooltip can match how the row itself was rendered. Optional — one-argument callbacks keep working.
     */
    getOptionTooltipCallback?: ((item: T, context?: OptionContentRenderContext) => string | HTMLElement) | null;
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
    /** The option that triggered the event (for select/deselect/add) */
    option?: T;
    /** The typed text that triggered the `add` event (add only) */
    value?: string;
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
