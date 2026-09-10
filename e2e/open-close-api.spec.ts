import { test, expect, Page, Locator } from './fixtures';

/**
 * Imperative open/close API on the element: open() / close() / toggle() and the
 * isOpen property (get + set).
 *
 * The load-bearing case is open() driven from a consumer's OWN button click. The
 * component closes on an outside click via a document-level listener; without a
 * guard, that same click would bubble up right after open() ran and immediately
 * re-close the dropdown. open() arms a one-tick guard so the opening click is not
 * misread as an outside-click (mirrors the internal pointer-open path).
 *
 * Fixture: test/open-close-api.html — one multiselect plus light-DOM buttons that
 * call each method / assign the property.
 */

const PAGE = '/test/open-close-api.html';

const dropdown = (page: Page): Locator => page.locator('#ms .ms__dropdown');
const isOpen = (page: Page): Promise<boolean> =>
    page.locator('#ms').evaluate((el) => (el as unknown as { isOpen: boolean }).isOpen);

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('open() from a button click opens and stays open', async ({ page }) => {
    await page.locator('#btn-open').click();
    await expect(dropdown(page)).toBeVisible();

    // Let the click fully settle — the regression closed it on the trailing
    // document click a tick later.
    await page.waitForTimeout(50);
    await expect(dropdown(page)).toBeVisible();
    expect(await isOpen(page)).toBe(true);
});

test('close() from a button click closes', async ({ page }) => {
    await page.locator('#btn-open').click();
    await expect(dropdown(page)).toBeVisible();

    await page.locator('#btn-close').click();
    await expect(dropdown(page)).toBeHidden();
    expect(await isOpen(page)).toBe(false);
});

test('toggle() flips the dropdown open then closed', async ({ page }) => {
    await page.locator('#btn-toggle').click();
    await expect(dropdown(page)).toBeVisible();

    await page.locator('#btn-toggle').click();
    await expect(dropdown(page)).toBeHidden();
});

test('isOpen property setter opens and closes', async ({ page }) => {
    await page.locator('#btn-prop-open').click();
    await expect(dropdown(page)).toBeVisible();
    expect(await isOpen(page)).toBe(true);

    await page.locator('#btn-prop-close').click();
    await expect(dropdown(page)).toBeHidden();
    expect(await isOpen(page)).toBe(false);
});
