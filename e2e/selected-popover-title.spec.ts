import { test, expect } from './fixtures';

/**
 * The selected-items popover header is translatable via the `selected-popover-title`
 * attribute / `selectedPopoverTitle` property. The `{count}` placeholder is replaced with
 * the current selection count, so translators control both the wording and the count
 * placement. Reuses the floating-panels fixture, whose `#popover-picker` is count-mode with
 * three pre-selected values.
 */

const PAGE = '/test/floating-panels.html';

test('selected-popover-title translates the header and interpolates {count}', async ({ page }) => {
    await page.goto(PAGE);
    const p = page.locator('#popover-picker');
    const badge = p.locator('.ms__badge[data-action="show-selected"]');
    const header = p.locator('.ms__selected-popover-header span');

    // Default (English) header.
    await badge.click();
    await expect(header).toHaveText('Selected Items (3)');
    await badge.click(); // close

    // Translated header — {count} is substituted; wording and placement are the author's.
    await p.evaluate((el: any) => el.setAttribute('selected-popover-title', 'Vybrané položky ({count})'));
    await badge.click();
    await expect(header).toHaveText('Vybrané položky (3)');
});
