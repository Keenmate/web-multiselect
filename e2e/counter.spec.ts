import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/counter.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function select(p: Locator, ...values: string[]): Promise<void> {
    await p.locator('.ms__input').click();
    for (const v of values) {
        await p.locator(`.ms__option[data-value="${v}"]`).click();
    }
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('show-counter displays a badge next to the toggle when count > 0', async ({ page }) => {
    const p = picker(page, 'counter-on');
    await select(p, 'apple');

    await expect(p.locator('.ms__counter')).toBeVisible();
    await expect(p.locator('.ms__counter')).toContainText('[1]');
});

test('counter hidden when nothing selected', async ({ page }) => {
    const p = picker(page, 'counter-on');
    // No selection yet — counter should be display:none.
    const display = await p.locator('.ms__counter').evaluate(el => (el as HTMLElement).style.display);
    expect(display).toBe('none');
});

test('clicking counter opens selected-items popover', async ({ page }) => {
    const p = picker(page, 'counter-on');
    await select(p, 'apple', 'cherry');
    await page.mouse.click(0, 0); // close dropdown

    await p.locator('.ms__counter').click();
    await expect(p.locator('.ms__selected-popover')).toBeVisible();
});

test('getCounterCallback formats the count-mode badge text', async ({ page }) => {
    const p = picker(page, 'counter-cb');
    await select(p, 'apple', 'banana');
    await page.mouse.click(0, 0);

    // Count-mode badge in the badges area uses getCounterCallback.
    const countBadge = p.locator('.ms__badges .ms__badge[data-ms-action="show-selected"]');
    await expect(countBadge).toContainText('2 items');
});
