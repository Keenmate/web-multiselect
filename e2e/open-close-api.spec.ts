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

test('scrollToIndex from a button click re-drives the open panel without closing it', async ({ page }) => {
    await page.locator('#btn-open').click();
    await expect(dropdown(page)).toBeVisible();

    // Repeat-click an EXTERNAL control that re-drives the already-open dropdown. The
    // regression: open() no-ops when already open, so its guard didn't arm and the
    // scroll command's own click bubbled to the outside-click listener and closed the
    // panel — the "every second click closes it" symptom. scrollTo* now arms the guard.
    for (let i = 0; i < 4; i++) {
        await page.locator('#btn-scroll').click();
        await page.waitForTimeout(30);
        await expect(dropdown(page)).toBeVisible();
    }
    expect(await isOpen(page)).toBe(true);
});

test('isOpen property setter opens and closes', async ({ page }) => {
    await page.locator('#btn-prop-open').click();
    await expect(dropdown(page)).toBeVisible();
    expect(await isOpen(page)).toBe(true);

    await page.locator('#btn-prop-close').click();
    await expect(dropdown(page)).toBeHidden();
    expect(await isOpen(page)).toBe(false);
});

test('open / close events (+ onOpen / onClose twins) fire once per transition', async ({ page }) => {
    await page.locator('#ms').evaluate((el: any) => {
        const w = window as any;
        w.__oc = [];
        el.addEventListener('open', (e: CustomEvent) => w.__oc.push(['open', !!e.detail.controller, e.detail.presentation]));
        el.addEventListener('close', (e: CustomEvent) => w.__oc.push(['close', !!e.detail.controller]));
        el.onOpen = () => w.__oc.push(['onOpen']);
        el.onClose = () => w.__oc.push(['onClose']);
    });
    await page.locator('#btn-open').click();
    await expect(dropdown(page)).toBeVisible();
    await page.locator('#btn-open').click(); // already open: no second event
    await page.locator('#btn-close').click();
    await expect(dropdown(page)).toBeHidden();
    await page.locator('#btn-close').click(); // already closed: no second event
    expect(await page.evaluate(() => (window as any).__oc)).toEqual([
        ['onOpen'], ['open', true, 'floating'], ['onClose'], ['close', true],
    ]);
});

test('showMessage / hideMessage / isMessageShown (element + controller)', async ({ page }) => {
    const ms = page.locator('#ms');
    expect(await ms.evaluate((el: any) => el.isMessageShown)).toBe(false);
    await ms.evaluate((el: any) => el.showMessage('Heads up', { variant: 'warning', autoHideMs: 0 }));
    expect(await ms.evaluate((el: any) => [el.isMessageShown, el.controller.isMessageShown])).toEqual([true, true]);
    await ms.evaluate((el: any) => el.controller.hideMessage());
    expect(await ms.evaluate((el: any) => el.isMessageShown)).toBe(false);
});
