# @keenmate/web-multiselect

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@keenmate/web-multiselect.svg)](https://www.npmjs.com/package/@keenmate/web-multiselect)

> A lightweight, themeable multi-select web component with typeahead search, RTL support, rich content, and full keyboard navigation.

## Demos & docs

- 🚀 [Showcase](https://web-multiselect.keenmate.dev)
- 🧪 [Live demo](https://examples.web-multiselect.keenmate.dev)
- 📘 [Usage / API reference](./docs/usage.md) — attributes, properties, methods, events.
- 🎨 [Theming](./docs/theming.md) — `--ms-*` variables, dark mode, cascade layers, Theme Designer integration.
- 📚 [Examples / cookbook](./docs/examples.md) — rich content, async search, virtual scroll, custom rendering, forms.
- ♿ [Accessibility](./docs/accessibility.md) — keyboard model, ARIA labels, focus behavior.

## What is it

`@keenmate/web-multiselect` is a custom element (`<web-multiselect>`) that turns a list of options into a searchable, themeable multi-select dropdown. Framework-agnostic — works in React, Vue, Svelte, Blazor, plain HTML.

Reads the `--base-*` tokens from [`@keenmate/base-css-variables`](https://www.npmjs.com/package/@keenmate/base-css-variables) 2.0 when the page loads them (the shared layer behind pure-admin and the [Theme Designer](https://theme-designer.keenmate.dev)), falls back to sensible OS-aware defaults otherwise, and ships with first-class dark-mode and per-instance theming.

**Headline features:**

- Declarative `<option>` / `<optgroup>` markup — no JavaScript required for simple cases.
- Virtual scrolling for 10,000+ option datasets (25× faster opening, 99.8% memory reduction).
- Filter or navigate search modes; async / hybrid search.
- Five badge display modes (badges, count, compact, partial, none) with positioning on any side.
- Tree mode with cascade / independent checkboxes; phone-friendly fullscreen presentation.
- Full keyboard navigation, RTL language support, badge tooltips.
- Custom rendering callbacks for options, badges, and group headers.
- Form integration via standard hidden inputs (FormData-compatible).

## What's New in v3.0.0-rc01

**A major release — breaking, no aliases.** The callbacks, events and inputs follow the shared
KeenMate interaction model and naming rulebook (`@keenmate/web-components-core` 1.0.0-rc17), so
code written for 2.x needs updating. Upgrade guide: the
[3.0.0-rc01 release notes](release-notes/3.0.0-rc01.md); full old → new tables: the
[CHANGELOG 3.0.0-rc01 section](CHANGELOG.md); step-by-step:
[ai/migration-guide.txt](ai/migration-guide.txt).

**Breaking changes:**

- **Callbacks take one `ctx`** — per-option callbacks read `ctx.option` (row callbacks also
  `ctx.optionIndex`), e.g. `getDisplayValueCallback: ({ option }) => option.name`; every ctx
  carries `controller` / `element`. Before-hooks cancel with `false`
  (`beforeSelectCallback`, `beforeAddCallback` (was `addNewCallback`), `beforeKeydownCallback`
  (was `keydownCallback`)). `on*` properties receive the event **detail**. Custom action
  buttons use `id` + `onClick(detail)`; a new `action` event reports every button /
  `data-action` click; the toggle state is `isToggled` / `getIsToggledCallback`.
- **One naming vocabulary** — `isMultiple`, `shouldCloseOnSelect`, `name`, `isDisabledMember` /
  `is-disabled-member`, `maxVisibleBadgeCount`, `virtualScrollItemHeight`, … (attributes derived
  from the property names).
- **UI strings → `labels`** — `search-placeholder`, `select-placeholder`, `empty-message`,
  `loading-message`, `add-new-text`, … are gone; set `labels` (property or JSON attribute,
  `labels='{"selectPlaceholder":"Pick a country"}'`). Empty states are `noData` / `noResults`.
- **Initial selection = `value` / `defaultValue`** — was `initial-values` / `initialValues`; parsed
  per `value-format`; `el.value` is the live submitted value. `value-format="csv"` → `text`
  (joined by the new `value-separator`).
- **`form.reset()` restores the initial selection** — it used to clear it; it does so without firing
  `deselect` / `change`.
- **Selection state is properties** — `selectedOptions` / `selectedValue` / `selectedOption` /
  `searchTerm` on the element and `el.controller` (was `getSelected()` / `getValue()` /
  `selectedItem` / `searchText`); `el.controller.clearSelection()` (was `clearAll()`; action id
  and label `clear-selection` / `labels.clearSelection`).
- **Member defaults for all data** — `value` / `label` / `group` / `icon` / `subtitle` /
  `disabled`, so `[{ value, label }]` works without configuration; a `get*Callback` always beats its member.
- **`presentation`** — was `mobile-presentation`; the `mobile` width breakpoint is 768px (was 640).
- **Defer / ready from core** — `el.release()` (was `el.ready()`), host attribute `ready` +
  `:state(ready)` (was `is-ready`), `el.whenReady()`, property `shouldDefer`.
- **Removed** — `show-debug-info` and the debug panel (use `el.enableLogging()`),
  `--ms-transition-fast` (one duration: `--ms-transition-normal`), the component's own
  `prefers-reduced-motion` block (core applies reduced motion on every page; the 1.5s loader
  slowdown needs base-css-variables).
- **Browser floor** — Chrome/Edge 119+, Firefox 128+, Safari 18+ (relative-colour syntax in the
  standalone colour fallbacks).

**Also new:** the `motion` level (`motion="none | snappy | smooth"`, `data-motion` on a section,
`window.components.motion`), list scrolling that never moves the page, responsive rules (below),
`disabled` / `readonly`, `open` / `close` /
`value-format-error` events, `getOptionByValue()`, the shared loader (`renderLoadingCallback`),
standalone colours that follow the base-css-variables contract (accent `#3b82f6`; disabled rows
are tinted).

Earlier releases: [2.6.0-rc03](release-notes/2.6.0-rc03.md), [2.6.0-rc02](release-notes/2.6.0-rc02.md), [CHANGELOG](CHANGELOG.md).

## Install

```bash
npm install @keenmate/web-multiselect
```

## Quick start

**Declarative — no JavaScript required:**

```html
<script type="module">
  import '@keenmate/web-multiselect';
</script>

<web-multiselect labels='{"selectPlaceholder": "Pick a country"}'>
  <option value="cz">Czech Republic</option>
  <option value="sk">Slovakia</option>
  <option value="at">Austria</option>
</web-multiselect>
```

**Programmatic — dynamic data + events:**

```html
<web-multiselect id="picker" labels='{"searchPlaceholder": "Search…"}'></web-multiselect>

<script type="module">
  import '@keenmate/web-multiselect';

  const picker = document.getElementById('picker');
  picker.options = [
    { value: 'js', label: 'JavaScript', icon: '🟨' },
    { value: 'ts', label: 'TypeScript', icon: '🔷' },
    { value: 'py', label: 'Python', icon: '🐍' }
  ];

  picker.addEventListener('change', (e) => {
    console.log('Selected:', e.detail.selectedValues);
  });
</script>
```

See [docs/usage.md](./docs/usage.md) for the full API and [docs/examples.md](./docs/examples.md) for advanced patterns (async data, virtual scrolling, custom rendering, form integration).

## Responsive rules

Tune what the picker does per device or window width without app-side viewport code — a map
of partial configs, or a callback that computes one. A map has two axes, each keyed
`mobile` / `tablet` / `desktop`:

- **`device`** — the device class (`classifyDevice`): a phone / tablet by **capability**
  (touch-primary, then the short side); a mouse device is `desktop` at any width.
- **`breakpoint`** — the **window width** bucket (768 / 1024px lines, `--base-breakpoint-*`):
  a narrowed desktop window is `mobile` below 768px.

Within one map the breakpoint entry applies first and the device entry over it (device wins
on the same key). Own widths or combinations (`ctx.env.viewportWidth`, device class AND
width, …) go in a `responsiveCallback`. Keys are **configKeys**; set them page-wide, per tag
or per instance
(the generic core mechanism, [core SPEC §6.7](https://github.com/KeenMate/web-components-core/blob/prod/docs/SPEC.md#67-responsive-rules--partial-configs-per-device-class-page--tag--instance)):

```js
// page-wide (every KeenMate component) and per tag — may be set before the script loads
window.components.responsive = { device: { mobile: { presentation: 'fullscreen' } } };
window.components['web-multiselect'].responsiveCallback = (ctx) =>
  ctx.deviceClass === 'mobile' ? { actionsLayout: 'wrap' } : undefined;

// per instance (property, or the JSON attribute responsive='{"device":{"tablet":{…}}}')
el.responsive = {
  device:     { tablet: { presentation: 'fullscreen' } },   // a touch tablet
  breakpoint: { mobile: { badgesDisplayMode: 'count' } },   // any window under 768px
};
el.responsiveCallback = (ctx) => (ctx.env.orientation === 'landscape' ? { badgesThreshold: 5 } : undefined);
```

Precedence (later wins, key by key): global map → global callback → per-tag map → per-tag
callback → **the instance's own attributes / properties** → instance map → instance callback.
An attribute written on an element is never overridden by a page rule; `null` from the
instance callback ignores every page rule. Maps re-run when the device class / breakpoint
changes, callbacks also on every viewport resize; overrides never reflect to attributes. The
pre-rc15 device-keyed shape (`{ mobile: … }`) warns and is ignored. Typed as `MultiSelectResponsiveMap` /
`MultiSelectResponsiveCallback`. Demo: `examples-responsive.html`, `examples-action-buttons.html`.

## Logging

Errors and warnings print out of the box (the default level is `warn`); info / debug / trace are
opt-in. Levels coalesce, closest first:

| Scope | API |
|---|---|
| Element | `el.enableLogging(level?)` (default `debug`; `'error'` makes it quieter than its type), `el.disableLogging()` silences this element, `el.resetLogging()` — it follows its type / the page again |
| Type (per category `INIT` / `DATA` / `UI` / `INTERACTION`) | `window.components['web-multiselect'].logging` — `enableLogging`, `disableLogging`, `setLogLevel`, `setCategoryLevel(cat, level \| null)`, `resetLogging`; the same functions are exported from the package |
| Page | `window.components.logging` — every component on the page |
| Default | `warn` |

A page call never overwrites a type level, so the order of calls doesn't matter. Instance
`debug` / `trace` lines print through `console.log`. See `examples-logging.html`.

## Editor IntelliSense

The package ships editor metadata so you get autocomplete and hover docs for the
element's attributes, events, and all `--ms-*` CSS custom properties. All of it is
generated from the component's source on every build, so it never drifts.

- **JetBrains** (WebStorm / IntelliJ) — works automatically. The IDE discovers
  `web-types.json` via the `web-types` field in `package.json`; no setup needed.
- **VS Code** — the data files ship but VS Code doesn't auto-discover them from a
  dependency, so point your workspace at them once in `.vscode/settings.json`:

  ```json
  {
    "html.customData": [
      "./node_modules/@keenmate/web-multiselect/vscode.html-custom-data.json"
    ],
    "css.customData": [
      "./node_modules/@keenmate/web-multiselect/vscode.css-custom-data.json"
    ]
  }
  ```

  `html.customData` powers tag/attribute completion on `<web-multiselect>`;
  `css.customData` powers completion for the `--ms-*` theming variables. Reload
  the window after adding them.

## HTML Injection (XSS) Notice

These inputs are inserted as **raw HTML** — intentionally not XSS-safe, so you control the
markup. Sanitize any untrusted text before passing it in:

| Input | Output used in |
|---|---|
| `labels.noData`, `labels.noResults`, `labels.searching` | Dropdown empty / searching text (innerHTML) |
| `labels.addNew`, `labels.addNewPending` | "Add new" prompt (innerHTML; the `{value}` typed text is escaped) |
| `labels.selectedCount`, `labels.moreCount` | Counter badge text (innerHTML) |
| `renderOptionContentCallback`, `renderGroupLabelContentCallback`, `renderBadgeContentCallback`, `renderBadgeCallback`, `renderSelectedItemContentCallback` (string return) | Option rows, group headers, badges, selected panels (innerHTML) |
| Display value (`displayValueMember` / `getDisplayValueCallback`) | Option title and badge text (innerHTML; search highlighting marks text runs only) |
| `getBadgeDisplayCallback` | Badge text (innerHTML) |
| Full title (`fullTitleMember` / `getFullTitleCallback`) | Badge text when `isBadgeFullTitleShown` (innerHTML) |
| Subtitle (`subtitleMember` / `getSubtitleCallback`) | Option subtitle (innerHTML) |
| Icon (`iconMember` / `getIconCallback`) | Option icon (innerHTML) |

All other labels (ARIA labels, tooltips, placeholders, popover title, action-button texts) are
plain text, as are `showMessage()` strings and `renderSelectedContentCallback` (the closed input's value).
Option values and tree paths are escaped (they only ever land in attributes); the display value,
full title, subtitle and icon are HTML — sanitize untrusted data first.

## Browser support

Modern evergreen browsers — the standalone colour fallbacks use CSS relative-colour syntax (`oklch(from …)`), the same floor as `@keenmate/base-css-variables` 2.x:

- Chrome / Edge 119+
- Firefox 128+
- Safari 18+

No polyfills are shipped. SSR-safe: the module imports without crashing in Node, but renders only after hydration in the browser.

## Development

```bash
# Install dependencies
npm install

# Start dev server (HMR)
npm run dev

# Build for production
npm run build

# Create package tarball
npm run package

# Run tests
npm run test:unit   # Vitest (happy-dom) — fast logic checks
npm run test:e2e    # Playwright (browser) — interaction/visual
npm test            # both
```

## Code structure

Follows the BlissFramework four-layer web-component layout:

| Layer | File | Role |
|-------|------|------|
| Element | `src/web-component.ts` | `MultiSelectElement` — custom-element I/O wrapper, driven by the `INPUTS` table (attributes, properties, callbacks) and the events table |
| Logic | `src/multiselect.ts` | `MultiSelectEngine<T>` — framework-agnostic core (search, selection, keyboard, rendering) |
| Service | `src/virtual-scroll.ts`, `src/tree/` | `VirtualScroll`; the ltree option model and checkbox cascade for tree mode |
| Side | `src/types.ts`, `src/option-formats.ts`, `src/converters.ts`, `src/logger.ts`, `src/index.ts` | types, `data-options` parsers, component-local converters, logging shim, package entry |

Positioning (dropdown, popovers, tooltips), attribute parsing and reflection, and the logging engine come from [`@keenmate/web-components-core`](https://www.npmjs.com/package/@keenmate/web-components-core).

Two deviations from the canonical shape, both intentional:

- **`MultiSelectElement extends BlissElement`, not `HTMLElement` directly.** Core's `BlissElement` resolves to `HTMLElement` in the browser and to a stub class under SSR (`typeof HTMLElement === 'undefined'`), so importing the module in Node doesn't throw. A literal `grep "extends HTMLElement"` structure check will not match here by design.
- **`src/vite-env.d.ts`** is a standard Vite ambient-types file, not part of the four-layer model.

## License

MIT — see [LICENSE](./LICENSE).

## Built with BlissFramework

Follows the [BlissFramework component guidelines](https://blissframework.dev/) for structure, theming, color-scheme, and accessibility. Per-check verifications run via `/validate-web-component`.

## Credits

Created by [Keenmate](https://github.com/keenmate) as part of the Pure Admin design system.
