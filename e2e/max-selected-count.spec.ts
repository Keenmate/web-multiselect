import { test, expect, Page, Locator } from './fixtures';

/** `max-selected-count` — a limit on the user's picks (fixture: test/max-selected-count.html). */

const PAGE = '/test/max-selected-count.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}
function option(p: Locator, label: string): Locator {
    return p.locator('.ms__option', { hasText: label });
}
async function open(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}
async function pick(p: Locator, labels: string[]): Promise<void> {
    for (const label of labels) await option(p, label).click();
}
const selected = (p: Locator) => p.evaluate((el: any) => el.selectedValue);

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(picker(page, 'limit').locator('.ms__input')).toHaveAttribute('placeholder', 'Select up to 5 more');
});

test('the 6th click pick is blocked; the rest turn aria-disabled + ms__option--limit', async ({ page }) => {
    const p = picker(page, 'limit');
    await open(p);
    await pick(p, ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']);
    await expect(option(p, 'Fig')).toHaveAttribute('aria-disabled', 'true');
    await expect(option(p, 'Fig')).toHaveClass(/ms__option--limit/);
    await expect(option(p, 'Apple')).not.toHaveAttribute('aria-disabled', 'true');
    // aria-disabled: Playwright refuses a plain click on it — force the user's click through.
    await option(p, 'Fig').click({ force: true });
    expect(await selected(p)).toEqual(['apple', 'banana', 'cherry', 'date', 'elderberry']);

    // Deselecting frees a slot: the limit marks clear.
    await option(p, 'Apple').click();
    await expect(option(p, 'Fig')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(p.locator('.ms__option--limit')).toHaveCount(0);
    await option(p, 'Fig').click();
    expect(await selected(p)).toEqual(['banana', 'cherry', 'date', 'elderberry', 'fig']);
});

test('the keyboard pick past the limit is blocked (Enter on a limit row)', async ({ page }) => {
    const p = picker(page, 'limit');
    await open(p);
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
    }
    expect(await selected(p)).toEqual(['apple', 'banana', 'cherry', 'date', 'elderberry']);
    // The limit row stays reachable (focused) but is not picked.
    await expect(p.locator('.ms__option--focused')).toContainText('Fig');
    await expect(p.locator('.ms__option--focused')).toHaveAttribute('aria-disabled', 'true');
});

test('reaching the limit is announced (messages.limitReached)', async ({ page }) => {
    const p = picker(page, 'limit');
    await open(p);
    await pick(p, ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']);
    await expect(page.locator('[data-km-announcer="polite"]')).toHaveText('Limit reached: 5');
});

test('select-all picks only up to the limit, in display order', async ({ page }) => {
    const p = picker(page, 'limit');
    await open(p);
    await pick(p, ['Grape']);
    await p.locator('.ms__action-btn[data-action="select-all"]').click();
    expect(await selected(p)).toEqual(['grape', 'apple', 'banana', 'cherry', 'date']);
    await expect(p.locator('.ms__action-btn[data-action="select-all"]')).toBeDisabled();
});

test('the placeholder reads {ctx.remaining} and updates live', async ({ page }) => {
    const p = picker(page, 'limit');
    const input = p.locator('.ms__input');
    await open(p);
    await pick(p, ['Apple', 'Banana']);
    await expect(input).toHaveAttribute('placeholder', 'Select up to 3 more');
    await pick(p, ['Apple']);
    await expect(input).toHaveAttribute('placeholder', 'Select up to 4 more');
    // A programmatic value is not truncated; remaining stays 0.
    await p.evaluate((el: any) => el.setSelected(['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig']));
    await expect.poll(() => selected(p)).toEqual(['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig']);
    await expect(input).toHaveAttribute('placeholder', 'Select up to 0 more');
});

test('Czech plural forms via translateCallback on params.ctx.count (1 / 2 / 5)', async ({ page }) => {
    const p = picker(page, 'limit-cs');
    const input = p.locator('.ms__input');
    await expect(input).toHaveAttribute('placeholder', 'Vyberte ještě 5 položek');
    await open(p);
    await pick(p, ['Apple', 'Banana', 'Cherry']);
    await expect(input).toHaveAttribute('placeholder', 'Vyberte ještě 2 položky');
    await pick(p, ['Date']);
    await expect(input).toHaveAttribute('placeholder', 'Vyberte ještě 1 položku');
});

test('translateCallback: a custom text at the limit only', async ({ page }) => {
    const p = picker(page, 'limit-full');
    const input = p.locator('.ms__input');
    await expect(input).toHaveAttribute('placeholder', 'Search…');
    await open(p);
    await pick(p, ['Apple', 'Banana']);
    await expect(input).toHaveAttribute('placeholder', 'All 2 picked — remove one to change');
    await pick(p, ['Banana']);
    await expect(input).toHaveAttribute('placeholder', 'Search…');
});

test('removing the attribute lifts the limit', async ({ page }) => {
    const p = picker(page, 'limit-full');
    await open(p);
    await pick(p, ['Apple', 'Banana']);
    await option(p, 'Cherry').click({ force: true });
    expect(await selected(p)).toEqual(['apple', 'banana']);
    await p.evaluate((el: any) => el.removeAttribute('max-selected-count'));
    await expect(p.locator('.ms__option--limit')).toHaveCount(0);
    await pick(p, ['Cherry']);
    expect(await selected(p)).toEqual(['apple', 'banana', 'cherry']);
});
