import { test, expect, devices, Page, Locator } from './fixtures';

/**
 * Responsive rules (core SPEC §6.7) on web-multiselect.
 *
 * Fixture test/responsive.html sets a PER-TAG rule before the component script loads
 * (`window.components['web-multiselect'].responsive = { device: { mobile: { presentation:
 * 'floating', badgesDisplayMode: 'count' } } }`), so it also covers registerComponent adopting it.
 * `#axes` carries both map axes (breakpoint.mobile → compact, device.mobile → partial);
 * `#old` uses the pre-rc15 device-keyed shape, which core ignores.
 *
 * - phone (Pixel 7 emulation → deviceClass `mobile`): the page rule applies to a bare picker,
 *   an attribute on the element beats it, the instance `responsive` map beats the attribute;
 *   overrides never reflect.
 * - desktop: no `device.desktop` entry → the page rule adds nothing; a narrowed window hits the
 *   `breakpoint` axis (capability over width: the device stays `desktop`).
 */

const PAGE = '/test/responsive.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

const fullscreen = (p: Locator) => p.locator('.ms__dropdown--fullscreen');
const floatingOpen = (p: Locator) => p.locator('.ms__dropdown--visible:not(.ms__dropdown--fullscreen)');

async function prop(page: Page, id: string, key: string): Promise<unknown> {
    return page.evaluate(async ([id, key]) => {
        const el = document.getElementById(id) as any;
        await el.whenReady();
        await el.whenSettled();
        return el[key];
    }, [id, key] as const);
}

// Pixel 7 without defaultBrowserType (not allowed in a describe group).
const { defaultBrowserType: _ignored, ...PHONE } = devices['Pixel 7'];

test.describe('phone viewport', () => {
    test.skip(({ browserName }) => browserName === 'firefox', 'isMobile unsupported');
    test.use(PHONE);

    test('a per-tag page rule applies to a picker with no own value', async ({ page }) => {
        await page.goto(PAGE);
        expect(await prop(page, 'page', 'presentation')).toBe('floating');
        expect(await prop(page, 'page', 'badgesDisplayMode')).toBe('count');

        // `auto` would open fullscreen on a phone — the rule made it floating.
        const p = picker(page, 'page');
        await p.locator('.ms__input').click();
        await expect(floatingOpen(p)).toBeVisible();
        await expect(fullscreen(p)).toHaveCount(0);

        // Responsive overrides never reflect to attributes.
        await expect(p).not.toHaveAttribute('presentation', 'floating');
        await expect(p).not.toHaveAttribute('badges-display-mode', 'count');
    });

    test('an attribute on the instance beats the page rule', async ({ page }) => {
        await page.goto(PAGE);
        expect(await prop(page, 'attr', 'presentation')).toBe('auto');
        expect(await prop(page, 'attr', 'badgesDisplayMode')).toBe('partial');

        const p = picker(page, 'attr');
        await p.locator('.ms__input').click();
        await expect(fullscreen(p)).toBeVisible();
    });

    test('the instance responsive map beats its own attribute', async ({ page }) => {
        await page.goto(PAGE);
        expect(await prop(page, 'inst', 'presentation')).toBe('fullscreen');
        // keys the instance map does not name still come from the page rule
        expect(await prop(page, 'inst', 'badgesDisplayMode')).toBe('count');
        await expect(picker(page, 'inst')).toHaveAttribute('presentation', 'floating');

        const p = picker(page, 'inst');
        await p.locator('.ms__input').click();
        await expect(fullscreen(p)).toBeVisible();
    });

    test('device axis beats the breakpoint axis on the same key; the old map shape is ignored', async ({ page }) => {
        await page.goto(PAGE);
        // Pixel 7: deviceClass mobile AND breakpoint mobile → device entry wins
        expect(await prop(page, 'axes', 'badgesDisplayMode')).toBe('partial');
        // `{ mobile: … }` (no axis) is ignored → the page rule's `floating` stays
        expect(await prop(page, 'old', 'presentation')).toBe('floating');
    });

    test('a property assignment becomes explicit and beats the page rule', async ({ page }) => {
        await page.goto(PAGE);
        expect(await prop(page, 'page', 'badgesDisplayMode')).toBe('count');
        await page.evaluate(() => { (document.getElementById('page') as any).badgesDisplayMode = 'compact'; });
        expect(await prop(page, 'page', 'badgesDisplayMode')).toBe('compact');
    });
});

test.describe('desktop viewport', () => {
    test('the mobile-only page rule adds nothing', async ({ page }) => {
        await page.goto(PAGE);
        expect(await prop(page, 'page', 'presentation')).toBe('auto');
        expect(await prop(page, 'page', 'badgesDisplayMode')).toBe('badges');
        expect(await prop(page, 'inst', 'presentation')).toBe('floating');
        expect(await prop(page, 'axes', 'badgesDisplayMode')).toBe('badges');
    });

    test('a narrowed desktop window hits the breakpoint axis, not the device axis', async ({ page }) => {
        await page.setViewportSize({ width: 700, height: 800 });
        await page.goto(PAGE);
        expect(await prop(page, 'axes', 'badgesDisplayMode')).toBe('compact');
        // device stays desktop → the device.mobile page rule does not apply
        expect(await prop(page, 'page', 'presentation')).toBe('auto');

        // widening across the 768px line flips the breakpoint-only entry off
        await page.setViewportSize({ width: 1280, height: 800 });
        await expect.poll(() => prop(page, 'axes', 'badgesDisplayMode')).toBe('badges');
    });
});
