import { test, expect, Page, Locator } from './fixtures';

/**
 * Verifies that the dropdown, the search hint, and the selected-items popover
 * all use position:fixed so they escape an ancestor with `overflow:auto`. This
 * is the SPFx-workbench / micro-frontend regression the fix addressed:
 *   - computePosition is called with strategy: 'fixed'
 *   - position: 'fixed' is written inline
 *   - the .ms__dropdown / .ms__hint / .ms__selected-popover CSS rules default
 *     to position: fixed
 *
 * Fixture: test/floating-panels.html — three independent multiselects, each
 * inside a 200px scroll container with a 600px spacer below them. With the
 * fix, each opened panel's bottom edge must extend past its container's
 * bottom edge.
 */

const PAGE = '/test/floating-panels.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

// Open dropdown by clicking the input inside the web component's shadow root.
// Playwright locators pierce open shadow roots transparently.
async function openDropdown(p: Locator): Promise<Locator> {
    await p.locator('.ms__input').click();
    const dropdown = p.locator('.ms__dropdown');
    await expect(dropdown).toBeVisible();
    return dropdown;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('dropdown', () => {
    test('uses position:fixed when opened', async ({ page }) => {
        const dropdown = await openDropdown(picker(page, 'dropdown-picker'));
        const position = await dropdown.evaluate(el => getComputedStyle(el).position);
        expect(position).toBe('fixed');
    });

    test('extends past the bottom edge of its scroll-clipping ancestor', async ({ page }) => {
        const dropdown = await openDropdown(picker(page, 'dropdown-picker'));

        const clipBox = await page.locator('#dropdown-clip').boundingBox();
        const dropdownBox = await dropdown.boundingBox();

        expect(clipBox).not.toBeNull();
        expect(dropdownBox).not.toBeNull();

        // With position:absolute the dropdown would be clipped by the
        // ancestor's overflow:auto. With position:fixed it overflows.
        const clipBottom = clipBox!.y + clipBox!.height;
        const dropdownBottom = dropdownBox!.y + dropdownBox!.height;
        expect(dropdownBottom).toBeGreaterThan(clipBottom);
    });
});

test.describe('search hint', () => {
    test('uses position:fixed and is visible when dropdown opens', async ({ page }) => {
        const p = picker(page, 'hint-picker');
        await openDropdown(p);

        const hint = p.locator('.ms__hint');
        await expect(hint).toBeVisible();

        const position = await hint.evaluate(el => getComputedStyle(el).position);
        expect(position).toBe('fixed');
    });
});

test.describe('selected-items popover', () => {
    test('uses position:fixed when opened from the count badge', async ({ page }) => {
        const p = picker(page, 'popover-picker');

        // The count badge in count-mode is rendered as a clickable badge with
        // data-ms-action="show-selected". Clicking it toggles the popover.
        await p.locator('.ms__badge[data-ms-action="show-selected"]').click();

        const popover = p.locator('.ms__selected-popover');
        await expect(popover).toBeVisible();

        const position = await popover.evaluate(el => getComputedStyle(el).position);
        expect(position).toBe('fixed');
    });

    // The popover-geometry-escape assertion is intentionally omitted: it goes
    // through the same anchorFloatingPanel code path as the dropdown, so the
    // dropdown's escape test plus the popover's position:fixed test above
    // cover the invariant. Asserting geometry on the popover specifically is
    // additionally flaky here because the popover body renders empty unless
    // its selected options were known at picker init (see NOTES.md).
});
