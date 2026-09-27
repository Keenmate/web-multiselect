import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/custom-styles.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

// The custom-styles CSS lands in the replaceable slot at the top of the shadow root.
function slotText(p: Locator): Promise<string> {
    return p.evaluate((el) => el.shadowRoot!.querySelector('.ms-custom-styles')?.textContent?.trim() ?? '');
}

// The field border lives on the wrapper shell (the <input> itself is borderless);
// --ms-border-color drives its color, mirroring theming.spec.ts.
function borderColor(p: Locator): Promise<string> {
    return p.locator('.ms__input-wrapper').evaluate(el => getComputedStyle(el).borderTopColor);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// Border color transitions over 0.15s, so poll rather than reading a single frame.
test('custom-styles attribute injects the CSS verbatim and it applies', async ({ page }) => {
    const p = picker(page, 'cs-attr');
    expect(await slotText(p)).toBe(':host { --ms-border-color: rgb(255, 0, 0); }');
    await expect.poll(() => borderColor(p)).toBe('rgb(255, 0, 0)');
});

test('customStylesCallback wins when both it and the attribute are set', async ({ page }) => {
    const p = picker(page, 'cs-precedence');
    // Green from the callback, not red from the attribute.
    expect(await slotText(p)).toContain('rgb(0, 128, 0)');
    await expect.poll(() => borderColor(p)).toBe('rgb(0, 128, 0)');
});

test('setting custom-styles at runtime applies reactively; removing it clears', async ({ page }) => {
    const p = picker(page, 'cs-reactive');
    const initial = await borderColor(p);
    expect(initial).not.toBe('rgb(255, 0, 0)');

    await p.evaluate(el => el.setAttribute('custom-styles', ':host { --ms-border-color: rgb(255, 0, 0); }'));
    await expect.poll(() => borderColor(p)).toBe('rgb(255, 0, 0)');

    await p.evaluate(el => el.removeAttribute('custom-styles'));
    // Slot node is removed when cleared, and the border falls back to the default.
    await expect.poll(() => slotText(p)).toBe('');
    await expect.poll(() => borderColor(p)).toBe(initial);
});

test('the customStyles property reflects and drives the slot', async ({ page }) => {
    const p = picker(page, 'cs-reactive');
    await p.evaluate(el => { (el as any).customStyles = ':host { --ms-border-color: rgb(0, 0, 255); }'; });
    await expect.poll(() => borderColor(p)).toBe('rgb(0, 0, 255)');
    expect(await p.evaluate(el => (el as any).customStyles)).toBe(':host { --ms-border-color: rgb(0, 0, 255); }');
});
