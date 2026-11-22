import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/placeholder.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function placeholder(p: Locator): Promise<string | null> {
    return p.locator('.ms__input').getAttribute('placeholder');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('search enabled shows the default "Search…" placeholder', async ({ page }) => {
    await expect(picker(page, 'ph-search').locator('.ms__input')).toHaveAttribute('placeholder', 'Search…');
});

test('enable-search="false" shows the default select placeholder', async ({ page }) => {
    await expect(picker(page, 'ph-nosearch').locator('.ms__input')).toHaveAttribute('placeholder', 'Pick an option…');
});

test('custom labels["placeholders.select"] is honoured when search is disabled', async ({ page }) => {
    await expect(picker(page, 'ph-custom-select').locator('.ms__input')).toHaveAttribute('placeholder', 'Choose a fruit');
});

test('labels["placeholders.noData"] is shown for an empty list without opening', async ({ page }) => {
    await expect(picker(page, 'ph-nodata').locator('.ms__input'))
        .toHaveAttribute('placeholder', 'No data — pick a category first');
});

test('labels["placeholders.noData"] does not apply when the list has options', async ({ page }) => {
    await expect(picker(page, 'ph-nodata-filled').locator('.ms__input')).toHaveAttribute('placeholder', 'Search…');
});

test('placeholder updates live when labels change (i18n)', async ({ page }) => {
    const p = picker(page, 'ph-search');
    await p.evaluate((el: any) => { el.labels = { 'placeholders.search': 'Buscar…' }; });
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Buscar…');
});

test('emptying the option list flips to the no-data placeholder (cascade)', async ({ page }) => {
    const p = picker(page, 'ph-nodata-filled');
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Search…');
    await p.evaluate((el: any) => { el.options = []; });
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'No data');
});

test('repopulating the option list returns to the search placeholder', async ({ page }) => {
    const p = picker(page, 'ph-nodata');
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'No data — pick a category first');
    await p.evaluate((el: any) => { el.options = (window as any).__items; });
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Search…');
});

test('the labels JSON attribute sets several placeholders at once', async ({ page }) => {
    const p = picker(page, 'ph-nosearch');
    await p.evaluate((el: any) => el.setAttribute('labels',
        JSON.stringify({ 'placeholders.search': 'Search items', 'placeholders.select': 'Pick one please', 'placeholders.noData': 'Nothing here' })));
    // search is disabled on this instance → the select placeholder is what shows.
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Pick one please');
    expect(await p.evaluate((el: any) => el.labels["placeholders.noData"])).toBe('Nothing here');
});

/**
 * The placeholder key (no layer is special): the search-mode toggle shown → `placeholders.filter` /
 * `.navigate` by mode, also when the page dictionary sets `placeholders.search` (that key is the
 * toggle-hidden text).
 */
test('toggle shown: page-dictionary placeholders.search does not override the mode text', async ({ page }) => {
    const p = picker(page, 'ph-toggle');
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Filter…');
    await page.evaluate(() => {
        (window as any).components.locale = {
            labels: { 'web-multiselect.placeholders.search': 'Page search', 'web-multiselect.placeholders.navigate': 'Page navigate' },
        };
    });
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Filter…');
    await expect(picker(page, 'ph-search').locator('.ms__input')).toHaveAttribute('placeholder', 'Page search');
    await p.evaluate((el: any) => { el.searchMode = 'navigate'; });
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Page navigate');
    await page.evaluate(() => { (window as any).components.locale = null; });
});

test('translateCallback translates the mode text and gets the PlaceholderContext as params.ctx', async ({ page }) => {
    const p = picker(page, 'ph-toggle');
    await p.evaluate((el: any) => {
        (window as any).__phSeen = [];
        el.translateCallback = ({ key, params }: any) => {
            if (!key.startsWith('web-multiselect.placeholders.')) return null;
            (window as any).__phSeen.push({ key, ctxKey: params.ctx.key, searchMode: params.ctx.searchMode, count: params.ctx.count, totalCount: params.ctx.totalCount });
            return key === 'web-multiselect.placeholders.filter' ? `Filtrovat (${params.ctx.totalCount})` : null;
        };
    });
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Filtrovat (3)');
    const seen = await page.evaluate(() => (window as any).__phSeen);
    expect(seen).toContainEqual({ key: 'web-multiselect.placeholders.filter', ctxKey: 'placeholders.filter', searchMode: 'filter', count: 0, totalCount: 3 });
});

test('a {ctx.*} placeholder follows select / deselect while open, and programmatic changes while closed', async ({ page }) => {
    const p = picker(page, 'ph-ctx');
    const input = p.locator('.ms__input');
    await expect(input).toHaveAttribute('placeholder', 'Picked 0 of 3');

    await input.click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
    const apple = p.locator('.ms__option[data-value="apple"]');
    await apple.click();
    await expect(input).toHaveAttribute('placeholder', 'Picked 1 of 3');
    await p.locator('.ms__option[data-value="banana"]').click();
    await expect(input).toHaveAttribute('placeholder', 'Picked 2 of 3');
    await apple.click();
    await expect(input).toHaveAttribute('placeholder', 'Picked 1 of 3');
    await expect(p.locator('.ms__dropdown')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(input).toHaveAttribute('placeholder', 'Picked 1 of 3');
    await p.evaluate((el: any) => el.setSelected(['apple', 'banana', 'cherry']));
    await expect(input).toHaveAttribute('placeholder', 'Picked 3 of 3');
});
