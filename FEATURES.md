# Feature inventory — `@keenmate/web-multiselect`

A complete, categorized list of every feature the web component exposes. The intent is to
hand this to wrapper packages (e.g. **`keen-web-multiselect`**, the Elixir/LiveView wrapper) so they
can track, per feature: **is it mapped/wrapped?** and **does the wrapper have an e2e test for it?**

How to use the matrix:

- **Surface** — how the feature is consumed: `attr` (HTML attribute), `prop` (JS property), `callback`
  (function property), `method` (instance method), `event` (DOM event), `css` (CSS custom property), or
  `markup` (declarative child elements).
- **Wrapped?** / **E2E?** — fill in `✅` / `❌` / `n/a` for your wrapper. They start blank.
- Names are the **exact** identifiers from the component source (`src/types.ts`,
  `src/web-component.ts` attribute table). Attributes are kebab-case; properties/callbacks are camelCase.

> Component version this inventory was generated against: **v1.12.0-rc04**, plus the current
> `[Unreleased]` changes (the callback→event rename — `onSelect`/`onDeselect`/`onChange`,
> `ActionButton.onClick`, `getIs*Callback` — and the `beforeSelect`/`beforeDeselect` interceptors).
> Re-check after each minor/feature release — new rows land in the attribute table
> (`src/web-component.ts`) and `MultiSelectConfig` (`src/types.ts`).

Legend for defaults: `bool(true)` = boolean, defaults on (only `="false"` disables);
`bool(false)` = boolean, defaults off (only `="true"` enables).

---

## 1. Data & options

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Static declarative options | markup | `<option value="..">Label</option>` | — | No JS required. Auto-wires `value`/`label` members | | |
| Declarative groups | markup | `<optgroup label="..">` | — | Auto-wires `group` member | | |
| Declarative per-option extras | markup | `data-icon`, `data-subtitle`, `disabled`, `selected` | — | Auto-wired when declarative children present | | |
| Dynamic list assignment | prop | `options` | — | `el.options = [...]` (objects, tuples, or custom) | | |
| Tuple options | prop | `options` (e.g. `[['js','JavaScript']]`) | — | `[key, value]` auto-detected | | |
| Arbitrary custom objects | prop | `options` + member/callbacks | — | Any shape via member props or callbacks | | |
| Value member | attr/prop | `value-member` / `valueMember` | — | Property name for value/ID extraction | | |
| Display value member | attr/prop | `display-value-member` / `displayValueMember` | — | Property name for label extraction | | |
| Search value member | attr/prop | `search-value-member` / `searchValueMember` | — | Property name searched against | | |
| Icon member | attr/prop | `icon-member` / `iconMember` | — | Property name for icon/emoji | | |
| Subtitle member | attr/prop | `subtitle-member` / `subtitleMember` | — | Property name for subtitle | | |
| Group member | attr/prop | `group-member` / `groupMember` | — | Property name for group | | |
| Disabled member | attr/prop | `disabled-member` / `disabledMember` | — | Property name for disabled flag | | |
| Value extraction callback | callback | `getValueCallback` | — | Complex value extraction | | |
| Display value callback | callback | `getDisplayValueCallback` | — | Complex label extraction | | |
| Search value callback | callback | `getSearchValueCallback` | — | Build searchable text per item | | |
| Icon callback | callback | `getIconCallback` | — | Computed icon per item | | |
| Subtitle callback | callback | `getSubtitleCallback` | — | Computed subtitle per item | | |
| Group callback | callback | `getGroupCallback` | — | Computed group per item | | |
| Disabled callback | callback | `getDisabledCallback` | — | Computed disabled state per item | | |
| Initial / pre-selected values | attr | `initial-values` (JSON array) | — | Consumed at init; or `<option selected>` | | |
| Add-new (tag creation) | attr + callback | `allow-add-new` + `addNewCallback` | `bool(false)` | Create options not in the list | | |

## 2. Async / hybrid search

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Async search callback | callback | `searchCallback(term, signal)` | — | `Promise<options[]>`; 2nd arg is `AbortSignal` | | |
| In-flight request cancellation | callback arg | `signal` on `searchCallback` | — | Aborted when superseded / min-length / destroy | | |
| Search debounce | attr/prop | `search-debounce` / `searchDebounce` | `0` | ms; coalesces keystroke bursts (async path only) | | |
| Minimum search length | attr/prop | `min-search-length` / `minSearchLength` | `0` | Below threshold = no async call | | |
| Pre-process search term | callback | `beforeSearchCallback(term)` | — | Transform/validate; return `null` to block | | |
| Hybrid (keep options on search) | attr/prop | `keep-options-on-search` / `isKeepOptionsOnSearch` | `bool(true)` | Keep initial options while async active | | |
| Loading message | attr/prop | `loading-message` / `loadingMessage` | `'Loading...'` | Shown during async fetch | | |
| Empty / no-results message | attr/prop | `empty-message` / `emptyMessage` | `'No results found'` | Shown when filtered list empty | | |

## 3. Search input & behavior

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Enable / disable search | attr/prop | `enable-search` / `isSearchEnabled` | `bool(true)` | Turns input into a plain picker when off | | |
| Search input mode | attr/prop | `search-input-mode` / `searchInputMode` | `'normal'` | `normal` \| `readonly` \| `hidden` | | |
| Search mode | attr/prop | `search-mode` / `searchMode` | `'filter'` | `filter` (hide non-matches) \| `navigate` (jump) | | |
| Search placeholder | attr/prop | `search-placeholder` / `searchPlaceholder` | `'Search...'` | Shown while search is usable | | |
| Select placeholder | attr/prop | `select-placeholder` / `selectPlaceholder` | `'Pick an option...'` | Shown when search disabled (picker mode) | | |
| No-data placeholder | attr/prop | `no-data-placeholder` / `noDataPlaceholder` | — | Opt-in; shown when option list empty (cascades) | | |
| Search hint | attr/prop | `search-hint` / `searchHint` | — | Hint text above input while open | | |

## 4. Selection / display modes

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Multiple vs single select | attr/prop | `multiple` / `isMultipleEnabled` | `bool(true)` | `="false"` for single-select | | |
| Badges display mode | attr/prop | `badges-display-mode` / `badgesDisplayMode` | `'badges'` | `badges`\|`count`\|`compact`\|`partial`\|`none` | | |
| Badges position | attr/prop | `badges-position` / `badgesPosition` | `'bottom'` | `top`\|`bottom`\|`left`\|`right` | | |
| Badges threshold | attr/prop | `badges-threshold` / `badgesThreshold` | — | Auto-switch display when exceeded | | |
| Badges threshold mode | attr/prop | `badges-threshold-mode` / `badgesThresholdMode` | `'count'` | `count` \| `partial` after threshold | | |
| Max visible badges (partial) | attr/prop | `badges-max-visible` / `badgesMaxVisible` | — | Limit before "+X more" badge | | |
| In-input counter badge | attr/prop | `show-counter` / `isCounterShown` | `bool(false)` | `[3]` next to toggle | | |
| Counter text callback (i18n) | callback | `getCounterCallback(count, moreCount?)` | — | Pluralization / "+X more" text | | |
| Read selected options | method | `getSelected()` | — | Returns option objects | | |
| Read selected value(s) | method | `getValue()` | — | Single value or array | | |
| Read selectedValue (single) | prop (get) | `selectedValue` | — | string \| number \| array \| null | | |
| Read selectedItem (single) | prop (get) | `selectedItem` | — | First selected object | | |
| Set selection programmatically | method | `setSelected(values[])` | — | By value/ID | | |
| Selected-items popover | behavior | "show selected" overflow popover | — | Opens a floating list of all selected when badges overflow / in `count`/`compact` modes | | |

## 5. Tooltips

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Enable badge tooltips | attr/prop | `enable-badge-tooltips` / `isBadgeTooltipsEnabled` | `bool(false)` | | | |
| Custom badge tooltip content | callback | `getBadgeTooltipCallback(item)` | — | string or HTMLElement | | |
| Custom remove-button tooltip | callback | `getRemoveButtonTooltipCallback(item)` | — | Per-item remove tooltip text | | |
| Remove-button tooltip format | attr/prop | `remove-button-tooltip-text` / `removeButtonTooltipText` | `'Remove {0}'` | `{0}` = item name | | |
| Tooltip placement | attr/prop | `badge-tooltip-placement` / `badgeTooltipPlacement` | `'top'` | Floating-UI placements | | |
| Tooltip delay | attr/prop | `badge-tooltip-delay` / `badgeTooltipDelay` | `100` | ms before show | | |
| Tooltip offset | attr/prop | `badge-tooltip-offset` / `badgeTooltipOffset` | `8` | px gap from badge | | |

## 6. Custom rendering

| Feature | Surface | Identifier | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|
| Custom dropdown option content | callback | `renderOptionContentCallback(item, ctx)` | HTML string or HTMLElement; ctx has index/selected/focused/matched/disabled | | |
| Custom badge content | callback | `renderBadgeContentCallback(item, ctx)` | ctx has displayMode/isInPopover | | |
| Custom selected-item content (popover) | callback | `renderSelectedItemContentCallback(item)` | Popover row rendering | | |
| Custom single-select display | callback | `renderSelectedContentCallback(item)` | Plain text, single-select | | |
| Custom group label content | callback | `renderGroupLabelContentCallback(groupName)` | HTML allowed | | |
| Custom badge display text | callback | `getBadgeDisplayCallback(item)` | Shorter badge text vs dropdown | | |
| Custom badge CSS class | callback | `getBadgeClassCallback(item)` | string or string[] | | |
| Custom selected-item CSS class | callback | `getSelectedItemClassCallback(item)` | Popover row classes | | |
| Inject custom CSS into Shadow DOM | callback | `customStylesCallback()` | Returns CSS string | | |

> ⚠️ Rendering callbacks accept **raw HTML** — the consumer (and wrapper) must sanitize
> user-generated content. See `docs/examples.md → HTML Injection (XSS) notice`.

## 7. Action buttons

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Action buttons config | prop | `actionButtons: ActionButton[]` | — | `select-all` / `clear-all` / `custom` | | |
| Custom action onClick | callback | `ActionButton.onClick(ms)` | — | Required for `custom` | | |
| Dynamic visibility | callback | `ActionButton.getIsVisibleCallback(ms)` | — | Overrides static `isVisible` | | |
| Dynamic disabled | callback | `ActionButton.getIsDisabledCallback(ms)` | — | Overrides static `isDisabled` | | |
| Dynamic text | callback | `ActionButton.getTextCallback(ms)` | — | | | |
| Dynamic class | callback | `ActionButton.getClassCallback(ms)` | — | | | |
| Dynamic tooltip | callback | `ActionButton.getTooltipCallback(ms)` | — | | | |
| Sticky actions | attr/prop | `sticky-actions` / `isActionsSticky` | `bool(true)` | Fixed at top while scrolling | | |
| Actions layout | attr/prop | `actions-layout` / `actionsLayout` | `'nowrap'` | `nowrap` \| `wrap` | | |

## 8. Grouping & checkboxes

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Enable grouping | attr/prop | `allow-groups` / `isGroupsAllowed` | `bool(true)` | | | |
| Show checkboxes | attr/prop | `show-checkboxes` / `isCheckboxesShown` | `bool(true)` | Multi-select only | | |
| Checkbox alignment | attr/prop | `checkbox-align` / `checkboxAlign` | `'center'` | `top` \| `center` \| `bottom` | | |
| Disabled-option behavior | behavior | `disabled-member` / `getDisabledCallback` | — | Disabled options are non-selectable + get `.ms__option--disabled` (e2e: `disabled.spec.ts`) | | |

## 9. Virtual scrolling

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Enable virtual scroll | attr/prop | `enable-virtual-scroll` / `isVirtualScrollEnabled` | `bool(false)` | | | |
| Virtual scroll threshold | attr/prop | `virtual-scroll-threshold` / `virtualScrollThreshold` | `100` | Min items before activating | | |
| Option height | attr/prop | `option-height` / `optionHeight` | `50` | px; required for virtual scroll | | |
| Badge height (popover) | prop | `badgeHeight` | `36` | px; popover virtual scroll | | |
| Virtual scroll buffer | attr/prop | `virtual-scroll-buffer` / `virtualScrollBuffer` | `10` | Extra rows above/below viewport | | |

## 10. Dropdown layout & behavior

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Close on select | attr/prop | `close-on-select` / `isCloseOnSelect` | `bool(false)` | | | |
| Auto-positioning (Floating UI) | behavior | dropdown / popover / tooltip placement | — | Auto-flip + overflow-escape (e2e: `positioning.spec.ts`, `floating-panels.spec.ts`) | | |
| Lock placement | attr/prop | `lock-placement` / `isPlacementLocked` | `bool(true)` | Prevent flip after first open | | |
| Keep search on close | attr/prop | `should-keep-search-on-close` / `shouldKeepSearchOnClose` | `bool(true)` | Preserve text + filtered results | | |
| Dropdown min width | attr/prop | `dropdown-min-width` / `dropdownMinWidth` | — | e.g. `'20rem'` | | |
| Dropdown max width | attr/prop | `dropdown-max-width` / `dropdownMaxWidth` | — | e.g. `'40rem'` | | |
| Dropdown max height | attr/prop | `max-height` / `maxHeight` | `'20rem'` | | | |

## 11. Form integration

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Form field name | attr/prop | `name` / `formFieldId` | — | Creates hidden input(s) in light DOM | | |
| Value format | attr/prop | `value-format` / `valueFormat` | `'json'` | `json` \| `csv` \| `array` | | |
| Custom value format | callback | `getValueFormatCallback(values)` | — | Custom serialization | | |

## 12. Events & selection interceptors

Fire-and-forget notifications are **events** — available both as bubbling DOM `CustomEvent`s and as
`on*` event-handler properties (the property is the twin of the event; the return value is ignored).
`before*Callback`s are **interceptors** — their return value *is* consumed, so they can veto an action.

| Feature | Surface | Identifier | Detail | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Select event | event | `select` | `{ option, selectedOptions, selectedValues }` | bubbles + composed | | |
| Deselect event | event | `deselect` | `{ option, selectedOptions, selectedValues }` | bubbles + composed | | |
| Change event | event | `change` | `{ selectedOptions, selectedValues }` | bubbles + composed; fires on every selection change | | |
| Ready event | event | `ready` | — | bubbles + composed; fires once, right after the first build (see §13 `defer`) | | ✓ `defer-gate` |
| Select handler (event prop) | prop | `onSelect(option)` | — | Property twin of the `select` event (fire-and-forget) | | |
| Deselect handler (event prop) | prop | `onDeselect(option)` | — | Property twin of the `deselect` event | | |
| Change handler (event prop) | prop | `onChange(selectedOptions)` | — | Property twin of the `change` event | | |
| Block a selection (interceptor) | callback | `beforeSelectCallback(option, selectedOptions)` | returns `boolean` \| `void` | `false` vetoes; silent (no event). Bypassed by `setSelected` / Select-All. (e2e: `before-select` unit) | | |
| Block a deselection (interceptor) | callback | `beforeDeselectCallback(option, selectedOptions)` | returns `boolean` \| `void` | `false` vetoes; covers dropdown toggle + badge × + popover × + remove-hidden. Bypassed by `setSelected` / Clear-All | | |

## 13. Public methods & lifecycle

| Feature | Surface | Identifier | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|
| Batch attribute update | method | `setAttributes(attrs)` | One in-place render for many attrs; `null`/`false` removes, `true` → `""` | | |
| Get selected options | method | `getSelected()` | | | |
| Set selected | method | `setSelected(values[])` | | | |
| Get value | method | `getValue()` | | | |
| Destroy | method | `destroy()` | Cleanup / teardown | | |
| Defer first render | attr | `defer` | Present = build nothing on upgrade (reserve space only); wire options/callbacks/listeners first, then release. Closes the upgrade-then-restyle flash | | ✓ `defer-gate` |
| Release the render gate | method | `ready()` | Build once with everything in place; latched (never re-closes). Removing the `defer` attribute releases it too (server-driven) | | ✓ `defer-gate` |
| Readiness state | prop/attr | `isReady` / reflected `is-ready` | `true` once built; CSS hook `:host([defer]:not([is-ready]))` reserves space while held | | ✓ `defer-gate` |
| Live attribute reactivity | behavior | `attributeChangedCallback` | Most attrs update in place (no teardown); good for i18n / cascades | | |

## 14. Theming, styling & i18n

| Feature | Surface | Identifier | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|
| CSS custom properties | css | `--ms-*` (see `component-variables.manifest.json`) | Full theming surface | | |
| Global scaling | css | `--ms-rem` | Default `10px`; scale whole component | | |
| Theme-designer integration | css | `--base-*` variables | Reads page-level typography/colors if present | | |
| Dark mode — class on host | css | `.dark` / `:host(.dark)` | One of 5 dark-mode activation paths | | |
| Dark mode — ancestor theme class | css | `:host-context([data-theme="dark"])` | Framework theme class | | |
| Dark mode — per-instance attribute | attr/css | `data-theme="dark"` / `"light"` | Highest specificity, per-element | | |
| RTL support | attr | `dir="rtl"` (on host or ancestor) | Auto-detected; mirrors layout | | |
| Empty/loading state min-height | css | `--ms-state-min-height` | Shared footprint so dropdown doesn't jump between "No data" and "Loading" | | |
| i18n of all user-facing strings | attr | placeholders, messages, tooltips, counter | All text is attribute/callback driven and reactive | | |

## 15. Developer tooling — debug & logging

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Debug info panel | attr | `show-debug-info` | `false` (off) | Renders `.ms__debug-info` stats panel; toggles live without rebuild | | |
| Enable all logging | method (module) | `enableLogging()` | silent | Sets all loggers to `debug` | | |
| Disable all logging | method (module) | `disableLogging()` | — | Sets all loggers to `silent` | | |
| Set global log level | method (module) | `setLogLevel(level)` | `'silent'` | `trace`\|`debug`\|`info`\|`warn`\|`error`\|`silent` | | |
| Per-category log level | method (module) | `setCategoryLevel(category, level)` | — | Categories: `INIT`, `DATA`, `UI`, `INTERACTION` (bare or `MULTISELECT:`-prefixed) | | |
| Global logging API exposure | global | `window.components['web-multiselect']` | — | Same logging fns exposed on `window` for runtime control (e2e: `logging.spec.ts`) | | |

> Logging defaults to **silent** and the chosen level persists (localStorage via loglevel), so a wrapper
> can flip it at runtime without a reload. These are module exports from the package entry, not element
> methods.

## 16. Accessibility

| Feature | Surface | Identifier | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|
| Full keyboard navigation | behavior | Arrow/Enter/Esc/Ctrl+A | Open, navigate, select, select-all, close | | |
| ARIA labels on controls | behavior | `aria-label` on remove/close/clear buttons | | | |
| See accessibility doc | reference | `docs/accessibility.md` | Keyboard model, ARIA, focus behavior | | |

---

### Cross-references

- **Attributes / properties / methods / events table:** `docs/usage.md`
- **Theming variables:** `docs/theming.md` + `component-variables.manifest.json`
- **Cookbook (async, virtual scroll, custom rendering, forms):** `docs/examples.md`
- **Events, `on*` handlers & interceptors (live demos):** `examples-events-callbacks.html`
- **Accessibility:** `docs/accessibility.md`
- **Source of truth for attributes:** `ATTRIBUTE_TABLE` in `src/web-component.ts`
- **Source of truth for config/callbacks:** `MultiSelectConfig<T>` in `src/types.ts`
