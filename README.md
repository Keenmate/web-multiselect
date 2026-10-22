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

## What's New in v2.6.0-rc01

- **Theming — reads `@keenmate/base-css-variables` 2.0** — The base layer renamed many tokens in 2.0: accent → `--base-primary-*`, `--base-text-on-<role>` → `--base-on-<role>-text-color`, `--base-input-color` → `--base-input-text-color`, the input clear tokens → `--base-input-icon-*`, and `--base-<role>-bg` was removed. The component now reads the new names everywhere, so it follows a 2.0 theme instead of silently falling back to its built-in defaults. The component's own `--ms-accent-*` tokens keep their names, so your overrides still work. Message, tooltip and icon colours, stacking (`--base-z-dropdown` / `-popover` / `-tooltip`), border widths (new `--ms-border-width` from `--base-border-width`) and shadows (`--base-shadow-color`) all come from the shared base layer now, so the component layers and shades the same way as pure-admin on the same page.
- **Options — selected and focused rows match the Keenmate tree components** — Selected and keyboard-focused options now read the shared item-state tokens (`--base-selected-bg` / `-text-color` / `-outline` and `--base-focused-bg` / `-text-color` / `-outline`; the selected tokens were named `--base-highlighted-*` before base-css-variables 2.0.0-rc03). A multiselect row therefore looks identical to a selected or focused row in the tree components next to it. New `--ms-option-bg-selected-hover`, `--ms-option-color-selected`, `--ms-option-outline-selected` and `--ms-option-title-color-focused` / `-selected` expose each state, and every read keeps an inline fallback. Focus is now a 1px inset outline with no grey background fill. Selected + focused shows the selected tint plus the outline.
- **Controls — stronger outline and a focus halo** — The input, the Select All / Clear All buttons and the count pill now use the control outline through the new `--ms-input-border-color` (`--base-input-border-color`). Before, they used the divider colour, which nearly disappeared in some themes. The focused input and the fullscreen search now show `--ms-input-box-shadow-focus`, the same soft ring pure-admin inputs use, instead of only changing the border colour. The sticky actions bar, floating hint and selected-items popover share the dropdown surface and border, so they no longer render as separate coloured strips.
- **Scaling — everything follows `--ms-rem`** — The tree indent used real `rem`, and the phone fullscreen view used a fixed `12px`, so both ignored `--base-rem`. The indent is now `0.75` / `1.25 × --ms-rem`, and `--ms-fullscreen-rem` is `calc(1.2 * var(--ms-rem))`, so the phone sheet is always larger than the floating dropdown. A related fix: `fullscreenScale()` `parseFloat`-ed `--ms-rem`, which read `1rem` as 1 under base-css-variables, so virtual rows came out 12× too tall. Both sizes are now measured as lengths.
- **Variables — 44 dead `--ms-*` variables removed** — These variables were declared but nothing read them: no CSS rule, no other variable and no script. Setting them never had an effect. The list includes the `--ms-font-size-*` / `--ms-spacing-*` scales, `--ms-badge-bg*`, `--ms-more-badge-*`, `--ms-counter-*` and `--ms-action-btn-*`. Most have live counterparts (`--ms-badges-gap`, `--ms-counter-badge-*`, `--ms-action-button-*`, `--ms-tooltip-text-color`). Twenty-two colour tokens declared twice in `variables.css` were also de-duplicated. If you set any of the removed names, switch to the live variable; behaviour is otherwise unchanged.
- **Fixes — declarative options, readable messages, disabled states, navigate search** — Declarative `<option>` children rendered every option as "[N/A]" since 2.5.0, because the member defaults only applied to `undefined` while the core null-clear contract passes `null`. They now apply to `null` too. Warning, error and success messages were unreadable under the base theme because their text used the same colour as their background; the text now reads `--base-on-<role>-text-color`. A disabled checked checkbox keeps its (dimmed) mark, a disabled field no longer shows the accent hover border, and `search-mode="navigate"` with virtual scrolling now scrolls to a match below the fold.

## What's New in v2.5.0

- **Internationalization — a `labels` map for every ARIA / UI string** — The component's accessibility labels and short UI strings were hardcoded English, so a non-English screen-reader user still heard "Close", "Clear selection", "Remove …", "N selected", and the navigate-mode "Previous/Next match" in English. The new `labels` property (type `MultiSelectLabels`, exported from the package entry) takes a partial i18n map — set only the keys you need and the rest fall back to their English defaults. Values interpolate `{item}` (an option's label) and `{count}` (a number), so `removeItem: 'Odebrat {item}'` or `andMore: '…a {count} dalších'` read naturally. Covered keys: `close`, `clearSelection`, `clearAllSelections`, `clearSearch`, `showFullLabel`, `removeItem`, `removeHiddenItems`, `groupSelectedLabel`, `andMore`, `prevMatch`, `nextMatch`.
- **Translatable selected-items popover title** — The popover header was a hardcoded "Selected Items (N)", the one *visible* string with no override. The new `selected-popover-title` attribute (and `selectedPopoverTitle` property) makes it configurable, with a `{count}` placeholder so translators control both the wording and where the count sits — e.g. `selected-popover-title="Vybrané položky ({count})"`. Defaults to `Selected Items ({count})`, so nothing changes unless you set it.
- **Aligned icon gutter — `reserve-icon-slot`** — When a list mixes rows that have an icon with rows that don't, the icon-less rows used to pull their label into the gutter, so labels started at ragged horizontal positions. The new `reserve-icon-slot` attribute (and `isIconSlotReserved` property) reserves a fixed-width icon slot on every row — an empty placeholder where a row has no icon — so every label lines up in one start column. It's off by default (nothing changes unless you set it) and option-level, applying identically to a flat list and a tree, where the depth indent already offsets each level. The slot reuses the existing `--ms-option-icon-size` box and `--ms-option-content-gap`, so it scales with `--ms-rem` and honours your theme.
- **Builder playground on the examples site** — A new interactive Builder page lets you configure a live multiselect from a Visual-Studio-style grouped property panel — toggle any attribute, see it apply instantly, paste your own JSON options, and copy the generated markup. Each property has a Floating-UI tooltip explaining it. Where an attribute needs a JS companion the grid can't express — `allow-add-new` (needs `addNewCallback`), `selected-order="custom"` (needs `selectedOrderCompareCallback`) — the Builder wires a demo callback and flags the dependency right in the generated markup, so it doubles as a lesson in the attribute-vs-callback boundary.

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
| Logic | `src/multiselect.ts` | `WebMultiSelect<T>` — framework-agnostic core (search, selection, keyboard, rendering) |
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
