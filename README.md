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

## What's New in v2.0.0-rc11

- **Imperative open/close API — drive the dropdown from code.** The `<web-multiselect>` element and the underlying `WebMultiSelect` now expose `open()`, `close()`, `toggle()`, and a read/write `isOpen` property, mirroring the calendar API in web-daterangepicker. Each element method flushes pending property writes first (the same contract as `getSelected()`/`setSelected()`), so `el.options = data; el.open()` works with no `await` in between. Calling `open()` from your own button's click handler now opens *and stays open* — previously the same click bubbled to the outside-click listener and re-closed it. See the new `examples-data-api.html` §API07 demo.

- **Inline clear (✕) button — wipe the whole selection from inside the input.** A new opt-in `show-clear` attribute renders a small ✕ at the input's trailing edge that appears only while something is selected. Clicking it clears the selection and any search text, fires a single `change`, refocuses the input, and closes the selected-items popover if it was open — without popping the dropdown open. It's drawn as a themeable CSS mask icon (`--ms-input-clear-*`, whose corner radius follows `--ms-border-radius`). See the new `examples-basic.html` §BU01b demo.

- **Input decorations rebuilt as a flex "field shell" — no more overlap or text bleed.** `.ms__input-wrapper` is now the bordered field (border, background, radius, focus ring via `:focus-within`), with the `<input>`, the `[N]` counter, the ✕ clear, and the chevron as real flex children in a spaced row. Previously each was absolutely pinned by a hard-coded inset, so `show-counter` + `show-clear` collided and long text could slide under the icons. Now they space themselves via `--ms-input-gap`, long text clips cleanly inside the input's own box, and RTL mirroring falls out of the flex direction for free. Several obsolete positioning vars were removed (`--ms-input-padding`, `--ms-input-padding-right`, `--ms-toggle-right`, `--ms-counter-offset`, `--ms-input-clear-inset`, `--ms-input-clear-gutter`, `--ms-transform-center-y`).

- **Selected-items popover now lines up with the field.** `--ms-selected-popover-width` used to default to a fixed 32rem independent of the control, which looked detached under a wide field; it now defaults to `var(--ms-input-current-width)`, so the popover and the dropdown both track the field width and align under it. Set `selected-popover-width` (or the CSS var) to a fixed length to restore the old constant-width behavior.

- **Toggle chevron is now a crisp icon, not a text character.** The dropdown indicator renders the shared `--ms-icon-chevron` glyph through a CSS mask — consistent with the ✕, count-clear, and badge-remove icons — instead of the Unicode `▼`, so it no longer depends on font rendering and themes uniformly via `--ms-toggle-icon-color` / `--ms-toggle-icon-size`. It still points down when closed and rotates up when open.

## What's New in v2.0.0-rc10

- **`collapse-badges-below` — container-responsive badge collapse** — A picker in a narrow column could overflow with pills even on a wide monitor, because badge behavior keyed off the *window*, not the control. This new opt-in attribute/property (off by default) makes the control watch its **own border box** via the core `resized` hook (a shared page-wide `ResizeObserver`) and collapse `badges-display-mode` to `count` ("N selected") while the box is narrower than the given pixel width, restoring the configured mode when it widens back. The override is applied to the live picker only — never written to your config — so custom modes (`compact`, `partial`) come back exactly, it survives a structural rebuild, and the hook is throttled so a drag-resize reflows a bounded number of times. It's a separate axis from `mobile-presentation` and composes with it. New demo on `examples-responsive.html`.

- **`renderBadgeCallback` — own the whole badge, not just its content** — `renderBadgeContentCallback` only fills the built-in pill, so a selected item couldn't become, say, a full card. The new property-only callback returns the *entire* badge markup; the component wraps it in a `.ms__badge.ms__badge--custom` element carrying `data-value` (the modifier drops the pill's fixed height / overflow / radius so a card lays out freely) and delegates removal to any inner element with `data-action="remove"` (or the built-in `.ms__badge-remove`) — value resolved from the wrapper, so no event wiring. It falls back to the default pill when the callback returns null/empty, and `getBadgeClassCallback` classes still land on the wrapper. New Custom Rendering demo: an icon-pack picker where each selection is a card with its own Remove button.

- **`enable-selected-popover` — opt out of the selected-items popover** — When you render your own selection UI (suppress badges with `badges-display-mode="none"`, keep only the in-field `[N]` counter, and drive a panel from the `change` event), the built-in popover that opened on clicking the counter or badge was pointless. This new boolean (default `true`, so nothing changes by default) gates `showPopover()` at the source — every trigger (badge click, counter click, "+X more", keyboard) becomes a no-op — and adds a `ms--no-selected-popover` host class that drops the pointer cursor so those affordances no longer advertise as openable. New Custom Rendering demo: a playlist builder that owns its selection panel end to end.

- **Device-detection helpers re-exported from the package entry** — Per-device configuration used to mean pulling in the core separately. `observeEnvironment`, `classifyDevice`, `getEnvironment`, `observeViewport`, `configureBreakpoints`, and `TABLET_MIN_SHORT_SIDE` (plus the `EnvironmentSnapshot` / `DeviceClass` types) are now re-exported from `@keenmate/web-multiselect` — the same device signal the component reacts to internally — so you get it from one import and one dependency. The pattern is plain: react to the event and assign a different `actionButtons` set on mobile vs. desktop. Demonstrated in `examples-action-buttons.html` §10, which previously crammed 12 buttons into one unreadable row on phones.

- **Fullscreen overlay warns when an ancestor mis-anchors it** — The phone overlay is a `position: fixed` full-viewport sheet, so a `transform` / `perspective` / `filter` / `backdrop-filter` / `will-change` on any ancestor of the host anchors it to that ancestor's box instead of the viewport — and it silently stops covering the screen. The floating dropdown already surfaced this via drift detection; the fullscreen path had no equivalent. It now checks core's containing-block heuristic when the sheet opens and, if the true offset parent is an element rather than the viewport, emits a once-per-instance `console.warn` naming the culprit and the fix. Note the asymmetry: an ancestor `transform` is harmless for the floating dropdown but breaks the sheet; `contain` / `container-type` don't break the sheet at all. Documented on the Positioning Edge Cases page (new PO05 card).

- **Dropdown corners — a focused first/last row no longer pokes a square corner past the rounded panel** — The panel clips with `overflow: hidden` + `border-radius`, but a row's focus `outline` and background trace the row's own box and follow its own radius, not an ancestor's clip, so the top/bottom rows' square corners bled through the rounded panel corner. The fix rounds the inner scroll wrapper to a new themeable `--ms-dropdown-inner-border-radius` (panel radius − border width, clamped at 0) and rounds the actual top/bottom rows on every render — in DOM order (so a grouped list rounds the top group label, not the first option), with logical corners so it mirrors in RTL, keeping the scrollbar-side corners square, and staying correct under virtual scrolling.

- **Example pages — coded section headings, a Data & API split, and filename alignment** — Every example section now carries a short code in its heading (page-prefix + ordinal, e.g. `DA01`, `API03`), mirroring the showcase index, with the decorative emoji removed. The old `examples-classic.html` kitchen sink was split: genuine data/API content stays in the renamed `examples-data-api.html` (DA01–05 + API01–06), and its basic/cross-cutting demos moved to a new `examples-basic.html` (BU01–08). Three more pages were renamed to match their titles (`performance` → `virtual-scrolling`, `search-index` → `external-search`, `templating` → `custom-rendering`), and `index.html` and the docs links were repointed.

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
