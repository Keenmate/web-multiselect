import { test, expect, Page, Locator } from './fixtures';

/**
 * E2E for cascade checkbox mode (checkbox-mode="cascade") + the cascade value
 * policy. Tree:
 *   Fruit (1)
 *   ├─ Apple (1.1) ─ Gala (1.1.1), Fuji (1.1.2)
 *   └─ Pear (1.2)
 *   Vegetables (2) ─ Carrot (2.1), Kale (2.2)
 * Verified in a real browser because the tristate + subtree cascade ride real
 * DOM rendering and the emitted value depends on the policy projection.
 */

const PAGE = '/test/tree.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}
async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}
const val = (p: Locator) => p.evaluate((el: any) => el.getValue());
const optAt = (p: Locator, path: string) => p.locator(`.ms__option[data-path="${path}"]`);

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('tree-cascade (rolled-up default)', () => {
    test('checking a branch cascades to its whole subtree', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple
        // Both leaves are now checked...
        await expect(optAt(p, '1.1.1').locator('.ms__checkbox')).toBeChecked();
        await expect(optAt(p, '1.1.2').locator('.ms__checkbox')).toBeChecked();
        // ...Apple reads checked...
        await expect(optAt(p, '1.1')).toHaveClass(/ms__option--selected/);
        // ...and the grandparent Fruit is indeterminate (Pear still unchecked).
        await expect(optAt(p, '1')).toHaveClass(/ms__option--indeterminate/);
        await expect(optAt(p, '1').locator('.ms__checkbox')).toHaveClass(/ms__checkbox--indeterminate/);
    });

    test('rolled-up emits the complete branch as a single value', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple fully selected
        // Rolled-up: one value ("apple"), not the two leaves.
        expect(await val(p)).toEqual(['apple']);
    });

    test('a single leaf leaves ancestors indeterminate and emits just the leaf', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1.1.1').click(); // Gala only
        await expect(optAt(p, '1.1')).toHaveClass(/ms__option--indeterminate/);
        await expect(optAt(p, '1')).toHaveClass(/ms__option--indeterminate/);
        expect(await val(p)).toEqual(['gala']);
    });

    test('re-clicking a checked branch clears its subtree', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1.1').click();
        expect(await val(p)).toEqual(['apple']);
        await optAt(p, '1.1').click();
        expect(await val(p)).toEqual([]);
        await expect(optAt(p, '1.1.1').locator('.ms__checkbox')).not.toBeChecked();
    });

    test('selecting every leaf rolls the whole tree up to its roots', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await optAt(p, '1').click(); // Fruit subtree
        await optAt(p, '2').click(); // Vegetables subtree
        expect((await val(p)).sort()).toEqual(['fruit', 'veg']);
    });

    test('Select All action is cascade-aware — emits the rolled-up roots, not every node', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        await openDropdown(p);

        await p.locator('.ms__action-btn', { hasText: 'Select All' }).click();
        // Rolled-up: the whole tree collapses to its two roots (not 8 node values).
        expect((await val(p)).sort()).toEqual(['fruit', 'veg']);

        await p.locator('.ms__action-btn', { hasText: 'Clear All' }).click();
        expect(await val(p)).toEqual([]);
    });

    test('a custom action using setSelected({ notify: true }) fires exactly one change', async ({ page }) => {
        const p = picker(page, 'tree-cascade');
        // Count bubbling `change` events on the element.
        await p.evaluate((el: any) => {
            (window as any).__changes = 0;
            el.addEventListener('change', () => { (window as any).__changes++; });
        });
        await openDropdown(p);

        await p.locator('.ms__action-btn', { hasText: 'All fruit' }).click();
        expect(await val(p)).toEqual(['fruit']);           // selection actually changed
        expect(await page.evaluate(() => (window as any).__changes)).toBe(1); // ...and announced once
    });
});

test.describe('cascade-select-policy="leaves"', () => {
    test('checking a branch emits its leaves, not the branch', async ({ page }) => {
        const p = picker(page, 'tree-cascade-leaves');
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple
        const v = await val(p);
        expect(v.sort()).toEqual(['fuji', 'gala']);
        expect(v).not.toContain('apple');
    });
});

test.describe('cascade-select-policy="all"', () => {
    test('checking a branch emits the branch plus every descendant', async ({ page }) => {
        const p = picker(page, 'tree-cascade-all');
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple
        // all: the branch and both its leaves.
        expect((await val(p)).sort()).toEqual(['apple', 'fuji', 'gala']);
    });

    // Regression: removing a badge is a projection removal, not a raw value delete.
    // With policy "all", deleting the branch badge must clear its whole subtree —
    // otherwise its leaves stay checked and cascade re-derives the branch as checked
    // (the removal appeared to do nothing).
    test('removing a branch badge clears its whole subtree', async ({ page }) => {
        const p = picker(page, 'tree-cascade-all');
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple + Gala + Fuji all checked and emitted
        expect((await val(p)).sort()).toEqual(['apple', 'fuji', 'gala']);

        // Delete the "Apple" branch badge. Close the dropdown first: open, it covers the
        // badge row, so the remove button isn't reachable by a real pointer.
        await page.keyboard.press('Escape');
        await p.locator('.ms__badge-remove[data-value="apple"]').click();

        // The whole Apple subtree is now unchecked — nothing re-derives it.
        expect(await val(p)).toEqual([]);
        await expect(optAt(p, '1.1')).not.toHaveClass(/ms__option--selected/);
        await expect(optAt(p, '1.1.1').locator('.ms__checkbox')).not.toBeChecked();
        await expect(optAt(p, '1.1.2').locator('.ms__checkbox')).not.toBeChecked();
    });

    test('removing one leaf badge leaves the siblings and marks the branch indeterminate', async ({ page }) => {
        const p = picker(page, 'tree-cascade-all');
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple subtree fully checked
        await page.keyboard.press('Escape'); // the open dropdown covers the badge row
        await p.locator('.ms__badge-remove[data-value="gala"]').click();

        // Only Gala goes; Fuji stays, and Apple drops to indeterminate.
        const v = await val(p);
        expect(v).toContain('fuji');
        expect(v).not.toContain('gala');
        expect(v).not.toContain('apple');
        await expect(optAt(p, '1.1')).toHaveClass(/ms__option--indeterminate/);
    });
});

test.describe('live checkbox-mode / policy switch', () => {
    // Regression: changing checkboxMode / cascadeSelectPolicy after init goes through
    // updateOptions (not buildTree), which must rebuild the cascade index and re-project
    // the current selection — silently, and without stale state.
    test('switching independent → cascade rebuilds the index and cascades', async ({ page }) => {
        const p = picker(page, 'tree-cascade-live');
        await openDropdown(p);

        // Independent by default: checking a branch selects only that node.
        await optAt(p, '1.1').click(); // Apple
        expect(await val(p)).toEqual(['apple']);
        await expect(optAt(p, '1.1.1').locator('.ms__checkbox')).not.toBeChecked();

        // Flip to cascade live; the existing pick re-projects (rolled-up: still just Apple),
        // and now its subtree reads checked.
        await p.evaluate((el: any) => { el.checkboxMode = 'cascade'; });
        expect(await val(p)).toEqual(['apple']);
        await expect(optAt(p, '1.1.1').locator('.ms__checkbox')).toBeChecked();
        await expect(optAt(p, '1.1.2').locator('.ms__checkbox')).toBeChecked();
    });

    test('changing policy live re-projects the same selection', async ({ page }) => {
        const p = picker(page, 'tree-cascade-live');
        await p.evaluate((el: any) => { el.checkboxMode = 'cascade'; });
        await openDropdown(p);

        await optAt(p, '1.1').click(); // Apple subtree
        expect(await val(p)).toEqual(['apple']); // rolled-up

        await p.evaluate((el: any) => { el.cascadeSelectPolicy = 'all'; });
        expect((await val(p)).sort()).toEqual(['apple', 'fuji', 'gala']);

        await p.evaluate((el: any) => { el.cascadeSelectPolicy = 'leaves'; });
        expect((await val(p)).sort()).toEqual(['fuji', 'gala']);
    });
});

test.describe('renderOptionContentCallback tree context', () => {
    // The callback fires per row; in tree mode ctx must carry tree metadata
    // (isTreeNode/isBranch/isLeaf/level/depth/path/isSelectable/isIndeterminate).
    const probe = (p: Locator, path: string) =>
        p.locator(`.ms__option[data-path="${path}"] .ctx-probe`);

    test('a branch row gets branch/level/path context', async ({ page }) => {
        const p = picker(page, 'tree-render-ctx');
        await openDropdown(p);

        const apple = probe(p, '1.1'); // Apple — a branch (has Gala, Fuji)
        await expect(apple).toHaveAttribute('data-is-tree-node', 'true');
        await expect(apple).toHaveAttribute('data-is-branch', 'true');
        await expect(apple).toHaveAttribute('data-is-leaf', 'false');
        await expect(apple).toHaveAttribute('data-level', '2');
        await expect(apple).toHaveAttribute('data-depth', '1');
        await expect(apple).toHaveAttribute('data-path', '1.1');
        await expect(apple).toHaveAttribute('data-is-selectable', 'true');
        await expect(apple).toHaveAttribute('data-child-count', '2'); // Gala + Fuji
    });

    test('a leaf row reports isLeaf, its own level, and zero children', async ({ page }) => {
        const p = picker(page, 'tree-render-ctx');
        await openDropdown(p);

        const gala = probe(p, '1.1.1'); // Gala — a leaf
        await expect(gala).toHaveAttribute('data-is-branch', 'false');
        await expect(gala).toHaveAttribute('data-is-leaf', 'true');
        await expect(gala).toHaveAttribute('data-level', '3');
        await expect(gala).toHaveAttribute('data-depth', '2');
        await expect(gala).toHaveAttribute('data-child-count', '0');
    });

    test('cascade tristate reaches the callback as isIndeterminate', async ({ page }) => {
        const p = picker(page, 'tree-render-ctx');
        await openDropdown(p);

        // Check one leaf under Apple → Apple becomes partially checked (tristate).
        await optAt(p, '1.1.1').click(); // Gala only
        await expect(probe(p, '1.1')).toHaveAttribute('data-is-indeterminate', 'true');
        // A fully-checked branch is not indeterminate.
        await optAt(p, '1.1.2').click(); // Fuji too → Apple fully checked
        await expect(probe(p, '1.1')).toHaveAttribute('data-is-indeterminate', 'false');
    });

    test('the context reports the panel presentation (floating vs fullscreen)', async ({ page }) => {
        const p = picker(page, 'tree-render-ctx');

        // Default: anchored floating dropdown on desktop.
        await openDropdown(p);
        await expect(probe(p, '1.1')).toHaveAttribute('data-presentation', 'floating');
        await expect(probe(p, '1.1')).toHaveAttribute('data-is-fullscreen', 'false');

        // Force the fullscreen overlay while open — it live-swaps and re-renders the rows,
        // so the callback is re-invoked with the new presentation (no reopen needed).
        await p.evaluate((el) => el.setAttribute('mobile-presentation', 'fullscreen'));
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
        await expect(probe(p, '1.1')).toHaveAttribute('data-presentation', 'fullscreen');
        await expect(probe(p, '1.1')).toHaveAttribute('data-is-fullscreen', 'true');
    });
});

test.describe('counter chip counts the rolled-up cover, not the emit policy', () => {
    // The [N] counter (show-counter) summarizes the *meaningful* picks — the
    // rolled-up minimal cover — regardless of cascade-select-policy. So one branch
    // click reads as one selection whether the policy emits 1, its leaves, or all.
    for (const policy of ['rolled-up', 'leaves', 'all'] as const) {
        test(`policy=${policy}: two branch picks → counter [2]`, async ({ page }) => {
            const p = picker(page, 'tree-cascade-all');
            await p.evaluate((el: any, pol) => {
                el.setAttribute('show-counter', 'true');
                el.cascadeSelectPolicy = pol;
            }, policy);
            await openDropdown(p);

            await optAt(p, '1').click(); // Fruit subtree
            await optAt(p, '2').click(); // Vegetables subtree

            // Emitted count varies with policy (2 / 5 / 8) but the counter stays [2].
            await expect(p.locator('.ms__counter')).toHaveText('[2]');
            await expect(p.locator('.ms__counter')).toHaveAttribute('title', /Fruit[\s\S]*Vegetables/);
        });
    }
});

test.describe('cascade in a leaves-only tree', () => {
    test('non-selectable branches roll up to the leaves', async ({ page }) => {
        const p = picker(page, 'tree-cascade-leavesonly');
        await openDropdown(p);

        // Branches have no checkbox (non-selectable); check the two Apple leaves.
        await optAt(p, '1.1.1').click();
        await optAt(p, '1.1.2').click();
        // Apple (1.1) is non-selectable, so rolled-up cannot collapse to it —
        // the leaves surface individually.
        expect((await val(p)).sort()).toEqual(['fuji', 'gala']);
        await expect(optAt(p, '1.1').locator('.ms__checkbox')).toHaveCount(0);
    });
});
