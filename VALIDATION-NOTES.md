# Validation notes

Deliberate deviations from the web-components rulebook, so a validator run can skip them.

## C-BV-9 (`--base-*` read outside `variables.css`): `src/css/base.css`

`web-multiselect:not(:defined)` is a light-DOM rule (shipped in `dist/style.css`) that reserves the
control's height before the element upgrades. It lives outside the shadow root, where the `--ms-*`
variables (declared on `:host`) don't exist, so it reads `--base-input-size-md-height` / `--base-rem`
directly. Every other rule reads the `--ms-*` layer.
