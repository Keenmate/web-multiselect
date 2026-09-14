/**
 * Pure Admin - MultiSelect with Typeahead
 * Comprehensive multiselect component with rich content support and floating hints
 */

// Positioning runs entirely on the core /positioning module. The dropdown/popover
// use `anchor`'s first-class `fixedContainingBlock` + `onDrift` options — core owns
// the fixed-position containing-block heuristic and the drift measurement; this file
// keeps only the multiselect-branded warning copy (see warnDrift). No direct
// `@floating-ui/dom` dependency: core owns the one pinned version.
import { anchor, createTooltip, createPopover, getFixedPositionOffsetParent, describeContainingBlockProps, type Placement, type TooltipHandle, type PopoverHandle, type DriftReport } from '@keenmate/web-components-core/positioning';
// Fullscreen-overlay primitives (SPEC §12.9) — shared with any component that swaps a
// floating panel for a full-viewport sheet on phones (daterangepicker's fullscreen calendar).
import { lockBodyScroll, observeKeyboardInset, presentationContext, registerOverlay, type OverlayHandle } from '@keenmate/web-components-core';
import type { MultiSelectConfig, BadgesPosition, SearchInputMode, SearchMode, OptionContentRenderContext, BadgeContentRenderContext, MultiSelectKeyboardController, MultiSelectKeydownContext, MessageOptions } from './types';
import { initLogger, dataLogger, uiLogger, interactionLogger } from './logger';
import { VirtualScroll } from './virtual-scroll';
import { createLTree, type LTree } from './tree/ltree';
import type { LTreeNode } from './tree/ltree-node';
import {
    buildCascadeIndex,
    nodeCheckState,
    expandToAtoms,
    toggleNodeCascade,
    projectSelection,
    type CascadeIndex,
    type CascadeSelectPolicy
} from './tree/cascade';

export class WebMultiSelect<T = any> {
    private element: HTMLElement;
    private instanceId: string;
    private options: MultiSelectConfig<T>;

    // Backing field for the open state. Read/written internally via `this.#isOpen`
    // so the public `isOpen` accessor (get/set) can drive open()/close() without
    // recursing. See the imperative API at the bottom of the class.
    #isOpen = false;
    private selectedValues = new Set<string>();
    private selectedOptions = new Map<string, T>();
    private allOptions: T[] = [];
    private filteredOptions: T[] = [];
    // Tree mode: the hierarchy built from option paths, and the flat list of
    // nodes currently shown. `treeNodes` stays index-aligned with
    // `filteredOptions` so focus/keyboard/virtual-scroll keep working unchanged.
    private tree: LTree<T> | null = null;
    private treeNodes: LTreeNode<T>[] = [];
    // Cascade checkbox mode (tree + multiple + checkbox-mode="cascade"): the index
    // is rebuilt with the tree; `cascadeCheckedAtoms` is the derived set of checked
    // leaf-level atoms, refreshed from `selectedValues` before each render.
    private cascadeIndex: CascadeIndex<T> | null = null;
    private cascadeCheckedAtoms: Set<string> = new Set();
    private hiddenInputs: HTMLInputElement[] = [];
    private focusedIndex = -1;
    // Stable imperative facade handed to keydownCallback (built once, reused). See getKeyboardController().
    private keyboardController: MultiSelectKeyboardController<T> | null = null;
    private matchingIndices: Set<number> = new Set();
    private searchTerm = '';
    /** Keyboard focus sits on the empty-state "add new" prompt (arrow-navigated). */
    private addNewFocused = false;
    /** An async addNewCallback is in flight — the prompt shows a spinner + pending text. */
    private addNewPending = false;
    private isLoading = false;
    private searchDebounceTimer?: ReturnType<typeof setTimeout>;
    private searchAbortController?: AbortController;
    private showSelectedPopover = false;
    private selectedPopoverPlacement: Placement | null = null;
    private dropdownPlacement: Placement | null = null;
    private isRTL = false;
    private effectiveBadgesPosition: BadgesPosition = 'bottom';
    private justClosedViaClick = false;
    // Set for one tick when the dropdown is opened by a pointer gesture. A fullscreen
    // overlay (position:fixed, inset:0) appears over the pointer between mousedown and
    // the follow-up click, so that click can target a common ancestor above the
    // portaled panel and be misread as an outside-click. This guard swallows exactly
    // that one click. See attachEvents() (mousedown) and handleClickOutside().
    private justOpenedViaClick = false;
    private positioningDriftWarned = false;
    // Fullscreen counterpart of positioningDriftWarned: warn once per instance when an
    // ancestor establishes a fixed-positioning containing block, so the full-viewport
    // sheet is anchored to that ancestor instead of the viewport (see warnFullscreenContainingBlock).
    private fullscreenContainingBlockWarned = false;

    // How the open dropdown is presented. 'floating' anchors it to the input (the
    // default); 'fullscreen' renders it as a full-viewport overlay with its own
    // search header + close button — the phone pattern, driven from the element's
    // environmentChanged() hook via setPresentation(). See open()/enterFullscreen().
    private presentationMode: 'floating' | 'fullscreen' = 'floating';
    private fullscreenHeader: HTMLDivElement | null = null;
    private fullscreenSearchInput: HTMLInputElement | null = null;
    // Inline ✕ inside the fullscreen search box that clears the term. Shown only while
    // there's text; touch has no keyboard Escape, so this is the way to reset a search.
    private fullscreenSearchClear: HTMLButtonElement | null = null;
    // Leading mode toggle inside the fullscreen search box (opt-in via
    // isSearchModeToggleShown) that flips searchMode filter<->navigate live. Its icon
    // reflects the current mode; clicking re-projects the current term in place.
    private fullscreenModeToggle: HTMLButtonElement | null = null;
    // Navigate-mode match navigator shown under the fullscreen search box: a result
    // count ("3 of 12") plus prev/next buttons that step through matches. Touch has no
    // Ctrl+Arrow shortcut, so these buttons are the on-screen substitute. Only built in
    // searchMode 'navigate' (filter mode narrows the list, so it needs no jump UI).
    private fullscreenNav: HTMLDivElement | null = null;
    private fullscreenNavCount: HTMLElement | null = null;
    private fullscreenNavPrev: HTMLButtonElement | null = null;
    private fullscreenNavNext: HTMLButtonElement | null = null;
    // Releases this instance's page-scroll lock (null when not locked). The core
    // helper is ref-counted; we hold at most one lock per instance. See lockBodyScroll().
    private bodyScrollUnlock: (() => void) | null = null;
    // Saved inline `overflow-x` of <html> while a fullscreen sheet clamps the host
    // document's horizontal overflow (null when not clamped). See clampDocumentOverflowX().
    private overflowXClamp: { html: string } | null = null;
    // Detaches the visualViewport listener that shrinks the fullscreen sheet to sit
    // above the soft keyboard (null when not attached). See observeKeyboardInset().
    private keyboardInsetCleanup: (() => void) | null = null;
    // True while a history entry is pushed for the open fullscreen sheet, so the phone
    // Back gesture/button pops it (closing the sheet) instead of navigating the page.
    // See pushOverlayHistory()/popOverlayHistory()/onOverlayPopstate().
    private overlayHistoryActive = false;
    private readonly onOverlayPopstate = (): void => this.handleOverlayPopstate();

    // Floating UI cleanup functions
    private dropdownCleanup: (() => void) | null = null;
    private hintCleanup: (() => void) | null = null;
    private selectedPopoverCleanup: (() => void) | null = null;

    // All hover tooltips (badge text, badge-remove buttons, action buttons), keyed by id.
    private tooltips = new Map<string, TooltipHandle>();

    // Full-label reveal shown when a clipped row's info button is tapped (fullscreen
    // only). A manually-controlled popover — NOT a hover tooltip — so it stays put
    // until explicitly dismissed (a hover tooltip's synthetic mouseleave on touch
    // would flash it away). `labelRevealTrigger` tracks the button so a second tap
    // toggles it off. See toggleLabelReveal() / hideLabelReveal().
    private labelRevealTrigger: HTMLElement | null = null;
    private labelRevealPanel: HTMLDivElement | null = null;
    private labelRevealPopover: PopoverHandle | null = null;

    // Transient message ("toast") surface — see showMessage(). Rendered above the panel
    // so a veto reason (or any consumer feedback) is visible even in the fullscreen
    // overlay, where page-level UI is hidden behind the sheet.
    private messageEl: HTMLDivElement | null = null;
    private messageCleanup: (() => void) | null = null;
    private messageTimer: ReturnType<typeof setTimeout> | null = null;

    // Dismiss option tooltips the instant the list scrolls. Without this, a shown
    // tooltip's floating-ui autoUpdate keeps chasing its anchor row as it scrolls
    // (most visible under virtual scroll, where the row also recycles), so the
    // tooltip visibly slides to the viewport edge before the next render clears it.
    // Capturing so it catches scroll from the inner options container (scroll
    // doesn't bubble). Same function ref → addEventListener dedupes across opens.
    private readonly onDropdownScroll = (): void => { this.hideOptionTooltips(); this.hideLabelReveal(); };

    // Virtual scroll instance
    private virtualScroll: VirtualScroll<T> | null = null;
    private optionsContainer: HTMLDivElement | null = null;
    private selectedPopoverVirtualScroll: VirtualScroll<T> | null = null;
    private selectedPopoverContainer: HTMLDivElement | null = null;

    // DOM elements
    private input!: HTMLInputElement;
    // The field shell (border/background) wrapping the input + trailing decorations.
    // Floating panels anchor to this (not the narrower flex <input>) so they align to
    // and match the full field width.
    private inputWrapper!: HTMLDivElement;
    private dropdown!: HTMLDivElement;
    private dropdownInner!: HTMLDivElement;
    private badgesContainer!: HTMLDivElement;
    private counter!: HTMLSpanElement;
    // Inline ✕ inside the input that wipes the whole selection (opt-in via isClearShown).
    // Always in the DOM; updateClearButton() toggles its display by selection/enabled state.
    private clearButton!: HTMLButtonElement;
    private hint?: HTMLDivElement;
    private selectedPopover!: HTMLDivElement;

    // Document-level event handlers (stored for cleanup)
    private documentKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
    private documentClickHandler: ((e: MouseEvent) => void) | null = null;

    // Cross-component "one overlay open at a time" coordination (core). activate() on
    // open() dismisses every OTHER participating overlay (multiselects, datepickers, …);
    // our onDismiss closes this dropdown when another opens. Torn down in destroy().
    private overlayCoord: OverlayHandle | null = null;

    // ========================================================================
    // DATA EXTRACTION METHODS (following svelte-treeview pattern)
    // ========================================================================

    /**
     * Generic field extractor with the precedence:
     *   tuple short-circuit -> member property -> callback -> fallback
     *
     * Tuple handling:
     *   - `tupleIndex` (0 | 1): for `[key, value]` items, return that slot.
     *   - `tupleSkip: true`: for any tuple, skip directly to fallback (used for icon/subtitle/group/disabled —
     *     fields that don't make sense on a 2-element array).
     *   - neither: tuples flow through the member/callback/fallback chain as if they were objects.
     *
     * `transform` is applied to tuple-slot and member-property reads (not to callback returns or the fallback),
     * so e.g. you can pass `String` to coerce numeric members to strings while letting a typed callback return its
     * own type unchanged.
     */
    private extractField<R>(item: T, opts: {
        member?: string;
        callback?: (item: T) => R;
        tupleIndex?: 0 | 1;
        tupleSkip?: boolean;
        transform?: (raw: any) => R;
        fallback: R | (() => R);
    }): R {
        const isTuple = Array.isArray(item) && item.length === 2;

        if (isTuple) {
            if (opts.tupleSkip) {
                // skip member/callback for tuples — go straight to fallback
                return typeof opts.fallback === 'function' ? (opts.fallback as () => R)() : opts.fallback;
            }
            if (opts.tupleIndex !== undefined) {
                const raw = (item as any)[opts.tupleIndex];
                return opts.transform ? opts.transform(raw) : raw;
            }
        }

        if (opts.member && (item as any)[opts.member] !== undefined) {
            const raw = (item as any)[opts.member];
            return opts.transform ? opts.transform(raw) : raw;
        }

        if (opts.callback) {
            return opts.callback(item);
        }

        return typeof opts.fallback === 'function' ? (opts.fallback as () => R)() : opts.fallback;
    }

    private getItemValue(item: T): string | number {
        return this.extractField<string | number>(item, {
            tupleIndex: 0,
            member: this.options.valueMember,
            callback: this.options.getValueCallback,
            fallback: '[N/A]'
        });
    }

    private getItemDisplayValue(item: T): string {
        return this.extractField<string>(item, {
            tupleIndex: 1,
            member: this.options.displayValueMember,
            callback: this.options.getDisplayValueCallback,
            transform: String,
            fallback: '[N/A]'
        });
    }

    /**
     * Badge display falls back to the regular display value rather than '[N/A]', so consumers can override badge
     * text independently. Doesn't fit the extractField shape (no tuple/member layer of its own).
     */
    private getItemBadgeDisplayValue(item: T): string {
        if (this.options.getBadgeDisplayCallback) return this.options.getBadgeDisplayCallback(item);
        if (this.options.isBadgeFullTitleShown) {
            const fullTitle = this.getItemFullTitle(item);
            if (fullTitle) return fullTitle;
        }
        return this.getItemDisplayValue(item);
    }

    /**
     * Full title — a fully-qualified label supplied with the data (never computed here). Used by
     * badges when `isBadgeFullTitleShown` is on. Returns undefined when the option has none.
     */
    private getItemFullTitle(item: T): string | undefined {
        return this.extractField<string | undefined>(item, {
            tupleSkip: true,
            member: this.options.fullTitleMember,
            callback: this.options.getFullTitleCallback,
            transform: String,
            fallback: undefined
        });
    }

    private getItemSearchValue(item: T): string {
        return this.extractField<string>(item, {
            member: this.options.searchValueMember,
            callback: this.options.getSearchValueCallback,
            transform: String,
            fallback: () => this.getItemDisplayValue(item)
        });
    }

    private getItemIcon(item: T): string | undefined {
        return this.extractField<string | undefined>(item, {
            tupleSkip: true,
            member: this.options.iconMember,
            callback: this.options.getIconCallback,
            transform: String,
            fallback: undefined
        });
    }

    private getItemSubtitle(item: T): string | undefined {
        return this.extractField<string | undefined>(item, {
            tupleSkip: true,
            member: this.options.subtitleMember,
            callback: this.options.getSubtitleCallback,
            transform: String,
            fallback: undefined
        });
    }

    private getItemGroup(item: T): string | undefined {
        return this.extractField<string | undefined>(item, {
            tupleSkip: true,
            member: this.options.groupMember,
            callback: this.options.getGroupCallback,
            transform: String,
            fallback: undefined
        });
    }

    private getItemDisabled(item: T): boolean {
        return this.extractField<boolean>(item, {
            tupleSkip: true,
            member: this.options.disabledMember,
            callback: this.options.getDisabledCallback,
            transform: Boolean,
            fallback: false
        });
    }

    /**
     * Tree mode: whether the visible node at `index` may be selected. Non-selectable
     * nodes (see `isSelectableMember`/`getIsSelectableCallback`) still render — just
     * without a checkbox — but are skipped by focus and cannot be toggled. Always
     * true outside tree mode. `treeNodes` is index-aligned with `filteredOptions`.
     */
    private isIndexSelectable(index: number): boolean {
        if (!this.isTreeMode()) return true;
        const node = this.treeNodes[index];
        return node ? node.isSelectable !== false : true;
    }

    /** Whether an option may be selected. Always true outside tree mode. */
    private isOptionSelectable(option: T): boolean {
        if (!this.isTreeMode()) return true;
        const index = this.filteredOptions.indexOf(option);
        if (index >= 0) return this.isIndexSelectable(index);
        // Option identity may not match (rebuilt list): fall back to a value match.
        const value = String(this.getItemValue(option));
        const node = this.treeNodes.find(n => String(this.getItemValue(n.data as T)) === value);
        return node ? node.isSelectable !== false : true;
    }

    constructor(element: HTMLElement, options: Partial<MultiSelectConfig<T>> = {}) {
        this.element = element;
        this.instanceId = `MS-${Math.random().toString(36).slice(2, 11)}`;

        // Merge options with defaults (using internal naming with 'is' prefix for booleans)
        this.options = {
            // String options
            searchHint: element.dataset.searchHint || '',
            searchPlaceholder: element.dataset.searchPlaceholder || undefined,
            selectPlaceholder: element.dataset.selectPlaceholder || 'Pick an option...',
            noDataPlaceholder: element.dataset.noDataPlaceholder || undefined,
            dropdownMinWidth: element.dataset.dropdownMinWidth || undefined,
            dropdownMaxWidth: element.dataset.dropdownMaxWidth || undefined,
            badgesDisplayMode: (element.dataset.badgesDisplayMode as any) || 'badges',
            badgesPosition: (element.dataset.badgesPosition as BadgesPosition) || 'bottom',
            badgesThresholdMode: (element.dataset.badgesThresholdMode as any) || 'count',
            maxHeight: element.dataset.maxHeight || '20rem',
            emptyMessage: element.dataset.emptyMessage || 'No results found',
            addNewText: element.dataset.addNewText || undefined,
            addNewPendingText: element.dataset.addNewPendingText || undefined,
            loadingMessage: element.dataset.loadingMessage || 'Loading...',
            searchInputMode: (element.dataset.searchInputMode as SearchInputMode) || 'normal',
            searchMode: (element.dataset.searchMode as SearchMode) || 'filter',

            // Number options
            badgesThreshold: element.dataset.badgesThreshold ? parseInt(element.dataset.badgesThreshold) : undefined,
            minSearchLength: parseInt(element.dataset.minSearchLength || '0') || 0,
            searchDebounce: parseInt(element.dataset.searchDebounce || '0') || 0,

            // Boolean options (internal names with 'is' prefix)
            isMultipleEnabled: element.dataset.multiple !== 'false',
            isGroupsAllowed: element.dataset.allowGroups !== 'false',
            isCheckboxesShown: element.dataset.showCheckboxes !== 'false',
            isActionsSticky: element.dataset.stickyActions !== 'false',
            isCloseOnSelect: element.dataset.closeOnSelect === 'true',
            isPlacementLocked: element.dataset.lockPlacement !== 'false',
            isSearchEnabled: element.dataset.enableSearch !== 'false',
            isAddNewAllowed: element.dataset.allowAddNew === 'true',
            isCounterShown: element.dataset.showCounter === 'true',
            isSelectedPopoverEnabled: element.dataset.enableSelectedPopover !== 'false',
            isSearchModeToggleShown: element.dataset.showSearchModeToggle === 'true',
            isKeepOptionsOnSearch: element.dataset.keepOptionsOnSearch !== 'false',
            shouldKeepSearchOnClose: element.dataset.keepSearchOnClose !== 'false',

            // Data and callbacks
            options: [],
            container: undefined,

            // Override with provided options
            ...options
        };

        this.init();
    }

    private init(): void {
        this.parseOptions();
        this.buildHTML();
        this.attachEvents();
        this.parseInitialSelection();

        initLogger.debug(`Initialized [${this.instanceId}] with options:`, {
            placeholder: this.options.searchPlaceholder,
            totalOptions: this.allOptions.length,
            isCloseOnSelect: this.options.isCloseOnSelect,
            dataAttribute: this.element.dataset.closeOnSelect
        });
    }

    private parseOptions(): void {
        const dataOptions = this.element.dataset.options;
        if (dataOptions) {
            try {
                this.allOptions = JSON.parse(dataOptions);
            } catch (e) {
                dataLogger.error(`[${this.instanceId}] Failed to parse data-options:`, e);
                this.allOptions = [];
            }
        } else if (this.options.options) {
            this.allOptions = this.options.options;
        }

        this.filteredOptions = [...this.allOptions];

        if (this.isTreeMode()) {
            this.buildTree();
        }
    }

    // ========================================================================
    // TREE MODE
    // ========================================================================

    /** Whether options should be rendered as an (always-expanded) tree. */
    private isTreeMode(): boolean {
        if (this.options.isTreeEnabled === false) return false;
        return !!(this.options.isTreeEnabled || this.options.pathMember || this.options.getPathCallback);
    }

    /** (Re)build the ltree from `allOptions` and derive the visible flat list. */
    private buildTree(): void {
        this.tree = createLTree<T>({
            idMember: this.options.valueMember,
            pathMember: this.options.pathMember,
            getPathCallback: this.options.getPathCallback,
            parentPathMember: this.options.parentPathMember,
            levelMember: this.options.levelMember,
            hasChildrenMember: this.options.hasChildrenMember,
            isSelectableMember: this.options.isSelectableMember,
            getIsSelectableCallback: this.options.getIsSelectableCallback,
            treePathSeparator: this.options.treePathSeparator,
            treeId: this.instanceId,
            getDisplayValueCallback: (node) => this.getItemDisplayValue(node.data as T)
        });
        this.tree.insertArray(this.allOptions);
        this.cascadeIndex = this.isCascadeMode()
            ? buildCascadeIndex(this.tree, (d) => String(this.getItemValue(d)))
            : null;
        this.rebuildTreeVisible();
    }

    /**
     * Whether cascade checkbox mode is active: a multi-select tree with
     * `checkbox-mode="cascade"`. Checking a node then toggles its whole subtree
     * and branches show a tristate box.
     */
    private isCascadeMode(): boolean {
        return this.isTreeMode()
            && this.options.isMultipleEnabled !== false
            && this.options.checkboxMode === 'cascade';
    }

    private cascadePolicy(): CascadeSelectPolicy {
        return this.options.cascadeSelectPolicy ?? 'rolled-up';
    }

    /** Refresh the derived checked-atom set from the emitted `selectedValues`. */
    private refreshCascadeAtoms(): void {
        if (this.isCascadeMode() && this.cascadeIndex) {
            this.cascadeCheckedAtoms = expandToAtoms(this.cascadeIndex, this.selectedValues);
        }
    }

    /**
     * Toggle a tree node in cascade mode: flip its whole subtree, re-project the
     * checked atoms to emitted values under the active policy, and commit the diff
     * so badges / form / change events reflect the policy (rolled-up branches, etc.).
     */
    private toggleTreeCascade(node: LTreeNode<T>): void {
        const index = this.cascadeIndex!;
        const before = expandToAtoms(index, this.selectedValues);
        const { checkedAtoms } = toggleNodeCascade(index, node, before);
        this.commitCascadeAtoms(checkedAtoms);
    }

    /**
     * Given a checked-atom set, project it to emitted values under the active
     * policy, diff it against the current selection, and commit. Shared by every
     * cascade entry point (node toggle, Select All) so they all emit the same
     * policy-projected shape (e.g. a full subtree rolls up to one value).
     */
    private commitCascadeAtoms(checkedAtoms: Set<string>): void {
        const index = this.cascadeIndex!;
        const emitted = projectSelection(
            index,
            checkedAtoms,
            this.cascadePolicy(),
            (d) => String(this.getItemValue(d))
        );

        const newSet = new Set(emitted);
        const added: T[] = [];
        const removed: T[] = [];
        for (const [val, opt] of this.selectedOptions) {
            if (!newSet.has(val)) removed.push(opt);
        }
        const newOptions = new Map<string, T>();
        for (const val of emitted) {
            const resolved = index.nodeByValue.get(val)?.data as T | undefined;
            const opt = resolved ?? this.selectedOptions.get(val);
            if (opt === undefined) continue;
            newOptions.set(val, opt);
            if (!this.selectedValues.has(val)) added.push(opt);
        }

        this.selectedValues = newSet;
        this.selectedOptions = newOptions;
        this.cascadeCheckedAtoms = checkedAtoms;
        this.commit({ added, removed });
    }

    /**
     * The "meaningful selection" list used by the counter chip — the rolled-up
     * minimal cover, regardless of the active emit policy. In cascade mode
     * `leaves`/`all` emit many values for a single branch pick, which made the
     * counter read e.g. `[5]` for what a person experiences as two selections.
     * The counter should count the branches actually chosen, and stay stable when
     * the policy knob flips. Outside cascade this is just the selected options.
     */
    private counterSelection(): T[] {
        if (this.isCascadeMode() && this.cascadeIndex) {
            const emitted = projectSelection(
                this.cascadeIndex,
                this.cascadeCheckedAtoms,
                'rolled-up',
                (d) => String(this.getItemValue(d))
            );
            const out: T[] = [];
            for (const val of emitted) {
                const node = this.cascadeIndex.nodeByValue.get(val);
                const opt = (node?.data as T | undefined) ?? this.selectedOptions.get(val);
                if (opt !== undefined) out.push(opt);
            }
            return out;
        }
        return Array.from(this.selectedOptions.values());
    }

    /** Native `title` for the counter chip: the picked items, capped so it can't grow unbounded. */
    private buildCounterTooltip(items: T[]): string {
        const MAX = 12;
        const labels = items.slice(0, MAX).map(o => this.getItemBadgeDisplayValue(o));
        if (items.length > MAX) labels.push(`…and ${items.length - MAX} more`);
        return labels.join('\n');
    }

    /**
     * Derive `treeNodes` + `filteredOptions` from the full tree, applying the
     * current search term. Matching nodes keep all their ancestors visible so
     * indentation stays coherent (the tree is always fully expanded).
     */
    private rebuildTreeVisible(): void {
        if (!this.tree) {
            this.treeNodes = [];
            return;
        }

        const all = this.tree.flatNodes;
        const term = this.options.isSearchEnabled ? (this.searchTerm || '').trim().toLowerCase() : '';

        let nodes: LTreeNode<T>[];
        if (!term) {
            nodes = all;
        } else {
            const sep = this.tree.treePathSeparator;
            const required = new Set<string>();
            for (const node of all) {
                const searchValue = this.getItemSearchValue(node.data as T).toLowerCase();
                if (searchValue.includes(term)) {
                    // Keep this node and every ancestor on its path.
                    const segments = node.path.split(sep);
                    for (let i = 1; i <= segments.length; i++) {
                        required.add(segments.slice(0, i).join(sep));
                    }
                }
            }
            nodes = all.filter(node => required.has(node.path));
        }

        this.treeNodes = nodes;
        this.filteredOptions = nodes.map(node => node.data as T);
    }

    /**
     * Reset the visible list to "everything". **Tree-aware**: in tree mode it
     * rebuilds `treeNodes` (kept index-aligned with `filteredOptions`) from the
     * full tree, so the two never drift. A raw `filteredOptions = [...allOptions]`
     * would leave `treeNodes` stale after clearing a search — the virtual list
     * then reserves height for every option but renders blank rows because
     * `treeNodes[index]` is undefined. Always use this to clear the visible list.
     */
    private resetVisibleToAll(): void {
        if (this.isTreeMode()) {
            this.rebuildTreeVisible();
        } else {
            this.filteredOptions = [...this.allOptions];
        }
    }

    /**
     * Tree mode: derive the visible list from an **external** set of matched
     * options — e.g. the results returned by `searchCallback` — keeping each
     * match's ancestors so indentation stays coherent. This is the async-search
     * analogue of `rebuildTreeVisible`: the matching is done by the caller (their
     * own index/engine) instead of a local substring test, but ancestor
     * preservation and `treeNodes`/`filteredOptions` index-alignment still happen
     * here. Pass all options to show the whole tree.
     */
    private rebuildTreeVisibleFromMatches(matches: T[]): void {
        if (!this.tree) {
            this.treeNodes = [];
            this.filteredOptions = [];
            return;
        }
        const all = this.tree.flatNodes;
        const sep = this.tree.treePathSeparator;
        const matchedValues = new Set((matches || []).map(m => String(this.getItemValue(m))));

        const required = new Set<string>();
        for (const node of all) {
            if (matchedValues.has(String(this.getItemValue(node.data as T)))) {
                const segments = node.path.split(sep);
                for (let i = 1; i <= segments.length; i++) {
                    required.add(segments.slice(0, i).join(sep));
                }
            }
        }

        const nodes = all.filter(node => required.has(node.path));
        this.treeNodes = nodes;
        this.filteredOptions = nodes.map(node => node.data as T);
    }

    /**
     * Tree + `search-mode="navigate"`: keep the ENTIRE tree visible (the tree is always
     * fully expanded, so `flatNodes` is the whole thing) and record which visible rows
     * match the term in `matchingIndices` — the flat-list navigate behavior, but over
     * `treeNodes`. Filter mode collapses the hierarchy to matches + ancestors; navigate
     * mode instead leaves the structure intact so the user can jump between matches
     * (Ctrl+Arrow on desktop, the fullscreen navigator on touch). Returns the index of
     * the first match, or -1 (no term / no matches), so the caller can set focus.
     */
    private rebuildTreeVisibleForNavigate(): number {
        this.matchingIndices.clear();
        if (!this.tree) {
            this.treeNodes = [];
            this.filteredOptions = [];
            return -1;
        }
        const all = this.tree.flatNodes;
        this.treeNodes = all;
        this.filteredOptions = all.map(node => node.data as T);

        const term = (this.searchTerm || '').trim().toLowerCase();
        if (!term) return -1;

        let firstMatchIndex = -1;
        all.forEach((node, index) => {
            const searchValue = this.getItemSearchValue(node.data as T).toLowerCase();
            if (searchValue.includes(term)) {
                this.matchingIndices.add(index);
                if (firstMatchIndex === -1) firstMatchIndex = index;
            }
        });
        return firstMatchIndex;
    }

    /**
     * (Re)compute `isRTL` from the host's `dir` (or an RTL ancestor) and derive the
     * direction-mirrored badges position. Pure state — callers apply the DOM effects
     * (class toggle, panel `dir`, badge re-render). In Shadow DOM the `dir` lives on
     * the host element, not the shadow content, so we resolve the host first.
     */
    private detectRTL(): void {
        const rootNode = this.element.getRootNode();
        const hostElement = rootNode instanceof ShadowRoot
            ? (rootNode as ShadowRoot).host as HTMLElement
            : this.element;

        const hasElementDir = hostElement.getAttribute('dir') === 'rtl';
        const hasAncestorDir = hostElement.closest('[dir="rtl"]') !== null;
        this.isRTL = hasElementDir || hasAncestorDir;

        initLogger.debug(`[${this.instanceId}] RTL Debug:`, {
            isShadowRoot: rootNode instanceof ShadowRoot,
            elementDir: hostElement.getAttribute('dir'),
            hasElementDir,
            hasAncestorDir,
            isRTL: this.isRTL
        });

        // Mirror badgesPosition (left<->right) in RTL — a logical placement choice.
        this.effectiveBadgesPosition = this.options.badgesPosition || 'bottom';
        if (this.isRTL) {
            if (this.effectiveBadgesPosition === 'left') this.effectiveBadgesPosition = 'right';
            else if (this.effectiveBadgesPosition === 'right') this.effectiveBadgesPosition = 'left';
        }
    }

    /**
     * Re-read `dir` and re-apply RTL mirroring live. The web-component calls this when
     * its `dir` attribute changes at runtime (e.g. an app-wide language/direction
     * switch). Most layout follows the inherited CSS `direction` automatically (the
     * component is authored with logical properties); this fixes the parts pinned at
     * build time — the `.ms--rtl` class (badges/count-display placement) and the
     * explicit `dir` on the shadow-root-appended panels (which don't sit under the
     * `.ms--rtl` element, so they'd otherwise keep a stale build-time direction).
     */
    public refreshDirection(): void {
        if (!this.element) return;
        const before = this.isRTL;
        this.detectRTL();

        this.element.classList.toggle('ms--rtl', this.isRTL);

        // Set `dir` explicitly on the panels: 'rtl' to mirror, 'ltr' to OVERRIDE a
        // stale build-time 'rtl' when switching back (they're outside .ms--rtl and
        // wouldn't otherwise re-inherit deterministically).
        const dir = this.isRTL ? 'rtl' : 'ltr';
        if (this.dropdown) this.dropdown.dir = dir;
        if (this.hint) this.hint.dir = dir;
        if (this.selectedPopover) this.selectedPopover.dir = dir;

        // Badge/count placement is class-level (mirrored position class), so re-render.
        if (before !== this.isRTL) this.renderBadges();
    }

    private buildHTML(): void {
        // Get container for dropdown/hint/popover (Shadow DOM or body)
        const container = this.options.container || document.body;

        // Detect RTL from the host's `dir` (or an RTL ancestor) and derive the
        // direction-mirrored badges position. Extracted so a runtime `dir` change
        // can re-run it (see refreshDirection()).
        this.detectRTL();

        // Add classes to the element
        this.element.classList.add('ms');

        if (this.isRTL) {
            this.element.classList.add('ms--rtl');
            initLogger.debug(`[${this.instanceId}] Added ms--rtl class to element`);
        }

        if (!this.options.isCheckboxesShown || !this.options.isMultipleEnabled) {
            this.element.classList.add('ms--no-checkboxes');
        }

        if (!this.options.isSelectedPopoverEnabled) {
            this.element.classList.add('ms--no-selected-popover');
        }

        // Create input wrapper (the field shell — floating panels anchor to this)
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'ms__input-wrapper';
        this.inputWrapper = inputWrapper;

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'ms__input';
        this.input.placeholder = this.getPlaceholderText();
        this.input.autocomplete = 'off';

        // Apply searchInputMode
        if (this.options.searchInputMode === 'readonly') {
            this.input.readOnly = true;
        } else if (this.options.searchInputMode === 'hidden') {
            this.input.style.display = 'none';
        }

        // Chevron rendered via a CSS mask icon (see .ms__toggle in controls.css) for
        // consistency with the other glyphs — no text character. It's now a real flex
        // box beside the input (not an overlay the click falls through), so it drives
        // open/close itself, mirroring the input's mousedown toggle.
        const toggle = document.createElement('span');
        toggle.className = 'ms__toggle';
        toggle.addEventListener('mousedown', (e) => {
            e.preventDefault();      // keep the tap from shifting focus; we drive open/close directly
            e.stopPropagation();
            if (this.#isOpen) {
                this.justClosedViaClick = true;
                this.close();
                setTimeout(() => { this.justClosedViaClick = false; }, 0);
            } else {
                this.open();
                // Focus the search field so keyboard nav works right after opening (open()
                // already guards the trailing click). The fullscreen overlay owns its own focus.
                if (this.presentationMode !== 'fullscreen') this.input.focus();
            }
        });

        this.counter = document.createElement('span');
        this.counter.className = 'ms__counter';
        this.counter.style.display = 'none';

        // Inline clear (✕). tabIndex -1 keeps it out of the tab order (it mirrors the
        // Clear-All action); mousedown/preventDefault stops the tap blurring the input
        // first, so clearClick() can clear and then restore focus. Hidden until
        // updateClearButton() finds a selection to clear.
        this.clearButton = document.createElement('button');
        this.clearButton.type = 'button';
        this.clearButton.className = 'ms__input-clear';
        this.clearButton.tabIndex = -1;
        this.clearButton.setAttribute('aria-label', 'Clear selection');
        this.clearButton.style.display = 'none';
        this.clearButton.addEventListener('mousedown', (e) => e.preventDefault());
        this.clearButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearClick();
        });

        inputWrapper.appendChild(this.input);
        inputWrapper.appendChild(this.counter);
        inputWrapper.appendChild(this.clearButton);
        inputWrapper.appendChild(toggle);

        // Create badges container
        this.badgesContainer = document.createElement('div');
        this.badgesContainer.className = 'ms__badges';

        // Create wrapper for input and badges (needed for positioning)
        const wrapper = document.createElement('div');
        wrapper.className = 'ms__wrapper';

        // Add layout modifier based on badges position
        if (this.effectiveBadgesPosition === 'left' || this.effectiveBadgesPosition === 'right') {
            wrapper.classList.add('ms__wrapper--inline');
        }

        // Build the structure: element contains wrapper, which contains inputWrapper and badgesContainer
        wrapper.appendChild(inputWrapper);
        wrapper.appendChild(this.badgesContainer);
        this.element.appendChild(wrapper);

        // The dropdown, hint, and popover are appended to the CONTAINER (the shadow
        // root / body), not under the .ms--rtl element — so they can't inherit RTL
        // from that class, and the component's logical properties need `direction`
        // to resolve. Direction does inherit from the host's `dir="rtl"`, but set
        // `dir` explicitly on each panel too so RTL is deterministic regardless of
        // how it was detected (host attr vs. ancestor) or where the panel is portaled.
        const panelDir = this.isRTL ? 'rtl' : null;

        // Create dropdown (attached to container)
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'ms__dropdown';
        if (panelDir) this.dropdown.dir = panelDir;
        // Inner wrapper handles scrolling, outer clips to border-radius
        this.dropdownInner = document.createElement('div');
        this.dropdownInner.className = 'ms__dropdown-inner';
        this.dropdown.appendChild(this.dropdownInner);
        container.appendChild(this.dropdown);

        // Create hint if provided (attached to container)
        if (this.options.searchHint) {
            this.hint = document.createElement('div');
            this.hint.className = 'ms__hint';
            if (panelDir) this.hint.dir = panelDir;
            this.hint.textContent = this.options.searchHint;
            container.appendChild(this.hint);
        }

        // Create selected popover (attached to container)
        this.selectedPopover = document.createElement('div');
        this.selectedPopover.className = 'ms__selected-popover';
        if (panelDir) this.selectedPopover.dir = panelDir;
        container.appendChild(this.selectedPopover);

        this.renderDropdown();
    }

    /**
     * Check if virtual scroll should be used
     */
    private shouldUseVirtualScroll(): boolean {
        if (!this.options.isVirtualScrollEnabled) return false;
        if (this.options.isGroupsAllowed && this.hasGroups()) return false; // Disable for groups (v1 limitation)

        const threshold = this.options.virtualScrollThreshold ?? 100;
        return this.filteredOptions.length >= threshold;
    }

    /**
     * Check if any options have groups
     */
    private hasGroups(): boolean {
        return this.filteredOptions.some(option => {
            const group = this.getItemGroup(option);
            return group && group.trim() !== '';
        });
    }

    private renderDropdown(opts?: { preserveScroll?: boolean }): void {
        // Clean up any existing action button tooltips before re-rendering
        this.destroyAllActionButtonTooltips();
        // A re-render rebuilds the rows, detaching any info button the full-label
        // reveal is anchored to — dismiss it so it can't trail a stale anchor.
        this.hideLabelReveal();

        // Cascade tree rows derive their tristate from the checked-atom set — keep
        // it in sync with the (policy-projected) selection before rendering.
        this.refreshCascadeAtoms();

        // Check if we should use virtual scrolling
        if (this.shouldUseVirtualScroll()) {
            // Add virtual scroll class to dropdown for CSS adjustments
            this.dropdown.classList.add('ms__dropdown--virtual');
            this.renderDropdownVirtual();
            return;
        }
        // Remove virtual scroll class if not using it
        this.dropdown.classList.remove('ms__dropdown--virtual');

        // Clean up virtual scroll when switching to normal rendering
        // This prevents stale references when items drop below threshold (e.g., search with 0 results)
        if (this.virtualScroll) {
            this.virtualScroll.destroy();
            this.virtualScroll = null;
            this.optionsContainer = null;
        }

        // Normal rendering (existing code)
        let html = '';

        if (this.isLoading) {
            html += '<div class="ms__loader">';
            html += '<div class="pa-loader pa-loader--sm"></div>';
            html += `<div class="ms__loading-text">${this.options.loadingMessage}</div>`;
            html += '</div>';
            this.dropdownInner.innerHTML = html;
            return;
        }

        const actionsHTML = this.renderActionsHTML();
        const actionsAtBottom = this.options.actionsPosition === 'bottom';
        if (!actionsAtBottom) html += actionsHTML;

        // When virtual scroll is enabled but the current result count is below the
        // threshold (so we render normally), pin rows to the same fixed row height
        // the virtual list uses — otherwise the height visibly jumps as the result
        // count crosses the threshold (e.g. filtering from many matches to few).
        if (this.options.isVirtualScrollEnabled) {
            const optionHeight = this.scaledOptionHeight();
            html += `<div class="ms__options ms__options--fixed-height" style="--ms-option-height: ${optionHeight}px;">`;
        } else {
            html += '<div class="ms__options">';
        }

        if (this.filteredOptions.length === 0) {
            html += this.renderEmptyStateHTML();
        } else if (this.isTreeMode()) {
            this.treeNodes.forEach((node, index) => {
                html += this.renderTreeNode(node, index);
            });
        } else {
            if (this.options.isGroupsAllowed) {
                const groups = this.groupOptions(this.filteredOptions);
                // Each option's index must be its position in `filteredOptions`, not its position
                // within its group — `focusedIndex` is global, so per-group indices would make
                // every group's Nth item appear focused at once.
                const indexOf = new Map<T, number>();
                this.filteredOptions.forEach((opt, i) => indexOf.set(opt, i));
                Object.keys(groups).forEach(groupName => {
                    html += '<div class="ms__group">';
                    if (groupName !== '__ungrouped__') {
                        // `data-group` anchors the label for scrollToGroup() (public API).
                        const groupAttr = ` data-group="${this.escapeHtml(groupName)}"`;
                        // Check if custom group label callback is provided
                        if (this.options.renderGroupLabelContentCallback) {
                            const customContent = this.options.renderGroupLabelContentCallback(groupName);
                            if (customContent instanceof HTMLElement) {
                                // HTMLElement - wrap in group-label div
                                const wrapper = document.createElement('div');
                                wrapper.className = 'ms__group-label';
                                wrapper.dataset.group = groupName;
                                wrapper.appendChild(customContent);
                                html += wrapper.outerHTML;
                            } else {
                                // String (HTML or plain text)
                                html += `<div class="ms__group-label"${groupAttr}>${customContent}</div>`;
                            }
                        } else {
                            // Default rendering
                            html += `<div class="ms__group-label"${groupAttr}>${groupName}</div>`;
                        }
                    }
                    groups[groupName].forEach(option => {
                        html += this.renderOption(option, indexOf.get(option) ?? -1);
                    });
                    html += '</div>';
                });
            } else {
                this.filteredOptions.forEach((option, index) => {
                    html += this.renderOption(option, index);
                });
            }
        }

        html += '</div>';
        if (actionsAtBottom) html += actionsHTML;

        // A plain selection re-render (commit()) rebuilds the whole list via innerHTML,
        // which resets scroll to the top. Capture the current offset and restore it after
        // so selecting an item leaves the list where the user was. NOT done on filter/open
        // renders (default) — there the list content changed and scroll SHOULD reset (a
        // filtered result set starts at the top). The scroller is .ms__options in the
        // fullscreen sheet and .ms__dropdown-inner in the floating panel; capture both and
        // restore both (a write to the non-scrolling one clamps to 0, harmlessly).
        let prevInnerScroll = 0;
        let prevOptionsScroll = 0;
        if (opts?.preserveScroll) {
            prevInnerScroll = this.dropdownInner.scrollTop;
            prevOptionsScroll = (this.dropdownInner.querySelector('.ms__options') as HTMLElement | null)?.scrollTop ?? 0;
        }

        this.dropdownInner.innerHTML = html;

        if (opts?.preserveScroll) {
            this.dropdownInner.scrollTop = prevInnerScroll;
            const newOptions = this.dropdownInner.querySelector('.ms__options') as HTMLElement | null;
            if (newOptions) newOptions.scrollTop = prevOptionsScroll;
        }

        // Attach tooltips to action buttons after rendering
        this.attachActionButtonTooltips();
        // Attach tooltips to dropdown options
        this.attachOptionTooltips();
        // Flag clipped labels so their fullscreen info affordance appears.
        this.markTruncatedOptions();
        // Round the first/last rows so a focused row's outline follows the panel corners.
        this.applyEdgeOptionRadii();
    }

    /**
     * Round the OUTER corners of the row at the very top and the row at the very
     * bottom of the list so a focused/selected row's background — and crucially its
     * focus `outline`, which traces the row's OWN box and follows its border-radius
     * but NOT an ancestor's overflow clip — curves with the panel instead of poking a
     * square corner past it.
     *
     * Keyed off DOM order, not option index, so grouping works: when grouped the top
     * row is a `.ms__group-label` (not the first option, which sits below it), so we
     * round whichever element is physically first/last. VirtualScroll renders rows in
     * index order into one innerHTML, so DOM order == visual order there too.
     *
     * Logical corners (`border-start-*` / `border-end-*`) so it mirrors in RTL. A
     * space-taking vertical scrollbar occupies the inline-END gutter, so the END-side
     * corners stay square then (the panel's rounded end corner is the scrollbar
     * track's). The radius is 0 in the fullscreen sheet (that scope zeroes the var).
     */
    private applyEdgeOptionRadii(): void {
        const optionsEl = this.dropdownInner.querySelector('.ms__options') as HTMLElement | null;
        if (!optionsEl) return;
        // The scroll container is the options list itself (fullscreen / virtual, where it
        // sets its own overflow) or the inner wrapper (floating non-virtual). Pick whichever
        // actually scrolls; reading layout here forces a sync reflow so the metrics are fresh.
        const scroller = (optionsEl.scrollHeight > optionsEl.clientHeight + 1) ? optionsEl : this.dropdownInner;
        // Overlay scrollbars take no width, so both sides round; a classic scrollbar means
        // the END-side corners stay square. `offsetWidth - clientWidth` is the gutter.
        const roundEnd = (scroller.offsetWidth - scroller.clientWidth) <= 0;
        const radius = 'var(--ms-dropdown-inner-border-radius)';

        // All content rows in DOM (== visual) order. Reset any previously-set corners first
        // (option nodes get recycled by virtual scroll), then round the physical edges.
        const rows = Array.from(optionsEl.querySelectorAll<HTMLElement>('.ms__option, .ms__group-label'));
        rows.forEach((el) => {
            el.style.borderStartStartRadius = '';
            el.style.borderStartEndRadius = '';
            el.style.borderEndStartRadius = '';
            el.style.borderEndEndRadius = '';
        });

        // TOP edge = first content row: a group label when grouped, else the first option.
        const firstRow = rows[0];
        if (firstRow) {
            firstRow.style.borderStartStartRadius = radius;
            if (roundEnd) firstRow.style.borderStartEndRadius = radius;
        }
        // BOTTOM edge = last option (a group label never sits at the bottom of the list, so
        // walk back past any trailing label to the real last option).
        let lastRow: HTMLElement | undefined;
        for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i].classList.contains('ms__option')) { lastRow = rows[i]; break; }
        }
        if (lastRow) {
            lastRow.style.borderEndStartRadius = radius;
            if (roundEnd) lastRow.style.borderEndEndRadius = radius;
        }
    }

    /**
     * Render dropdown with virtual scrolling
     */
    private renderDropdownVirtual(): void {
        // Clean up any existing action button tooltips before re-rendering
        this.destroyAllActionButtonTooltips();

        // Only create HTML structure if virtual scroll doesn't exist yet
        if (!this.virtualScroll) {
            let html = '';

            // Render actions (Select All/Clear All) outside the virtual scroll container.
            const actionsHTML = this.renderActionsHTML();
            const actionsAtBottom = this.options.actionsPosition === 'bottom';
            if (!actionsAtBottom) html += actionsHTML;

            // Create options container for virtual scroll (sizing applied below).
            html += `<div class="ms__options ms__options--virtual" style="overflow-y: auto; position: relative;"></div>`;
            if (actionsAtBottom) html += actionsHTML;
            this.dropdownInner.innerHTML = html;

            // Get options container
            this.optionsContainer = this.dropdownInner.querySelector('.ms__options') as HTMLDivElement;
        }

        // Apply sizing on EVERY render, not just first creation — the container is built
        // once (guarded by !virtualScroll) but the presentation can change afterwards
        // (floating ⇄ fullscreen). Floating: a fixed maxHeight scroll box. Fullscreen: the
        // panel is a flex column, so flex-fill it and drop the fixed height. Also refresh
        // --ms-option-height so scaled rows match the JS itemHeight.
        this.applyVirtualOptionsSizing(this.optionsContainer);

        if (this.filteredOptions.length === 0) {
            // Destroy virtual scroll when showing empty message to prevent stale state
            if (this.virtualScroll) {
                this.virtualScroll.destroy();
                this.virtualScroll = null;
            }
            this.optionsContainer.innerHTML = this.renderEmptyStateHTML();
            return;
        }

        // Initialize or update virtual scroll (row height matches the scaled inline
        // --ms-option-height above so the scroll math and the CSS agree).
        const itemHeight = this.scaledOptionHeight();
        const bufferSize = this.options.virtualScrollBuffer ?? 10;

        // Defer initialization until container has dimensions
        requestAnimationFrame(() => {
            if (!this.optionsContainer) {
                return;
            }

            if (!this.virtualScroll) {
                this.virtualScroll = new VirtualScroll<T>({
                    container: this.optionsContainer,
                    itemHeight,
                    items: this.filteredOptions,
                    renderItem: (item, index) =>
                        this.isTreeMode()
                            ? this.renderTreeNode(this.treeNodes[index], index)
                            : this.renderOption(item, index),
                    bufferSize,
                    onVisibleRangeChange: () => {
                        // Re-attach tooltips to options recycled into view by virtual scrolling.
                        this.attachOptionTooltips();
                        // Re-flag clipped labels on the freshly-rendered rows.
                        this.markTruncatedOptions();
                        // Re-round the edge rows as they're recycled into/out of view.
                        this.applyEdgeOptionRadii();
                    }
                });
            } else {
                // Reused instance: pick up the (possibly rescaled) fullscreen row height.
                this.virtualScroll.setItemHeight(itemHeight);
                this.virtualScroll.setItems(this.filteredOptions);
            }

            // Attach tooltips to action buttons after rendering
            this.attachActionButtonTooltips();
        });
    }

    /**
     * Render the Select All / Clear All / custom action buttons row.
     * Returns the empty string if multiple-select is off or no buttons are configured.
     */
    /**
     * Default enabled/disabled state for the built-in actions, applied only when the consumer hasn't
     * set an explicit `isDisabled` / `getIsDisabledCallback`:
     * - `select-all` is disabled when it would add nothing (every selectable, non-disabled filtered
     *   option is already selected — this also covers an empty list).
     * - `clear-all` is disabled when nothing is selected.
     */
    private getBuiltInActionDisabled(action: string): boolean {
        if (action === 'select-all') {
            return !this.filteredOptions.some(option =>
                !this.getItemDisabled(option) && !this.selectedValues.has(String(this.getItemValue(option))));
        }
        if (action === 'clear-all') {
            return this.selectedValues.size === 0;
        }
        return false;
    }

    private renderActionsHTML(): string {
        const buttons = this.options.actionButtons;
        if (!this.options.isMultipleEnabled || !buttons || buttons.length === 0) return '';

        const position = this.options.actionsPosition === 'bottom' ? 'bottom' : 'top';
        const align = this.options.actionsAlign ?? 'stretch';

        const positionClass = ` ms__actions--${position}`;
        const stickyClass = this.options.isActionsSticky ? ' ms__actions--sticky' : '';
        const wrapClass = this.options.actionsLayout === 'wrap' ? ' ms__actions--wrap' : '';
        const alignClass = ` ms__actions--align-${align}`;

        // Group visible buttons by 1-based row (default 1), preserving the original index for
        // data-button-index so click/tooltip lookups still resolve to the right config entry.
        const rows = new Map<number, string[]>();
        buttons.forEach((button, buttonIndex) => {
            const isVisible = button.getIsVisibleCallback ? button.getIsVisibleCallback(this) : (button.isVisible ?? true);
            if (!isVisible) return;

            // Precedence: explicit dynamic callback > explicit static isDisabled > built-in default
            // (so the built-in select-all/clear-all enabled state only applies when the consumer
            // hasn't said otherwise).
            let isDisabled: boolean;
            if (button.getIsDisabledCallback) {
                isDisabled = button.getIsDisabledCallback(this);
            } else if (button.isDisabled !== undefined) {
                isDisabled = button.isDisabled;
            } else {
                isDisabled = this.getBuiltInActionDisabled(button.action);
            }
            const disabledAttr = isDisabled ? ' disabled' : '';

            const text = button.getTextCallback ? button.getTextCallback(this) : button.text;

            let cssClass = '';
            if (button.getClassCallback) {
                const extra = this.classSuffix(button.getClassCallback(this));
                if (extra) cssClass = ` ${extra}`;
            } else if (button.cssClass) {
                cssClass = ` ${button.cssClass}`;
            }

            const rowNum = Math.max(1, Math.floor(button.row ?? 1));
            const btnHTML = `<button type="button"${disabledAttr} class="ms__action-btn${cssClass}" data-action="${button.action}" data-button-index="${buttonIndex}">${text}</button>`;
            if (!rows.has(rowNum)) rows.set(rowNum, []);
            rows.get(rowNum)!.push(btnHTML);
        });

        if (rows.size === 0) return '';

        // Always emit rows in ascending row order. For the bottom position, CSS flips the visual
        // stacking (column-reverse) so row 1 still lands at the panel's outer edge.
        const rowsHTML = Array.from(rows.keys())
            .sort((a, b) => a - b)
            .map(rowNum => `<div class="ms__actions-row" data-row="${rowNum}">${rows.get(rowNum)!.join('')}</div>`)
            .join('');

        return `<div class="ms__actions${positionClass}${stickyClass}${wrapClass}${alignClass}">${rowsHTML}</div>`;
    }

    private renderOption(option: T, index: number): string {
        const value = this.getItemValue(option);
        const displayValue = this.getItemDisplayValue(option);
        const icon = this.getItemIcon(option);
        const subtitle = this.getItemSubtitle(option);
        const disabled = this.getItemDisabled(option);

        const isSelected = this.selectedValues.has(String(value));
        const isFocused = index === this.focusedIndex;
        const isMatched = this.matchingIndices.has(index);

        const classes = ['ms__option'];
        if (isSelected) classes.push('ms__option--selected');
        if (isFocused) classes.push('ms__option--focused');
        if (isMatched) classes.push('ms__option--matched');
        if (disabled) classes.push('ms__option--disabled');

        const checkboxAlignAttr = this.options.checkboxAlign && this.options.checkboxAlign !== 'center'
            ? ` data-checkbox-align="${this.options.checkboxAlign}"`
            : '';

        let html = `<div class="${classes.join(' ')}" data-value="${value}" data-index="${index}"${checkboxAlignAttr}>`;

        if (this.options.isCheckboxesShown && this.options.isMultipleEnabled) {
            html += `<input type="checkbox" class="ms__checkbox" ${isSelected ? 'checked' : ''} ${disabled ? 'disabled' : ''}>`;
        }

        html += '<div class="ms__option-content">';

        // Check if custom render callback is provided
        if (this.options.renderOptionContentCallback) {
            const context: OptionContentRenderContext = {
                index,
                isSelected,
                isFocused,
                isMatched,
                isDisabled: disabled,
                ...presentationContext(this.presentationMode),
                isTreeNode: false
            };
            html += this.toHtml(this.options.renderOptionContentCallback(option, context));
        } else {
            // Default rendering
            if (icon) {
                html += `<span class="ms__option-icon">${icon}</span>`;
            }

            html += '<div class="ms__option-text">';
            html += `<div class="ms__option-title">${this.highlightMatch(displayValue, this.searchTerm)}</div>`;

            if (subtitle) {
                html += `<div class="ms__option-subtitle">${subtitle}</div>`;
            }

            html += '</div>';
        }

        html += this.renderOptionInfoButton();
        html += '</div>';
        html += '</div>';

        return html;
    }

    /**
     * Trailing info affordance for an option row, emitted only for the fullscreen
     * overlay. CSS keeps it hidden until `markTruncatedOptions()` tags the row
     * `.ms__option--truncated`, so it appears only when the label is actually clipped.
     * Tapping it reveals the full label — the touch substitute for the hover option
     * tooltip, which never fires on touch (the very devices that get fullscreen).
     * `tabindex="-1"` keeps it out of the tab order; the search input owns keyboarding.
     */
    private renderOptionInfoButton(): string {
        if (this.presentationMode !== 'fullscreen') return '';
        return `<button type="button" class="ms__option-info" tabindex="-1" aria-label="Show full label"></button>`;
    }

    /**
     * Render a single tree-mode row. Separate from `renderOption`: a tree row is
     * indented by its depth (via the `--ms-tree-depth` custom property) and
     * tagged branch/leaf, but otherwise carries the same selection/checkbox/
     * icon/subtitle content. The tree is always fully expanded, so there is no
     * chevron/toggle — every node is just a normal, selectable option.
     */
    private renderTreeNode(node: LTreeNode<T>, index: number): string {
        const option = node.data as T;
        const value = this.getItemValue(option);
        const displayValue = this.getItemDisplayValue(option);
        const icon = this.getItemIcon(option);
        const subtitle = this.getItemSubtitle(option);
        const disabled = this.getItemDisabled(option);

        // In cascade mode the checked/indeterminate state is derived from the
        // node's subtree, not directly from `selectedValues` (which holds the
        // policy-projected emitted values). Elsewhere it's a plain membership test.
        const cascade = this.isCascadeMode() && this.cascadeIndex;
        const cascadeState = cascade
            ? nodeCheckState(this.cascadeIndex!, node, this.cascadeCheckedAtoms)
            : null;
        const isSelected = cascade ? cascadeState === 'checked' : this.selectedValues.has(String(value));
        const isIndeterminate = cascadeState === 'indeterminate';
        const isFocused = index === this.focusedIndex;
        // Navigate mode keeps the whole tree visible and highlights matches in place
        // (matchingIndices is empty in filter mode, so this is false there).
        const isMatched = this.matchingIndices.has(index);
        const selectable = node.isSelectable !== false;
        const level = node.level ?? 1;
        const depth = Math.max(0, level - 1);

        const classes = ['ms__option', 'ms__option--tree'];
        classes.push(node.hasChildren ? 'ms__option--tree-branch' : 'ms__option--tree-leaf');
        if (isSelected) classes.push('ms__option--selected');
        if (isIndeterminate) classes.push('ms__option--indeterminate');
        if (isFocused) classes.push('ms__option--focused');
        if (isMatched) classes.push('ms__option--matched');
        if (disabled) classes.push('ms__option--disabled');
        // Non-selectable nodes look normal (NOT greyed like disabled) but carry a
        // hook class and drop their checkbox so they read as structure, not choices.
        if (!selectable) classes.push('ms__option--tree-unselectable');

        const checkboxAlignAttr = this.options.checkboxAlign && this.options.checkboxAlign !== 'center'
            ? ` data-checkbox-align="${this.options.checkboxAlign}"`
            : '';

        const selectableAttr = selectable ? '' : ' data-selectable="false"';
        let html = `<div class="${classes.join(' ')}" data-value="${value}" data-index="${index}" data-path="${node.path}" data-level="${level}" style="--ms-tree-depth: ${depth};"${checkboxAlignAttr}${selectableAttr}>`;

        if (this.options.isCheckboxesShown && this.options.isMultipleEnabled && selectable) {
            // Indeterminate is a pure CSS state (the checkbox is `appearance: none`,
            // so no native `input.indeterminate` needed) — virtual-scroll-safe.
            const checkboxClass = isIndeterminate ? 'ms__checkbox ms__checkbox--indeterminate' : 'ms__checkbox';
            const ariaChecked = isIndeterminate ? ' aria-checked="mixed"' : '';
            html += `<input type="checkbox" class="${checkboxClass}" ${isSelected ? 'checked' : ''}${ariaChecked} ${disabled ? 'disabled' : ''}>`;
        }

        html += '<div class="ms__option-content">';

        if (this.options.renderOptionContentCallback) {
            const context: OptionContentRenderContext = {
                index,
                isSelected,
                isFocused,
                isMatched,
                isDisabled: disabled,
                ...presentationContext(this.presentationMode),
                // Tree metadata — lets the callback branch on depth / branch-vs-leaf /
                // tristate without re-deriving any of it from the raw data item.
                isTreeNode: true,
                isBranch: node.hasChildren,
                isLeaf: !node.hasChildren,
                childCount: Object.keys(node.children).length,
                level,
                depth,
                path: node.path,
                isSelectable: selectable,
                isIndeterminate
            };
            html += this.toHtml(this.options.renderOptionContentCallback(option, context));
        } else {
            if (icon) {
                html += `<span class="ms__option-icon">${icon}</span>`;
            }
            html += '<div class="ms__option-text">';
            html += `<div class="ms__option-title">${this.highlightMatch(displayValue, this.searchTerm)}</div>`;
            if (subtitle) {
                html += `<div class="ms__option-subtitle">${subtitle}</div>`;
            }
            html += '</div>';
        }

        html += this.renderOptionInfoButton();
        html += '</div>';
        html += '</div>';

        return html;
    }

    /**
     * Empty-dropdown content. When "add new" is enabled (isAddNewAllowed) AND the user has typed
     * a non-empty search term, show a clickable "add new" prompt instead of the plain emptyMessage —
     * choosing it (click via handleDropdownClick, or Enter via the keydown handler) runs handleAddNew.
     * Otherwise fall back to the emptyMessage.
     */
    private renderEmptyStateHTML(): string {
        if (this.isAddNewPromptShown()) {
            const value = (this.searchTerm || '').trim();
            // Pending: an async addNewCallback is running — spinner + "Adding …", not clickable.
            if (this.addNewPending) {
                return `<div class="ms__add-new ms__add-new--loading" aria-busy="true">`
                    + `<span class="ms__add-new-spinner" aria-hidden="true"></span>`
                    + `<span class="ms__add-new-text">${this.getAddNewPendingText(value)}</span>`
                    + `</div>`;
            }
            const focused = this.addNewFocused ? ' ms__add-new--focused' : '';
            return `<div class="ms__add-new${focused}" role="button" data-action="add-new">`
                + `<span class="ms__add-new-icon" aria-hidden="true"></span>`
                + `<span class="ms__add-new-text">${this.getAddNewText(value)}</span>`
                + `</div>`;
        }
        return `<div class="ms__empty">${this.options.emptyMessage}</div>`;
    }

    /** True when the empty dropdown is currently showing the clickable "add new" prompt. */
    private isAddNewPromptShown(): boolean {
        return !!this.options.isAddNewAllowed
            && this.filteredOptions.length === 0
            && !!(this.searchTerm || '').trim();
    }

    /**
     * Resolve the "add new" prompt label for the typed text. Priority: getAddNewTextCallback
     * (returns plain text — fully escaped here) → addNewText template (trusted config string;
     * only the `{value}` substitution is escaped) → the default `Add "{value}"`.
     */
    private getAddNewText(value: string): string {
        if (this.options.getAddNewTextCallback) {
            return this.escapeHtml(this.options.getAddNewTextCallback(value));
        }
        const template = this.options.addNewText ?? 'Add "{value}"';
        return template.replace(/\{value\}/g, this.escapeHtml(value));
    }

    /** Pending-prompt label shown (with a spinner) while an async addNewCallback runs. */
    private getAddNewPendingText(value: string): string {
        const template = this.options.addNewPendingText ?? 'Adding "{value}"…';
        return template.replace(/\{value\}/g, this.escapeHtml(value));
    }

    /** Minimal HTML entity escape for untrusted text spliced into an innerHTML string. */
    private escapeHtml(value: string): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private highlightMatch(text: string, searchTerm: string): string {
        if (!searchTerm) return text;

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    private groupOptions(options: T[]): Record<string, T[]> {
        const groups: Record<string, T[]> = {};

        options.forEach(option => {
            const groupName = this.getItemGroup(option) || '__ungrouped__';
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(option);
        });

        return groups;
    }

    /** Whether the input currently functions as a usable search field (drives placeholder wording). */
    private get isSearchUsable(): boolean {
        return !!this.options.isSearchEnabled
            && this.options.searchInputMode !== 'readonly'
            && this.options.searchInputMode !== 'hidden';
    }

    /**
     * Resolve the closed-state input placeholder for the current data/search state.
     * Priority: explicit no-data placeholder (when the list is empty) → "pick" prompt when
     * search is unusable → the search placeholder.
     */
    private getPlaceholderText(): string {
        if (this.options.noDataPlaceholder && this.allOptions.length === 0) {
            return this.options.noDataPlaceholder;
        }
        if (!this.isSearchUsable) {
            return this.options.selectPlaceholder || this.getSearchPlaceholder();
        }
        return this.getSearchPlaceholder();
    }

    /**
     * The search field placeholder. An explicit `searchPlaceholder` always wins and stays
     * fixed. Otherwise the default is "Search..." — except when the in-overlay mode toggle
     * is enabled (`isSearchModeToggleShown`), where it becomes mode-aware so the field labels
     * the current behavior: "Search…" in navigate mode, "Filter…" in filter mode. Refreshed
     * on a live mode switch (see setSearchModeLive → refreshSearchPlaceholder).
     */
    private getSearchPlaceholder(): string {
        if (this.options.searchPlaceholder) return this.options.searchPlaceholder;
        if (this.options.isSearchModeToggleShown) {
            return (this.options.searchMode || 'filter') === 'navigate' ? 'Search…' : 'Filter…';
        }
        return 'Search...';
    }

    /** Re-apply the (possibly mode-aware) placeholder to the live inputs after a mode switch. */
    private refreshSearchPlaceholder(): void {
        const ph = this.getPlaceholderText();
        if (this.input) this.input.placeholder = ph;
        if (this.fullscreenSearchInput) this.fullscreenSearchInput.placeholder = ph;
    }

    private renderBadges(): void {
        // Keep the inline clear (✕) in sync with the current selection on every refresh.
        this.updateClearButton();

        // Clean up existing tooltips before re-rendering
        this.destroyAllBadgeTooltips();

        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        if (!this.options.isMultipleEnabled) {
            this.badgesContainer.innerHTML = '';
            this.counter.style.display = 'none';

            let selectedLabel: string | undefined;
            if (selectedOptions[0]) {
                // Check if custom render callback is provided
                if (this.options.renderSelectedContentCallback) {
                    selectedLabel = this.options.renderSelectedContentCallback(selectedOptions[0]);
                } else {
                    selectedLabel = this.getItemDisplayValue(selectedOptions[0]);
                }
            }

            if (!this.#isOpen && count > 0 && selectedOptions.length > 0) {
                this.input.value = selectedLabel!;
            } else if (!this.#isOpen) {
                this.input.value = '';
            }
            return;
        }

        let effectiveMode = this.options.badgesDisplayMode;
        const exceedsThreshold = this.options.badgesThreshold !== null && count > this.options.badgesThreshold;

        // Preserve 'none' mode even when threshold exceeded (user explicitly wants no display)
        if (exceedsThreshold && effectiveMode !== 'none') {
            effectiveMode = this.options.badgesThresholdMode || 'count';
        }

        if (!this.#isOpen) {
            if (count > 0 && effectiveMode === 'count') {
                const countText = this.options.getCounterCallback ? this.options.getCounterCallback(count) : `${count} selected`;
                this.input.placeholder = countText;
            } else {
                this.input.placeholder = this.getPlaceholderText();
            }
        }

        if (this.options.isCounterShown && count > 0) {
            // Counter counts the rolled-up cover (the branches a person picked),
            // not the policy-expanded emitted values — so `all`/`leaves` don't
            // balloon it. Under rolled-up this equals `count`, so nothing changes.
            const counterItems = this.counterSelection();
            const counterCount = counterItems.length;
            this.counter.textContent = `[${counterCount}]`;
            this.counter.title = this.buildCounterTooltip(counterItems);
            this.counter.style.display = counterCount > 0 ? '' : 'none';
        } else {
            this.counter.title = '';
            this.counter.style.display = 'none';
        }

        // None mode: no display in badges area
        if (effectiveMode === 'none') {
            this.badgesContainer.innerHTML = '';
            return;
        }

        if (effectiveMode === 'badges') {
            this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;
            this.badgesContainer.innerHTML = selectedOptions
                .map(option => this.renderBadgeHTML(option, { displayMode: 'badges', isInPopover: false }))
                .join('');
        } else if (effectiveMode === 'partial') {
            // Partial mode: show limited badges + "+X more" badge
            this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;

            const maxVisible = this.options.badgesMaxVisible || 3;
            const visibleOptions = selectedOptions.slice(0, maxVisible);
            const remainingCount = count - maxVisible;

            const visibleBadgesHtml = visibleOptions
                .map(option => this.renderBadgeHTML(option, { displayMode: 'partial', isInPopover: false }))
                .join('');

            let moreBadgeHtml = '';
            if (remainingCount > 0) {
                const moreText = this.options.getCounterCallback
                    ? this.options.getCounterCallback(count, remainingCount)
                    : `+${remainingCount} more`;

                moreBadgeHtml = `
                    <div class="ms__badge ms__badge--counter ms__badge--more" data-action="show-selected">
                        <span class="ms__badge-text">${moreText}</span>
                        <button type="button" class="ms__badge-remove" data-action="remove-hidden" aria-label="Remove ${remainingCount} hidden items"></button>
                    </div>
                `;
            }

            this.badgesContainer.innerHTML = visibleBadgesHtml + moreBadgeHtml;
        } else if (effectiveMode === 'compact') {
            // Compact mode: show first item + count in a single removable badge
            this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;
            if (count > 0) {
                const firstItem = selectedOptions[0];
                const firstItemText = this.getItemBadgeDisplayValue(firstItem);
                const remainingCount = count - 1;

                // Build compact text: "FirstItem (+X more)" or just "FirstItem" if only one
                let compactText = firstItemText;
                if (remainingCount > 0) {
                    const moreText = this.options.getCounterCallback
                        ? this.options.getCounterCallback(count, remainingCount)
                        : `+${remainingCount} more`;
                    compactText = `${firstItemText} (${moreText})`;
                }

                this.badgesContainer.innerHTML = `
                    <div class="ms__badge" data-action="show-selected">
                        <span class="ms__badge-text">${compactText}</span>
                        <button type="button" class="ms__badge-remove" data-action="clear-count" aria-label="Clear all selections"></button>
                    </div>
                `;
            } else {
                this.badgesContainer.innerHTML = '';
            }
        } else {
            // Count mode
            this.badgesContainer.className = `ms__badges ms__badges--${this.effectiveBadgesPosition}`;
            if (count > 0) {
                const countText = this.options.getCounterCallback ? this.options.getCounterCallback(count) : `${count} selected`;
                this.badgesContainer.innerHTML = `
                    <div class="ms__badge ms__badge--counter" data-action="show-selected">
                        <span class="ms__badge-text">${countText}</span>
                        <button type="button" class="ms__badge-remove" data-action="clear-count" aria-label="Clear all selections"></button>
                    </div>
                `;
            } else {
                this.badgesContainer.innerHTML = '';
            }
        }

        // Attach tooltips after rendering badges
        this.attachBadgeTooltips();
    }

    private attachEvents(): void {
        // Toggle dropdown when clicking input
        this.input.addEventListener('mousedown', (e) => {
            e.stopPropagation();

            if (this.#isOpen) {
                // Close if already open and prevent focus from reopening
                this.justClosedViaClick = true;
                this.close();
                setTimeout(() => {
                    this.justClosedViaClick = false;
                }, 0);
            } else {
                // Opening into the fullscreen overlay: never let the opening tap focus the
                // underlying <input> (it's covered by the sheet). Keyboard-off default → no
                // field takes focus, so the soft keyboard stays down. Autofocus → enterFullscreen
                // focuses the sheet's OWN search; without this preventDefault the input's native
                // focus lands AFTER that and steals it back (caret in the hidden input, keyboard
                // up but the visible search unfocused). preventDefault blocks only focus/selection,
                // not the click that follows.
                if (this.presentationMode === 'fullscreen') {
                    e.preventDefault();
                }
                // Open if closed (don't rely on focus event as input might already be
                // focused). open() itself arms justOpenedViaClick for one tick, so the
                // click that follows this mousedown won't be misread as an outside-click.
                this.open();
            }
        });

        this.input.addEventListener('focus', () => {
            // Open on focus only if not already open and didn't just close via click
            // This handles keyboard navigation (Tab key)
            if (!this.#isOpen && !this.justClosedViaClick) {
                this.open();
            }
        });
        this.input.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;

            // Auto-open dropdown when user starts typing (if search is enabled)
            if (this.options.isSearchEnabled && !this.#isOpen) {
                this.open();
            }

            this.handleSearch(value);
        });
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Delay click-outside handler to avoid immediate close
        this.documentClickHandler = (e: MouseEvent) => this.handleClickOutside(e);
        setTimeout(() => {
            document.addEventListener('click', this.documentClickHandler!);
        }, 0);

        // Join the single-active-overlay group (scoped by `overlay-group`, default ungrouped):
        // when another KM overlay in the same group (or an external popover) opens, close this
        // dropdown. open() broadcasts the reverse.
        this.overlayCoord = registerOverlay(() => this.close(), this.options.overlayGroup || undefined);

        // Document-level Escape handler for closing popover when input doesn't have focus
        this.documentKeydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.showSelectedPopover) {
                e.preventDefault();
                this.hideSelectedPopover();
            }
        };
        document.addEventListener('keydown', this.documentKeydownHandler);

        // In the fullscreen overlay, a tap on an option must not move focus. Each row
        // holds a focusable checkbox and the sheet's search is a text input; letting the
        // tap shift focus either blurs the search (dropping the soft keyboard mid-search)
        // or, combined with the underlying control input, pops the keyboard when it should
        // stay down. preventDefault on mousedown blocks the focus/selection the tap would
        // cause while leaving the click (which drives selection) intact. Floating keeps its
        // native focus behavior (checkbox → input refocus in handleDropdownClick). The
        // guard is scoped to option rows so header controls (search, close) still focus.
        this.dropdown.addEventListener('mousedown', (e) => {
            if (this.presentationMode !== 'fullscreen') return;
            const onOption = (e.target as HTMLElement).closest('.ms__option');
            if (onOption) e.preventDefault();
        });

        // Scroll-to-dismiss: a real drag on the options list means "let me browse" —
        // blur the sheet search so the soft keyboard tucks away and the full list shows.
        // touchmove is a genuine user gesture (programmatic scrollIntoView from typing /
        // match-stepping never fires it), so auto-scroll-to-match won't wrongly dismiss
        // the keyboard mid-type. Fullscreen only; passive so it never blocks the scroll.
        this.dropdown.addEventListener('touchmove', (e) => {
            if (this.presentationMode !== 'fullscreen') return;
            if ((e.target as HTMLElement).closest('.ms__options')) this.fullscreenSearchInput?.blur();
        }, { passive: true });

        this.dropdown.addEventListener('click', (e) => this.handleDropdownClick(e));

        // Prevent page scroll when scrolling dropdown at boundaries
        this.dropdownInner.addEventListener('wheel', (e: WheelEvent) => {
            // In virtual scroll mode, the .ms__options container handles scrolling, not the dropdown
            // Skip this handler to let wheel events reach the virtual scroll container
            if (this.virtualScroll) {
                return;
            }

            const target = e.currentTarget as HTMLElement;
            const atTop = target.scrollTop === 0;
            const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight;

            // Prevent scroll propagation at boundaries
            if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                e.preventDefault();
            }
            e.stopPropagation();
        }, { passive: false });

        // Prevent click propagation for show-selected action (in badges container)
        this.badgesContainer.addEventListener('mousedown', (e) => {
            const showSelectedBtn = (e.target as HTMLElement).closest('[data-action="show-selected"]');
            if (showSelectedBtn && !this.showSelectedPopover) {
                e.stopPropagation();
            }
        });
        this.badgesContainer.addEventListener('click', (e) => this.handleBadgeClick(e));

        // Prevent click propagation for count badge to avoid immediate popover close
        this.counter.addEventListener('mousedown', (e) => {
            if (!this.showSelectedPopover) {
                e.stopPropagation();
            }
        });
        this.counter.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSelectedPopover();
        });

        this.selectedPopover.addEventListener('click', (e) => this.handleSelectedPopoverClick(e));
    }

    private async handleSearch(value: string): Promise<void> {
        this.searchTerm = value;
        // A fresh keystroke drops the "add new" prompt highlight — arrows re-focus it.
        this.addNewFocused = false;

        // If search is disabled, don't filter options
        if (!this.options.isSearchEnabled) {
            return;
        }

        // Apply beforeSearchCallback if provided (for BOTH async and local search)
        let processedValue = value;
        if (this.options.beforeSearchCallback) {
            const result = this.options.beforeSearchCallback(value);
            if (result === null) {
                // beforeSearchCallback returned null - don't search, show all options
                dataLogger.debug(`[${this.instanceId}] beforeSearchCallback blocked search for term:`, value);
                this.abortInFlightSearch();
                this.matchingIndices.clear();
                if (this.isTreeMode()) {
                    this.searchTerm = '';
                    this.rebuildTreeVisible();
                } else {
                    this.filteredOptions = [...this.allOptions];
                }
                this.renderDropdown();
                return;
            }
            processedValue = result;
            if (processedValue !== value) {
                dataLogger.debug(`[${this.instanceId}] beforeSearchCallback transformed: "${value}" -> "${processedValue}"`);
            }
        }

        if (this.options.searchCallback) {
            // ASYNC SEARCH PATH
            // Check minimum search length
            if (processedValue.length < this.options.minSearchLength) {
                this.abortInFlightSearch(); // No longer want any in-flight results
                this.isLoading = false; // Stop loading state
                if (this.options.isKeepOptionsOnSearch) {
                    // Keep showing initial options (full tree in tree mode).
                    if (this.isTreeMode()) this.rebuildTreeVisibleFromMatches(this.allOptions);
                    else this.filteredOptions = [...this.allOptions];
                    dataLogger.debug(`[${this.instanceId}] Search term below minimum, showing ${this.allOptions.length} initial options`);
                } else {
                    // Clear options (old behavior)
                    this.filteredOptions = [];
                    if (this.isTreeMode()) this.treeNodes = [];
                }
                this.matchingIndices.clear();
                this.renderDropdown();
                return;
            }

            // Debounce the (potentially network-backed) callback. A pending timer from a
            // previous keystroke is always cancelled, so only the last input in a burst fires
            // a request. searchDebounce defaults to 0 → callback runs immediately as before.
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = undefined;
            }
            const debounceMs = this.options.searchDebounce || 0;
            if (debounceMs > 0) {
                this.searchDebounceTimer = setTimeout(() => {
                    this.searchDebounceTimer = undefined;
                    // Drop this run if a newer keystroke superseded the value while we waited.
                    if (this.searchTerm === value) {
                        void this.performAsyncSearch(value, processedValue);
                    }
                }, debounceMs);
            } else {
                await this.performAsyncSearch(value, processedValue);
            }
        } else {
            // LOCAL SEARCH PATH
            if (this.isTreeMode()) {
                if ((this.options.searchMode || 'filter') === 'navigate') {
                    // NAVIGATE MODE: keep the whole tree visible and jump between matches
                    // (parity with the flat-list navigate branch below).
                    const firstMatchIndex = this.rebuildTreeVisibleForNavigate();
                    if (!this.searchTerm.trim()) {
                        this.focusedIndex = -1; // empty box: nothing focused (parity with open())
                    } else if (firstMatchIndex >= 0) {
                        this.focusedIndex = firstMatchIndex;
                    } // else: term with no matches — keep previous focus (flat-navigate parity)
                    this.renderDropdown();
                    if (this.focusedIndex >= 0) this.scrollToFocused();
                    this.updateFullscreenNav();
                    return;
                }
                // FILTER MODE (default): narrow the hierarchy to matches + their ancestors
                // rather than the flat option list, keeping indentation coherent.
                this.rebuildTreeVisible();
                this.matchingIndices.clear();
                // Auto-focus the first row only once there's a term (parity with open() and
                // the flat branches) — an empty box leaves nothing focused.
                this.focusedIndex = this.searchTerm.trim() && this.filteredOptions.length > 0 ? 0 : -1;
                this.renderDropdown();
                return;
            }
            if (!processedValue) {
                // Empty search - show all options. Leave nothing focused (focusedIndex -1),
                // matching a fresh open(): auto-focusing the first row is only meaningful once
                // the user types (so Enter picks the top result). Without this, calling
                // handleSearch('') — e.g. the search-mode toggle, or clearing the box — would
                // highlight the first row on an empty box, which reads as an accidental selection.
                this.filteredOptions = [...this.allOptions];
                this.matchingIndices.clear();
                this.focusedIndex = -1;
            } else {
                const searchMode = this.options.searchMode || 'filter';
                const lowerSearch = processedValue.toLowerCase();

                if (searchMode === 'filter') {
                    // FILTER MODE: Hide non-matching options (current behavior)
                    this.filteredOptions = this.allOptions.filter(option => {
                        const searchValue = this.getItemSearchValue(option).toLowerCase();
                        return searchValue.includes(lowerSearch);
                    });
                    this.matchingIndices.clear(); // Not used in filter mode
                    // Auto-focus first result
                    this.focusedIndex = this.filteredOptions.length > 0 ? 0 : -1;
                    dataLogger.debug(`[${this.instanceId}] Filter mode: ${this.filteredOptions.length} matches for "${processedValue}"`);
                } else {
                    // NAVIGATE MODE: Keep all options visible, jump to first match, highlight all matches
                    this.filteredOptions = [...this.allOptions];
                    this.matchingIndices.clear();

                    // Find all matching indices and first match
                    let firstMatchIndex = -1;
                    this.allOptions.forEach((option, index) => {
                        const searchValue = this.getItemSearchValue(option).toLowerCase();
                        if (searchValue.includes(lowerSearch)) {
                            this.matchingIndices.add(index);
                            if (firstMatchIndex === -1) {
                                firstMatchIndex = index;
                            }
                        }
                    });

                    // Keep previous focus if no match found (requirement: "keep previous focus")
                    if (firstMatchIndex >= 0) {
                        this.focusedIndex = firstMatchIndex;
                        dataLogger.debug(`[${this.instanceId}] Navigate mode: ${this.matchingIndices.size} matches, jumped to index ${firstMatchIndex}`);
                    } else {
                        // No match found - keep previous focusedIndex
                        dataLogger.debug(`[${this.instanceId}] Navigate mode: No matches found, keeping previous focus`);
                    }
                }
            }
            this.renderDropdown();
            // Scroll to focused item in navigate mode
            if (this.options.searchMode === 'navigate' && this.focusedIndex >= 0) {
                this.scrollToFocused();
            }
            this.updateFullscreenNav();
        }
    }

    /** Abort the search request currently in flight, if any. The aborted request's results
     *  are then ignored (and the consumer's `searchCallback` can short-circuit its fetch via
     *  the `AbortSignal` it was handed). */
    private abortInFlightSearch(): void {
        if (this.searchAbortController) {
            this.searchAbortController.abort();
            this.searchAbortController = undefined;
        }
    }

    /**
     * Invoke the async `searchCallback` and apply its results. Split out of `handleSearch`
     * so it can be called immediately or after the debounce timer.
     *
     * Any request still in flight is aborted before a new one starts, so a slow earlier
     * request can't overwrite a newer one — and consumers that wire the passed `AbortSignal`
     * into their fetch get the request actually cancelled, not just ignored. The
     * `aborted` / `searchTerm === value` guards drop superseded or out-of-order responses.
     */
    private async performAsyncSearch(value: string, processedValue: string): Promise<void> {
        // Cancel any previous in-flight request; only the latest query should win.
        this.abortInFlightSearch();
        const controller = new AbortController();
        this.searchAbortController = controller;

        this.isLoading = true;
        this.renderDropdown();
        dataLogger.debug(`[${this.instanceId}] Loading data for search term:`, processedValue);

        try {
            const results = await this.options.searchCallback!(processedValue, controller.signal);

            // Ignore results from a request that was aborted or superseded by a newer term.
            if (controller.signal.aborted || this.searchTerm !== value) return;

            const searchResults = results || [];

            // Show the results. In tree mode, rebuild the hierarchy from the
            // returned matches (adding ancestors) so external search renders as a
            // coherent tree instead of a flat, mis-indexed list.
            if (this.isTreeMode()) {
                this.rebuildTreeVisibleFromMatches(searchResults);
            } else {
                this.filteredOptions = [...searchResults];
            }
            this.isLoading = false;
            this.matchingIndices.clear(); // Async search doesn't use matching indices

            // Auto-focus first option if search is enabled and there are results
            this.focusedIndex = (this.options.isSearchEnabled && this.filteredOptions.length > 0) ? 0 : -1;
            this.renderDropdown();
            dataLogger.debug(`[${this.instanceId}] Loaded ${searchResults.length} results`);
        } catch (error) {
            // Aborted requests are expected — a newer request owns the state now, so bail quietly.
            if (controller.signal.aborted) return;

            dataLogger.error(`[${this.instanceId}] Error loading data:`, error);
            this.isLoading = false;
            if (this.options.isKeepOptionsOnSearch) {
                // Show initial options on error (full tree in tree mode).
                if (this.isTreeMode()) this.rebuildTreeVisibleFromMatches(this.allOptions);
                else this.filteredOptions = [...this.allOptions];
            } else {
                this.filteredOptions = [];
                if (this.isTreeMode()) this.treeNodes = [];
            }
            this.matchingIndices.clear();
            this.renderDropdown();
        } finally {
            // Release the controller only if it's still the active one (a newer request may
            // have already replaced it).
            if (this.searchAbortController === controller) {
                this.searchAbortController = undefined;
            }
        }
    }

    private handleKeydown(e: KeyboardEvent): void {
        // Consumer keyboard hook: runs before ALL built-in handling (open or closed). Returning
        // true marks the key fully handled — the consumer owns preventDefault and we run none of
        // our own logic for it. Anything else falls through to the defaults below.
        if (this.options.keydownCallback) {
            const handled = this.options.keydownCallback({
                event: e,
                key: e.key,
                isOpen: this.#isOpen,
                presentation: this.presentationMode,
                searchTerm: this.searchTerm,
                focusedIndex: this.focusedIndex,
                focusedOption: (this.focusedIndex >= 0 ? this.filteredOptions[this.focusedIndex] : null) ?? null,
                filteredOptions: this.filteredOptions,
                selectedValues: [...this.selectedValues],
                controller: this.getKeyboardController(),
            });
            if (handled === true) return;
        }

        if (!this.#isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.open();
            }
            return;
        }

        // If search is disabled, block all printable characters except navigation keys
        if (!this.options.isSearchEnabled) {
            const isPrintableChar = e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete';
            const isNavigationKey = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Enter', 'Escape', 'Tab'].includes(e.key);

            if (isPrintableChar && !isNavigationKey) {
                e.preventDefault();
                return;
            }
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (this.isAddNewPromptShown()) {
                    // The "add new" prompt is the only actionable row — arrow to highlight it.
                    this.focusAddNewPrompt();
                } else if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd+Down: Jump to next match (navigate mode only)
                    this.focusNextMatch();
                } else {
                    // Down: Next option
                    this.focusNext();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (this.isAddNewPromptShown()) {
                    this.focusAddNewPrompt();
                } else if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd+Up: Jump to previous match (navigate mode only)
                    this.focusPreviousMatch();
                } else {
                    // Up: Previous option
                    this.focusPrevious();
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (this.focusedIndex >= 0) {
                    this.toggleOption(this.filteredOptions[this.focusedIndex]);
                } else if (
                    this.options.isAddNewAllowed
                    && this.filteredOptions.length === 0
                    && (this.searchTerm || '').trim()
                ) {
                    // No matches + typed text: commit the "add new" prompt (mirrors clicking it).
                    // Works with or without addNewCallback — the `add` event fires either way, so a
                    // consumer can handle creation themselves.
                    this.handleAddNew((this.searchTerm || '').trim());
                }
                // On the fullscreen sheet the on-screen Enter/Search key doubles as
                // "done typing" — drop focus off the header search so the soft keyboard
                // tucks away (the native "search → dismiss" gesture). Floating keeps its
                // input focused for continued keyboard use.
                if (this.presentationMode === 'fullscreen') this.fullscreenSearchInput?.blur();
                break;
            case 'Escape':
                e.preventDefault();
                // Priority: 1) Close selected popover, 2) Clear search, 3) Close dropdown
                if (this.showSelectedPopover) {
                    this.hideSelectedPopover();
                } else if (this.input.value) {
                    this.clearSearch();
                } else {
                    this.close();
                }
                break;
            case 'Tab':
                this.close();
                break;
            case 'PageUp':
                e.preventDefault();
                this.focusPageUp();
                break;
            case 'PageDown':
                e.preventDefault();
                this.focusPageDown();
                break;
            case 'Home':
            case 'End': {
                // Caret-aware: in an editable search field, let Home/End move the text caret
                // first; only navigate the list when the caret is already at that end (or the
                // box is empty / there's no editable caret). Pressing Home in a search box with
                // text no longer steals the caret to jump to the first option. An active text
                // selection is left to the browser (native collapse), not treated as a boundary.
                const inp = e.target instanceof HTMLInputElement ? e.target : null;
                let atBoundary: boolean;
                if (!inp) {
                    atBoundary = true;
                } else if (inp.selectionStart !== inp.selectionEnd) {
                    atBoundary = false;
                } else {
                    const caret = inp.selectionStart ?? 0;
                    atBoundary = e.key === 'Home' ? caret === 0 : caret === inp.value.length;
                }
                if (atBoundary) {
                    e.preventDefault();
                    if (e.key === 'Home') this.focusFirst();
                    else this.focusLast();
                }
                break;
            }
        }
    }

    private handleDropdownClick(e: MouseEvent): void {
        interactionLogger.debug(`[${this.instanceId}] Dropdown clicked`, { target: (e.target as HTMLElement).className });

        e.stopPropagation();

        // Info affordance (fullscreen, clipped labels): reveal the full label instead
        // of toggling selection. Handled first — the button lives inside .ms__option, so
        // closest('.ms__option') would otherwise catch its tap; and its own toggle logic
        // must run before the blanket dismiss below.
        const infoBtn = (e.target as HTMLElement).closest('.ms__option-info') as HTMLElement | null;
        if (infoBtn) {
            e.preventDefault();
            this.toggleLabelReveal(infoBtn);
            return;
        }

        // Any other tap inside the panel dismisses an open full-label reveal.
        this.hideLabelReveal();

        const actionBtn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
        if (actionBtn) {
            e.preventDefault();
            const action = actionBtn.dataset.action;
            interactionLogger.debug(`[${this.instanceId}] Action button clicked:`, action);
            if (action === 'select-all') {
                this.selectAll();
            } else if (action === 'clear-all') {
                this.clearAll();
            } else if (action === 'add-new') {
                const value = (this.searchTerm || '').trim();
                if (value) this.handleAddNew(value);
            } else if (action === 'custom') {
                // Look up the custom button by its rendered index (set as data-button-index)
                const buttonIndex = parseInt(actionBtn.dataset.buttonIndex || '-1');
                const button = this.options.actionButtons?.[buttonIndex];
                if (button?.onClick) {
                    button.onClick(this);
                }
            }
            return;
        }

        const option = (e.target as HTMLElement).closest('.ms__option') as HTMLElement;
        if (option && !option.classList.contains('ms__option--disabled')) {
            e.preventDefault();
            const value = option.dataset.value!;
            const optionIndex = this.filteredOptions.findIndex(opt => String(this.getItemValue(opt)) === value);
            interactionLogger.debug(`[${this.instanceId}] Option clicked:`, {
                value,
                optionIndex,
                closeOnSelect: this.options.isCloseOnSelect,
                placeholder: this.options.searchPlaceholder
            });
            if (optionIndex >= 0) {
                // Anchor keyboard focus to the clicked option so subsequent
                // ArrowDown/ArrowUp move relative to where the user clicked.
                this.focusedIndex = optionIndex;
                this.toggleOption(this.filteredOptions[optionIndex]);
                // Each option contains a focusable <input type="checkbox">, so
                // clicking pulls focus off the search input — and the keydown
                // listener is bound to the input. Put focus back so the user
                // can keep navigating with the keyboard.
                //
                // FLOATING only. In the fullscreen overlay `this.input` is the
                // control input hidden BEHIND the sheet; focusing it pops the soft
                // keyboard on every tap (and the keyboard-inset observer then
                // shrinks the sheet — the visible "blink"/shrink on select). The
                // dropdown's fullscreen mousedown guard already keeps focus where it
                // was (on the sheet search if the keyboard was up, nowhere if it was
                // down), so no refocus is needed — and none that would raise the keyboard.
                if (this.#isOpen && this.presentationMode !== 'fullscreen') {
                    this.input.focus();
                } else if (this.presentationMode === 'fullscreen') {
                    // Tapping a result signals "done typing" — blur the sheet search so
                    // the soft keyboard tucks away and the full list is visible. The
                    // mousedown guard kept focus on the search (it never moved to the
                    // option), so this blur is what actually dismisses the keyboard.
                    this.fullscreenSearchInput?.blur();
                }
            }
        }
    }

    private handleBadgeClick(e: MouseEvent): void {
        const clearCountBtn = (e.target as HTMLElement).closest('[data-action="clear-count"]');
        if (clearCountBtn) {
            e.preventDefault();
            e.stopPropagation();
            interactionLogger.debug(`[${this.instanceId}] Clear count button clicked`);
            this.clearAll();
            return;
        }

        const showSelectedBtn = (e.target as HTMLElement).closest('[data-action="show-selected"]');
        if (showSelectedBtn) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSelectedPopover();
            return;
        }

        // Match the built-in pill's remove button OR a consumer-defined control in a
        // renderBadgeCallback badge (`[data-action="remove"]`).
        const removeBtn = (e.target as HTMLElement).closest('.ms__badge-remove, [data-action="remove"]') as HTMLElement;
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();

            // Handle remove-hidden action (remove all hidden items in partial mode)
            if (removeBtn.dataset.action === 'remove-hidden') {
                interactionLogger.debug(`[${this.instanceId}] Remove hidden items button clicked`);
                const maxVisible = this.options.badgesMaxVisible || 3;
                const selectedOptions = Array.from(this.selectedOptions.values());
                const hiddenOptions = selectedOptions.slice(maxVisible);

                // Deselect all hidden options (respecting the deselect veto per item)
                hiddenOptions.forEach(option => this.interactiveDeselect(option));
                return;
            }

            // Regular badge remove. Value is on the control itself (built-in pill) or on the
            // nearest ancestor carrying `data-value` (the wrapper of a renderBadgeCallback badge).
            const value = removeBtn.dataset.value
                ?? (removeBtn.closest('[data-value]') as HTMLElement | null)?.dataset.value
                ?? '';
            const option = this.selectedOptions.get(value);
            if (option) {
                this.interactiveDeselect(option);
            }
            return;
        }

        // Handle clicking the "+X more" badge itself (not the remove button)
        const moreBadge = (e.target as HTMLElement).closest('.ms__badge--more');
        if (moreBadge && !(e.target as HTMLElement).closest('.ms__badge-remove')) {
            e.preventDefault();
            e.stopPropagation();
            interactionLogger.debug(`[${this.instanceId}] '+X more' badge clicked, showing popover`);
            this.toggleSelectedPopover();
            return;
        }
    }

    private handleClickOutside(e: MouseEvent): void {
        // Use composedPath() to see through Shadow DOM boundaries
        const path = e.composedPath() as HTMLElement[];

        if (this.showSelectedPopover) {
            const clickedInsidePopover = path.some(el =>
                el instanceof Node && (
                    this.selectedPopover.contains(el) ||
                    this.counter.contains(el) ||
                    (el.closest && el.closest('[data-action="show-selected"]'))
                )
            );

            if (!clickedInsidePopover) {
                uiLogger.debug(`[${this.instanceId}] Closing selected popover due to click outside`);
                this.hideSelectedPopover();
                return;
            }
        }

        if (!this.#isOpen) return;

        // Swallow the click that came from the opening gesture — a fullscreen overlay
        // that just appeared over the pointer makes it look like an outside-click.
        if (this.justOpenedViaClick) return;

        // Check if any element in the event path is inside our elements
        // Filter to only Nodes since composedPath() can include Window and other objects
        const clickedInside = path.some(el =>
            el instanceof Node && (
                this.element.contains(el) ||
                this.dropdown.contains(el) ||
                (this.hint && this.hint.contains(el))
            )
        );

        interactionLogger.debug(`[${this.instanceId}] handleClickOutside`, {
            target: (e.target as HTMLElement).className,
            targetTag: (e.target as HTMLElement).tagName,
            clickedInside,
            pathLength: path.length,
            firstInPath: path[0]?.tagName,
            elementContains: path.some(el => el instanceof Node && this.element.contains(el)),
            dropdownContains: path.some(el => el instanceof Node && this.dropdown.contains(el)),
            isConnected: this.dropdown.isConnected
        });

        if (!clickedInside) {
            interactionLogger.warn(`[${this.instanceId}] Closing dropdown due to click outside`);
            this.close();
        }
    }

    /**
     * Move focus by computing a new index from (current, total).
     * Returning -1 from `compute` is a no-op (used for empty list / no match).
     */
    private focusBy(compute: (current: number, total: number) => number, dir: 1 | -1 = 1): void {
        const total = this.filteredOptions.length;
        if (total === 0) return;
        const target = compute(this.focusedIndex, total);
        if (target < 0) return;
        // Tree mode: never land focus on a non-selectable node — scan past it in
        // the movement direction (then the opposite direction as a fallback).
        const next = this.resolveSelectableIndex(target, dir, total);
        if (next < 0) return;
        this.focusedIndex = next;
        this.renderDropdown();
        this.scrollToFocused();
        this.updateFullscreenNav();
    }

    /**
     * Given a target index and a preferred direction, return the nearest index
     * whose node is selectable (skipping non-selectable tree nodes). Falls back to
     * the opposite direction, then to -1 if nothing is selectable. No-op outside
     * tree mode.
     */
    private resolveSelectableIndex(start: number, dir: 1 | -1, total: number): number {
        if (!this.isTreeMode()) return start;
        let i = start;
        while (i >= 0 && i < total && !this.isIndexSelectable(i)) i += dir;
        if (i < 0 || i >= total) {
            i = start - dir;
            while (i >= 0 && i < total && !this.isIndexSelectable(i)) i -= dir;
        }
        return (i >= 0 && i < total) ? i : -1;
    }

    private focusNext(): void     { this.focusBy((i, n) => Math.min(n - 1, i + 1), 1); }
    private focusPrevious(): void { this.focusBy((i)    => Math.max(0, i - 1), -1); }
    private focusFirst(): void    { this.focusBy(()     => 0, 1); }
    private focusLast(): void     { this.focusBy((_, n) => n - 1, -1); }
    private focusPageUp(): void   { this.focusBy((i)    => Math.max(0, i - 10), -1); }
    private focusPageDown(): void { this.focusBy((i, n) => Math.min(n - 1, i + 10), 1); }

    /** Move keyboard focus onto the empty-state "add new" prompt (the only actionable row). */
    private focusAddNewPrompt(): void {
        if (this.addNewFocused) return;
        this.addNewFocused = true;
        this.renderDropdown();
    }

    private focusNextMatch(): void {
        if (this.matchingIndices.size === 0) return;
        const matched = Array.from(this.matchingIndices).sort((a, b) => a - b);
        const currentIndex = matched.findIndex(idx => idx === this.focusedIndex);
        const nextIndex = (currentIndex + 1) % matched.length;
        this.focusBy(() => matched[nextIndex]);
        interactionLogger.debug(`[${this.instanceId}] Jumped to next match: index ${this.focusedIndex} (${currentIndex + 1} of ${matched.length})`);
    }

    private focusPreviousMatch(): void {
        if (this.matchingIndices.size === 0) return;
        const matched = Array.from(this.matchingIndices).sort((a, b) => a - b);
        const currentIndex = matched.findIndex(idx => idx === this.focusedIndex);
        const prevIndex = currentIndex <= 0 ? matched.length - 1 : currentIndex - 1;
        this.focusBy(() => matched[prevIndex]);
        interactionLogger.debug(`[${this.instanceId}] Jumped to previous match: index ${this.focusedIndex} (${currentIndex + 1} of ${matched.length})`);
    }

    /** Lazily build (and cache) the imperative facade passed to `keydownCallback`. Bound to the
     *  same private actions the built-in key handling uses, so consumer shortcuts behave identically. */
    private getKeyboardController(): MultiSelectKeyboardController<T> {
        if (this.keyboardController) return this.keyboardController;
        this.keyboardController = {
            focusNext: () => this.focusNext(),
            focusPrevious: () => this.focusPrevious(),
            focusFirst: () => this.focusFirst(),
            focusLast: () => this.focusLast(),
            focusPageUp: () => this.focusPageUp(),
            focusPageDown: () => this.focusPageDown(),
            focusNextMatch: () => this.focusNextMatch(),
            focusPreviousMatch: () => this.focusPreviousMatch(),
            focusIndex: (index: number) => this.focusBy(() => index, 1),
            toggleFocused: () => {
                if (this.focusedIndex >= 0) this.toggleOption(this.filteredOptions[this.focusedIndex]);
            },
            toggleValue: (value: string | number) => {
                const opt = this.allOptions.find(o => String(this.getItemValue(o)) === String(value));
                if (opt) this.toggleOption(opt);
            },
            selectValue: (value: string | number) => {
                if (this.selectedValues.has(String(value))) return; // already selected — no-op
                const opt = this.allOptions.find(o => String(this.getItemValue(o)) === String(value));
                if (opt) this.toggleOption(opt);
            },
            deselectValue: (value: string | number) => {
                if (!this.selectedValues.has(String(value))) return; // not selected — no-op
                const opt = this.selectedOptions.get(String(value))
                    ?? this.allOptions.find(o => String(this.getItemValue(o)) === String(value));
                if (opt) this.toggleOption(opt);
            },
            open: () => this.open(),
            close: () => this.close(),
            setSearch: (term: string) => {
                this.input.value = term;
                if (this.fullscreenSearchInput) this.fullscreenSearchInput.value = term;
                void this.handleSearch(term);
            },
            clearSearch: () => this.clearSearch(),
        };
        return this.keyboardController;
    }

    /** Clear the search box (both the main input and the fullscreen search) and reset the visible
     *  list. Shared by Escape and the keyboard controller. */
    /**
     * Clear the search box and restore the full option list (resets the visible/matched sets and
     * drops keyboard focus). Public building block: pair it with `scrollToValue()` to reveal then
     * scroll to an option the current search had filtered out — `el.clearSearch(); el.scrollToValue(v)`.
     * Does not touch the selection (use `clearAll()` for that).
     */
    public clearSearch(): void {
        this.input.value = '';
        if (this.fullscreenSearchInput) this.fullscreenSearchInput.value = '';
        this.searchTerm = '';
        this.resetVisibleToAll();
        this.matchingIndices.clear();
        this.focusedIndex = -1;
        this.renderDropdown();
        this.updateFullscreenNav();
        this.updateFullscreenSearchClear();
    }

    /**
     * Programmatically set the search text and filter — exactly as if the user typed it, so
     * `beforeSearchCallback`, `minSearchLength` and async `searchCallback` all apply the same way.
     * Reflects into the search box (and the fullscreen sheet's field). Does NOT open the dropdown —
     * call `open()` if you want it visible. Passing `''` clears (equivalent to `clearSearch()`).
     */
    public search(term: string): void {
        const value = term ?? '';
        this.input.value = value;
        if (this.fullscreenSearchInput) this.fullscreenSearchInput.value = value;
        void this.handleSearch(value);
        this.updateFullscreenSearchClear();
    }

    private scrollToFocused(): void {
        if (this.virtualScroll && this.focusedIndex >= 0) {
            // Keyboard nav wants MINIMAL movement ('nearest') — don't slam the focused row to the
            // top on every arrow keypress (the public scrollTo* commands default to 'start' instead).
            this.virtualScroll.scrollToIndex(this.focusedIndex, 'nearest');
            return;
        }
        // Standard mode: use scrollIntoView
        const focusedElement = this.dropdown.querySelector('.ms__option--focused') as HTMLElement | null;
        if (!focusedElement) return;
        this.applyScrollIntoView(focusedElement);
    }

    /**
     * scrollIntoView with the fullscreen-safe default. In the fullscreen sheet the soft keyboard
     * covers the lower viewport, so `block:'nearest'` can bottom-align a match BEHIND the keyboard;
     * centre it instead and scroll INSTANTLY (a smooth animation kicked off per-keystroke is torn
     * down by the next re-render and never settles — the "list jumps every letter" bug). Floating
     * scrolls the nearest edge smoothly. The caller may override `block`.
     */
    private applyScrollIntoView(el: HTMLElement, opts?: { block?: ScrollLogicalPosition }): void {
        if (this.presentationMode === 'fullscreen') {
            el.scrollIntoView({ block: opts?.block ?? 'center', behavior: 'auto' });
        } else {
            el.scrollIntoView({ block: opts?.block ?? 'nearest', behavior: 'smooth' });
        }
    }

    /**
     * Scroll the open dropdown so the option at `index` (into the current `filteredOptions`) is
     * visible. Works in floating, fullscreen (mobile), virtual-scroll and tree modes. Returns
     * false if the dropdown is closed or the index is out of range. The scroll is deferred a frame
     * when the list isn't rendered yet (e.g. right after `open()` in virtual mode / the fullscreen
     * sheet build), so `el.open(); el.scrollToIndex(i)` works.
     */
    public scrollToIndex(index: number, opts?: { block?: ScrollLogicalPosition }): boolean {
        const block = opts?.block ?? 'start';
        if (!this.#isOpen) {
            interactionLogger.debug(`[${this.instanceId}] scrollToIndex(${index}) → false (closed)`);
            return false;
        }
        if (index < 0 || index >= this.filteredOptions.length) {
            interactionLogger.debug(`[${this.instanceId}] scrollToIndex(${index}) → false (out of range, ${this.filteredOptions.length} options)`);
            return false;
        }
        interactionLogger.debug(`[${this.instanceId}] scrollToIndex(${index}, block=${block}) — virtual=${!!this.virtualScroll}, mode=${this.presentationMode}`);
        this.scrollToRenderedIndex(index, { block });
        return true;
    }

    /**
     * Scroll to the option whose value matches `value` (resolved within the current
     * `filteredOptions`). Returns false if it isn't in the currently visible list — e.g. filtered
     * out by a search, or (tree) under a collapsed ancestor. Call `clearSearch()` (or expand the
     * branch) first to reveal it, then scroll.
     */
    public scrollToValue(value: string | number, opts?: { block?: ScrollLogicalPosition }): boolean {
        const index = this.filteredOptions.findIndex(o => String(this.getItemValue(o)) === String(value));
        interactionLogger.debug(`[${this.instanceId}] scrollToValue(${String(value)}) → index ${index} of ${this.filteredOptions.length}`);
        if (index < 0) return false;
        return this.scrollToIndex(index, opts);
    }

    /**
     * Scroll to a group. In standard rendering the group's header (`.ms__group-label`) is brought
     * into view; in virtual-scroll mode (which renders no headers) it scrolls to the group's FIRST
     * option instead. Returns false in tree mode (groups don't apply) or if the group has no
     * options in the current filtered list.
     */
    public scrollToGroup(name: string, opts?: { block?: ScrollLogicalPosition }): boolean {
        const block = opts?.block ?? 'start';
        if (!this.#isOpen || this.isTreeMode()) {
            interactionLogger.debug(`[${this.instanceId}] scrollToGroup(${name}) → false (${this.isTreeMode() ? 'tree mode' : 'closed'})`);
            return false;
        }
        // Standard render: a real header exists — scroll it into view (shows the label).
        if (!this.virtualScroll) {
            const label = this.dropdown.querySelector(
                `.ms__group-label[data-group="${CSS.escape(name)}"]`
            ) as HTMLElement | null;
            if (label) {
                interactionLogger.debug(`[${this.instanceId}] scrollToGroup(${name}) — header found, scrolling label into view (block=${block})`);
                this.applyScrollIntoView(label, { block });
                return true;
            }
        }
        // Virtual mode (no headers), or the header isn't rendered yet: scroll to the group's first
        // option by index.
        const index = this.filteredOptions.findIndex(o => (this.getItemGroup(o) || '') === name);
        interactionLogger.debug(`[${this.instanceId}] scrollToGroup(${name}) — no header (virtual=${!!this.virtualScroll}), first member index ${index}`);
        if (index < 0) return false;
        return this.scrollToIndex(index, { block });
    }

    /**
     * Shared scroll worker for the public scrollTo* methods. Virtual mode uses the fixed-height
     * math (works even if the row isn't currently rendered); otherwise scrolls the
     * `.ms__option[data-index]` element into view. Defers one frame if the list isn't ready yet
     * (post-open virtual init / fullscreen sheet build), then retries once.
     */
    private scrollToRenderedIndex(index: number, opts?: { block?: ScrollLogicalPosition }, retried = false): void {
        if (!this.#isOpen || index < 0 || index >= this.filteredOptions.length) return;
        if (this.virtualScroll) {
            // Map the DOM ScrollLogicalPosition to the virtual list's supported blocks ('end' → nearest).
            const vBlock = opts?.block === 'center' ? 'center'
                : opts?.block === 'nearest' ? 'nearest'
                : 'start';
            this.virtualScroll.scrollToIndex(index, vBlock);
            interactionLogger.debug(`[${this.instanceId}] scrollToRenderedIndex(${index}) via virtual (block=${vBlock})`);
            return;
        }
        const el = this.dropdown.querySelector(`.ms__option[data-index="${index}"]`) as HTMLElement | null;
        if (el) {
            this.applyScrollIntoView(el, opts);
            interactionLogger.debug(`[${this.instanceId}] scrollToRenderedIndex(${index}) via DOM scrollIntoView`);
            return;
        }
        // Not rendered yet (virtual instance still initializing, or sheet mid-build): retry once.
        if (!retried) {
            interactionLogger.debug(`[${this.instanceId}] scrollToRenderedIndex(${index}) not rendered yet — deferring one frame`);
            requestAnimationFrame(() => this.scrollToRenderedIndex(index, opts, true));
        }
    }

    private toggleOption(option: T): void {
        // Disabled options must not be toggled regardless of how we got here
        // (click handler already filters disabled, but keyboard Enter used to
        // bypass — centralize the check at the choke point).
        if (this.getItemDisabled(option)) {
            interactionLogger.debug(`[${this.instanceId}] toggleOption ignored — option is disabled`);
            return;
        }
        // Tree mode: a non-selectable node (e.g. a branch in a leaves-only tree)
        // must not toggle, no matter how we got here.
        if (!this.isOptionSelectable(option)) {
            interactionLogger.debug(`[${this.instanceId}] toggleOption ignored — node is not selectable`);
            return;
        }
        const value = this.getItemValue(option);
        const valueKey = String(value);
        interactionLogger.debug(`[${this.instanceId}] toggleOption called`, { value, multiple: this.options.isMultipleEnabled });

        // Cascade mode: toggling a node flips its whole subtree and re-projects to
        // emitted values. Route through the dedicated path (which commits its own
        // added/removed diff) instead of the single-value select/deselect funnel.
        if (this.isCascadeMode() && this.cascadeIndex) {
            const node = this.cascadeIndex.nodeByValue.get(valueKey);
            if (node) {
                this.toggleTreeCascade(node);
                if (this.options.isCloseOnSelect) this.close();
                return;
            }
        }

        const wasSelected = this.selectedValues.has(valueKey);
        const changed = wasSelected
            ? this.interactiveDeselect(option)
            : this.interactiveSelect(option);

        // A vetoed toggle changes nothing — leave the dropdown open so the user
        // can pick something else (single-select otherwise closes on every pick).
        if (!changed) return;

        if (!this.options.isMultipleEnabled) {
            this.close();
        } else if (this.options.isCloseOnSelect) {
            this.close();
        }
    }

    /**
     * The single funnel for an interactive (user-initiated) selection. Consults
     * `beforeSelectCallback` and only mutates state if allowed, so the veto can
     * never be bypassed by a new UI entry point. Programmatic `setSelected` and
     * the Select-All button deliberately do not route through here.
     * Returns true if the option was selected, false if the veto blocked it.
     */
    private interactiveSelect(option: T): boolean {
        const veto = this.options.beforeSelectCallback?.(option, this.getSelected());
        if (veto === false || typeof veto === 'string') {
            if (typeof veto === 'string') this.showMessage(veto, { variant: 'warning' });
            interactionLogger.debug(`[${this.instanceId}] Selection blocked by beforeSelectCallback`);
            return false;
        }
        // Single-select replaces the current value. Clearing directly (rather
        // than via deselectOption) preserves the documented replacement
        // semantics: a replace fires select + change, but no deselect.
        if (!this.options.isMultipleEnabled) {
            this.selectedValues.clear();
            this.selectedOptions.clear();
        }
        this.selectOption(option);
        return true;
    }

    /**
     * The single funnel for an interactive (user-initiated) deselection. Every
     * removal affordance — dropdown toggle, badge × button, selected-items
     * popover × button, and the "remove hidden" badge — routes through here so
     * the `beforeDeselectCallback` veto applies uniformly. Programmatic
     * `setSelected` and the Clear-All button deliberately bypass it.
     * Returns true if the option was deselected, false if the veto blocked it.
     */
    private interactiveDeselect(option: T): boolean {
        const veto = this.options.beforeDeselectCallback?.(option, this.getSelected());
        if (veto === false || typeof veto === 'string') {
            if (typeof veto === 'string') this.showMessage(veto, { variant: 'warning' });
            interactionLogger.debug(`[${this.instanceId}] Deselection blocked by beforeDeselectCallback`);
            return false;
        }
        this.deselectOption(option);
        return true;
    }

    /**
     * Commit the "add new" affordance for the typed text. Two modes:
     *  - `addNewCallback` set → create the option, append it, select it, clear the search.
     *  - no callback → the consumer owns creation; we only notify (via the `add` event) so they
     *    can open a modal / POST / add the option imperatively.
     * The `add` event fires in BOTH modes (with `option` present only when one was created).
     */
    private async handleAddNew(value: string): Promise<void> {
        try {
            let newOption: T | undefined;

            if (this.options.addNewCallback) {
                dataLogger.debug(`[${this.instanceId}] Adding new option:`, value);

                // Show a pending state (spinner + "Adding …") while the callback runs — an async
                // creation (validation / server round-trip) otherwise leaves the prompt frozen.
                this.addNewFocused = false;
                this.addNewPending = true;
                this.renderDropdown();

                let created: T | null | undefined;
                try {
                    created = await this.options.addNewCallback(value);
                } finally {
                    this.addNewPending = false;
                }

                // Cancelable: a null/undefined return aborts the whole creation — no push, no select,
                // no `add` event, search left intact so the user can adjust. Use `== null` (NOT a
                // falsy check) so a valid primitive-mode option of 0 / false / "" still creates.
                if (created == null) {
                    dataLogger.debug(`[${this.instanceId}] addNewCallback canceled creation for:`, value);
                    this.renderDropdown(); // clear the spinner, restore the clickable prompt
                    return;
                }
                newOption = created;

                // Append to the master list (selectOption + resetVisibleToAll read from it).
                // `newOption` may be a rich option object — it renders via the same get*/render*
                // callbacks as every other option.
                this.allOptions.push(newOption);

                // Reset the search box + visible list to ALL options so the picker leaves the
                // "one filtered result" state and shows the full (now longer) list — otherwise it
                // stays stuck showing only the just-added row until the user searches again.
                this.searchTerm = '';
                this.input.value = '';
                if (this.fullscreenSearchInput) this.fullscreenSearchInput.value = '';
                this.matchingIndices.clear();
                this.focusedIndex = -1;
                this.addNewFocused = false;
                this.resetVisibleToAll();

                // Select the new option (commit() re-renders the now-full list + badges).
                this.selectOption(newOption);
                this.updateFullscreenSearchClear();
            }

            // Notify the consumer that a creation was requested. Fires whether or not an option
            // was materialized here — a callback-less consumer handles creation off this event.
            this.options.onAddNew?.({ value, option: newOption });

            if (newOption && this.options.isCloseOnSelect) {
                this.close();
            }
        } catch (error) {
            this.addNewPending = false;
            dataLogger.error(`[${this.instanceId}] Error adding new option:`, error);
            this.renderDropdown(); // clear the spinner if the callback threw
        }
    }

    private selectOption(option: T): void {
        const value = this.getItemValue(option);
        const valueKey = String(value);
        this.selectedValues.add(valueKey);
        this.selectedOptions.set(valueKey, option);
        this.commit({ added: [option] });
    }

    private deselectOption(option: T): void {
        const value = this.getItemValue(option);
        const valueKey = String(value);

        // Cascade mode: a badge/popover value is a policy *projection*, not a raw
        // selectedValues entry. Deleting the value alone would leave the node's
        // atoms checked elsewhere (e.g. policy "all" emits branch + every leaf),
        // so refreshCascadeAtoms would re-derive the branch as checked and the
        // removal would appear to do nothing. Route through the cascade path so
        // removing a node unchecks its whole subtree, exactly like un-toggling it.
        if (this.isCascadeMode() && this.cascadeIndex) {
            const node = this.cascadeIndex.nodeByValue.get(valueKey);
            if (node) {
                const atoms = this.cascadeIndex.atomsUnder.get(node.path) ?? [];
                const checkedAtoms = new Set(expandToAtoms(this.cascadeIndex, this.selectedValues));
                for (const a of atoms) checkedAtoms.delete(a);
                this.commitCascadeAtoms(checkedAtoms);
                return;
            }
        }

        this.selectedValues.delete(valueKey);
        this.selectedOptions.delete(valueKey);
        this.commit({ removed: [option] });
    }

    private selectAll(): void {
        // Cascade mode: check every selectable atom among the visible nodes, then
        // project through the policy — so Select All emits the same rolled-up shape
        // a click would (a fully-checked subtree collapses to its root), not a flat
        // list of every node.
        if (this.isCascadeMode() && this.cascadeIndex) {
            const index = this.cascadeIndex;
            const checkedAtoms = new Set(expandToAtoms(index, this.selectedValues));
            for (const node of this.treeNodes) {
                if (!index.atomPaths.has(node.path)) continue;
                if (this.getItemDisabled(node.data as T)) continue;
                checkedAtoms.add(String(this.getItemValue(node.data as T)));
            }
            this.commitCascadeAtoms(checkedAtoms);
            return;
        }

        const added: T[] = [];
        this.filteredOptions.forEach((option, index) => {
            if (this.getItemDisabled(option)) return;
            if (!this.isIndexSelectable(index)) return;
            const valueKey = String(this.getItemValue(option));
            if (this.selectedValues.has(valueKey)) return;
            this.selectedValues.add(valueKey);
            this.selectedOptions.set(valueKey, option);
            added.push(option);
        });
        this.commit({ added });
    }

    public clearAll(): void {
        const removed = Array.from(this.selectedOptions.values());
        this.selectedValues.clear();
        this.selectedOptions.clear();
        this.commit({ removed });
    }

    /**
     * Inline clear (✕) handler: wipe the whole selection and any search text, then
     * restore focus to the input. clearAll() → commit() → renderBadges() already
     * refreshes this button's visibility (it hides once nothing is selected).
     */
    private clearClick(): void {
        interactionLogger.debug(`[${this.instanceId}] input clear (✕) clicked`);
        this.clearAll();
        if (this.searchTerm || this.input.value) this.clearSearch();
        // Nothing is selected anymore — close the selected-items popover if it was open
        // (it would otherwise linger showing "Selected Items (0)").
        if (this.showSelectedPopover) this.hideSelectedPopover();
        // Refocus for keyboard use, but guard the focus handler so clearing doesn't pop the
        // dropdown open (it opens on focus otherwise). Same one-tick guard the click-close uses.
        this.justClosedViaClick = true;
        this.input.focus();
        setTimeout(() => { this.justClosedViaClick = false; }, 0);
    }

    /**
     * Show the inline clear (✕) only when it is opted in (isClearShown), something is
     * selected, and the control is enabled. Called from renderBadges() so it tracks
     * every selection change. Uses inline display like the counter / fullscreen clear.
     */
    private updateClearButton(): void {
        if (!this.clearButton) return;
        const enabled = !this.element.classList.contains('ms--disabled');
        const show = !!this.options.isClearShown && this.selectedValues.size > 0 && enabled;
        this.clearButton.style.display = show ? '' : 'none';
    }

    /**
     * Re-render and fire callbacks after a selection state change.
     * `added` / `removed` drive per-item select/deselect callbacks.
     * `onChange` fires once if anything actually changed.
     */
    private commit(delta: { added?: T[]; removed?: T[] }): void {
        // Preserve the list scroll position: a selection toggle shouldn't jump the user
        // back to the top of the list (the innerHTML rebuild would otherwise reset it).
        this.renderDropdown({ preserveScroll: true });
        this.renderBadges();
        this.updateHiddenInput();

        const added = delta.added ?? [];
        const removed = delta.removed ?? [];

        if (this.options.onSelect) {
            added.forEach(option => this.options.onSelect!(option));
        }
        if (this.options.onDeselect) {
            removed.forEach(option => this.options.onDeselect!(option));
        }
        if ((added.length > 0 || removed.length > 0) && this.options.onChange) {
            this.options.onChange(this.getSelected());
        }
    }

    /** Open the dropdown (no-op if already open, or if there is nothing to show). */
    open(): void {
        uiLogger.debug(`[${this.instanceId}] open() called`, { isOpen: this.#isOpen });
        if (this.#isOpen) return;

        // Guard the trailing document `click` for one tick. A consumer that opens the
        // dropdown from their OWN button's click handler (`el.open()` / `el.toggle()`)
        // would otherwise have that same click bubble to our document-level
        // outside-click listener and immediately re-close it. The internal pointer path
        // sets this flag too (see the input `mousedown` handler); centralizing it here
        // means every open() caller is covered. Cleared next tick, so a genuine later
        // outside-click still closes as normal. Harmless for non-click opens (typing,
        // programmatic-on-load): no trailing click arrives before it clears.
        this.justOpenedViaClick = true;
        setTimeout(() => { this.justOpenedViaClick = false; }, 0);

        // A message reflects the state at the moment it was shown. Opening changes that
        // state (and, on a phone, moves from a control-anchored toast to a fullscreen
        // overlay), so drop any lingering message rather than have it float — at its now
        // stale anchor and above-overlay z-index — over the sheet.
        this.hideMessage();

        this.#isOpen = true;
        this.element.classList.add('ms--open');
        this.dropdown.classList.add('ms__dropdown--visible');
        uiLogger.info(`[${this.instanceId}] Dropdown opened`);

        this.input.placeholder = this.getPlaceholderText();

        // Single-select reuses the input box to show the selected label while
        // closed, so on open we switch it back to "search mode". Show the current
        // search term rather than blanking it: close() has already cleared or kept
        // searchTerm/filteredOptions per shouldKeepSearchOnClose, so mirroring
        // searchTerm here keeps the box and the filtered list in sync (no stale
        // "java" filter lingering under an empty box).
        if (!this.options.isMultipleEnabled && this.options.isSearchEnabled) {
            this.input.value = this.searchTerm;
        }

        // If using searchCallback with keepOptionsOnSearch, ensure initial options are shown
        if (this.options.searchCallback && this.options.isKeepOptionsOnSearch && !this.searchTerm) {
            this.filteredOptions = [...this.allOptions];
            uiLogger.debug(`[${this.instanceId}] Showing ${this.allOptions.length} initial options on open`);
        }

        // Establish the fullscreen layout BEFORE rendering so the virtual scroller
        // measures the final, full-height container on its first pass (the header is a
        // sibling of dropdown-inner, so building it first doesn't disturb the render).
        if (this.presentationMode === 'fullscreen') {
            // Full-viewport overlay: no anchoring, its own header carries search + close.
            this.enterFullscreen();
        }

        this.renderDropdown();

        if (this.presentationMode !== 'fullscreen') {
            this.positionDropdown();
        }

        // Dismiss option tooltips immediately on scroll (see field comment).
        this.dropdown.addEventListener('scroll', this.onDropdownScroll, true);

        // The hint mirrors the floating dropdown's placement; it has no role in the
        // fullscreen overlay (the header replaces it).
        if (this.hint && this.presentationMode === 'floating') {
            this.hint.classList.add('ms__hint--visible');
            this.positionHint();
        }

        // We're now open — dismiss every other participating overlay (other multiselects,
        // datepickers, external popovers). Our own onDismiss is skipped (we're the source).
        this.overlayCoord?.activate();
    }

    /** Close the dropdown (no-op if already closed). */
    close(): void {
        uiLogger.debug(`[${this.instanceId}] close() called`, { isOpen: this.#isOpen });
        if (!this.#isOpen) return;

        this.#isOpen = false;
        this.element.classList.remove('ms--open');
        this.dropdown.classList.remove('ms__dropdown--visible');
        if (this.hint) {
            this.hint.classList.remove('ms__hint--visible');
        }

        // Only clear search if shouldKeepSearchOnClose is false
        if (!this.options.shouldKeepSearchOnClose) {
            this.searchTerm = '';
            // Only clear input in multi-select mode or when search is enabled
            if (this.options.isMultipleEnabled || this.options.isSearchEnabled) {
                this.input.value = '';
            }

            this.resetVisibleToAll();
        }

        this.focusedIndex = -1;

        // Tear down option tooltips so they don't linger while the dropdown is hidden.
        this.dropdown.removeEventListener('scroll', this.onDropdownScroll, true);
        this.destroyAllOptionTooltips();
        this.hideLabelReveal();
        this.hideMessage();

        this.renderBadges();

        if (this.dropdownCleanup) {
            this.dropdownCleanup();
            this.dropdownCleanup = null;
        }
        if (this.hintCleanup) {
            this.hintCleanup();
            this.hintCleanup = null;
        }

        // Tear down the fullscreen overlay chrome + restore page scroll (no-op when
        // the panel was floating).
        this.exitFullscreen();

        // Reset placement tracking
        this.dropdownPlacement = null;

        // Release the active-overlay marker for this instance (no broadcast on close).
        this.overlayCoord?.deactivate();

        uiLogger.debug(`[${this.instanceId}] Dropdown closed`);
    }

    /** Toggle the dropdown open/closed. */
    toggle(): void {
        if (this.#isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /** Whether the dropdown is currently open. Assigning opens/closes it. */
    get isOpen(): boolean {
        return this.#isOpen;
    }

    set isOpen(value: boolean) {
        if (value) {
            this.open();
        } else {
            this.close();
        }
    }

    /**
     * Anchor a floating panel (dropdown or selected-items popover) below/above the input with
     * placement-locking and width-syncing. Returns the `autoUpdate` cleanup.
     *
     * Both panels share: anchor on input, sync width, default to 'bottom-start', flip on first
     * compute then lock the resulting placement, optionally clamp by dropdownMin/MaxWidth.
     */
    private anchorFloatingPanel(panel: HTMLElement, opts: {
        getPlacement: () => Placement | null;
        setPlacement: (p: Placement) => void;
        /** When false, never locks (re-flips on every update). Defaults to true. */
        isLocked?: () => boolean;
        applyMaxWidth?: boolean;
        afterPosition?: () => void;
    }): () => void {
        const locked = opts.isLocked?.() ?? true;

        const handle = anchor(panel, this.inputWrapper, {
            strategy: 'fixed',
            placement: 'bottom-start',
            offset: 4,
            shift: 8,
            // Locked → flip once to where it fits, then pin (core 'freeze'). Unlocked
            // → re-flip every frame (default flip:true, no lock).
            lockPlacement: locked ? 'freeze' : false,
            // Narrow floating-ui's fixed-position containing-block heuristic to what browsers
            // reliably honour (transform/perspective/filter/backdrop-filter/will-change),
            // resolved from the portaled panel — core builds the custom platform for us. The
            // panel is appended to `container` (default document.body), so its containing block
            // can differ from the input's; measuring from the panel is what the browser does.
            // For other CB-establishing properties (contain, container-type) the browser keeps
            // fixed elements viewport-anchored, so `onDrift` catches the inverse edge case and
            // warns, pointing at the likely culprit.
            fixedContainingBlock: true,
            // Viewport-safety cap (core rc03): core's size() middleware sets the panel's
            // inline max-width to the space available on the resolved side (so long content
            // wraps instead of overflowing the viewport edge). We COMPOSE it with the
            // author-chosen fixed `dropdownMaxWidth` in onPlaced (not beforeCompute): this
            // middleware runs during positioning and would otherwise clobber a fixed cap set
            // earlier. onPlaced runs after it, so it gets the final say.
            maxWidth: { padding: 8 },
            onDrift: (report) => this.warnDrift(report),
            beforeCompute: () => {
                // Panel widths are CSS-variable driven (themeable at app level, overridable per
                // instance via the dropdown-width / selected-popover-width attributes). The dropdown
                // defaults to the field width, which CSS can't measure — so we publish the live field
                // (wrapper) width as --ms-input-current-width and let `.ms__dropdown { width: var(--ms-dropdown-width) }`
                // (whose default is that var) resolve it. It MUST be set on the host: --ms-dropdown-width is
                // declared on :host, so its nested var() resolves against the host, not the panel where the
                // width is used. From there the resolved width inherits down to the shadow-tree panels.
                // Set BEFORE positioning so shift() measures the final width; otherwise it sees the
                // natural content width and strands the panel.
                (this.options.hostElement ?? this.element).style.setProperty('--ms-input-current-width', `${this.inputWrapper.offsetWidth}px`);
                if (this.options.dropdownMinWidth) panel.style.minWidth = this.options.dropdownMinWidth;
            },
            onPlaced: (resolved) => {
                // Record the placement once (the hint mirrors it); after freeze it never changes.
                if (!opts.getPlacement()) opts.setPlacement(resolved);
                // Compose the author cap with core's viewport cap. Core's size() apply just set
                // panel.style.maxWidth to the available viewport width (a px string); clamp it to
                // min(authorCap, available) so BOTH bounds hold. CSS min() handles mixed units
                // (the author cap may be rem/%/px). Runs every frame after apply, so it's stable.
                if (opts.applyMaxWidth && this.options.dropdownMaxWidth) {
                    const available = panel.style.maxWidth; // px, set by core's maxWidth middleware
                    panel.style.maxWidth = available
                        ? `min(${this.options.dropdownMaxWidth}, ${available})`
                        : this.options.dropdownMaxWidth;
                }
                opts.afterPosition?.();
            }
        });

        return () => handle.destroy();
    }

    /**
     * Surface a multiselect-branded, once-per-instance warning when core's drift check
     * (`anchor`'s `onDrift`) reports the panel didn't land where it was positioned. The
     * consumer has an ancestor that establishes a fixed containing block but isn't on the
     * reliable-anchors list (likely `contain: paint|layout|strict` or `container-type`).
     * We can't fix it from inside the library, but we point at the likely culprit. Core
     * owns the measurement + culprit-finding + CB-CSS diagnostic (`detectFixedDrift`).
     */
    private warnDrift(drift: DriftReport): void {
        if (this.positioningDriftWarned) return;
        this.positioningDriftWarned = true;
        console.warn(
            `[@keenmate/web-multiselect] Dropdown panel rendered ${drift.driftX.toFixed(0)}px / ${drift.driftY.toFixed(0)}px ` +
            `away from where the library positioned it. Most likely culprit: ${drift.culpritDescription}` +
            (drift.culpritCss ? ` (has ${drift.culpritCss})` : '') + `.\n` +
            `An ancestor of <web-multiselect> establishes a fixed-positioning containing block that the library's ` +
            `heuristic doesn't recognize. Fix on your side: replace the property with \`transform: translateZ(0)\` ` +
            `on that ancestor, OR move the trigger out of that ancestor's subtree. If neither is acceptable, ` +
            `please file an issue at https://github.com/keenmate/web-multiselect/issues with the ancestor's computed CSS.`
        );
    }

    /**
     * Fullscreen counterpart of {@link warnDrift}. The overlay is a `position: fixed`,
     * full-viewport sheet — but if an ancestor of the host establishes a fixed-positioning
     * containing block (`transform` / `perspective` / `filter` / `backdrop-filter` / a
     * qualifying `will-change`), the browser anchors the sheet to THAT ancestor's box instead
     * of the viewport, so it no longer covers the screen (offset, clipped, or mis-sized).
     *
     * Unlike the floating path — where core measures real drift after positioning — nothing
     * anchors the sheet, so there's no drift to observe. Instead we ask core's shared
     * heuristic (`getFixedPositionOffsetParent`, the same one that feeds the floating platform)
     * whether the sheet's true offset parent is the viewport (`window`) or an element. An
     * element means it WILL be mis-anchored; warn once, pointing at the culprit. We only check
     * the reliably-honoured properties core lists (transform family) — `contain` /
     * `container-type` are omitted because browsers don't honour them for fixed positioning,
     * so they don't actually break the sheet.
     */
    private warnFullscreenContainingBlock(): void {
        if (this.fullscreenContainingBlockWarned || typeof window === 'undefined') return;
        const offsetParent = getFixedPositionOffsetParent(this.dropdown);
        if (offsetParent === window) return; // viewport-anchored → sheet covers the screen, all good
        this.fullscreenContainingBlockWarned = true;
        const culprit = offsetParent as Element;
        const id = culprit.id ? `#${culprit.id}` : '';
        const cls = culprit.classList.length ? `.${Array.from(culprit.classList).join('.')}` : '';
        const desc = `<${culprit.tagName.toLowerCase()}${id}${cls}>`;
        const css = describeContainingBlockProps(culprit);
        console.warn(
            `[@keenmate/web-multiselect] Fullscreen overlay is anchored to an ancestor ${desc}` +
            (css ? ` (has ${css})` : '') + ` instead of the viewport, so it may not cover the ` +
            `screen (offset, clipped, or mis-sized).\n` +
            `An ancestor of <web-multiselect> establishes a fixed-positioning containing block ` +
            `(transform / perspective / filter / backdrop-filter / will-change). Fix on your side: ` +
            `move the component out of that ancestor's subtree, OR remove/replace that property. If ` +
            `neither is acceptable, please file an issue at ` +
            `https://github.com/keenmate/web-multiselect/issues with the ancestor's computed CSS.`
        );
    }

    private positionDropdown(): void {
        // The fullscreen overlay is CSS-positioned (fixed, inset:0) — never anchored.
        if (this.presentationMode === 'fullscreen') return;
        this.dropdownCleanup = this.anchorFloatingPanel(this.dropdown, {
            getPlacement: () => this.dropdownPlacement,
            setPlacement: (p) => {
                this.dropdownPlacement = p;
                uiLogger.debug(`[${this.instanceId}] Locked dropdown placement:`, p);
            },
            isLocked: () => !!this.options.isPlacementLocked,
            applyMaxWidth: true,
            afterPosition: () => { if (this.hint && this.#isOpen) this.positionHint(); }
        });
    }

    /**
     * Switch how the open panels are presented. 'floating' anchors them to the input
     * (the default); 'fullscreen' renders them as full-viewport overlays (the phone
     * pattern) — the dropdown with its own search header + close, the selected-items
     * popover with its existing header + close. Driven by the element's
     * `environmentChanged` hook (auto → fullscreen on phones). A no-op when unchanged;
     * when a panel is already open it re-applies live so an orientation flip / viewport
     * resize can swap presentation without a reopen.
     */
    public setPresentation(mode: 'floating' | 'fullscreen'): void {
        if (mode === this.presentationMode) return;
        this.presentationMode = mode;

        // Re-apply live to whichever panel is currently open (they're mutually exclusive).
        if (this.#isOpen) {
            if (mode === 'fullscreen') {
                // Drop the floating anchor + hint, stand up the overlay chrome. Re-render
                // so the list rebuilds at fullscreen sizing (e.g. virtual rows switch from
                // a fixed maxHeight to flex-fill) and measures the full-height container.
                if (this.dropdownCleanup) { this.dropdownCleanup(); this.dropdownCleanup = null; }
                if (this.hintCleanup) { this.hintCleanup(); this.hintCleanup = null; }
                if (this.hint) this.hint.classList.remove('ms__hint--visible');
                this.dropdownPlacement = null;
                this.enterFullscreen();
                this.renderDropdown();
            } else {
                // Drop the overlay chrome, re-render at floating sizing, re-anchor.
                this.exitFullscreen();
                this.renderDropdown();
                this.positionDropdown();
                if (this.hint) { this.hint.classList.add('ms__hint--visible'); this.positionHint(); }
            }
        } else if (this.showSelectedPopover) {
            if (mode === 'fullscreen') {
                if (this.selectedPopoverCleanup) { this.selectedPopoverCleanup(); this.selectedPopoverCleanup = null; }
                this.selectedPopoverPlacement = null;
                this.clearFloatingInlineGeometry(this.selectedPopover);
                this.selectedPopover.classList.add('ms__selected-popover--fullscreen');
                this.lockBodyScroll();
            } else {
                this.selectedPopover.classList.remove('ms__selected-popover--fullscreen');
                this.unlockBodyScroll();
                this.positionSelectedPopover();
            }
        }
    }

    /**
     * Lock page scroll behind a fullscreen overlay via the core ref-counted helper.
     * Idempotent per instance: the dropdown and the selected-items popover are mutually
     * exclusive (opening one closes the other), so we hold at most one lock at a time,
     * and a redundant call is a no-op rather than acquiring a second.
     */
    private lockBodyScroll(): void {
        if (!this.bodyScrollUnlock) this.bodyScrollUnlock = lockBodyScroll();
    }

    /** Restore page scroll (no-op if it wasn't locked). */
    private unlockBodyScroll(): void {
        if (this.bodyScrollUnlock) { this.bodyScrollUnlock(); this.bodyScrollUnlock = null; }
    }

    /**
     * Clip the host document's horizontal overflow while a fullscreen sheet is open.
     *
     * A page that overflows horizontally (e.g. an unbreakable-wide token in a heading)
     * makes the mobile browser SHRINK-TO-FIT: it zooms the page out so the overflow fits,
     * which desyncs the visual viewport from the layout viewport. Our fullscreen sheet is
     * `position: fixed` — anchored to the LAYOUT viewport — so under that zoom it no longer
     * lands flush against the physical screen edges, and the top slips under the system bar
     * (looks like "the bar covers the sheet"). This is NOT a safe-area problem; safe-area
     * insets are 0 in that state. Clamping `overflow-x: hidden` on <html>/<body> removes the
     * overflow, so the browser drops the zoom and the sheet sits flush. Complements
     * lockBodyScroll() (vertical axis); the saved inline value is restored on close.
     *
     * Only <html> is touched (not <body>): clipping the root's horizontal overflow is
     * enough to collapse the scrollWidth and cancel the shrink-to-fit, and it avoids
     * conflicting with core's lockBodyScroll(), which owns <body>'s `overflow`. Idempotent.
     */
    private clampDocumentOverflowX(): void {
        if (this.overflowXClamp || typeof document === 'undefined') return;
        const html = document.documentElement;
        this.overflowXClamp = { html: html.style.overflowX };
        html.style.overflowX = 'hidden';
    }

    /** Restore the <html> `overflow-x` clamped by clampDocumentOverflowX() (no-op if unset). */
    private releaseDocumentOverflowX(): void {
        if (!this.overflowXClamp || typeof document === 'undefined') return;
        document.documentElement.style.overflowX = this.overflowXClamp.html;
        this.overflowXClamp = null;
    }

    /**
     * While the fullscreen dropdown is open, keep it sitting above the soft keyboard.
     * Delegates to core's `observeKeyboardInset` (which tracks `window.visualViewport`
     * and pins the panel's height/top so its flex column reflows above the keyboard);
     * we just hold the returned cleanup. No-op where `visualViewport` is unavailable.
     */
    private observeKeyboardInset(): void {
        this.keyboardInsetCleanup = observeKeyboardInset(this.dropdown);
    }

    /** Detach keyboard-inset tracking and restore the panel's CSS-driven geometry. */
    private unobserveKeyboardInset(): void {
        if (this.keyboardInsetCleanup) {
            this.keyboardInsetCleanup();
            this.keyboardInsetCleanup = null;
        }
    }

    /**
     * The fullscreen size multiplier = `--ms-fullscreen-rem ÷ --ms-rem` (both read off
     * the host). CSS scales itself — every size is `calc(N × --ms-rem)` and the panel
     * overrides `--ms-rem` — so this exists only for the JS-driven pixel heights that
     * CSS can't reach: the virtual/fixed option rows and the popover's virtual badges.
     * Returns 1 when floating (or when computed styles aren't readable, e.g. jsdom).
     */
    private fullscreenScale(): number {
        if (this.presentationMode !== 'fullscreen') return 1;
        if (typeof getComputedStyle !== 'function') return 1;
        const host = this.options.hostElement ?? this.element;
        const cs = getComputedStyle(host);
        const rem = parseFloat(cs.getPropertyValue('--ms-rem')) || 10;
        const fsRem = parseFloat(cs.getPropertyValue('--ms-fullscreen-rem')) || (rem * 1.2);
        return fsRem / rem;
    }

    /** Virtual/fixed row height (px), scaled up in the fullscreen phone view. */
    private scaledOptionHeight(): number {
        return Math.round((this.options.optionHeight ?? 50) * this.fullscreenScale());
    }

    /**
     * Size the virtual options scroll container for the current presentation. Applied on
     * every render (the container itself is built once), so a floating⇄fullscreen switch
     * re-sizes it: floating = a fixed maxHeight scroll box; fullscreen = flex-fill the
     * panel's flex column (no fixed height). Also refreshes --ms-option-height to the
     * scaled row height so the CSS row height matches the virtual scroller's itemHeight.
     */
    private applyVirtualOptionsSizing(container: HTMLElement): void {
        container.style.setProperty('--ms-option-height', `${this.scaledOptionHeight()}px`);
        if (this.presentationMode === 'fullscreen') {
            container.style.flex = '1 1 0';
            container.style.minHeight = '0';
            container.style.height = '';
            container.style.maxHeight = '';
        } else {
            const maxHeight = this.options.maxHeight || '20rem';
            container.style.flex = '';
            container.style.minHeight = '';
            container.style.height = maxHeight;
            container.style.maxHeight = maxHeight;
        }
    }

    /**
     * Virtual popover badge row height (px). In the fullscreen phone view the rows are
     * scaled up AND given extra height so a selected item is a comfortable, dropdown-like
     * touch target (the default 36px pill is short for touch). Mirrors the CSS
     * `--ms-badge-height` override for the fullscreen popover (floating.css) so the
     * virtual list's fixed height agrees with the non-virtual pills.
     */
    private scaledBadgeHeight(): number {
        const base = this.options.badgeHeight ?? 36;
        if (this.presentationMode !== 'fullscreen') return base;
        return Math.round(base * this.fullscreenScale() * 1.2);
    }

    /**
     * Clear the inline geometry that floating-ui's `anchor` writes on a panel
     * (position/left/top plus our composed max-width/min-width). Inline styles beat
     * the stylesheet, so a panel left over from a floating cycle would otherwise pin
     * itself where it last anchored and ignore the fullscreen CSS (position: fixed;
     * inset: 0; width: 100vw). Must run when switching a panel floating → fullscreen.
     */
    private clearFloatingInlineGeometry(panel: HTMLElement): void {
        panel.style.position = '';
        panel.style.left = '';
        panel.style.top = '';
        panel.style.right = '';
        panel.style.bottom = '';
        panel.style.transform = '';
        panel.style.maxWidth = '';
        panel.style.minWidth = '';
        panel.style.width = '';
    }

    /** Stand up the fullscreen dropdown overlay: modifier class, header, scroll lock, focus. */
    private enterFullscreen(): void {
        this.clearFloatingInlineGeometry(this.dropdown);
        this.dropdown.classList.add('ms__dropdown--fullscreen');
        // A transform/filter/… on an ancestor anchors this fixed sheet to that ancestor
        // instead of the viewport — warn once, since it can't be fixed from inside the library.
        this.warnFullscreenContainingBlock();
        this.buildFullscreenHeader();
        this.lockBodyScroll();
        // Drop any host-page horizontal overflow so the browser's shrink-to-fit zoom can't
        // desync the fixed sheet from the screen (top slipping under the system bar).
        this.clampDocumentOverflowX();
        // Trap the phone Back gesture/button so it closes the sheet instead of navigating.
        this.pushOverlayHistory();
        // Track the soft keyboard so the sheet shrinks to sit above it (see method doc).
        this.observeKeyboardInset();

        // Seed the header search with the current term. Auto-focus (which pops the soft
        // keyboard) is OPT-IN via fullscreenAutofocus — default is to open with the list
        // visible and the keyboard closed, so long lists browse cleanly and the bottom
        // action row stays on screen. When enabled, focus to type-to-filter immediately.
        if (this.fullscreenSearchInput) this.fullscreenSearchInput.value = this.searchTerm;
        this.updateFullscreenSearchClear();
        if (this.options.fullscreenAutofocus) {
            this.fullscreenSearchInput?.focus();
        } else {
            // Keyboard-off default: drop any focus the underlying input grabbed from the
            // opening tap (or a programmatic/focus-driven open) so the soft keyboard doesn't
            // linger over the sheet. The mousedown handler prevents the tap-focus up front;
            // this covers the other open paths.
            this.input.blur();
        }
    }

    /** Tear down the fullscreen dropdown chrome and restore page scroll (no-op if floating). */
    private exitFullscreen(): void {
        this.unobserveKeyboardInset();
        // Consume the history entry we pushed on open (no-op if the Back gesture already
        // popped it — see handleOverlayPopstate).
        this.popOverlayHistory();
        this.dropdown.classList.remove('ms__dropdown--fullscreen');
        if (this.fullscreenHeader) {
            this.fullscreenHeader.remove();
            this.fullscreenHeader = null;
            this.fullscreenSearchInput = null;
            this.fullscreenSearchClear = null;
            this.fullscreenModeToggle = null;
            this.fullscreenNav = null;
            this.fullscreenNavCount = null;
            this.fullscreenNavPrev = null;
            this.fullscreenNavNext = null;
        }
        this.unlockBodyScroll();
        this.releaseDocumentOverflowX();
    }

    /**
     * Back-gesture handling for the fullscreen sheet. On open we push a history entry
     * (same URL) and listen for `popstate`; the phone Back gesture/button then pops that
     * entry — which we treat as "close the sheet" — instead of navigating away from the
     * page. A programmatic close (✕, selection, Escape) consumes the entry via
     * `history.back()` so the stack is left as it was found.
     */
    private pushOverlayHistory(): void {
        if (this.overlayHistoryActive) return;
        if (typeof history === 'undefined' || typeof window === 'undefined') return;
        this.overlayHistoryActive = true;
        history.pushState({ msOverlay: this.instanceId }, '');
        window.addEventListener('popstate', this.onOverlayPopstate);
    }

    /** Back gesture/button fired: our pushed entry is already gone, so just close the
     *  sheet — WITHOUT popping history again (popOverlayHistory becomes a no-op). */
    private handleOverlayPopstate(): void {
        if (!this.overlayHistoryActive) return;
        this.overlayHistoryActive = false;
        window.removeEventListener('popstate', this.onOverlayPopstate);
        // Close whichever fullscreen sheet pushed the entry — the options dropdown or the
        // selected-items popover (mutually exclusive; showPopover() closes the dropdown first).
        if (this.#isOpen) this.close();
        else if (this.showSelectedPopover) this.hideSelectedPopover();
    }

    /** Programmatic close: remove the listener and pop the entry we pushed (so the
     *  history stack returns to its pre-open state). No-op if a Back gesture already
     *  consumed it (overlayHistoryActive is false by then). */
    private popOverlayHistory(): void {
        if (!this.overlayHistoryActive) return;
        this.overlayHistoryActive = false;
        window.removeEventListener('popstate', this.onOverlayPopstate);
        // The listener is already detached, so the popstate this triggers is ignored.
        history.back();
    }

    /**
     * Build the fullscreen overlay header: a search field (proxying to the same
     * `handleSearch`/`handleKeydown` path as the main input, since the overlay covers
     * it) plus a close button. Inserted before the scrolling list so it pins to the
     * top of the fixed panel. `renderDropdown()` only rewrites `dropdownInner`, so the
     * header survives re-renders.
     */
    private buildFullscreenHeader(): void {
        if (this.fullscreenHeader) return;

        const header = document.createElement('div');
        header.className = 'ms__fullscreen-header';

        if (this.options.isSearchEnabled && this.options.searchInputMode !== 'hidden') {
            // The input and its inline clear (✕) share a positioned wrapper so the
            // button can sit at the trailing edge of the field (inset-inline-end).
            const searchWrapper = document.createElement('div');
            searchWrapper.className = 'ms__fullscreen-search-wrapper';

            // Opt-in leading mode toggle (filter <-> navigate). Built first so it sits at
            // the field's leading edge: [toggle][input …clear]. Readonly search can still
            // switch modes (the mode governs how the list reacts, not typing), so it's not
            // gated on the readonly branch like the clear button is.
            if (this.options.isSearchModeToggleShown) {
                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'ms__fullscreen-mode-toggle';
                // Don't blur the search field on tap (parity with the clear button), then
                // flip the mode and restore focus in the click handler.
                toggle.addEventListener('mousedown', (e) => e.preventDefault());
                toggle.addEventListener('click', () => this.toggleSearchModeLive());
                searchWrapper.appendChild(toggle);
                this.fullscreenModeToggle = toggle;
            }

            const search = document.createElement('input');
            search.type = 'text';
            search.className = 'ms__fullscreen-search';
            search.placeholder = this.getPlaceholderText();
            search.autocomplete = 'off';
            if (this.options.searchInputMode === 'readonly') search.readOnly = true;

            // Proxy to the same search path as the main input, keeping the two in sync.
            search.addEventListener('input', (e) => {
                const value = (e.target as HTMLInputElement).value;
                this.input.value = value;
                this.handleSearch(value);
                this.updateFullscreenSearchClear();
            });
            // Arrow/Enter/Escape navigation lives on the main input's keydown; the header
            // search has focus in the overlay, so delegate to the same handler.
            search.addEventListener('keydown', (e) => this.handleKeydown(e));

            searchWrapper.appendChild(search);
            this.fullscreenSearchInput = search;

            // Clear-search button — readonly search can't be typed into, so it can't be
            // cleared either; only build it for an editable field.
            if (this.options.searchInputMode !== 'readonly') {
                const clear = document.createElement('button');
                clear.type = 'button';
                clear.className = 'ms__fullscreen-search-clear';
                clear.setAttribute('aria-label', 'Clear search');
                // Use mousedown+preventDefault so the tap doesn't blur/steal focus from
                // the search field, then run the clear on click and restore focus.
                clear.addEventListener('mousedown', (e) => e.preventDefault());
                clear.addEventListener('click', () => this.clearFullscreenSearch());
                searchWrapper.appendChild(clear);
                this.fullscreenSearchClear = clear;
            }

            header.appendChild(searchWrapper);
        }

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'ms__fullscreen-close';
        close.setAttribute('aria-label', 'Close');
        // The ✕ glyph is drawn via CSS (::before mask icon), shared with the popover
        // close so both overlays have the same close button.
        close.addEventListener('click', () => this.close());
        header.appendChild(close);

        // Navigate mode keeps the whole list visible and jumps focus between matches.
        // Desktop uses Ctrl+Arrow for that; touch has no such shortcut, so append a match
        // navigator (count + prev/next). Filter mode shrinks the list to matches, so it
        // needs no jump UI. Only built in navigate mode; the live mode toggle builds/tears
        // it down on switch (ensureFullscreenNav / removeFullscreenNav).
        this.dropdown.insertBefore(header, this.dropdownInner);
        this.fullscreenHeader = header;
        if (this.options.isSearchEnabled && (this.options.searchMode || 'filter') === 'navigate') {
            this.ensureFullscreenNav();
        }
        this.updateFullscreenModeToggle();
        this.updateFullscreenNav();
        this.updateFullscreenSearchClear();
    }

    /** Build the navigate-mode match navigator (count + prev/next) and append it to the
     *  fullscreen header, once. No-op if already built or the header isn't present. The
     *  nav wraps onto its own full-width row under the search box (header is flex-wrap;
     *  the nav takes 100% basis). */
    private ensureFullscreenNav(): void {
        if (this.fullscreenNav || !this.fullscreenHeader) return;

        const nav = document.createElement('div');
        nav.className = 'ms__fullscreen-nav';

        const count = document.createElement('span');
        count.className = 'ms__fullscreen-nav-count';
        nav.appendChild(count);

        const controls = document.createElement('div');
        controls.className = 'ms__fullscreen-nav-controls';

        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'ms__fullscreen-nav-btn ms__fullscreen-nav-btn--prev';
        prev.setAttribute('aria-label', 'Previous match');
        prev.addEventListener('click', () => this.focusPreviousMatch());

        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'ms__fullscreen-nav-btn ms__fullscreen-nav-btn--next';
        next.setAttribute('aria-label', 'Next match');
        next.addEventListener('click', () => this.focusNextMatch());

        controls.appendChild(prev);
        controls.appendChild(next);
        nav.appendChild(controls);
        this.fullscreenHeader.appendChild(nav);

        this.fullscreenNav = nav;
        this.fullscreenNavCount = count;
        this.fullscreenNavPrev = prev;
        this.fullscreenNavNext = next;
    }

    /** Remove the match navigator (switching to filter mode, which has no jump UI). */
    private removeFullscreenNav(): void {
        if (!this.fullscreenNav) return;
        this.fullscreenNav.remove();
        this.fullscreenNav = null;
        this.fullscreenNavCount = null;
        this.fullscreenNavPrev = null;
        this.fullscreenNavNext = null;
    }

    /** Flip searchMode filter<->navigate from the in-overlay toggle. */
    private toggleSearchModeLive(): void {
        const next: SearchMode = (this.options.searchMode || 'filter') === 'navigate' ? 'filter' : 'navigate';
        this.setSearchModeLive(next);
    }

    /**
     * Switch searchMode in place — the overlay's toggle path. The `search-mode` attribute
     * is reinit-on-change (it rebuilds and closes the overlay); this instead mutates the
     * live config, adds/removes the match navigator to match, and re-projects the current
     * term under the new mode (filter narrows the list / navigate keeps all + highlights),
     * all without tearing the open sheet down. Focus stays on the search field.
     */
    private setSearchModeLive(mode: SearchMode): void {
        if ((this.options.searchMode || 'filter') === mode) return;
        this.options.searchMode = mode;
        if (mode === 'navigate') this.ensureFullscreenNav();
        else this.removeFullscreenNav();
        this.updateFullscreenModeToggle();
        this.refreshSearchPlaceholder();
        // Re-run the current search so the list re-projects under the new mode. handleSearch
        // reads the (now-updated) searchMode and refreshes the navigator via updateFullscreenNav.
        void this.handleSearch(this.searchTerm);
        this.fullscreenSearchInput?.focus();
    }

    /** Sync the mode toggle's icon (via data-mode) and labels with the current searchMode.
     *  No-op when the toggle isn't built (opt-out, floating panel, or search hidden). */
    private updateFullscreenModeToggle(): void {
        if (!this.fullscreenModeToggle) return;
        const mode = (this.options.searchMode || 'filter');
        this.fullscreenModeToggle.dataset.mode = mode;
        // The button switches TO the other mode; label it by the action, expose current
        // mode via aria-pressed(=navigate) for assistive tech.
        const target = mode === 'navigate' ? 'filter' : 'navigate';
        this.fullscreenModeToggle.setAttribute('aria-label', `Switch to ${target} mode`);
        this.fullscreenModeToggle.setAttribute('title', `Switch to ${target} mode`);
        this.fullscreenModeToggle.setAttribute('aria-pressed', String(mode === 'navigate'));
    }

    /**
     * Sync the fullscreen match navigator (navigate mode only) with the current search
     * state: hide it until there's a term, then show "N of M" while a match is focused
     * (or "M matches" / "No matches"), and disable the prev/next buttons when there's
     * nothing to step through. No-op when the navigator isn't built (floating panel,
     * filter mode, or search disabled).
     */
    private updateFullscreenNav(): void {
        if (!this.fullscreenNav) return;

        const total = this.matchingIndices.size;
        const hasTerm = !!this.searchTerm;
        this.fullscreenNav.style.display = hasTerm ? '' : 'none';

        if (this.fullscreenNavCount) {
            if (total === 0) {
                this.fullscreenNavCount.textContent = this.options.emptyMessage || 'No matches';
            } else {
                const matched = Array.from(this.matchingIndices).sort((a, b) => a - b);
                const pos = matched.indexOf(this.focusedIndex);
                this.fullscreenNavCount.textContent = pos >= 0
                    ? `${pos + 1} of ${total}`
                    : `${total} match${total === 1 ? '' : 'es'}`;
            }
        }

        const disabled = total === 0;
        if (this.fullscreenNavPrev) this.fullscreenNavPrev.disabled = disabled;
        if (this.fullscreenNavNext) this.fullscreenNavNext.disabled = disabled;
    }

    /**
     * Show the fullscreen search's inline clear (✕) only while the field has text.
     * No-op when the button isn't built (floating panel, readonly/hidden search).
     */
    private updateFullscreenSearchClear(): void {
        if (!this.fullscreenSearchClear) return;
        const hasText = !!(this.fullscreenSearchInput && this.fullscreenSearchInput.value);
        this.fullscreenSearchClear.style.display = hasText ? '' : 'none';
    }

    /**
     * Clear the fullscreen search term via the same path a keystroke takes, then
     * refocus the field so the user can keep typing. Touch has no keyboard Escape,
     * so this button is the on-screen way to reset a search.
     */
    private clearFullscreenSearch(): void {
        if (this.fullscreenSearchInput) this.fullscreenSearchInput.value = '';
        this.input.value = '';
        this.handleSearch('');
        this.updateFullscreenSearchClear();
        this.fullscreenSearchInput?.focus();
    }

    private positionHint(): void {
        if (!this.hint) return;

        // Clean up previous anchor if it exists
        if (this.hintCleanup) {
            this.hintCleanup();
        }

        // Hint sits opposite the dropdown: if the dropdown is on the bottom, the hint
        // goes on top and vice versa. flip:false keeps it there — it must not flip
        // back over the dropdown. Re-derived (and re-anchored) whenever the dropdown
        // placement changes (afterPosition calls this).
        let hintPlacement: Placement = 'top-start';
        if (this.dropdownPlacement) {
            if (this.dropdownPlacement.startsWith('bottom')) {
                hintPlacement = this.dropdownPlacement.replace('bottom', 'top') as Placement;
            } else if (this.dropdownPlacement.startsWith('top')) {
                hintPlacement = this.dropdownPlacement.replace('top', 'bottom') as Placement;
            }
        }

        const handle = anchor(this.hint, this.inputWrapper, {
            strategy: 'fixed',
            placement: hintPlacement,
            offset: 4,
            shift: 8,
            flip: false
        });
        this.hintCleanup = () => handle.destroy();
    }

    private parseInitialSelection(): void {
        const initialValues = this.element.dataset.initialValues;
        if (initialValues) {
            try {
                const values = JSON.parse(initialValues);
                values.forEach((value: string | number) => {
                    this.selectedValues.add(String(value));
                });
                this.reconcileSelectedOptions();
                this.renderBadges();
            } catch (e) {
                dataLogger.error(`[${this.instanceId}] Failed to parse initial values:`, e);
            }
        }
    }

    /**
     * Resolve any `selectedValues` entries that don't yet have a matching
     * `selectedOptions` object by looking them up in the current `allOptions`.
     * Idempotent; safe to call after init *and* after `options` is replaced
     * (e.g., async fetch, `searchCallback` result, or late `element.options =`
     * assignment). Without this, `initial-values` declared before options
     * arrive ends up with phantom values that `getValue()` can never report.
     */
    private reconcileSelectedOptions(): void {
        if (this.selectedValues.size === 0 || this.allOptions.length === 0) return;
        this.selectedValues.forEach(valueKey => {
            if (this.selectedOptions.has(valueKey)) return;
            const option = this.allOptions.find(opt => String(this.getItemValue(opt)) === valueKey);
            if (option) this.selectedOptions.set(valueKey, option);
        });
    }

    private toggleSelectedPopover(): void {
        if (this.showSelectedPopover) {
            this.hideSelectedPopover();
        } else {
            this.showPopover();
        }
    }

    private showPopover(): void {
        uiLogger.debug(`[${this.instanceId}] showPopover() called`);

        // Consumers rendering their own selection UI turn the popover off; the count badge /
        // in-input counter still show, but their triggers are inert. Gating here covers every
        // entry point (badge click, counter click, "+X more", keyboard) in one place.
        if (!this.options.isSelectedPopoverEnabled) {
            uiLogger.debug(`[${this.instanceId}] showPopover() suppressed (isSelectedPopoverEnabled=false)`);
            return;
        }

        if (this.#isOpen) {
            this.close();
        }

        // Drop any lingering message — opening the popover changes the on-screen state
        // (see open()); a stale control-anchored toast would otherwise float over it.
        this.hideMessage();

        this.showSelectedPopover = true;
        this.renderSelectedPopover();
        this.selectedPopover.classList.add('ms__selected-popover--visible');

        // Add virtual class if using virtual scroll (matches dropdown pattern)
        const threshold = this.options.virtualScrollThreshold ?? 100;
        if (this.selectedValues.size >= threshold) {
            this.selectedPopover.classList.add('ms__selected-popover--virtual');
        }

        if (this.presentationMode === 'fullscreen') {
            // Full-viewport overlay: no anchoring. The popover already renders its own
            // header + close button, so it just needs the modifier class + scroll lock.
            // Push a history entry too, so the phone Back gesture closes the sheet instead
            // of navigating the page away (same guard the options dropdown uses).
            this.selectedPopover.classList.add('ms__selected-popover--fullscreen');
            this.lockBodyScroll();
            this.clampDocumentOverflowX();
            this.pushOverlayHistory();
        } else {
            this.positionSelectedPopover();
        }
    }

    private hideSelectedPopover(): void {
        uiLogger.debug(`[${this.instanceId}] hideSelectedPopover() called`);
        this.showSelectedPopover = false;
        this.selectedPopover.classList.remove('ms__selected-popover--visible');
        this.selectedPopover.classList.remove('ms__selected-popover--virtual');
        this.selectedPopover.classList.remove('ms__selected-popover--fullscreen');
        this.unlockBodyScroll();
        this.releaseDocumentOverflowX();
        // Consume the history entry we pushed on fullscreen open (no-op if a Back gesture
        // already popped it, or if we were never fullscreen).
        this.popOverlayHistory();
        this.hideMessage();
        this.selectedPopoverPlacement = null;

        // Cleanup virtual scroll
        if (this.selectedPopoverVirtualScroll) {
            this.selectedPopoverVirtualScroll.destroy();
            this.selectedPopoverVirtualScroll = null;
            this.selectedPopoverContainer = null;
        }

        if (this.selectedPopoverCleanup) {
            this.selectedPopoverCleanup();
            this.selectedPopoverCleanup = null;
        }

        // Tear down popover-only tooltips so they don't leak Floating UI cleanups.
        for (const id of Array.from(this.tooltips.keys())) {
            if (id.startsWith('popover-')) {
                this.tooltips.get(id)?.destroy();
                this.tooltips.delete(id);
            }
        }
    }

    private renderSelectedPopover(): void {
        const selectedOptions = Array.from(this.selectedOptions.values());
        const count = this.selectedValues.size;

        // Use virtual scroll for large selections (same threshold as the dropdown)
        const threshold = this.options.virtualScrollThreshold ?? 100;
        if (count >= threshold) {
            this.renderSelectedPopoverVirtual(selectedOptions, count);
            return;
        }

        // Standard rendering for small selections
        this.selectedPopover.innerHTML = `
            <div class="ms__selected-popover-header">
                <span>Selected Items (${count})</span>
                <button type="button" class="ms__selected-popover-close" aria-label="Close"></button>
            </div>
            <div class="ms__selected-popover-body">
                ${selectedOptions.map(option => this.renderBadgeHTML(option, { displayMode: this.options.badgesDisplayMode || 'badges', isInPopover: true })).join('')}
            </div>
        `;

        // Attach tooltips to popover badges
        this.attachBadgeTooltips(this.selectedPopover);
    }

    private renderSelectedPopoverVirtual(selectedOptions: T[], count: number): void {
        // Only create HTML structure if virtual scroll doesn't exist yet
        if (!this.selectedPopoverVirtualScroll) {
            const badgeHeight = this.scaledBadgeHeight();
            // Floating: fixed 18rem scroll area. Fullscreen: flex-fill the sheet instead
            // (the panel is a bounded flex column, so the virtual scroller still measures a
            // real clientHeight after layout).
            const bodySizing = this.presentationMode === 'fullscreen'
                ? 'flex: 1 1 0; min-height: 0;'
                : 'height: 18rem;';
            const html = `
                <div class="ms__selected-popover-header">
                    <span>Selected Items (${count})</span>
                    <button type="button" class="ms__selected-popover-close" aria-label="Close"></button>
                </div>
                <div class="ms__selected-popover-body ms__selected-popover-body--virtual" style="${bodySizing} overflow-y: auto; position: relative; --ms-badge-height-virtual: ${badgeHeight}px;"></div>
            `;
            this.selectedPopover.innerHTML = html;
            this.selectedPopoverContainer = this.selectedPopover.querySelector('.ms__selected-popover-body') as HTMLDivElement;
        } else {
            // Just update the count in header
            const header = this.selectedPopover.querySelector('.ms__selected-popover-header span');
            if (header) {
                header.textContent = `Selected Items (${count})`;
            }
        }

        if (!this.selectedPopoverContainer) return;

        // Initialize or update virtual scroll (same pattern as dropdown)
        // Add gap to itemHeight (4px default gap between badges), scaled to match.
        const badgeHeight = this.scaledBadgeHeight();
        const gap = Math.round(4 * this.fullscreenScale()); // 0.25rem default gap
        const itemHeight = badgeHeight + gap;
        const bufferSize = this.options.virtualScrollBuffer ?? 10;

        // Defer initialization until container has dimensions
        requestAnimationFrame(() => {
            if (!this.selectedPopoverContainer) return;

            if (!this.selectedPopoverVirtualScroll) {
                this.selectedPopoverVirtualScroll = new VirtualScroll<T>({
                    container: this.selectedPopoverContainer,
                    itemHeight,
                    items: selectedOptions,
                    renderItem: (item) => this.renderBadgeHTML(item, { displayMode: this.options.badgesDisplayMode || 'badges', isInPopover: true }),
                    bufferSize,
                    onVisibleRangeChange: () => {
                        // Attach tooltips to newly rendered badges in virtual scroll
                        this.attachBadgeTooltips(this.selectedPopoverContainer!);
                    }
                });
            } else {
                this.selectedPopoverVirtualScroll.setItems(selectedOptions);
            }
        });
    }

    /**
     * Coerce a render-callback result to an HTML string. Callbacks may return a string
     * (HTML) or an HTMLElement (serialized via `outerHTML`); null/undefined → ''. Used by
     * every "return string | HTMLElement" content callback that builds into an innerHTML
     * string. (DOM sinks that hold a live node instead — the reveal/message panels — use
     * textContent/appendChild directly and intentionally don't go through here.)
     */
    private toHtml(v: string | HTMLElement | null | undefined): string {
        return v == null ? '' : typeof v === 'string' ? v : v.outerHTML;
    }

    /**
     * Normalize a class callback result (`string | string[] | null`) to a single
     * space-joined string with falsy entries dropped — e.g. `['a', '', 'b'] → "a b"`,
     * `null → ""`. Callers add their own leading space / base class as needed.
     */
    private classSuffix(v: string | string[] | null | undefined): string {
        const arr = v == null ? [] : Array.isArray(v) ? v : [v];
        return arr.filter(Boolean).join(' ');
    }

    /**
     * Render a removable badge for a selected option (used by the badges/partial display modes
     * and by the selected-items popover).
     *
     * - In the popover, `renderSelectedItemContentCallback` and `getSelectedItemClassCallback` win
     *   over the regular badge callbacks; that's how consumers customize popover items independently.
     * - The `data-value` and aria-label both go through `getItemBadgeDisplayValue` so badge text and
     *   accessible name stay in sync.
     */
    private renderBadgeHTML(option: T, ctx: Omit<BadgeContentRenderContext, 'presentation' | 'isFullscreen' | 'isModal'>): string {
        const value = this.getItemValue(option);

        // Enrich the caller's context with the current presentation before handing it to a
        // consumer callback (call sites only supply displayMode + isInPopover).
        const renderCtx: BadgeContentRenderContext = {
            ...ctx,
            ...presentationContext(this.presentationMode),
        };

        // Whole-badge override (main badges area only). The consumer owns the entire markup;
        // we only wrap it so removal + reconciliation keep working: the wrapper carries
        // `data-value`, and the click handler deselects on any inner `[data-action="remove"]`
        // (or `.ms__badge-remove`). Falls back to the default pill when it returns nothing.
        if (!ctx.isInPopover && this.options.renderBadgeCallback) {
            const customHtml = this.toHtml(this.options.renderBadgeCallback(option, renderCtx));
            if (customHtml.trim() !== '') {
                const classCb = this.options.getBadgeClassCallback;
                let wrapperClasses = 'ms__badge ms__badge--custom';
                if (classCb) {
                    const extra = this.classSuffix(classCb(option));
                    if (extra) wrapperClasses += ' ' + extra;
                }
                return `<div class="${wrapperClasses}" data-value="${value}">${customHtml}</div>`;
            }
        }

        // Resolve content
        let badgeContent: string;
        const popoverCallback = ctx.isInPopover ? this.options.renderSelectedItemContentCallback : undefined;
        if (popoverCallback) {
            badgeContent = this.toHtml(popoverCallback(option));
        } else if (this.options.renderBadgeContentCallback) {
            badgeContent = this.toHtml(this.options.renderBadgeContentCallback(option, renderCtx));
        } else {
            badgeContent = this.getItemBadgeDisplayValue(option);
        }

        // Resolve classes
        const classCallback = ctx.isInPopover
            ? (this.options.getSelectedItemClassCallback || this.options.getBadgeClassCallback)
            : this.options.getBadgeClassCallback;
        let badgeClasses = 'ms__badge';
        if (classCallback) {
            const extra = this.classSuffix(classCallback(option));
            if (extra) badgeClasses += ' ' + extra;
        }

        const removeLabel = this.getItemBadgeDisplayValue(option);
        return `
            <div class="${badgeClasses}">
                <span class="ms__badge-text">${badgeContent}</span>
                <button type="button" class="ms__badge-remove" data-value="${value}" aria-label="Remove ${removeLabel}"></button>
            </div>
        `;
    }

    private handleSelectedPopoverClick(e: MouseEvent): void {
        e.stopPropagation();

        const closeBtn = (e.target as HTMLElement).closest('.ms__selected-popover-close');
        if (closeBtn) {
            e.preventDefault();
            this.hideSelectedPopover();
            return;
        }

        const removeBtn = (e.target as HTMLElement).closest('.ms__badge-remove') as HTMLElement;
        if (removeBtn) {
            e.preventDefault();
            const value = removeBtn.dataset.value!;
            const option = this.selectedOptions.get(value);
            if (option && this.interactiveDeselect(option)) {
                this.renderSelectedPopover();
                if (this.selectedValues.size === 0) {
                    this.hideSelectedPopover();
                }
            }
        }
    }

    private positionSelectedPopover(): void {
        // The fullscreen overlay is CSS-positioned (fixed, inset:0) — never anchored.
        if (this.presentationMode === 'fullscreen') return;
        this.selectedPopoverCleanup = this.anchorFloatingPanel(this.selectedPopover, {
            getPlacement: () => this.selectedPopoverPlacement,
            setPlacement: (p) => {
                this.selectedPopoverPlacement = p;
                uiLogger.debug(`[${this.instanceId}] Locked popover placement:`, p);
            }
        });
    }

    // ========================================================================
    // FORM INTEGRATION
    // ========================================================================

    private updateHiddenInput(): void {
        if (!this.options.formFieldId) return;

        // Remove existing inputs
        this.hiddenInputs.forEach(input => input.remove());
        this.hiddenInputs = [];

        const format = this.options.valueFormat || 'json';
        const values = Array.from(this.selectedOptions.values()).map(opt => this.getItemValue(opt));

        // Use hostElement if provided (for shadow DOM), otherwise use element
        const targetElement = this.options.hostElement || this.element;

        if (format === 'array') {
            // Multiple <input name="field[]" value="val1">
            values.forEach(value => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = `${this.options.formFieldId}[]`;
                input.value = String(value);
                targetElement.appendChild(input);
                this.hiddenInputs.push(input);
            });
        } else {
            // Single input with formatted value
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = this.options.formFieldId;
            input.id = this.options.formFieldId;
            input.value = this.getFormValue();
            targetElement.appendChild(input);
            this.hiddenInputs.push(input);
        }
    }

    private getFormValue(): string {
        const values = Array.from(this.selectedOptions.values()).map(opt => this.getItemValue(opt));

        // Custom callback takes precedence
        if (this.options.getValueFormatCallback) {
            return this.options.getValueFormatCallback(values);
        }

        const format = this.options.valueFormat || 'json';

        if (format === 'csv') {
            return values.join(',');
        }

        // json format (default)
        return JSON.stringify(values);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public getSelected(): T[] {
        return Array.from(this.selectedOptions.values());
    }

    /**
     * Set the selection programmatically. **Silent by default** — it does not fire
     * `select`/`deselect`/`change` (so restoring saved state, cascade resets, or a
     * server-authoritative correction can't loop back or trip "user changed it"
     * handlers). Pass `{ notify: true }` to announce the result as a **single
     * aggregate `change`** — for a deliberate user gesture (e.g. an action button)
     * that should reach the same listeners a manual pick does, without the per-item
     * `select`/`deselect` flood a bulk change would otherwise cause.
     */
    public setSelected(values: (string | number)[], opts: { notify?: boolean } = {}): void {
        this.selectedValues = new Set(values.map(v => String(v)));
        this.selectedOptions.clear();
        values.forEach(value => {
            const valueKey = String(value);
            const option = this.allOptions.find(opt => String(this.getItemValue(opt)) === valueKey);
            if (option) {
                this.selectedOptions.set(valueKey, option);
            }
        });
        this.renderDropdown();
        this.renderBadges();
        this.updateHiddenInput();

        if (opts.notify && this.options.onChange) {
            this.options.onChange(this.getSelected());
        }
    }

    /**
     * Merge a partial config update into the live picker without tearing down the DOM.
     *
     * Handles the cheap structural toggles inline (no-checkboxes class, badges-position class,
     * input placeholder, search-input mode) and re-renders dropdown + badges + hidden inputs.
     *
     * Returns `true` if the change could be applied in place. Returns `false` for changes that
     * truly require rebuilding the DOM scaffolding (currently: adding/removing the `searchHint`
     * element, since it's only created in `buildHTML` if a hint string was provided). The caller
     * should fall back to destroy + re-init in that case.
     */
    public updateOptions(partial: Partial<MultiSelectConfig<T>>): boolean {
        // Adding/removing the hint element after init isn't supported in place — buildHTML decides
        // whether to create it. Force a rebuild.
        const hintExists = !!this.hint;
        const hintWanted = 'searchHint' in partial ? !!partial.searchHint : hintExists;
        if (hintExists !== hintWanted) return false;

        Object.assign(this.options, partial);

        // Tree-affecting config keys — a change to any of these means the
        // hierarchy must be rebuilt from `allOptions`.
        const treeConfigChanged = 'pathMember' in partial || 'getPathCallback' in partial
            || 'parentPathMember' in partial || 'levelMember' in partial
            || 'hasChildrenMember' in partial || 'treePathSeparator' in partial
            || 'isTreeEnabled' in partial || 'isSelectableMember' in partial
            || 'getIsSelectableCallback' in partial;

        if ('options' in partial && partial.options !== undefined) {
            this.allOptions = partial.options;
            this.reconcileSelectedOptions();
            if (this.isTreeMode()) {
                // buildTree derives filteredOptions from the tree, honouring the current search term.
                this.buildTree();
            } else {
                this.filteredOptions = this.searchTerm ? this.filteredOptions : [...this.allOptions];
            }
        } else if (treeConfigChanged) {
            // Tree config toggled/changed without new options — rebuild from the existing list.
            if (this.isTreeMode()) this.buildTree();
            else this.filteredOptions = this.searchTerm ? this.filteredOptions : [...this.allOptions];
        }

        // Cascade config (checkbox-mode / cascade-select-policy) changed live. buildTree
        // rebuilds the index on a tree/options change; when only these knobs move we must
        // refresh it here and re-project the current selection so badges/form/UI reflect the
        // new mode/policy. Silent (no select/deselect/change) — this is a config switch, not
        // a user gesture; the projection is a pure re-derivation of the same underlying pick.
        const cascadeConfigChanged = 'checkboxMode' in partial || 'cascadeSelectPolicy' in partial;
        if (cascadeConfigChanged && !treeConfigChanged && !('options' in partial) && this.isTreeMode()) {
            this.cascadeIndex = this.isCascadeMode()
                ? buildCascadeIndex(this.tree!, (d) => String(this.getItemValue(d)))
                : null;
            if (this.isCascadeMode() && this.cascadeIndex) {
                this.cascadeCheckedAtoms = expandToAtoms(this.cascadeIndex, this.selectedValues);
                const emitted = projectSelection(
                    this.cascadeIndex,
                    this.cascadeCheckedAtoms,
                    this.cascadePolicy(),
                    (d) => String(this.getItemValue(d))
                );
                const newOptions = new Map<string, T>();
                for (const v of emitted) {
                    const opt = (this.cascadeIndex.nodeByValue.get(v)?.data as T | undefined)
                        ?? this.selectedOptions.get(v);
                    if (opt !== undefined) newOptions.set(v, opt);
                }
                this.selectedValues = new Set(emitted);
                this.selectedOptions = newOptions;
            }
        }

        // Structural class on host
        this.element.classList.toggle('ms--no-checkboxes',
            !this.options.isCheckboxesShown || !this.options.isMultipleEnabled);
        this.element.classList.toggle('ms--no-selected-popover',
            !this.options.isSelectedPopoverEnabled);

        // Badges position can change between block (top/bottom) and inline (left/right) layouts.
        if ('badgesPosition' in partial) {
            this.effectiveBadgesPosition = this.options.badgesPosition || 'bottom';
            if (this.isRTL) {
                if (this.effectiveBadgesPosition === 'left') this.effectiveBadgesPosition = 'right';
                else if (this.effectiveBadgesPosition === 'right') this.effectiveBadgesPosition = 'left';
            }
            const wrapper = this.element.querySelector('.ms__wrapper');
            wrapper?.classList.toggle('ms__wrapper--inline',
                this.effectiveBadgesPosition === 'left' || this.effectiveBadgesPosition === 'right');
        }

        // Input placeholder (only safe to set when dropdown is closed; otherwise renderBadges takes over).
        // Recomputed unconditionally so live changes to any input — placeholder text (e.g. a language
        // switch), search mode, or the option list emptying/filling for cascades — are reflected.
        if (!this.#isOpen) {
            this.input.placeholder = this.getPlaceholderText();
        }

        // Search input display mode
        if ('searchInputMode' in partial) {
            this.input.readOnly = this.options.searchInputMode === 'readonly';
            this.input.style.display = this.options.searchInputMode === 'hidden' ? 'none' : '';
        }

        // Hint text (element exists; just refresh content)
        if ('searchHint' in partial && this.hint) {
            this.hint.textContent = this.options.searchHint || '';
        }

        this.renderDropdown();
        this.renderBadges();
        this.updateHiddenInput();
        return true;
    }

    public get selectedItem(): T | null {
        if (this.selectedOptions.size === 0) return null;
        return Array.from(this.selectedOptions.values())[0];
    }

    /** The current search box text (empty string when nothing is typed). Read-only; clear it with `clearSearch()`. */
    public get searchText(): string {
        return this.searchTerm;
    }

    public get selectedValue(): string | number | (string | number)[] | null {
        // Return null if no value configuration
        if (!this.options.valueMember && !this.options.getValueCallback) {
            return null;
        }

        if (this.selectedOptions.size === 0) {
            return this.options.isMultipleEnabled ? [] : null;
        }

        const values = Array.from(this.selectedOptions.values()).map(opt => this.getItemValue(opt));

        // Mode-dependent return
        return this.options.isMultipleEnabled ? values : (values[0] ?? null);
    }

    public getValue(): string | number | (string | number)[] | null {
        if (this.selectedOptions.size === 0) {
            return this.options.isMultipleEnabled ? [] : null;
        }

        const values = Array.from(this.selectedOptions.values()).map(opt => this.getItemValue(opt));

        // Single value in single-select, array in multi-select
        return this.options.isMultipleEnabled ? values : (values[0] ?? null);
    }

    // ========================================================================
    // TOOLTIPS (badge text, badge-remove buttons, action buttons)
    // ========================================================================

    /**
     * Create or replace a tracked tooltip with the given id. Replacing destroys the old one,
     * which is the normal flow when re-rendering badges/actions.
     */
    private spawnTooltip(spec: {
        id: string;
        trigger: HTMLElement;
        content: string | HTMLElement;
        onBeforeShow?: () => void;
        /** Override placement (default: `badgeTooltipPlacement`). */
        placement?: Placement;
        /** Override offset (default: `badgeTooltipOffset`). */
        offsetDistance?: number;
        /** Override show delay (default: `badgeTooltipDelay`). */
        showDelay?: number;
        /** Tooltip element CSS class (default: badge tooltip styling). */
        cssClass?: string;
        /** Visibility-toggle CSS class (default: badge tooltip visible class). */
        visibleClass?: string;
        /** Anchor to and follow the mouse pointer. */
        followCursor?: boolean;
    }): void {
        this.tooltips.get(spec.id)?.destroy();
        // Prefer the shadow root over document.body so portaled tooltips inherit
        // the host's --ms-tooltip-* variables and data-theme overrides.
        const rootNode = this.element.getRootNode();
        const shadowContainer = rootNode instanceof ShadowRoot ? rootNode : null;
        const tooltip = createTooltip({
            trigger: spec.trigger,
            container: this.options.container ?? shadowContainer ?? document.body,
            content: spec.content,
            placement: spec.placement ?? this.options.badgeTooltipPlacement ?? 'top',
            offset: spec.offsetDistance ?? this.options.badgeTooltipOffset ?? 8,
            // Core takes a {show, hide} delay; the old Tooltip defaulted hide to 100ms.
            delay: { show: spec.showDelay ?? this.options.badgeTooltipDelay ?? 100, hide: 100 },
            // Core createTooltip has no cssClass default and uses 'is-visible';
            // fall back to the component's badge-tooltip classes the old Tooltip
            // defaulted to (option tooltips override with ms__option-tooltip).
            cssClass: spec.cssClass ?? 'ms__badge-tooltip',
            visibleClass: spec.visibleClass ?? 'ms__badge-tooltip--visible',
            followCursor: spec.followCursor,
            onBeforeShow: spec.onBeforeShow
        });
        this.tooltips.set(spec.id, tooltip);
    }

    private destroyAllTooltips(): void {
        this.tooltips.forEach(t => t.destroy());
        this.tooltips.clear();
    }

    /** Build the badge-text tooltip content (callback overrides; default = displayValue + optional subtitle on next line). */
    private buildBadgeTooltipContent(option: T): string | HTMLElement {
        if (this.options.getBadgeTooltipCallback) return this.options.getBadgeTooltipCallback(option);
        const displayValue = this.getItemBadgeDisplayValue(option);
        const subtitle = this.getItemSubtitle(option);
        return subtitle ? `${displayValue}\n${subtitle}` : displayValue;
    }

    /** Build the remove-button tooltip text (callback > format string with {0} > "Remove {name}"). */
    private buildRemoveButtonTooltipText(itemName: string, option?: T): string {
        if (option && this.options.getRemoveButtonTooltipCallback) return this.options.getRemoveButtonTooltipCallback(option);
        if (this.options.removeButtonTooltipText) return this.options.removeButtonTooltipText.replace('{0}', itemName);
        return `Remove ${itemName}`;
    }

    private attachBadgeTooltips(container?: HTMLElement): void {
        if (!this.options.isBadgeTooltipsEnabled) return;

        const isPopover = !!container;
        const targetContainer = container || this.badgesContainer;
        // Prefix popover tooltips so they don't collide with the main badges container's tooltips
        // (which are keyed by raw option value).
        const idPrefix = isPopover ? 'popover-' : '';
        const badges = targetContainer.querySelectorAll('.ms__badge:not(.ms__badge--more)');

        badges.forEach((badge: Element) => {
            const removeBtn = badge.querySelector('.ms__badge-remove') as HTMLElement;
            if (!removeBtn) return;
            const value = removeBtn.dataset.value!;
            const option = this.selectedOptions.get(value);
            if (!option) return;

            const textId = `${idPrefix}${value}`;
            const removeId = `${idPrefix}${value}-remove`;

            const badgeText = badge.querySelector('.ms__badge-text') as HTMLElement;
            if (badgeText) {
                this.spawnTooltip({
                    id: textId,
                    trigger: badgeText,
                    content: this.buildBadgeTooltipContent(option)
                });
            }

            const displayValue = this.getItemBadgeDisplayValue(option);
            this.spawnTooltip({
                id: removeId,
                trigger: removeBtn,
                content: this.buildRemoveButtonTooltipText(displayValue, option),
                // Keep parent badge tooltip from overlapping the remove-button tooltip.
                onBeforeShow: () => this.tooltips.get(textId)?.hide()
            });
        });

        // "+X more" badge remove button (only relevant for the main badges container, not popover).
        if (!isPopover) {
            const moreBadge = this.badgesContainer.querySelector('.ms__badge--more');
            const removeBtn = moreBadge?.querySelector('.ms__badge-remove') as HTMLElement | null;
            if (removeBtn && removeBtn.dataset.action === 'remove-hidden') {
                const maxVisible = this.options.badgesMaxVisible || 3;
                const hiddenCount = this.selectedOptions.size - maxVisible;
                this.spawnTooltip({
                    id: 'more-badge-remove',
                    trigger: removeBtn,
                    content: this.buildRemoveButtonTooltipText(`${hiddenCount} hidden items`)
                });
            }
        }
    }

    /** Build the option tooltip content (callback overrides; default = displayValue + optional subtitle on next line). */
    private buildOptionTooltipContent(option: T): string | HTMLElement {
        if (this.options.getOptionTooltipCallback) return this.options.getOptionTooltipCallback(option);
        const displayValue = this.getItemDisplayValue(option);
        const subtitle = this.getItemSubtitle(option);
        return subtitle ? `${displayValue}\n${subtitle}` : displayValue;
    }

    /**
     * Attach hover tooltips to the currently rendered dropdown options. Prunes existing option
     * tooltips first, so it's safe to call on every render and on every virtual-scroll range change
     * (where option DOM is recycled). Each option resolves its source object via `data-index` into
     * `filteredOptions`, the same global index `renderOption` was given.
     */
    private attachOptionTooltips(): void {
        this.destroyAllOptionTooltips();
        if (!this.options.isOptionTooltipsEnabled) return;

        const optionElements = this.dropdown.querySelectorAll('.ms__option');
        optionElements.forEach((el: Element) => {
            const optionEl = el as HTMLElement;
            const index = parseInt(optionEl.dataset.index ?? '-1', 10);
            if (index < 0) return;
            const option = this.filteredOptions[index];
            if (!option) return;

            const content = this.buildOptionTooltipContent(option);
            if (!content) return;
            this.spawnTooltip({
                id: `option-${index}`,
                trigger: optionEl,
                content,
                // Default to `top-start` (anchored to the row's start edge) so the tooltip doesn't
                // center on a full-width row. Falls through to the badge settings for delay/offset.
                placement: this.options.optionTooltipPlacement ?? 'top-start',
                offsetDistance: this.options.optionTooltipOffset ?? this.options.badgeTooltipOffset ?? 8,
                showDelay: this.options.optionTooltipDelay ?? this.options.badgeTooltipDelay ?? 100,
                cssClass: 'ms__option-tooltip',
                visibleClass: 'ms__option-tooltip--visible',
                followCursor: this.options.isOptionTooltipFollowCursor
            });
        });
    }

    /**
     * Tag each currently-rendered fullscreen option row whose title is horizontally
     * clipped with `.ms__option--truncated`, so CSS reveals its info affordance.
     * Runs per virtual-scroll render (rows recycle) and on the non-virtual render.
     * Horizontal (ellipsis) overflow only — the truncation mode this pairs with;
     * a wrapping title isn't "cut", it grows vertically. No-op unless fullscreen.
     */
    private markTruncatedOptions(): void {
        if (this.presentationMode !== 'fullscreen') return;
        const rows = this.dropdown.querySelectorAll('.ms__option');
        rows.forEach((el) => {
            const row = el as HTMLElement;
            const title = row.querySelector('.ms__option-title') as HTMLElement | null;
            const truncated = !!title && title.scrollWidth > title.clientWidth + 1;
            row.classList.toggle('ms__option--truncated', truncated);
        });
    }

    /**
     * Reveal (or dismiss) the full label of a clipped fullscreen row when its info
     * affordance is tapped — hover tooltips don't fire on touch, and a hover tooltip's
     * synthetic mouseleave (from the tap itself, under devtools touch emulation) would
     * flash it away. So this is a manually-controlled `createPopover` panel, mounted in
     * the shadow root for component styling, that stays until explicitly dismissed:
     * a second tap on the same button, a list scroll, a re-render, an outside tap, or
     * closing the panel (see hideLabelReveal + its call sites). Tapping the same button
     * while it's shown toggles it off.
     */
    private toggleLabelReveal(infoBtn: HTMLElement): void {
        // Second tap on the same button closes it.
        if (this.labelRevealPopover && this.labelRevealTrigger === infoBtn) {
            this.hideLabelReveal();
            return;
        }
        this.hideLabelReveal(); // drop any reveal anchored to a different button

        const row = infoBtn.closest('.ms__option') as HTMLElement | null;
        if (!row) return;
        const index = parseInt(row.dataset.index ?? '-1', 10);
        if (index < 0) return;
        const option = this.isTreeMode()
            ? (this.treeNodes[index]?.data as T | undefined)
            : this.filteredOptions[index];
        if (!option) return;

        const content = this.buildOptionTooltipContent(option);
        if (!content) return;

        // Build the reveal panel. Reuse the option-tooltip look; --fullscreen lifts it
        // above the overlay (z-index). It is created WITHOUT --visible (opacity 0) and
        // revealed one frame after open() positions it — otherwise floating-ui's first
        // (async) placement lets the opaque panel paint one frame at the 0,0 origin.
        // String content may carry a "\n" subtitle → textContent honours it under the
        // tooltip's `white-space: pre-wrap`.
        const panel = document.createElement('div');
        panel.className = 'ms__option-tooltip ms__option-tooltip--fullscreen';
        if (typeof content === 'string') panel.textContent = content;
        else panel.appendChild(content);

        const rootNode = this.element.getRootNode();
        const shadowContainer = rootNode instanceof ShadowRoot ? rootNode : null;
        const container = (this.options.container ?? shadowContainer ?? document.body) as HTMLElement;

        this.labelRevealTrigger = infoBtn;
        this.labelRevealPanel = panel;
        this.labelRevealPopover = createPopover({
            reference: infoBtn,
            panel,
            container,
            // Anchor to the button's trailing/top edge so the bubble clears the row.
            placement: 'top-end',
            offset: this.options.optionTooltipOffset ?? this.options.badgeTooltipOffset ?? 8,
            shift: 8,
            strategy: 'fixed'
        });
        this.labelRevealPopover.open();
        // Now positioned — reveal on the next frame so it fades in at the anchor, never 0,0.
        requestAnimationFrame(() => panel.classList.add('ms__option-tooltip--visible'));
    }

    /** Dismiss the full-label reveal popover, if shown. Idempotent. */
    private hideLabelReveal(): void {
        if (this.labelRevealPopover) {
            this.labelRevealPopover.destroy();
            this.labelRevealPopover = null;
        }
        if (this.labelRevealPanel) {
            this.labelRevealPanel.remove();
            this.labelRevealPanel = null;
        }
        this.labelRevealTrigger = null;
    }

    /**
     * Show a transient message ("toast") on top of the component. Its reason for existing:
     * in the fullscreen overlay the sheet covers the whole page, so a consumer can't surface
     * feedback (a blocked veto, a hint) where the user can see it. This renders above the
     * panel in BOTH presentations — anchored under the control when floating, pinned to the
     * bottom of the viewport (over the overlay) when fullscreen.
     *
     * Content is a string (plain text) or an HTMLElement (rich markup). `opts.variant`
     * (info | warning | error | success) picks the tone; `opts.duration` sets auto-dismiss
     * (0 = sticky). Tapping the message dismisses it. Only one shows at a time — a new call
     * replaces the previous. Also reached automatically when a veto callback returns a string.
     */
    public showMessage(content: string | HTMLElement, opts?: MessageOptions): void {
        this.hideMessage();

        const variant = opts?.variant ?? 'info';
        const duration = opts?.duration ?? 3000;
        const urgent = variant === 'error' || variant === 'warning';

        const el = document.createElement('div');
        el.className = `ms__message ms__message--${variant}`;
        // Announce to assistive tech; urgent tones interrupt, others are polite.
        el.setAttribute('role', urgent ? 'alert' : 'status');
        el.setAttribute('aria-live', urgent ? 'assertive' : 'polite');
        if (typeof content === 'string') el.textContent = content;
        else el.appendChild(content);
        el.addEventListener('click', () => this.hideMessage());

        const rootNode = this.element.getRootNode();
        const shadowContainer = rootNode instanceof ShadowRoot ? rootNode : null;
        const container = (this.options.container ?? shadowContainer ?? document.body) as HTMLElement;
        container.appendChild(el);
        this.messageEl = el;

        // Use the fullscreen (bottom-of-viewport) placement ONLY when a fullscreen overlay
        // is actually on screen. `presentationMode` is 'fullscreen' on phones even while the
        // panel is closed — so without the open check, a message fired with nothing open
        // would pin a detached toast to the bottom of the page. When closed (or floating),
        // anchor beneath the control so it reads as belonging to this component.
        const overlayOpen = this.presentationMode === 'fullscreen' && (this.#isOpen || this.showSelectedPopover);
        if (overlayOpen) {
            // Positioned by CSS (fixed, bottom-centre of the viewport, above the overlay).
            el.classList.add('ms__message--fullscreen');
        } else {
            const handle = anchor(el, this.inputWrapper, {
                strategy: 'fixed',
                placement: opts?.placement ?? 'bottom',
                offset: 8,
                shift: 8,
                // Flip once to a side that fits, then pin. Without freezing, a placement
                // with no stable fit (e.g. 'left' in a narrow viewport) makes flip +
                // autoUpdate oscillate between sides every frame.
                lockPlacement: 'freeze'
            });
            this.messageCleanup = () => handle.destroy();
        }

        // Next frame → opacity transition runs (element is in the DOM + positioned).
        requestAnimationFrame(() => el.classList.add('ms__message--visible'));

        if (duration > 0) {
            this.messageTimer = setTimeout(() => this.hideMessage(), duration);
        }
    }

    /** Dismiss the transient message, if shown. Idempotent. */
    public hideMessage(): void {
        if (this.messageTimer !== null) { clearTimeout(this.messageTimer); this.messageTimer = null; }
        if (this.messageCleanup) { this.messageCleanup(); this.messageCleanup = null; }
        if (this.messageEl) { this.messageEl.remove(); this.messageEl = null; }
    }

    /**
     * Hide (don't destroy) every currently-shown option tooltip immediately,
     * ignoring the hide delay. Wired to dropdown scroll so a tooltip can't trail
     * its recycling/scrolling anchor row. Handles stay in the map; a fresh hover
     * re-shows them.
     */
    private hideOptionTooltips(): void {
        for (const [id, handle] of this.tooltips) {
            if (id.startsWith('option-')) handle.hide();
        }
    }

    /**
     * Destroy only the option tooltips (prefixed `option-`). Called before re-rendering or
     * recycling the options list so per-option tooltip state doesn't leak.
     */
    private destroyAllOptionTooltips(): void {
        for (const id of Array.from(this.tooltips.keys())) {
            if (id.startsWith('option-')) {
                this.tooltips.get(id)?.destroy();
                this.tooltips.delete(id);
            }
        }
    }

    private attachActionButtonTooltips(): void {
        const actionButtons = this.dropdown.querySelectorAll('.ms__action-btn');

        actionButtons.forEach((button: Element) => {
            const buttonElement = button as HTMLElement;
            const action = buttonElement.dataset.action;
            if (!action) return;

            const buttonIndex = parseInt(buttonElement.dataset.buttonIndex || '-1');
            const actionConfig = buttonIndex >= 0
                ? this.options.actionButtons?.[buttonIndex]
                : this.options.actionButtons?.find(btn => btn.action === action);
            if (!actionConfig) return;

            const tooltipText = actionConfig.getTooltipCallback
                ? actionConfig.getTooltipCallback(this)
                : actionConfig.tooltip;
            if (!tooltipText) return;

            const id = `action-${buttonIndex >= 0 ? buttonIndex : action}`;
            this.spawnTooltip({ id, trigger: buttonElement, content: tooltipText });
        });
    }

    /**
     * Destroy only the action-button tooltips. Called from `renderDropdown`/`renderDropdownVirtual`
     * before rebuilding the actions row, so per-button tooltip state doesn't leak.
     */
    private destroyAllActionButtonTooltips(): void {
        for (const id of Array.from(this.tooltips.keys())) {
            if (id.startsWith('action-')) {
                this.tooltips.get(id)?.destroy();
                this.tooltips.delete(id);
            }
        }
    }

    /**
     * Destroy main-badges-container tooltips. Called before re-rendering the badges container.
     * Popover tooltips (prefixed `popover-`) survive — they're owned by the popover lifecycle and
     * cleaned up in `hideSelectedPopover`. Action-button tooltips (prefixed `action-`) survive too.
     */
    private destroyAllBadgeTooltips(): void {
        for (const id of Array.from(this.tooltips.keys())) {
            if (!id.startsWith('action-') && !id.startsWith('popover-')) {
                this.tooltips.get(id)?.destroy();
                this.tooltips.delete(id);
            }
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    public destroy(): void {
        this.destroyAllTooltips();
        this.hideLabelReveal();
        this.hideMessage();

        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = undefined;
        }
        this.abortInFlightSearch();

        if (this.dropdownCleanup) this.dropdownCleanup();
        if (this.hintCleanup) this.hintCleanup();
        if (this.selectedPopoverCleanup) this.selectedPopoverCleanup();

        // Detach Back-gesture handling WITHOUT popping history — a teardown (e.g. a DOM
        // move) must not trigger navigation. Any entry we pushed is harmless (same URL).
        // Done before exitFullscreen() so its popOverlayHistory() no-ops.
        if (this.overlayHistoryActive) {
            this.overlayHistoryActive = false;
            if (typeof window !== 'undefined') window.removeEventListener('popstate', this.onOverlayPopstate);
        }

        // Restore page scroll if we're torn down while a fullscreen overlay is open
        // (e.g. a DOM move destroys the picker mid-open).
        this.exitFullscreen();

        // Clean up document-level event listeners
        if (this.documentClickHandler) {
            document.removeEventListener('click', this.documentClickHandler);
            this.documentClickHandler = null;
        }
        if (this.documentKeydownHandler) {
            document.removeEventListener('keydown', this.documentKeydownHandler);
            this.documentKeydownHandler = null;
        }

        // Leave the single-active-overlay group.
        this.overlayCoord?.dispose();
        this.overlayCoord = null;

        // Clean up virtual scroll
        if (this.virtualScroll) {
            this.virtualScroll.destroy();
            this.virtualScroll = null;
        }

        if (this.dropdown) this.dropdown.remove();
        if (this.hint) this.hint.remove();
        if (this.selectedPopover) this.selectedPopover.remove();

        // Clear the element's content to prevent duplication on re-initialization
        this.element.innerHTML = '';
        this.element.classList.remove('ms', 'ms--open', 'ms--no-checkboxes');

        initLogger.info(`[${this.instanceId}] Component destroyed`);
    }
}
