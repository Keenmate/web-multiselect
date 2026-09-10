# E2E Test Coverage Checklist

Tracks which features of `web-multiselect` have end-to-end test coverage in
`e2e/`. Each row is one user-observable feature. Status legend:

- `✗` — no coverage
- `△` — partial coverage (some paths)
- `✓` — covered

When a row is marked `✓`/`△`, the **Spec** column points at the file under
`e2e/` that exercises it, and **Fixture** at the dedicated HTML page under
`test/` (the spec hits no example pages, only fixtures).

---

## 1. Selection & multiplicity

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Single-select mode (`multiple="false"`)                       | ✓      | `selection.spec.ts`          | `selection.html`          |
| Multi-select mode (default)                                   | ✓      | `selection.spec.ts`          | `selection.html`          |
| Clicking an option toggles selection                          | ✓      | `selection.spec.ts`          | `selection.html`          |
| `close-on-select` closes after each selection                 | ✓      | `selection.spec.ts`          | `selection.html`          |
| `show-checkboxes="false"` hides checkboxes                    | ✓      | `selection.spec.ts`          | `selection.html`          |
| Initial values via `initial-values` attr                      | ✓      | `selection.spec.ts`          | `selection.html`          |
| `data-options` attribute (HTML-only setup, no JS)             | ✓      | `selection.spec.ts`          | `selection.html`          |
| Initial values via programmatic `selectedValues` setter       | ✗      |      |         |
| Selected option styling (`.ms__option--selected`)             | ✓      | `selection.spec.ts`          | `selection.html`          |

## 2. Badges display

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `badges-display-mode="badges"` (default)                      | ✓      | `badges.spec.ts`             | `badges.html`             |
| `badges-display-mode="count"` shows count badge in input      | ✓      | `badges.spec.ts`             | `badges.html`             |
| `badges-display-mode="compact"` shows first + "+N more"       | ✓      | `badges.spec.ts`             | `badges.html`             |
| `badges-display-mode="partial"` shows up to `badges-max-visible` | ✓    | `badges.spec.ts`             | `badges.html`             |
| `badges-display-mode="none"` hides badges entirely            | ✓      | `badges.spec.ts`             | `badges.html`             |
| `badges-position="top"` / `"bottom"` / `"left"` / `"right"`   | ✓      | `badges.spec.ts`             | `badges.html`             |
| `badges-threshold` auto-switches badges → count               | ✓      | `badges.spec.ts`             | `badges.html`             |
| `badges-threshold-mode="partial"` shows partial badges + more | ✓      | `badges.spec.ts`             | `badges.html`             |
| Badge X button removes the item                               | ✓      | `badges.spec.ts`             | `badges.html`             |
| Clicking count badge opens selected-items popover             | ✓      | `badges.spec.ts`             | `badges.html`             |

## 3. Search behavior

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Default filter mode hides non-matching options                | ✓      | `search.spec.ts`             | `search.html`             |
| `search-mode="navigate"` keeps options visible, jumps to match | ✓     | `search.spec.ts`             | `search.html`             |
| `search-input-mode="readonly"` disables typing                | ✓      | `search.spec.ts`             | `search.html`             |
| `search-input-mode="hidden"` hides input entirely             | ✓      | `search.spec.ts`             | `search.html`             |
| `enable-search="false"` disables search subsystem             | ✓      | `search.spec.ts`             | `search.html`             |
| Empty result shows `empty-message`                            | ✓      | `search.spec.ts`             | `search.html`             |
| `min-search-length` defers search until threshold             | ✓      | `search.spec.ts`             | `search.html`             |
| `searchCallback` async loading + loading message              | ✓      | `search.spec.ts`             | `search.html`             |
| `keep-options-on-search` retains options when search clears   | ✓      | `search.spec.ts`             | `search.html`             |
| `should-keep-search-on-close` retains search on close         | ✓      | `search.spec.ts`             | `search.html`             |
| `beforeSearchCallback` pre-processes / blocks search          | ✓      | `search.spec.ts`             | `search.html`             |

## 4. Floating panels (dropdown, hint, selected popover)

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Dropdown opens below input by default                         | ✓      | `positioning.spec.ts`        | `positioning.html`        |
| Dropdown flips above when no room below                       | ✓      | `positioning.spec.ts`        | `positioning.html`        |
| `lock-placement="false"` re-flips on every update             | ✗      |      |         |
| `dropdown-min-width` / `dropdown-max-width`                   | ✓      | `positioning.spec.ts`        | `positioning.html`        |
| Dropdown escapes `overflow:auto` ancestor (SPFx fix)          | ✓      | `floating-panels.spec.ts`    | `floating-panels.html`    |
| Search hint escapes `overflow:auto` ancestor                  | ✓      | `floating-panels.spec.ts`    | `floating-panels.html`    |
| Selected-items popover escapes `overflow:auto` ancestor       | △      | `floating-panels.spec.ts`    | `floating-panels.html`    |
| Panel stays anchored to input on outer scroll                 | ✓      | `positioning.spec.ts`        | `positioning.html`        |
| Outside click closes dropdown                                 | ✓      | `positioning.spec.ts`        | `positioning.html`        |

## 5. Virtual scrolling

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `enable-virtual-scroll` activates at `virtual-scroll-threshold` | ✓    | `virtual-scroll.spec.ts`     | `virtual-scroll.html`     |
| `option-height` applied to virtual options                    | ✓      | `virtual-scroll.spec.ts`     | `virtual-scroll.html`     |
| `badge-height` applied to virtual badges in popover           | ✓      | `virtual-scroll.spec.ts`     | `virtual-scroll.html`     |
| `virtual-scroll-buffer` renders extra above/below             | ✓      | `virtual-scroll.spec.ts`     | `virtual-scroll.html`     |
| Search resets scroll position when results change             | ✓      | `virtual-scroll.spec.ts`     | `virtual-scroll.html`     |
| Scroll preserves keyboard focus visibility                    | ✗      |      |         |

## 6. Keyboard navigation

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Down/Up arrows move focused index                             | ✓      | `keyboard.spec.ts`           | `keyboard.html`           |
| Home/End jump to first/last option                            | ✓      | `keyboard.spec.ts`           | `keyboard.html`           |
| PageDown/PageUp move 10 options                               | ✓      | `keyboard.spec.ts`           | `keyboard.html`           |
| Enter toggles focused option's selection                      | ✓      | `keyboard.spec.ts`           | `keyboard.html`           |
| Escape clears search (or closes if empty)                     | ✓      | `keyboard.spec.ts`           | `keyboard.html`           |
| Tab leaves the component cleanly                              | ✗      |      |         |
| Navigate-mode: Ctrl/Cmd + ↓ jumps to next match               | △      | `keyboard.spec.ts`           | `keyboard.html`           |
| Navigate-mode: Ctrl/Cmd + ↑ jumps to previous match           | ✗      |      |         |
| Focused option scrolls into view                              | ✓      | `keyboard.spec.ts`           | `keyboard.html`           |
| Focused option highlight only on the focused one (grouped)    | ✓      | `keyboard.spec.ts`           | `keyboard.html`           |

## 7. Action buttons

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| Built-in `select-all` selects all visible options             | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Built-in `clear-all` clears all selections                    | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Custom action button fires `onClick`                          | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| `getIsVisibleCallback` hides button dynamically                  | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| `getIsDisabledCallback` disables button dynamically              | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| `getTextCallback` / `getClassCallback` / `getTooltipCallback` | ✗      |      |         |
| Action button tooltip shows on hover                          | ✗      |      |         |
| `sticky-actions` keeps actions pinned while scrolling         | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| `actions-layout="wrap"` wraps buttons to multiple rows        | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Select-all fires per-item `onSelect`                    | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |
| Clear-all fires per-item `onDeselect`                   | ✓      | `action-buttons.spec.ts`     | `action-buttons.html`     |

## 8. Groups

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `group-member` groups options by property                     | ✓      | `groups.spec.ts`             | `groups.html`             |
| `allow-groups="false"` disables grouping                      | ✓      | `groups.spec.ts`             | `groups.html`             |
| `renderGroupLabelContentCallback` custom group label          | ✓      | `groups.spec.ts`             | `groups.html`             |
| Group label sticks at top of dropdown during scroll           | ✗      |      |         |

## 9. Disabled state

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `disabled-member` marks specific options unselectable         | ✓      | `disabled.spec.ts`           | `disabled.html`           |
| Disabled option ignores click                                 | ✓      | `disabled.spec.ts`           | `disabled.html`           |
| Disabled option ignores keyboard select                       | ✓      | `disabled.spec.ts`           | `disabled.html`           |
| Disabled component (entire control)                           | ✗      |      |         |

## 10. Add new

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `allow-add-new` reveals "Add new" affordance                  | ✗      |      |         |
| `addNewCallback` injects new option + selects it              | ✓      | `add-new.spec.ts`            | `add-new.html`            |
| Enter creates new when no matches exist                       | ✓      | `add-new.spec.ts`            | `add-new.html`            |

## 11. Form integration

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `name` attribute creates hidden form input(s)                 | ✓      | `form.spec.ts`               | `form.html`               |
| `value-format="json"` (default) serialization                 | ✓      | `form.spec.ts`               | `form.html`               |
| `value-format="csv"` serialization                            | ✓      | `form.spec.ts`               | `form.html`               |
| `value-format="array"` (multiple hidden inputs)               | ✓      | `form.spec.ts`               | `form.html`               |
| `getValueFormatCallback` overrides serialization              | ✓      | `form.spec.ts`               | `form.html`               |
| Form `reset` clears selections (formAssociated + formResetCallback) | ✓ | `form.spec.ts`               | `form.html`               |

## 12. Tooltips

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `enable-badge-tooltips` shows badge tooltip on hover          | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| `getBadgeTooltipCallback` custom tooltip content              | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| Remove-button tooltip                                         | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |
| `badge-tooltip-placement` / `-delay` / `-offset`              | ✗      |      |         |
| Tooltips use `position:fixed` (escape overflow)               | ✓      | `tooltips.spec.ts`           | `tooltips.html`           |

## 13. Custom rendering

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `renderOptionContentCallback` custom option markup            | ✓      | `custom-rendering.spec.ts`   | `custom-rendering.html`   |
| `renderBadgeContentCallback` custom badge markup              | ✓      | `custom-rendering.spec.ts`   | `custom-rendering.html`   |
| `renderSelectedItemContentCallback` (popover items)           | ✗      |      |         |
| `renderSelectedContentCallback` (single-select display)       | ✗      |      |         |
| `getBadgeClassCallback` adds custom classes                   | ✓      | `custom-rendering.spec.ts`   | `custom-rendering.html`   |
| `getSelectedItemClassCallback` adds classes in popover        | ✗      |      |         |
| `customStylesCallback` injects styles into Shadow DOM         | ✓      | `custom-rendering.spec.ts`   | `custom-rendering.html`   |
| `iconMember` / `subtitleMember` rendered in options           | ✓      | `custom-rendering.spec.ts`   | `custom-rendering.html`   |

## 14. Counter badge (in input)

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `show-counter` displays count next to toggle                  | ✓      | `counter.spec.ts`            | `counter.html`            |
| Counter click opens selected-items popover                    | ✓      | `counter.spec.ts`            | `counter.html`            |
| `getCounterCallback` formats count text (i18n)                | ✓      | `counter.spec.ts`            | `counter.html`            |
| `show-clear` ✕ appears only while something is selected       | ✓      | `clear-button.spec.ts`       | `clear-button.html`       |
| Clicking ✕ wipes the selection and fires one `change`         | ✓      | `clear-button.spec.ts`       | `clear-button.html`       |
| ✕ single-select clears value + input; absent without opt-in   | ✓      | `clear-button.spec.ts`       | `clear-button.html`       |

## 15. Events & API

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `select` event with full detail                               | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `deselect` event with full detail                             | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `change` event fires once per bulk operation                  | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `onSelect` / `onDeselect` / `onChange`      | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `selectedValues` setter populates selection (no setter today) | ✗      |      |         |
| `options` setter replaces options                             | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `updateOptions(partial)` updates without rebuilding DOM       | ✗      |      |         |
| Attribute changes update without losing selection             | ✓      | `events-api.spec.ts`         | `events-api.html`         |
| `open()` from a consumer click opens and stays open           | ✓      | `open-close-api.spec.ts`     | `open-close-api.html`     |
| `close()` / `toggle()` drive the dropdown                     | ✓      | `open-close-api.spec.ts`     | `open-close-api.html`     |
| `isOpen` property get/set                                     | ✓      | `open-close-api.spec.ts`     | `open-close-api.html`     |

## 16. Sizing & theming

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `--ms-rem` scales the whole component                         | ✓      | `theming.spec.ts`            | `theming.html`            |
| Individual `--ms-*` variable overrides                        | ✓      | `theming.spec.ts`            | `theming.html`            |
| `--base-*` theme variables flow through                       | ✓      | `theming.spec.ts`            | `theming.html`            |
| `--base-hover-bg` drives `--ms-primary-bg` (option hover)     | ✓      | `theming.spec.ts`            | `theming.html`            |
| `customStylesCallback` injects valid Shadow-DOM styles        | ✓      | `custom-rendering.spec.ts`   | `custom-rendering.html`   |

## 17. RTL

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `dir="rtl"` flips layout                                      | ✓      | `rtl.spec.ts`                | `rtl.html`                |
| Badge X position correct in RTL                               | ✗      |      |         |
| Dropdown alignment correct in RTL                             | ✗      |      |         |

## 18. Logging

| Feature                                                       | Status | Spec | Fixture |
| ------------------------------------------------------------- | :----: | ---- | ------- |
| `setLogLevel` propagates to child loggers (no reload needed)  | ✓      | `logging.spec.ts`            | `logging.html`            |
| `setCategoryLevel('UI', ...)` normalizes bare names           | ✓      | `logging.spec.ts`            | `logging.html`            |
| Default level is silent; persisted level survives reload      | △      | `logging.spec.ts`            | `logging.html`            |
