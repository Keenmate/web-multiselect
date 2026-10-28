import { test, expect, Page, Locator } from './fixtures';

/**
 * Verification gate for the core null-clear contract migration (rc12): the element
 * now forwards a cleared nullable input to the picker as a present `null` (via
 * `engineConfig()` on the reinit/build path and verbatim on the in-place update
 * path), instead of the old per-component null→undefined/absent conversion.
 *
 * The behavior must be unchanged: clearing a nullable input resets the field to its
 * built-in default. These tests assert the full set→clear transition on both paths.
 *
 * Any fixture that registers <web-multiselect> works — we create pickers inline for
 * full control over the set→clear sequence.
 */

const PAGE = '/test/placeholder.html'; // loads /src/index.ts → registers the element

function placeholder(p: Locator): Promise<string | null> {
    return p.locator('.ms__input').getAttribute('placeholder');
}

// Build a fresh picker with the given attributes + options, appended to the page.
async function makePicker(page: Page, attrs: Record<string, string>, options: unknown[]): Promise<Locator> {
    const id = 'nc-' + Math.random().toString(36).slice(2, 8);
    await page.evaluate(({ id, attrs, options }) => {
        const el = document.createElement('web-multiselect') as any;
        el.id = id;
        el.setAttribute('value-member', 'value');
        el.setAttribute('display-value-member', 'label');
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        document.body.appendChild(el);
        el.options = options;
    }, { id, attrs, options });
    return page.locator('#' + id);
}

const FRUIT = [
    { value: 'apple', label: 'Apple', icon: '🍎' },
    { value: 'pear', label: 'Pear' },
];

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

// ── update path (on: 'update') — cleared null forwarded verbatim ────────────────

test('clearing the labels attribute reverts the search placeholder to the default', async ({ page }) => {
    const p = await makePicker(page, { 'labels': '{"searchPlaceholder":"Custom search text"}' }, FRUIT);
    await expect.poll(() => placeholder(p)).toBe('Custom search text');

    await p.evaluate((el) => el.removeAttribute('labels'));
    // Default search placeholder returns (not stuck on the stale custom value, not blank).
    await expect.poll(() => placeholder(p)).toBe('Search…');
});

test('clearing the labels attribute drops the no-data placeholder', async ({ page }) => {
    const p = await makePicker(page, { 'labels': '{"noDataPlaceholder":"Pick a category first"}' }, []);
    await expect.poll(() => placeholder(p)).toBe('Pick a category first');

    await p.evaluate((el) => el.removeAttribute('labels'));
    // Empty list with no custom no-data text falls back to the search placeholder.
    await expect.poll(() => placeholder(p)).toBe('Search…');
});

test('clearing labels.searchHint removes the hint element', async ({ page }) => {
    const p = await makePicker(page, { 'labels': '{"searchHint":"Type to filter"}' }, FRUIT);
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__hint')).toHaveText('Type to filter');

    await p.evaluate((el) => el.removeAttribute('labels'));
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__hint')).toHaveCount(0);
});

// ── reinit path (on: 'reinit') — cleared null kept by engineConfig() ────────────

test('reinit path: removing icon-member resets it to the default member (icon)', async ({ page }) => {
    const p = await makePicker(page, { 'icon-member': 'emoji' }, FRUIT);
    await p.locator('.ms__input').click();
    // FRUIT has no `emoji` field → no icon resolved → no slot (reserve-icon-slot is off).
    await expect(p.locator('.ms__option[data-value="apple"] .ms__option-icon')).toHaveCount(0);

    await p.evaluate((el) => el.removeAttribute('icon-member'));
    await p.locator('.ms__input').click();
    // Absent == default: iconMember falls back to `icon`, which FRUIT has.
    await expect(p.locator('.ms__option[data-value="apple"] .ms__option-icon')).toHaveCount(1);
});

test('reinit path: clearing via the JS property (= null) resets too', async ({ page }) => {
    const p = await makePicker(page, { 'icon-member': 'icon' }, FRUIT);
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__option[data-value="apple"] .ms__option-icon')).toHaveCount(1);

    // Property set to null is the canonical clear signal under the contract.
    await p.evaluate((el: any) => { el.iconMember = null; });
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__option[data-value="apple"] .ms__option-icon')).toHaveCount(0);
});
