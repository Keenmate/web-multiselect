import { test, expect } from './fixtures';

/**
 * The `labels` property is a partial i18n map of flat `<elementType>.<name>` keys (`ariaLabels.close`,
 * `tooltips.andMore`, …) for the component's UI strings. Unset keys fall back to their
 * English defaults; `{item}` / `{count}` placeholders are interpolated. Reuses the
 * floating-panels fixture (`#popover-picker` is count-mode with three pre-selected values).
 */

test('labels map overrides aria-labels with {item} interpolation', async ({ page }) => {
    await page.goto('/test/floating-panels.html');
    const p = page.locator('#popover-picker');

    await p.evaluate((el: any) => {
        // Short keys and full (`web-multiselect.`-prefixed) keys both work on the instance.
        el.labels = { 'web-multiselect.ariaLabels.close': 'Zavřít', 'ariaLabels.removeItem': 'Odebrat {item}', 'tooltips.andMore': '…a {count} dalších' };
    });

    // Open the selected-items popover (count mode).
    await p.locator('.ms__badge[data-ms-action="show-selected"]').click();
    await expect(p.locator('.ms__selected-popover')).toBeVisible();

    // Close button aria-label translated.
    await expect(p.locator('.ms__selected-popover-close')).toHaveAttribute('aria-label', 'Zavřít');

    // Badge remove aria-label uses the {item} template.
    const firstRemove = p.locator('.ms__selected-popover .ms__badge-remove').first();
    await expect(firstRemove).toHaveAttribute('aria-label', /^Odebrat .+/);

    // Unset keys still fall back to English.
    const label = await p.evaluate((el: any) => el.labels["buttons.clearSelection"] ?? '(unset)');
    expect(label).toBe('(unset)');
});

/**
 * {count} interpolation across the three labels that use it. The `#lbl-count` fixture is
 * built to surface all three at once (grouped data + partial badges + counter, 14 selected):
 *   - ariaLabels.groupSelected      → the `.ms__group-count` header chip aria-label
 *   - ariaLabels.removeHiddenItems  → the "+N more" badge's remove button aria-label
 *   - tooltips.andMore              → the counter chip's native `title` (cap is 12, so 14 → "…and 2 more")
 */
test('labels map interpolates {count} in group count, remove-hidden, and counter overflow', async ({ page }) => {
    await page.goto('/test/labels.html');
    const p = page.locator('#lbl-count');

    await p.evaluate((el: any) => {
        el.labels = {
            'ariaLabels.groupSelected': '{count} vybráno',
            'ariaLabels.removeHiddenItems': 'Odebrat {count} skrytých',
            'tooltips.andMore': '…a {count} dalších',
        };
    });

    // tooltips.andMore — counter chip title. 14 selected, cap 12 → "…a 2 dalších".
    await expect(p.locator('.ms__counter')).toHaveAttribute('title', /…a 2 dalších$/);

    // ariaLabels.removeHiddenItems — partial mode, max-visible 2 → 12 hidden.
    await expect(p.locator('.ms__badge--more .ms__badge-remove'))
        .toHaveAttribute('aria-label', 'Odebrat 12 skrytých');

    // ariaLabels.groupSelected — open the dropdown; Group A header has 10 selected.
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
    await expect(p.locator('.ms__group-count').first()).toHaveAttribute('aria-label', '10 vybráno');
});

/**
 * Page-wide labels (core /locale): the flat `window.components.locale.labels['web-multiselect.<key>']` sits between the
 * instance `labels` and the English default, and assigning the page object re-renders live pickers
 * (core `localeChanged()` → rebuild, selection kept).
 */
test('page-wide window.components.locale labels apply live; the instance labels win', async ({ page }) => {
    await page.goto('/test/labels.html');
    const p = page.locator('#lbl-count');
    const before = await p.evaluate((el: any) => el.selectedOptions.length);

    await page.evaluate(() => {
        (window as any).components.locale = {
            labels: {
                'web-multiselect.ariaLabels.removeHiddenItems': 'Page: remove {count}',
                'web-multiselect.tooltips.andMore': 'Page: +{count}',
            },
        };
    });
    await expect(p.locator('.ms__badge--more .ms__badge-remove')).toHaveAttribute('aria-label', 'Page: remove 12');
    await expect(p.locator('.ms__counter')).toHaveAttribute('title', /Page: \+2$/);
    expect(await p.evaluate((el: any) => el.selectedOptions.length)).toBe(before);

    await p.evaluate((el: any) => { el.labels = { 'ariaLabels.removeHiddenItems': 'Mine {count}' }; });
    await expect(p.locator('.ms__badge--more .ms__badge-remove')).toHaveAttribute('aria-label', 'Mine 12');
    await expect(p.locator('.ms__counter')).toHaveAttribute('title', /Page: \+2$/);

    await page.evaluate(() => { (window as any).components.locale = null; });
    await p.evaluate((el: any) => { el.labels = undefined; });
    await expect(p.locator('.ms__badge--more .ms__badge-remove')).toHaveAttribute('aria-label', 'Remove 12 hidden items');
});

/**
 * Number params are shown locale-formatted by core `createLabels` (thousands grouped by the resolved
 * locale), while a page-wide `translateCallback` receives the raw number. `#lbl-big` is count mode
 * with 1234 selected → the `labels.selectedCount` badge.
 */
test('counts in labels are locale-grouped; page-wide translateCallback gets the raw number', async ({ page }) => {
    await page.goto('/test/labels.html');
    const text = page.locator('#lbl-big .ms__badge--counter .ms__badge-text');

    await page.evaluate(() => { (window as any).components.locale = { locale: 'en-US' }; });
    await expect(text).toHaveText('1,234 selected');

    await page.evaluate(() => { (window as any).components.locale = { locale: 'cs-CZ' }; });
    await expect(text).toHaveText(/^1\s234 selected$/);

    await page.evaluate(() => {
        const w = window as any;
        w.__seen = [];
        w.components.locale = {
            locale: 'cs-CZ',
            translateCallback: (ctx: any) => {
                if (ctx.component === 'web-multiselect' && ctx.key === 'web-multiselect.labels.selectedCount') {
                    w.__seen.push({ type: typeof ctx.params.count, value: ctx.params.count, locale: ctx.locale });
                }
                return undefined; // keep the default formatting
            },
        };
    });
    await expect(text).toHaveText(/^1\s234 selected$/);
    const seen = await page.evaluate(() => (window as any).__seen);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toEqual({ type: 'number', value: 1234, locale: 'cs-CZ' });
});

/**
 * Instance `locale` wins over the page per key (instance → page → `Intl`): `#lbl-loc-cs` has
 * `locale="cs-CZ"`, its sibling `#lbl-loc-page` has none and follows `window.components.locale`.
 * Both the `{count}` label and the group-header count chip (core `formatNumber`) are grouped.
 */
test('instance locale formats the label count and the group chip; a sibling follows the page', async ({ page }) => {
    await page.goto('/test/labels.html');
    await page.evaluate(() => { (window as any).components.locale = { locale: 'en-US' }; });

    const cs = page.locator('#lbl-loc-cs');
    const pg = page.locator('#lbl-loc-page');
    await expect(cs.locator('.ms__badge--counter .ms__badge-text')).toHaveText(/^1\s234 selected$/);
    await expect(pg.locator('.ms__badge--counter .ms__badge-text')).toHaveText('1,234 selected');

    await cs.locator('.ms__input').click();
    await expect(cs.locator('.ms__group-count').first()).toHaveText(/^\[1\s234\]$/);
    await page.keyboard.press('Escape');

    await pg.locator('.ms__input').click();
    await expect(pg.locator('.ms__group-count').first()).toHaveText('[1,234]');
    await page.keyboard.press('Escape');

    // Removing the instance locale → it follows the page again.
    await cs.evaluate((el) => el.removeAttribute('locale'));
    await expect(cs.locator('.ms__badge--counter .ms__badge-text')).toHaveText('1,234 selected');
});

/**
 * `locale="auto"` is accepted as unset (core `resolveLocale`): no rejection, the element follows the
 * page locale, and a page-locale change still re-renders it.
 */
test('locale="auto" is unset — follows the page locale, no rejection', async ({ page }) => {
    await page.goto('/test/labels.html');
    await page.evaluate(() => { (window as any).components.locale = { locale: 'en-US' }; });

    const cs = page.locator('#lbl-loc-cs');
    const rejected = await cs.evaluate((el: any) => {
        const seen: unknown[] = [];
        el.addEventListener('input-rejected', (e: any) => seen.push(e.detail));
        el.setAttribute('locale', 'auto');
        return seen.length;
    });
    expect(rejected).toBe(0);
    expect(await cs.evaluate((el: any) => el.locale)).toBe('auto');
    await expect(cs.locator('.ms__badge--counter .ms__badge-text')).toHaveText('1,234 selected');

    await page.evaluate(() => { (window as any).components.locale = { locale: 'de-DE' }; });
    await expect(cs.locator('.ms__badge--counter .ms__badge-text')).toHaveText('1.234 selected');
});

/**
 * One text, one key (rulebook D-NC-24): a text button is named by its visible text — the built-in
 * `select-all` / `clear-selection` action buttons carry no `aria-label`, so the translated `buttons.*`
 * text is also what a screen reader hears.
 */
test('text action buttons are named by their visible buttons.* text (no aria-label)', async ({ page }) => {
    await page.goto('/test/action-buttons.html');
    const p = page.locator('#builtins');
    await p.evaluate((el: any) => { el.labels = { 'buttons.selectAll': 'Vybrat vše', 'buttons.clearSelection': 'Zrušit vše' }; });
    await p.locator('.ms__input').click();

    const selectAll = p.locator('.ms__action-btn[data-action="select-all"]');
    const clear = p.locator('.ms__action-btn[data-action="clear-selection"]');
    await expect(selectAll).not.toHaveAttribute('aria-label', /.*/);
    await expect(clear).not.toHaveAttribute('aria-label', /.*/);
    await expect(selectAll).toHaveAccessibleName('Vybrat vše');
    await expect(clear).toHaveAccessibleName('Zrušit vše');
});

/**
 * A twin pair shares `<name>`, so core `/locale` lets an unset `tooltips.x` follow a customized
 * `ariaLabels.x`: translating only `ariaLabels.removeHiddenItems` translates the "+N more" remove
 * button's tooltip too.
 */
test('an unset tooltips.x follows the customized ariaLabels.x twin', async ({ page }) => {
    await page.goto('/test/labels.html');
    const p = page.locator('#lbl-count');
    await p.evaluate((el: any) => {
        el.isBadgeTooltipsEnabled = true;
        el.labels = { 'ariaLabels.removeHiddenItems': 'Odebrat {count} skrytých' };
    });

    const removeHidden = p.locator('.ms__badge--more .ms__badge-remove');
    await expect(removeHidden).toHaveAccessibleName('Odebrat 12 skrytých');
    await removeHidden.hover();
    const tooltip = page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText('Odebrat 12 skrytých');
});

/**
 * The element's own `translateCallback` (core `createLabels` reads `host.translateCallback`) is asked
 * BEFORE the page-wide `window.components.locale.translateCallback`; `null` = not mine → the page one;
 * the instance `labels` still beat both. A change rebuilds the picker (selection kept).
 */
test('element translateCallback beats the page one; null falls through; instance labels win', async ({ page }) => {
    await page.goto('/test/labels.html');
    const p = page.locator('#lbl-count');
    const removeHidden = p.locator('.ms__badge--more .ms__badge-remove');
    const counter = p.locator('.ms__counter');
    const before = await p.evaluate((el: any) => el.selectedOptions.length);

    await page.evaluate(() => {
        (window as any).components.locale = {
            translateCallback: (ctx: any) => (ctx.component === 'web-multiselect' ? `Page ${ctx.key.split('.').pop()} ${ctx.params?.count ?? ''}`.trim() : null),
        };
    });
    await expect(removeHidden).toHaveAttribute('aria-label', 'Page removeHiddenItems 12');

    // The element's callback wins; for a key it returns null, the page callback answers.
    await p.evaluate((el: any) => {
        el.translateCallback = (ctx: any) => (ctx.key === 'web-multiselect.ariaLabels.removeHiddenItems' ? `Own ${ctx.params.count}` : null);
    });
    await expect(removeHidden).toHaveAttribute('aria-label', 'Own 12');
    await expect(counter).toHaveAttribute('title', /Page andMore 2$/);
    expect(await p.evaluate((el: any) => el.selectedOptions.length)).toBe(before);

    // Instance labels beat both callbacks.
    await p.evaluate((el: any) => { el.labels = { 'ariaLabels.removeHiddenItems': 'Mine {count}' }; });
    await expect(removeHidden).toHaveAttribute('aria-label', 'Mine 12');

    // One element needs no page setup.
    await page.evaluate(() => { (window as any).components.locale = null; });
    await p.evaluate((el: any) => { el.labels = undefined; });
    await expect(removeHidden).toHaveAttribute('aria-label', 'Own 12');
    await expect(counter).toHaveAttribute('title', /…and 2 more$/);

    await p.evaluate((el: any) => { el.translateCallback = null; });
    await expect(removeHidden).toHaveAttribute('aria-label', 'Remove 12 hidden items');
});
