import { test, expect } from './fixtures';

/**
 * E2E for `search-mode="navigate"` on a LONG tree with virtual scrolling.
 *
 * Navigate mode keeps the whole tree and moves focus to the first match. When that
 * match sits far below the fold, the virtual viewport must scroll to it so the focused
 * row is actually rendered and visible — not just "focused" by index off-screen.
 *
 * Fixture: test/tree.html (`tree-navigate-virtual`) — 30 branches x 10 leaves; the
 * single "Zebra" node is leaf 28.7 (~row 305 of 330).
 */

const PAGE = '/test/tree.html';

test('search jumps to (and scrolls to) a match far below the fold', async ({ page }) => {
    await page.goto(PAGE);
    const p = page.locator('#tree-navigate-virtual');
    const input = p.locator('.ms__input');

    await input.click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
    await expect(p.locator('.ms__option', { hasText: 'Branch 1' }).first()).toBeVisible();

    await input.fill('Zebra');

    const focused = p.locator('.ms__option--focused');
    await expect(focused).toHaveCount(1);
    await expect(focused).toHaveText(/Zebra/);
    await expect(focused).toBeInViewport();
});

test('flat list: search jumps to (and scrolls to) a match far below the fold', async ({ page }) => {
    await page.goto('/test/virtual-scroll.html');
    const p = page.locator('#vs-navigate');
    const input = p.locator('.ms__input');

    await input.click();
    await expect(p.locator('.ms__option', { hasText: 'Item 000' })).toBeVisible();

    await input.fill('Item 140');

    const focused = p.locator('.ms__option--focused');
    await expect(focused).toHaveCount(1);
    await expect(focused).toHaveText(/Item 140/);
    await expect(focused).toBeInViewport();
});
