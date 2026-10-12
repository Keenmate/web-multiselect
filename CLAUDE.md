# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A feature-rich multiselect web component with typeahead search, virtual scrolling, grouping, and extensive customization options. Published as `@keenmate/web-multiselect` on npm.

Core logic lives in `src/multiselect.ts` (the generic `WebMultiSelect<T>` class — search, selection, keyboard nav, virtual scrolling); `src/web-component.ts` wraps it as the `<web-multiselect>` custom element (Shadow DOM, attribute/property reflection, events, form integration); `src/types.ts` holds the config/callback interfaces. Data extraction uses a member/callback pattern (`valueMember` + `getValueCallback`), similar to svelte-treeview.

## Naming Conventions

- **CSS Classes**: `.ms__*` prefix (e.g., `.ms__input`, `.ms__dropdown`, `.ms__option`)
- **CSS Variables**: `--ms-*` prefix (e.g., `--ms-accent-color`, `--ms-input-border-radius`)

> Styling/CSS conventions (layer structure, adding variables, RTL) live in `src/css/CLAUDE.md`, loaded automatically when working under `src/css/`.

## Sizing System

The component uses `--ms-rem` for global scaling. Default is `10px` (so `1.4 * --ms-rem = 14px`).

**Global Scaling:**
```html
<!-- Compact (80%) -->
<web-multiselect style="--ms-rem: 8px;"></web-multiselect>

<!-- Default (100%) -->
<web-multiselect></web-multiselect>

<!-- Large (120%) -->
<web-multiselect style="--ms-rem: 12px;"></web-multiselect>
```

**Fine-grained Control:** Override individual variables like `--ms-input-font-size`, `--ms-input-padding-v`, `--ms-input-height`, etc.

**Shadow DOM Note:** CSS variables must be set on the `<web-multiselect>` element itself, not on wrapper divs.

### Typography Integration

Font sizes use unitless multipliers that get multiplied by `--ms-rem`:
```css
--ms-input-font-size: calc(var(--base-font-size-sm, 1.4) * var(--ms-rem));
```

This enables integration with theme-designer's `--base-*` variables:
- `--base-font-family` - Font family
- `--base-font-size-xs`, `--base-font-size-sm`, etc. - Unitless multipliers
- `--base-font-weight-normal`, `--base-font-weight-semibold`, etc. - Font weights
- `--base-line-height-tight`, `--base-line-height-normal` - Line heights

## Development Guidelines

### Adding a New Attribute / Property

Inputs are declared ONCE as rows in the `INPUTS` table in `web-component.ts` (the element extends `BlissElement` from `@keenmate/web-components-core`). Core generates `observedAttributes`, attribute parsing/validation, the property getter/setter, reflection, and reactivity coalescing from that table — there is no manual `attributeChangedCallback` or hand-written accessor.

1. Add a row to `INPUTS`: `{ configKey, attribute, converter, on, description }`.
   - `attribute` — the kebab-case HTML attribute; **omit it** for a property-only input (e.g. callbacks, object maps).
   - `converter` — `toText(...)`, `toBool('default-true' | 'default-false' | 'presence' | 'tristate')`, `toEnum([...], { default })`, `toInt({ default })`, `toObjectArray()`, `toValue({ validate })`, or `cb()` for a callback.
   - `on` — `'update'` (cosmetic → applied in place via `picker.updateOptions(partial)`) or `'reinit'` (data-shape / layout-mode change → rebuild the picker). A batch containing any `reinit` key runs `reinit()` only.
   - `reflect: true` mirrors the property back to the attribute.
2. If the key is element-only (not forwarded to the core `WebMultiSelect` config), add it to `NON_PICKER_KEYS`.
3. Consume it in the picker via `this.options.<configKey>` (`multiselect.ts`).

### Consistency with web-daterangepicker

Both components share similar patterns:
- Same `--*-rem` scaling approach (`--ms-rem`, `--drp-rem`)
- Same typography integration with `--base-*` variables
- CSS variable prefixes (multiselect: `--ms-*`, daterangepicker: `--drp-*`)
