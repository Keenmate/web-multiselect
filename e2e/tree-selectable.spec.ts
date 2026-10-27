import { test, expect, Page, Locator } from './fixtures';

/**
 * E2E for per-node selectability in tree mode (is-selectable-member /
 * getIsSelectableCallback). A non-selectable node renders normally (NOT greyed
 * like disabled), but has no checkbox, is skipped by keyboard focus, and cannot
 * be toggled or picked by Select All. Verified in a real browser because the
 * checkbox/focus behaviour rides real DOM + rendering.
 */

const PAGE = '/test/tree.html';

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

for (const id of ['tree-sel-member', 'tree-sel-cb']) {
    test.describe(`${id}`, () => {
        test('branches are non-selectable but NOT greyed like disabled', async ({ page }) => {
            const p = picker(page, id);
            await openDropdown(p);

            const fruit = p.locator('.ms__option[data-path="1"]');
            await expect(fruit).toHaveClass(/ms__option--tree-unselectable/);
            await expect(fruit).not.toHaveClass(/ms__option--disabled/);
            await expect(fruit).toHaveAttribute('data-selectable', 'false');

            // A leaf stays selectable.
            await expect(p.locator('.ms__option[data-path="1.1.1"]')).not.toHaveClass(
                /ms__option--tree-unselectable/
            );
        });

        test('non-selectable branches have no checkbox; leaves do', async ({ page }) => {
            const p = picker(page, id);
            await openDropdown(p);

            await expect(p.locator('.ms__option[data-path="1"] .ms__checkbox')).toHaveCount(0);
            await expect(p.locator('.ms__option[data-path="1.1.1"] .ms__checkbox')).toHaveCount(1);
        });

        test('clicking a branch does not select it; clicking a leaf does', async ({ page }) => {
            const p = picker(page, id);
            await openDropdown(p);

            await p.locator('.ms__option[data-path="1"]').click({ force: true });
            expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([]);

            await p.locator('.ms__option[data-path="1.1.1"]').click({ force: true });
            expect(await p.evaluate((el: any) => el.selectedValue)).toContain('gala');
        });

        test('keyboard focus skips non-selectable branches', async ({ page }) => {
            const p = picker(page, id);
            await openDropdown(p);

            // First ArrowDown must land on the first *selectable* row. Path "1"
            // (Fruit) is a branch, so focus should skip to a leaf.
            await page.keyboard.press('ArrowDown');
            const focused = p.locator('.ms__option--focused');
            await expect(focused).not.toHaveClass(/ms__option--tree-unselectable/);
        });
    });
}
