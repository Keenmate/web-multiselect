import { test, expect } from './fixtures';

/**
 * The `labels` property is a partial i18n map for the component's ARIA labels / short UI
 * strings (close, clear, remove, group count, "…and N more"). Unset keys fall back to their
 * English defaults; `{item}` / `{count}` placeholders are interpolated. Reuses the
 * floating-panels fixture (`#popover-picker` is count-mode with three pre-selected values).
 */

test('labels map overrides aria-labels with {item} interpolation', async ({ page }) => {
    await page.goto('/test/floating-panels.html');
    const p = page.locator('#popover-picker');

    await p.evaluate((el: any) => {
        el.labels = { close: 'Zavřít', removeItem: 'Odebrat {item}', andMore: '…a {count} dalších' };
    });

    // Open the selected-items popover (count mode).
    await p.locator('.ms__badge[data-ms-action="show-selected"]').click();
    await expect(p.locator('.ms__selected-popover')).toBeVisible();

    // Close button aria-label translated.
    await expect(p.locator('.ms__selected-popover-close')).toHaveAttribute('aria-label', 'Zavřít');

    // Badge remove aria-label uses the {item} template.
    const firstRemove = p.locator('.ms__selected-popover .ms__badge-remove').first();
    await expect(firstRemove).toHaveAttribute('aria-label', /^Odebrat .+/);

    // Unset keys still fall back to English.
    const label = await p.evaluate((el: any) => el.labels.clearSelection ?? '(unset)');
    expect(label).toBe('(unset)');
});

/**
 * {count} interpolation across the three labels that use it. The `#lbl-count` fixture is
 * built to surface all three at once (grouped data + partial badges + counter, 14 selected):
 *   - groupSelected      → the `.ms__group-count` header chip aria-label
 *   - removeHiddenItems  → the "+N more" badge's remove button aria-label
 *   - andMore            → the counter chip's native `title` (cap is 12, so 14 → "…and 2 more")
 */
test('labels map interpolates {count} in group count, remove-hidden, and counter overflow', async ({ page }) => {
    await page.goto('/test/labels.html');
    const p = page.locator('#lbl-count');

    await p.evaluate((el: any) => {
        el.labels = {
            groupSelected: '{count} vybráno',
            removeHiddenItems: 'Odebrat {count} skrytých',
            andMore: '…a {count} dalších',
        };
    });

    // andMore — counter chip title. 14 selected, cap 12 → "…a 2 dalších".
    await expect(p.locator('.ms__counter')).toHaveAttribute('title', /…a 2 dalších$/);

    // removeHiddenItems — partial mode, max-visible 2 → 12 hidden.
    await expect(p.locator('.ms__badge--more .ms__badge-remove'))
        .toHaveAttribute('aria-label', 'Odebrat 12 skrytých');

    // groupSelected — open the dropdown; Group A header has 10 selected.
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
    await expect(p.locator('.ms__group-count').first()).toHaveAttribute('aria-label', '10 vybráno');
});
