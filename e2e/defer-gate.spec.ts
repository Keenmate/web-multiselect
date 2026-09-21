import { test, expect, Page, Locator } from './fixtures';

/**
 * `defer` / `ready()` render gate. While `defer` is present the element builds NO
 * shadow content on upgrade — options, callbacks and listeners are wired first,
 * then the gate is released (imperatively via `ready()`, or by removing the
 * attribute) and the picker is built ONCE with everything already applied.
 *
 * The load-bearing case is flash-freedom: a `customStylesCallback` set WHILE
 * deferred must be in effect at the first paint, so the pre-selected badges appear
 * already styled — never with the default badge background for a frame.
 *
 * Fixture: test/defer-gate.html — two deferred multiselects, released two ways.
 */

const PAGE = '/test/defer-gate.html';

const control = (page: Page, id: string): Locator => page.locator(`#${id} .ms__input`);
const badge = (page: Page, id: string): Locator => page.locator(`#${id} .ms__badge`).first();
const isReady = (page: Page, id: string): Promise<boolean> =>
    page.locator(`#${id}`).evaluate((el) => (el as unknown as { isReady: boolean }).isReady);

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('holds the build while deferred — nothing rendered, not ready', async ({ page }) => {
    // The control chrome is not built and `is-ready` is not reflected.
    await expect(control(page, 'ms-ready')).toHaveCount(0);
    expect(await isReady(page, 'ms-ready')).toBe(false);
    expect(await page.locator('#ms-ready').getAttribute('is-ready')).toBeNull();
    // No `ready` event has fired yet.
    await expect(page.locator('#ready-count')).toHaveText('0');
});

test('ready() builds once, reflects is-ready, and fires ready exactly once', async ({ page }) => {
    await page.locator('#btn-ready').click();

    await expect(control(page, 'ms-ready')).toBeVisible();
    expect(await isReady(page, 'ms-ready')).toBe(true);
    await expect(page.locator('#ms-ready')).toHaveAttribute('is-ready', '');
    await expect(page.locator('#ready-count')).toHaveText('1');

    // Idempotent: a second ready() neither rebuilds nor re-announces.
    await page.locator('#btn-ready').click();
    await page.waitForTimeout(50);
    await expect(page.locator('#ready-count')).toHaveText('1');
});

test('the deferred customStylesCallback is in effect at first paint (no flash)', async ({ page }) => {
    await page.locator('#btn-ready').click();

    // The pre-selected (initial-values) badges render immediately with the custom
    // color wired while deferred — not the default badge background.
    const b = badge(page, 'ms-ready');
    await expect(b).toBeVisible();
    await expect(b).toHaveCSS('background-color', 'rgb(109, 40, 217)');
    // Two initial values → two badges built in the single render.
    await expect(page.locator('#ms-ready .ms__badge')).toHaveCount(2);
});

test('removing the `defer` attribute releases the gate (server-driven path)', async ({ page }) => {
    await expect(control(page, 'ms-attr')).toHaveCount(0);

    await page.locator('#btn-remove').click();

    await expect(control(page, 'ms-attr')).toBeVisible();
    expect(await isReady(page, 'ms-attr')).toBe(true);
    await expect(page.locator('#ms-attr')).toHaveAttribute('is-ready', '');
});
