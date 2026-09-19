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

## What's New in v2.0.0-rc12

- **`overlay-group` — one overlay open at a time, across components.** The dropdown now joins a cross-component single-active-overlay group (core `registerOverlay`): opening it dismisses every other participating overlay — other multiselects, datepickers, or any external popover that fires the `km-overlay-activated` document event — and it closes itself when another overlay in its group opens. The new `overlay-group` attribute/property scopes this to a named group (same group = coordinate, different groups = independent, unset = the default ungrouped pool). Outside-click dismissal is unchanged and always on; this only governs the open-broadcast. Fixes the old behavior where two multiselects could sit open simultaneously.

- **Icon glyphs now flow from the shared `--base-icon-*` contract.** The four `--ms-icon-*` glyphs with a shared counterpart (chevron, field-clear, badge-remove, search) are wired through the `@keenmate/base-css-variables` layer, so a single `--base-icon-*` override re-skins that affordance across every Keenmate component at once — matching how the ~95 other `--ms-*` tokens already fall back to `--base-*`. The toggle/pager chevron now flows from `--base-icon-chevron` (a Lucide angle that keeps the previous optical size); field-clear, badge-remove, and search follow their base equivalents. Each keeps its inline Lucide SVG as the standalone fallback, so default appearance is unchanged when no base layer is loaded.

- **`--ms-toggle-rotate-closed` / `--ms-toggle-rotate-open` — themeable chevron rotation.** The toggle rotates the *directional* base chevron into place (defaults `90deg` closed → down, `-90deg` open → up). A theme that supplies a **pre-oriented** glyph (one that already points down) can now opt out: set both to `0deg` for a static icon, or `0deg` / `180deg` for a down-glyph that flips up on open — without touching the base contract. The new Material Design card in `examples-theming.html` demonstrates the pairing.

- **`--ms-fullscreen-nav-btn-icon` — the pager glyph is now independent.** The fullscreen match-navigator's prev/next buttons previously masked the shared `--ms-icon-chevron`, so a theme that repointed the base chevron at a pre-oriented toggle glyph would leak it into the pager (which rotates its source ±90° and expects a right-pointing chevron). The pager now reads its own token, defaulting to `--ms-icon-chevron` — nothing changes by default, but a theme can diverge the pager glyph on its own.

- **More tokens flow from `--base-*` for dark-mode fidelity.** A follow-up audit wired five more `--ms-*` tokens that hardcoded a value where a dedicated `--base-*` counterpart exists: disabled-input background and dropdown box-shadow are now `light-dark()`-aware (they no longer stay light on dark themes), the field-clear color/hover knobs gain dedicated base hooks, and the snappy easing matches the base standard curve. All keep their prior value as the standalone fallback; transition *durations* and the z-index stack are deliberately left local.

- **Dropdown / selected-items popover no longer render 2px wider than the field.** Both panels size from `--ms-input-current-width` (the field wrapper's border-box `offsetWidth`) but were themselves `content-box`, so each added its own 1px border on top and overhung the input it anchors to. Both now use `box-sizing: border-box`, so their outer width matches the field exactly.

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
