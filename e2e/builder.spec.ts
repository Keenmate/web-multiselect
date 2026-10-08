import { test, expect } from './fixtures';

/**
 * The Builder playground (examples-builder.html): a VS-style property grid that drives a live
 * <web-multiselect> via attributes/style, a paste-your-own JSON data box, and a generated-markup
 * readout. This locks the wiring — enum/bool/css-var controls reach the element, bad JSON is
 * reported, and the markup reflects the live attributes.
 */

test('builder wires property grid + data to the live component', async ({ page }) => {
    await page.goto('/examples-builder.html');
    const demo = page.locator('#demo');

    // Expand every property group so collapsed controls are interactable.
    await page.$$eval('details.prop-group', (ds) => ds.forEach((d: any) => (d.open = true)));

    // Demo data applied (12 rows), members pre-set so it renders.
    await expect.poll(() => demo.evaluate((el: any) => el.options?.length ?? 0)).toBe(12);
    await expect(page.locator('#data-status')).toContainText('12 option');

    // Enum control → attribute on the element + reflected in generated markup.
    await page.locator('#ctl-badges-display-mode').selectOption('count');
    await expect(demo).toHaveAttribute('badges-display-mode', 'count');
    await expect(page.locator('#markup')).toContainText('badges-display-mode="count"');

    // Boolean control.
    await page.locator('#ctl-show-counter').check();
    await expect(demo).toHaveAttribute('show-counter', 'true');

    // CSS var control.
    await page.locator('[id="ctl---ms-rem"]').fill('8px');
    await page.locator('[id="ctl---ms-rem"]').dispatchEvent('input');
    await expect.poll(() => demo.evaluate((el: any) => el.style.getPropertyValue('--ms-rem'))).toBe('8px');

    // Invalid JSON → error; valid → applies.
    await page.locator('#data-input').fill('{ not an array');
    await expect(page.locator('#data-status')).toHaveClass(/data-status--err/);
    await page.locator('#data-input').fill('[{"value":"x","label":"X"}]');
    await expect.poll(() => demo.evaluate((el: any) => el.options?.length ?? 0)).toBe(1);

    // Generated markup carries the pre-set members.
    await expect(page.locator('#markup')).toContainText('value-member="value"');

    // Floating-UI info tooltip on a property explains it on hover.
    const info = page.locator('.prop-info[aria-label^="multiple:"]');
    await info.hover();
    const tip = page.locator('.builder-tip');
    await expect(tip).toHaveAttribute('data-show', '');
    await expect(tip).toContainText('single-select');
});

test('builder add-new actually creates the option (callback is wired)', async ({ page }) => {
    await page.goto('/examples-builder.html');
    const demo = page.locator('#demo');

    await page.locator('#ctl-allow-add-new').check();
    await demo.locator('.ms__input').click();
    await demo.locator('input').first().fill('hroch');

    await expect(demo.locator('.ms__add-new')).toContainText('hroch');
    await demo.locator('.ms__add-new').click();

    expect(await demo.evaluate((el: any) => el.getValue())).toContain('hroch');
    await expect(page.locator('#markup')).toContainText('addNewCallback');
});

test('builder wires member + comparator dependencies so every control bites', async ({ page }) => {
    await page.goto('/examples-builder.html');
    const demo = page.locator('#demo');
    await page.$$eval('details.prop-group', (ds) => ds.forEach((d: any) => (d.open = true)));

    // Enriched data members are pre-set and reflected in the generated markup.
    await expect(page.locator('#markup')).toContainText('subtitle-member="subtitle"');
    await expect(page.locator('#markup')).toContainText('full-title-member="fullTitle"');

    // selected-order="custom" uses the wired comparator and the markup flags the JS dependency.
    await page.locator('#ctl-selected-order').selectOption('custom');
    await expect(demo).toHaveAttribute('selected-order', 'custom');
    await expect(page.locator('#markup')).toContainText('selectedOrderCompareCallback');

    // selected-order-member control exists for order="member".
    await expect(page.locator('#ctl-selected-order-member')).toBeVisible();
});
