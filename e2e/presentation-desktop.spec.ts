import { test, expect, Page, Locator } from './fixtures';

/**
 * Mobile presentation — the desktop half.
 *
 * Runs under the default `chromium` (desktop) project: a fine pointer + hover, so
 * NOT `isTouchPrimary`. This pins the rc07 capability gate: `classifyDevice`
 * returns `desktop` at *any* window width for a non-touch device, so shrinking a
 * desktop window to phone-narrow dimensions keeps `presentation="auto"` on
 * the floating panel — it must never flip to the fullscreen sheet. (The touch
 * phone/rotation behavior lives in presentation.spec.ts under the `mobile`
 * project.)
 *
 * Fixture: test/presentation.html.
 */

const PAGE = '/test/presentation.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function input(p: Locator): Locator {
    return p.locator('.ms__input');
}

function fullscreen(p: Locator): Locator {
    return p.locator('.ms__dropdown--fullscreen');
}

function floatingOpen(p: Locator): Locator {
    return p.locator('.ms__dropdown--visible:not(.ms__dropdown--fullscreen)');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('presentation="auto" on a non-touch desktop', () => {
    test('stays floating even when the window is shrunk to phone-narrow width', async ({ page }) => {
        const p = picker(page, 'auto');

        // A fine-pointer desktop is `desktop` at any width — capability decides before
        // size. Narrow the window well below the 600px shorter-side line…
        await page.setViewportSize({ width: 360, height: 780 });

        await input(p).click();
        // …and it is still the floating panel, never the fullscreen overlay.
        await expect(floatingOpen(p)).toBeVisible();
        await expect(fullscreen(p)).toHaveCount(0);
    });

    test('stays floating live when an open panel is shrunk to phone-narrow width', async ({ page }) => {
        const p = picker(page, 'auto');
        await input(p).click();
        await expect(floatingOpen(p)).toBeVisible();

        await page.setViewportSize({ width: 360, height: 780 });

        await expect(floatingOpen(p)).toBeVisible();
        await expect(fullscreen(p)).toHaveCount(0);
    });
});
