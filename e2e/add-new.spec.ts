import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/add-new.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('Enter on a no-match search term invokes beforeAddCallback and selects the result', async ({ page }) => {
    const p = picker(page, 'adder');
    await p.locator('.ms__input').click();
    await p.locator('.ms__input').fill('Mango'); // no matches in [Apple, Banana]
    await page.keyboard.press('Enter');

    const added = await page.evaluate(() => (window as any).__addedNames);
    expect(added).toEqual(['Mango']);

    // The new value should now be selected.
    const value = await p.evaluate((el: any) => el.getValue());
    expect(value).toEqual(['mango']);
});

test('Enter on a search term that matches does NOT invoke beforeAddCallback', async ({ page }) => {
    const p = picker(page, 'adder');
    await p.locator('.ms__input').click();
    await p.locator('.ms__input').fill('Ap'); // matches Apple
    await page.keyboard.press('Enter');

    const added = await page.evaluate(() => (window as any).__addedNames);
    expect(added).toEqual([]);
});
