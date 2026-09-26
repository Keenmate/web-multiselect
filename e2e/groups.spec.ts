import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/groups.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('group-member produces grouped headers + options', async ({ page }) => {
    const p = picker(page, 'grouped');
    await openDropdown(p);

    await expect(p.locator('.ms__group-label')).toHaveCount(2);
    await expect(p.locator('.ms__group-label').first()).toContainText(/Fruits/);
});

test('allow-groups="false" renders a flat list', async ({ page }) => {
    const p = picker(page, 'flat');
    await openDropdown(p);

    await expect(p.locator('.ms__group-label')).toHaveCount(0);
    await expect(p.locator('.ms__option')).toHaveCount(6);
});

test('renderGroupLabelContentCallback overrides label content', async ({ page }) => {
    const p = picker(page, 'custom-label');
    await openDropdown(p);

    // Wait for re-render after callback assignment
    await expect(p.locator('.js-custom-label')).toHaveCount(2);
    await expect(p.locator('.js-custom-label').first()).toContainText('[FRUITS]');
});

test('per-group selected-count chip shows in a plain (non-cascade) grouped list', async ({ page }) => {
    const p = picker(page, 'grouped'); // no group-select-mode → inert headers, no checkbox
    await openDropdown(p);

    const fruits = p.locator('.ms__group-label[data-group="Fruits"]');
    const fruitsCount = fruits.locator('.ms__group-count');

    // No checkbox (not cascade) and no chip yet (nothing selected).
    await expect(fruits.locator('.ms__checkbox')).toHaveCount(0);
    await expect(fruitsCount).toHaveCount(0);

    await p.locator('.ms__option[data-value="a1"]').click();
    await expect(fruitsCount).toHaveText('[1]');

    await p.locator('.ms__option[data-value="a2"]').click();
    await expect(fruitsCount).toHaveText('[2]');

    // Still no checkbox — the count is decoupled from cascade.
    await expect(fruits.locator('.ms__checkbox')).toHaveCount(0);

    // Deselecting back to zero removes the chip.
    await p.locator('.ms__option[data-value="a1"]').click();
    await p.locator('.ms__option[data-value="a2"]').click();
    await expect(fruitsCount).toHaveCount(0);
});

test('getCountLabelCallback formats both the in-input counter and the group count (x/y)', async ({ page }) => {
    const p = picker(page, 'group-count-callback'); // getCountLabelCallback = (s,t) => `${s}/${t}`
    await openDropdown(p);

    await p.locator('.ms__option[data-value="a1"]').click(); // Apple  (Fruits)
    await p.locator('.ms__option[data-value="a2"]').click(); // Banana (Fruits)

    // Group count: 2 of 3 Fruits — the group's total is its member count.
    await expect(p.locator('.ms__group-label[data-group="Fruits"] .ms__group-count')).toHaveText('2/3');
    // In-input counter: 2 of 6 total options — same formatter, whole-list total.
    await expect(p.locator('.ms__counter')).toHaveText('2/6');
});
