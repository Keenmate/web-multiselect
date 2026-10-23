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
    test('string shorthand renders the built-ins with their default (labels) text', async ({ page }) => {
        const p = picker(page, 'builtins');
        await openDropdown(p);
        await expect(p.locator('.ms__action-btn[data-action="select-all"]')).toHaveText('Select all');
        await expect(p.locator('.ms__action-btn[data-action="clear-all"]')).toHaveText('Clear all');
    });

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

test.describe('action context', () => {
    test('callbacks receive a typed ctx with live state + a working controller', async ({ page }) => {
        const p = picker(page, 'ctx');
        await openDropdown(p);

        // getTextCallback reads ctx.selectedCount / ctx.optionCount for the label.
        await expect(p.locator('.ms__action-btn[data-action="select-all"]')).toHaveText('Selected 0/8');

        // onClick receives the action detail (ctx + action fields); it snapshots the shape and
        // drives the picker via d.controller.setSelected(..., { notify: true }).
        await p.locator('.ms__action-btn.js-ctx').click();

        const seen = await page.evaluate(() => (window as any).__ctxSeen);
        expect(seen).toMatchObject({
            selectedCount: 0,
            optionCount: 8,
            isOpen: true,
            searchTerm: '',
            action: 'custom',
            id: 'ctx',
            source: 'action-buttons',
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

test.describe('base-css-variables 2.0 control tokens', () => {
    test('action buttons take the control outline; the focused input shows the focus halo', async ({ page }) => {
        const p = picker(page, 'builtins');
        await p.evaluate((el) => {
            const s = (el as HTMLElement).style;
            s.setProperty('--base-border-color', 'rgb(9, 9, 9)');
            s.setProperty('--base-input-border-color', 'rgb(1, 2, 3)');
            s.setProperty('--base-input-box-shadow-focus', 'rgb(4, 5, 6) 0px 0px 0px 3px');
        });
        await openDropdown(p);
        const btn = p.locator('.ms__action-btn[data-action="select-all"]');
        await expect.poll(() => btn.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe('rgb(1, 2, 3)');
        const wrapper = p.locator('.ms__input-wrapper');
        await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('rgb(4, 5, 6) 0px 0px 0px 3px');
    });
});

test.describe('interaction model (core action items)', () => {
    test('items render data-action / data-id, icon, isDanger, isActive; hidden items are skipped', async ({ page }) => {
        const p = picker(page, 'interaction');
        await openDropdown(p);
        const exportBtn = p.locator('.ms__action-btn[data-action="custom"][data-id="export"]');
        await expect(exportBtn.locator('.ms__action-btn-icon')).toHaveText('⇩');
        await expect(exportBtn.locator('.ms__action-btn-label')).toHaveText('Export');
        await expect(p.locator('.ms__action-btn[data-id="danger"]')).toHaveClass(/ms__action-btn--danger/);
        const active = p.locator('.ms__action-btn[data-id="active"]');
        await expect(active).toHaveClass(/ms__action-btn--active/);
        await expect(active).toHaveAttribute('aria-pressed', 'true');
        await expect(p.locator('.ms__action-btn[data-id="hidden"]')).toHaveCount(0);
    });

    test('order: beforeActionCallback → onClick → onAction → action event; detail carries the context', async ({ page }) => {
        const p = picker(page, 'interaction');
        await openDropdown(p);
        await p.locator('.ms__action-btn[data-id="export"]').click();
        await expect.poll(() => page.evaluate(() => (window as any).__im.log)).toEqual(['before:custom', 'onClick', 'onAction:custom', 'event:custom']);
        const [seen] = await page.evaluate(() => (window as any).__im.details);
        expect(seen.json).toMatchObject({ action: 'custom', id: 'export', source: 'action-buttons', dataset: {}, selectedCount: 0, optionCount: 8 });
        // controller / element are non-enumerable: present on the detail, absent from JSON.
        expect(seen.hasController).toBe(true);
        expect(seen.elementIsHost).toBe(true);
        expect(seen.json).not.toHaveProperty('controller');
        expect(seen.json).not.toHaveProperty('element');
        expect(seen.composed).toBe(false);
    });

    test('a built-in fires the action event BEFORE its behaviour runs', async ({ page }) => {
        const p = picker(page, 'interaction');
        await openDropdown(p);
        await p.locator('.ms__action-btn[data-action="select-all"]').click();
        await expect.poll(() => p.evaluate((el: any) => el.getValue().length)).toBe(8);
        const [seen] = await page.evaluate(() => (window as any).__im.details);
        expect(seen.json.action).toBe('select-all');
        expect(seen.selectedAtEvent).toBe(0);
    });

    test('beforeActionCallback returning false cancels the event and the built-in', async ({ page }) => {
        const p = picker(page, 'interaction');
        await page.evaluate(() => { (window as any).__im.vetoBuiltIns = true; });
        await openDropdown(p);
        await p.locator('.ms__action-btn[data-action="select-all"]').click();
        await page.waitForTimeout(50);
        expect(await page.evaluate(() => (window as any).__im.log)).toEqual(['before:select-all']);
        expect(await p.evaluate((el: any) => el.getValue())).toEqual([]);
    });

    test('a data-action trigger in option content fires action (source option, the option, dataset) and does not toggle the row', async ({ page }) => {
        const p = picker(page, 'interaction');
        await openDropdown(p);
        await p.locator('.ms__option[data-value="item-2"] .js-row-btn').click();
        await expect.poll(() => page.evaluate(() => (window as any).__im.details.length)).toBe(1);
        const [seen] = await page.evaluate(() => (window as any).__im.details);
        expect(seen.json).toMatchObject({ action: 'custom', id: 'edit', source: 'option', dataset: { kind: 'row' }, option: { value: 'item-2' } });
        expect(await p.evaluate((el: any) => el.getValue())).toEqual([]);
    });

    test('el.controller drives the picker and is the controller on every detail', async ({ page }) => {
        const p = picker(page, 'interaction');
        const result = await p.evaluate((el: any) => {
            el.controller.selectAll();
            const afterAll = el.getValue().length;
            el.controller.clearAll();
            return { afterAll, afterClear: el.getValue().length, same: el.controller === el.controller };
        });
        expect(result).toEqual({ afterAll: 8, afterClear: 0, same: true });
    });
});
