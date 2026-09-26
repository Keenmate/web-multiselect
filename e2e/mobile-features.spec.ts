import { test, expect, Page, Locator } from './fixtures';

/**
 * Mobile (fullscreen-overlay) coverage for the features added this cycle. Runs under the
 * `mobile` Playwright project only (Pixel 7 → `mobile-presentation="auto"` resolves to the
 * fullscreen overlay). The dropdown list — including flat-group cascade headers, their
 * tristate checkbox and the per-group selected-count chip — renders inside
 * `.ms__dropdown--fullscreen`, so this proves those work under touch + the fullscreen path,
 * and that the presentation context (`isFullscreen`) reaches `renderGroupLabelContentCallback`.
 *
 * Fixtures: test/groups.html. Selected-order and the partial "+N more" X live on the control's
 * badges (light DOM, presentation-agnostic) and are covered on desktop in badges.spec.ts.
 */

const PAGE = '/test/groups.html';
const PHONE_PORTRAIT = { width: 412, height: 915 };

const picker = (page: Page, id: string) => page.locator(`#${id}`);
const fullscreen = (p: Locator) => p.locator('.ms__dropdown--fullscreen');
const val = (p: Locator) => p.evaluate((el: any) => el.getValue());

// Force the fullscreen overlay and open it. groups.html carries no `width=device-width`
// viewport meta, so `auto` detection can't rely on the phone viewport here — `fullscreen`
// forces the same overlay UI a phone gets (mobile-presentation is applied in place, so the
// options/selection survive). This is the documented preview/testing path.
async function openFullscreen(p: Locator): Promise<void> {
    await p.evaluate((el: any) => el.setAttribute('mobile-presentation', 'fullscreen'));
    await p.locator('.ms__input').click();
    await expect(fullscreen(p)).toBeVisible();
}
// Scope to the fullscreen overlay so we assert against the on-screen list.
const fsGroupLabel = (p: Locator, name: string) =>
    p.locator(`.ms__dropdown--fullscreen .ms__group-label[data-group="${name}"]`);
const fsOption = (p: Locator, value: string) =>
    p.locator(`.ms__dropdown--fullscreen .ms__option[data-value="${value}"]`);

test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE_PORTRAIT);
    await page.goto(PAGE);
});

test('cascade group header (checkbox + count) works inside the fullscreen overlay', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openFullscreen(p);

    const header = fsGroupLabel(p, 'Fruits');
    const box = header.locator('.ms__checkbox');
    const count = header.locator('.ms__group-count');

    // Nothing selected → no count chip.
    await expect(count).toHaveCount(0);

    // Tap the header → all Fruits selected; chip shows 3; box checked; group not a value.
    await header.click();
    await expect(fsOption(p, 'a1')).toHaveClass(/ms__option--selected/);
    await expect(count).toHaveText('[3]');
    await expect(box).toBeChecked();
    expect(await val(p)).toEqual(['a1', 'a2', 'a3']);
});

test('count chip updates on individual taps in the overlay (indeterminate → checked)', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openFullscreen(p);

    const box = fsGroupLabel(p, 'Fruits').locator('.ms__checkbox');
    const count = fsGroupLabel(p, 'Fruits').locator('.ms__group-count');

    await fsOption(p, 'a1').click();
    await expect(count).toHaveText('[1]');
    await expect(box).toHaveClass(/ms__checkbox--indeterminate/);

    await fsOption(p, 'a2').click();
    await expect(count).toHaveText('[2]');

    await fsOption(p, 'a3').click();
    await expect(count).toHaveText('[3]');
    await expect(box).toBeChecked();
});

test('count chip scales with the header font in the fullscreen overlay (not distorted)', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openFullscreen(p);
    await fsOption(p, 'a1').click(); // chip appears

    const label = fsGroupLabel(p, 'Fruits');
    const labelFs = await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    const chipFs = await label.locator('.ms__group-count')
        .evaluate(el => parseFloat(getComputedStyle(el).fontSize));

    // The chip inherits the header font-size, so in the enlarged overlay it grows with the
    // label instead of staying small inside an oversized box.
    expect(chipFs).toBeCloseTo(labelFs, 1);
});

test('renderGroupLabelContentCallback receives isFullscreen=true + count in the overlay', async ({ page }) => {
    const p = picker(page, 'group-cascade-custom');
    await openFullscreen(p);

    const label = fsGroupLabel(p, 'Fruits').locator('.js-custom-label');
    // Presentation context flowed into the callback while rendered in the fullscreen overlay.
    await expect(label).toHaveAttribute('data-fs', 'true');

    // And the selection context still drives the custom count.
    await fsGroupLabel(p, 'Fruits').click();
    await expect(fsGroupLabel(p, 'Fruits').locator('.js-custom-count')).toHaveText('3/3');
});
