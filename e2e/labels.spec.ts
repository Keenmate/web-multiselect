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
    await p.locator('.ms__badge[data-action="show-selected"]').click();
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
