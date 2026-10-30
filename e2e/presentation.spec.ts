import { test, expect, Page, Locator } from './fixtures';

/**
 * Mobile presentation + device rotation.
 *
 * Runs under the `mobile` Playwright project only (see playwright.config.ts):
 * a Pixel 7 context reports a coarse pointer and no hover, so it is
 * `isTouchPrimary` — the precondition for `presentation="auto"` to
 * resolve to the fullscreen overlay. A desktop context never takes that branch.
 *
 * "Rotation" in Playwright is a viewport-dimension swap: there is no literal
 * rotate API, but swapping width/height fires a real `resize`, flips the
 * `(orientation: …)` media query, and re-runs core's environment observable —
 * which is exactly what `resolvePresentation` / `classifyDevice` react to. The
 * phone/tablet cut is the *shorter* viewport side vs the `sw600dp` line, so it is
 * orientation-robust: a phone stays a phone in landscape.
 *
 * Fixture: test/presentation.html.
 */

const PAGE = '/test/presentation.html';

// A phone's two orientations: same device, shorter side stays < 600 either way.
const PHONE_PORTRAIT = { width: 412, height: 915 };
const PHONE_LANDSCAPE = { width: 915, height: 412 };
// A tablet-class viewport: shorter side >= 600 crosses the sw600dp line, so even a
// touch-primary context resolves to the floating panel.
const TABLET_PORTRAIT = { width: 820, height: 1180 };

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function input(p: Locator): Locator {
    return p.locator('.ms__input');
}

function fullscreen(p: Locator): Locator {
    return p.locator('.ms__dropdown--fullscreen');
}

// Open + floating: the panel is visible but NOT the fullscreen overlay.
function floatingOpen(p: Locator): Locator {
    return p.locator('.ms__dropdown--visible:not(.ms__dropdown--fullscreen)');
}

test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE_PORTRAIT);
    await page.goto(PAGE);
});

test.describe('presentation="auto" on a touch phone', () => {
    test('opens as a fullscreen overlay in portrait', async ({ page }) => {
        const p = picker(page, 'auto');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
    });

    test('stays fullscreen when rotated to landscape (shorter side still < 600)', async ({ page }) => {
        const p = picker(page, 'auto');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();

        // Rotate the open sheet: same device, now landscape. Still a phone.
        await page.setViewportSize(PHONE_LANDSCAPE);

        await expect(fullscreen(p)).toBeVisible();
        await expect(floatingOpen(p)).toHaveCount(0);
    });

    test('resolves fullscreen when the picker is opened while already in landscape', async ({ page }) => {
        await page.setViewportSize(PHONE_LANDSCAPE);
        const p = picker(page, 'auto');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
    });

    test('live-swaps fullscreen → floating when resized past the tablet boundary', async ({ page }) => {
        const p = picker(page, 'auto');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();

        // Grow the viewport so the shorter side crosses sw600dp — a tablet now,
        // even though the pointer is still coarse. The open panel re-presents live.
        await page.setViewportSize(TABLET_PORTRAIT);

        await expect(fullscreen(p)).toBeHidden();
        await expect(floatingOpen(p)).toBeVisible();
    });

    test('swaps back to fullscreen when rotated/resized back to phone dimensions', async ({ page }) => {
        const p = picker(page, 'auto');
        await input(p).click();

        await page.setViewportSize(TABLET_PORTRAIT);
        await expect(floatingOpen(p)).toBeVisible();

        await page.setViewportSize(PHONE_PORTRAIT);
        await expect(fullscreen(p)).toBeVisible();
        await expect(floatingOpen(p)).toHaveCount(0);
    });
});

test.describe('forced modes ignore rotation', () => {
    test('floating stays anchored across a rotation', async ({ page }) => {
        const p = picker(page, 'floating');
        await input(p).click();
        await expect(floatingOpen(p)).toBeVisible();
        await expect(fullscreen(p)).toHaveCount(0);

        await page.setViewportSize(PHONE_LANDSCAPE);
        await expect(floatingOpen(p)).toBeVisible();
        await expect(fullscreen(p)).toHaveCount(0);
    });

    test('fullscreen stays an overlay across a rotation and a tablet resize', async ({ page }) => {
        const p = picker(page, 'fullscreen');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();

        await page.setViewportSize(PHONE_LANDSCAPE);
        await expect(fullscreen(p)).toBeVisible();

        await page.setViewportSize(TABLET_PORTRAIT);
        await expect(fullscreen(p)).toBeVisible();
    });
});

test.describe('fullscreen scale under base-css-variables (--base-rem: 1rem)', () => {
    // --ms-rem is var(--base-rem, 10px). With the contract loaded it is `1rem`: the
    // JS-driven virtual row height must scale by --ms-fullscreen-rem / --ms-rem (1.2),
    // measured as lengths — parseFloat('1rem') used to give 12× (600px rows).
    test('virtual rows are 1.2× the option height, not 12×', async ({ page }) => {
        await page.addStyleTag({ content: ':root { --base-rem: 1rem; }' });
        const p = picker(page, 'fullscreen');
        await p.evaluate((el) => el.setAttribute('enable-virtual-scroll', ''));
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
        const height = await p.evaluate((el) => {
            const box = el.shadowRoot!.querySelector<HTMLElement>('[style*="--ms-option-height"]');
            return box?.style.getPropertyValue('--ms-option-height');
        });
        expect(height).toBe('60px');
    });
});
