import { test, expect, Page, Locator } from './fixtures';

/**
 * Section 1 — selection & multiplicity.
 *
 * Fixture: test/selection.html. Five pickers, each pre-loaded with four
 * fruits (apple/banana/cherry/date) so cells are deterministic.
 */

const PAGE = '/test/selection.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

function optionByValue(p: Locator, value: string): Locator {
    return p.locator(`.ms__option[data-value="${value}"]`);
}

async function getValue(p: Locator): Promise<string | string[] | null> {
    return p.evaluate((el: any) => el.selectedValue);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('multi-select (default)', () => {
    test('clicking two options keeps both selected', async ({ page }) => {
        const p = picker(page, 'multi');
        await openDropdown(p);

        await optionByValue(p, 'apple').click();
        await optionByValue(p, 'cherry').click();

        expect(await getValue(p)).toEqual(['apple', 'cherry']);
    });

    test('clicking a selected option deselects it', async ({ page }) => {
        const p = picker(page, 'multi');
        await openDropdown(p);

        await optionByValue(p, 'apple').click();
        await optionByValue(p, 'apple').click();

        expect(await getValue(p)).toEqual([]);
    });

    test('selected option has --selected modifier class', async ({ page }) => {
        const p = picker(page, 'multi');
        await openDropdown(p);
        await optionByValue(p, 'apple').click();

        await expect(optionByValue(p, 'apple')).toHaveClass(/ms__option--selected/);
        await expect(optionByValue(p, 'banana')).not.toHaveClass(/ms__option--selected/);
    });
});

test.describe('single-select (multiple="false")', () => {
    test('clicking a second option replaces the first', async ({ page }) => {
        const p = picker(page, 'single');
        await openDropdown(p);

        await optionByValue(p, 'apple').click();
        // Single mode auto-closes after select, so reopen.
        await openDropdown(p);
        await optionByValue(p, 'cherry').click();

        expect(await getValue(p)).toBe('cherry');
    });
});

test.describe('close-on-select', () => {
    test('multi-select with close-on-select closes after each click', async ({ page }) => {
        const p = picker(page, 'close-on-select');
        await openDropdown(p);
        await optionByValue(p, 'apple').click();

        await expect(p.locator('.ms__dropdown')).not.toBeVisible();
    });
});

test.describe('show-checkboxes="false"', () => {
    test('renders no checkbox elements in the dropdown', async ({ page }) => {
        const p = picker(page, 'no-checkboxes');
        await openDropdown(p);

        await expect(p.locator('.ms__checkbox')).toHaveCount(0);
    });
});

test.describe('initial-values attribute', () => {
    test('populates selectedValues from initial-values attribute', async ({ page }) => {
        const p = picker(page, 'initial-attr');
        expect(await getValue(p)).toEqual(['banana']);
    });

    test('data-options + initial-values works with no JS (HTML-only setup)', async ({ page }) => {
        const p = picker(page, 'html-only');
        expect(await getValue(p)).toEqual(['cherry']);

        // Options arrived via attribute — opening the dropdown shows them.
        await openDropdown(p);
        await expect(p.locator('.ms__option')).toHaveCount(3);
    });
});
