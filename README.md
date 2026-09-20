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

## What's New in v2.0.1

- **Single-select — re-clicking the selected option no longer clears the field** — In a `multiple="false"` picker, clicking or pressing Enter on the option that's already selected used to toggle it off and empty the control. Because a single-select row shows no checkbox, there was no cue you were un-picking, so a confirming click read as an accidental wipe. It's now a no-op that simply closes the dropdown, keeping the value selected; clearing stays the dedicated ✕ button's job (`show-clear`). Multi-select toggle-off and single-select replacement are untouched.
- **Checkbox tick now sizes from the shared `--base-icon-check-size` token** — The selected-row checkmark was masked at `contain` (≈100% of the box), which only looked right when the glyph carried its own viewBox padding; a theme swapping `--base-icon-check` for an edge-to-edge glyph (e.g. a star) rendered it oversized, and it didn't match pure-admin's `.pa-checkbox`. It now reads `var(--base-icon-check-size, 68%)` — the exact knob pure-admin uses — so the mark renders identically in both and a theme can rescale it once for every component. The indeterminate dash inherits the same mask box. The default Lucide check shrinks slightly (≈100% → 68%) to match; that's intended.
- **Build-time variable-manifest validator** — A new `scripts/check-variable-manifest.mjs` step (wired into `npm run build` as `check:vars`) diffs the `--ms-*` declared and `--base-*` consumed across `src/css/**` against `component-variables.manifest.json` and fails the build on dead or missing entries. This closes the silent-drift gap behind the generated IDE autocomplete and theme-designer surfaces, which are all derived from that manifest.
- **Manifest drift cleanup** — Removed 24 inert entries the manifest still advertised (the commented-out `--ms-input-size-*` size-preset surface and five positioning vars dropped in the rc11 field-shell rework) and added the missing `--base-icon-plus` / `--base-icon-add` glyphs, so autocomplete no longer offers non-functional knobs and now covers the "add new" prompt icons.

## What's New in v2.0.0

- **"Add new" creation mode — the picker doubles as a creation tool.** Turn on `allow-add-new`
  and a search with no matches shows a clickable "Add new …" prompt (label via `add-new-text` /
  `getAddNewTextCallback`). Choosing it (click, Enter, or arrow-to-focus) fires a new bubbling
  `add` event; `addNewCallback` creates the option and is **async and cancelable** (return
  `null`/`undefined` to abort after a confirm dialog or server round-trip) and may return a
  **rich option** that renders like any other. While it runs the prompt shows a spinner +
  `add-new-pending-text`. Creation also works with no callback — handle it entirely off the `add`
  event. See `examples-events-callbacks.html` §EV4b/EV4c.

- **Scroll-to imperative API — jump to any option or group.** New `scrollToIndex()` /
  `scrollToValue()` / `scrollToGroup()` on the element and picker bring a row into view — pair with
  `open()` for an "open + jump" gesture. Mode-aware (virtual scroll, tree, mobile fullscreen sheet),
  they align to the top by default (`{ block: 'center' }` to center) and return `false` when the
  target isn't in the current filtered list. A companion public `clearSearch()` reveals a
  filtered-out option so you can then scroll to it, plus a `searchText` getter and a `search(term)`
  method to read and programmatically drive the query. See §BU06b, §VS03, §TR09b.

- **Checkbox check/dash + filter funnel now flow from the shared `--base-icon-*` contract.** The
  checkmark and indeterminate dash are now `currentColor` mask glyphs (not CSS-border shapes) reading
  `--base-icon-check` / `--base-icon-indeterminate`, and the search-mode funnel reads
  `--base-icon-filter` — so one base override reskins them across every Keenmate component. Inline
  Lucide fallbacks keep the default look unchanged.

- **`--ms-rem` now bridges to the shared `--base-rem` knob.** The global sizing unit resolves
  `var(--base-rem, 10px)`, so a theme that sets `--base-rem` rescales the whole component from one
  variable (the `10px` fallback and per-instance overrides still work with no base layer loaded).

- **Fixed: the count-chip clear ✕ and popover close ✕ vanished on hover.** Both derived their hover
  background *and* glyph colour from the same accent, so the ✕ melted into its own hover state
  (fully invisible on near-white accents like Minimal dark). They now fill with a solid accent
  background and flip the glyph to the on-accent colour, matching the badge remove button.

## Demos & docs

- 🚀 [Live demo](https://web-multiselect.keenmate.dev)
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
