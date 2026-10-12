# CSS — web-multiselect

Styling is plain CSS (no SCSS / no preprocessor); all theming is via CSS custom properties. Classes use the `.ms__*` prefix, variables the `--ms-*` prefix. This file loads when working under `src/css/`.

## Structure

`main.css` is the entry point — it declares `@layer variables, component, overrides` and `@import`s all partials with explicit layer bindings. Follows the BlissFramework canonical Tier 1+2+3 file structure:

Tier 1 (skeleton, always non-empty):
- `variables.css` - All `--ms-*` CSS custom properties at `:host` level (base primitives, semantic per-component theming hooks, sizing)
- `base.css` - FOUC prevention + `.ms__wrapper` / `.ms` layout containers
- `dark-mode.css` - Framework class + per-instance `data-theme` selectors (loaded under `@layer overrides`)

Tier 2 (canonical concerns, always created, may be empty):
- `controls.css` - `.ms__input`, `.ms__toggle`, `.ms__counter` (in-input badge), `.ms__actions`, `.ms__action-btn`
- `floating.css` - `.ms__hint`, `.ms__dropdown`, `.ms__badge-tooltip`, `.ms__selected-popover` (everything Floating-UI-anchored)
- `states.css` - `.ms--disabled`, `.ms--no-checkboxes` (block-level state modifiers)
- `animations.css` - empty stub (no `@keyframes` in this component)

Tier 3 (component-specific features):
- `badges.css` - `.ms__badges`, `.ms__badge`, `.ms__badge--counter`, `.ms__badge--more`
- `count-display.css` - `.ms__count-display`, `.ms__counter-wrapper`, `.ms__count-text`, `.ms__count-clear`
- `debug.css` - `.ms__debug-info`, `.ms__debug-stats` (dev-only)
- `options.css` - Options list, groups, checkbox, content, per-state styling
- `rtl.css` - RTL language support (see "Writing directional CSS" below)

## Adding a CSS variable

1. Declare the variable in `variables.css` at `:host` level. Per-component theming hooks default to a base variable, e.g.
   `--ms-myComponent-border-color: var(--ms-border-color);`
2. Reference the new variable from the actual rule in the relevant feature file — e.g.
   `.ms__myComponent { border: 1px solid var(--ms-myComponent-border-color); }`
3. Always wire a declared variable into at least one rule. A declaration with no `var()` reader is dead theming surface.

## Writing directional CSS (RTL)

Use **CSS logical properties** for any horizontal/inline direction so it mirrors in
RTL for free — `margin-inline-start/end`, `padding-inline-*`, `inset-inline-start/end`
(not `left`/`right`), `border-inline-start/end`, logical border-radius
(`border-start-start-radius`, …), and `text-align: start/end`. Reserve physical
`left`/`right` for direction-agnostic cases (e.g. `left: 50%` centering). Don't add
`.ms--rtl` override rules — the panel isn't under that element, so they won't match;
`direction` inheritance (the host carries `dir="rtl"`, and the dropdown/hint/popover
also get an explicit `dir` since they're appended to the shadow root) + logical
properties handle it. `rtl.css` holds only the `badges-position` / count-display
placement — a physical-side choice mirrored in JS.
