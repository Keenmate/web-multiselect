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

## What's New in v2.3.0

- **`--ms-checkbox-scale` — one shared knob to size option checkboxes across every Keenmate component** — The option checkbox now reads the shared `--base-checkbox-scale` contract (`--ms-checkbox-scale` defaults to `var(--base-checkbox-scale, 1)`), so setting `--base-checkbox-scale` once on an ancestor scales the checkboxes in web-multiselect, the other Keenmate components, and PureAdmin together instead of each one guessing its own size. You can still override `--ms-checkbox-scale` per instance. Under the hood the box is now sized with `calc` — width/height, border width (via the new `--ms-checkbox-border-width-scaled`), and corner radius all multiply by the scale, with `box-sizing: border-box` so the declared size is the rendered size. This replaces the old `transform: scale()`, which promoted the box to a compositing layer and pixel-snapped the masked check/dash off-centre; the mark now stays crisp and centred at any scale. Default rendering is unchanged.

## What's New in v2.2.0

- **Standardized callback context — one typed contract for action-button and display callbacks** — The action-button callbacks used to receive the untyped picker instance, and the display `get*` callbacks (badge display/class/tooltip, remove-button tooltip, selected-item class, option tooltip) got only the item. They now receive a typed second argument: a new `ActionContext<T>` (extends `PresentationContext`, carrying component state, the host element, and a `MultiSelectController<T>` imperative facade) for `getIsVisible`/`getIsDisabled`/`getText`/`getClass`/`getTooltip`/`onClick`, and the same `BadgeContentRenderContext` / `OptionContentRenderContext` their `render*` twin already gets for the display siblings. Everything is additive — existing one-argument callbacks keep working — and `ActionContext`, `MultiSelectController`, `MultiSelectKeyboardController`, and `ActionButton` are now exported from the package entry.
- **`custom-styles` attribute — style shadow-DOM internals with zero JavaScript** — The only way to inject custom CSS into the shadow root used to be `customStylesCallback`, which locked out static HTML, server-rendered markup, and no-build sites. The new `custom-styles` attribute takes raw CSS as a string and injects it verbatim into the same replaceable style slot the callback uses, so you can restyle badges, options, and your own custom-rendered content declaratively. It's reactive, mirrored by a `customStyles` property, and flows through the same dev-mode `--ms-*` lint; when both are set, `customStylesCallback` still wins.
- **Tree cascade by default, plus per-group select-all** — In a multi-select tree, `checkbox-mode` now defaults to `cascade`: ticking a branch selects its whole subtree, branches render tristate, and the emitted value follows `cascade-select-policy` (default `rolled-up`). This is a behavior change for existing tree consumers — set `checkbox-mode="independent"` to keep per-node toggling. Flat grouped lists get the parallel `group-select-mode="cascade"`, a tristate select-all checkbox on each group header (member values only — the group name is never a value).
- **Per-group selected counts + one shared count formatter** — Every group header now shows a count of that group's selected members, rendered as the same small chip as the in-input `[N]` counter. A new `getCountLabelCallback((selected, total) => string)` formats both places together so they always read the same way — default `[3]`, or return `` `${s}/${t}` `` for an x-of-total style.
- **Order the selected items — `selected-order`** — Control the sequence chosen items appear in across badges, the partial "+N more" split, and the popover: `as-selected` (default), `label-asc`/`label-desc`, `member` (via `selected-order-member` or `getSelectedOrderCallback`), or `custom` (a comparator). Display-only — `getValue()`, form output, and `getSelected()` keep insertion order.
- **Every render callback now carries the presentation context** — `renderSelectedItemContentCallback`, `renderSelectedContentCallback`, and `renderGroupLabelContentCallback` now receive a second context argument (matching the option and badge callbacks), so any custom renderer can branch on `isFullscreen`/`isModal` to render leaner content in the phone overlay. The context render-type interfaces are exported from the package entry, and it's additive — one-argument callbacks are unaffected.
- **Fixes — selection & layout robustness** — Single-select no longer keeps a stale multi-selection when seeded with several values; an async `searchCallback` dropdown no longer overflows the viewport when results grow after it opens near the bottom; changing a cosmetic attribute (`badges-display-mode`/`badges-position`) no longer wipes the selection; `search-input-mode="hidden"` no longer collapses the input row; and the "+N more" badge's ✕ now removes the hidden items instead of silently opening the popover.

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
