import { test, expect, Page, Locator } from './fixtures';

/**
 * Member defaults (2.x BREAKING): value / label / group / icon / subtitle / disabled are
 * the built-in member defaults for ALL data — `ms.options = [{ value: 1, label: 'Prague' }]`
 * works with no member configuration. A get*Callback overrides its member; setting a
 * member to `null` clears it. Primitive option arrays (strings / numbers) are their own
 * value and label.
 */

const PAGE = '/test/placeholder.html'; // loads /src/index.ts → registers the element

async function make(page: Page, options: unknown[], props: Record<string, unknown> = {}): Promise<Locator> {
    const id = 'md-' + Math.random().toString(36).slice(2, 8);
    await page.evaluate(({ id, options, props }) => {
        const el = document.createElement('web-multiselect') as any;
        el.id = id;
        document.body.appendChild(el);
        Object.assign(el, props);
        el.options = options;
    }, { id, options, props });
    return page.locator('#' + id);
}

async function open(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

const CITIES = [
    { value: 1, label: 'Prague', group: 'Bohemia', icon: '🏰', subtitle: 'Capital' },
    { value: 2, label: 'Brno', group: 'Moravia' },
    { value: 3, label: 'Ostrava', group: 'Moravia', disabled: true },
];

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('object options work with no member configuration', async ({ page }) => {
    const p = await make(page, CITIES);
    await open(p);
    await expect(p.locator('.ms__option')).toHaveCount(3);
    await expect(p.locator('.ms__option[data-value="1"]')).toContainText('Prague');
    await expect(p.locator('.ms__option[data-value="1"]')).toContainText('Capital');
    await expect(p.locator('.ms__option[data-value="1"] .ms__option-icon')).toHaveCount(1);
    await expect(p.locator('.ms__group-label')).toHaveText(['Bohemia', 'Moravia']);
    await expect(p.locator('.ms__option[data-value="3"]')).toHaveClass(/ms__option--disabled/);

    await p.locator('.ms__option[data-value="1"]').click();
    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([1]);
    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([1]);
});

test('single mode: selectedValue returns the default value member', async ({ page }) => {
    const p = await make(page, [{ value: 1, label: 'Prague' }, { value: 2, label: 'Brno' }], { isMultiple: false });
    await open(p);
    await p.locator('.ms__option[data-value="2"]').click();
    expect(await p.evaluate((el: any) => el.selectedValue)).toBe(2);
});

test('a get*Callback overrides its default member', async ({ page }) => {
    const id = 'md-cb';
    await page.evaluate((id) => {
        const el = document.createElement('web-multiselect') as any;
        el.id = id;
        document.body.appendChild(el);
        el.getValueCallback = ({ option }: any) => 'c' + option.value;
        el.getDisplayValueCallback = ({ option }: any) => option.label.toUpperCase();
        el.options = [{ value: 1, label: 'Prague' }];
    }, id);
    const p = page.locator('#' + id);
    await open(p);
    await expect(p.locator('.ms__option[data-value="c1"]')).toContainText('PRAGUE');
});

test('a member set to null is cleared (no group headers)', async ({ page }) => {
    const p = await make(page, CITIES, { groupMember: null });
    await open(p);
    await expect(p.locator('.ms__option')).toHaveCount(3);
    await expect(p.locator('.ms__group-label')).toHaveCount(0);
});

test('a custom member overrides the default', async ({ page }) => {
    const p = await make(page, [{ id: 'a', name: 'Alpha' }], { valueMember: 'id', displayValueMember: 'name' });
    await open(p);
    await expect(p.locator('.ms__option[data-value="a"]')).toContainText('Alpha');
});

test('primitive string options are their own value and label', async ({ page }) => {
    const p = await make(page, ['Prague', 'Brno']);
    await open(p);
    await expect(p.locator('.ms__option')).toHaveText(['Prague', 'Brno']);
    await p.locator('.ms__option[data-value="Brno"]').click();
    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['Brno']);
});

test('primitive number options are their own value and label', async ({ page }) => {
    const p = await make(page, [10, 20]);
    await open(p);
    await expect(p.locator('.ms__option')).toHaveText(['10', '20']);
    await p.locator('.ms__option[data-value="20"]').click();
    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([20]);
});
