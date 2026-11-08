import { test, expect, Page, Locator } from './fixtures';

/**
 * External search (fixture test/external-search.html, the examples-external-search ES01 / ES02
 * setup): the whole search is delegated to a FlexSearch index via
 * `searchCallback`. Verifies (1) accent-insensitive / partial matching on a flat
 * list, and (2) external search on the ISCO tree — matches keep their ancestors,
 * and the index covers code + breadcrumb, not just the label.
 */

const PAGE = '/test/external-search.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}
async function open(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForTimeout(400); // let the batched indexes build
});

test('flat: accent-insensitive match (zurich → Zürich)', async ({ page }) => {
    const p = picker(page, 'cities');
    await open(p);
    await p.locator('.ms__input').fill('zurich');
    await expect(p.locator('.ms__option', { hasText: 'Zürich' })).toBeVisible();
});

test('flat: partial token match (krak → Kraków)', async ({ page }) => {
    const p = picker(page, 'cities');
    await open(p);
    await p.locator('.ms__input').fill('krak');
    await expect(p.locator('.ms__option', { hasText: 'Kraków' })).toBeVisible();
});

test('tree: exact code lookup is clean (2211 → only 2211 + ancestors, no digit noise)', async ({ page }) => {
    const p = picker(page, 'isco-flex');
    await open(p);

    // A purely-numeric query is treated as a code lookup: exact match only.
    await p.locator('.ms__input').fill('2211');
    await expect(p.locator('.ms__option[data-value="2211"]')).toBeVisible();
    await expect(p.locator('.ms__option[data-value="2"]')).toBeVisible(); // ancestor → coherent tree
    // No digit-substring noise (1211 Finance Managers shares "211" but must NOT appear).
    await expect(p.locator('.ms__option[data-value="1211"]')).toHaveCount(0);
});

test('tree: code prefix returns the whole subtree (72 → 721, 7212…)', async ({ page }) => {
    const p = picker(page, 'isco-flex');
    await open(p);
    await p.locator('.ms__input').fill('72');
    await expect(p.locator('.ms__option[data-value="72"]')).toBeVisible();
    await expect(p.locator('.ms__option[data-value="7212"]')).toBeVisible(); // Welders, under 72
});

test('tree: external search by breadcrumb word (health)', async ({ page }) => {
    const p = picker(page, 'isco-flex');
    await open(p);
    await p.locator('.ms__input').fill('health');
    await expect.poll(async () => p.locator('.ms__option').count()).toBeGreaterThan(2);
});
