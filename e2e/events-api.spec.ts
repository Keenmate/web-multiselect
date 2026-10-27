import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/events-api.html';

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

test.describe('events', () => {
    test('select event fires with full detail', async ({ page }) => {
        const p = picker(page, 'events');
        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();

        const ev = await page.evaluate(() => (window as any).__events.select[0]);
        expect(ev).toMatchObject({
            selectedValues: ['apple']
        });
        expect(ev.option).toBeTruthy();
    });

    test('deselect event fires when removing a selection', async ({ page }) => {
        const p = picker(page, 'events');
        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();
        await p.locator('.ms__option[data-value="apple"]').click();

        const events = await page.evaluate(() => (window as any).__events.deselect);
        expect(events).toHaveLength(1);
        expect(events[0].selectedValues).toEqual([]);
    });

    test('change event fires once per discrete action', async ({ page }) => {
        const p = picker(page, 'events');
        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();
        await p.locator('.ms__option[data-value="banana"]').click();

        const changes = await page.evaluate(() => (window as any).__events.change);
        expect(changes).toHaveLength(2);
        expect(changes[1].selectedValues).toEqual(['apple', 'banana']);
    });
});

test.describe('event handler props (on*)', () => {
    test('onSelect receives the detail on each selection', async ({ page }) => {
        const p = picker(page, 'callbacks');
        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();

        const calls = await page.evaluate(() => (window as any).__cb.select);
        expect(calls).toEqual(['apple']);
    });

    test('onChange receives the detail with the full selection', async ({ page }) => {
        const p = picker(page, 'callbacks');
        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();
        await p.locator('.ms__option[data-value="cherry"]').click();

        const calls = await page.evaluate(() => (window as any).__cb.change);
        expect(calls).toEqual([1, 2]);
    });
});

test.describe('options property setter', () => {
    test('reassigning options replaces the list', async ({ page }) => {
        const p = picker(page, 'replace-opts');
        await openDropdown(p);
        await expect(p.locator('.ms__option').first()).toContainText(/Apple/);

        await page.evaluate(() => (window as any).__replaceWithColors());
        // Reopen if needed
        if (!(await p.locator('.ms__dropdown').isVisible())) {
            await openDropdown(p);
        }
        await expect(p.locator('.ms__option').first()).toContainText(/Red/);
    });
});

test.describe('attribute changes preserve selection', () => {
    test('changing placeholder via attribute does not lose selection', async ({ page }) => {
        const p = picker(page, 'attr-change');
        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();
        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['apple']);

        // Change a benign attribute — selection should survive.
        await p.evaluate(el => el.setAttribute('max-height', '15rem'));
        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['apple']);
    });
});
