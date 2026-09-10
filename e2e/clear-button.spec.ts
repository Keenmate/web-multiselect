import { test, expect, Page, Locator } from './fixtures';

/**
 * Inline clear (✕) button — opt-in via `show-clear`.
 *
 * It wipes the whole selection, shows only while something is selected, fires a
 * single `change`, and refocuses the input. Not rendered at all without the
 * attribute.
 *
 * Fixture: test/clear-button.html — a multi-select and a single-select with
 * `show-clear`, plus a control without it. Each pre-loaded with three fruits.
 */

const PAGE = '/test/clear-button.html';

const picker = (page: Page, id: string): Locator => page.locator(`#${id}`);
const clearBtn = (p: Locator): Locator => p.locator('.ms__input-clear');

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

const optionByValue = (p: Locator, value: string): Locator =>
    p.locator(`.ms__option[data-value="${value}"]`);

const getValue = (p: Locator): Promise<unknown> => p.evaluate((el: any) => el.getValue());

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('hidden until something is selected, then appears', async ({ page }) => {
    const p = picker(page, 'ms-clear');
    await expect(clearBtn(p)).toBeHidden();

    await openDropdown(p);
    await optionByValue(p, 'apple').click();
    await expect(clearBtn(p)).toBeVisible();
});

test('clicking ✕ wipes the whole selection and hides again', async ({ page }) => {
    const p = picker(page, 'ms-clear');
    await openDropdown(p);
    await optionByValue(p, 'apple').click();
    await optionByValue(p, 'cherry').click();
    expect(await getValue(p)).toEqual(['apple', 'cherry']);

    await clearBtn(p).click();
    expect(await getValue(p)).toEqual([]);
    await expect(clearBtn(p)).toBeHidden();
});

test('clicking ✕ fires a single change event', async ({ page }) => {
    const p = picker(page, 'ms-clear');
    await openDropdown(p);
    await optionByValue(p, 'apple').click();

    await p.evaluate((el) => {
        (window as unknown as { changes: number }).changes = 0;
        el.addEventListener('change', () => ((window as unknown as { changes: number }).changes += 1));
    });
    await clearBtn(p).click();
    expect(await page.evaluate(() => (window as unknown as { changes: number }).changes)).toBe(1);
});

test('✕ does not open the dropdown when clearing with it closed', async ({ page }) => {
    const p = picker(page, 'ms-clear');
    await openDropdown(p);
    await optionByValue(p, 'apple').click();
    // Close the dropdown, leaving the selection in place and the ✕ visible.
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeHidden();
    await expect(clearBtn(p)).toBeVisible();

    await clearBtn(p).click();
    expect(await getValue(p)).toEqual([]);
    // Clearing must not pop the option list open.
    await expect(p.locator('.ms__dropdown')).toBeHidden();
});

test('✕ closes the selected-items popover if it was open', async ({ page }) => {
    const p = picker(page, 'ms-clear');
    await openDropdown(p);
    await optionByValue(p, 'apple').click();
    await optionByValue(p, 'cherry').click();

    // Open the selected-items popover from the [N] counter.
    await p.locator('.ms__counter').click();
    await expect(p.locator('.ms__selected-popover')).toBeVisible();

    await clearBtn(p).click();
    await expect(p.locator('.ms__selected-popover')).toBeHidden();
    expect(await getValue(p)).toEqual([]);
});

test('single-select: ✕ clears the value and empties the input', async ({ page }) => {
    const p = picker(page, 'ms-clear-single');
    await openDropdown(p);
    await optionByValue(p, 'banana').click();
    expect(await getValue(p)).toBe('banana');
    await expect(clearBtn(p)).toBeVisible();

    await clearBtn(p).click();
    expect(await getValue(p)).toBeNull();
    await expect(clearBtn(p)).toBeHidden();
    await expect(p.locator('.ms__input')).toHaveValue('');
});

test('no ✕ rendered without show-clear even when selected', async ({ page }) => {
    const p = picker(page, 'ms-noclear');
    await openDropdown(p);
    await optionByValue(p, 'apple').click();
    expect(await getValue(p)).toEqual(['apple']);
    await expect(clearBtn(p)).toBeHidden();
});
