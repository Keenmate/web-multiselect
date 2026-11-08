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

// The selected-items popover is a node of core's overlay tree (createPopover), like the dropdown.
test.describe('selected-items popover dismissal (core overlay tree)', () => {
    async function openPopover(page: Page): Promise<Locator> {
        const p = picker(page, 'counter-on');
        await select(p, 'apple', 'cherry');
        await page.mouse.click(0, 0); // close the dropdown
        await p.locator('.ms__counter').click();
        await expect(p.locator('.ms__selected-popover')).toBeVisible();
        return p;
    }

    test('a click outside closes it; a click inside it does not', async ({ page }) => {
        const p = await openPopover(page);
        await p.locator('.ms__selected-popover-header').click();
        await expect(p.locator('.ms__selected-popover')).toBeVisible();
        await page.mouse.click(0, 0);
        await expect(p.locator('.ms__selected-popover')).toBeHidden();
    });

    test('the counter toggles it closed again', async ({ page }) => {
        const p = await openPopover(page);
        await p.locator('.ms__counter').click();
        await expect(p.locator('.ms__selected-popover')).toBeHidden();
    });

    test('Escape closes it wherever focus is, and only it', async ({ page }) => {
        const p = await openPopover(page);
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await page.keyboard.press('Escape');
        await expect(p.locator('.ms__selected-popover')).toBeHidden();
        await expect(p.locator('.ms__dropdown')).toBeHidden();
    });

    test('opening another picker closes it (one overlay open at a time)', async ({ page }) => {
        const p = await openPopover(page);
        const other = picker(page, 'counter-cb');
        await other.evaluate((el: any) => el.open()); // the popover may cover its input
        await expect(other.locator('.ms__dropdown')).toBeVisible();
        await expect(p.locator('.ms__selected-popover')).toBeHidden();
    });
});
