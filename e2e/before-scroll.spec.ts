import { test, expect, Page } from './fixtures';

/**
 * `beforeScrollCallback` (rulebook D-CA-5 / C-CA-6): the one gate of every scroll the dropdown does
 * on its own — `source` `keyboard` / `search` / `open` / `api`, the option, the list's container and
 * the default `{ block, behavior }`. `false` skips the scroll, a partial replaces the defaults.
 * Fixture: test/before-scroll.html (each instance logs its calls in `el.scrollLog`).
 */
const PAGE = '/test/before-scroll.html';

type Entry = { source: string; value: string | null; index: number; group: string | null; options: { block: string; behavior: string }; hasContainer: boolean; containerClass: string | null; isElement: boolean };

const log = (page: Page, id: string): Promise<Entry[]> =>
    page.locator(`#${id}`).evaluate((el: any) => el.scrollLog);
const resetLog = (page: Page, id: string, answer?: unknown) =>
    page.locator(`#${id}`).evaluate((el: any, a) => { el.scrollLog = []; el.scrollAnswer = a; }, answer);
const listScroll = (page: Page, id: string, selector = '.ms__dropdown-inner') =>
    page.locator(`#${id}`).evaluate((el: any, sel) => el.shadowRoot.querySelector(sel)?.scrollTop ?? -1, selector);

async function open(page: Page, id: string): Promise<void> {
    await page.locator(`#${id} .ms__input`).click();
    await expect(page.locator(`#${id} .ms__dropdown`)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForFunction(() => (document.getElementById('bs-virtual') as any)?.options?.length === 60);
});

test('keyboard: source keyboard with the focused option, nearest + instant; false keeps the list still', async ({ page }) => {
    await open(page, 'bs-list');
    await resetLog(page, 'bs-list', false);
    for (let i = 0; i < 25; i++) await page.keyboard.press('ArrowDown');
    const entries = await log(page, 'bs-list');
    expect(entries.length).toBeGreaterThan(0);
    const last = entries[entries.length - 1];
    expect(last).toMatchObject({ source: 'keyboard', options: { block: 'nearest', behavior: 'auto' }, hasContainer: true, isElement: true });
    expect(last.value).toBe(`v${last.index}`);
    // Every scroll was skipped: the list hasn't moved although the focus is far below the fold.
    expect(await listScroll(page, 'bs-list')).toBe(0);
    // Returning nothing restores the default behaviour.
    await resetLog(page, 'bs-list', undefined);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => listScroll(page, 'bs-list')).toBeGreaterThan(0);
});

test('api: scrollToValue / scrollToGroup report source api; a returned block replaces the default', async ({ page }) => {
    await open(page, 'bs-list');
    await resetLog(page, 'bs-list', false);
    expect(await page.locator('#bs-list').evaluate((el: any) => el.scrollToValue('v40'))).toBe(true); // skipped, still found
    expect(await listScroll(page, 'bs-list')).toBe(0);
    expect((await log(page, 'bs-list'))[0]).toMatchObject({ source: 'api', value: 'v40', index: 40, group: null, options: { block: 'start' } });

    await resetLog(page, 'bs-list', false);
    expect(await page.locator('#bs-list').evaluate((el: any) => el.scrollToGroup('Group 3'))).toBe(true);
    expect((await log(page, 'bs-list'))[0]).toMatchObject({ source: 'api', value: null, index: 30, group: 'Group 3' });
    expect(await listScroll(page, 'bs-list')).toBe(0);

    // `{ block: 'end' }` over the default `start`: the row ends at the bottom edge instead.
    await resetLog(page, 'bs-list', { block: 'end', behavior: 'auto' });
    await page.locator('#bs-list').evaluate((el: any) => el.scrollToValue('v40'));
    const rowBottomGap = await page.locator('#bs-list').evaluate((el: any) => {
        const inner = el.shadowRoot.querySelector('.ms__dropdown-inner');
        const row = el.shadowRoot.querySelector('.ms__option[data-index="40"]');
        return Math.abs(inner.getBoundingClientRect().bottom - row.getBoundingClientRect().bottom);
    });
    expect(rowBottomGap).toBeLessThan(4);
});

test('open: single-select reveals the selected option with source open (center); false leaves it out of view', async ({ page }) => {
    await page.locator('#bs-single').evaluate((el: any) => el.setSelected(['v45']));
    await resetLog(page, 'bs-single', false);
    await open(page, 'bs-single');
    await expect.poll(async () => (await log(page, 'bs-single')).map(e => e.source)).toContain('open');
    const entry = (await log(page, 'bs-single')).find(e => e.source === 'open')!;
    expect(entry).toMatchObject({ value: 'v45', index: 45, options: { block: 'center', behavior: 'auto' }, hasContainer: true });
    expect(await listScroll(page, 'bs-single')).toBe(0);
});

test('search: a navigate-mode jump reports source search', async ({ page }) => {
    await open(page, 'bs-navigate');
    await resetLog(page, 'bs-navigate', undefined);
    await page.keyboard.type('Option 50');
    await expect.poll(async () => (await log(page, 'bs-navigate')).map(e => e.source)).toContain('search');
    const entry = (await log(page, 'bs-navigate')).filter(e => e.source === 'search').pop()!;
    expect(entry.value).toBe('v50');
    await expect.poll(() => listScroll(page, 'bs-navigate')).toBeGreaterThan(0);
});

test('virtual scroll: the gate runs before the index scroll; container is the virtual viewport', async ({ page }) => {
    await open(page, 'bs-virtual');
    await resetLog(page, 'bs-virtual', false);
    expect(await page.locator('#bs-virtual').evaluate((el: any) => el.scrollToIndex(40))).toBe(true);
    const entry = (await log(page, 'bs-virtual'))[0];
    expect(entry).toMatchObject({ source: 'api', value: 'v40', index: 40, hasContainer: true });
    expect(entry.containerClass).toContain('ms__options--virtual');
    expect(await listScroll(page, 'bs-virtual', '.ms__options--virtual')).toBe(0);
    await resetLog(page, 'bs-virtual', undefined);
    await page.locator('#bs-virtual').evaluate((el: any) => el.scrollToIndex(40));
    await expect.poll(() => listScroll(page, 'bs-virtual', '.ms__options--virtual')).toBeGreaterThan(0);
});
