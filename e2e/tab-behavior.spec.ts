import { test, expect, Page, Locator } from './fixtures';

/**
 * tab-behavior (what Tab / Shift+Tab selects before focus moves on) and the single-select
 * default of should-keep-search-on-close (cleared), in a form-like page.
 */

const PAGE = '/test/tab-behavior.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function input(p: Locator): Locator {
    return p.locator('.ms__input');
}

async function events(page: Page, id: string): Promise<{ select: string[][]; change: string[][] }> {
    return page.evaluate((key) => (window as any).__events[key], id);
}

async function selectedValues(p: Locator): Promise<string[]> {
    return p.evaluate((el: any) => el.getSelected().map((o: any) => String(o.value)));
}

/** Focus the picker the way a keyboard user arrives: Tab from the preceding field. */
async function tabInto(page: Page, fromId: string, p: Locator): Promise<void> {
    await page.locator(`#${fromId}`).focus();
    await page.keyboard.press('Tab');
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForFunction(() => (document.getElementById('tb-single') as any)?.options?.length === 5
        && (document.getElementById('tb-long-virtual') as any)?.getSelected?.().length === 1);
});

test.describe('single-select default: select-highlighted', () => {
    test('type, Tab: commits the auto-highlighted match, fires events, focus moves on', async ({ page }) => {
        const p = picker(page, 'tb-single');
        await tabInto(page, 'before', p);

        await page.keyboard.type('cesky kru');
        await expect(p.locator('.ms__option')).toHaveCount(1);
        await page.keyboard.press('Tab');

        await expect(p.locator('.ms__dropdown')).not.toBeVisible();
        expect(await selectedValues(p)).toEqual(['ck']);
        const ev = await events(page, 'tb-single');
        expect(ev.select).toEqual([['ck']]);
        expect(ev.change).toEqual([['ck']]);
        await expect(page.locator('#between')).toBeFocused();
    });

    test('type, arrow down, Tab: commits the navigated option', async ({ page }) => {
        const p = picker(page, 'tb-single');
        await tabInto(page, 'before', p);

        await page.keyboard.type('cesk');
        await expect(p.locator('.ms__option')).toHaveCount(2);
        await page.keyboard.press('ArrowDown'); // first match is auto-highlighted → Down = second
        await page.keyboard.press('Tab');

        expect(await selectedValues(p)).toEqual(['ck']);
    });

    test('Shift+Tab commits too and moves focus back', async ({ page }) => {
        const p = picker(page, 'tb-single');
        await tabInto(page, 'before', p);

        await page.keyboard.type('brn');
        await page.keyboard.press('Shift+Tab');

        expect(await selectedValues(p)).toEqual(['brno']);
        await expect(page.locator('#before')).toBeFocused();
    });

    test('Tab with nothing typed and nothing highlighted selects nothing', async ({ page }) => {
        const p = picker(page, 'tb-single');
        await tabInto(page, 'before', p);
        await page.keyboard.press('Tab');

        expect(await selectedValues(p)).toEqual([]);
        expect((await events(page, 'tb-single')).change).toEqual([]);
        await expect(page.locator('#between')).toBeFocused();
    });

    test('Tab on the already-selected option keeps it (no deselect, no events)', async ({ page }) => {
        const p = picker(page, 'tb-single');
        await tabInto(page, 'before', p);
        await page.keyboard.type('brno');
        await page.keyboard.press('Tab');
        expect(await selectedValues(p)).toEqual(['brno']);

        await tabInto(page, 'before', p);
        await page.keyboard.type('brno');
        await page.keyboard.press('Tab');
        expect(await selectedValues(p)).toEqual(['brno']);
        expect((await events(page, 'tb-single')).change).toHaveLength(1);
    });
});

test.describe('single-select: search is cleared on close', () => {
    test('coming back with Shift+Tab shows the full list, not the old term', async ({ page }) => {
        const p = picker(page, 'tb-single');
        await tabInto(page, 'before', p);
        await page.keyboard.type('cesk');
        await page.keyboard.press('Tab'); // commits České Budějovice
        await expect(page.locator('#between')).toBeFocused();

        await page.keyboard.press('Shift+Tab'); // back into the picker
        await expect(p.locator('.ms__dropdown')).toBeVisible();
        await expect(input(p)).toHaveValue('');
        await expect(p.locator('.ms__option')).toHaveCount(5);
    });

    test('also when Tab left without selecting (tab-behavior="close")', async ({ page }) => {
        const p = picker(page, 'tb-close');
        await input(p).click();
        await page.keyboard.type('cesk');
        await page.keyboard.press('Tab');
        expect(await selectedValues(p)).toEqual([]);

        await input(p).click();
        await expect(input(p)).toHaveValue('');
        await expect(p.locator('.ms__option')).toHaveCount(5);
    });

    test('should-keep-search-on-close="true" keeps it in single-select', async ({ page }) => {
        const p = picker(page, 'tb-keep');
        await input(p).click();
        await page.keyboard.type('cesk');
        await page.keyboard.press('Tab');

        await input(p).click();
        await expect(input(p)).toHaveValue('cesk');
        await expect(p.locator('.ms__option')).toHaveCount(2);
    });
});

test.describe('tab-behavior="select-navigated"', () => {
    test('type, Tab: the auto-highlight is not committed', async ({ page }) => {
        const p = picker(page, 'tb-navigated');
        await input(p).click();
        await page.keyboard.type('cesky kru');
        await expect(p.locator('.ms__option')).toHaveCount(1);
        await page.keyboard.press('Tab');

        expect(await selectedValues(p)).toEqual([]);
        expect((await events(page, 'tb-navigated')).change).toEqual([]);
    });

    test('type, arrow, Tab: commits; typing again resets the navigated state', async ({ page }) => {
        const p = picker(page, 'tb-navigated');
        await input(p).click();
        await page.keyboard.type('cesk');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.type('y'); // re-filters: the highlight is search's again
        await page.keyboard.press('Tab');
        expect(await selectedValues(p)).toEqual([]);

        await input(p).click();
        await page.keyboard.type('cesk');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Tab');
        expect(await selectedValues(p)).toEqual(['ck']);
    });
});

test.describe('tab-behavior="close"', () => {
    test('arrow, Tab: selects nothing', async ({ page }) => {
        const p = picker(page, 'tb-close');
        await input(p).click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Tab');

        expect(await selectedValues(p)).toEqual([]);
        await expect(p.locator('.ms__dropdown')).not.toBeVisible();
    });
});

test.describe('multi-select', () => {
    test('default (close): Tab selects nothing and the search is kept', async ({ page }) => {
        const p = picker(page, 'tb-multi');
        await input(p).click();
        await page.keyboard.type('cesk');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Tab');

        expect(await selectedValues(p)).toEqual([]);
        await input(p).click();
        await expect(input(p)).toHaveValue('cesk');
        await expect(p.locator('.ms__option')).toHaveCount(2);
    });

    test('select-highlighted: Tab adds the highlighted option but never removes one', async ({ page }) => {
        const p = picker(page, 'tb-multi-hl');
        await input(p).click();
        await page.keyboard.type('brno');
        await page.keyboard.press('Tab');
        expect(await selectedValues(p)).toEqual(['brno']);

        await input(p).click();
        await page.keyboard.press('Control+a');
        await page.keyboard.type('brno'); // Brno is already selected and highlighted
        await page.keyboard.press('Tab');
        expect(await selectedValues(p)).toEqual(['brno']);
        expect((await events(page, 'tb-multi-hl')).change).toHaveLength(1);
    });
});

test.describe('single-select: open starts at the selected value', () => {
    test('Tab in: Item 30 is highlighted and in view; ArrowUp → 29, ArrowDown → 31', async ({ page }) => {
        const p = picker(page, 'tb-long');
        await tabInto(page, 'before-long', p);

        const focusedRow = p.locator('.ms__option--focused');
        await expect(focusedRow).toHaveText(/Item 30/);
        await expect(focusedRow).toBeInViewport();

        await page.keyboard.press('ArrowUp');
        await expect(focusedRow).toHaveText(/Item 29/);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await expect(focusedRow).toHaveText(/Item 31/);
        await page.keyboard.press('Enter');
        expect(await selectedValues(p)).toEqual(['item-31']);
    });

    test('Tab in and straight out changes nothing', async ({ page }) => {
        const p = picker(page, 'tb-long');
        await tabInto(page, 'before-long', p);
        await page.keyboard.press('Tab');
        expect(await selectedValues(p)).toEqual(['item-30']);
        expect((await events(page, 'tb-long')).change).toEqual([]);
    });

    test('typing still highlights the first match, not the selected value', async ({ page }) => {
        const p = picker(page, 'tb-long');
        await tabInto(page, 'before-long', p);
        await page.keyboard.type('Item 1'); // first match Item 10 (not the selected Item 30)
        await expect(p.locator('.ms__option--focused')).toHaveText(/Item 10/);
    });

    test('virtual scroll: Item 1500 is rendered, highlighted and in view', async ({ page }) => {
        const p = picker(page, 'tb-long-virtual');
        await input(p).click();
        const focusedRow = p.locator('.ms__option--focused');
        await expect(focusedRow).toHaveText(/Item 1500/);
        await expect(focusedRow).toBeInViewport();
        await page.keyboard.press('ArrowUp');
        await expect(focusedRow).toHaveText(/Item 1499/);
    });
});
