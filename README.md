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

## What's New in v2.6.0-rc03

Keyboard form flow for single-select, plus a visible highlight. See the
[release notes](release-notes/2.6.0-rc03.md); one behaviour change: single-select now clears its
search when it closes.

- **Keyboard — Tab can select** — Tab (and Shift+Tab) used to close the dropdown and move on, dropping the highlighted option, so typing `cesky kru` and tabbing to the next field left it empty. The new `tab-behavior` attribute decides what Tab selects before focus moves: `select-highlighted` takes the highlighted option, including the first match highlighted while typing; `select-navigated` only takes an option the user moved to with the arrows (typing resets it); `close` selects nothing, as in 2.5. Unset means `select-highlighted` in single-select and `close` in multi-select. Tab only ever adds, so it never un-picks in multi-select, and a `beforeSelectCallback` veto still applies. A Tab selection fires `select` / `change` and updates the form value like Enter.
- **Keyboard — single-select opens at its value** — Opening a single-select with no search term now highlights the selected option and scrolls it to the middle of the list, like a native `<select>`: with Item 30 of 50 selected, ArrowUp goes to 29 instead of starting from the top. The scroll is instant and moves only the list, never the page; with virtual scrolling the row is rendered first. Typing still highlights the first match, and tabbing straight through changes nothing.
- **Search — single-select clears the term on close** — `should-keep-search-on-close` is now tristate: unset keeps the term in multi-select, where you reopen and keep picking, but clears it in single-select, where it is finished once a value is picked or focus leaves. Before, tabbing out after typing `cesk` and coming back with Shift+Tab reopened the field with `cesk` in the box and the list still filtered — in a cascade of selects you had to delete it every time. Behaviour change: `should-keep-search-on-close="true"` restores the old single-select behaviour.
- **Theming — the focused option is filled again** — 2.6.0-rc01 marked keyboard focus with the shared contract's 1px inset ring and no fill, as in the tree components. In a combobox the focused option is what Enter / Tab will pick, and with a single result its ring sat on the panel border, so nothing looked highlighted. `--ms-option-bg-focused` now uses the hover fill under the ring and deliberately no longer reads `--base-focused-bg` — a documented exception to the contract; override `--ms-option-bg-focused` to change it.
- **Search — primitives now live in web-components-core** — Normalization, matching and highlight mapping moved to `@keenmate/web-components-core/search` (core 1.0.0-rc14), so other Keenmate components (web-treeview next) match and highlight exactly the same way. `src/search.ts` is gone; `normalizeSearchText` and the search types are re-exported under the same names. No API or behaviour change: the e2e suite passed unchanged and the bundle size is flat (412 kB).

## What's New in v2.6.0-rc02

The first 2.6 release on npm (rc01 never reached it), so it also carries everything from
2.6.0-rc01 (see the [CHANGELOG](CHANGELOG.md)). **Read the [release notes](release-notes/2.6.0-rc02.md) before upgrading from
2.5**: search now ignores accents by default, and a theme signal on a wrapper `<div>` needs
`theme-source`.

- **Search — accent-insensitive by default** — Built-in search used to lowercase and nothing more, so `ces` never found `Český` and `muller` never found `Müller`. The new `search-behavior` attribute picks the normalization: `normalized` (the new default) ignores case and diacritics, `case-insensitive` restores the previous behavior, and `exact` ignores nothing. Every mode compares Unicode NFC, so composed and decomposed accents match each other, and the `<mark>` highlight follows the same rules, so `ces` highlights `Čes`. The setting is live: a page-level switch re-runs the open search in place. The normalization is exported as `normalizeSearchText(text, behavior?)` for your own code.
- **Search — choose where the term matches** — The new `search-match` attribute sets where built-in search looks: `contains` (the default, as before), `equals` (the whole value, for codes: `haxkl324` finds `HAxKL324` but not `HAxKL3245`), `starts-with` / `ends-with` (the whole value), `word-starts-with` / `word-ends-with` (any word, so `kru` finds `Český Krumlov`), or `regex`. A regex runs against the raw search value without normalization, so case and accents are up to the pattern, and an unfinished pattern keeps the last valid result while you type.
- **Search — prepare the term, or bring your own engine** — `getSearchTermCallback(term, context)` turns typed text into what search looks for. For built-in search it returns a string or a `RegExp`, e.g. so `ha-324/56` finds `HA 324-56` and `HA32456`. For your own `searchCallback` it can return anything, objects included. `searchCallback` gets a third `context` argument with that prepared `searchTerm` and `entries`, every option paired with its search value. That value may now be an object such as `{ title, zip }` from `getSearchValueCallback`, so a FlexSearch or server search can match postal codes. `entries` is built on first access and stays the same array until the options change, so an engine can key its index on it. Existing `(term, signal)` callbacks keep working, and results may be returned synchronously.
- **Search — values prepared once, not per keystroke** — Each option's search value, from `searchValueMember` / `getSearchValueCallback` or the display value, is computed and normalized once, then cached. A keystroke over 2,000 options is now 2,000 lookups, where it used to re-read and re-lowercase every value. Replacing `options`, calling `refresh()`, or changing a member or callback re-prepares the values.
- **Dark mode — works in Firefox and Safari** — The component no longer relies on `:host-context()`, which Firefox doesn't support and Safari only partly supports. It reads the `data-context-theme` attribute that `@keenmate/web-components-core` 1.0.0-rc13 sets after detecting the page theme once (`data-theme`, `data-bs-theme`, or `.dark` / `.light` on `<html>` / `<body>`), shared by every Keenmate component. A per-instance `data-theme` still wins. Behaviour change: a theme signal on a wrapper `<div>` now needs `theme-source="closest"` or a selector. `setThemeMode()`, `getThemeContext()` and `observeThemeContext()` are re-exported from core.
- **Theming — follows base-css-variables 2.0.0-rc03** — Selected options read `--base-selected-*` (renamed from `--base-highlighted-*`). The placeholder and hint use text step 3, because step 4 was too faint to read. Primary used as text (badges, "add new", the fullscreen info icon) reads `--base-primary-text-color` for at least 4.5:1 contrast. Disabled controls share `--base-disabled-opacity`. Standalone fallbacks now match the contract defaults (accent `#0ea5e9`).
- **Fixes — fullscreen in Firefox/Safari, group count chip, trailing spaces** — `mobile-presentation="fullscreen"` closed itself the moment it opened in Firefox and WebKit, because a zero-delay timer cleared the open-gesture guard before the follow-up `click`. The guard now lasts the whole gesture. The per-group count chip gets vertical padding so its `[N]` no longer touches the edges, and group headers grow about 4px to fit it without shifting when it toggles. Flat-list search now trims the term like tree search does, so `york ` (with a trailing space) finds `New York`.

> **Breaking change in the next 2.x release — interaction model.** Every callback now takes one
> `ctx` argument (per-option callbacks read `ctx.item`, e.g. `getDisplayValueCallback: ({ item }) => item.name`),
> `on*` properties receive the event **detail** (`el.onSelect = (detail) => detail.option`),
> `addNewCallback` / `keydownCallback` / `getDisabledCallback` / `customStylesCallback` became
> `beforeAddCallback` / `beforeKeydownCallback` / `getIsDisabledCallback` / `getCustomStylesCallback`,
> before-hooks cancel with `false`, custom action buttons use `id` + `onClick(detail)`, a new
> `action` event reports every button / `data-action` click, and `el.controller` is the public
> facade. The full old → new table is in the [CHANGELOG `[Unreleased]` section](CHANGELOG.md#unreleased);
> the docs below already describe the new API.

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

<web-multiselect placeholder="Pick a country">
  <option value="cz">Czech Republic</option>
  <option value="sk">Slovakia</option>
  <option value="at">Austria</option>
</web-multiselect>
```

**Programmatic — dynamic data + events:**

```html
<web-multiselect id="picker" search-placeholder="Search…"></web-multiselect>

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

## Browser support

Modern evergreen browsers — anything with native `customElements`, Shadow DOM, and CSS `@layer` support:

- Chrome / Edge 99+
- Firefox 97+
- Safari 15.4+

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
