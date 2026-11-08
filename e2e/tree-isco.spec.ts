import { test, expect, Page, Locator } from './fixtures';

/**
 * E2E for the "real data" setup of the examples-tree ISCO demo (fixture test/tree-isco.html): the full ISCO-08
 * occupation classification (619 groups) fetched as JSON and driven through tree
 * mode + virtual scroll + leaves-only selectability + breadcrumb badges. Proves
 * the tree features hold up on a real, large, deep hierarchy in a browser.
 */

const PAGE = '/test/tree-isco.html';

function isco(page: Page): Locator {
    return page.locator('#tree-isco');
}

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    // Wait for the fetched JSON to be applied (options loaded).
    await expect
        .poll(async () => isco(page).evaluate((el: any) => (el.options?.length ?? 0)))
        .toBeGreaterThan(600);
});

test('loads the full ISCO-08 classification (619 groups)', async ({ page }) => {
    const count = await isco(page).evaluate((el: any) => el.options.length);
    expect(count).toBe(619);
});

test('rows are compact (virtual-scroll-item-height 32, not the 50px default)', async ({ page }) => {
    const p = isco(page);
    await openDropdown(p);
    const h = await p.locator('.ms__option').first().evaluate(
        (el) => el.getBoundingClientRect().height
    );
    expect(h).toBeLessThanOrEqual(34);
});

test('clearing the search with Escape restores the full tree (no blank virtual list)', async ({ page }) => {
    const p = isco(page);
    await openDropdown(p);

    // Filter down to a few matches…
    await p.locator('.ms__input').fill('nursi');
    await expect(p.locator('.ms__option[data-value="2221"]')).toBeVisible(); // Nursing Professionals

    // …then clear the filter text with Escape (does NOT close the dropdown).
    await p.locator('.ms__input').press('Escape');
    await expect(p.locator('.ms__input')).toHaveValue('');
    await expect(p.locator('.ms__dropdown')).toBeVisible();

    // Regression: the tree must come back, not a blank list with reserved height.
    // The virtual window renders many rows again (the bug rendered zero).
    await expect.poll(async () => p.locator('.ms__option').count()).toBeGreaterThan(8);
});

test('built-in search matches the ISCO code, not just the title (getSearchValueCallback)', async ({ page }) => {
    const p = isco(page);
    await openDropdown(p);

    // "2211" is a code (Generalist Medical Practitioners), absent from every title —
    // it resolves only because getSearchValueCallback adds the code to the filter text.
    await p.locator('.ms__input').fill('2211');
    await expect(p.locator('.ms__option[data-value="2211"]')).toBeVisible();
    await expect(p.locator('.ms__option[data-value="2"]')).toBeVisible(); // ancestor kept
});

test('row height is consistent across the virtualization threshold', async ({ page }) => {
    const p = isco(page);
    await openDropdown(p);

    const rowHeight = () =>
        p.locator('.ms__option').first().evaluate((el) => el.getBoundingClientRect().height);

    // Narrow search → few rows → NON-virtual render (previously ~34px content height).
    await p.locator('.ms__input').fill('welder');
    await expect(p.locator('.ms__option[data-value="7212"]')).toBeVisible();
    const narrow = await rowHeight();

    // Broad search → many rows → virtual render (fixed 32px).
    await p.locator('.ms__input').fill('a');
    await expect.poll(async () => p.locator('.ms__option').count()).toBeGreaterThan(12);
    const broad = await rowHeight();

    // Both honour virtual-scroll-item-height=32, and don't jump as the count crosses the threshold.
    expect(narrow).toBeLessThanOrEqual(33);
    expect(broad).toBeLessThanOrEqual(33);
    expect(Math.abs(narrow - broad)).toBeLessThan(1);
});

test('a major group is a non-selectable branch; a unit group is a selectable leaf', async ({ page }) => {
    const p = isco(page);
    await openDropdown(p);
    // Search narrows the virtualized list so the rows we assert on are rendered.
    await p.locator('.ms__input').fill('generalist medical');
    await expect(p.locator('.ms__option[data-value="2211"]')).toBeVisible();

    // 2211 = "Generalist Medical Practitioners" (unit group / leaf) → selectable.
    await expect(p.locator('.ms__option[data-value="2211"]')).not.toHaveClass(
        /ms__option--tree-unselectable/
    );
    // Its ancestor "2" (Professionals, major group) is a non-selectable branch.
    await expect(p.locator('.ms__option[data-value="2"]')).toHaveClass(
        /ms__option--tree-unselectable/
    );
});

test('badge shows only the leaf title with a ".. /" hint; full breadcrumb is in the tooltip', async ({ page }) => {
    const p = isco(page);
    await openDropdown(p);
    await p.locator('.ms__input').fill('generalist medical');
    await p.locator('.ms__option[data-value="2211"]').click({ force: true });
    await page.keyboard.press('Escape'); // close dropdown so it doesn't cover the badge

    const FULL = 'Professionals / Health Professionals / Medical Doctors / Generalist Medical Practitioners';

    // Custom getBadgeDisplayCallback → last segment only, prefixed ".. /".
    const badgeText = p.locator('.ms__badge .ms__badge-text');
    await expect(badgeText).toHaveText('.. / Generalist Medical Practitioners');

    // getBadgeTooltipCallback → the badge-text tooltip carries the full breadcrumb.
    // (v2: core tooltips mount on show, so hover first, then assert. Each badge also
    // has a separate "Remove …" tooltip, so filter to this one.)
    await badgeText.dispatchEvent('mouseenter');
    const tip = p.locator('.ms__badge-tooltip').filter({ hasText: 'Health Professionals' });
    await expect(tip).toHaveText(FULL);
    await expect(tip).toHaveClass(/ms__badge-tooltip--visible/);
});
