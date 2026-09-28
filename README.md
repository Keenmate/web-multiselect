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

## What's New in v2.2.0-rc02

- **`custom-styles` attribute — style shadow-DOM internals with zero JavaScript** — The existing `customStylesCallback` was the only way to inject custom CSS into the component's shadow root, which locked out consumers who can't reach into script: static HTML pages, server-rendered markup, no-build sites. The new `custom-styles` attribute takes raw CSS as a string (`<web-multiselect custom-styles=".ms__badge { font-weight: bold; }">`) and injects it verbatim — selectors and all — into the same replaceable style slot at the top of the shadow root that the callback uses, so you can restyle badges, options, and your own custom-rendered content declaratively. It's reactive (changing or removing the attribute re-applies or clears the slot), mirrored by a `customStyles` property, and flows through the same dev-mode `--ms-*` lint. When both are set, `customStylesCallback` still wins — the attribute is the static fallback. Demonstrated no-JS on the Custom Rendering page (CR09) and the Basic Usage declarative card.

- **Single-select no longer holds a stale multi-selection when seeded with several values** — `parseInitialSelection()` used to add every seeded value to the selection unconditionally, so a `multiple="false"` picker could hold — and highlight — multiple rows at once. It surfaced both from a declarative `initial-values="a,b,c"` on a single-select and, more visibly, from flipping `multiple` from `true` to `false` at runtime while items were selected: the reinit reseeds the live selection into the fresh single-select and left the extra rows highlighted. The picker now trims the seed to the first value when it isn't in multiple mode, so exactly one row stays selected.

- **Async-search dropdown no longer runs off the bottom of the viewport** — An async `searchCallback` that seeds no options anchors its panel while it's still empty or showing the loader — short enough to fit below the input, so with the default `lock-placement` it froze its placement to `bottom`. When results arrived the panel grew to full height but stayed pinned below the input, overflowing the bottom edge instead of flipping up into the free space, because `renderDropdown()` rewrote the list without re-anchoring. `performAsyncSearch()` now calls a new `repositionDropdown()` after results render, tearing down and recreating the Floating-UI anchor so the flip-on-first-compute re-evaluates against the panel's real height, then re-freezes. Scoped to the async path only — locally filtered dropdowns open already populated and are unaffected.

## What's New in v2.2.0-rc01

- **Tree cascade is now the default — check a branch, check its subtree** — In a multi-select tree, `checkbox-mode` now defaults to `cascade` (previously `independent`), so ticking a branch selects its whole subtree and branches render a tristate (checked / indeterminate / unchecked) box — what most tree-select UIs do. The emitted selection follows `cascade-select-policy` (default `rolled-up`: a fully-checked subtree collapses to its root value). This is a behavior change for existing tree consumers — set `checkbox-mode="independent"` to keep the old per-node toggling. Flat and single-select lists are unaffected, since there's no subtree to cascade into.
- **Per-group select-all in flat grouped lists — `group-select-mode="cascade"`** — A new attribute puts a tristate checkbox on each group header in a flat, multi-select, grouped list; clicking it checks or unchecks all of that group's currently-visible members. The group name itself is never a selected value — `getValue()`, badges, and form output carry member values only — a partially-selected group reads indeterminate, and a header toggle fires a single `change`. Disabled members are excluded from the select-all. Default `none` leaves headers inert, as before.
- **Per-group selected counts + one shared count formatter** — Every group header now shows a count of that group's selected members, rendered as the same small chip as the in-input `[N]` counter (not a new badge style). A new `getCountLabelCallback((selected, total) => string)` formats both the in-input counter and the group chip together so they always read the same way — default `[3]`, or return `` `${s}/${t}` `` for an "x / y of total" style, where `total` is the whole option list for the counter and the group's member count for a header.
- **Order the selected items — `selected-order`** — Control the sequence chosen items appear in across badges, partial "+N more", and the selected-items popover: `as-selected` (default), `label-asc` / `label-desc`, `member` (by a `selected-order-member` property or `getSelectedOrderCallback`), or `custom` (a comparator). It's display-only — `getValue()`, form output, and `getSelected()` keep insertion order — and because the ordering runs in one shared place, the partial "+N more" split and its remove button always act on the items sorted *after* the visible slice.
- **Every render callback now receives a context** — `renderGroupLabelContentCallback` gains a second `GroupLabelRenderContext` argument (the group's members and selection, e.g. `selectedCount`), and `renderSelectedItemContentCallback` / `renderSelectedContentCallback` now also receive a context carrying the presentation (`isFullscreen` / `isModal`) — matching the option and badge callbacks. Everything is additive, so existing one-argument callbacks keep working; branch on `isFullscreen` to render leaner content in the phone overlay.
- **Fixes — selection preservation, hidden search field, "+N more" ✕** — Changing a cosmetic attribute (`badges-display-mode` / `badges-position`) no longer wipes the current selection (it's applied in place, and genuine rebuilds now preserve the runtime selection); `search-input-mode="hidden"` no longer collapses the input row, so the toggle stays at the trailing edge; and the "+N more" badge's ✕ now removes exactly the hidden items instead of silently opening the popover.

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
