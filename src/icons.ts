import type { MultiSelectIconName } from './types';

/**
 * web-multiselect's own icons by NAME — core `renderIcon`'s `defaults` (SPEC §12.33, rulebook C-CA-42). Each is a
 * glyph masked from its `--ms-icon-*` token in `currentColor` (`.ms__glyph--<name>` in the CSS), so a theme keeps
 * re-skinning them through the tokens; `el.icons` / `window.components.icons` (`'web-multiselect.<name>'` before
 * `'<name>'`) / the `renderIconCallback` hooks replace one by name (markup, a built-in name, icon-font classes, text).
 * None of the names is a core built-in name, so the hooks see them and an unmapped name keeps the ms glyph.
 */
export const MS_ICONS: Readonly<Record<MultiSelectIconName, string>> = Object.freeze({
    toggle: glyph('toggle'),
    clearSelection: glyph('clearSelection'),
    removeItem: glyph('removeItem'),
    closePopover: glyph('closePopover'),
    clearSearch: glyph('clearSearch'),
    navigateMode: glyph('navigateMode'),
    filterMode: glyph('filterMode'),
    prevMatch: glyph('prevMatch'),
    nextMatch: glyph('nextMatch'),
    showFullLabel: glyph('showFullLabel'),
    addNew: glyph('addNew'),
});

/** Every ms icon name (the `icons` row's keys). */
export const MS_ICON_NAMES = Object.freeze(Object.keys(MS_ICONS) as MultiSelectIconName[]);

function glyph(name: MultiSelectIconName): string {
    return `<span class="ms__glyph ms__glyph--${name}" aria-hidden="true"></span>`;
}
