import { test, expect } from './fixtures';

/**
 * ARIA combobox / listbox (core /a11y `createActiveDescendant`): the search field is a combobox,
 * the options a listbox of options with aria-selected, and aria-activedescendant follows the
 * keyboard highlight while focus stays in the field. Fixture: test/search.html (#filter, multi).
 */
test('combobox + listbox roles, aria-expanded, aria-activedescendant follows the highlight', async ({ page }) => {
    await page.goto('/test/search.html');
    const p = page.locator('#filter');
    const field = p.locator('.ms__input');
    await expect(field).toHaveAttribute('role', 'combobox');
    await expect(field).toHaveAttribute('aria-expanded', 'false');

    await field.click();
    await expect(field).toHaveAttribute('aria-expanded', 'true');
    const listbox = p.locator('[role="listbox"]');
    await expect(listbox).toHaveCount(1);
    await expect(field).toHaveAttribute('aria-controls', (await listbox.getAttribute('id'))!);
    await expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    await expect(p.locator('[role="option"]').first()).toHaveAttribute('aria-selected', 'false');

    await field.press('ArrowDown');
    await field.press('ArrowDown');
    const focused = p.locator('.ms__option--focused');
    const id = await focused.getAttribute('id');
    expect(id).toBeTruthy();
    await expect(field).toHaveAttribute('aria-activedescendant', id!);
    await expect(field).toBeFocused();

    await field.press('Enter');
    await expect(p.locator('.ms__option--focused')).toHaveAttribute('aria-selected', 'true');
    await expect(field).toHaveAttribute('aria-activedescendant', (await p.locator('.ms__option--focused').getAttribute('id'))!);

    await field.press('Escape');
    await expect(field).toHaveAttribute('aria-expanded', 'false');
    await expect(field).not.toHaveAttribute('aria-activedescendant', /.+/);
});

test('virtual list: aria-activedescendant points at a rendered row after a long jump', async ({ page }) => {
    await page.goto('/test/virtual-scroll.html');
    const p = page.locator('web-multiselect').first();
    const field = p.locator('.ms__input');
    await field.click();
    await expect(p.locator('[role="listbox"]')).toHaveCount(1);
    await field.press('End');
    await expect.poll(async () => {
        const id = await field.getAttribute('aria-activedescendant');
        return id ? await p.locator(`[id="${id}"]`).count() : 0;
    }).toBe(1);
});

test('a key a beforeKeydownCallback cancels is left alone (core does not handle keys, nor preventDefault them)', async ({ page }) => {
    await page.goto('/test/search.html');
    const p = page.locator('#filter');
    const field = p.locator('.ms__input');
    await field.click();
    await field.press('ArrowDown');
    const activeValue = async () => {
        const id = await field.getAttribute('aria-activedescendant');
        return p.locator(`[id="${id}"]`).getAttribute('data-value');
    };
    const before = await activeValue();
    await p.evaluate((el: any) => {
        el.beforeKeydownCallback = ({ key }: { key: string }) => (key === 'ArrowDown' ? false : undefined);
        (window as any).__prevented = null;
        el.addEventListener('keydown', (e: KeyboardEvent) => { (window as any).__prevented = e.defaultPrevented; });
    });
    await field.press('ArrowDown');
    expect(await page.evaluate(() => (window as any).__prevented)).toBe(false);
    expect(await activeValue()).toBe(before); // the highlight didn't move
});
