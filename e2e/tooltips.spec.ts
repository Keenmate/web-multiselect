import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/tooltips.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function selectFirst(p: Locator, value: string): Promise<void> {
    await p.locator('.ms__input').click();
    await p.locator(`.ms__option[data-value="${value}"]`).click();
    await p.locator('.ms__input').evaluate((el: HTMLElement) => el.blur());
    // Click outside to close
    await p.page().mouse.click(0, 0);
}

/** Open the dropdown and wait for its options to render (no selection). */
async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__option').first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('badge tooltip becomes visible on hover (default content)', async ({ page }) => {
    const p = picker(page, 'default-tt');
    await selectFirst(p, 'apple');

    await p.locator('.ms__badge:not([data-ms-action])').hover();

    // Tooltip lives in the document body (light DOM), positioned outside shadow root.
    const tooltip = page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText(/Apple/);
});

test('getBadgeTooltipCallback overrides tooltip content', async ({ page }) => {
    const p = picker(page, 'custom-tt');
    await selectFirst(p, 'banana');

    await p.locator('.ms__badge:not([data-ms-action])').hover();

    const tooltip = page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText('A yellow fruit');
});

test('remove button tooltip uses configured template', async ({ page }) => {
    const p = picker(page, 'remove-tt');
    await selectFirst(p, 'cherry');

    await p.locator('.ms__badge-remove').hover();

    const tooltip = page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText('Drop Cherry');
});

test('tooltip uses position:fixed', async ({ page }) => {
    const p = picker(page, 'default-tt');
    await selectFirst(p, 'apple');

    await p.locator('.ms__badge:not([data-ms-action])').hover();
    const tooltip = page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });

    const position = await tooltip.evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('fixed');
});

// ============================================================================
// OPTION (dropdown row) TOOLTIPS
// ============================================================================

test('option tooltip becomes visible on hover (default content)', async ({ page }) => {
    const p = picker(page, 'option-tt');
    await openDropdown(p);

    await p.locator('.ms__option[data-value="apple"]').hover();

    const tooltip = page.locator('.ms__option-tooltip.ms__option-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText(/Apple/);
});

test('getOptionTooltipCallback overrides option tooltip content', async ({ page }) => {
    const p = picker(page, 'option-custom-tt');
    await openDropdown(p);

    await p.locator('.ms__option[data-value="banana"]').hover();

    const tooltip = page.locator('.ms__option-tooltip.ms__option-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText('A yellow fruit');
});

test('option tooltip uses the distinct .ms__option-tooltip class, not the badge class', async ({ page }) => {
    const p = picker(page, 'option-tt');
    await openDropdown(p);

    await p.locator('.ms__option[data-value="apple"]').hover();
    await expect(page.locator('.ms__option-tooltip.ms__option-tooltip--visible')).toBeVisible({ timeout: 2000 });

    // No badge tooltip should be showing for an option hover.
    await expect(page.locator('.ms__badge-tooltip.ms__badge-tooltip--visible')).toHaveCount(0);
});

test('option-tooltip-placement="right" positions the tooltip to the side of the row', async ({ page }) => {
    const p = picker(page, 'option-side-tt');
    await openDropdown(p);

    const option = p.locator('.ms__option[data-value="apple"]');
    await option.hover();

    const tooltip = page.locator('.ms__option-tooltip.ms__option-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });

    const optBox = await option.boundingBox();
    const ttBox = await tooltip.boundingBox();
    expect(optBox).not.toBeNull();
    expect(ttBox).not.toBeNull();
    // 'right' placement: the tooltip sits to the right of (beyond) the option row's right edge.
    expect(ttBox!.x).toBeGreaterThanOrEqual(optBox!.x + optBox!.width - 2);
});

test('follow-cursor: option tooltip tracks the pointer as it moves along the row', async ({ page }) => {
    const p = picker(page, 'option-follow-tt');
    await openDropdown(p);

    const option = p.locator('.ms__option[data-value="apple"]');
    const box = await option.boundingBox();
    expect(box).not.toBeNull();
    const midY = box!.y + box!.height / 2;

    // Pointer near the left of the row.
    await page.mouse.move(box!.x + 20, midY);
    const tooltip = page.locator('.ms__option-tooltip.ms__option-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    const left1 = (await tooltip.boundingBox())!.x;

    // Pointer near the right of the row — tooltip should follow.
    await page.mouse.move(box!.x + box!.width - 20, midY);
    await page.waitForTimeout(50);
    const left2 = (await tooltip.boundingBox())!.x;

    expect(Math.abs(left2 - left1)).toBeGreaterThan(20);
});

test('option tooltip is dismissed immediately when the list scrolls', async ({ page }) => {
    const p = picker(page, 'option-scroll-tt');
    await openDropdown(p);

    // Show a tooltip on the first visible row.
    await p.locator('.ms__option').first().hover();
    const tooltip = page.locator('.ms__option-tooltip.ms__option-tooltip--visible');
    await expect(tooltip).toBeVisible({ timeout: 2000 });

    // Scroll the options list — a shown tooltip must not trail its anchor row; it
    // should vanish at once (core hide() ignores the hide delay; mount-on-show
    // means the visible element is also removed).
    await p.evaluate((host: any) => {
        const c = host.shadowRoot.querySelector('.ms__options--virtual, .ms__options');
        c.scrollTop = 600;
        c.dispatchEvent(new Event('scroll'));
    });

    await expect(tooltip).toHaveCount(0);
});
