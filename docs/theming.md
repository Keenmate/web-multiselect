# Theming

`@keenmate/web-multiselect` is styled entirely through CSS custom properties. The component uses Shadow DOM for encapsulation, but every visible color, size, and effect is exposed as a `--ms-*` variable that you can override from the light DOM.

The `--ms-*` variables default to the shared `--base-*` tokens from [`@keenmate/base-css-variables`](https://www.npmjs.com/package/@keenmate/base-css-variables) 2.0 when that layer is on the page, and fall back to built-in OS-aware defaults when it isn't. For interactive exploration of `--base-*` values, you can use the [Keenmate Theme Designer](https://theme-designer.keenmate.dev).

## Sizing

The component uses `--ms-rem` as a base unit for proportional scaling. Default is `10px`, meaning `calc(1.4 * var(--ms-rem))` equals `14px`.

**Global scaling:**

```html
<!-- Compact (80%) -->
<web-multiselect style="--ms-rem: 8px;"></web-multiselect>

<!-- Default (100%) -->
<web-multiselect></web-multiselect>

<!-- Large (120%) -->
<web-multiselect style="--ms-rem: 12px;"></web-multiselect>

<!-- Pure Admin integration (inherits from html { font-size: 10px }) -->
<web-multiselect style="--ms-rem: 1rem;"></web-multiselect>
```

**Via CSS class:**

```css
web-multiselect.compact { --ms-rem: 8px; }
web-multiselect.large   { --ms-rem: 12px; }
```

> **Shadow DOM note:** CSS variables must be set on the `<web-multiselect>` element itself, not on wrapper divs.

**Fine-grained control:**

Override individual sizing variables for specific adjustments:

- `--ms-input-height` — input field height (default: 35px)
- `--ms-input-font-size` — input font size
- `--ms-input-padding-h` — inline padding of the field
- `--ms-badge-height` — badge height
- `--ms-option-min-height` — minimum row height for regular (non-virtual) options (default: `auto`, content-driven)
- `virtual-scroll-item-height` attribute — fixed row height in px for virtual-scroll rows (default: `50`). The component writes it to `--ms-option-height` as an inline style, so set the attribute rather than the variable.

**Input height:**

`--ms-input-height` reads the shared `--base-input-size-md-height` from `@keenmate/base-css-variables`: `calc(var(--base-input-size-md-height, 3.5) * var(--ms-rem))`, so 35px by default. Setting the base variable keeps input heights consistent across all Keenmate components.

```css
/* Set consistent input heights across all components */
:root {
  --base-input-size-md-height: 4.0;  /* All components: 40px at 10px rem */
}
```

## Base CSS variables integration

The component reads the token names of **`@keenmate/base-css-variables` 2.0** (`--base-primary-color`, `--base-on-primary-text-color`, `--base-input-text-color`, `--base-selected-*`, `--base-focused-*`, …). Load that layer, or define the `--base-*` tokens yourself, and every Keenmate component on the page follows the same theme.

The **Keenmate Theme Designer** at [theme-designer.keenmate.dev](https://theme-designer.keenmate.dev) is an optional tool for exploring and generating `--base-*` values:

1. **Choose 3 base colors** — background, text, and accent.
2. **Preview changes live** — see your theme applied instantly.
3. **Fine-tune individual variables** — lock specific values while adjusting others.
4. **Export your theme** — copy CSS, JSON, or SCSS to your project.

### CSS variable layers

Keenmate components support a **two-layer theming architecture**:

**Standalone mode (simple)** — just override the component-specific variables you need:

```css
:root {
  --ms-accent-color: #your-brand-color;
  --ms-primary-bg: #your-hover-fill;
  --ms-text-color-1: #your-text-color;
}
```

**Cascading mode (multi-component)** — when using multiple Keenmate components, you can define a shared base layer:

```css
:root {
  /* Base layer - single source of truth */
  --base-primary-color: #3b82f6;
  --base-main-bg: #ffffff;
  --base-hover-bg: #f3f4f6;
  --base-text-color-1: #111827;

  /* Components reference base layer */
  --ms-accent-color: var(--base-primary-color);
  --drp-accent-color: var(--base-primary-color);
}
```

Change `--base-primary-color` once → all components update automatically.

**Shared item states** — an option's selected and keyboard-focused looks read the
shared `--base-selected-bg` / `--base-selected-bg-hover` / `--base-selected-text-color` /
`--base-selected-outline` and `--base-focused-text-color` / `--base-focused-outline`
tokens (borders are outline shorthands drawn inset), so a selected / focused option matches a
selected / focused row in the Keenmate tree components. Defaults: selected = 10% accent tint,
no ring; focused = hover fill + `1px solid` accent inset ring.

**Exception — the focused background.** The contract marks focus with the ring alone
(`--base-focused-bg: transparent`), which suits a tree, where focus is a cursor. In a
combobox the focused option is what Enter / Tab will pick, and with a single result its 1px
ring lands on the panel border and disappears. So `--ms-option-bg-focused` uses the hover fill
(`--ms-option-bg-hover`) and does not read `--base-focused-bg`; set `--ms-option-bg-focused`
to change it.

### Unified variable naming

All Keenmate components follow a consistent naming convention for **Tier 1 variables** (core theming):

| Purpose | web-multiselect | web-daterangepicker |
|---------|-----------------|---------------------|
| Brand color | `--ms-accent-color` | `--drp-accent-color` |
| Hover fill | `--ms-primary-bg` | `--drp-primary-bg` |
| Text color | `--ms-text-color-1` | `--drp-text-primary` |
| Text on accent | `--ms-text-color-on-accent` | `--drp-text-on-accent` |
| Border color | `--ms-border-color` | `--drp-border-color` |

Learn the pattern once, apply it across all components.

### Component variables manifest

This package exports a `component-variables.manifest.json` file that documents all supported CSS variables for tooling integration (e.g., Theme Designer, IDE autocomplete):

```javascript
import manifest from '@keenmate/web-multiselect/component-variables.manifest.json';
// manifest.baseVariables - --base-* tokens the component reads: { name: 'base-primary-color', required, usage }
// manifest.componentVariables - --ms-* variables: { name: 'ms-rem', category, usage }
// (names are stored without the leading "--")
```

## CSS variables (no build system required)

You can customize the component using CSS variables even with just a `<script>` tag:

```html
<style>
  /* Override tooltip appearance */
  web-multiselect {
    --ms-tooltip-bg: #1f2937;
    --ms-tooltip-text-color: #f9fafb;
    --ms-tooltip-padding: 0.625rem 0.875rem;
    --ms-tooltip-border-radius: 0.5rem;
    --ms-tooltip-font-size: 0.8125rem;
    --ms-tooltip-max-width: 24rem;
    --ms-tooltip-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    --ms-tooltip-z-index: 10000;
  }

  /* Override "+X more" badge colors (the counter badge variant) */
  web-multiselect {
    --ms-badge-counter-text-bg: #dbeafe;
    --ms-badge-counter-text-bg-hover: #bfdbfe;
  }

  /* Size the component */
  web-multiselect {
    width: 100%;
    max-width: 400px;
  }
</style>
```

## Dark mode — supported signals

The multiselect honors **five different signals** for switching to dark mode. Pick whichever fits your app; you don't need to wire them all up. Signals #3 and #4 are detected by `@keenmate/web-components-core` once per page and shared by every Keenmate component (no `:host-context()`, so they work in Firefox and Safari too).

| # | Signal | Set by | Example |
|---|--------|--------|---------|
| 1 | OS preference + page `color-scheme` | App author | `html { color-scheme: light dark }` — multiselect picks the OS branch automatically. |
| 2 | Page-level `color-scheme: dark` | App author | `body { color-scheme: dark }` — flips every multiselect on the page to dark. |
| 3 | Framework data-attribute on `<html>` / `<body>` | Bootstrap, Pure Admin, custom apps | `<html data-bs-theme="dark">`, `<body data-theme="dark">` |
| 4 | Framework class on `<html>` / `<body>` | Tailwind, hand-rolled toggles | `<html class="dark">` |
| 5 | Per-instance attribute on host | App author, for one widget | `<web-multiselect data-theme="dark">` |

**Precedence** (highest wins): per-instance (#5) → `setThemeMode()` → `theme-source` element → page signal (#3, #4) → page color-scheme (#1, #2).

### A themed section inside the page

A signal on a wrapper element (not `<html>` / `<body>`) is only read when the picker is pointed at it with `theme-source`:

```html
<div class="panel" data-theme="dark">
  <web-multiselect theme-source="closest"></web-multiselect>   <!-- nearest ancestor with a signal -->
  <web-multiselect theme-source=".panel"></web-multiselect>    <!-- or a selector -->
</div>
```

Alternatively set `color-scheme: dark` on the wrapper — the picker inherits it (signal #2).

### Forcing every component at once

```js
import { setThemeMode } from '@keenmate/web-multiselect';
setThemeMode('dark');   // 'light' | 'dark' | 'auto' — applies to every Keenmate component on the page
```

### Forcing a single widget back to light

If your page is dark but you want one multiselect to render light:

```html
<!-- on a body { color-scheme: dark } page -->
<web-multiselect data-theme="light"></web-multiselect>
```

This works for any of signals #3–#5. The symmetric `data-theme="light"`, `data-bs-theme="light"`, `.light` selectors restore the light palette inside the affected scope.

## Available CSS variables

The component exposes **~380+ CSS custom properties** defined at the `:host` level, making them inspectable and overridable. Below are the **50+ most commonly customized variables** organized by category.

### Inspecting variables in DevTools

All CSS custom properties are defined at the `:host` level in the compiled CSS, making them visible in browser DevTools:

1. Open DevTools (F12) and select the `<web-multiselect>` element.
2. In the **Styles** panel, look for the `:host` selector.
3. You'll see all ~380+ variables with their default values.
4. Edit values live to preview changes instantly.

**CSS variables work with Shadow DOM** because they inherit through the shadow boundary. This means you can customize the component from outside:

```html
<style>
  /* These variables will penetrate into the Shadow DOM */
  web-multiselect {
    --ms-accent-color: #10b981;          /* Changes primary color */
    --ms-text-color-on-accent: #000;     /* …and the text drawn on it (black reads on emerald) */
    --ms-input-border-radius: 0.5rem;    /* Rounds input corners */
  }
</style>
```

For the complete list of all available CSS variables, see [`src/css/variables.css`](../src/css/variables.css) — all ~380+ CSS custom properties at `:host` level.

### Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-accent-color` | `var(--base-primary-color, #3b82f6)` | Accent (selection, focus, checked state). Standalone (no contract) its hover, tint, text and on-accent text are derived from it. With the contract loaded, override it together with `--ms-text-color-on-accent`: the text on accent fills (checkbox tick, counter, badge ×) follows `--base-on-primary-text-color`, which is picked for the *base* primary, not for your accent |
| `--ms-accent-color-hover` | `var(--base-primary-color-hover, <accent 15% toward black / white>)` | Accent on hover |
| `--ms-accent-text-color` | `var(--base-primary-text-color, <accent 45% toward black / 25% toward white>)` | The accent as text (badge text, add-new row, fullscreen info icon) |
| `--ms-accent-color-light` | `var(--base-primary-bg-subtle, <accent 10% / 20%>)` | Accent tint (badges, "+N more") |
| `--ms-main-bg` | `var(--base-main-bg, light-dark(#ffffff, #1e293b))` | Main surface; the standalone source of the surfaces, borders and text levels below |
| `--ms-shadow-color` | `var(--base-shadow-color, light-dark(rgba(0,0,0,.15), rgba(0,0,0,.4)))` | Shadow tint (hint, dropdown, tooltip, message) |
| `--ms-text-color-1` … `-4` | `var(--base-text-color-1 … -4, …)` | Text levels: body, secondary, tertiary, faint. Standalone: `-1` = `light-dark(#334155, #f1f5f9)`, `-3` / `-4` = `-1` mixed 55% / 40% into `--ms-main-bg` |
| `--ms-primary-bg` | `var(--base-hover-bg, …)` | Hover fill (options, action buttons, counter) |
| `--ms-border-width` | `var(--base-border-width, 1px)` | Stroke width of every border |
| `--ms-border-color` | `var(--base-border-color, <main bg shifted in lightness>)` | Divider color (panels, separators). Not the field border — that is `--ms-input-border-color` |

### Input component

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-input-bg` | `var(--base-input-bg, var(--ms-main-bg))` | Input background |
| `--ms-input-color` | `var(--base-input-text-color, var(--ms-text-color-1))` | Input text color |
| `--ms-input-border-color` | `var(--base-input-border-color, <text mixed 45% / 35% into the bg>)` | Control outline color (stronger than the divider); also action buttons and the count pill |
| `--ms-input-border` | `var(--base-input-border, var(--ms-border-width) solid var(--ms-input-border-color))` | Input border |
| `--ms-input-border-hover` | `var(--base-input-border-hover, … var(--ms-accent-color))` | Border on hover |
| `--ms-input-border-focus` | `var(--base-input-border-focus, … var(--ms-accent-color))` | Border when focused |
| `--ms-input-box-shadow-focus` | `var(--base-input-box-shadow-focus, 0 0 0 3px <accent 5%>)` | Focus halo |
| `--ms-input-padding-h` | `calc(1.2 * var(--ms-rem))` | Inline padding of the field |
| `--ms-input-height` | `calc(var(--base-input-size-md-height, 3.5) * var(--ms-rem))` | Field height |
| `--ms-input-font-size` | `calc(var(--base-font-size-sm, 1.4) * var(--ms-rem))` | Input font size |
| `--ms-input-border-radius` | `var(--ms-border-radius-md)` | Input border radius |
| `--ms-input-placeholder-color` | `var(--base-input-placeholder-color, var(--ms-text-color-3))` | Placeholder color (shown at `--ms-placeholder-opacity`, default 1) |
| `--ms-input-bg-disabled` | `var(--base-input-bg-disabled, var(--ms-disabled-bg))` | Disabled background |

### Dropdown & options

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-dropdown-bg` | `var(--base-dropdown-bg, var(--ms-main-bg))` | Dropdown background; the sticky actions bar, the hint and the selected-items popover use it too |
| `--ms-dropdown-border` | `var(--base-dropdown-border, var(--ms-border-width) solid var(--ms-dropdown-border-color))` | Dropdown border |
| `--ms-dropdown-box-shadow` | `var(--base-dropdown-box-shadow, …)` | Dropdown shadow (the selected-items popover uses it too) |
| `--ms-options-max-height` | `calc(32 * var(--ms-rem))` | Max height of the options list |
| `--ms-option-padding` | `calc(0.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem))` | Option padding |
| `--ms-option-bg-hover` | `var(--ms-primary-bg)` | Option background on hover |
| `--ms-option-color-hover` | `inherit` | Option text color on hover |
| `--ms-option-bg-selected` | `var(--base-selected-bg, <accent 10%>)` | Selected option background |
| `--ms-option-bg-selected-hover` | `var(--base-selected-bg-hover, var(--ms-option-bg-selected))` | Selected option background on hover |
| `--ms-option-color-selected` | `var(--base-selected-text-color, currentColor)` | Selected option text color |
| `--ms-option-outline-selected` | `var(--base-selected-outline, none)` | Selected option ring (outline shorthand, drawn inset) |
| `--ms-option-bg-selected-focused` | `var(--ms-option-bg-selected)` | Selected + focused background (focus ring drawn on top) |
| `--ms-option-bg-focused` | `var(--ms-option-bg-hover)` | Focused option background (keyboard) — the hover fill under the ring; deliberately not `--base-focused-bg` (see the exception above) |
| `--ms-option-color-focused` | `var(--base-focused-text-color, currentColor)` | Focused option text color |
| `--ms-option-outline-focused` | `var(--base-focused-outline, 1px solid <accent>)` | Focused option ring (outline shorthand, drawn inset) |
| `--ms-option-focus-outline-offset` | `calc(-1 * var(--base-outline-width, 1px))` | Inset offset for the focus/selected ring (keep = minus the ring width; follows `--base-outline-width`) |
| `--ms-option-bg-matched` | (accent 8%) | Matched option background (navigate mode) |
| `--ms-option-color-matched` | `inherit` | Matched option text color |

### Badges

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-badge-text-bg` | `var(--ms-accent-color-light)` | Badge background color |
| `--ms-badge-text-color` | `var(--ms-accent-text-color)` | Badge text color (the readable accent foreground) |
| `--ms-badges-gap` | `calc(0.8 * var(--ms-rem))` | Gap between badges |
| `--ms-badge-height` | `calc(2.7 * var(--ms-rem))` | Height of badges |
| `--ms-badge-font-size` | `calc(var(--base-font-size-xs, 1.2) * var(--ms-rem))` | Badge font size |
| `--ms-badge-font-weight` | `var(--base-font-weight-semibold, 600)` | Badge font weight |
| `--ms-badge-border-radius` | `var(--ms-border-radius-sm)` | Badge border radius |
| `--ms-badge-remove-bg` | `var(--ms-accent-color)` | Remove button background |
| `--ms-badge-remove-color` | `var(--ms-text-color-on-accent)` | Remove button (X) color — applied to the SVG via `currentColor` |
| `--ms-badge-remove-icon-size` | `calc(1.4 * var(--ms-rem))` | Size of the X glyph inside the remove button |
| `--ms-icon-remove` | (inline SVG `url(...)`) | The X mask SVG; override to swap the glyph shape (alpha-only — color comes from `--ms-badge-remove-color`) |
| `--ms-badge-counter-text-bg` | text-color-1 at 10% | Counter badge ("+X more") text background |
| `--ms-badge-counter-text-color` | `var(--ms-text-color-1)` | Counter badge text color |
| `--ms-badge-counter-remove-bg` | text-color-1 at 10% | Counter badge remove button background |
| `--ms-badge-counter-remove-color` | `var(--ms-text-color-3)` | Counter badge remove button color |
| `--ms-badge-counter-border` | `var(--ms-border-width) solid var(--ms-badge-counter-border-color)` | Counter badge border |
| `--ms-badge-text-border` | `none` | Badge text border (e.g., `1px solid #3b82f6`) |

### Checkboxes

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-checkbox-bg` | `var(--ms-input-bg)` | Checkbox background |
| `--ms-checkbox-border-color` | `var(--base-checkbox-border-color, var(--ms-input-border-color))` | Unchecked border color (a control outline) |
| `--ms-checkbox-border` | `<scaled width> solid var(--ms-checkbox-border-color)` | Checkbox border |
| `--ms-checkbox-border-radius` | `calc(0.3 * var(--ms-rem) * <scale>)` | Checkbox border radius |
| `--ms-checkbox-checked-bg` | `var(--ms-accent-color)` | Background when checked |
| `--ms-checkbox-checked-border` | `<scaled width> solid var(--ms-accent-color)` | Border when checked |
| `--ms-checkbox-checkmark-color` | `var(--ms-text-color-on-accent)` | Checkmark color |
| `--ms-checkbox-hover-border-color` | `var(--ms-accent-color)` | Border on hover |
| `--ms-checkbox-disabled-bg` | `var(--ms-input-bg-disabled)` | Disabled background |
| `--ms-checkbox-disabled-border` | `<scaled width> solid var(--ms-border-color)` | Disabled border |

### Scrollbar

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-scrollbar-width` | `8px` | Scrollbar width |
| `--ms-scrollbar-track-bg` | `transparent` | Track background |
| `--ms-scrollbar-thumb-bg` | `var(--ms-border-color)` | Thumb color |
| `--ms-scrollbar-thumb-bg-hover` | `var(--ms-text-color-3)` | Thumb hover color |
| `--ms-scrollbar-thumb-border-radius` | `4px` | Thumb border radius |

### Counter (in input)

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-counter-badge-bg` | `var(--ms-accent-color)` | Counter background |
| `--ms-counter-badge-color` | `var(--ms-text-color-on-accent)` | Counter text color |
| `--ms-counter-badge-bg-hover` | `var(--ms-accent-color-hover)` | Hover background color |
| `--ms-counter-font-size` | `calc(var(--base-font-size-xs, 1.2) * var(--ms-rem))` | Counter font size |

### Tooltips

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-tooltip-bg` | `var(--base-tooltip-bg, <text 85% into the bg / lifted bg>)` | Tooltip background (auto-adapts to OS dark mode) |
| `--ms-tooltip-text-color` | `var(--base-tooltip-text-color, …)` | Tooltip text color |
| `--ms-tooltip-padding` | `calc(0.8 * var(--ms-rem)) calc(1.2 * var(--ms-rem))` | Tooltip padding |
| `--ms-tooltip-border-radius` | `var(--ms-border-radius-lg)` | Tooltip border radius |
| `--ms-tooltip-font-size` | `calc(var(--base-font-size-sm, 1.4) * var(--ms-rem))` | Tooltip font size |
| `--ms-tooltip-max-width` | `calc(32 * var(--ms-rem))` | Tooltip maximum width |
| `--ms-tooltip-shadow` | `var(--base-shadow-md, 0 2px 8px var(--ms-shadow-color))` | Tooltip box shadow |
| `--ms-tooltip-z-index` | `var(--base-z-tooltip, 9000)` | Tooltip z-index (follows the shared `--base-z-*` scale) |

### Typography

Font sizes and weights read the shared scale directly — `--base-font-size-*` (× `--ms-rem`) and
`--base-font-weight-*` — so a theme sets them once for every component. Per-element knobs
(`--ms-input-font-size`, `--ms-option-title-font-size`, `--ms-badge-font-size`,
`--ms-badge-font-weight`, …) override one spot.

### Effects & transitions

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-transition-normal` | `var(--base-duration-normal, 0.15s)` | Duration of every transition |
| `--ms-easing-snappy` | `var(--base-ease-standard, cubic-bezier(0.4, 0, 0.2, 1))` | Easing of every transition |
| `--ms-scroll-behavior` | `var(--base-scroll-behavior, smooth)` | Programmatic jumps (`scrollToIndex` / `scrollToValue` / `scrollToGroup`) in the floating dropdown (read in JS as `scrollIntoView` `behavior`); `auto` under reduced motion. Keyboard scrolling is always instant |
| `--ms-tree-indent` | `calc(var(--base-tree-indent, 1.6) * var(--ms-rem))` | Tree per-level step (16px) |
| `--ms-disabled-opacity` | `var(--base-disabled-opacity, 0.65)` | Opacity for disabled state |
| `--ms-disabled-input-opacity` | `var(--ms-disabled-opacity)` | Opacity of a disabled input / checkbox |

**Motion off** is CSS only: `--ms-transition-normal: 0s` on the `<web-multiselect>` element
itself (not a parent — the shadow root's `:host` re-declares it), or `--base-duration-normal: 0s`
page-wide. Under `prefers-reduced-motion: reduce` the component sets `--ms-transition-normal: 0s`
itself; the shared loader (async search, add-new pending) keeps turning, slower (it shows a state).

## Cascade layers / override contract

Since v1.12.0, the component's internal CSS is organized into named `@layer`s:

```css
@layer variables, component, overrides;
```

This gives consumers a predictable escape hatch when they need to override a rule from outside the shadow DOM (e.g. via `web-multiselect ::part(...)` or descendant selectors that reach into composed light DOM):

| Where your rule lives | Wins against |
|---|---|
| Unlayered consumer rule | Every internal layer (no `!important` needed) |
| Consumer `@layer overrides` block | Component's `overrides` layer if loaded later in the stylesheet stack |
| `:root { --base-* }` declaration | Component's `variables` layer trivially |
| `web-multiselect { --ms-* }` element selector | Same as above, with higher specificity |

In practice you rarely need to think about layers — variables-first theming (`--ms-*` and `--base-*` overrides) covers ~95% of customization. Layers exist for the residual 5% where you need to flip a property the variable system doesn't expose.

### Visible surface (wrapper-host pattern)

The `:host` is intentionally transparent — the visible chrome is painted by `.ms__input`, which reads `--ms-input-bg`. This wrapper-host pattern keeps the host's outer boundary free of background so the component drops into any container without a colored box, while `--ms-input-bg` still gives consumers a single knob to theme the input surface. Override `--ms-input-bg` (or `--base-input-bg`) to change the painted color; the host doesn't need its own background.

### Watch out — the unlayered-reset footgun

A consumer-side `* { margin: 0; padding: 0; ... }` (Bootstrap reboot, Tailwind preflight, hand-rolled) is *unlayered* and therefore beats every rule inside the component's `@layer component`. The component renders with mysteriously broken spacing even though variables resolved correctly. Wrap your universal reset in its own layer (`@layer reset { * { ... } }`) so the component's layered defaults can win. See the BlissFramework `css-structure.md` → "The unlayered-reset footgun" for the canonical write-up.

## Advanced: direct CSS import

For users who want to import the raw CSS source files:

```css
/* Import component CSS directly */
@import '@keenmate/web-multiselect/css';

/* Or import individual partials */
@import '@keenmate/web-multiselect/src/css/variables.css';
@import '@keenmate/web-multiselect/src/css/base.css';
/* ... etc */
```
