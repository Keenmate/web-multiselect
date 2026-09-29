import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/action-buttons.html';

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

test.describe('built-in actions', () => {
    test('select-all selects every option', async ({ page }) => {
        const p = picker(page, 'builtins');
        await openDropdown(p);

        await p.locator('.ms__action-btn[data-action="select-all"]').click();

        const values = await p.evaluate((el: any) => el.getValue());
        expect(values).toEqual(['item-0', 'item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6', 'item-7']);
    });

    test('clear-all empties selection', async ({ page }) => {
        const p = picker(page, 'builtins');
        await openDropdown(p);

        await p.locator('.ms__action-btn[data-action="select-all"]').click();
        await p.locator('.ms__action-btn[data-action="clear-all"]').click();

        expect(await p.evaluate((el: any) => el.getValue())).toEqual([]);
    });
});

test.describe('custom action', () => {
    test('onClick fires when clicked', async ({ page }) => {
        const p = picker(page, 'custom');
        await openDropdown(p);

        await p.locator('.ms__action-btn.js-custom').click();
        const clicks = await page.evaluate(() => (window as any).__customClicks);
        expect(clicks).toBe(1);
    });
});

test.describe('dynamic visibility / disabled', () => {
    test('getIsVisibleCallback hides the button', async ({ page }) => {
        const p = picker(page, 'dynamic');
        await openDropdown(p);

        // __dynamicVisible defaults to false → hidden
        await expect(p.locator('.ms__action-btn.js-maybe-visible')).toHaveCount(0);
    });

    test('getIsDisabledCallback sets disabled attribute', async ({ page }) => {
        const p = picker(page, 'dynamic');
        await openDropdown(p);

        await expect(p.locator('.ms__action-btn.js-maybe-disabled')).toBeDisabled();
    });
});

test.describe('layout modifiers', () => {
    test('sticky-actions adds the modifier class', async ({ page }) => {
        const p = picker(page, 'sticky');
        await openDropdown(p);

        await expect(p.locator('.ms__actions')).toHaveClass(/ms__actions--sticky/);
    });

    test('actions-layout="wrap" adds the wrap modifier class', async ({ page }) => {
        const p = picker(page, 'wrap');
        await openDropdown(p);

        await expect(p.locator('.ms__actions')).toHaveClass(/ms__actions--wrap/);
    });
});

test.describe('action context (additive 2nd arg)', () => {
    test('callbacks receive a typed context with live state + a working controller', async ({ page }) => {
        const p = picker(page, 'ctx');
        await openDropdown(p);

        // getTextCallback reads ctx.selectedCount / ctx.optionCount for the label.
        await expect(p.locator('.ms__action-btn[data-action="select-all"]')).toHaveText('Selected 0/8');

        // onClick receives the same context; it snapshots the shape and drives the
        // picker via ctx.controller.setSelected(..., { notify: true }).
        await p.locator('.ms__action-btn.js-ctx').click();

        const seen = await page.evaluate(() => (window as any).__ctxSeen);
        expect(seen).toMatchObject({
            selectedCount: 0,
            optionCount: 8,
            isOpen: true,
            searchTerm: '',
            buttonAction: 'custom',
            hasController: true,
            elementIsHost: true,
        });
        expect(typeof seen.presentation).toBe('string');

        // The controller mutation applied (notify:true → aggregate change).
        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['item-0', 'item-1']);

        // ...and the dynamic label re-computed from the new selection count.
        await expect(p.locator('.ms__action-btn[data-action="select-all"]')).toHaveText('Selected 2/8');
    });
});

test.describe('per-item callbacks fire on bulk operations', () => {
    test('select-all fires onSelect once per newly-selected item', async ({ page }) => {
        const p = picker(page, 'tracker');
        await openDropdown(p);

        await p.locator('.ms__action-btn[data-action="select-all"]').click();

        const selected = await page.evaluate(() => (window as any).__trackerSelected);
        // Assert the payload, not just the fire count — a length-only check passes
        // on 8 `undefined`s, which is exactly how a stale handler signature hides.
        expect([...selected].sort()).toEqual(
            Array.from({ length: 8 }, (_, i) => `item-${i}`).sort()
        );
    });

    test('clear-all fires onDeselect once per removed item', async ({ page }) => {
        const p = picker(page, 'tracker');
        await openDropdown(p);

        await p.locator('.ms__action-btn[data-action="select-all"]').click();
        // Reset counter so we only measure clear-all's contribution.
        await page.evaluate(() => { (window as any).__trackerDeselected = []; });
        await p.locator('.ms__action-btn[data-action="clear-all"]').click();

        const deselected = await page.evaluate(() => (window as any).__trackerDeselected);
        expect([...deselected].sort()).toEqual(
            Array.from({ length: 8 }, (_, i) => `item-${i}`).sort()
        );
    });
});
