# Examples & cookbook

Working examples and recipes for `@keenmate/web-multiselect`. For the runnable demos, open any of the HTML files at the package root:

| File | What it shows |
|------|---------------|
| [`examples-basic.html`](../examples-basic.html) | Basic usage — declarative markup, single/multi, keyboard nav, search modes, RTL |
| [`examples-data-api.html`](../examples-data-api.html) | Data feeding (objects, tuples, callbacks, async, cascading) + public API, forms, events |
| [`examples-new-api.html`](../examples-new-api.html) | Modern programmatic API |
| [`examples-custom-rendering.html`](../examples-custom-rendering.html) | Custom rendering callbacks |
| [`examples-action-buttons.html`](../examples-action-buttons.html) | Select All / Clear All / custom actions |
| [`examples-base-variables.html`](../examples-base-variables.html) | `--base-*` two-layer theming |
| [`examples-theming.html`](../examples-theming.html) | Full `--ms-*` theming surface |
| [`examples-sizes.html`](../examples-sizes.html) | Size variants and `--ms-rem` scaling |
| [`examples-positioning.html`](../examples-positioning.html) | Floating UI positioning edge cases |
| [`examples-virtual-scrolling.html`](../examples-virtual-scrolling.html) | Virtual scroll with 15,000 items |
| [`examples-logging.html`](../examples-logging.html) | Debug logging |

## Rich content with icons

Icons support multiple formats — emojis, SVG markup, Font Awesome, images, or any HTML:

```html
<web-multiselect id="frameworks"></web-multiselect>

<script type="module">
  const select = document.getElementById('frameworks');
  select.options = [
    {
      value: 'react',
      label: 'React',
      icon: '⚛️',  // Emoji
      subtitle: 'A JavaScript library for building user interfaces'
    },
    {
      value: 'vue',
      label: 'Vue.js',
      icon: '<svg viewBox="0 0 24 24"><path d="M2 3l10 18L22 3h-4l-6 10.5L6 3H2z"/></svg>',  // SVG
      subtitle: 'The Progressive JavaScript Framework'
    },
    {
      value: 'angular',
      label: 'Angular',
      icon: '<i class="fab fa-angular"></i>',  // Font icon — see Shadow DOM caveat below
      subtitle: 'Platform for building mobile and desktop apps'
    },
    {
      value: 'svelte',
      label: 'Svelte',
      icon: '<img src="svelte-logo.png" alt="Svelte" />',  // Image
      subtitle: 'Cybernetically enhanced web apps'
    }
  ];
</script>
```

### Icons in Shadow DOM — SVG vs. font icons

The component renders in **Shadow DOM**, which changes how icons reach it. This applies anywhere you pass icon HTML: option `icon`, action button `text`, badge/option render callbacks, etc.

| Icon type | Works out of the box? | What's needed |
|---|---|---|
| Emoji (`⚛️`) | ✅ Yes | Nothing |
| Inline SVG (`<svg>…</svg>`) | ✅ Yes | Nothing — markup is self-contained |
| `<img src="…">` | ✅ Yes | Nothing |
| Font icons (Font Awesome, Material, Bootstrap Icons) | ⚠️ Partially | **Two** steps — see below |

**Font icons need two things, because they're font-based:**

1. **Register the `@font-face` at the document level** — a normal `<link>` (or `@font-face`) in the page `<head>`. A browser will **not** apply a `@font-face` declared *inside* a shadow root, so a shadow-only setup renders the glyphs as empty `□` boxes.
2. **Inject the icon *class rules* into the Shadow DOM** via `customStylesCallback` — page CSS doesn't cross the shadow boundary, so `.fas` / `.fa-*::before` must be added inside the component.

```javascript
// 1) In the page <head> (once): <link rel="stylesheet" href="…/font-awesome/6.5.1/css/all.min.css">

// 2) Inject the class rules into the shadow:
select.customStylesCallback = () => `
  @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
`;
// (Or, to avoid the async @import, inject only the few rules you use:
//   .fa-solid { font-family: "Font Awesome 6 Free"; font-weight: 900; }
//   .fa-check::before { content: "\f00c"; } … )
```

**Recommended: prefer inline SVG icons** (e.g. [Lucide](https://lucide.dev)) — they render natively in Shadow DOM with **zero** setup, and using `stroke="currentColor"` / `fill="currentColor"` makes them inherit the surrounding text color (dark mode included):

```javascript
const check = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  style="vertical-align:-3px"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`;

select.actionButtons = [
  { action: 'select-all', text: `${check} Select All`, tooltip: 'Select all' }
];
```

> See [`examples-action-buttons.html`](../examples-action-buttons.html) §11 (Font Awesome) and §12 (Lucide SVG) for runnable side-by-side demos.

> ⚠️ **Security:** `icon`, action button `text`, and the render callbacks all insert **raw HTML**. Only pass icon markup you control — never untrusted/user-supplied strings. See the [HTML Injection (XSS) notice](#html-injection-xss-notice).

## Grouped options

```javascript
select.options = [
  { value: 'js', label: 'JavaScript', group: 'Frontend' },
  { value: 'ts', label: 'TypeScript', group: 'Frontend' },
  { value: 'python', label: 'Python', group: 'Backend' },
  { value: 'java', label: 'Java', group: 'Backend' }
];
```

## Async data loading

```html
<web-multiselect
  id="async-select"
  min-search-length="2"
  search-debounce="300"
  loading-message="Searching..."
  empty-message="No products found">
</web-multiselect>

<script type="module">
  const select = document.getElementById('async-select');

  // `signal` aborts when a newer search supersedes this one (or the element is destroyed).
  // Forward it to fetch so the stale request is actually cancelled.
  select.searchCallback = async (searchTerm, signal) => {
    const response = await fetch(`/api/products?q=${searchTerm}`, { signal });
    const data = await response.json();
    return data.products;
  };
</script>
```

- `search-debounce="300"` waits 300ms after the last keystroke before calling the API, so a burst of typing makes one request instead of one per character.
- The `signal` (an `AbortSignal`) is optional — callbacks that omit it still work; their superseded results are discarded, just not network-cancelled.

## Hybrid static + dynamic search

Show popular items initially, then switch to full database search when the user types. Perfect for showing "Top 10" items while supporting comprehensive search:

```html
<web-multiselect
  id="hybrid-select"
  min-search-length="3"
  keep-options-on-search="true">
</web-multiselect>

<script type="module">
  const select = document.getElementById('hybrid-select');

  // Set initial popular items (shown when dropdown opens)
  select.options = [
    { id: 1, name: 'React' },
    { id: 2, name: 'Vue' },
    { id: 3, name: 'Angular' },
    { id: 4, name: 'Svelte' },
    { id: 5, name: 'Solid' }
  ];

  // Pre-process search terms (remove accents, validate, etc.)
  select.beforeSearchCallback = (searchTerm) => {
    const normalized = searchTerm.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (normalized.length < 2) return null;
    return normalized;
  };

  // Search full database when user types 3+ characters
  select.searchCallback = async (searchTerm, signal) => {
    const response = await fetch(`/api/frameworks/search?q=${searchTerm}`, { signal });
    return await response.json();
  };
</script>
```

**How it works:**
1. **Dropdown opens** → shows 5 popular frameworks.
2. **User types "rea"** → calls API, shows all matching results from database.
3. **User clears search** → shows 5 popular frameworks again.
4. **User types "café"** → `beforeSearchCallback` converts to "cafe", then searches.

**Key options:**
- `keep-options-on-search="true"` (default) — keep initial options visible when search is empty/short.
- `beforeSearchCallback` — transform search text or block search by returning `null`.
- `min-search-length` — minimum characters before triggering search (shows initial options below this).

## Virtual scrolling for large datasets

Handle 10,000+ options with smooth 60fps performance by rendering only visible items:

```html
<web-multiselect
  id="large-dataset"
  enable-virtual-scroll="true"
  virtual-scroll-threshold="100"
  option-height="50"
  virtual-scroll-buffer="10"
  search-mode="filter"
  max-height="400px">
</web-multiselect>

<script type="module">
  import '@keenmate/web-multiselect';

  const select = document.getElementById('large-dataset');

  // Generate 15,000 options
  const largeDataset = Array.from({ length: 15000 }, (_, i) => ({
    value: i,
    label: `Item ${i.toString().padStart(5, '0')}`
  }));

  select.options = largeDataset;
</script>
```

**Performance comparison (15,000 items):**

| Metric | Without virtual scroll | With virtual scroll | Improvement |
|--------|------------------------|---------------------|-------------|
| Initial render | 750ms | 30ms | **25× faster** |
| Search keystroke | 200-500ms | 15ms | **13-33× faster** |
| DOM nodes | 15,000 | ~30 | **99.8% reduction** |
| Memory usage | ~7.5 MB | ~15 KB | **500× less** |

**Configuration:**

- `enable-virtual-scroll="true"` — opt-in to virtual scrolling (default: `false`).
- `virtual-scroll-threshold="100"` — auto-activate when this many items are present (default: `100`).
- `option-height="50"` — fixed height per option in pixels (default: `50px`).
- `virtual-scroll-buffer="10"` — extra items rendered above/below viewport for smooth scrolling (default: `10`).

**How it works:**

- Only renders ~30 visible items instead of all 15,000 DOM elements.
- Uses absolute positioning with calculated offsets.
- Maintains 10-item buffer zones above/below viewport for smooth scrolling.
- Automatically calculates visible range based on scroll position.
- Works seamlessly with search filtering and selection.

**Requirements / limitations:**

- All options must have the same fixed height (enforced via CSS).
- Groups (`<optgroup>`) are disabled in virtual scroll mode — automatically falls back to standard rendering.
- Works with both filter and navigate search modes.

**Example with API data:**

```html
<web-multiselect
  id="products"
  enable-virtual-scroll="true"
  search-mode="filter"
  value-member="id"
  display-value-member="name"
  max-height="400px">
</web-multiselect>

<script type="module">
  const select = document.getElementById('products');

  const response = await fetch('/api/products');
  const products = await response.json();

  select.options = products; // Could be 10,000+ items
</script>
```

**Live demo:** [`examples-virtual-scrolling.html`](../examples-virtual-scrolling.html) — working demo with 15,000 randomly generated options.

## Search modes: filter vs navigate

Choose between two search behaviors:

**Filter mode** (default) — hide non-matching options as you type:

```html
<web-multiselect search-mode="filter" id="countries"></web-multiselect>
```

**Navigate mode** — keep all options visible, jump to matches:

```html
<web-multiselect search-mode="navigate" id="states"></web-multiselect>

<script>
  const select = document.getElementById('states');
  select.options = [/* ...50 US states... */];

  // User types "cal" → Jumps to "California", shows all states
  // Matching options are highlighted with left border
</script>
```

**When to use each mode:**

- **Filter mode** — large datasets where narrowing down is essential (product catalogs, user lists, search results).
- **Navigate mode** — quick selection from familiar lists (countries, states, keyboard shortcuts, known options).

**Key differences:**

- Filter mode hides non-matches, navigate mode highlights matches with a left border.
- Navigate mode keeps previous focus if no match is found (type "xyz" → stays on current option).
- Navigate mode only works with local data (automatically falls back to filter mode when using `searchCallback`).
- Both modes respect `beforeSearchCallback` for search term preprocessing (accent removal, validation).
- **Ctrl+↑/↓** jumps between matches only (navigate mode); regular arrows navigate through all items.

## Display modes

Perfect for different use cases and space constraints:

```html
<!-- Badges mode (default) - Show all selections as removable badges -->
<web-multiselect badges-display-mode="pills"></web-multiselect>

<!-- Count mode - Show "X selected" text with clear button -->
<web-multiselect badges-display-mode="count" show-counter="true"></web-multiselect>

<!-- Compact mode - Show first item + count in a single removable badge -->
<web-multiselect badges-display-mode="compact"></web-multiselect>
<!-- Example output: [JavaScript (+2 more) | x] -->

<!-- None mode - No display in badges area (minimal UI) -->
<web-multiselect badges-display-mode="none" show-counter="true"></web-multiselect>
<!-- Only shows [X] badge next to toggle icon -->

<!-- Auto-switch from badges to count at threshold -->
<web-multiselect
  badges-threshold="3"
  badges-threshold-mode="count"
  show-counter="true">
</web-multiselect>

<!-- Partial mode - Show limited badges + "+X more" badge -->
<web-multiselect
  badges-threshold="5"
  badges-threshold-mode="partial"
  badges-max-visible="3">
</web-multiselect>
```

**Display mode behavior:**

- **`pills`** — individual removable badges for each selected item. Calls `getBadgeDisplayCallback` for each item.
- **`count`** — shows "X selected" text with clear button. Calls `getCounterCallback(count)`.
- **`compact`** — shows first item + count in single badge (e.g., "JavaScript (+2 more)"). Calls `getBadgeDisplayCallback(firstItem)` and `getCounterCallback(count, remainingCount)`.
- **`partial`** — shows first N badges + "+X more" badge. Calls `getBadgeDisplayCallback` for visible items and `getCounterCallback(count, remainingCount)` for badge.
- **`none`** — no display in badges area. No callbacks invoked. Use with `show-counter="true"` for minimal UI.

**Badge styling:**

- **Data badges** (selected items like "JavaScript", "Python") — blue styling by default.
- **Badge counters** ("+3 more", "5 selected", compact mode display) — gray styling to distinguish from data.
- Both can be customized via CSS variables (see `--ms-badge-*` and `--ms-badge-counter-*` in [theming.md](./theming.md)).

**Counter (`show-counter="true"`)** — independent feature showing `[X]` next to toggle icon. Works with all display modes. Not affected by callbacks.

## Badge positioning

Control where selected item badges appear relative to the input:

```html
<!-- Badges below input (default) -->
<web-multiselect badges-position="bottom"></web-multiselect>

<!-- Badges above input -->
<web-multiselect badges-position="top"></web-multiselect>

<!-- Badges to the left of input -->
<web-multiselect badges-position="left"></web-multiselect>

<!-- Badges to the right of input -->
<web-multiselect badges-position="right"></web-multiselect>
```

**Inline vertical alignment:** For left/right positioning, control vertical alignment with `--ms-inline-align`:

```html
<!-- Center aligned (default) -->
<web-multiselect badges-position="right" style="--ms-inline-align: center;"></web-multiselect>

<!-- Top aligned -->
<web-multiselect badges-position="right" style="--ms-inline-align: flex-start;"></web-multiselect>

<!-- Bottom aligned -->
<web-multiselect badges-position="left" style="--ms-inline-align: flex-end;"></web-multiselect>
```

> **Note:** In RTL mode, left/right positions are automatically mirrored — `badges-position="left"` will appear on the physical right side in RTL languages.

## Badge tooltips

Enable tooltips on selected item badges with customizable placement and delay:

```html
<!-- Basic tooltips -->
<web-multiselect
  enable-badge-tooltips="true"
  badge-tooltip-placement="top">
</web-multiselect>

<!-- Fast tooltips with custom delay -->
<web-multiselect
  enable-badge-tooltips="true"
  badge-tooltip-delay="100">
</web-multiselect>

<script type="module">
  const select = document.querySelector('web-multiselect');

  // Custom tooltip content
  select.getBadgeTooltipCallback = (item) => {
    return `${item.label} - ${item.subtitle}`;
  };
</script>
```

## Internationalization (i18n)

Customize counter text for proper pluralization and localization:

```html
<web-multiselect
  id="i18n-select"
  badges-threshold="5"
  badges-threshold-mode="partial"
  badges-max-visible="3">
</web-multiselect>

<script type="module">
  const select = document.getElementById('i18n-select');

  // Spanish pluralization example
  select.getCounterCallback = (count, moreCount) => {
    if (moreCount !== undefined) {
      // Partial mode: "+X more" badge
      return moreCount === 1 ? '+1 más' : `+${moreCount} más`;
    }
    // Count mode: total count
    return count === 1 ? '1 elemento seleccionado' : `${count} elementos seleccionados`;
  };
</script>
```

## Right-to-left (RTL) language support

Full RTL support for Arabic, Hebrew, Persian, Urdu, and other right-to-left languages with automatic detection and complete UI mirroring:

```html
<!-- Automatic RTL detection from dir attribute -->
<web-multiselect dir="rtl" search-placeholder="ابحث..."></web-multiselect>

<!-- RTL inherited from parent element -->
<div dir="rtl">
  <web-multiselect search-placeholder="חיפוש..."></web-multiselect>
</div>

<!-- RTL on page level -->
<html dir="rtl">
  <!-- All multi-selects will auto-detect RTL -->
</html>
```

**RTL features:**

- **Auto-detection** — detects `dir="rtl"` on component or any ancestor element.
- **Complete UI mirroring** — toggle icon, text alignment, badges, dropdown.
- **Logical positioning** — `badges-position="left"` becomes physically right in RTL.
- **Badge remove buttons** — flip to left side in RTL mode.
- **Text direction** — all text content properly right-aligned.
- **No configuration needed** — just set `dir="rtl"` attribute.

## Custom rendering

The component provides powerful custom rendering callbacks that allow you to fully customize how options, badges, and selected items are displayed while maintaining the component's structure and functionality.

Three rendering callbacks are available:

- **`renderOptionContentCallback`** — customize dropdown option content.
- **`renderBadgeContentCallback`** — customize badge (selected item) content.
- **`renderSelectedContentCallback`** — customize selected value text (single-select mode).

All callbacks can return either **HTML strings** or **HTMLElement** objects (except `renderSelectedContentCallback`, which returns plain text).

### HTML injection (XSS) notice

The following callbacks allow **raw HTML injection** and are intentionally **NOT XSS-safe**. This gives developers full control over rendering but requires sanitizing untrusted data:

| Callback | Output used in | Risk level |
|----------|----------------|------------|
| `renderOptionContentCallback` | Dropdown options (innerHTML) | HTML injection |
| `renderBadgeContentCallback` | Badges (innerHTML) | HTML injection |
| `renderSelectedItemContentCallback` | Selected items popover (innerHTML) | HTML injection |
| `renderGroupLabelContentCallback` | Group headers (innerHTML) | HTML injection |
| `getIconCallback` | Option icons (innerHTML) | HTML injection |
| `getSubtitleCallback` | Option subtitles (innerHTML) | HTML injection |
| `getDisplayValueCallback` | Option titles, badges (innerHTML) | HTML injection |
| `getBadgeDisplayCallback` | Badge text (innerHTML) | HTML injection |
| `getCounterCallback` | Count badges (innerHTML) | HTML injection |
| `getBadgeTooltipCallback` | Tooltips (innerHTML if HTMLElement) | HTML injection |
| `customStylesCallback` | Style tag (textContent) | CSS injection |

**Safe callbacks** (output is escaped or used as data):

- `getValueCallback`, `getSearchValueCallback`, `getGroupCallback`, `getDisabledCallback`
- `getBadgeClassCallback`, `getSelectedItemClassCallback` (CSS class names only)
- `beforeSearchCallback`, `searchCallback`, `addNewCallback`
- `onSelect`, `onDeselect`, `onChange`
- `getRemoveButtonTooltipCallback` (used as title attribute)
- `getValueFormatCallback` (form value)

**If displaying user-generated content**, sanitize it before returning from these callbacks.

### Custom option rendering

Customize how options appear in the dropdown:

```html
<web-multiselect id="custom-options"></web-multiselect>

<script type="module">
  import '@keenmate/web-multiselect';

  const select = document.getElementById('custom-options');

  select.options = [
    { id: 1, name: 'React', stars: 220000, trending: true },
    { id: 2, name: 'Vue', stars: 207000, trending: false },
    { id: 3, name: 'Angular', stars: 94000, trending: false },
    { id: 4, name: 'Svelte', stars: 76000, trending: true }
  ];

  select.renderOptionContentCallback = (item, context) => {
    // Context provides: { index, isSelected, isFocused, isMatched, isDisabled,
    //                     presentation, isFullscreen, + tree fields }

    return `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <strong>${item.name}</strong>
        <span style="color: #666; font-size: 0.875rem;">⭐ ${(item.stars / 1000).toFixed(0)}k</span>
        ${item.trending ? '<span style="background: #10b981; color: white; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem;">🔥 Trending</span>' : ''}
      </div>
    `;
  };
</script>
```

**Context object** (`OptionContentRenderContext`):

- `index: number` — index of the option in the filtered list.
- `isSelected: boolean` — whether the option is currently selected.
- `isFocused: boolean` — whether the option is currently focused (keyboard navigation).
- `isMatched: boolean` — whether the option matches the current search term (navigate mode only).
- `isDisabled: boolean` — whether the option is disabled.
- `presentation: 'floating' | 'modal' | 'fullscreen'` — how the open panel is presented (this
  component only ever emits `floating` — the anchored desktop/tablet dropdown — or `fullscreen`,
  the phone overlay). Resolved from the device/viewport and **reactive**: rotating/resizing across
  the phone boundary re-renders and re-invokes the callback with the new value. (This is the shared
  `PresentationContext` shape from `@keenmate/web-components-core`.)
- `isFullscreen: boolean` — convenience for `presentation === 'fullscreen'`.
- `isModal: boolean` — convenience for `presentation === 'modal'` (always `false` here).
- Tree-mode rows also carry `isTreeNode / isBranch / isLeaf / childCount / level / depth / path /
  isSelectable / isIndeterminate`.

**Responsive rendering** — render rich rows on desktop and a leaner variant on the phone, from
one callback (no `matchMedia` wiring; the component drives it):

```javascript
select.renderOptionContentCallback = (item, ctx) =>
  ctx.isFullscreen
    ? `<span>${item.name}</span>`                                  // lean on the phone sheet
    : `<div class="rich"><strong>${item.name}</strong>
         <small>${item.price} · ⭐${item.popularity}</small></div>`; // rich on desktop
```

### Custom badge rendering

Customize how selected items appear as badges:

```javascript
const select = document.querySelector('web-multiselect');

select.options = [
  { id: 1, name: 'John Doe', role: 'Admin', avatar: '👨‍💼' },
  { id: 2, name: 'Jane Smith', role: 'Developer', avatar: '👩‍💻' },
  { id: 3, name: 'Bob Johnson', role: 'Designer', avatar: '🎨' }
];

// Custom badge rendering in main badges area
select.renderBadgeContentCallback = (item, context) => {
  return `${item.avatar} ${item.name}`;
};

// Custom rendering for selected items popover (separate callback)
select.renderSelectedItemContentCallback = (item) => {
  return `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span>${item.avatar}</span>
      <div>
        <div><strong>${item.name}</strong></div>
        <div style="font-size: 0.75rem; color: #666;">${item.role}</div>
      </div>
    </div>
  `;
};
```

**Separate callbacks for badges vs. popover:**

- `renderBadgeContentCallback` — renders badges in the main badges area (compact display).
- `renderSelectedItemContentCallback` — renders items in the selected items popover (can be more detailed).
- If `renderSelectedItemContentCallback` is not defined, falls back to `renderBadgeContentCallback`.
- Users can assign the same function to both if identical rendering is desired.

**Context object** (`BadgeContentRenderContext` for `renderBadgeContentCallback`):

- `displayMode: BadgesDisplayMode` — current badges display mode (`'pills'`, `'count'`, `'compact'`, `'partial'`, `'none'`).
- `isInPopover: boolean` — whether the badge is being rendered in the selected items popover (always false for this callback).

### Custom group label rendering

Customize how group headers are displayed using `renderGroupLabelContentCallback`:

```javascript
const select = document.querySelector('web-multiselect');

select.options = [
  { value: 'react', label: 'React', group: 'frontend' },
  { value: 'vue', label: 'Vue', group: 'frontend' },
  { value: 'nodejs', label: 'Node.js', group: 'backend' },
  { value: 'postgres', label: 'PostgreSQL', group: 'database' }
];

select.isGroupsAllowed = true;
select.groupMember = 'group';

select.renderGroupLabelContentCallback = (groupName) => {
  const emojis = {
    'frontend': '🎨',
    'backend': '🔧',
    'database': '🗄️'
  };
  const emoji = emojis[groupName] || '📦';
  return `<strong>${emoji} ${groupName.toUpperCase()}</strong>`;
};
```

**Signature:** `(groupName: string) => string | HTMLElement`

**Use cases:**

- Capitalize or format group names.
- Add icons, emojis, or badges to group headers.
- Apply HTML formatting (bold, colors, etc.).
- Internationalization (i18n) — translate group names.
- Add group-specific metadata or counts.

**Notes:**

- Keeps standard `.ms__group-label` wrapper for consistent styling.
- Can return HTML string or HTMLElement.
- Group name is passed as a string parameter.

### Custom badge styling with CSS classes

Add custom CSS classes to badges based on item data for semantic styling:

```javascript
const select = document.querySelector('web-multiselect');

select.options = [
  { id: 1, task: 'Fix security bug', priority: 'urgent' },
  { id: 2, task: 'Update docs', priority: 'normal' },
  { id: 3, task: 'Refactor code', priority: 'low' }
];

// Add CSS class based on priority
select.getBadgeClassCallback = (item) => {
  return `badge-${item.priority}`; // Returns 'badge-urgent', 'badge-normal', etc.
};

// Can also return array of classes
select.getBadgeClassCallback = (item) => {
  const classes = [`badge-${item.priority}`];
  if (item.urgent) classes.push('badge-blink');
  return classes;
};
```

Then style with CSS:

```css
.badge-urgent {
  --ms-badge-text-bg: #fee2e2;
  --ms-badge-text-color: #dc2626;
  --ms-badge-remove-bg: #dc2626;
}

.badge-normal {
  --ms-badge-text-bg: #dbeafe;
  --ms-badge-text-color: #2563eb;
  --ms-badge-remove-bg: #2563eb;
}

.badge-low {
  --ms-badge-text-bg: #d1fae5;
  --ms-badge-text-color: #059669;
  --ms-badge-remove-bg: #059669;
}
```

The callback:

- Takes the item as a parameter.
- Returns a string (single class) or array of strings (multiple classes).
- Classes are added to the badge's base `.ms__badge` element.
- Works across all rendering locations (main badges, partial mode, popover).

**Separate class callbacks for badges vs. popover:**

Similar to rendering callbacks, you can use different class callbacks for badges and selected items:

```javascript
// Add classes to badges in main area
select.getBadgeClassCallback = (item) => {
  return `badge-${item.priority}`;
};

// Add different/additional classes to selected items in popover
select.getSelectedItemClassCallback = (item) => {
  return [`badge-${item.priority}`, 'badge-detailed'];
};
```

- `getBadgeClassCallback` — adds classes to badges in the main badges area.
- `getSelectedItemClassCallback` — adds classes to items in the selected items popover.
- If `getSelectedItemClassCallback` is not defined, falls back to `getBadgeClassCallback`.
- Users can assign the same function to both if identical styling is desired.

**Shadow DOM CSS injection:**

Since the component uses Shadow DOM, regular page CSS cannot style shadow elements. Use `customStylesCallback` to inject CSS directly into the Shadow DOM:

```javascript
const select = document.querySelector('web-multiselect');

select.getBadgeClassCallback = (item) => {
  return `badge-${item.priority}`;
};

select.customStylesCallback = () => `
  .badge-urgent {
    --ms-badge-text-bg: #fee2e2;
    --ms-badge-text-color: #dc2626;
    --ms-badge-remove-bg: #dc2626;
  }

  .badge-normal {
    --ms-badge-text-bg: #dbeafe;
    --ms-badge-text-color: #2563eb;
    --ms-badge-remove-bg: #2563eb;
  }

  .badge-low {
    --ms-badge-text-bg: #d1fae5;
    --ms-badge-text-color: #059669;
    --ms-badge-remove-bg: #059669;
  }
`;
```

The `customStylesCallback`:

- Returns a CSS string (not HTML).
- Styles are injected into the Shadow DOM on initialization.
- Can be updated dynamically — new styles replace old ones.
- Works with all custom classes (from `getBadgeClassCallback`, `renderOptionContentCallback`, etc.).

### Custom selected item rendering (single-select)

Customize the text shown in the input field when in single-select mode:

```javascript
const select = document.querySelector('web-multiselect[multiple="false"]');

select.options = [
  { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
];

// Show just first name when closed
select.renderSelectedContentCallback = (item) => {
  return item.firstName; // Plain text (not HTML)
};

// While dropdown shows full details
select.getDisplayValueCallback = (item) => {
  return `${item.firstName} ${item.lastName} (${item.email})`;
};
```

### Conditional rendering example

Use JavaScript logic for conditional rendering:

```javascript
select.renderOptionContentCallback = (item, context) => {
  const classes = [];
  if (context.isSelected) classes.push('selected');
  if (context.isFocused) classes.push('focused');

  return `
    <div class="${classes.join(' ')}">
      ${item.isNew ? '<span class="badge-new">NEW</span>' : ''}
      <strong>${item.name}</strong>
      ${item.description ? `<p style="font-size: 0.875rem; color: #666;">${item.description}</p>` : ''}
      ${item.tags ? `<div class="tags">${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
    </div>
  `;
};
```

### Returning HTMLElement

You can also return DOM elements for more complex rendering:

```javascript
select.renderOptionContentCallback = (item, context) => {
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '0.5rem';

  const img = document.createElement('img');
  img.src = item.avatarUrl;
  img.style.width = '32px';
  img.style.height = '32px';
  img.style.borderRadius = '50%';

  const span = document.createElement('span');
  span.textContent = item.name;

  div.appendChild(img);
  div.appendChild(span);

  return div; // Return HTMLElement instead of string
};
```

### Virtual scroll compatibility

When using `renderOptionContentCallback` with virtual scroll enabled:

> ⚠️ **Important:** Custom option content **must fit within** the configured `optionHeight` (default: 50px).

```html
<web-multiselect
  id="large-dataset"
  enable-virtual-scroll="true"
  option-height="60">
</web-multiselect>

<script type="module">
  const select = document.getElementById('large-dataset');

  select.renderOptionContentCallback = (item) => {
    return `
      <div style="height: 60px; display: flex; align-items: center;">
        <strong>${item.name}</strong>
      </div>
    `;
  };
</script>
```

**Virtual scroll requirements:**

- Content height must be **fixed** and match `optionHeight`.
- Overflow will be clipped.
- Variable-height content only works in non-virtual mode.

### Callback priority

The component uses a fallback chain when callbacks are not provided:

**For options:**

1. `renderOptionContentCallback` (full HTML control)
2. Default: icon + `getDisplayValueCallback` + subtitle

**For badges:**

1. `renderBadgeContentCallback` (full HTML control)
2. `getBadgeDisplayCallback` (text only)
3. `getDisplayValueCallback` (text only)

**For selected item (single-select):**

1. `renderSelectedContentCallback` (text only)
2. `getDisplayValueCallback` (text only)

### Checkbox control

Control checkbox appearance and alignment with CSS variables and attributes:

**Checkbox alignment (via attribute):**

```html
<web-multiselect checkbox-align="top"></web-multiselect>    <!-- Default -->
<web-multiselect checkbox-align="center"></web-multiselect> <!-- Middle aligned -->
<web-multiselect checkbox-align="bottom"></web-multiselect> <!-- Bottom aligned -->
```

**Checkbox size/scale (via CSS):**

```html
<style>
  /* Change checkbox size */
  web-multiselect {
    --ms-checkbox-size: 20px;  /* Width and height (default: 16px) */
  }

  /* Scale checkbox */
  web-multiselect {
    --ms-checkbox-scale: 1.5;  /* Scale multiplier (default: 1) */
  }

  /* Fine-tune checkbox positioning */
  web-multiselect {
    --ms-checkbox-margin-top: 0.5rem;    /* Vertical alignment (default: 0.125rem) */
    --ms-checkbox-margin-right: 0;       /* Right spacing (default: 0) */
    --ms-checkbox-margin-bottom: 0;      /* Bottom spacing (default: 0) */
    --ms-checkbox-margin-left: 0;        /* Left spacing (default: 0) */
  }
</style>
```

**CSS Grid/Flexbox in custom content:**

Custom rendering callbacks support full CSS layout control:

```javascript
// CSS Grid example
multiselect.renderOptionContentCallback = (item, context) => {
  return `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
      <div><strong>Name:</strong> ${item.name}</div>
      <div><strong>Price:</strong> ${item.price}</div>
      <div><strong>Stock:</strong> ${item.stock}</div>
      <div><strong>Rating:</strong> ${item.rating}</div>
    </div>
  `;
};

// Flexbox example
multiselect.renderOptionContentCallback = (item, context) => {
  return `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; flex-direction: column;">
        <strong>${item.name}</strong>
        <span style="font-size: 0.875rem; color: #666;">${item.description}</span>
      </div>
      <div style="text-align: right;">
        <div>${item.price}</div>
        <div style="font-size: 0.875rem;">${item.stock} in stock</div>
      </div>
    </div>
  `;
};
```

**Available CSS variables:**

- `--ms-checkbox-size` — checkbox width/height (default: `16px`).
- `--ms-checkbox-scale` — scale multiplier (default: `1`).
- `--ms-checkbox-margin-top` — top margin for vertical alignment (default: `0.125rem`).
- `--ms-checkbox-margin-right` — right margin (default: `0`).
- `--ms-checkbox-margin-bottom` — bottom margin (default: `0`).
- `--ms-checkbox-margin-left` — left margin (default: `0`).
- `--ms-checkbox-align` — alignment value (default: `flex-start`).
- `--ms-option-gap` — gap between checkbox and content (default: `0.5rem`).

> **Note:** Horizontal and bottom margins default to `0` since spacing is handled by flexbox gap. Override for custom layouts.

## Flexible data handling

The component supports **any data structure** through a member/callback pattern, allowing you to work with custom objects, tuple arrays, or existing API responses without transformation.

### Member properties (simple property names)

For objects with consistent property names, use member attributes:

```html
<web-multiselect
  id="products"
  value-member="productId"
  display-value-member="productName"
  icon-member="icon"
  subtitle-member="description"
  group-member="category">
</web-multiselect>

<script type="module">
  const select = document.getElementById('products');
  select.options = [
    {
      productId: 'p1',
      productName: 'Laptop',
      icon: '💻',
      description: 'High-performance laptop',
      category: 'Electronics'
    },
    {
      productId: 'p2',
      productName: 'Mouse',
      icon: '🖱️',
      description: 'Wireless mouse',
      category: 'Electronics'
    }
  ];
</script>
```

### Callback functions (complex logic)

For complex data extraction or conditional logic, use callbacks:

```javascript
const select = document.querySelector('web-multiselect');

// Custom value extraction
select.getValueCallback = (item) => item.id || item.code || item.value;

// Combine multiple fields for display
select.getDisplayValueCallback = (item) => {
  return `${item.firstName} ${item.lastName}`;
};

// Include multiple fields in search
select.getSearchValueCallback = (item) => {
  return `${item.name} ${item.sku} ${item.tags.join(' ')}`;
};

// Conditional icons
select.getIconCallback = (item) => {
  return item.inStock ? '✅' : '❌';
};

// Dynamic subtitles
select.getSubtitleCallback = (item) => {
  return `$${item.price} - ${item.stock} in stock`;
};

// Disable based on conditions
select.getDisabledCallback = (item) => {
  return item.stock === 0 || item.discontinued;
};

// Customize badge display (show different text in badges vs dropdown)
select.getBadgeDisplayCallback = (item) => {
  return item.name;
};
```

### Tuple array auto-detection

The component automatically detects `[key, value]` tuple arrays:

```javascript
select.options = [
  ['js', 'JavaScript'],
  ['ts', 'TypeScript'],
  ['py', 'Python']
];
// First element becomes value, second becomes display text
```

### Priority order

When multiple extraction methods are defined, the component uses this priority:

1. **Callbacks** (highest) — `getValueCallback`, `getDisplayValueCallback`, etc.
2. **Member properties** — `valueMember`, `displayValueMember`, etc.
3. **Default properties** (lowest) — falls back to `value`, `label`, `name`, etc.

### TypeScript support

The component is fully typed with generics:

```typescript
import type { MultiSelectElement } from '@keenmate/web-multiselect';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

const select = document.querySelector<MultiSelectElement<Product>>('web-multiselect');
select.options = [
  { id: 'p1', name: 'Laptop', price: 999, category: 'Electronics' }
];
```

## Form integration

The component seamlessly integrates with standard HTML forms by automatically creating hidden inputs in the light DOM (outside Shadow DOM) so FormData can access them.

### Basic form integration

```html
<form id="userForm" action="/submit" method="POST">
  <label>Select Skills:</label>
  <web-multiselect
    name="skills"
    value-format="json"
    multiple="true">
  </web-multiselect>

  <button type="submit">Submit</button>
</form>

<script type="module">
  import '@keenmate/web-multiselect';

  const form = document.getElementById('userForm');
  const select = form.querySelector('web-multiselect');

  select.options = [
    { value: 'js', label: 'JavaScript' },
    { value: 'ts', label: 'TypeScript' },
    { value: 'py', label: 'Python' }
  ];

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const skills = formData.get('skills');
    console.log('Selected skills:', skills);
    // Output: ["js","ts"] (JSON string)
  });
</script>
```

### Value formats

Choose how selected values are serialized in forms:

**JSON format** (default):

```html
<web-multiselect name="items" value-format="json"></web-multiselect>
<!-- FormData result: items = ["item1","item2","item3"] -->
```

**CSV format:**

```html
<web-multiselect name="items" value-format="csv"></web-multiselect>
<!-- FormData result: items = "item1,item2,item3" -->
```

**Array format** (multiple inputs):

```html
<web-multiselect name="items" value-format="array"></web-multiselect>
<!-- FormData result:
     items[] = "item1"
     items[] = "item2"
     items[] = "item3"
-->
```

### Custom value formatting

For advanced use cases, provide a custom formatting function:

```javascript
const select = document.querySelector('web-multiselect');

select.name = 'product_ids';
select.getValueFormatCallback = (values) => {
  // Custom format: pipe-separated with prefix
  return values.map(v => `ID:${v}`).join('|');
};

// When submitted, FormData will have:
// product_ids = "ID:123|ID:456|ID:789"
```

### Using getValue() for JavaScript submissions

For JavaScript-based form submissions (AJAX, fetch), use `getValue()`:

```javascript
// Single-select mode
const select = document.querySelector('web-multiselect[multiple="false"]');
const selectedId = select.getValue();
// Returns: "js" or null

// Multi-select mode
const multiSelect = document.querySelector('web-multiselect[multiple="true"]');
const selectedIds = multiSelect.getValue();
// Returns: ["js", "ts", "py"] or []

// Submit with fetch
const response = await fetch('/api/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    skills: multiSelect.getValue()
  })
});
```

### Working with numeric values

The component handles both string and numeric values correctly:

```javascript
select.options = [
  { value: 1, label: 'Option 1' },
  { value: 2, label: 'Option 2' },
  { value: 3, label: 'Option 3' }
];

// getValue() preserves types
const values = select.getValue();
// Returns: [1, 2, 3] (numbers, not strings)

// FormData serialization
// JSON format: [1,2,3]
// CSV format: 1,2,3
// Array format: items[]=1, items[]=2, items[]=3
```

## Disabled options

```javascript
select.options = [
  { value: 'basic', label: 'Basic License', subtitle: 'Free forever' },
  { value: 'pro', label: 'Pro License', subtitle: 'Available for purchase' },
  {
    value: 'enterprise',
    label: 'Enterprise License',
    subtitle: 'Contact sales',
    disabled: true
  }
];
```

## Deferred initialization (`defer` / `ready()`)

A custom element upgrades the moment its script loads: the browser builds its shadow DOM
and paints it with the component's **default** styles. If you then assign a
[`customStylesCallback`](#custom-rendering) (or your framework adopts a shared stylesheet)
*after* upgrade, there's a visible beat where badges/options show unstyled before they
restyle — the classic custom-element flash. The same race bites any post-upgrade wiring
(options, event listeners) that you'd rather have in place before the first paint.

The `defer` attribute holds the first render until you say go:

- Add `defer` and the component builds **nothing** on upgrade — it only reserves space
  (via `:host([defer]:not([is-ready]))`, mirroring the pre-upgrade `:not(:defined)` window).
- Wire everything from JS — `options`, `customStylesCallback`, listeners.
- Call `el.ready()` (or remove the `defer` attribute) to build **once**, with all of it
  already applied. The gate is *latched* — once released it never re-closes.

```html
<web-multiselect id="skills" defer value-member="value" display-value-member="label"></web-multiselect>
```

```javascript
const el = document.getElementById('skills');

el.options = await loadSkills();
el.customStylesCallback = () => `.ms__badge { background: var(--brand); color: #fff; }`;
el.addEventListener('change', (e) => console.log(e.detail.selectedValues));

el.ready();          // builds once — the styled badges appear in one shot, no flash
el.isReady;          // → true
```

`ready` fires once, right after the first build (synchronously during upgrade for a
normal, non-deferred element; on release for a deferred one):

```javascript
el.addEventListener('ready', () => {
  // the picker is live and painted — safe to read state, focus it, etc.
});
```

### Framework integration (Phoenix LiveView, etc.)

Server-rendered frameworks emit the `<web-multiselect>` tag in the initial HTML, then a
JS hook wires it up — exactly the ordering that flashes. Put `defer` in the dead-render
and release from the hook (or by patching the attribute off from the server):

```elixir
<web-multiselect defer phx-update="ignore" id="skills"
  phx-hook="MultiSelect" data-options={Jason.encode!(@skills)}></web-multiselect>
```

```javascript
// app.js
Hooks.MultiSelect = {
  mounted() {
    const el = this.el;
    el.options = JSON.parse(el.dataset.options);
    el.customStylesCallback = () => `.ms__badge { background: var(--brand); color: #fff; }`;
    el.addEventListener('change', (e) => this.pushEvent('changed', e.detail));
    el.ready();                // build once, flash-free
  },
};
```

> Removing the `defer` attribute has the same effect as `ready()`, so a purely
> server-driven integration can release the gate by patching the attribute off — no
> client hook required. `is-ready` is reflected for CSS/debugging; don't set it yourself.
