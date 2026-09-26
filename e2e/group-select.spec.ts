import { test, expect, Page, Locator } from './fixtures';

/**
 * E2E for flat-group cascade selection (group-select-mode="cascade"). The group
 * header carries a tristate checkbox that checks/unchecks all of the group's
 * (visible) members; the group name itself is never a selected value.
 *
 * Dataset (test/groups.html):
 *   Fruits:     Apple (a1), Banana (a2), Cherry (a3)
 *   Vegetables: Carrot (v1), Beet (v2), Kale (v3)
 */

const PAGE = '/test/groups.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}
async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}
const val = (p: Locator) => p.evaluate((el: any) => el.getValue());
const groupLabel = (p: Locator, name: string) => p.locator(`.ms__group-label[data-group="${name}"]`);
const groupBox = (p: Locator, name: string) => groupLabel(p, name).locator('.ms__checkbox');
const optByValue = (p: Locator, value: string) => p.locator(`.ms__option[data-value="${value}"]`);
async function typeQuery(p: Locator, q: string): Promise<void> {
    const input = p.locator('.ms__input');
    await input.click();
    await input.fill('');
    await input.type(q, { delay: 5 });
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('clicking an unchecked group header selects all its members (group not a value)', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openDropdown(p);

    await groupLabel(p, 'Fruits').click();

    // Every Fruits member is selected; Vegetables untouched.
    await expect(optByValue(p, 'a1')).toHaveClass(/ms__option--selected/);
    await expect(optByValue(p, 'a2')).toHaveClass(/ms__option--selected/);
    await expect(optByValue(p, 'a3')).toHaveClass(/ms__option--selected/);
    await expect(optByValue(p, 'v1')).not.toHaveClass(/ms__option--selected/);

    // Header checkbox reads fully checked.
    await expect(groupBox(p, 'Fruits')).toBeChecked();

    // getValue carries the member values only — never the group name.
    expect(await val(p)).toEqual(['a1', 'a2', 'a3']);
});

test('partial member selection makes the header indeterminate', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openDropdown(p);

    await optByValue(p, 'a1').click(); // one Fruits member

    const box = groupBox(p, 'Fruits');
    await expect(box).not.toBeChecked();
    await expect(box).toHaveClass(/ms__checkbox--indeterminate/);
    await expect(box).toHaveAttribute('aria-checked', 'mixed');
});

test('selecting the last remaining member flips the header to checked', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openDropdown(p);

    await optByValue(p, 'a1').click();
    await optByValue(p, 'a2').click();
    await expect(groupBox(p, 'Fruits')).toHaveClass(/ms__checkbox--indeterminate/);

    await optByValue(p, 'a3').click();
    await expect(groupBox(p, 'Fruits')).toBeChecked();
    await expect(groupBox(p, 'Fruits')).not.toHaveClass(/ms__checkbox--indeterminate/);
});

test('clicking a fully-checked header deselects all its members', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openDropdown(p);

    await groupLabel(p, 'Fruits').click();
    expect(await val(p)).toEqual(['a1', 'a2', 'a3']);

    await groupLabel(p, 'Fruits').click();
    expect(await val(p)).toEqual([]);
    await expect(groupBox(p, 'Fruits')).not.toBeChecked();
});

test('one change event fires per header toggle (single commit)', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openDropdown(p);

    await p.evaluate((el: any) => {
        (window as any).__changes = 0;
        el.addEventListener('change', () => { (window as any).__changes++; });
    });
    await groupLabel(p, 'Fruits').click();

    expect(await page.evaluate(() => (window as any).__changes)).toBe(1);
});

test('cascade acts on the visible (filtered) members only', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openDropdown(p);

    // "a" matches Apple + Banana in Fruits (Cherry has no "a"), plus some vegs.
    await typeQuery(p, 'a');
    await expect(optByValue(p, 'a1')).toBeVisible();
    await expect(optByValue(p, 'a2')).toBeVisible();
    await expect(optByValue(p, 'a3')).toHaveCount(0); // Cherry filtered out

    await groupLabel(p, 'Fruits').click();

    // Only the visible Fruits members were selected; hidden Cherry untouched.
    expect(await val(p)).toEqual(['a1', 'a2']);
});

test('disabled members are excluded from the group check-all', async ({ page }) => {
    const p = picker(page, 'group-cascade-disabled'); // Cherry (a3) is disabled
    await openDropdown(p);

    await groupLabel(p, 'Fruits').click();

    // Only the two enabled members are selected...
    expect(await val(p)).toEqual(['a1', 'a2']);
    // ...and the header still reads fully checked (disabled excluded from denominator).
    await expect(groupBox(p, 'Fruits')).toBeChecked();
});

test('group-select-mode="none" leaves headers inert (no checkbox, no-op click)', async ({ page }) => {
    const p = picker(page, 'group-none');
    await openDropdown(p);

    await expect(groupLabel(p, 'Fruits').locator('.ms__checkbox')).toHaveCount(0);
    await groupLabel(p, 'Fruits').click();
    expect(await val(p)).toEqual([]);
});

test('cascade coexists with a custom group-label renderer', async ({ page }) => {
    const p = picker(page, 'group-cascade-custom');
    await openDropdown(p);

    // Custom label content AND the cascade checkbox are both present.
    await expect(groupLabel(p, 'Fruits').locator('.js-custom-label')).toContainText('[FRUITS]');
    await expect(groupBox(p, 'Fruits')).toHaveCount(1);

    await groupLabel(p, 'Fruits').click();
    expect(await val(p)).toEqual(['a1', 'a2', 'a3']);
});

const groupCount = (p: Locator, name: string) => groupLabel(p, name).locator('.ms__group-count');

test('cascade header shows a live selected-count chip (hidden at 0)', async ({ page }) => {
    const p = picker(page, 'group-cascade');
    await openDropdown(p);

    // Nothing selected → no count chip.
    await expect(groupCount(p, 'Fruits')).toHaveCount(0);

    await optByValue(p, 'a1').click();
    await expect(groupCount(p, 'Fruits')).toHaveText('[1]');

    await optByValue(p, 'a2').click();
    await expect(groupCount(p, 'Fruits')).toHaveText('[2]');

    // Vegetables stays empty — the count is per-group.
    await expect(groupCount(p, 'Vegetables')).toHaveCount(0);

    // Full group via the header → 3, then clear → chip gone.
    await groupLabel(p, 'Fruits').click(); // was indeterminate → checks the rest
    await expect(groupCount(p, 'Fruits')).toHaveText('[3]');
    await groupLabel(p, 'Fruits').click(); // uncheck all
    await expect(groupCount(p, 'Fruits')).toHaveCount(0);
});

test('count chip counts selected members even when one is disabled', async ({ page }) => {
    const p = picker(page, 'group-cascade-disabled'); // Cherry (a3) disabled
    await openDropdown(p);

    await groupLabel(p, 'Fruits').click(); // selects the 2 enabled members
    // Header reads checked (disabled excluded from denominator) and the chip shows 2.
    await expect(groupBox(p, 'Fruits')).toBeChecked();
    await expect(groupCount(p, 'Fruits')).toHaveText('[2]');
});

test('renderGroupLabelContentCallback receives the selection context (selectedCount/selectableCount)', async ({ page }) => {
    const p = picker(page, 'group-cascade-custom');
    await openDropdown(p);

    // Callback renders "selected/selectable" from its 2nd-arg context.
    await expect(groupLabel(p, 'Fruits').locator('.js-custom-count')).toHaveCount(0);

    await optByValue(p, 'a1').click();
    await expect(groupLabel(p, 'Fruits').locator('.js-custom-count')).toHaveText('1/3');

    await groupLabel(p, 'Fruits').click(); // check all three
    await expect(groupLabel(p, 'Fruits').locator('.js-custom-count')).toHaveText('3/3');
});

test('single-select ignores group-select-mode (no header checkbox)', async ({ page }) => {
    const p = picker(page, 'group-cascade-single');
    await openDropdown(p);

    await expect(groupLabel(p, 'Fruits').locator('.ms__checkbox')).toHaveCount(0);
    await groupLabel(p, 'Fruits').click();
    // Nothing selected from a header click in single-select mode.
    expect(await val(p)).toBeNull();
});
