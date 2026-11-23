# Validation notes

Deliberate deviations from the web-components rulebook, so a validator run can skip them.

## C-BV-9 (`--base-*` read outside `variables.css`): `src/css/base.css`

`web-multiselect:not(:defined)` is a light-DOM rule (shipped in `dist/style.css`) that reserves the
control's height before the element upgrades. It lives outside the shadow root, where the `--ms-*`
variables (declared on `:host`) don't exist, so it reads `--base-input-size-md-height` / `--base-rem`
directly. Every other rule reads the `--ms-*` layer.

## C-CST-4 (Service files import each other): `src/tree/cascade.ts` → `src/tree/ltree.ts`

`src/tree/` is one module, the tree the hierarchical options live in: `ltree.ts` builds and holds it,
`cascade.ts` holds the selection rules that walk it (parent / child cascade). The only import between
them is `import type { LTree } from './ltree'`, the type of the tree parameter; it is erased at build
time, so there is no runtime dependency. The Logic class (`multiselect.ts`) creates the tree and passes
it to the cascade functions, so the coordination already runs through it, as the rule asks.

## C-RO-9 — safe-area padding comes from core `.km-sheet`

Both phone sheets (the fullscreen dropdown and the fullscreen selected-items popover) take their frame from core's
`.km-sheet` (`SHEET_CHROME_CSS`, SPEC §12.29, adopted into the shadow root at runtime): `box-sizing: border-box` +
`padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`.
The static scan only reads `src/css/`, so it can't see core's rule. PASS with note; drop this entry when the check
counts a `.km-sheet` adoption as the safe-area frame.
