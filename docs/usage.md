# Usage & API reference

This document covers the public surface of `<web-multiselect>` — declarative HTML usage, the full attribute / property / method / event tables, and the data shape.

## Declarative (no JavaScript)

Perfect for simple forms — just use standard HTML `<option>` and `<optgroup>` elements:

```html
<!-- Simple choice -->
<web-multiselect multiple="false">
  <option value="yes">Yes</option>
  <option value="no">No</option>
  <option value="maybe" selected>Maybe</option>
</web-multiselect>

<!-- With icons -->
<web-multiselect>
  <option value="apple" data-icon="🍎">Apple</option>
  <option value="banana" data-icon="🍌" selected>Banana</option>
  <option value="orange" data-icon="🍊">Orange</option>
</web-multiselect>

<!-- With groups -->
<web-multiselect>
  <optgroup label="Frontend">
    <option value="js" data-icon="🟨">JavaScript</option>
    <option value="ts" data-icon="🔷">TypeScript</option>
  </optgroup>
  <optgroup label="Backend">
    <option value="python" data-icon="🐍" selected>Python</option>
    <option value="java" data-icon="☕">Java</option>
  </optgroup>
</web-multiselect>
```

### Option data in HTML (`data-options`)

For simple static lists without `<option>` children or JavaScript, put the data
in the `data-options` attribute and pick a format with `data-options-format`:

```html
<!-- json (default): array of objects or [value, label] tuples -->
<web-multiselect
  value-member="value" display-value-member="label"
  data-options='[{"value":"js","label":"JavaScript"},{"value":"ts","label":"TypeScript"}]'>
</web-multiselect>

<!-- csv: first row is a header; map the columns via *-member -->
<web-multiselect
  data-options-format="csv"
  value-member="value" display-value-member="label"
  data-options="value,label&#10;js,JavaScript&#10;ts,TypeScript">
</web-multiselect>

<!-- plain: comma/newline-separated bare values (value === label), no member config -->
<web-multiselect data-options-format="plain" data-options="Apple,Banana,Cherry"></web-multiselect>

<!-- custom delimiters: semicolon cells, pipe rows (single-line csv) -->
<web-multiselect
  data-options-format="csv"
  data-options-splitter=";" data-options-row-splitter="|"
  value-member="value" display-value-member="label"
  data-options="value;label|js;JavaScript|ts;TypeScript">
</web-multiselect>
```

`data-options-splitter` / `data-options-row-splitter` customize the `csv` and
`plain` delimiters (default `,` and newline); use `\t` for a tab (TSV). They're
ignored for `json`.

Both attributes are reactive — changing either re-renders. Declarative `<option>`
children and a `.options` property set in JS both take precedence over `data-options`.

## Programmatic (with JavaScript)

For dynamic data and advanced features:

```html
<!-- Multi-select -->
<web-multiselect
  id="my-select"
  search-placeholder="Search options..."
  initial-values='["js","ts"]'>
</web-multiselect>
```

```typescript
// Import the component (includes styles)
import '@keenmate/web-multiselect';

// Or import styles separately if needed
import '@keenmate/web-multiselect/style.css';

const multiselect = document.querySelector('web-multiselect');

// Set options programmatically
multiselect.options = [
  { value: 'js', label: 'JavaScript', icon: '🟨' },
  { value: 'ts', label: 'TypeScript', icon: '🔷' },
  { value: 'py', label: 'Python', icon: '🐍' }
];

// Listen for events
multiselect.addEventListener('change', (e) => {
  console.log('Selected:', e.detail.selectedOptions);
  console.log('Values:', e.detail.selectedValues);
});

// Public API
const selected = multiselect.getSelected();
multiselect.setSelected(['js', 'ts']);
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `multiple` | `boolean` | `true` | Allow multiple selections |
| `defer` | `boolean` | `false` | Hold the first render. When present, the component builds nothing on upgrade (reserves space only) — wire `options`, callbacks (e.g. `getCustomStylesCallback`) and listeners first, then release with `ready()` (or by removing the attribute) so the picker builds once, flash-free. See [examples.md → Deferred initialization](./examples.md#deferred-initialization-defer--ready). Latched — once released it never re-closes; the element reflects an `is-ready` attribute after building |
| `search-placeholder` | `string` | `'Search...'` | Placeholder text shown while search is usable. When unset and `show-search-mode-toggle` is on, the default becomes mode-aware (`Search…` in navigate, `Filter…` in filter) and switches with the toggle; an explicit value always wins and stays fixed |
| `select-placeholder` | `string` | `'Pick an option...'` | Placeholder shown when search is disabled (`enable-search="false"`, or `search-input-mode` `readonly`/`hidden`) — the input acts as a picker, not a search box |
| `no-data-placeholder` | `string` | - | Opt-in placeholder shown when the option list is empty, so users see there's no data without opening. Highest priority when the list is empty. Useful for cascade multiselects (a child whose parent isn't resolved yet) |
| `search-hint` | `string` | - | Hint text shown above input when focused |
| `allow-groups` | `boolean` | `true` | Enable option grouping |
| `group-select-mode` | `'none' \| 'cascade'` | `'none'` | Group-header selection in a flat (non-tree) grouped multi-select list. `none`: headers are inert labels. `cascade`: each header shows a tristate checkbox that checks/unchecks all of the group's currently-visible members (the group itself is never a selected value). No effect in tree mode (use `checkbox-mode`) or single-select |
| `show-checkboxes` | `boolean` | `true` | Show checkboxes next to options |
| `checkbox-align` | `'top' \| 'center' \| 'bottom'` | `'center'` | Vertical alignment of an option's checkbox |
| `reserve-icon-slot` | `boolean` | `false` | Reserve a fixed-width icon gutter on every option row, including icon-less rows, so all labels share one start column (useful when a list mixes icon and icon-less rows) |
| `close-on-select` | `boolean` | `false` | Close dropdown after selecting |
| `dropdown-min-width` | `string` | - | Min width for dropdown (e.g., `'20rem'`) |
| `dropdown-max-width` | `string` | - | Max width for dropdown (any CSS length) |
| `dropdown-width` | `string` | - | Fixed dropdown width; mirrored to the `--ms-dropdown-width` CSS variable |
| `badges-display-mode` | `'badges' \| 'count' \| 'compact' \| 'partial' \| 'none'` | `'badges'` | How to display selected items. `badges`: one pill per item. `compact`: first item + count. `none`: no display |
| `badges-threshold` | `number` | - | Auto-switch mode when exceeded (see `badges-threshold-mode`) |
| `badges-threshold-mode` | `'count' \| 'partial'` | `'count'` | Mode after threshold: `count` shows badge, `partial` shows limited badges + more badge |
| `badges-max-visible` | `number` | `3` | Max badges shown in partial mode |
| `badges-position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Position of badges container |
| `collapse-badges-below` | `number` | - | Container-responsive opt-in: a px width. While the control's **own** box is narrower than this, `badges-display-mode` collapses to `count`; widening past it restores the configured mode. Watches the element, not the window |
| `badge-height` | `number` | `36` | Fixed badge height in px used for layout/virtualization |
| `show-badge-full-title` | `boolean` | `false` | Show the full title (`full-title-member` / `getFullTitleCallback`) on badges instead of the short label |
| `selected-order` | `'as-selected' \| 'label-asc' \| 'label-desc' \| 'member' \| 'custom'` | `'as-selected'` | Display order of the **selected** items (badges, partial mode, selected-items popover). `as-selected`: pick order. `label-asc`/`label-desc`: by badge label (locale-aware). `member`: by `selected-order-member` (or `getSelectedOrderCallback`). `custom`: `selectedOrderCompareCallback`. Display only — `getValue()`, `getSelected()` and form output keep pick order; the dropdown is never reordered |
| `selected-order-member` | `string` | - | Property used as the sort key when `selected-order="member"`. Numeric keys sort numerically. Overridden by `getSelectedOrderCallback` |
| `enable-selected-popover` | `boolean` | `true` | Allow the selected-items popover to open (from the count/compact/"+N more" badge or the in-input counter). Turn off when you render your own selection UI |
| `selected-popover-title` | `string` | `'Selected Items ({count})'` | Header text of the selected-items popover. `{count}` is replaced with the selection count |
| `selected-popover-width` | `string` | - | Selected-items popover width; mirrored to the `--ms-selected-popover-width` CSS variable |
| `show-counter` | `boolean` | `false` | Show `[3]` badge next to toggle icon |
| `show-clear` | `boolean` | `false` | Show an inline clear (✕) button inside the input that wipes the whole selection. Appears only while something is selected and the control is enabled; clicking it clears the selection and any search text, fires `change`, and refocuses |
| `enable-badge-tooltips` | `boolean` | `false` | Enable tooltips on selected badges |
| `badge-tooltip-placement` | floating-ui placement: `'top' \| 'top-start' \| 'top-end' \| 'bottom' \| 'bottom-start' \| 'bottom-end' \| 'left' \| 'left-start' \| 'left-end' \| 'right' \| 'right-start' \| 'right-end'` | `'top'` | Tooltip placement relative to badge |
| `badge-tooltip-delay` | `number` | `100` | Delay in ms before showing tooltip |
| `badge-tooltip-offset` | `number` | `8` | Distance in pixels between badge and tooltip |
| `remove-button-tooltip-text` | `string` | `'Remove {0}'` | Hover-tooltip text for a badge's remove (×) button; `{0}` is replaced with the item's label. Shown only with `enable-badge-tooltips`. `getRemoveButtonTooltipCallback` wins. (The button's `aria-label` comes from `labels.removeItem`, not this) |
| `enable-option-tooltips` | `boolean` | `false` | Enable hover tooltips on dropdown options |
| `option-tooltip-placement` | floating-ui placement (same 12 values as `badge-tooltip-placement`) | `'top-start'` | Option tooltip placement (anchored to the row's start edge by default; use `left`/`right` for the start/end side on a narrow control) |
| `option-tooltip-delay` | `number` | inherits `badge-tooltip-delay`, then `100` | Delay in ms before showing an option tooltip |
| `option-tooltip-offset` | `number` | inherits `badge-tooltip-offset`, then `8` | Distance in pixels between row and option tooltip |
| `option-tooltip-follow-cursor` | `boolean` | `false` | Anchor the option tooltip to the mouse pointer and follow it across the row (best for full-width rows) |
| `max-height` | `string` | `'20rem'` | Maximum height of dropdown |
| `empty-message` | `string` | `'No results found'` | Message when no options found |
| `loading-message` | `string` | `'Loading...'` | Message while loading async data |
| `min-search-length` | `number` | `0` | Minimum characters before searching starts (local filter/navigate and async `searchCallback`); shorter terms show all options |
| `search-debounce` | `number` | `0` | Debounce (ms) before the async `searchCallback` fires; coalesces keystroke bursts into one request. Resets on each keystroke. Async callback only — local filtering stays instant. `0` = no debounce |
| `keep-options-on-search` | `boolean` | `true` | Keep initial options visible when `searchCallback` is active (hybrid search) |
| `should-keep-search-on-close` | `boolean` | unset | Preserve search text and filtered results when the dropdown closes. Unset: kept in multi-select, cleared in single-select |
| `tab-behavior` | `'select-highlighted' \| 'select-navigated' \| 'close'` | unset | What Tab / Shift+Tab selects before focus moves on: the highlighted option (also the first match highlighted while typing), only an option the user arrowed to, or nothing. Unset: `select-highlighted` in single-select, `close` in multi-select. Tab never deselects |
| `sticky-actions` | `boolean` | `true` | Keep the action-buttons block pinned to its edge while scrolling |
| `actions-layout` | `'nowrap' \| 'wrap'` | `'nowrap'` | Whether buttons in a row wrap: `nowrap` (single line) or `wrap` |
| `actions-position` | `'top' \| 'bottom'` | `'top'` | Place the actions block at the top or bottom (sticky footer) of the dropdown |
| `actions-align` | `'stretch' \| 'left' \| 'right' \| 'center' \| 'space-between'` | `'stretch'` | Horizontal arrangement of buttons within a row (`stretch` = full-width) |
| `lock-placement` | `boolean` | `true` | Lock dropdown placement after first open to prevent flipping |
| `enable-search` | `boolean` | `true` | Enable/disable search functionality |
| `search-input-mode` | `'normal' \| 'readonly' \| 'hidden'` | `'normal'` | Search input display mode |
| `search-mode` | `'filter' \| 'navigate'` | `'filter'` | Search behavior: `filter` hides non-matches, `navigate` jumps to matches |
| `search-behavior` | `'normalized' \| 'case-insensitive' \| 'exact'` | `'normalized'` | How internal search normalizes text. `normalized` ignores case and diacritics (`ces` finds `Český`), `case-insensitive` ignores case only, `exact` matches both. Live: changing it re-runs the current search. Not applied to `searchCallback` or `regex` matching. See [How search works](#how-search-works) |
| `search-match` | `'contains' \| 'equals' \| 'starts-with' \| 'word-starts-with' \| 'ends-with' \| 'word-ends-with' \| 'regex'` | `'contains'` | Where internal search looks for the term: anywhere, the whole value, at the start/end of the whole value, at the start/end of any word, or as a regular expression. Live. See [How search works](#how-search-works) |
| `overlay-group` | `string` | — | Scope the "one overlay open at a time" coordination to a named group. Overlays (multiselects, datepickers, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group |
| `show-search-mode-toggle` | `boolean` | `false` | In the phone fullscreen overlay, show a leading icon in the search bar that flips `search-mode` between `filter` and `navigate` live (no reopen). Fullscreen-only |
| `mobile-presentation` | `'auto' \| 'floating' \| 'fullscreen'` | `'auto'` | How the open dropdown is presented on phones. `auto`: floating panel on desktop/tablet, full-screen overlay on phone-sized touch devices. `floating`: anchored panel everywhere. `fullscreen`: full-screen overlay on any device (handy for previews/testing) |
| `fullscreen-autofocus` | `boolean` | `false` | In the phone fullscreen overlay, focus the search field on open (pops the soft keyboard immediately). Default: the sheet opens with the list visible and the keyboard closed. No effect in the floating presentation |
| `allow-add-new` | `boolean` | `false` | Allow adding new options not in the list (fires the `add` event) |
| `add-new-text` | `string` | `'Add "{value}"'` | Template for the "add new" prompt shown in place of the empty message when a search has no matches. `{value}` is the typed text. `getAddNewTextCallback` wins |
| `add-new-pending-text` | `string` | `'Adding "{value}"…'` | Template for the pending prompt (spinner + text) shown while an async `beforeAddCallback` runs. `{value}` is the typed text |
| `value-member` | `string` | - | Property name for value/ID extraction from custom objects |
| `display-value-member` | `string` | - | Property name for display text extraction from custom objects |
| `search-value-member` | `string` | - | Property name for search text extraction from custom objects |
| `icon-member` | `string` | - | Property name for icon extraction from custom objects |
| `subtitle-member` | `string` | - | Property name for subtitle extraction from custom objects |
| `group-member` | `string` | - | Property name for group extraction from custom objects |
| `disabled-member` | `string` | - | Property name for disabled state extraction from custom objects |
| `full-title-member` | `string` | - | Property name for a full/long title (shown on badges with `show-badge-full-title`) |
| `path-member` | `string` | - | Tree mode: property holding a node's materialized path (e.g. `1.1.2`). Setting a path source enables tree mode |
| `parent-path-member` | `string` | - | Tree mode: property holding a node's parent path |
| `level-member` | `string` | - | Tree mode: property holding a node's depth level |
| `has-children-member` | `string` | - | Tree mode: property flagging that a node has children |
| `is-selectable-member` | `string` | - | Tree mode: property marking whether a node can be selected |
| `tree-path-separator` | `string` | `'.'` | Tree mode: separator between segments of a materialized path |
| `checkbox-mode` | `'independent' \| 'cascade'` | `'cascade'` | Tree checkbox interaction. `cascade`: checks a node's whole subtree, tristate boxes on branches. `independent`: toggles only the clicked node. Tree + multiple only |
| `cascade-select-policy` | `'rolled-up' \| 'leaves' \| 'all'` | `'rolled-up'` | In `cascade` mode, which values a selection emits (badges / form / `change`). `rolled-up`: a fully-selected subtree collapses to its root. `leaves`: only checked leaves. `all`: every fully-checked node |
| `name` | `string` | - | HTML form field name for form integration (creates hidden input) |
| `value-format` | `'json' \| 'csv' \| 'array'` | `'json'` | Format for form value serialization |
| `initial-values` | `string` (JSON array or CSV) | - | Pre-selected values. Accepts `["js","ts"]` or a bare `js,ts` |
| `data-options` | `string` | - | HTML-authoring source for the option list, parsed per `data-options-format`. Prefer the `options` property in JS. Reactive; declarative `<option>` children and a set `options` property both take precedence |
| `data-options-format` | `'json' \| 'csv' \| 'plain'` | `'json'` | How to parse `data-options`: `json` (array of objects or `[value,label]` tuples), `csv` (first row = header → object per row, keyed by the header cells; map columns via `*-member`), or `plain` (bare values → `value=label` options) |
| `data-options-splitter` | `string` | `','` | Field/cell delimiter for the `csv` and `plain` formats (e.g. `;`, `\|`). Escapes `\t` `\n` `\r` are honoured (`"\t"` → TSV). Ignored for `json` |
| `data-options-row-splitter` | `string` | newline | Row/record delimiter for the `csv` and `plain` formats (e.g. `;` for single-line data). Escapes honoured. Ignored for `json` |
| `prune-missing-selection` | `boolean` | `false` | When the option set is replaced (`options` / `data-options`), silently drop selected values whose option is no longer present. Default keeps them (safe for search/paged lists) |
| `enable-virtual-scroll` | `boolean` | `false` | Enable virtual scrolling for large datasets |
| `virtual-scroll-threshold` | `number` | `100` | Minimum items before virtual scroll activates |
| `option-height` | `number` | `50` | Fixed height for each option in pixels (required for virtual scroll) |
| `virtual-scroll-buffer` | `number` | `10` | Buffer size — extra items rendered above/below viewport |
| `custom-styles` | `string` | - | Raw CSS injected into the Shadow DOM (a full stylesheet, selectors and all) — the declarative alternative to `getCustomStylesCallback`, which wins when both are set |
| `show-debug-info` | `boolean` | `false` | **Deprecated** — use per-instance logging (`el.enableLogging()`) instead. Renders an in-component debug panel |

## Properties

```typescript
// Get/set options
multiselect.options = [
  { value: 'js', label: 'JavaScript' },
  { value: 'ts', label: 'TypeScript' }
];

// Async data loading. `signal` aborts when a newer search supersedes this one —
// forward it to fetch to cancel the stale request.
multiselect.searchCallback = async ({ term, signal }) => {
  const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal });
  return await response.json();
};

// Pre-process search terms before calling searchCallback
multiselect.beforeSearchCallback = ({ term }) => {
  // Remove accents: "café" → "cafe"
  const normalized = term.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Skip the search if too short (return false to prevent search)
  if (normalized.length < 2) return false;

  return normalized; // Return transformed term
};

```

### How search works

There are two ways to search, and they don't mix:

**Internal search** (no `searchCallback`). Each option's search value is the string from
`search-value-member` / `getSearchValueCallback` (else the display value), normalized per
`search-behavior` and **prepared once per option** — a keystroke is one lookup per option,
not a re-normalization. The typed term goes through:

```
term → beforeSearchCallback → getSearchTermCallback (or: trim + normalize) → match per search-match
```

| `search-match` | `kru` vs `Český Krumlov` | `town` vs `Old Town` / `Townsend` |
|---|---|---|
| `contains` (default) | ✅ | both |
| `equals` | ❌ | neither |
| `starts-with` | ❌ | `Townsend` |
| `word-starts-with` | ✅ | both |
| `ends-with` | ❌ | `Old Town` |
| `word-ends-with` | ❌ | `Old Town` |

`equals` is for codes: with the default `normalized` behavior, `haxkl324` finds `HAxKL324` but
not `HAxKL3245`. Use `search-behavior="case-insensitive"` if accents must still count.

> **`regex` skips normalization.** With `search-match="regex"` (or a `RegExp` returned from
> `getSearchTermCallback`) the pattern is tested against the **raw** search value —
> `search-behavior` does not apply, so case and accents are up to your pattern (use the `i`
> flag, character classes, …). Mixing a regex with expectations of normalized matching can give
> unexpected results. A typed pattern that doesn't compile (e.g. mid-typing `(`) keeps the last
> valid result.

`getSearchTermCallback` lets you prepare the term yourself — e.g. make part numbers match
whatever separators the user types:

```javascript
// "ha-324/56" finds "HA 324-56" and "HA32456"
multiselect.getSearchTermCallback = ({ term }) =>
  new RegExp(term.split(/[^a-z0-9]+/i).filter(Boolean).join('[^a-z0-9]*'), 'i');
```

A string it returns is used as-is (normalize it yourself — `normalizeSearchText` is exported —
to match the prepared option values). `null` / `''` means no search.

**Your own search** (`searchCallback`) — FlexSearch, a server, anything, sync or async.
`search-behavior` / `search-match` don't apply; you normalize however you want. Its `ctx`
gives you the typed `term`, the abort `signal`, `searchTerm` — the term from
`getSearchTermCallback` (any shape, with `ctx.target === 'callback'`) — and `entries`, every
option paired with its raw search value — which may
be an object:

```javascript
import { normalizeSearchText } from '@keenmate/web-multiselect';

multiselect.getSearchValueCallback = ({ item: city }) => ({
  title: normalizeSearchText(city.name),     // optional: the standard normalization
  zip: city.zip.replace(/\s/g, ''),
});
multiselect.getSearchTermCallback = ({ term, target }) =>
  target === 'callback' ? { zip: term.replace(/\s/g, ''), text: normalizeSearchText(term) } : term;

multiselect.searchCallback = ({ searchTerm, entries }) =>
  entries
    .filter(e => e.searchValue.zip.startsWith(searchTerm.zip) || e.searchValue.title.includes(searchTerm.text))
    .map(e => e.item);
```

`entries` is built on first access (a server-backed callback that ignores it pays nothing),
each value is computed once, and it's the **same array** until the options change — key your
search-engine index on it. Internal search needs a string: an object search value without a
`searchCallback` falls back to the display value, with a console warning.

```typescript
// Interceptors — veto a selection/deselection before it happens.
// One ctx argument: { option, selectedOptions, selectedValues, source, controller, element, … }.
// Return false to block; return nothing to allow. May be async. No event fires on a veto.
// To explain a veto, show a message yourself via ctx.controller.showMessage() — a
// returned string no longer vetoes. `ctx.source` is the gesture ('option', 'badge',
// 'group', 'select-all', 'clear-all', 'clear'): bulk gestures (Select-All, Clear-All, a
// group checkbox, …) run the veto per option and skip the vetoed ones.
// Programmatic setSelected() and form reset bypass these.
multiselect.beforeSelectCallback = ({ option, selectedOptions }) => {
  // Example: don't allow selecting "item1" while "item2" is already selected
  if (option.value === 'item1' && selectedOptions.some(o => o.value === 'item2')) {
    return false; // blocked silently
  }
};

multiselect.beforeDeselectCallback = ({ option, controller }) => {
  // Example: "item1" is required — can't be removed once chosen
  if (option.value === 'item1') {
    controller.showMessage('Item 1 is required', { type: 'warning' });
    return false; // blocked + message shown
  }
};

// Keyboard hook — runs on every keydown BEFORE the built-in handling (synchronous).
// Return false to suppress the built-in handling of the key (you own preventDefault);
// return nothing to fall through to the defaults. `ctx.controller` is the public
// controller (same object as el.controller).
multiselect.beforeKeydownCallback = (ctx) => {
  // Vim-style navigation. Returning false means you own the key — call
  // preventDefault() so a printable key like 'j' isn't also typed into search.
  if (ctx.key === 'j') { ctx.event.preventDefault(); ctx.controller.focusNext(); return false; }
  if (ctx.key === 'k') { ctx.event.preventDefault(); ctx.controller.focusPrevious(); return false; }
  // Ctrl+A → select all currently-filtered options (selectValue is a no-op if
  // already selected — so it's a true "select all", not a toggle/invert)
  if ((ctx.event.ctrlKey || ctx.event.metaKey) && ctx.key === 'a') {
    ctx.event.preventDefault();
    ctx.filteredOptions.forEach(o => ctx.controller.selectValue(o.value));
    return false;
  }
  // ctx also exposes: event, key, isOpen, presentation, searchTerm,
  // focusedIndex, focusedOption, filteredOptions, selectedValues (the real values).
  // controller — see "Controller (el.controller)" below.
};

// Event handler properties (on* twins). Each receives the event DETAIL (not the
// CustomEvent) and runs right before the event is dispatched.
// addEventListener('select', (e) => e.detail.option) is unchanged.
multiselect.onAdd = (detail) => {
  console.log('Add requested:', detail.value, detail.option);
};

multiselect.onSelect = ({ option }) => {
  console.log('Selected:', option);
};

multiselect.onDeselect = ({ option }) => {
  console.log('Deselected:', option);
};

multiselect.onChange = ({ selectedOptions, selectedValues }) => {
  console.log('Changed:', selectedOptions, selectedValues);
};

// Every action-button activation and every data-action element inside rendered
// option / badge content or a showMessage element (see the `action` event).
multiselect.onAction = (detail) => {
  console.log('Action:', detail.action, detail.id, detail.source, detail.option);
};

// Veto an action item (its onClick, the `action` event and the built-in behaviour)
multiselect.beforeActionCallback = (detail) => {
  if (detail.action === 'clear-all' && !confirm('Clear everything?')) return false;
};

// Badge display customization (show different text in badges vs dropdown)
multiselect.getBadgeDisplayCallback = ({ item }) => {
  // Show shorter text in badges (e.g., just name instead of "name (email)")
  return item.name; // Dropdown might show "John Doe (john@example.com)"
};

// Badge tooltip customization
multiselect.getBadgeTooltipCallback = ({ item }) => {
  return `${item.label} - ${item.subtitle}`;
};

// Option (dropdown row) tooltip customization — requires enable-option-tooltips
multiselect.getOptionTooltipCallback = ({ item }) => {
  return `${item.label} — ${item.description}`;
};

// Action buttons (core action items). None render unless you set actionButtons.
// Built-ins: 'select-all', 'clear-all' (string shorthand or { action, … });
// custom items are identified by `id`. Every get*Callback receives ONE ctx — the
// selection snapshot: selectedValues, selectedOptions, options, selectedCount,
// optionCount, isOpen, searchTerm, presentation, controller and element (the host).
// onClick(detail) receives the `action` event detail (ctx + action, id, item,
// source, sourceEvent, triggerElement, dataset) and runs for built-ins too
// (before the built-in). Text and icon are plain text (not HTML).
// Optional `row` (1-based) stacks buttons into multiple rows.
multiselect.actionButtons = ['select-all', 'clear-all']; // shorthand (text from labels.selectAll / labels.clearAll)

multiselect.actionButtons = [
  {
    action: 'select-all',
    text: 'Select All',
    tooltip: 'Select all items',
    cssClass: 'my-custom-class',
    getIsVisibleCallback: (ctx) => ctx.selectedCount < 5  // Hide if 5+ selected
  },
  {
    action: 'clear-all',
    text: 'Clear All',
    icon: '✕',
    isDanger: true,   // destructive styling
    tooltip: 'Clear selection',
    isVisible: true,  // Static visibility
    isDisabled: false // Static disabled state
  },
  {
    id: 'invert',
    text: 'Invert',
    tooltip: 'Invert selection',
    onClick: ({ options, selectedValues, controller }) => {
      // Custom action - invert selection (assumes options with a `value` field)
      const allValues = options.map(opt => opt.value);
      const inverted = allValues.filter(v => !selectedValues.includes(v));
      controller.setSelected(inverted, { notify: true }); // emit one `change`
    },
    // Dynamic callbacks (take priority over static properties)
    getIsDisabledCallback: (ctx) => ctx.selectedCount === 0,
    getTextCallback: (ctx) => ctx.selectedCount > 0 ? 'Invert' : 'Select Items First',
    getClassCallback: (ctx) => ctx.selectedCount > 0 ? 'active' : 'inactive',
    getTooltipCallback: (ctx) => `Invert ${ctx.selectedCount} of ${ctx.optionCount}`,
    getIsActiveCallback: (ctx) => ctx.selectedCount > 0  // toggle state → aria-pressed
  }
];

// Counter i18n/pluralization
multiselect.getCounterCallback = ({ count, moreCount }) => {
  if (moreCount !== undefined) {
    return `+${moreCount} more`; // Partial mode badge
  }
  return `${count} selected`; // Count mode display
};

// Data extraction - Member properties (for simple property names)
multiselect.valueMember = 'id';
multiselect.displayValueMember = 'name';
multiselect.iconMember = 'icon';
multiselect.subtitleMember = 'description';
multiselect.groupMember = 'category';
multiselect.disabledMember = 'isDisabled';

// Data extraction - Callback functions (for complex logic). Each takes ONE ctx;
// the option is ctx.item.
multiselect.getValueCallback = ({ item }) => item.id || item.value;
multiselect.getDisplayValueCallback = ({ item }) => item.label || item.name;
multiselect.getSearchValueCallback = ({ item }) => `${item.name} ${item.tags.join(' ')}`;
multiselect.getIconCallback = ({ item }) => item.icon || '📄';
multiselect.getSubtitleCallback = ({ item }) => `${item.price} - ${item.stock} in stock`;
multiselect.getGroupCallback = ({ item }) => item.category;
multiselect.getIsDisabledCallback = ({ item }) => item.stock === 0;
multiselect.getFullTitleCallback = ({ item }) => `${item.name} (${item.email})`; // badges, with show-badge-full-title

// Tree of options (alternative to path-member etc.)
multiselect.getPathCallback = ({ item }) => item.path;            // e.g. "1.2.3"; enables tree mode
multiselect.getIsSelectableCallback = ({ item, node }) => !item.isFolder; // node: the built tree node
multiselect.isTreeEnabled = true; // tristate: true / false force tree mode; null (default) = auto when a path source is set

// Selected-items display order (with selected-order="member" / "custom")
multiselect.getSelectedOrderCallback = ({ item }) => item.priority;   // sort key
multiselect.selectedOrderCompareCallback = (a, b) => a.rank - b.rank; // comparator — the one positional callback

// Extra CSS classes (ctx: { item, displayMode, isInPopover })
multiselect.getBadgeClassCallback = ({ item }) => item.isVip ? 'vip' : '';                // badges (string | string[])
multiselect.getSelectedItemClassCallback = ({ item }) => item.isVip ? ['vip', 'bold'] : []; // popover items (falls back to getBadgeClassCallback)

// Count chip shared by the in-input counter and group-header counts (default `[selected]`)
multiselect.getCountLabelCallback = ({ selectedCount, totalCount }) => `${selectedCount}/${totalCount}`;

// Badge remove-button hover tooltip (shown with enable-badge-tooltips; the
// button's aria-label comes from labels.removeItem instead)
multiselect.getRemoveButtonTooltipCallback = ({ item }) => `Unassign ${item.name}`;

// Custom rendering - Full HTML control
multiselect.renderGroupLabelContentCallback = (ctx) => {
  // ctx: groupName, members, selectedMembers, selectedCount, memberCount,
  // selectableCount, checkState, plus presentation / isFullscreen / isModal
  return `<strong>📦 ${ctx.groupName.toUpperCase()}</strong> ${ctx.selectedCount}/${ctx.memberCount}`;
};

// ctx: { item, index, isSelected, isFocused, isMatched, isDisabled, …tree fields }
// A [data-action] element inside fires the `action` event (source 'option') and
// never toggles the row.
multiselect.renderOptionContentCallback = ({ item }) => {
  return `<strong>${item.name}</strong> <span class="badge">${item.status}</span>`;
};

multiselect.renderBadgeContentCallback = ({ item, isInPopover }) => {
  return isInPopover
    ? `${item.icon} ${item.name} - ${item.description}`
    : `${item.icon} ${item.name}`;
};

// Replace the WHOLE badge (not just its content). Wrapped in
// .ms__badge.ms__badge--custom; an inner [data-ms-action="remove"] (or
// .ms__badge-remove) removes the item.
// Return null to fall back to the default pill for that item.
multiselect.renderBadgeCallback = ({ item }) => {
  return `<span class="my-chip">${item.name} <button data-ms-action="remove">×</button></span>`;
};

// One selected item inside the selected-items popover (ctx.isInPopover === true)
multiselect.renderSelectedItemContentCallback = ({ item }) => {
  return `${item.name} <small>${item.email}</small>`;
};

multiselect.renderSelectedContentCallback = ({ item }) => {
  // Customize selected item text in single-select mode (plain text only).
  // ctx also has presentation / isFullscreen / isModal
  return item.firstName;
};

// Inject CSS into the Shadow DOM (wins over the custom-styles attribute)
multiselect.getCustomStylesCallback = (ctx) => `.ms__badge { border-radius: 0; }`;

// Form integration
multiselect.name = 'selected_items';
multiselect.valueFormat = 'json'; // 'json' | 'csv' | 'array'
multiselect.getValueFormatCallback = ({ selectedValues }) => selectedValues.join('|'); // Custom format

// Read-only properties
const selectedValue = multiselect.selectedValue; // string | number | array | null
const selectedItem = multiselect.selectedItem;   // First selected item object

// Add-new hook (requires allow-add-new). May be async. Return the new option
// (appended + selected, `add` event carries it), `false` to cancel (no add, no
// `add` event), or nothing → only the `add` event fires (create it yourself there).
multiselect.beforeAddCallback = async ({ value }) => {
  const newOption = await fetch('/api/options', {
    method: 'POST',
    body: JSON.stringify({ name: value })
  }).then(r => r.json());
  return newOption;
};

// "Add new" prompt label (plain text; wins over add-new-text)
multiselect.getAddNewTextCallback = ({ value }) => `Create "${value}"`;

// i18n of ARIA labels / short UI strings — see "Labels (i18n)" below
multiselect.labels = { removeItem: 'Odebrat {item}', close: 'Zavřít' };
```

### Labels (i18n)

`labels` is a property-only, partial `MultiSelectLabels` map. Any key you leave unset falls back to its English default. `{item}` and `{count}` placeholders are interpolated. These are mostly screen-reader (`aria-label`) strings; visible text (placeholders, empty/loading messages, counter, popover title) has its own attributes.

| Key | Default | Used for |
|-----|---------|----------|
| `close` | `Close` | Selected-items popover / fullscreen close button |
| `clearSelection` | `Clear selection` | Inline ✕ clear button (`show-clear`) |
| `clearAllSelections` | `Clear all selections` | Clear (×) button on the count / compact badge |
| `clearSearch` | `Clear search` | Fullscreen search clear (✕) |
| `showFullLabel` | `Show full label` | Option info button that reveals a clipped label (fullscreen) |
| `removeItem` | `Remove {item}` | Badge remove (×) button; `{item}` = the item's label |
| `removeHiddenItems` | `Remove {count} hidden items` | "+N more" badge remove (×); `{count}` = hidden count |
| `groupSelectedLabel` | `{count} selected` | Group-header selected-count chip |
| `andMore` | `…and {count} more` | Counter tooltip overflow tail (beyond 12 items) |
| `prevMatch` | `Previous match` | Fullscreen navigate-mode "previous match" button |
| `nextMatch` | `Next match` | Fullscreen navigate-mode "next match" button |

### Reading back state after a write (v2)

Since v2, **property writes are coalesced** — setting a property (e.g. `el.options = […]`) applies on a microtask, not synchronously. This only matters when you read *rendered DOM* right after a write:

```javascript
el.options = data;
await el.whenSettled();      // wait for the pending re-render
console.log(el.shadowRoot.querySelectorAll('.ms__option').length);
```

You do **not** need to await between a property write and an imperative method — `getSelected()` / `setSelected()` / `getValue()` / `selectedValue` / `selectedItem` flush any pending write internally, so `el.options = data; el.setSelected(sel)` works with no `await` in between. `setAttributes()` and `batch()` also flush synchronously.

## Methods

| Method | Description |
|--------|-------------|
| `getSelected()` | Get currently selected options as array of option objects |
| `setSelected(values: (string \| number)[], opts?: { notify?: boolean })` | Set selected values by ID/value. Silent by default; pass `{ notify: true }` to emit one aggregate `change` |
| `getValue()` | Get selected value(s) — returns single value in single-select mode, array in multi-select mode |
| `open()` | Open the dropdown |
| `close()` | Close the dropdown |
| `toggle()` | Toggle the dropdown open/closed |
| `isOpen` | Property: `true` when the dropdown is open. Assigning `true`/`false` opens/closes it |
| `refresh()` | Re-render from the current option set without re-ingesting it — use after mutating option objects in place (e.g. a `disabled` flag) or changing external state a render callback reads. Silent (no events). Assign `options` instead when the set itself changed |
| `search(term: string)` | Set the search text and filter as if typed (runs `beforeSearchCallback` / `min-search-length` / `searchCallback`). Does not open the dropdown. `''` clears |
| `clearSearch()` | Clear the search text and restore the full list (selection untouched) |
| `searchText` | Property (read-only): the current search text (`''` when empty) |
| `scrollToIndex(index: number, opts?: { block?: ScrollLogicalPosition })` | Scroll the open dropdown to an index in the filtered list. Returns `boolean` (`false` if closed or out of range). `el.open(); el.scrollToIndex(i)` works |
| `scrollToValue(value: string \| number, opts?: { block?: ScrollLogicalPosition })` | Scroll to the option with this value. Returns `false` if it's not in the visible list (filtered out, or under a collapsed tree branch) — call `clearSearch()` first |
| `scrollToGroup(name: string, opts?: { block?: ScrollLogicalPosition })` | Scroll to a group header (or the group's first option under virtual scroll). Returns `false` in tree mode or if the group is empty |
| `showMessage(content: string \| HTMLElement, opts?: MessageOptions)` | Show a transient message ("toast") on top of the component, visible even in the fullscreen overlay. `opts`: `type` (`'info' \| 'warning' \| 'error' \| 'success'`, default `'info'`), `autoHideMs` (ms, default `3000`, `0` = sticky), `placement` (floating-ui placement, default `'bottom'`; ignored in fullscreen) |
| `hideMessage()` | Dismiss the message shown by `showMessage()` |
| `whenSettled()` | Returns a `Promise<void>` that resolves once pending (coalesced) property writes have re-rendered — see below |
| `batch(fn: () => void)` | Run `fn` (e.g. several `setAttribute` calls) and apply the resulting changes as one update. Flushes synchronously |
| `setAttributes(values: Record<string, unknown>)` | Apply several inputs as a single in-place update (one re-render instead of one per property). Keys are property names (`configKey`, e.g. `searchPlaceholder`) or their kebab attribute (`search-placeholder`); values are **typed property values**, validated exactly like a direct property assignment — not raw attribute strings. Flushes synchronously. Handy for i18n switches that change several strings at once. To batch raw attribute **strings** instead, use `batch(() => { setAttribute('search-placeholder', '…'); … })` |
| `ready()` | Release the `defer` render gate: build the picker once with everything wired while deferred (flushes pending property writes first). No-op if not deferred or already built. Latched. Fires the `ready` event |
| `isReady` | Property (read-only): `true` once the picker has been built (the `ready` event has fired). `false` while a `defer` gate is still held. Reflected as the `is-ready` attribute |
| `destroy()` | Clean up and destroy instance |

### Controller (`el.controller`)

`el.controller` is the public facade — the same object every callback `ctx` and event detail carries as `controller`. It delegates to the live picker, so it survives rebuilds. Interactive methods behave like the matching gesture (vetoes included); `setSelected` is the programmatic, veto-free path.

| Group | Members |
|-------|---------|
| Read state | `getSelected()`, `getValue()`, `getOptions()`, `isOpen` |
| Selection | `setSelected(values, { notify })`, `selectAll()`, `clearAll()`, `toggleValue(v)`, `selectValue(v)`, `deselectValue(v)`, `toggleFocused()` |
| Dropdown | `open()`, `close()`, `toggle()`, `search(term)`, `clearSearch()`, `scrollToValue(v)`, `scrollToGroup(g)`, `scrollToIndex(i)` (return `boolean`), `refresh()` |
| Keyboard focus | `focusNext()`, `focusPrevious()`, `focusFirst()`, `focusLast()`, `focusPageUp()`, `focusPageDown()`, `focusNextMatch()`, `focusPreviousMatch()`, `focusIndex(i)` |
| Feedback | `showMessage(content, { type, autoHideMs, placement })`, `hideMessage()` |

```javascript
document.querySelector('web-multiselect').controller.selectAll();
```

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `select` | `{ option, selectedOptions, selectedValues }` | Fired when an option is selected. Twin: `onSelect(detail)` |
| `deselect` | `{ option, selectedOptions, selectedValues }` | Fired when an option is deselected. Twin: `onDeselect(detail)` |
| `change` | `{ selectedOptions, selectedValues }` | Fired when selection changes. Twin: `onChange(detail)` |
| `add` | `{ value, option?, selectedOptions, selectedValues }` | Fired when the user chooses to create a new option from the typed text (the "add new" prompt or Enter) — requires `allow-add-new`. `value` is the typed text; `option` is the created item when `beforeAddCallback` returned one. Not fired if `beforeAddCallback` returns `false`. Twin: `onAdd(detail)` |
| `action` | `{ action, id, item, source, option?, sourceEvent, triggerElement, dataset, selectedValues, selectedOptions, options, selectedCount, optionCount, isOpen, searchTerm }` | Fired for every action-button activation (built-in or custom) and every `data-action` element inside rendered option content (`source: 'option'`, `detail.option`), badge content (`source: 'badge'`) or a `showMessage` element (`source: 'message'`). Order: `beforeActionCallback` (→ `false` cancels) → the item's `onClick` → `action` → the built-in. Twin: `onAction(detail)` |
| `ready` | `{ controller, element, presentation, … }` | Fired once, right after the first build — synchronously during upgrade for a normal element, or when the `defer` gate is released for a deferred one. Twin: `onReady(detail)` |

All events bubble and are **not** composed (`composed: false`) — they are dispatched on the host, so listeners on the element or its light-DOM ancestors receive them. Every detail also carries `controller` (= `el.controller`) and `element` (the host) as non-enumerable properties, so `JSON.stringify(e.detail)` sees only the data. The `on*` property twins (`onSelect`, `onDeselect`, `onChange`, `onAdd`, `onAction`, `onReady`) receive the **detail** (not the CustomEvent): `el.onSelect = ({ option }) => …`. Detail types: `SelectEventDetail`, `DeselectEventDetail`, `ChangeEventDetail`, `AddEventDetail`, `MultiSelectActionEventDetail`, `ReadyEventDetail`.

## Option structure

```typescript
interface MultiSelectOption {
  value: string;           // Required: Unique identifier
  label: string;           // Required: Display text
  icon?: string;           // Optional: Icon or emoji
  subtitle?: string;       // Optional: Subtitle/description
  group?: string;          // Optional: Group name
  disabled?: boolean;      // Optional: Disable selection
}
```

The component also accepts:

- **Tuple arrays** like `[['js', 'JavaScript'], ['ts', 'TypeScript']]` — first element becomes value, second becomes display text.
- **Arbitrary custom objects** via member attributes (`value-member`, `display-value-member`, etc.) or callbacks (`getValueCallback`, `getDisplayValueCallback`, etc.). See [examples.md → Flexible Data Handling](./examples.md#flexible-data-handling).
