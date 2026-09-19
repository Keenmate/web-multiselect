# Theming

`@keenmate/web-multiselect` is styled entirely through CSS custom properties. The component uses Shadow DOM for encapsulation, but every visible color, size, and effect is exposed as a `--ms-*` variable that you can override from the light DOM.

For interactive theme exploration, use the [Keenmate Theme Designer](https://theme-designer.keenmate.dev).

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
- `--ms-input-padding` — input padding
- `--ms-badge-height` — badge height
- `--ms-option-height` — option height in dropdown

**Input size variants:**

Five size variants for consistent input sizing across Keenmate components:

| Size | Variable | Height | Base variable |
|------|----------|--------|---------------|
| XS | `--ms-input-size-xs-height` | 31px | `--base-input-size-xs-height` |
| SM | `--ms-input-size-sm-height` | 33px | `--base-input-size-sm-height` |
| MD | `--ms-input-size-md-height` | 35px | `--base-input-size-md-height` |
| LG | `--ms-input-size-lg-height` | 38px | `--base-input-size-lg-height` |
| XL | `--ms-input-size-xl-height` | 41px | `--base-input-size-xl-height` |

Heights reference `--base-input-size-*-height` from the [Theme Designer](https://theme-designer.keenmate.dev), ensuring consistent input heights across all Keenmate components.

```css
/* Set consistent input heights across all components */
:root {
  --base-input-size-md-height: 4.0;  /* All components: 40px at 10px rem */
}
```

## Theme Designer integration

The easiest way to customize the appearance of this component is the **Keenmate Theme Designer** at [theme-designer.keenmate.dev](https://theme-designer.keenmate.dev).

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
  --ms-primary-bg: #your-background;
  --ms-text-primary: #your-text-color;
}
```

**Cascading mode (multi-component)** — when using multiple Keenmate components, you can define a shared base layer:

```css
:root {
  /* Base layer - single source of truth */
  --base-accent-color: #3b82f6;
  --base-main-bg: #ffffff;
  --base-hover-bg: #f3f4f6;
  --base-text-color-1: #111827;

  /* Components reference base layer */
  --ms-accent-color: var(--base-accent-color);
  --drp-accent-color: var(--base-accent-color);
}
```

Change `--base-accent-color` once → all components update automatically.

### Unified variable naming

All Keenmate components follow a consistent naming convention for **Tier 1 variables** (core theming):

| Purpose | web-multiselect | web-daterangepicker |
|---------|-----------------|---------------------|
| Brand color | `--ms-accent-color` | `--drp-accent-color` |
| Background | `--ms-primary-bg` | `--drp-primary-bg` |
| Text color | `--ms-text-primary` | `--drp-text-primary` |
| Text on accent | `--ms-text-color-on-accent` | `--drp-text-on-accent` |
| Border color | `--ms-border-color` | `--drp-border-color` |

Learn the pattern once, apply it across all components.

### Component variables manifest

This package exports a `component-variables.manifest.json` file that documents all supported CSS variables for tooling integration (e.g., Theme Designer, IDE autocomplete):

```javascript
import manifest from '@keenmate/web-multiselect/component-variables.manifest.json';
// manifest.baseVariables - list of --base-* variables the component responds to
// manifest.componentVariables - list of --ms-* component-specific variables
```

## CSS variables (no build system required)

You can customize the component using CSS variables even with just a `<script>` tag:

```html
<style>
  /* Override tooltip appearance */
  web-multiselect {
    --ms-tooltip-bg: #1f2937;
    --ms-tooltip-color: #f9fafb;
    --ms-tooltip-padding: 0.625rem 0.875rem;
    --ms-tooltip-border-radius: 0.5rem;
    --ms-tooltip-font-size: 0.8125rem;
    --ms-tooltip-max-width: 24rem;
    --ms-tooltip-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    --ms-tooltip-z-index: 10000;
  }

  /* Override "+X more" badge colors */
  web-multiselect {
    --ms-more-badge-bg: #dbeafe;
    --ms-more-badge-hover-bg: #bfdbfe;
    --ms-more-badge-active-bg: #93c5fd;
  }

  /* Size the component */
  web-multiselect {
    width: 100%;
    max-width: 400px;
  }
</style>
```

## Dark mode — supported signals

Since v1.12.0 the multiselect honors **five different signals** for switching to dark mode. Pick whichever fits your app; you don't need to wire them all up.

| # | Signal | Set by | Example |
|---|--------|--------|---------|
| 1 | OS preference + page `color-scheme` | App author | `html { color-scheme: light dark }` — multiselect picks the OS branch automatically. |
| 2 | Page-level `color-scheme: dark` | App author | `body { color-scheme: dark }` — flips every multiselect on the page to dark. |
| 3 | Framework data-attribute on ancestor | Bootstrap, Pure Admin, custom apps | `<html data-bs-theme="dark">` or `<div data-theme="dark">…</div>` |
| 4 | Framework class on ancestor | Tailwind, hand-rolled toggles | `<html class="dark">` |
| 5 | Per-instance attribute on host | App author, for one widget | `<web-multiselect data-theme="dark">` |

**Precedence** (highest wins): per-instance (#5) → framework ancestor (#3, #4) → page color-scheme (#1, #2).

### Forcing a single widget back to light

If your page is dark but you want one multiselect to render light:

```html
<!-- on a body { color-scheme: dark } page -->
<web-multiselect data-theme="light"></web-multiselect>
```

This works for any of signals #3–#5. The symmetric `data-theme="light"`, `data-bs-theme="light"`, `.light` selectors restore the light palette inside the affected scope.

## Available CSS variables

The component exposes **150+ CSS custom properties** defined at the `:host` level, making them inspectable and overridable. Below are the **50+ most commonly customized variables** organized by category.

### Inspecting variables in DevTools

All CSS custom properties are defined at the `:host` level in the compiled CSS, making them visible in browser DevTools:

1. Open DevTools (F12) and select the `<web-multiselect>` element.
2. In the **Styles** panel, look for the `:host` selector.
3. You'll see all 150+ variables with their default values.
4. Edit values live to preview changes instantly.

**CSS variables work with Shadow DOM** because they inherit through the shadow boundary. This means you can customize the component from outside:

```html
<style>
  /* These variables will penetrate into the Shadow DOM */
  web-multiselect {
    --ms-accent-color: #10b981;          /* Changes primary color */
    --ms-input-border-radius: 0.5rem;    /* Rounds input corners */
  }
</style>
```

For the complete list of all available CSS variables, see [`src/css/variables.css`](../src/css/variables.css) — all 150+ CSS custom properties at `:host` level.

### Colors

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-accent-color` | `#3b82f6` | Primary accent color (blue) |
| `--ms-accent-color-hover` | `#2563eb` | Accent color on hover |
| `--ms-accent-color-active` | `#1d4ed8` | Accent color when active |
| `--ms-text-primary` | `#111827` | Primary text color |
| `--ms-text-secondary` | `#6b7280` | Secondary/muted text color |
| `--ms-border-color` | `#e5e7eb` | Default border color |
| `--ms-border` | `var(--base-border, 1px solid var(--ms-border-color))` | Default full border (inherits from theme-designer) |

### Input component

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-input-bg` | `var(--base-input-bg, #ffffff)` | Input background |
| `--ms-input-text` | `#111827` | Input text color |
| `--ms-input-border` | `#d1d5db` | Input border color |
| `--ms-input-focus-border-color` | `#3b82f6` | Border color when focused |
| `--ms-input-padding-v` | `0.5rem` | Input vertical padding |
| `--ms-input-padding-h` | `0.75rem` | Input horizontal padding |
| `--ms-input-font-size` | `0.875rem` | Input font size |
| `--ms-input-border-radius` | `0.375rem` | Input border radius |
| `--ms-input-placeholder-color` | `#6b7280` | Placeholder text color |

### Dropdown & options

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-dropdown-bg` | `var(--base-dropdown-bg, var(--base-elevated-bg, light-dark(#ffffff, #1a1a1a)))` | Dropdown background (auto-adapts to OS dark mode) |
| `--ms-dropdown-border` | `var(--ms-border-color)` | Dropdown border color |
| `--ms-dropdown-shadow` | (box shadow) | Dropdown shadow |
| `--ms-dropdown-max-height` | `20rem` | Max height of dropdown |
| `--ms-option-padding-v` | `0.5rem` | Option vertical padding |
| `--ms-option-padding-h` | `0.75rem` | Option horizontal padding |
| `--ms-option-hover-bg` | `#f9fafb` | Option background on hover |
| `--ms-option-color-hover` | `inherit` | Option text color on hover |
| `--ms-option-bg-selected` | (rgba accent) | Selected option background |
| `--ms-option-bg-focused` | `#f9fafb` | Focused option background (keyboard) |
| `--ms-option-color-focused` | `inherit` | Focused option text color |
| `--ms-option-bg-matched` | (accent 8%) | Matched option background (navigate mode) |
| `--ms-option-color-matched` | `inherit` | Matched option text color |

### Badges

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-badge-text-bg` | `var(--ms-accent-color-light)` | Badge background color |
| `--ms-badge-text-color` | `var(--ms-accent-color)` | Badge text color |
| `--ms-badge-gap` | `0.5rem` | Gap between badges |
| `--ms-badge-height` | `1.5rem` | Height of badges |
| `--ms-badge-font-size` | `0.75rem` | Badge font size |
| `--ms-badge-border-radius` | `0.375rem` | Badge border radius |
| `--ms-badge-remove-bg` | `var(--ms-accent-color)` | Remove button background |
| `--ms-badge-remove-color` | `var(--ms-text-color-on-accent)` | Remove button (X) color — applied to the SVG via `currentColor` |
| `--ms-badge-remove-icon-size` | `calc(1.0 * var(--ms-rem))` | Size of the X glyph inside the remove button |
| `--ms-icon-remove` | (inline SVG `url(...)`) | The X mask SVG; override to swap the glyph shape (alpha-only — color comes from `--ms-badge-remove-color`) |
| `--ms-badge-counter-text-bg` | `var(--ms-primary-bg)` | BadgeCounter text background ("+X more") |
| `--ms-badge-counter-text-color` | `var(--ms-text-color-3)` | BadgeCounter text color |
| `--ms-badge-counter-remove-bg` | `var(--ms-text-color-3)` | BadgeCounter remove button background |
| `--ms-badge-counter-remove-color` | `var(--ms-text-color-on-accent)` | BadgeCounter remove button color |
| `--ms-badge-counter-border` | `1px solid var(--ms-border-color)` | BadgeCounter border |
| `--ms-badge-text-border` | `none` | Badge text border (e.g., `1px solid #3b82f6`) |

### Checkboxes

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-checkbox-bg` | `var(--ms-input-bg)` | Checkbox background |
| `--ms-checkbox-border` | `1px solid var(--ms-border-color)` | Checkbox border |
| `--ms-checkbox-border-radius` | `0.3rem` | Checkbox border radius |
| `--ms-checkbox-checked-bg` | `var(--ms-accent-color)` | Background when checked |
| `--ms-checkbox-checked-border` | `1px solid var(--ms-accent-color)` | Border when checked |
| `--ms-checkbox-checkmark-color` | `var(--ms-text-color-on-accent)` | Checkmark color |
| `--ms-checkbox-hover-border-color` | `var(--ms-accent-color)` | Border on hover |
| `--ms-checkbox-disabled-bg` | `var(--ms-primary-bg)` | Disabled background |
| `--ms-checkbox-disabled-border` | `1px solid var(--ms-border-color)` | Disabled border |

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
| `--ms-counter-bg` | `#3b82f6` | Counter background |
| `--ms-counter-color` | `#ffffff` | Counter text color |
| `--ms-counter-font-size` | `0.75rem` | Counter font size |
| `--ms-counter-bg-hover` | `#2563eb` | Hover background color |

### Tooltips

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-tooltip-bg` | `var(--base-tooltip-bg, var(--base-inverse-bg, light-dark(#333333, #f5f5f5)))` | Tooltip background (auto-adapts to OS dark mode) |
| `--ms-tooltip-color` | `var(--ms-tooltip-text-color)` | Tooltip text color |
| `--ms-tooltip-padding` | `0.5rem 0.75rem` | Tooltip padding |
| `--ms-tooltip-border-radius` | `0.375rem` | Tooltip border radius |
| `--ms-tooltip-font-size` | `0.875rem` | Tooltip font size |
| `--ms-tooltip-max-width` | `20rem` | Tooltip maximum width |
| `--ms-tooltip-shadow` | (box shadow) | Tooltip box shadow |
| `--ms-tooltip-z-index` | `10000` | Tooltip z-index |

### Typography

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-font-size-xs` | `0.75rem` | Extra small font size |
| `--ms-font-size-sm` | `0.875rem` | Small font size |
| `--ms-font-size-base` | `1rem` | Base font size |
| `--ms-font-weight-medium` | `500` | Medium font weight |
| `--ms-font-weight-semibold` | `600` | Semibold font weight |

### Effects & transitions

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-transition-fast` | `150ms` | Fast transition duration |
| `--ms-transition-normal` | `200ms` | Normal transition duration |
| `--ms-easing-snappy` | (cubic-bezier) | Snappy easing function |
| `--ms-shadow-md` | (box shadow) | Medium shadow |
| `--ms-shadow-xl` | (box shadow) | Extra large shadow |
| `--ms-disabled-opacity` | `0.5` | Opacity for disabled state |

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
