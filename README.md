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

## What's New in v3.0.0-rc04

Upgrade guide: the [3.0.0-rc04 release notes](release-notes/3.0.0-rc04.md); full list: the
[CHANGELOG 3.0.0-rc04 section](CHANGELOG.md).

- **Labels — flat `<elementType>.<name>` keys, page-wide dictionary, `translateCallback`** — Every UI string now resolves through core `/locale`, so the `labels` keys take core's flat shape: `noResults` is `messages.noResults`, `searchPlaceholder` is `placeholders.search`, `selectAll` is `buttons.selectAll`. A string that fed both an `aria-label` and a tooltip is split into an `ariaLabels.*` / `tooltips.*` pair, and an unset twin follows a customized one, so translating one translates both. A dynamic text passes its context, so templates read `{ctx.*}` — `'+{ctx.count} more'`, `'Add "{ctx.value}"'`, `'Picked {ctx.selectedCount} of {ctx.totalCount}'` for a placeholder — and `ctx.count` is the number the noun agrees with, ready for an i18n library's plurals. A whole page translates with `window.components.locale.labels = { 'web-multiselect.messages.noResults': '…' }` or a `translateCallback({ key, template, params, locale })` that gets the context raw as `params.ctx` — page-wide, or on one element through the new `translateCallback` property, asked first. The old keys and `{count}` / `{item}` / `{value}` templates have no aliases.
- **Selection — `max-selected-count`** — A new limit on the user's picks in multiple mode: at the limit the other options turn `aria-disabled` and can't be picked by click, keyboard, a group checkbox or "add new", Select All picks only up to the limit in display order, and reaching it is announced. The placeholder reads the picks left — `labels: { 'placeholders.search': 'Select up to {ctx.remaining} more' }` — and `ctx.count` is that number, so a `translateCallback` plural agrees with it. A value the app sets (`el.value`, `setSelected()`) is not truncated.
- **Forms — `required`, `min-selected-count`, validity** — `required` makes an empty selection invalid (`validity.valueMissing`) so the form won't submit and the browser's bubble points at the input; `min-selected-count="3"` flags 1–2 picks as `rangeUnderflow`, and a value set above `max-selected-count` is `rangeOverflow`, each its own flag so an app can tell "empty" from "too few". Messages are labels (`errors.required`, `errors.minSelected`, `errors.maxSelected`) and `errors.minSelected` can say how many are missing with `{ctx.missing}`. Readonly and disabled controls are never invalid.
- **Locale — `locale` input and formatted counts** — A new `locale` attribute (`cs-CZ`, BCP-47) sets the instance locale; unset, it follows `window.components.locale`, then the browser. Counts in labels and the `[N]` count chip are formatted for it (`1 234` in Czech, `1,234` in en-US), while `translateCallback` and `getCountLabelCallback` still get the raw numbers. Changing it, or assigning `window.components.locale`, re-renders the labels with the selection kept.
- **Icons — core's icon order, `renderIconCallback`** — Option `icon`, `getIconCallback` and action-button `icon` strings render through core `renderIcon`: markup is inserted raw, a built-in name (`check`, `close`, `settings`, …) draws the masked `--base-icon-*` glyph, the element's new `renderIconCallback(name, ctx)` and then the page-wide one may map anything else, and remaining ASCII class names become `<i class="ms__icon fa-solid fa-flag">`. A one-word name that is not a built-in (`star`) is therefore an icon-font class now. Changing either hook after the picker rendered repaints the icons in place, keeping the selection, search and an open dropdown.
- **Accessibility — combobox / listbox** — The search field is a `role="combobox"` over a `role="listbox"` of `role="option"` rows with `aria-selected` / `aria-disabled`, and `aria-activedescendant` follows the keyboard highlight while focus stays in the field (core `/a11y`). The row checkboxes are decorative now. Typing is IME-safe: composing doesn't search, and the Enter that confirms a candidate doesn't pick. The group count chip is finally spoken as `10 selected` instead of `[10]`.
- **API — `MultiSelectEngine` removed, render callbacks on core's contract** — `MultiSelectEngine` is no longer exported; it drew the same UI without the element, so use `<web-multiselect>` with `el.controller` and `el.setAttributes()`. The render callbacks (`renderOptionContentCallback`, `renderGroupLabelContentCallback`, `renderBadgeContentCallback`, `renderSelectedItemContentCallback`, `renderBadgeCallback`) follow core's one result contract: `null` / `undefined` now draws the built-in content instead of an empty slot, and `false` leaves it empty.
- **Forms and stacking — no hidden-input `id`, the sheet is the modal tier** — The single hidden form input no longer gets `id = name`, which put duplicate ids in the page and made `<label for>` / `getElementById` find it; select it by name. The fullscreen phone sheet stacks at `--base-z-modal` (7000) like every Keenmate dialog and drawer, so page toasts and tooltips stay visible over it.
- **Motion — tooltips fade out too** — Badge and option tooltips take their motion from core `createTooltip`: a short fade and slide toward the anchor on show and on hide, timed by `--base-duration-fast` and instant under `motion="none"` or OS reduced motion. `showMessage()` also fades out instead of vanishing, and is announced through core `announce()`.

## What's New in v3.0.0-rc03

Upgrade guide: the [3.0.0-rc03 release notes](release-notes/3.0.0-rc03.md); full list: the
[CHANGELOG 3.0.0-rc03 section](CHANGELOG.md).

- **Phone sheets — core's sheet chrome, `--ms-sheet-*` variables** — The fullscreen dropdown and the fullscreen selected-items popover now draw their top bar, title and ✕ with core's shared sheet chrome, so they look like every other Keenmate phone sheet (a 44px close chip, the `--base-icon-close` glyph). The bar's variables are renamed from `--ms-fullscreen-header-*` / `-title-*` / `-close-*` to `--ms-sheet-*`, with the same 19 suffixes as core's page-wide `--km-sheet-*`. They are unset by default, and the `--ms-fullscreen-header-padding` shorthand is gone. Back still closes the sheet, now through core `claimBackEntry()`, and the page keeps its scroll position.
- **Dropdown — closes on scroll, says why it closed** — The dropdown runs on core `createPopover()` and, like a native select, now closes when the page or a scroller around it scrolls (`close-on-scroll`, default `true`; a scroll inside the list never closes it). The `close` event carries `detail.reason` (`escape`, `outside-click`, `scroll`, `select`, `reference-removed`, …). The selected-items popover moved to core's overlay tree too, so opening another overlay closes it.
- **Inputs — length inputs are CSS lengths** — `dropdown-min-width`, `dropdown-max-width`, `max-height`, `dropdown-width` and `selected-popover-width` are parsed by core `toCssLength()`. A bare number means px, an invalid length or `null` is refused with an `input-rejected` event, and removing the attribute resets it.
- **Messages — `variant` and `danger`** — `showMessage()` takes `{ variant }` instead of `{ type }`, and `'error'` is now `'danger'`, matching the rest of Keenmate. The class is `.ms__message--danger` and the variables are `--ms-message-danger-bg` / `-color`. There are no aliases.
- **Scrolling — `beforeScrollCallback`** — Every scroll the dropdown does on its own (keyboard moves, navigate-mode search, revealing the selection on open, `scrollToIndex` / `scrollToValue` / `scrollToGroup`) now goes through `beforeScrollCallback(ctx)`. Return `false` to skip it, or `{ block, behavior }` to change it. `ctx.source` says what triggered it. Virtual lists also honour `--ms-options-padding` and `scroll-padding` on a jump, so the last row comes fully into view.
- **Theming — page-wide custom CSS, tooltip widths, dropdown gap** — `window.components['web-multiselect'].customStyles` styles every instance (an instance's own `customStyles` still wins), and an `@import` in it now registers icon fonts. New `--ms-tooltip-width` / `--ms-tooltip-min-width` (with option-tooltip twins) complete the tooltip width model. The field-to-panel gap is the page token `--base-dropdown-offset`.
- **Fixes — controller under disabled / readonly, WebKit Backspace** — `el.controller.selectAll()`, `selectValue()`, `clearSelection()` and the other selection methods used to be silently ignored on a disabled or readonly control; calls from code now work, and only user gestures are blocked. In Safari, Backspace in a read-only input no longer navigates the page Back.

Earlier releases: [3.0.0-rc02](release-notes/3.0.0-rc02.md), [3.0.0-rc01](release-notes/3.0.0-rc01.md), [2.6.0-rc03](release-notes/2.6.0-rc03.md), [2.6.0-rc02](release-notes/2.6.0-rc02.md), [CHANGELOG](CHANGELOG.md).

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

<web-multiselect labels='{"placeholders.select": "Pick a country"}'>
  <option value="cz">Czech Republic</option>
  <option value="sk">Slovakia</option>
  <option value="at">Austria</option>
</web-multiselect>
```

**Programmatic — dynamic data + events:**

```html
<web-multiselect id="picker" labels='{"placeholders.search": "Search…"}'></web-multiselect>

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
// page-wide (every Keenmate component) and per tag — may be set before the script loads
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
| `labels['messages.noData']`, `labels['messages.noResults']`, `labels['messages.searching']` | Dropdown empty / searching text (innerHTML) |
| `labels['labels.addNew']`, `labels['messages.addNewPending']` | "Add new" prompt (innerHTML; the typed `{ctx.value}` is escaped) |
| `labels['labels.selectedCount']`, `labels['labels.moreCount']` | Counter badge text (innerHTML) |
| `renderOptionContentCallback`, `renderGroupLabelContentCallback`, `renderBadgeContentCallback`, `renderBadgeCallback`, `renderSelectedItemContentCallback` (string return) | Option rows, group headers, badges, selected panels (innerHTML) |
| Display value (`displayValueMember` / `getDisplayValueCallback`) | Option title and badge text (innerHTML; search highlighting marks text runs only) |
| `getBadgeDisplayCallback` | Badge text (innerHTML) |
| Full title (`fullTitleMember` / `getFullTitleCallback`) | Badge text when `isBadgeFullTitleShown` (innerHTML) |
| Subtitle (`subtitleMember` / `getSubtitleCallback`) | Option subtitle (innerHTML) |
| Icon (`iconMember` / `getIconCallback`), action-button `icon` | Option / action-button icon when it starts with `<` (innerHTML); a built-in name (`check`) is a `--base-icon-check` mask, then `renderIconCallback` / the page-wide hook (their markup is innerHTML), class names (`fa-solid fa-flag`) an icon-font `<i>`, anything else text |

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
| Logic | `src/multiselect.ts` | `MultiSelectEngine<T>` — internal engine (search, selection, keyboard, rendering); not exported — the element is the API |
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
