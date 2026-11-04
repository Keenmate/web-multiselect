# Accessibility

This component is designed to be navigable from the keyboard alone and to work with assistive technologies via standard HTML semantics. This document covers what's currently shipped — keyboard model, ARIA labels, focus behavior — and any known gaps.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| **Enter / ↓** (while closed) | Open the dropdown |
| **↑ / ↓** | Navigate up/down through options. When the "add new" prompt is shown (no matches, `allow-add-new`), highlights it |
| **Ctrl + ↑ / Ctrl + ↓** (Cmd on macOS) | Jump between matched items (navigate mode only) |
| **Page Up / Page Down** | Move focus by 10 options at a time |
| **Home / End** | Jump to the first / last enabled option. Caret-aware: while the search box has text, Home/End first move the text caret and only jump in the list once the caret is already at that end |
| **Enter** | Toggle the focused option (selects it, or deselects it if already selected). With no focused option, `allow-add-new="true"`, no matches and search text: add the typed entry |
| **Escape** | Close popover → clear search → close dropdown (priority order) |
| **Tab** | Close dropdown and move to next field |
| **Type** | `search-mode="filter"` (default): filter options by the search term. `search-mode="navigate"`: keep all options and jump to matches. With `enable-search="false"` printable keys are ignored |

Any key can be intercepted or overridden with `beforeKeydownCallback`, which runs before the built-in handling (return `false` to suppress the built-in handling of that key) — see [usage.md → Properties](./usage.md#properties).

> 💡 To surface these shortcuts to your users, set `labels.searchHint` — the hint floats above the input when focused. Example:
>
> ```html
> <web-multiselect
>   search-mode="navigate"
>   labels='{"searchHint":"Ctrl/Cmd + ↓ / ↑ to jump between matches"}'>
> </web-multiselect>
> ```

## ARIA labels

The component ships an `aria-label` on every icon-only control. All of them are translatable through the `labels` property (see [Translating labels](#translating-labels)); `{item}` / `{count}` placeholders are interpolated.

| Control | Default label | `labels` key |
|---------|---------------|--------------|
| Per-badge remove button | `Remove {item}` | `removeItem` |
| Hidden-items remove badge (partial mode "+N more") | `Remove {count} hidden items` | `removeHiddenItems` |
| Clear-all button on the count / compact badge | `Clear all selections` | `clearAllSelections` |
| Inline ✕ clear button (`show-clear`) | `Clear all selections` | `clearAllSelections` |
| Selected-items popover close / fullscreen close | `Close` | `close` |
| Fullscreen search clear (✕) | `Clear search` | `clearSearch` |
| Fullscreen navigate-mode previous / next match buttons | `Previous match` / `Next match` | `prevMatch` / `nextMatch` |
| Option info button revealing a clipped label (fullscreen) | `Show full label` | `showFullLabel` |
| Group-header selected-count chip | `{count} selected` | `groupSelected` |
| Counter tooltip overflow tail (beyond 12 items) | `…and {count} more` | `andMore` |
| Fullscreen search-mode toggle (`show-search-mode-toggle`) | `Switch to filter mode` / `Switch to navigate mode` | `switchToFilterMode` / `switchToNavigateMode` |

> **Tooltip vs. accessible name.** `labels.removeItem` is both the badge remove button's `aria-label` and its hover tooltip (shown with `enable-badge-tooltips`); `getRemoveButtonTooltipCallback` overrides only the tooltip.

### Translating labels

Pass a partial map to the `labels` property; unset keys keep their English defaults:

```javascript
multiselect.labels = {
  removeItem: 'Odebrat {item}',
  removeHiddenItems: 'Odebrat {count} skrytých položek',
  clearAllSelections: 'Zrušit výběr',
  close: 'Zavřít',
};
```

These are the ARIA keys; `labels` also holds every visible string — all keys and defaults are in [usage.md → Labels (i18n)](./usage.md#labels-i18n).

## Other ARIA semantics

- **Messages** (`el.controller.showMessage()` — e.g. called from a `beforeSelectCallback` / `beforeDeselectCallback` to explain a veto) are live regions: `role="status"` + `aria-live="polite"` for `info` / `success`, `role="alert"` + `aria-live="assertive"` for `warning` / `error`.
- **Tristate checkboxes** (tree `checkbox-mode="cascade"` branches, `group-select-mode="cascade"` headers) expose the partial state as `aria-checked="mixed"`.
- **"Add new" prompt** is `role="button"`; while an async `beforeAddCallback` runs, the pending prompt carries `aria-busy="true"`.
- **Fullscreen search-mode toggle** exposes the current mode with `aria-pressed` (`true` = navigate). Its `aria-label` is English-only for now.
- Decorative icons (empty icon gutters, spinners, add-new icon) are `aria-hidden="true"`.

## Focus & input behavior

- The dropdown opens when the input gains focus (or on click / Enter / ↓); DOM focus stays in the input. In the phone fullscreen overlay the search field is focused on open only with `fullscreen-autofocus`.
- Arrow-key navigation moves a *visual* focus indicator through options without moving DOM focus — the search input stays focused so typing continues to filter.
- **Escape** behaves in priority order: close the selected-items popover (if open) → clear the search text (if any) → close the dropdown.
- **Tab** closes the dropdown and moves DOM focus to the next focusable element in the page, matching native `<select>` semantics.
- Disabled options and, in tree mode, non-selectable nodes (`is-selectable-member` / `getIsSelectableCallback`) are skipped by every navigation key (↑ / ↓, Home / End, Page Up / Page Down, Ctrl + ↑ / ↓) and by the auto-focus of the first search result or the selected option on open — the same rule as core's menus. Arrowing past the last enabled option stays on it; when every option is disabled nothing is highlighted. Hovering a disabled option doesn't highlight it either, and Enter / click are ignored on it.

## Form integration & screen readers

When the `name` attribute is set, the component creates `type="hidden"` inputs in the **light DOM** (outside the shadow root) for form submission, and the element is form-associated (`form.reset()` clears the selection). Hidden inputs are not exposed to assistive technology, so give the control an accessible name yourself.

For best results, wrap the component with a `<label>` so the label's text becomes the accessible name:

```html
<label>
  Pick your skills
  <web-multiselect name="skills"></web-multiselect>
</label>
```

## Known gaps

The component does **not** currently declare a `role="combobox"` /`role="listbox"` / `aria-expanded` / `aria-activedescendant` ARIA combobox pattern on the host. Screen-reader announcements rely on the labels above and on the underlying form integration. If you need the formal combobox pattern (e.g. for WCAG 2.2 AAA compliance), please open an issue on the GitHub repo with your use case.

## See also

- [Keyboard shortcuts as a search hint](./usage.md#attributes) — `labels.searchHint` reference.
- [`examples-basic.html`](../examples-basic.html) — interactive demos including keyboard navigation and focus behavior.
