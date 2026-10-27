import { test, expect, Page, Locator } from './fixtures';

/**
 * Control-level `disabled` / `readonly` (rulebook D-NC-16). Disabled: no interaction, not
 * focusable, not submitted; an ancestor `<fieldset disabled>` disables it too (core
 * `isEffectivelyDisabled` → `disabledChanged`). Readonly: no selection change and no
 * dropdown, but focusable and submitted.
 */
const PAGE = '/test/control-state.html';
const ms = (page: Page, id: string): Locator => page.locator(`#${id}`);
const formData = (page: Page): Promise<Record<string, string>> =>
    page.evaluate(() => Object.fromEntries(new FormData(document.getElementById('form') as HTMLFormElement) as any));

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForFunction(() => (document.getElementById('ms-readonly') as any)?.selectedOptions?.length === 1);
});

test('disabled: not openable, no clear, input disabled, value not submitted', async ({ page }) => {
    const p = ms(page, 'ms-disabled');
    await expect(p.locator('.ms')).toHaveClass(/ms--disabled/);
    await expect(p.locator('.ms__input')).toBeDisabled();
    await p.locator('.ms__input-wrapper').click({ force: true });
    await p.evaluate((el: any) => el.open());
    expect(await p.evaluate((el: any) => el.isOpen)).toBe(false);
    await expect(p.locator('.ms__input-clear')).toBeHidden();
    expect(await formData(page)).not.toHaveProperty('f-disabled');
    // programmatic selection still works
    await p.evaluate((el: any) => el.setSelected(['cherry']));
    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['cherry']);
});

test('disabled flips live: removing the attribute re-enables and submits', async ({ page }) => {
    const p = ms(page, 'ms-disabled');
    await p.evaluate((el: any) => { el.isDisabled = false; });
    await expect(p.locator('.ms')).not.toHaveClass(/ms--disabled/);
    await expect(p.locator('.ms__input')).toBeEnabled();
    expect(await formData(page)).toHaveProperty('f-disabled', JSON.stringify(['apple']));
    await p.evaluate((el: any) => el.open());
    expect(await p.evaluate((el: any) => el.isOpen)).toBe(true);
});

test('readonly: focusable, not openable, badge removal blocked, value submitted', async ({ page }) => {
    const p = ms(page, 'ms-readonly');
    await expect(p.locator('.ms')).toHaveClass(/ms--readonly/);
    const input = p.locator('.ms__input');
    await expect(input).toBeEnabled();
    await input.focus();
    await expect(input).toBeFocused();
    await page.keyboard.press('ArrowDown');
    expect(await p.evaluate((el: any) => el.isOpen)).toBe(false);
    await p.locator('.ms__badge-remove').first().click({ force: true });
    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['apple']);
    await expect(p.locator('.ms__input-clear')).toBeHidden();
    expect(await formData(page)).toHaveProperty('f-readonly', JSON.stringify(['apple']));
});

test('an ancestor <fieldset disabled> disables the control (and re-enables it)', async ({ page }) => {
    const p = ms(page, 'ms-fieldset');
    await page.evaluate(() => { (document.getElementById('fs') as HTMLFieldSetElement).disabled = true; });
    await expect(p.locator('.ms')).toHaveClass(/ms--disabled/);
    expect(await p.evaluate((el: any) => el.isDisabled)).toBe(false); // author value untouched
    expect(await formData(page)).not.toHaveProperty('f-fieldset');
    await page.evaluate(() => { (document.getElementById('fs') as HTMLFieldSetElement).disabled = false; });
    await expect(p.locator('.ms')).not.toHaveClass(/ms--disabled/);
    expect(await formData(page)).toHaveProperty('f-fieldset', JSON.stringify(['banana']));
});
