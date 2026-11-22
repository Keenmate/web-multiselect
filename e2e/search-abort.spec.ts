import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/search-abort.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

const aborted = (page: Page): Promise<number> => page.evaluate(() => (window as any).__aborted);

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('a newer search aborts the previous in-flight request', async ({ page }) => {
    const p = picker(page, 'ms-abort');
    await p.locator('.ms__input').click();
    // No debounce: each keystroke fires a request; the 300ms-slow first one is still
    // in flight when the second starts, so it must be aborted.
    await p.locator('.ms__input').type('ab', { delay: 60 });

    await expect.poll(() => aborted(page)).toBe(1);
});

test('only the surviving request applies its results', async ({ page }) => {
    const p = picker(page, 'ms-abort');
    await p.locator('.ms__input').click();
    await p.locator('.ms__input').type('ab', { delay: 60 });

    // Wait past the 300ms callback delay for the live request to settle.
    await page.waitForTimeout(500);

    const options = p.locator('.ms__option');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText('AB');
});

test('destroying the element aborts the in-flight request', async ({ page }) => {
    // The abort runs in removedCallback() — once the removal is confirmed at the next animation
    // frame. Under a loaded run that frame can come later than the fixture's 300 ms delay, so the
    // request resolved first and there was nothing left to abort: keep it in flight longer.
    await page.evaluate(() => { (window as any).__searchDelay = 10_000; });
    const p = picker(page, 'ms-abort');
    await p.locator('.ms__input').click();
    await p.locator('.ms__input').type('a', { delay: 0 });

    // Remove the element while the request is still in flight → its signal should abort.
    await expect.poll(() => page.evaluate(() => (window as any).__started)).toBe(1);
    await p.evaluate((el) => el.remove());
    await expect.poll(() => aborted(page)).toBe(1);
});
