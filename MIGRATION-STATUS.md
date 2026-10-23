# web-multiselect → core migration — status

_Snapshot: 2026-08-02 (v2.0.0 promoted; cold review + core enrichments done)_

> Historical log. The API signatures quoted below (e.g. `on*` handlers reading `e.detail`,
> `searchCallback(searchTerm, signal)`, `customStylesCallback`) are superseded by the
> interaction-model change — see CHANGELOG `[Unreleased]`.

## Summary

The **v2.0.0-rc01 core adoption** is complete, green, and shippable as an rc.
The demo-page sweep is now finished; remaining work is re-checking `docs/*`
against the v2 API and promoting rc01 → 2.0.0.

- Verification (current): **94 unit + 206 e2e (chromium) + typecheck + build** all pass.
- `dist/` rebuilt (gitignored; demos load `dist/`, so rebuild before eyeballing a demo).
- Both repos were level with `origin/prod` at the start of this session; the
  sweep's fixes are **uncommitted** in the web-multiselect working tree.

## The migration itself — DONE ✅

`<web-multiselect>` is built on `@keenmate/web-components-core` (`BlissElement`),
consumed via `file:../web-components-core` → its built `dist/`. Replaced:

- plumbing → `static inputs`/`static events` on `BlissElement`
- positioning → core `/positioning` (`anchor`/`createTooltip`)
- logging → shim over core `createLoggers`
- global registration → `registerComponent()` (`window.components`)
- CEM → `blissAnalyzerConfig()`
- style injection → core `adoptStyles` + `createStyleSlot`

The dropdown engine (`multiselect.ts`), CSS, tree, and virtual scroll are unchanged.

## Earlier demo-sweep bug hunt — first 4 pages (6 issues fixed)

| Commit | Fix | Kind |
|---|---|---|
| `1b4f2cc` | Partial/compact "no options" crash — `el.options = data; el.setSelected(sel)` ran against pre-write picker | real regression from async model |
| `e0cf6bb` | e2e regression guard for the sync options→setSelected pattern | test |
| `3fc5272` | suite-wide `pageerror` fixture (the guard that would've caught the crash) | test infra |
| `78aed18` | priority-badge CSS var typo in templating demo (`--ms-badge-text-background` → `--ms-badge-text-bg`) | demo bug |
| `f980658` | option tooltips trailing the row on virtual-scroll | old bug |
| `45ee346` | dev-mode lint: warn on unknown `--ms-*` vars in `customStylesCallback` | new DX aid |
| `d318a6c` | reworked `examples-logging.html` around `window.components` | demo |

**Core:** `1452d64` added `BlissElement.flush()` (synchronous pending-write flush)
to support the first fix.

## Demo sweep — COMPLETE ✅

All ~15 demo pages have now been swept (the remaining 11: action-buttons,
base-variables, events-callbacks, new-api, performance, positioning,
search-index, sizes, theming, tree, index). Method: load each page in chromium,
exercise every `<web-multiselect>` on it (open → search → select → close), and
fail on uncaught page errors, `console.error`/`warn`, or failed requests. 173
component instances exercised; **15/15 pages now console-clean**.

Two issues found and fixed (uncommitted, in the working tree):

| Fix | Kind |
|---|---|
| `examples-events-callbacks.html` used the **v1 bare-arg `on*` signature** — `onChange` threw `selectedOptions.map is not a function`, `onSelect`/`onDeselect` silently logged `undefined`. Live code + shown sample updated to `e.detail.*`. | real demo bug (stale v1 API) |
| **False-positive drift warning**: `verifyPanelLanded` compared floating-ui's written `left`/`top` against a *viewport* rect. When a recognized ancestor (`transform`/`filter`/…) anchors the panel, those coords are relative to that ancestor's padding box — so a correctly-placed dropdown was reported as drifting by exactly the ancestor's offset, telling consumers to "fix" working CSS. Now translated into viewport space. | real library bug |

Same stale-`on*` pattern also fixed in `docs/usage.md` and in the
`test/action-buttons.html` e2e fixture — where the spec asserted only
`toHaveLength(8)`, so it passed on 8 `undefined`s. That assertion now checks the
actual values, so a stale handler signature can't hide there again.

Verification after the fixes: **94 unit + 206 e2e + typecheck + build** all pass
(e2e +1: a new regression guard asserting a `transform` ancestor anchors without
warning — confirmed to fail without the fix).

## Docs re-check + v2.0.0 promotion — DONE ✅ (commit `d10f554`)

All of `docs/*` re-checked against the v2 API. Stale v1 API corrected in
`usage.md`, `examples.md`, and `api-reference.html`:

- `onSearch` → `searchCallback` (canonical name; `(searchTerm, signal)` sig — the
  property never existed as `onSearch`).
- `on*` handler signatures → `(e: CustomEvent) => void` (read `e.detail.*`); the
  api-reference table still showed the v1 bare-arg forms.
- `setAttributes()` — was documented as raw kebab attribute strings with
  `setAttribute` semantics; actually takes **typed property values** by
  `configKey`/attribute (routed through the property path). Fixed in both docs.
- Added a `usage.md` note on the async property-write model (`await whenSettled()`
  before reading rendered DOM; imperative methods flush internally).
- `api-reference.html` methods table rounded out with `getValue` + `setAttributes`.

Also recorded in the CHANGELOG under `[2.0.0]`: the false-positive
positioning-drift fix (from `5d1b85d`) and the doc corrections.

Version promoted: `package.json` + README + CHANGELOG heading `2.0.0-rc01` →
`2.0.0` (dated 2026-08-02). `dist/` rebuilt (embeds `__VERSION__ = 2.0.0`).
94 unit tests pass; build clean.

## Cold core-conformance review + enrichments — DONE ✅

A fresh "did we shortcut around core?" review (see the `web-multiselect-v2-core-review`
memory) found the migration is a clean adopter — but flagged one rule-bend and a
set of generic capabilities that had been solved in the component instead of core.
All addressed:

| Fix | Repo / commit | What |
|---|---|---|
| `data-options` was hand-parsed, non-reactive | ms `f21ca88` | now the `options` input's reactive, validated attribute path |
| direct `@floating-ui/dom` dep (drift vs core) | core `e76fb3b`, ms `f21ca88` | core re-exports `platform`; component dropped its own pin |
| `data-options-format` (json/csv/plain) + `data-options-splitter`/`-row-splitter` | ms `85ba4c3`, `e5572b9` | HTML-authoring formats via pure `parseOptionsData()` |
| css-var lint was component-local | core `7619075`, ms `e2c927d` | promoted to core `lintCssVars` (pure/bundler-agnostic) |
| `createPopover` under-powered | core `ca7ef8c` | forwards `platform`/`beforeCompute`/`flip`/`shift`/`freeze` |
| fixed-CB heuristic + drift diagnostic component-local | core `f36f72a`, ms `8055d6b` | moved to core `getFixedPositionOffsetParent` / `detectFixedDrift` |

Verification after all of the above: **core 177 + component 119 unit + 206 e2e +
builds** all green.

Remaining review minors (not done, low priority): `setSelected({ notify })` →
`shouldNotify`; component `test/unit/*` don't use the core `/testing` subpath (so
the `select`/`deselect`/`change` event surface is untested at the DOM level).

## What's NOT done

1. **Not yet published / tagged, and nothing is pushed.** `package.json` is at
   `2.0.0` but `npm publish` + a `v2.0.0` tag haven't run. Local, unpushed:
   web-multiselect `main` (release `d10f554` → `8055d6b`); core `prod` (the six
   enrichment/changelog commits). Push when ready.
2. **The demo sweep was console-level + a screenshot glance.** It catches thrown
   errors, warnings and gross layout breakage, not subtle visual regressions on
   the pages' non-default states (themes were eyeballed; per-page interactive
   toggles largely were not).

## Recommended next steps

1. Push `main`, tag `v2.0.0`, and `npm publish` when you're ready to ship.

## Gotchas worth remembering

- **Demos run `dist/`, not `/src`.** Source fixes are invisible on `examples-*.html`
  until `npm run build`. e2e/unit run against `/src` (dev server) and are the
  source of truth; demos lag.
- **The dev-only lint is stripped from `dist`** (`import.meta.env.DEV` → false in
  a build) — helps authors in dev, never nags shipped consumers.
- **Imperative methods flush pending writes** (`getSelected`/`setSelected`/
  `getValue`/`selectedValue`/`selectedItem`) so `el.prop = x; el.method()` stays
  synchronous. Reading rendered **DOM** after a property write still needs
  `await el.whenSettled()`.
