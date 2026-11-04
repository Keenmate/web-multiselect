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
    // The badge has no ✕ (the selection can't change); removal is also gated in JS.
    await expect(p.locator('.ms__badge')).toHaveCount(1);
    await expect(p.locator('.ms__badge-remove')).toBeHidden();
    await p.locator('.ms__badge-remove').first().dispatchEvent('click');
    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['apple']);
    await expect(p.locator('.ms__input-clear')).toBeHidden();
    expect(await formData(page)).toHaveProperty('f-readonly', JSON.stringify(['apple']));
});

test('disabled: badges dim and have no remove button; re-enabling brings it back', async ({ page }) => {
    const p = ms(page, 'ms-disabled');
    await expect(p.locator('.ms__badge')).toHaveCount(1);
    await expect(p.locator('.ms__badge-remove')).toBeHidden();
    expect(Number(await p.locator('.ms__badges').evaluate(el => getComputedStyle(el).opacity))).toBeLessThan(1);
    await p.evaluate((el: any) => { el.isDisabled = false; });
    await expect(p.locator('.ms__badge-remove')).toBeVisible();
    expect(await p.locator('.ms__badges').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
});

test('readonly: the selected-items popover has no remove buttons either', async ({ page }) => {
    const p = ms(page, 'ms-readonly');
    await p.evaluate((el: any) => { el.badgesDisplayMode = 'count'; });
    await p.locator('.ms__badge--counter').click();
    const popover = p.locator('.ms__selected-popover');
    await expect(popover).toHaveClass(/ms__selected-popover--visible/);
    await expect(popover).toHaveClass(/ms__selected-popover--readonly/);
    await expect(popover.locator('.ms__badge')).toHaveCount(1);
    await expect(popover.locator('.ms__badge-remove')).toBeHidden();
    // Leaving readonly brings the ✕ back.
    await p.evaluate((el: any) => { el.isReadonly = false; });
    await expect(popover).not.toHaveClass(/ms__selected-popover--readonly/);
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
