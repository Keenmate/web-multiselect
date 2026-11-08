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

## C-BV-6 — input variables (consumer knobs read with a fallback chain)

Twelve manifest entries are public knobs the CSS reads with a fallback chain and never declares on
`:host`, by design: `--ms-font-family` (`var(--ms-font-family, var(--base-font-family, inherit))`) and
the hover / selected-hover / selected-focused / matched-hover colour refinements
(`--ms-option-title-color-hover`, `--ms-option-color-selected-focused`, … each falling back to its base
knob). Declaring them on `:host` would fill the slot and cut the fallback to the base knob. They are in
the manifest because that is where a consumer finds them.

Rulebook gaps: `_agent-progress/rulebook-gaps-from-devkit.md` #1 and #15 (a documented "input variable"
manifest marker). PASS with note; drop this entry when the rulebook accepts input variables.

## C-RO-4 — `100vw` inside a CSS comment

`src/css/floating.css` (fullscreen sheet) has one `100vw` in a comment that explains why a plain
`width: 100vw` sheet clips on landscape phones; the rule itself uses `100dvw` / `100dvh`. There is no
bare `vh` / `vw` in a declaration.

Rulebook gap: `_agent-progress/rulebook-gaps-from-devkit.md` #20 (strip `/* … */` before grepping).
PASS with note; drop this entry when the check ignores comments.
