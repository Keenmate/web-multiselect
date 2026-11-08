import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/rtl.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('dir="rtl" attribute adds the ms--rtl modifier class to the host container', async ({ page }) => {
    const inner = picker(page, 'rtl-explicit').locator('.ms-container, .ms__container, [class*="ms-"]').first();
    // The picker's inner container should have ms--rtl somewhere.
    const hasRtl = await picker(page, 'rtl-explicit').evaluate((el: any) =>
        !!el.shadowRoot?.querySelector('.ms--rtl')
    );
    expect(hasRtl).toBe(true);
});

test('ancestor dir="rtl" propagates to the picker', async ({ page }) => {
    const hasRtl = await picker(page, 'rtl-ancestor').evaluate((el: any) =>
        !!el.shadowRoot?.querySelector('.ms--rtl')
    );
    expect(hasRtl).toBe(true);
});

// The direction is the effective CSS `direction` (core `isRtl`), not a search for a `dir="rtl"`
// ancestor: a nearer dir="ltr" wins, and a CSS `direction` rule counts.
test('a nested dir="ltr" inside an RTL section stays LTR', async ({ page }) => {
    const hasRtl = await picker(page, 'ltr-nested').evaluate((el: any) => !!el.shadowRoot?.querySelector('.ms--rtl'));
    expect(hasRtl).toBe(false);
});

test('a CSS direction: rtl on an ancestor makes the picker RTL', async ({ page }) => {
    const hasRtl = await picker(page, 'rtl-css').evaluate((el: any) => !!el.shadowRoot?.querySelector('.ms--rtl'));
    expect(hasRtl).toBe(true);
});

test('LTR control does not have ms--rtl class', async ({ page }) => {
    const hasRtl = await picker(page, 'ltr-control').evaluate((el: any) =>
        !!el.shadowRoot?.querySelector('.ms--rtl')
    );
    expect(hasRtl).toBe(false);
});

// Layout mirroring — the component is authored with CSS logical properties, so
// these assert the *rendered geometry* flips under RTL (not just that a class is
// present). Centre-x comparisons are direction-of-mirroring checks.
const centreX = (loc: Locator) =>
    loc.evaluate((el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2;
    });

test('dropdown inherits direction: rtl', async ({ page }) => {
    const dir = await picker(page, 'rtl-explicit')
        .locator('.ms__dropdown')
        .evaluate((el) => getComputedStyle(el).direction);
    expect(dir).toBe('rtl');
});

test('toggle icon sits on the leading (left) edge in RTL, trailing (right) in LTR', async ({ page }) => {
    const rtl = picker(page, 'rtl-explicit');
    expect(await centreX(rtl.locator('.ms__toggle')))
        .toBeLessThan(await centreX(rtl.locator('.ms__input')));

    const ltr = picker(page, 'ltr-control');
    expect(await centreX(ltr.locator('.ms__toggle')))
        .toBeGreaterThan(await centreX(ltr.locator('.ms__input')));
});

test('badge remove button mirrors to the left of the text in RTL', async ({ page }) => {
    const rtl = picker(page, 'rtl-explicit'); // has a pre-selected badge
    expect(await centreX(rtl.locator('.ms__badge-remove').first()))
        .toBeLessThan(await centreX(rtl.locator('.ms__badge-text').first()));
});

test('option checkbox mirrors to the right side of the row in RTL', async ({ page }) => {
    const rtl = picker(page, 'rtl-explicit');
    await rtl.locator('.ms__input').click();
    await expect(rtl.locator('.ms__dropdown')).toBeVisible();
    const opt = rtl.locator('.ms__option').first();
    expect(await centreX(opt.locator('.ms__checkbox')))
        .toBeGreaterThan(await centreX(opt));
});

test('fullscreen overlay mirrors: close button on the left of the search in RTL', async ({ page }) => {
    const fs = picker(page, 'rtl-fs');
    await fs.locator('.ms__input').click();
    await expect(fs.locator('.ms__dropdown--fullscreen')).toBeVisible();
    expect(await centreX(fs.locator('.ms__fullscreen-close')))
        .toBeLessThan(await centreX(fs.locator('.ms__fullscreen-search')));
});

// Runtime direction switch: the element observes `dir` and re-mirrors the live
// picker (app-wide RTL/LTR toggle), including the panels appended to the shadow root.
test('changing dir at runtime re-mirrors the component (and reverts)', async ({ page }) => {
    const el = picker(page, 'ltr-control'); // built LTR
    const hasRtlClass = () => el.evaluate((n: any) => !!n.shadowRoot?.querySelector('.ms--rtl'));
    const dropdownDir = () => el.locator('.ms__dropdown').evaluate((e) => getComputedStyle(e).direction);

    // Baseline: toggle trailing (right), no rtl class.
    expect(await centreX(el.locator('.ms__toggle'))).toBeGreaterThan(await centreX(el.locator('.ms__input')));
    expect(await hasRtlClass()).toBe(false);

    // Flip to RTL.
    await el.evaluate((n) => n.setAttribute('dir', 'rtl'));
    expect(await centreX(el.locator('.ms__toggle'))).toBeLessThan(await centreX(el.locator('.ms__input')));
    expect(await hasRtlClass()).toBe(true);
    expect(await dropdownDir()).toBe('rtl');

    // Flip back to LTR — must fully revert (panels included).
    await el.evaluate((n) => n.setAttribute('dir', 'ltr'));
    expect(await centreX(el.locator('.ms__toggle'))).toBeGreaterThan(await centreX(el.locator('.ms__input')));
    expect(await hasRtlClass()).toBe(false);
    expect(await dropdownDir()).toBe('ltr');
});
