# @keenmate/web-multiselect

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@keenmate/web-multiselect.svg)](https://www.npmjs.com/package/@keenmate/web-multiselect)

> A lightweight, themeable multi-select web component with typeahead search, RTL support, rich content, and full keyboard navigation.

## What is it

`@keenmate/web-multiselect` is a custom element (`<web-multiselect>`) that turns a list of options into a searchable, themeable multi-select dropdown. Framework-agnostic — works in React, Vue, Svelte, Blazor, plain HTML.

Reads `--base-*` variables from the page if [`@keenmate/theme-designer`](https://theme-designer.keenmate.dev) is present, falls back to sensible OS-aware defaults otherwise, and ships with first-class dark-mode and per-instance theming.

**Headline features:**

- Declarative `<option>` / `<optgroup>` markup — no JavaScript required for simple cases.
- Virtual scrolling for 10,000+ option datasets (25× faster opening, 99.8% memory reduction).
- Filter or navigate search modes; async / hybrid search.
- Five badge display modes (pills, count, compact, partial, none) with positioning on any side.
- Full keyboard navigation, RTL language support, badge tooltips.
- Custom rendering callbacks for options, badges, and group headers.
- Form integration via standard hidden inputs (FormData-compatible).

## What's New in v2.5.0-rc01

- **Internationalization — a `labels` map for every ARIA / UI string** — The component's accessibility labels and short UI strings were hardcoded English, so a non-English screen-reader user still heard "Close", "Clear selection", "Remove …", "N selected", and the navigate-mode "Previous/Next match" in English. The new `labels` property (type `MultiSelectLabels`, exported from the package entry) takes a partial i18n map — set only the keys you need and the rest fall back to their English defaults. Values interpolate `{item}` (an option's label) and `{count}` (a number), so `removeItem: 'Odebrat {item}'` or `andMore: '…a {count} dalších'` read naturally. Covered keys: `close`, `clearSelection`, `clearAllSelections`, `clearSearch`, `showFullLabel`, `removeItem`, `removeHiddenItems`, `groupSelectedLabel`, `andMore`, `prevMatch`, `nextMatch`.
- **Translatable selected-items popover title** — The popover header was a hardcoded "Selected Items (N)", the one *visible* string with no override. The new `selected-popover-title` attribute (and `selectedPopoverTitle` property) makes it configurable, with a `{count}` placeholder so translators control both the wording and where the count sits — e.g. `selected-popover-title="Vybrané položky ({count})"`. Defaults to `Selected Items ({count})`, so nothing changes unless you set it.
- **Builder playground on the examples site** — A new interactive Builder page lets you configure a live multiselect from a Visual-Studio-style grouped property panel — toggle any attribute, see it apply instantly, paste your own JSON options, and copy the generated markup. Each property has a Floating-UI tooltip explaining it. Where an attribute needs a JS companion the grid can't express — `allow-add-new` (needs `addNewCallback`), `selected-order="custom"` (needs `selectedOrderCompareCallback`) — the Builder wires a demo callback and flags the dependency right in the generated markup, so it doubles as a lesson in the attribute-vs-callback boundary.

## What's New in v2.4.0

- **`options` updates in place — the dropdown no longer closes after every pick** — Assigning the `options` property used to tear down and rebuild the whole component, which snapped an open dropdown shut and reset scroll and search. That made the common framework pattern — handing the component a fresh array on every render (React/Vue/Lit, or a Phoenix LiveView re-render) — unusable for multi-selection, because each pick that triggered a parent re-render closed the list. The property is now routed through the core's in-place update path instead of a re-init, so an open dropdown stays open and the selection, scroll offset, and search term all survive the swap. It's also far cheaper: replacing a 5000-item list is now an O(n) in-place update measured at ~2 ms, versus a full teardown with a Floating-UI re-anchor and a fresh virtual scroller. Setting `options` to `null` clears the list in place.
- **New `refresh()` method — re-render without re-assigning `options`** — There was no way to tell the component "the data you already hold changed, repaint it" short of faking a new array. `refresh()` is the companion to the `options` setter: call it when you mutate an option object in place (e.g. flipping a `disabled` flag) or when external state a render callback reads changes (`getDisabledCallback`, an i18n label map, a custom option renderer). It re-projects the filtered/tree view from the current options honouring the active search term, reconciles the selection, and repaints — all silently, firing no `select`/`deselect`/`change`. The rule is simple: assign `options` when the set changed, call `refresh()` when the same objects did.
- **New `prune-missing-selection` option — drop selections whose option disappears** — When you replace the option list, a value that was selected but is no longer offered used to linger as a phantom: still in `getValue()`, still a badge, but not pickable. That's the right default for search and paged lists (an item can leave the current page yet stay valid), so it's unchanged. The new `prune-missing-selection` attribute (and `isPruneMissingSelectionEnabled` property) opts into the opposite behavior for when a list replacement means the domain itself changed — e.g. an item was deleted server-side — dropping any selected value that has no matching option, silently.

## Demos & docs

- 🚀 [Showcase](https://web-multiselect.keenmate.dev)
- 🧪 [Live demo](https://examples.web-multiselect.keenmate.dev)
- 📘 [Usage / API reference](./docs/usage.md) — attributes, properties, methods, events.
- 🎨 [Theming](./docs/theming.md) — `--ms-*` variables, dark mode, cascade layers, Theme Designer integration.
- 📚 [Examples / cookbook](./docs/examples.md) — rich content, async search, virtual scroll, custom rendering, forms.
- ♿ [Accessibility](./docs/accessibility.md) — keyboard model, ARIA labels, focus behavior.

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
| Element | `src/web-component.ts` | `MultiSelectElement` — custom-element I/O wrapper, `ATTRIBUTE_TABLE`-driven |
| Logic | `src/multiselect.ts` | `WebMultiSelect<T>` — framework-agnostic core |
| Service | `src/tooltip.ts`, `src/virtual-scroll.ts` | single-purpose helpers (`Tooltip`, `VirtualScroll`) |
| Side | `src/types.ts`, `src/logger.ts`, `src/vendor/` | types, logging, vendored deps |

Two deviations from the canonical shape, both intentional:

- **`MultiSelectElement extends BaseElement`, not `HTMLElement` directly.** `BaseElement` is a local `const` resolving to `HTMLElement` in the browser and to a stub class under SSR (`typeof HTMLElement === 'undefined'`), so importing the module in Node doesn't throw. A literal `grep "extends HTMLElement"` structure check will not match here by design.
- **`src/vite-env.d.ts`** is a standard Vite ambient-types file, not part of the four-layer model.

## License

MIT — see [LICENSE](./LICENSE).

## Built with BlissFramework

Follows the [BlissFramework component guidelines](https://blissframework.dev/) for structure, theming, color-scheme, and accessibility. Per-check verifications run via `/validate-web-component`.

## Credits

Created by [Keenmate](https://github.com/keenmate) as part of the Pure Admin design system.
