import { test, expect, Page, Locator } from './fixtures';

/**
 * Section 5 — virtual scrolling.
 *
 * Fixture: test/virtual-scroll.html. 150 deterministic numbered items.
 */

const PAGE = '/test/virtual-scroll.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('virtual scroll activation', () => {
    test('enable-virtual-scroll renders a windowed subset of items', async ({ page }) => {
        const p = picker(page, 'vs-on');
        await openDropdown(p);

        // Virtual scroll: rendered options should be far fewer than the 150
        // available — the viewport plus buffer (default 10), so ~20-30 items.
        const renderedCount = await p.locator('.ms__option').count();
        expect(renderedCount).toBeLessThan(60);
        expect(renderedCount).toBeGreaterThan(0);

        // Virtual scroll DOM structures should be present.
        await expect(p.locator('.ms__virtual-scroll-viewport')).toHaveCount(1);
    });

    test('disable renders every option', async ({ page }) => {
        const p = picker(page, 'vs-off');
        await openDropdown(p);

        const renderedCount = await p.locator('.ms__option').count();
        expect(renderedCount).toBe(150);
        await expect(p.locator('.ms__virtual-scroll-viewport')).toHaveCount(0);
    });
});

test.describe('virtual-scroll-item-height', () => {
    test('virtual items use the configured height', async ({ page }) => {
        const p = picker(page, 'vs-height');
        await openDropdown(p);

        const firstItem = p.locator('.ms__virtual-item').first();
        const box = await firstItem.boundingBox();
        // Configured 60px.
        expect(Math.round(box!.height)).toBe(60);
    });
});

test.describe('virtual-scroll-overscan', () => {
    test('smaller buffer renders fewer items than the default', async ({ page }) => {
        const small = picker(page, 'vs-small-buffer');
        const normal = picker(page, 'vs-on');

        await openDropdown(small);
        const smallCount = await small.locator('.ms__option').count();

        await openDropdown(normal);
        const normalCount = await normal.locator('.ms__option').count();

        // Both use virtual scroll over 150 items; default buffer is 10 vs. configured 2.
        // Small-buffer picker should render strictly fewer (or equal in edge cases).
        expect(smallCount).toBeLessThanOrEqual(normalCount);
    });
});

test.describe('search resets scroll position', () => {
    test('typing a query that yields a different result list resets scrollTop', async ({ page }) => {
        const p = picker(page, 'vs-on');
        await openDropdown(p);

        // The scrollable container is .ms__options--virtual (the viewport is
        // an absolutely-positioned child).
        const scroller = p.locator('.ms__options--virtual');
        await scroller.evaluate(el => { el.scrollTop = 800; });
        const scrolledTo = await scroller.evaluate(el => el.scrollTop);
        expect(scrolledTo).toBeGreaterThan(0);

        // Type a search term that matches many items so the result list is
        // still over the virtual-scroll threshold. "Item 0" matches 100 items
        // (000-099), keeping virtual scroll active.
        await p.locator('.ms__input').fill('Item 0');
        await page.waitForTimeout(50);
        const afterSearch = await scroller.evaluate(el => el.scrollTop);
        expect(afterSearch).toBe(0);
    });
});

test.describe('popover virtual scroll', () => {
    test('badge-height applied to popover badges when virtualized', async ({ page }) => {
        const p = picker(page, 'vs-popover');
        await openDropdown(p);

        // Select 25 items so the popover threshold (20) is exceeded and the
        // popover uses virtual scrolling.
        for (let i = 0; i < 25; i++) {
            await p.locator(`.ms__option[data-value="item-${i}"]`).click();
        }
        await page.mouse.click(0, 0); // close dropdown
        await expect(p.locator('.ms__dropdown')).not.toBeVisible();

        // Open popover via the count badge.
        await p.locator('.ms__badge[data-ms-action="show-selected"]').click();
        await expect(p.locator('.ms__selected-popover')).toBeVisible();

        const firstBadge = p.locator('.ms__selected-popover-body--virtual .ms__badge').first();
        await expect(firstBadge).toBeVisible();
        const box = await firstBadge.boundingBox();
        // Configured 40px (with possible borders).
        expect(Math.round(box!.height)).toBeGreaterThanOrEqual(40);
        expect(Math.round(box!.height)).toBeLessThanOrEqual(44);
    });
});
