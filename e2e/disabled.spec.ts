import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/disabled.html';

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

test('disabled option has --disabled modifier class', async ({ page }) => {
    const p = picker(page, 'dm');
    await openDropdown(p);

    await expect(p.locator('.ms__option[data-value="banana"]')).toHaveClass(/ms__option--disabled/);
    await expect(p.locator('.ms__option[data-value="apple"]')).not.toHaveClass(/ms__option--disabled/);
});

test('clicking a disabled option does not select it', async ({ page }) => {
    const p = picker(page, 'dm');
    await openDropdown(p);

    await p.locator('.ms__option[data-value="banana"]').click({ force: true });
    expect(await p.evaluate((el: any) => el.getValue())).toEqual([]);
});

test('Enter on disabled focused option does not select', async ({ page }) => {
    const p = picker(page, 'dm');
    await openDropdown(p);

    // Down twice → focus banana (index 1)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Banana is disabled — nothing selected.
    expect(await p.evaluate((el: any) => el.getValue())).toEqual([]);
});

test('a disabled CHECKED option keeps the accent fill (the tick stays visible)', async ({ page }) => {
    const p = picker(page, 'dm');
    await p.evaluate((el: any) => el.setSelected(['banana']));
    await p.evaluate((el) => (el as HTMLElement).style.setProperty('--ms-accent-color', 'rgb(1, 2, 3)'));
    await openDropdown(p);
    const box = p.locator('.ms__option[data-value="banana"] .ms__checkbox');
    await expect(box).toBeDisabled();
    await expect(box).toBeChecked();
    expect(await box.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(1, 2, 3)');
});
