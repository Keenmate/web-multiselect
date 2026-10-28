# Theming Reference

Complete reference for all component states and their CSS variables for theming the `@keenmate/web-multiselect` component.

---

## Table of Contents

- [Options](#options)
- [Checkbox](#checkbox)
- [Input](#input)
- [Toggle Icon](#toggle-icon)
- [Counter Badge (in Input)](#counter-badge-in-input)
- [Dropdown](#dropdown)
- [Action Buttons](#action-buttons)
- [Badges](#badges)
- [Badge Counter Variant](#badge-counter-variant)
- [Count Display Mode](#count-display-mode)
- [Tooltip](#tooltip)
- [Selected Popover](#selected-popover)
- [Scrollbar](#scrollbar)
- [Global](#global)

---

## Options

Individual dropdown option items.

| State | CSS Class | CSS Variables |
|-------|-----------|---------------|
| **Default** | `.ms__option` | `--ms-option-bg`, `--ms-option-text-color` |
| **Hover** | `:hover` | `--ms-option-bg-hover`, `--ms-option-color-hover` |
| **Focused** | `--focused` | `--ms-option-bg-focused`, `--ms-option-color-focused`, `--ms-option-outline-focused`, `--ms-option-focus-outline-offset` (read `--base-focused-bg` / `-text-color` / `-outline`, offset follows `--base-outline-width`) |
| **Matched** | `--matched` | `--ms-option-bg-matched`, `--ms-option-color-matched`, `--ms-option-border-matched` |
| **Selected** | `--selected` | `--ms-option-bg-selected`, `--ms-option-color-selected`, `--ms-option-outline-selected` (read `--base-selected-bg` / `-text-color` / `-outline`) |
| **Disabled** | `--disabled` | `--ms-disabled-opacity`, `--ms-option-disabled-bg` (reads `--base-disabled-bg`, default `transparent`) |
| **Focused + Hover** | `--focused:hover` | `--ms-option-bg-focused-hover`, `--ms-option-color-focused-hover` |
| **Matched + Hover** | `--matched:hover` | `--ms-option-bg-matched-hover`, `--ms-option-color-matched-hover` |
| **Selected + Hover** | `--selected:hover` | `--ms-option-bg-selected-hover`, `--ms-option-title-color-selected-hover` |
| **Selected + Focused** | `--selected--focused` | `--ms-option-bg-selected-focused`, `--ms-option-color-selected-focused` |
| **Selected + Matched** | `--selected--matched` | `--ms-option-bg-selected-matched` |
| **Disabled + Selected** | `--disabled--selected` | `--ms-option-bg-disabled-selected` |
| **Disabled + Focused** | `--disabled--focused` | *(outline removed)* |
| **Disabled + Hover** | `--disabled:hover` | *(resets to default background)* |

### Option Content

| Element | CSS Variables |
|---------|---------------|
| **Title** | `--ms-option-title-font-size`, `--ms-option-title-color` |
| **Title (focused / selected)** | `--ms-option-title-color-focused`, `--ms-option-title-color-selected` (read `--base-focused-text-color` / `--base-selected-text-color`) |
| **Title (hover / selected+hover)** | `--ms-option-title-color-hover`, `--ms-option-title-color-selected-hover` |
| **Subtitle** | `--ms-option-subtitle-font-size`, `--ms-option-subtitle-color`, `--ms-option-subtitle-margin-top`, `--ms-option-subtitle-line-height` |
| **Subtitle (hover)** | `--ms-option-subtitle-color-hover` |
| **Subtitle (selected)** | `--ms-option-subtitle-color-selected` |
| **Subtitle (selected+hover)** | `--ms-option-subtitle-color-selected-hover` |
| **Icon** | `--ms-option-icon-size`, `--ms-option-icon-font-size` |
| **Mark (highlight)** | `--ms-option-mark-bg`, `--ms-option-mark-color`, `--ms-option-mark-font-weight` |

---

## Checkbox

Custom-styled checkbox within options.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Default** | `.ms__checkbox` | `--ms-checkbox-bg`, `--ms-checkbox-border`, `--ms-checkbox-border-radius`, `--ms-checkbox-size`, `--ms-checkbox-scale` |
| **Hover** | `:hover:not(:disabled)` | `--ms-checkbox-hover-border-color` |
| **Checked** | `:checked` | `--ms-checkbox-checked-bg`, `--ms-checkbox-checked-border`, `--ms-checkbox-checkmark-color` |
| **Checked + Hover** | `:checked:hover:not(:disabled)` | `--ms-checkbox-checked-bg-hover`, `--ms-checkbox-checked-border-color-hover` |
| **Focus** | `:focus-visible` | *(uses `--ms-checkbox-checked-bg` for outline)* |
| **Disabled** | `:disabled` | `--ms-checkbox-disabled-bg`, `--ms-checkbox-disabled-border` (empty box), `--ms-disabled-input-opacity` |
| **Checked + Disabled** | `:checked:disabled` | *(keeps the checked fill and mark, dimmed by `--ms-disabled-input-opacity`)* |

### Checkbox Positioning

| Property | CSS Variable |
|----------|--------------|
| **Alignment** | `--ms-checkbox-align` (`flex-start`, `center`, `flex-end`) |
| **Margins** | `--ms-checkbox-margin-top`, `--ms-checkbox-margin-right`, `--ms-checkbox-margin-bottom`, `--ms-checkbox-margin-left` |

---

## Input

The search/selection input field.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Default** | `.ms__input-wrapper` (the field shell) | `--ms-input-bg`, `--ms-input-color`, `--ms-input-border` (color: `--ms-input-border-color`), `--ms-input-border-radius`, `--ms-input-height`, `--ms-input-font-size`, `--ms-input-padding-h`, `--ms-input-gap` |
| **Hover** | `:hover:not(:focus-within)` | `--ms-input-border-hover` |
| **Focus** | `:focus-within` | `--ms-input-border-focus`, `--ms-input-box-shadow-focus` |
| **Placeholder** | `::placeholder` | `--ms-input-placeholder-color`, `--ms-placeholder-opacity` |
| **Disabled** | `.ms--disabled .ms__input-wrapper` | `--ms-input-bg-disabled`, `--ms-disabled-input-opacity` |

### Input Sizing

The component uses `--ms-rem` for proportional scaling: `var(--base-rem, 10px)`, so it follows the shared `--base-rem` and is 10px without a base layer.

| Variable | Default | Description |
|----------|---------|-------------|
| `--ms-rem` | `var(--base-rem, 10px)` | Base unit for all sizing calculations |
| `--ms-input-height` | `calc(var(--base-input-size-md-height, 3.5) * var(--ms-rem))` | Input field height (35px) |
| `--ms-input-padding-h` | `calc(1.2 * var(--ms-rem))` | Inline padding of the field |
| `--ms-input-font-size` | `calc(var(--base-font-size-sm, 1.4) * var(--ms-rem))` | Input font size (14px) |

**Scale Examples:**
- `--ms-rem: 8px` → 80% size (compact)
- `--ms-rem: 10px` → 100% size (default)
- `--ms-rem: 12px` → 120% size (large)
- Pure Admin sets `--base-rem: 1rem` (with `html { font-size: 10px }`), which `--ms-rem` follows — nothing to set on the component

---

## Toggle Icon

The dropdown arrow/chevron icon.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Default** | `.ms__toggle` | `--ms-toggle-icon-color` (default `--base-input-icon-color`), `--ms-toggle-icon-size`, `--ms-toggle-rotate-closed` |
| **Open** | `.ms--open .ms__toggle` | `--ms-toggle-icon-color-open`, `--ms-toggle-rotate-open` |
| **Disabled** | `.ms--disabled .ms__toggle` | `--ms-disabled-input-opacity` |

---

## Counter Badge (in Input)

Small badge showing selection count inside the input.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Default** | `.ms__counter` | `--ms-counter-badge-bg`, `--ms-counter-badge-color`, `--ms-counter-font-size`, `--ms-counter-font-weight`, `--ms-counter-border-radius`, `--ms-counter-padding` |
| **Hover** | `:hover` | `--ms-counter-badge-bg-hover`, `--ms-transform-scale-hover` |

---

## Dropdown

The floating options container.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Default** | `.ms__dropdown` | `--ms-dropdown-bg`, `--ms-dropdown-text-color`, `--ms-dropdown-border`, `--ms-dropdown-border-radius`, `--ms-dropdown-box-shadow`, `--ms-options-max-height`, `--ms-z-index-dropdown` |
| **Visible** | `--visible` | *(display: block)* |

### Floating Hint

| State | CSS Variables |
|-------|---------------|
| **Default** | `--ms-hint-bg`, `--ms-hint-color`, `--ms-hint-border`, `--ms-hint-border-radius`, `--ms-hint-box-shadow`, `--ms-hint-font-size`, `--ms-hint-padding` |

### Groups

| Element | CSS Variables |
|---------|---------------|
| **Group separator** | `--ms-group-border-top`, `--ms-group-margin-top`, `--ms-group-padding-top` |
| **Group label** | `--ms-group-label-color`, `--ms-group-label-font-size`, `--ms-group-label-font-weight`, `--ms-group-label-padding`, `--ms-group-label-transform`, `--ms-group-label-letter-spacing` |

### Empty & Loading States

| State | CSS Variables |
|-------|---------------|
| **Empty** | `--ms-empty-color`, `--ms-empty-font-size`, `--ms-empty-padding` |
| **Loading** | `--ms-loading-color`, `--ms-loading-text-font-size`, `--ms-loader-padding`, `--ms-loader-gap` |

---

## Action Buttons

Select All / Clear All buttons in dropdown.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Container** | `.ms__actions` | `--ms-actions-bg`, `--ms-actions-border-bottom`, `--ms-actions-padding`, `--ms-actions-gap` |
| **Default** | `.ms__action-btn` | `--ms-action-button-bg`, `--ms-action-button-color`, `--ms-action-btn-border`, `--ms-action-btn-border-radius`, `--ms-action-btn-font-size`, `--ms-action-btn-padding` |
| **Hover** | `:hover` | `--ms-action-button-bg-hover`, `--ms-action-button-border-color-hover` |
| **Active** | `:active` | `--ms-transform-scale-active` |
| **Disabled** | `:disabled` | `--ms-disabled-opacity` |

---

## Badges

Selected item badges displayed outside the dropdown.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Container** | `.ms__badges` | `--ms-badges-gap`, `--ms-badges-margin-top`, `--ms-badges-margin-bottom`, `--ms-badges-margin-left`, `--ms-badges-margin-right` |
| **Badge** | `.ms__badge` | `--ms-badge-height`, `--ms-badge-font-size`, `--ms-badge-font-weight`, `--ms-badge-border-radius` |
| **Badge Text** | `.ms__badge-text` | `--ms-badge-text-bg`, `--ms-badge-text-color`, `--ms-badge-text-padding`, `--ms-badge-text-border` |
| **Badge Hover** | `.ms__badge:hover .ms__badge-text` | `--ms-badge-text-bg-hover`, `--ms-badge-text-color-hover` |
| **Remove Button** | `.ms__badge-remove` | `--ms-badge-remove-bg`, `--ms-badge-remove-color`, `--ms-badge-remove-border`, `--ms-badge-remove-width`, `--ms-badge-remove-icon-size` |
| **Remove Hover** | `.ms__badge-remove:hover` | `--ms-badge-remove-bg-hover` |
| **Remove Focus** | `.ms__badge-remove:focus` | `--ms-badge-remove-box-shadow-focus` |

### Badge Border Styling

Badges have **separate borders** for the text part and remove button, allowing different colors:

```css
web-multiselect {
  /* Text part - light pink border */
  --ms-badge-text-bg: #f8d7da;
  --ms-badge-text-border: 1px solid #f8d7da;

  /* Button part - dark red border matching background */
  --ms-badge-remove-bg: #bb0a30;
  --ms-badge-remove-border: 1px solid #bb0a30;
}
```

---

## Badge Counter Variant

Gray/neutral badges for "+X more", count indicators, compact mode.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Container** | `.ms__badge--counter` | `--ms-badge-counter-border` |
| **Text** | `.ms__badge--counter .ms__badge-text` | `--ms-badge-counter-text-bg`, `--ms-badge-counter-text-color` |
| **Remove** | `.ms__badge--counter .ms__badge-remove` | `--ms-badge-counter-remove-bg`, `--ms-badge-counter-remove-color` |
| **Remove Hover** | `.ms__badge--counter .ms__badge-remove:hover` | `--ms-badge-counter-remove-bg-hover` |

### "+X More" Badge

The "+X more" badge is a `.ms__badge--counter` — theme it with the Badge Counter variables above.

---

## Count Display Mode

Alternative to badges - shows "X selected" with clear button.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Container** | `.ms__count-display` | `--ms-count-display-margin-top`, `--ms-count-display-margin-bottom`, `--ms-count-display-margin-left`, `--ms-count-display-margin-right` |
| **Wrapper** | `.ms__counter-wrapper` | `--ms-counter-wrapper-bg`, `--ms-counter-wrapper-border`, `--ms-counter-wrapper-border-radius`, `--ms-counter-wrapper-padding`, `--ms-counter-wrapper-gap` |
| **Wrapper Hover** | `.ms__counter-wrapper:hover` | `--ms-counter-wrapper-bg-hover`, `--ms-counter-wrapper-border-color-hover` |
| **Text** | `.ms__count-text` | `--ms-count-text-color`, `--ms-count-text-font-size`, `--ms-count-text-bg`, `--ms-count-text-border` |
| **Clear Button** | `.ms__count-clear` | `--ms-count-clear-bg`, `--ms-count-clear-color`, `--ms-count-clear-size`, `--ms-count-clear-icon-size`, `--ms-count-clear-border-radius` |
| **Clear Hover** | `.ms__count-clear:hover` | `--ms-count-clear-bg-hover`, `--ms-count-clear-color-hover` |

---

## Tooltip

Badge tooltips showing full text on hover.

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Default** | `.ms__badge-tooltip` | `--ms-tooltip-bg`, `--ms-tooltip-text-color`, `--ms-tooltip-padding`, `--ms-tooltip-border-radius`, `--ms-tooltip-font-size`, `--ms-tooltip-max-width`, `--ms-tooltip-shadow`, `--ms-tooltip-z-index` |
| **Visible** | `--visible` | *(opacity: 1, visibility: visible)* |

---

## Selected Popover

Popover showing all selected items (for count display mode).

| State | Selector | CSS Variables |
|-------|----------|---------------|
| **Container** | `.ms__selected-popover` | `--ms-selected-popover-bg`, `--ms-selected-popover-border`, `--ms-selected-popover-border-radius`, `--ms-selected-popover-box-shadow`, `--ms-selected-popover-width`, `--ms-selected-popover-max-height`, `--ms-z-index-popover` |
| **Header** | `.ms__selected-popover-header` | `--ms-selected-popover-header-bg`, `--ms-selected-popover-header-color`, `--ms-selected-popover-header-border-bottom`, `--ms-selected-popover-header-font-size`, `--ms-selected-popover-header-font-weight`, `--ms-selected-popover-header-padding` |
| **Close Button** | `.ms__selected-popover-close` | `--ms-selected-popover-close-bg`, `--ms-selected-popover-close-color`, `--ms-selected-popover-close-icon-size`, `--ms-selected-popover-close-border-radius`, `--ms-popover-close-size` |
| **Close Hover** | `.ms__selected-popover-close:hover` | `--ms-selected-popover-close-bg-hover`, `--ms-selected-popover-close-color-hover` |
| **Body** | `.ms__selected-popover-body` | `--ms-selected-popover-body-padding`, `--ms-selected-popover-body-gap`, `--ms-selected-popover-body-max-height` |

---

## Scrollbar

Custom scrollbar styling for dropdown and popover.

| Element | CSS Variables |
|---------|---------------|
| **Width** | `--ms-scrollbar-width` |
| **Track** | `--ms-scrollbar-track-bg` |
| **Thumb** | `--ms-scrollbar-thumb-bg`, `--ms-scrollbar-thumb-border-radius` |
| **Thumb Hover** | `--ms-scrollbar-thumb-bg-hover` |

---

## Global

### Colors

| Variable | Description |
|----------|-------------|
| `--ms-accent-color` | Primary accent color (`--base-primary-color`) |
| `--ms-accent-color-hover` | Accent color on hover |
| `--ms-accent-color-light` | Accent tint (badges) — `--base-primary-bg-subtle` |
| `--ms-text-color-1` / `-3` / `-4` | Text levels: body, tertiary (subtitles, icons, placeholder, hints), faint (disabled) |
| `--ms-text-secondary` | Alias of `--ms-text-color-3` |
| `--ms-text-color-on-accent` | Text color on accent backgrounds (for contrast) |
| `--ms-primary-bg` | Hover fill (options, action buttons, counter) — `--base-hover-bg` |
| `--ms-border-width` | Stroke width of every border — `--base-border-width` |
| `--ms-border-color` | Divider color (panels, separators) — `--base-border-color` |
| `--ms-input-border-color` | Control outline (input, action buttons, count pill) — `--base-input-border-color` |

### Typography

Font sizes, weights and line heights read the shared `--base-*` scale directly (e.g.
`calc(var(--base-font-size-sm, 1.4) * var(--ms-rem))`); per-element knobs such as
`--ms-option-title-font-size` or `--ms-badge-font-weight` override one spot.

| Variable | Description |
|----------|-------------|
| `--ms-font-family` | Font family (optional; falls back to `--base-font-family`, then the page font) |
| `--ms-line-height-none` / `-normal` / `-relaxed` | 1 / `--base-line-height-normal` / `--base-line-height-relaxed` |

#### Base CSS Variables Integration

The component reads the `--base-*` tokens of `@keenmate/base-css-variables` 2.0. Load that layer (or set the `--base-*` variables yourself) and they are applied to the component automatically:

```css
/* Set by @keenmate/base-css-variables (or manually) */
:root {
  --base-font-family: "Inter", system-ui, sans-serif;
  --base-font-size-sm: 1.4; /* unitless: × --base-rem */
  --base-font-weight-semibold: 600;
  --base-line-height-normal: 1.5;
}

/* The component picks these up automatically */
web-multiselect {
  /* font-family: var(--ms-font-family, var(--base-font-family, inherit)) */
  /* font sizes:  calc(var(--base-font-size-sm, 1.4) * var(--ms-rem)) */
}
```

### Transitions

| Variable | Description |
|----------|-------------|
| `--ms-transition-normal` | `var(--base-duration-normal, 0.15s)` — every transition; `0s` turns motion off (reduced motion does) |
| `--ms-easing-snappy` | `var(--base-ease-standard, cubic-bezier(0.4, 0, 0.2, 1))` |

### Base Unit

| Variable | Description |
|----------|-------------|
| `--ms-rem` | Base sizing unit: `var(--base-rem, 10px)` (Pure Admin sets `--base-rem: 1rem`). |

---

## Important: Text Color Contrast

When using solid/strong background colors for selected or hover states, **you must also set the corresponding text color** for proper contrast.

### Automatic Fallback Behavior

State-specific color variables use a smart fallback chain. If you don't set them, they automatically fall back to parent state colors:

- `--ms-option-title-color-selected-hover` → falls back to `--ms-option-title-color-selected` → falls back to `--ms-option-title-color`
- `--ms-option-subtitle-color-selected` → falls back to `--ms-option-subtitle-color`

This means you only need to set the base color once, and all derived states will inherit it.

### Example: Strong Accent Background Problem

```css
/* ❌ WRONG - Text will be hard to read */
web-multiselect {
  --ms-option-bg-selected: #bb0a30;  /* Strong red */
  /* Text stays gray/dark = poor contrast! */
}

/* ✅ CORRECT - Set text color for contrast */
web-multiselect {
  --ms-option-bg-selected: #bb0a30;              /* Strong red */
  --ms-option-title-color-selected: #ffffff;       /* White title */
  --ms-option-title-color-selected-hover: #ffffff; /* White on hover too */
}
```

### Variables That Should Be Set Together

When using solid accent backgrounds, set both background AND text color:

| Background Variable | Title Color Variable | Subtitle Color Variable |
|---------------------|---------------------|-------------------------|
| `--ms-option-bg-hover` | `--ms-option-title-color-hover` | `--ms-option-subtitle-color-hover` |
| `--ms-option-bg-selected` | `--ms-option-title-color-selected` | `--ms-option-subtitle-color-selected` |
| `--ms-option-bg-selected-hover` | `--ms-option-title-color-selected-hover` | `--ms-option-subtitle-color-selected-hover` |
| `--ms-option-bg-focused` | `--ms-option-title-color-focused` | *(use default)* |
| `--ms-option-bg-matched` | `--ms-option-color-matched` | *(use default)* |

---

## Example: Corporate Red Theme (Solid Backgrounds)

```css
web-multiselect {
  /* Base colors */
  --ms-accent-color: #bb0a30;
  --ms-accent-color-hover: #8b0720;
  --ms-text-color-1: #333333;
  --ms-text-color-3: #858585;

  /* Options - IMPORTANT: Set text colors for solid backgrounds */
  --ms-option-bg-selected: #bb0a30;
  --ms-option-title-color-selected: #ffffff;          /* White title on red */
  --ms-option-subtitle-color-selected: #dbdbdb;       /* Light gray subtitle on red */
  --ms-option-bg-selected-hover: #8b0720;
  --ms-option-title-color-selected-hover: #ffffff;    /* White title on darker red */
  --ms-option-subtitle-color-selected-hover: #dbdbdb; /* Light gray subtitle */

  /* Checkbox on selected */
  --ms-checkbox-checked-bg: #ffffff;             /* White checkbox on red bg */
  --ms-checkbox-checkmark-color: #bb0a30;        /* Red checkmark */
}
```

---

## Example: Dark Theme

```css
web-multiselect {
  /* Base colors */
  --ms-accent-color: #60a5fa;
  --ms-accent-color-hover: #3b82f6;
  --ms-text-color-1: #f3f4f6;
  --ms-text-color-3: #9ca3af;
  --ms-border-color: #374151;
  --ms-primary-bg: #374151; /* hover fill */

  /* Input */
  --ms-input-bg: #111827;
  --ms-input-color: #f3f4f6;
  --ms-input-border-color: #374151;
  --ms-input-placeholder-color: #6b7280;

  /* Dropdown */
  --ms-dropdown-bg: #1f2937;
  --ms-dropdown-border-color: #374151;

  /* Options */
  --ms-option-bg: transparent;
  --ms-option-bg-hover: #374151;
  --ms-option-bg-selected: rgba(96, 165, 250, 0.15);

  /* Badges */
  --ms-badge-text-bg: #1e3a5f;
  --ms-badge-text-color: #60a5fa;
  --ms-badge-remove-bg: #3b82f6;

  /* Tooltip */
  --ms-tooltip-bg: #111827;
  --ms-tooltip-text-color: #f3f4f6;
}
```
