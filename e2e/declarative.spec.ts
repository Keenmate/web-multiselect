import { test, expect, Page, Locator } from './fixtures';

/**
 * Declarative <option>/<optgroup> children (no script). The element parses them once and
 * defaults value-member / display-value-member / group / icon / subtitle / disabled to the
 * parsed fields — unless the consumer configured them. Unset inputs reach the config as
 * `null` (core's null-clear contract), so the defaults must apply to null too, or every
 * option renders "[N/A]" (regressed in 2.5.0).
 *
 * Fixture: test/declarative.html.
 */

const PAGE = '/test/declarative.html';

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

test('options take their value and label from the <option> children', async ({ page }) => {
    const p = picker(page, 'single');
    await openDropdown(p);
    await expect(p.locator('.ms__option-title')).toHaveText(['Yes', 'No', 'Maybe']);
    const values = await p.locator('.ms__option').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value));
    expect(values).toEqual(['yes', 'no', 'maybe']);
    await expect(p.locator('.ms__option-title', { hasText: '[N/A]' })).toHaveCount(0);
});

test('`selected` pre-picks; optgroup, data-icon, data-subtitle and disabled are read', async ({ page }) => {
    const single = picker(page, 'single');
    expect(await single.evaluate((el: any) => el.getValue())).toBe('maybe');

    const p = picker(page, 'grouped');
    expect(await p.evaluate((el: any) => el.getValue())).toEqual(['apple']);
    await expect(p.locator('.ms__badge-text')).toHaveText(['Apple']);
    await openDropdown(p);
    await expect(p.locator('.ms__option-title')).toHaveText(['Apple', 'Banana', 'Carrot']);
    await expect(p.locator('.ms__option[data-value="apple"]')).toContainText('Red');
    await expect(p.locator('.ms__option[data-value="apple"]')).toContainText('🍎');
    await expect(p.locator('.ms__option[data-value="banana"]')).toHaveClass(/ms__option--disabled/);
    await expect(p.locator('.ms__group-label, [class*="group-label"]').first()).toContainText('Fruit');
});
