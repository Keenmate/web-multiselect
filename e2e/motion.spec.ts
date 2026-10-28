import { test, expect, Page } from './fixtures';

// Motion comes from the contract's speeds and is turned off with CSS only (0s), never an attribute.
const PAGE = '/test/custom-styles.html';

// The input wrapper transitions its border; its computed duration is --ms-transition-normal.
function wrapperDuration(page: Page): Promise<string> {
    return page.locator('#cs-attr .ms__input-wrapper').evaluate(el => getComputedStyle(el).transitionDuration.split(',')[0].trim());
}

test('transitions run at --base-duration-normal (0.15s) by default', async ({ page }) => {
    await page.goto(PAGE);
    expect(await wrapperDuration(page)).toBe('0.15s');
});

test('prefers-reduced-motion: reduce turns transitions off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
    expect(await wrapperDuration(page)).toBe('0s');
});

test('--base-duration-normal: 0s on the page turns transitions off', async ({ page }) => {
    await page.goto(PAGE);
    await page.addStyleTag({ content: ':root { --base-duration-normal: 0s; }' });
    expect(await wrapperDuration(page)).toBe('0s');
});

test('--ms-transition-normal: 0s on the element turns transitions off', async ({ page }) => {
    await page.goto(PAGE);
    await page.addStyleTag({ content: '#cs-attr { --ms-transition-normal: 0s; }' });
    expect(await wrapperDuration(page)).toBe('0s');
});
