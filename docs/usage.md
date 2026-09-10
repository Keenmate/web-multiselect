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
| `search-placeholder` | `string` | `'Search...'` | Placeholder text shown while search is usable. When unset and `show-search-mode-toggle` is on, the default becomes mode-aware (`Search…` in navigate, `Filter…` in filter) and switches with the toggle; an explicit value always wins and stays fixed |
| `select-placeholder` | `string` | `'Pick an option...'` | Placeholder shown when search is disabled (`enable-search="false"`, or `search-input-mode` `readonly`/`hidden`) — the input acts as a picker, not a search box |
| `no-data-placeholder` | `string` | - | Opt-in placeholder shown when the option list is empty, so users see there's no data without opening. Highest priority when the list is empty. Useful for cascade multiselects (a child whose parent isn't resolved yet) |
| `search-hint` | `string` | - | Hint text shown above input when focused |
| `allow-groups` | `boolean` | `true` | Enable option grouping |
| `show-checkboxes` | `boolean` | `true` | Show checkboxes next to options |
| `close-on-select` | `boolean` | `false` | Close dropdown after selecting |
| `dropdown-min-width` | `string` | - | Min width for dropdown (e.g., `'20rem'`) |
| `badges-display-mode` | `'pills' \| 'count' \| 'compact' \| 'partial' \| 'none'` | `'pills'` | How to display selected items. `compact`: first item + count. `none`: no display |
| `badges-threshold` | `number` | - | Auto-switch mode when exceeded (see `badges-threshold-mode`) |
| `badges-threshold-mode` | `'count' \| 'partial'` | `'count'` | Mode after threshold: `count` shows badge, `partial` shows limited badges + more badge |
| `badges-max-visible` | `number` | `3` | Max badges shown in partial mode |
| `badges-position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Position of badges container |
| `show-counter` | `boolean` | `false` | Show `[3]` badge next to toggle icon |
| `show-clear` | `boolean` | `false` | Show an inline clear (✕) button inside the input that wipes the whole selection. Appears only while something is selected and the control is enabled; clicking it clears the selection and any search text, fires `change`, and refocuses |
| `enable-badge-tooltips` | `boolean` | `false` | Enable tooltips on selected badges |
| `badge-tooltip-placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip placement relative to badge |
| `badge-tooltip-delay` | `number` | `100` | Delay in ms before showing tooltip |
| `badge-tooltip-offset` | `number` | `8` | Distance in pixels between badge and tooltip |
| `enable-option-tooltips` | `boolean` | `false` | Enable hover tooltips on dropdown options |
| `option-tooltip-placement` | `'top' \| 'top-start' \| … \| 'left' \| 'right'` | `'top-start'` | Option tooltip placement (anchored to the row's start edge by default; use `left`/`right` for the start/end side on a narrow control) |
| `option-tooltip-delay` | `number` | inherits `badge-tooltip-delay`, then `100` | Delay in ms before showing an option tooltip |
| `option-tooltip-offset` | `number` | inherits `badge-tooltip-offset`, then `8` | Distance in pixels between row and option tooltip |
| `option-tooltip-follow-cursor` | `boolean` | `false` | Anchor the option tooltip to the mouse pointer and follow it across the row (best for full-width rows) |
| `max-height` | `string` | `'20rem'` | Maximum height of dropdown |
| `empty-message` | `string` | `'No results found'` | Message when no options found |
| `loading-message` | `string` | `'Loading...'` | Message while loading async data |
| `min-search-length` | `number` | `0` | Minimum search length for async |
| `search-debounce` | `number` | `0` | Debounce (ms) before the async `searchCallback` fires; coalesces keystroke bursts into one request. Resets on each keystroke. Async callback only — local filtering stays instant. `0` = no debounce |
| `keep-options-on-search` | `boolean` | `true` | Keep initial options visible when `searchCallback` is active (hybrid search) |
| `should-keep-search-on-close` | `boolean` | `true` | Preserve search text and filtered results when dropdown closes |
| `sticky-actions` | `boolean` | `true` | Keep the action-buttons block pinned to its edge while scrolling |
| `actions-layout` | `'nowrap' \| 'wrap'` | `'nowrap'` | Whether buttons in a row wrap: `nowrap` (single line) or `wrap` |
| `actions-position` | `'top' \| 'bottom'` | `'top'` | Place the actions block at the top or bottom (sticky footer) of the dropdown |
| `actions-align` | `'stretch' \| 'left' \| 'right' \| 'center' \| 'space-between'` | `'stretch'` | Horizontal arrangement of buttons within a row (`stretch` = full-width) |
| `lock-placement` | `boolean` | `true` | Lock dropdown placement after first open to prevent flipping |
| `enable-search` | `boolean` | `true` | Enable/disable search functionality |
| `search-input-mode` | `'normal' \| 'readonly' \| 'hidden'` | `'normal'` | Search input display mode |
| `search-mode` | `'filter' \| 'navigate'` | `'filter'` | Search behavior: `filter` hides non-matches, `navigate` jumps to matches |
| `overlay-group` | `string` | — | Scope the "one overlay open at a time" coordination to a named group. Overlays (multiselects, datepickers, external popovers) sharing a group dismiss each other when one opens; different groups are independent. Unset = the default (ungrouped) group |
| `show-search-mode-toggle` | `boolean` | `false` | In the phone fullscreen overlay, show a leading icon in the search bar that flips `search-mode` between `filter` and `navigate` live (no reopen). Fullscreen-only |
| `allow-add-new` | `boolean` | `false` | Allow adding new options not in the list |
| `value-member` | `string` | - | Property name for value/ID extraction from custom objects |
| `display-value-member` | `string` | - | Property name for display text extraction from custom objects |
| `search-value-member` | `string` | - | Property name for search text extraction from custom objects |
| `icon-member` | `string` | - | Property name for icon extraction from custom objects |
| `subtitle-member` | `string` | - | Property name for subtitle extraction from custom objects |
| `group-member` | `string` | - | Property name for group extraction from custom objects |
| `disabled-member` | `string` | - | Property name for disabled state extraction from custom objects |
| `name` | `string` | - | HTML form field name for form integration (creates hidden input) |
| `value-format` | `'json' \| 'csv' \| 'array'` | `'json'` | Format for form value serialization |
| `initial-values` | `string` (JSON array or CSV) | - | Pre-selected values. Accepts `["js","ts"]` or a bare `js,ts` |
| `data-options` | `string` | - | HTML-authoring source for the option list, parsed per `data-options-format`. Prefer the `options` property in JS. Reactive; declarative `<option>` children and a set `options` property both take precedence |
| `data-options-format` | `'json' \| 'csv' \| 'plain'` | `'json'` | How to parse `data-options`: `json` (array of objects or `[value,label]` tuples), `csv` (first row = header → object per row, keyed by the header cells; map columns via `*-member`), or `plain` (bare values → `value=label` options) |
| `data-options-splitter` | `string` | `','` | Field/cell delimiter for the `csv` and `plain` formats (e.g. `;`, `\|`). Escapes `\t` `\n` `\r` are honoured (`"\t"` → TSV). Ignored for `json` |
| `data-options-row-splitter` | `string` | newline | Row/record delimiter for the `csv` and `plain` formats (e.g. `;` for single-line data). Escapes honoured. Ignored for `json` |
| `enable-virtual-scroll` | `boolean` | `false` | Enable virtual scrolling for large datasets |
| `virtual-scroll-threshold` | `number` | `100` | Minimum items before virtual scroll activates |
| `option-height` | `number` | `50` | Fixed height for each option in pixels (required for virtual scroll) |
| `virtual-scroll-buffer` | `number` | `10` | Buffer size — extra items rendered above/below viewport |

## Properties

```typescript
// Get/set options
multiselect.options = [
  { value: 'js', label: 'JavaScript' },
  { value: 'ts', label: 'TypeScript' }
];

// Async data loading. `signal` aborts when a newer search supersedes this one —
// forward it to fetch to cancel the stale request.
multiselect.searchCallback = async (searchTerm, signal) => {
  const response = await fetch(`/api/search?q=${searchTerm}`, { signal });
  return await response.json();
};

// Pre-process search terms before calling searchCallback
multiselect.beforeSearchCallback = (searchTerm) => {
  // Remove accents: "café" → "cafe"
  const normalized = searchTerm.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Block search if too short (return null to prevent search)
  if (normalized.length < 2) return null;

  return normalized; // Return transformed term
};

// Interceptors — veto a selection/deselection before it happens.
// Return false to block; return true/undefined to allow. Silent (no event).
// Receives the option being toggled and the current selection (before the change).
// Note: programmatic setSelected() and the Select-All / Clear-All buttons bypass these.
multiselect.beforeSelectCallback = (option, selectedOptions) => {
  // Example: don't allow selecting "item1" while "item2" is already selected
  if (option.value === 'item1' && selectedOptions.some(o => o.value === 'item2')) {
    return false; // blocked
  }
};

multiselect.beforeDeselectCallback = (option, selectedOptions) => {
  // Example: "item1" is required — can't be removed once chosen
  if (option.value === 'item1') return false;
};

// Keyboard hook — runs on every keydown BEFORE the built-in handling.
// Return true to mark the key fully handled (you own preventDefault; the
// component runs none of its own logic for it); return false/undefined to
// fall through to the defaults. `ctx.controller` mirrors the built-in actions.
multiselect.keydownCallback = (ctx) => {
  // Vim-style navigation. Returning true means you own the key — call
  // preventDefault() so a printable key like 'j' isn't also typed into search.
  if (ctx.key === 'j') { ctx.event.preventDefault(); ctx.controller.focusNext(); return true; }
  if (ctx.key === 'k') { ctx.event.preventDefault(); ctx.controller.focusPrevious(); return true; }
  // Ctrl+A → select all currently-filtered options (selectValue is a no-op if
  // already selected — so it's a true "select all", not a toggle/invert)
  if ((ctx.event.ctrlKey || ctx.event.metaKey) && ctx.key === 'a') {
    ctx.event.preventDefault();
    ctx.filteredOptions.forEach(o => ctx.controller.selectValue(o.value));
    return true;
  }
  // ctx also exposes: event, key, isOpen, presentation, searchTerm,
  // focusedIndex, focusedOption, filteredOptions, selectedValues.
  // controller: focusNext/Previous/First/Last, focusPageUp/Down,
  // focusNextMatch/PreviousMatch, focusIndex, toggleFocused, toggleValue,
  // selectValue, deselectValue, open, close, setSearch, clearSearch.
};

// Event handler properties. Since v2 these are real listeners: each receives
// the same CustomEvent addEventListener('select', ...) would get, so read the
// payload off `e.detail` — NOT as a bare argument.
multiselect.onSelect = (e) => {
  console.log('Selected:', e.detail.option);
};

multiselect.onDeselect = (e) => {
  console.log('Deselected:', e.detail.option);
};

multiselect.onChange = (e) => {
  console.log('Changed:', e.detail.selectedOptions, e.detail.selectedValues);
};

// Badge display customization (show different text in badges vs dropdown)
multiselect.getBadgeDisplayCallback = (item) => {
  // Show shorter text in badges (e.g., just name instead of "name (email)")
  return item.name; // Dropdown might show "John Doe (john@example.com)"
};

// Badge tooltip customization
multiselect.getBadgeTooltipCallback = (item) => {
  return `${item.label} - ${item.subtitle}`;
};

// Option (dropdown row) tooltip customization — requires enable-option-tooltips
multiselect.getOptionTooltipCallback = (item) => {
  return `${item.label} — ${item.description}`;
};

// Action buttons (Select All, Clear All, custom actions)
multiselect.actionButtons = [
  {
    action: 'select-all',
    text: 'Select All',
    tooltip: 'Select all items',
    cssClass: 'my-custom-class',
    getIsVisibleCallback: (multiselect) => multiselect.getSelected().length < 5  // Hide if 5+ selected
  },
  {
    action: 'clear-all',
    text: 'Clear All',
    tooltip: 'Clear selection',
    isVisible: true,  // Static visibility
    isDisabled: false // Static disabled state
  },
  {
    action: 'custom',
    text: 'Invert',
    tooltip: 'Invert selection',
    onClick: (multiselect) => {
      // Custom action - invert selection
      const allValues = multiselect.options.map(opt => opt.value);
      const selectedValues = multiselect.getValue();
      const inverted = allValues.filter(v => !selectedValues.includes(v));
      multiselect.setSelected(inverted);
    },
    // Dynamic callbacks (take priority over static properties)
    getIsDisabledCallback: (multiselect) => multiselect.getSelected().length === 0,
    getTextCallback: (multiselect) => multiselect.getSelected().length > 0 ? 'Invert' : 'Select Items First',
    getClassCallback: (multiselect) => multiselect.getSelected().length > 0 ? 'active' : 'inactive'
  }
];

// Counter i18n/pluralization
multiselect.getCounterCallback = (count, moreCount) => {
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

// Data extraction - Callback functions (for complex logic)
multiselect.getValueCallback = (item) => item.id || item.value;
multiselect.getDisplayValueCallback = (item) => item.label || item.name;
multiselect.getSearchValueCallback = (item) => `${item.name} ${item.tags.join(' ')}`;
multiselect.getIconCallback = (item) => item.icon || '📄';
multiselect.getSubtitleCallback = (item) => `${item.price} - ${item.stock} in stock`;
multiselect.getGroupCallback = (item) => item.category;
multiselect.getDisabledCallback = (item) => item.stock === 0;

// Custom rendering - Full HTML control
multiselect.renderGroupLabelContentCallback = (groupName) => {
  return `<strong>📦 ${groupName.toUpperCase()}</strong>`;
};

multiselect.renderOptionContentCallback = (item, context) => {
  return `<strong>${item.name}</strong> <span class="badge">${item.status}</span>`;
};

multiselect.renderBadgeContentCallback = (item, context) => {
  return context.isInPopover
    ? `${item.icon} ${item.name} - ${item.description}`
    : `${item.icon} ${item.name}`;
};

multiselect.renderSelectedContentCallback = (item) => {
  // Customize selected item text in single-select mode (plain text only)
  return item.firstName;
};

// Form integration
multiselect.name = 'selected_items';
multiselect.valueFormat = 'json'; // 'json' | 'csv' | 'array'
multiselect.getValueFormatCallback = (values) => values.join('|'); // Custom format

// Read-only properties
const selectedValue = multiselect.selectedValue; // string | number | array | null
const selectedItem = multiselect.selectedItem;   // First selected item object

// Add new option callback
multiselect.addNewCallback = async (value) => {
  const newOption = await fetch('/api/options', {
    method: 'POST',
    body: JSON.stringify({ name: value })
  }).then(r => r.json());
  return newOption;
};
```

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
| `setSelected(values: (string \| number)[])` | Set selected values by ID/value |
| `getValue()` | Get selected value(s) — returns single value in single-select mode, array in multi-select mode |
| `open()` | Open the dropdown |
| `close()` | Close the dropdown |
| `toggle()` | Toggle the dropdown open/closed |
| `isOpen` | Property: `true` when the dropdown is open. Assigning `true`/`false` opens/closes it |
| `setAttributes(values: Record<string, unknown>)` | Apply several inputs as a single in-place update (one re-render instead of one per property). Keys are property names (`configKey`, e.g. `searchPlaceholder`) or their kebab attribute (`search-placeholder`); values are **typed property values**, validated exactly like a direct property assignment — not raw attribute strings. Flushes synchronously. Handy for i18n switches that change several strings at once. To batch raw attribute **strings** instead, use `batch(() => { setAttribute('search-placeholder', '…'); … })` |
| `destroy()` | Clean up and destroy instance |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `select` | `{ option, selectedOptions }` | Fired when an option is selected |
| `deselect` | `{ option, selectedOptions }` | Fired when an option is deselected |
| `change` | `{ selectedOptions, selectedValues }` | Fired when selection changes |

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
