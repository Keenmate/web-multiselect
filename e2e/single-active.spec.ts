import { test, expect, Page, Locator } from './fixtures';

/**
 * Cross-component "one overlay open at a time" — opening a multiselect dismisses any
 * other open one (core `registerOverlay` coordination). This is the fix for the old
 * behaviour where two multiselects could be open simultaneously.
 *
 * Fixture: test/single-active.html — two independent multiselects side by side.
 */

const PAGE = '/test/single-active.html';

const dropdown = (p: Locator): Locator => p.locator('.ms__dropdown');

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('clicking a second multiselect closes the first', async ({ page }) => {
    const a = page.locator('#ms-a');
    const b = page.locator('#ms-b');

    await a.locator('.ms__input').click();
    await expect(dropdown(a)).toBeVisible();

    await b.locator('.ms__input').click();
    await expect(dropdown(b)).toBeVisible();
    await expect(dropdown(a)).toBeHidden(); // A dismissed when B opened
});

test('programmatic open() also dismisses the other', async ({ page }) => {
    const a = page.locator('#ms-a');
    const b = page.locator('#ms-b');

    await a.evaluate((el) => (el as unknown as { open(): void }).open());
    await expect(dropdown(a)).toBeVisible();

    await b.evaluate((el) => (el as unknown as { open(): void }).open());
    await expect(dropdown(b)).toBeVisible();
    await expect(dropdown(a)).toBeHidden();
});

test('an external km-overlay-activated event (no core import) closes an open multiselect', async ({ page }) => {
    // Proves the framework-agnostic path end-to-end in a real browser: a Svelte / plain-DOM
    // popover that never imported core just dispatches the document event, and the KM
    // multiselect dismisses.
    const a = page.locator('#ms-a');
    await a.locator('.ms__input').click();
    await expect(dropdown(a)).toBeVisible();

    await page.evaluate(() =>
        document.dispatchEvent(
            new CustomEvent('km-overlay-activated', { detail: { source: 'external-popover' } }),
        ),
    );
    await expect(dropdown(a)).toBeHidden();
});

// Group scoping is about the coordination BROADCAST — opening one overlay dismisses only
// same-group overlays. (Outside-click close is separate and always on, so these use
// programmatic open() to isolate the broadcast behaviour.)
test('same group: opening one dismisses the other in that group', async ({ page }) => {
    const a1 = page.locator('#alpha-1');
    const a2 = page.locator('#alpha-2');

    await a1.evaluate((el) => (el as unknown as { open(): void }).open());
    await expect(dropdown(a1)).toBeVisible();

    await a2.evaluate((el) => (el as unknown as { open(): void }).open());
    await expect(dropdown(a2)).toBeVisible();
    await expect(dropdown(a1)).toBeHidden(); // same group → dismissed
});

test('different groups: opening one leaves the other group open', async ({ page }) => {
    const a1 = page.locator('#alpha-1');
    const b1 = page.locator('#beta-1');

    await a1.evaluate((el) => (el as unknown as { open(): void }).open());
    await b1.evaluate((el) => (el as unknown as { open(): void }).open());

    // Different groups don't coordinate → both stay open.
    await expect(dropdown(b1)).toBeVisible();
    await expect(dropdown(a1)).toBeVisible();
});

test('a grouped overlay ignores the default (ungrouped) group', async ({ page }) => {
    const ungrouped = page.locator('#ms-a');
    const a1 = page.locator('#alpha-1');

    await ungrouped.evaluate((el) => (el as unknown as { open(): void }).open());
    await a1.evaluate((el) => (el as unknown as { open(): void }).open());

    await expect(dropdown(a1)).toBeVisible();
    await expect(dropdown(ungrouped)).toBeVisible(); // default group ≠ 'alpha'
});

test('closing the active one leaves the other closed (no accidental reopen)', async ({ page }) => {
    const a = page.locator('#ms-a');
    const b = page.locator('#ms-b');

    await a.locator('.ms__input').click();
    await expect(dropdown(a)).toBeVisible();
    // Toggle A shut via its own input.
    await a.locator('.ms__input').click();
    await expect(dropdown(a)).toBeHidden();
    await expect(dropdown(b)).toBeHidden();
});
