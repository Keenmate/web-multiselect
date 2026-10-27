# Test infrastructure notes

Running notes from setting up the e2e harness. Each entry is something I noticed
while building fixtures + specs that looks like a bug, friction point, or
worth-revisiting design decision in the component itself — not a problem with
the tests.

---

## 1. ~~`initial-values` is fully non-functional when `options` are assigned after init~~ — FIXED in 1.10.0

**Where:** `src/multiselect.ts:1616` — `parseInitialSelection()` is called once
in `init()` (line 241), runs synchronously at construction, and only populates
`selectedOptions` for values that already appear in `allOptions` at that
moment. `selectedValues` does get populated (orphaned from the matching
option object).

**Severity:** Higher than initially noted. `getValue()` (`multiselect.ts:2014`)
reads from `selectedOptions`, not `selectedValues`. So when options arrive
late, `getValue()` returns `[]` even though `selectedValues` contains the
initial-values entries. The public API reports no selection — the feature is
broken end-to-end, not just the popover body.

**Symptom I hit:**
- `<web-multiselect initial-values='["banana"]'>` + JS-assigned options
  later → `el.getValue()` returns `[]`
- Count badge reads `selectedValues.size` so it shows phantom "1 selected"
- Selected-items popover header reads `selectedValues.size` ("Selected Items (1)")
  but body is empty (reads from `selectedOptions`)
- Badges in main display read from `selectedOptions` so none render

These states derived from different fields stay out of sync forever unless
something re-runs the reconciliation.

**Where it bites users:** Any consumer who uses `initial-values` declaratively
but sources `options` from anywhere other than `data-options` (JS property
assignment, `searchCallback`, async fetch) ends up with phantom selections
that the API claims don't exist.

**Test status:** `e2e/selection.spec.ts` has the `initial-values` test
marked `test.fixme` — it'll start passing automatically when the bug is
fixed, alerting the next contributor to remove the `fixme`.

**Possible fixes (pick one):**
- In the `options` property setter, re-run a reconciliation pass: for every
  `selectedValues` entry not in `selectedOptions`, look it up in the new
  `allOptions` and populate.
- Document that `initial-values` is only honored when `options` are present at
  init (e.g., via `data-options` — but that has its own issue, see #2).
- Provide a public `setSelectedValues(values)` API that's explicit about doing
  the lookup against current `allOptions`.

I'd lean toward option 1 — it matches user expectations (the API surface for
both `initial-values` and `options` is declarative) and the cost is one
`forEach` on assignment, which is cheap.

---

## 2. ~~No `data-options` attribute on the web component layer~~ — FIXED in 1.10.0

**Where:** `src/web-component.ts` — `initializePicker()` builds the `options`
config object from typed setters and the attribute table, but it doesn't read
a `data-options` attribute off the host element. The inner `WebMultiSelect`
class *does* read `this.element.dataset.options` at `multiselect.ts:252`, but
`this.element` there is the inner container `<div>`, not the
`<web-multiselect>` custom element. The web component layer never copies the
host's `data-options` onto the container.

**Symptom I hit:** I tried to work around #1 by putting `data-options='[...]'`
directly on `<web-multiselect>` in the fixture so the inner picker would have
options at init time and `parseInitialSelection` could resolve. The attribute
was silently ignored. Only `element.options = [...]` works.

**Where it bites users:** HTML-only or server-rendered usage (no inline
`<script>`) can't supply options. You can give the component its display
config (`badges-display-mode`, `value-member`, etc.) declaratively, but the
*data* requires JavaScript.

**Possible fix:** In `initializePicker`, copy `data-options` from the host to
the inner container *or* parse it directly into the config:

```ts
const dataOptions = this.getAttribute('data-options');
if (dataOptions && !options.options) {
    try {
        options.options = JSON.parse(dataOptions);
    } catch (e) { ... }
}
```

Combined with the fix from #1, this would make the count-mode + pre-selection
scenario fully declarative.

---

## 3. ~~Search hint stays anchored when the dropdown opens (doc drift)~~ — FIXED in 1.10.0

**Where:** `src/multiselect.ts` — `positionHint()` runs only when the dropdown
opens (in `open()`), and the hint visibility is gated on `searchHint` being
set + the dropdown being open.

**What I noticed:** The hint never appears unless the dropdown is open. That's
intentional based on the variable name (`searchHint` — a label for the search
input area), but it's worth flagging because the comment "hint shown above the
input when focused" in `types.ts:228` suggests it appears on input focus, not
on dropdown open. The actual behavior is dropdown-open-driven.

**Action:** Just a documentation drift. Update the comment in `types.ts` to
match the code, or change the code to fire on focus if that's actually
desired.

---

## 4. ~~Enter key bypasses disabled state on options~~ — FIXED in 1.10.0

**Where:** `src/multiselect.ts:1085-1093` — the Enter handler calls
`toggleOption(filteredOptions[focusedIndex])` unconditionally. `toggleOption`
itself (line 1328) doesn't inspect `isDisabledMember` / `getDisabledCallback`.

The click handler at `multiselect.ts:1157` correctly checks
`!option.classList.contains('ms__option--disabled')` before calling
`toggleOption`, so mouse interaction respects the disabled state. Keyboard
doesn't.

**Symptom I hit:** With `is-disabled-member="disabled"` and Banana flagged
disabled, pressing ArrowDown twice (focusing Banana) and then Enter selects
Banana — even though clicking it is silently ignored.

**Possible fix:**
- Move the `disabled` check into `toggleOption` so both code paths are
  covered, OR
- Add the click-handler-style check in the Enter branch.

The first option is more defensive. There may also be an argument for
*skipping* disabled options during arrow navigation entirely so they don't
become focusable — but that's a UX call, not a bug.

**Test status:** `e2e/disabled.spec.ts` "Enter on disabled focused option"
is `test.fixme`-marked.

---

## 5. ~~Form `reset()` doesn't clear the multiselect's internal state~~ — FIXED in 1.10.0

**Where:** No code path — there's no `formAssociatedCallback` /
`formResetCallback` handler registered on the custom element, and the hidden
inputs are stamped from the picker's selectedOptions state, not the other
way around. A form reset clears the hidden input's `value` attribute (well,
to its default), but the picker still has its `selectedOptions` populated
and will re-write the hidden input on its next render.

**Symptom I hit:** Selected Apple in a `<form>`-wrapped picker, called
`form.reset()`. The hidden input retained `'["apple"]'` — neither the
selection nor the form data was cleared.

**Where it bites users:** Anyone integrating the component into a
traditional HTML form (server-rendered apps, plain-HTML usage). The
"reset" button is a normal form expectation that silently doesn't work.

**Possible fix:** Make the element form-associated (ElementInternals API),
implement `formResetCallback` to clear `selectedValues` /
`selectedOptions`, and re-render. This also enables proper form state
integration (validity, name auto-tracking, etc.).

**Test status:** `e2e/form.spec.ts` "form reset" documents the current
no-op behavior. Update the assertion when fixed.

---

## 6. Fixture-only: count-mode count badge has no obvious test selector

**Where:** The count badge in count-mode is rendered via
`renderBadgeHTML(option, { displayMode: 'count', ... })` and ends up with
class `ms__badge` plus `data-action="show-selected"`. I used
`.ms__badge[data-action="show-selected"]` as the click target in
`floating-panels.spec.ts`, which works.

**Not a bug, just worth recording** so future specs know the selector. The
remove (X) button on regular badges is `.ms__badge-remove`. The "+N more"
badge is also `data-action="show-selected"`. The compact badge that opens the
popover is the same — `data-action="show-selected"` is the right
disambiguator across all popover-opening badge variants.

---

## Format for future entries

When you find something while writing the next set of fixtures, add a section
like above:

```
## N. One-line summary of the issue
**Where:** file:line that's the source of the behavior
**Symptom I hit:** what made you notice
**Where it bites users:** why this matters for consumers
**Possible fix:** what would address it
```

Goal is to keep these notes actionable: each entry should let someone (or
future-me) skim and either fix or close-out without re-deriving the diagnosis.
