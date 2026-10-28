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

> Component version this inventory was generated against: **v1.12.0-rc04**, updated for the
> `[Unreleased]` interaction-model change (CHANGELOG): every callback takes ONE `ctx` argument
> (per-option callbacks read `ctx.option`; `ctx.controller` / `ctx.element` are always present), `on*`
> properties receive the event detail, before-hooks cancel with `false`, action buttons are core
> action items (`MultiSelectActionItem`) and every activation fires the `action` event.
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
| Disabled member | attr/prop | `is-disabled-member` / `isDisabledMember` | — | Property name for disabled flag | | |
| Value extraction callback | callback | `getValueCallback({ option })` | — | Complex value extraction | | |
| Display value callback | callback | `getDisplayValueCallback({ option })` | — | Complex label extraction | | |
| Search value callback | callback | `getSearchValueCallback({ option })` | — | Searchable text per item (string for internal search; an object for your own `searchCallback`). Computed once per item | | |
| Icon callback | callback | `getIconCallback({ option })` | — | Computed icon per item | | |
| Subtitle callback | callback | `getSubtitleCallback({ option })` | — | Computed subtitle per item | | |
| Group callback | callback | `getGroupCallback({ option })` | — | Computed group per item | | |
| Disabled callback | callback | `getIsDisabledCallback({ option })` | — | Computed disabled state per item | | |
| Initial / pre-selected values | attr | `initial-values` (JSON array) | — | Consumed at init; or `<option selected>` | | |
| Add-new (tag creation) | attr + callback | `allow-add-new` + `beforeAddCallback({ value })` | `bool(false)` | Create options not in the list — return the option (appended + selected), `false` cancels, nothing → only the `add` event | | |

## 2. Async / hybrid search

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Custom search callback | callback | `searchCallback({ term, signal, entries })` | — | Sync or async `options[]`; `signal` is an `AbortSignal`; `term` = the typed text or the `getSearchTermCallback` result, `entries` = options paired with their search values | | |
| In-flight request cancellation | callback arg | `signal` on `searchCallback` | — | Aborted when superseded / min-length / destroy | | |
| Search debounce | attr/prop | `search-debounce` / `searchDebounce` | `0` | ms; coalesces keystroke bursts (async path only) | | |
| Minimum search length | attr/prop | `min-search-length` / `minSearchLength` | `0` | Below threshold = no async call | | |
| Pre-process search term | callback | `beforeSearchCallback({ term })` | — | Return a string to replace the term, `false` to skip the search | | |
| Prepare search term | callback | `getSearchTermCallback({ term, target, behavior, match })` | — | Return a string / RegExp (internal) or anything (`searchCallback`, as `ctx.searchTerm`) | | |
| Search normalization helper | export | `normalizeSearchText(text, behavior?)` | — | The standard normalization, for custom search | | |
| Hybrid (keep options on search) | attr/prop | `keep-options-on-search` / `shouldKeepOptionsOnSearch` | `bool(true)` | Keep initial options while async active | | |
| Searching message | labels | `labels.searching` | `'Searching…'` | Shown while an async search is in flight | | |
| No-data message | labels | `labels.noData` | `'No data'` | Dropdown text when there are no options at all | | |
| No-results message | labels | `labels.noResults` | `'No results found'` | Options exist but the search matched nothing | | |
| Missing display value | labels | `labels.noDisplayValue` | `'[N/A]'` | Shown for an option without a display value | | |

## 3. Search input & behavior

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Enable / disable search | attr/prop | `enable-search` / `isSearchEnabled` | `bool(true)` | Turns input into a plain picker when off | | |
| Search input mode | attr/prop | `search-input-mode` / `searchInputMode` | `'normal'` | `normal` \| `readonly` \| `hidden` | | |
| Search mode | attr/prop | `search-mode` / `searchMode` | `'filter'` | `filter` (hide non-matches) \| `navigate` (jump) | | |
| Search behavior | attr/prop | `search-behavior` / `searchBehavior` | `'normalized'` | `normalized` (ignore case + diacritics) \| `case-insensitive` \| `exact`; internal search only | | |
| Search match | attr/prop | `search-match` / `searchMatch` | `'contains'` | `contains` \| `equals` \| `starts-with` \| `word-starts-with` \| `ends-with` \| `word-ends-with` \| `regex` (raw value, no normalization) | | |
| Search placeholder | labels | `labels.searchPlaceholder` | `'Search…'` | Shown while search is usable | | |
| Select placeholder | labels | `labels.selectPlaceholder` | `'Pick an option…'` | Shown when search disabled (picker mode) | | |
| No-data placeholder | labels | `labels.noDataPlaceholder` | — | Opt-in; shown when option list empty (cascades) | | |
| Search hint | labels | `labels.searchHint` | — | Hint text above input while open | | |

## 4. Selection / display modes

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Multiple vs single select | attr/prop | `multiple` / `isMultiple` | `bool(true)` | `="false"` for single-select | | |
| Disabled control | attr/prop | `disabled` / `isDisabled` | `bool(false)` | No interaction, not focusable, not submitted; `<fieldset disabled>` too | | ✓ `control-state` |
| Read-only control | attr/prop | `readonly` / `isReadonly` | `bool(false)` | No selection change / no dropdown; focusable, submitted | | ✓ `control-state` |
| Badges display mode | attr/prop | `badges-display-mode` / `badgesDisplayMode` | `'badges'` | `badges`\|`count`\|`compact`\|`partial`\|`none` | | |
| Badges position | attr/prop | `badges-position` / `badgesPosition` | `'bottom'` | `top`\|`bottom`\|`left`\|`right` | | |
| Badges threshold | attr/prop | `badges-threshold` / `badgesThreshold` | — | Auto-switch display when exceeded | | |
| Badges threshold mode | attr/prop | `badges-threshold-mode` / `badgesThresholdMode` | `'count'` | `count` \| `partial` after threshold | | |
| Max visible badges (partial) | attr/prop | `max-visible-badge-count` / `maxVisibleBadgeCount` | — | Limit before "+X more" badge | | |
| In-input counter badge | attr/prop | `show-counter` / `isCounterShown` | `bool(false)` | `[3]` next to toggle | | |
| Counter text callback (i18n) | callback | `getCounterCallback({ count, moreCount })` | — | Pluralization / "+X more" text | | |
| Read selected options | method | `selectedOptions` | — | Returns option objects | | |
| Read selected value(s) | method | `selectedValue` | — | Single value or array | | |
| Read selectedValue (single) | prop (get) | `selectedValue` | — | string \| number \| array \| null | | |
| Read selectedOption (single) | prop (get) | `selectedOption` | — | First selected object | | |
| Set selection programmatically | method | `setSelected(values[])` | — | By value/ID | | |
| Selected-items popover | behavior | "show selected" overflow popover | — | Opens a floating list of all selected when badges overflow / in `count`/`compact` modes | | |

## 5. Tooltips

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Enable badge tooltips | attr/prop | `enable-badge-tooltips` / `isBadgeTooltipsEnabled` | `bool(false)` | | | |
| Custom badge tooltip content | callback | `getBadgeTooltipCallback({ option, displayMode, isInPopover })` | — | string or HTMLElement | | |
| Custom remove-button tooltip | callback | `getRemoveButtonTooltipCallback({ option })` | — | Per-item remove tooltip text | | |
| Remove-button tooltip / aria-label | labels | `labels.removeItem` | `'Remove {item}'` | `{item}` = item name | | |
| Tooltip placement | attr/prop | `badge-tooltip-placement` / `badgeTooltipPlacement` | `'top'` | Floating-UI placements | | |
| Tooltip delay | attr/prop | `badge-tooltip-delay` / `badgeTooltipDelay` | `100` | ms before show | | |
| Tooltip offset | attr/prop | `badge-tooltip-offset` / `badgeTooltipOffset` | `8` | px gap from badge | | |

## 6. Custom rendering

| Feature | Surface | Identifier | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|
| Custom dropdown option content | callback | `renderOptionContentCallback(ctx)` | HTML string or HTMLElement; `ctx` has option/optionIndex/isSelected/isFocused/isMatched/isDisabled; `data-action` elements inside fire the `action` event | | |
| Custom badge content | callback | `renderBadgeContentCallback(ctx)` | `ctx` has item/displayMode/isInPopover | | |
| Custom selected-item content (popover) | callback | `renderSelectedItemContentCallback({ option })` | Popover row rendering | | |
| Custom single-select display | callback | `renderSelectedContentCallback({ option })` | Plain text, single-select | | |
| Custom group label content | callback | `renderGroupLabelContentCallback({ groupName, … })` | HTML allowed | | |
| Custom badge display text | callback | `getBadgeDisplayCallback({ option })` | Shorter badge text vs dropdown | | |
| Custom badge CSS class | callback | `getBadgeClassCallback({ option })` | string or string[] | | |
| Custom selected-item CSS class | callback | `getSelectedItemClassCallback({ option })` | Popover row classes | | |
| Inject custom CSS into Shadow DOM | callback | `getCustomStylesCallback(ctx)` | Returns CSS string | | |

> ⚠️ Rendering callbacks accept **raw HTML** — the consumer (and wrapper) must sanitize
> user-generated content. See `docs/examples.md → HTML Injection (XSS) notice`.

## 7. Action buttons

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Action buttons config | prop | `actionButtons: (MultiSelectActionItem \| 'select-all' \| 'clear-selection')[]` | — (none render when unset) | Built-ins `{ action: 'select-all' \| 'clear-selection' }` or the string shorthand; custom items `{ id, text, onClick }` | | |
| Action item fields | prop | `text`, `icon`, `tooltip`, `cssClass`, `row`, `isVisible`, `isDisabled`, `isDanger`, `isToggled` | — | Text and icon are inserted as text (not HTML); `isToggled` → `aria-pressed` | | |
| Action onClick | callback | `MultiSelectActionItem.onClick(detail)` | — | The `action` detail (`controller`, `action`, `id`, `selectedCount`, …); runs for built-ins too, before the built-in | | |
| Dynamic visibility | callback | `MultiSelectActionItem.getIsVisibleCallback(ctx)` | — | Overrides static `isVisible` | | |
| Dynamic disabled | callback | `MultiSelectActionItem.getIsDisabledCallback(ctx)` | — | Overrides static `isDisabled` | | |
| Dynamic toggle state | callback | `MultiSelectActionItem.getIsToggledCallback(ctx)` | — | Overrides static `isToggled` | | |
| Dynamic text / icon | callback | `MultiSelectActionItem.getTextCallback(ctx)` / `getIconCallback(ctx)` | — | | | |
| Dynamic class | callback | `MultiSelectActionItem.getClassCallback(ctx)` | — | | | |
| Dynamic tooltip | callback | `MultiSelectActionItem.getTooltipCallback(ctx)` | — | | | |
| Cancel an action | callback | `beforeActionCallback(detail)` | — | `false` cancels the item's `onClick`, the `action` event and the built-in | | |
| Sticky actions | attr/prop | `actions-sticky` / `isActionsSticky` | `bool(true)` | Fixed at top while scrolling | | |
| Actions layout | attr/prop | `actions-layout` / `actionsLayout` | `'nowrap'` | `nowrap` \| `wrap` | | |

## 8. Grouping & checkboxes

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Enable grouping | attr/prop | `allow-groups` / `isGroupsAllowed` | `bool(true)` | | | |
| Show checkboxes | attr/prop | `show-checkboxes` / `isCheckboxesShown` | `bool(true)` | Multi-select only | | |
| Checkbox alignment | attr/prop | `checkbox-align` / `checkboxAlign` | `'center'` | `top` \| `center` \| `bottom` | | |
| Disabled-option behavior | behavior | `is-disabled-member` / `getIsDisabledCallback` | — | Disabled options are non-selectable + get `.ms__option--disabled` (e2e: `disabled.spec.ts`) | | |

## 9. Virtual scrolling

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Enable virtual scroll | attr/prop | `enable-virtual-scroll` / `isVirtualScrollEnabled` | `bool(false)` | | | |
| Virtual scroll threshold | attr/prop | `virtual-scroll-threshold` / `virtualScrollThreshold` | `100` | Min items before activating | | |
| Option height | attr/prop | `virtual-scroll-item-height` / `virtualScrollItemHeight` | `50` | px; required for virtual scroll | | |
| Badge height (popover) | prop | `badgeHeight` | `36` | px; popover virtual scroll | | |
| Virtual scroll buffer | attr/prop | `virtual-scroll-overscan` / `virtualScrollOverscan` | `10` | Extra rows above/below viewport | | |

## 10. Dropdown layout & behavior

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Close on select | attr/prop | `close-on-select` / `shouldCloseOnSelect` | `bool(false)` | | | |
| Auto-positioning (Floating UI) | behavior | dropdown / popover / tooltip placement | — | Auto-flip + overflow-escape (e2e: `positioning.spec.ts`, `floating-panels.spec.ts`) | | |
| Lock placement | attr/prop | `lock-placement` / `shouldLockPlacement` | `bool(true)` | Prevent flip after first open | | |
| Keep search on close | attr/prop | `keep-search-on-close` / `shouldKeepSearchOnClose` | `bool(tristate)` | Preserve text + filtered results. Unset: kept in multi, cleared in single | | ✓ |
| Tab behavior | attr/prop | `tab-behavior` / `tabBehavior` | unset | `select-focused` / `select-navigated` / `close`; unset = `select-focused` (single), `close` (multi) | | ✓ |
| Dropdown min width | attr/prop | `dropdown-min-width` / `dropdownMinWidth` | — | e.g. `'20rem'` | | |
| Dropdown max width | attr/prop | `dropdown-max-width` / `dropdownMaxWidth` | — | e.g. `'40rem'` | | |
| Dropdown max height | attr/prop | `max-height` / `maxHeight` | `'20rem'` | | | |

## 11. Form integration

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Form field name | attr/prop | `name` / `name` | — | Creates hidden input(s) in light DOM | | |
| Value format | attr/prop | `value-format` / `valueFormat` | `'json'` | `json` \| `csv` \| `array` | | |
| Custom value format | callback | `getValueFormatCallback({ selectedValues, selectedOptions })` | — | Custom serialization | | |

## 12. Events & selection interceptors

Fire-and-forget notifications are **events** — available both as bubbling DOM `CustomEvent`s
(`composed: false`) and as `on*` event-handler properties (the property is the twin of the event and
receives the event **detail**; the return value is ignored). `before*Callback`s are **interceptors** —
their return value *is* consumed: `false` cancels, nothing continues.

| Feature | Surface | Identifier | Detail | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
| Select event | event | `select` | `{ option, selectedOptions, selectedValues }` | bubbles | | |
| Deselect event | event | `deselect` | `{ option, selectedOptions, selectedValues }` | bubbles | | |
| Change event | event | `change` | `{ selectedOptions, selectedValues }` | bubbles; fires on every selection change | | |
| Ready event | event | `ready` | `{ controller, element, presentation… }` | bubbles; fires once, right after the first build (see §13 `defer`) | | ✓ `defer-gate` |
| Add event | event | `add` | `{ value, option?, selectedOptions, selectedValues }` | bubbles; after an add-new prompt was chosen | | |
| Action event | event | `action` | `{ action, id, item, source, selectedCount, … }` | bubbles; every action button + every `data-action` element in option / badge content or a `showMessage` element | | |
| Select handler (event prop) | prop | `onSelect(detail)` | — | Property twin of the `select` event (fire-and-forget) | | |
| Deselect handler (event prop) | prop | `onDeselect(detail)` | — | Property twin of the `deselect` event | | |
| Change handler (event prop) | prop | `onChange(detail)` | — | Property twin of the `change` event | | |
| Add / action / ready handlers (event props) | prop | `onAdd(detail)`, `onAction(detail)`, `onReady(detail)`, `onOpen(detail)`, `onClose(detail)` | — | Property twins of `add` / `action` / `ready` | | |
| Block a selection (interceptor) | callback | `beforeSelectCallback({ option, selectedOptions, selectedValues, source })` | returns `false` \| `void` (may be async) | `false` vetoes, silently — explain with `ctx.controller.showMessage(…, { type: 'warning' })`. Applies per option to bulk gestures (Select-All, group checkbox); bypassed by `setSelected`. (e2e: `before-select` unit) | | |
| Block a deselection (interceptor) | callback | `beforeDeselectCallback(ctx)` | returns `false` \| `void` (may be async) | `false` vetoes; covers dropdown toggle + badge × + popover × + remove-hidden + Clear-All (per option). Bypassed by `setSelected` | | |
| Intercept a key (interceptor) | callback | `beforeKeydownCallback(ctx)` | returns `false` \| `void` (sync) | `false` suppresses the built-in handling of the key | | |

## 13. Public methods & lifecycle

| Feature | Surface | Identifier | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|
| Batch attribute update | method | `setAttributes(attrs)` | One in-place render for many attrs; `null`/`false` removes, `true` → `""` | | |
| Get selected options | method | `selectedOptions` | | | |
| Set selected | method | `setSelected(values[])` | | | |
| Get value | method | `selectedValue` | | | |
| Public controller | prop | `el.controller` (also `ctx.controller` / `detail.controller`) | `MultiSelectController`: `selectAll`, `clearSelection`, `toggleValue`, `selectValue`, `deselectValue`, `open`/`close`, `search`, `focusNext`…, `scrollTo*`, `refresh`, `showMessage(content, { type, autoHideMs, placement })` | | |
| Destroy | method | `destroy()` | Cleanup / teardown | | |
| Defer first render | attr | `defer` | Present = build nothing on upgrade (reserve space only); wire options/callbacks/listeners first, then release. Closes the upgrade-then-restyle flash | | ✓ `defer-gate` |
| Release the render gate | method | `release()` | Build once with everything in place; latched (never re-closes). Removing the `defer` attribute releases it too (server-driven) | | ✓ `defer-gate` |
| Readiness state | prop/attr | `isReady` / reflected `ready` | `true` once built; CSS hook `:host([defer]:not([ready]))` reserves space while held | | ✓ `defer-gate` |
| Live attribute reactivity | behavior | `attributeChangedCallback` | Most attrs update in place (no teardown); good for i18n / cascades | | |

## 14. Theming, styling & i18n

| Feature | Surface | Identifier | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|
| CSS custom properties | css | `--ms-*` (see `component-variables.manifest.json`) | Full theming surface | | |
| Global scaling | css | `--ms-rem` | Default `10px`; scale whole component | | |
| Theme-designer integration | css | `--base-*` variables | Reads page-level typography/colors if present | | |
| Dark mode — class on host | css | `.dark` / `:host(.dark)` | One of 5 dark-mode activation paths | | |
| Dark mode — page theme signal | css/core | `data-theme` / `data-bs-theme` / `.dark` on `<html>`/`<body>` → host `data-context-theme` | Detected once by web-components-core; all browsers | | |
| Dark mode — section source | attr | `theme-source="closest"` / `"<selector>"` | Follow a wrapper element's signal | | |
| Dark mode — global force | js | `setThemeMode('light' \| 'dark' \| 'auto')` | Forces every Keenmate component | | |
| Dark mode — per-instance attribute | attr/css | `data-theme="dark"` / `"light"` | Highest specificity, per-element | | |
| RTL support | attr | `dir="rtl"` (on host or ancestor) | Auto-detected; mirrors layout | | |
| Empty/loading state min-height | css | `--ms-state-min-height` | Shared footprint so dropdown doesn't jump between "No data" and "Loading" | | |
| i18n of all user-facing strings | attr | placeholders, messages, tooltips, counter | All text is attribute/callback driven and reactive | | |

## 15. Developer tooling — debug & logging

| Feature | Surface | Identifier | Default | Notes | Wrapped? | E2E? |
|---|---|---|---|---|---|---|
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
