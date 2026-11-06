import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/custom-rendering.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

async function select(p: Locator, value: string): Promise<void> {
    await openDropdown(p);
    await p.locator(`.ms__option[data-value="${value}"]`).click();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('renderOptionContentCallback overrides option markup', async ({ page }) => {
    const p = picker(page, 'opt-content');
    await openDropdown(p);

    await expect(p.locator('.js-opt-tag').first()).toBeVisible();
    await expect(p.locator('.ms__option').first()).toContainText(/\[opt\]Apple/);
});

test('renderBadgeContentCallback overrides badge markup', async ({ page }) => {
    const p = picker(page, 'badge-content');
    await select(p, 'apple');

    await expect(p.locator('.js-badge-tag')).toBeVisible();
    await expect(p.locator('.ms__badge:not([data-ms-action])')).toContainText(/\[badge\]Apple/);
});

test('getBadgeClassCallback adds custom class to badge', async ({ page }) => {
    const p = picker(page, 'badge-class');
    await select(p, 'cherry');

    await expect(p.locator('.ms__badge.js-cherry-class')).toBeVisible();
});

test('getCustomStylesCallback injects styles into shadow DOM', async ({ page }) => {
    const p = picker(page, 'custom-styles');
    await openDropdown(p);

    // The injected rule applies a dashed magenta outline.
    const outlineStyle = await p.locator('.ms__option').first().evaluate(el => getComputedStyle(el).outlineStyle);
    expect(outlineStyle).toBe('dashed');
});

test('icon-member and subtitle-member render in option content', async ({ page }) => {
    const p = picker(page, 'icon-subtitle');
    await openDropdown(p);

    const firstOption = p.locator('.ms__option').first();
    await expect(firstOption).toContainText(/🍎/);
    await expect(firstOption).toContainText(/red fruit/);
});

test('renderSelectedContentCallback receives the presentation context', async ({ page }) => {
    const p = picker(page, 'sel-content'); // single-select
    await select(p, 'apple');
    await page.mouse.click(0, 0); // close so the label lands in the input

    // Callback rendered `${label}·${ctx.presentation}` → proves the context arrived.
    await expect(p.locator('.ms__input')).toHaveValue('Apple·floating');
});

test('renderSelectedItemContentCallback receives a popover context (isInPopover=true)', async ({ page }) => {
    const p = picker(page, 'sel-item'); // count mode → popover on the count badge
    await select(p, 'apple');
    await page.mouse.click(0, 0);

    // Open the selected-items popover from the count badge.
    await p.locator('.ms__badge[data-ms-action="show-selected"]').click();
    await expect(p.locator('.ms__selected-popover')).toBeVisible();

    const item = p.locator('.ms__selected-popover .js-sel-item').first();
    await expect(item).toHaveText('Apple');
    await expect(item).toHaveAttribute('data-pop', 'true');
});

test('checkbox-align="top" puts the checkbox on the first text line of a tall custom row', async ({ page }) => {
    await page.evaluate(() => {
        const el = document.createElement('web-multiselect') as any;
        el.id = 'cb-top';
        el.setAttribute('value-member', 'value');
        el.setAttribute('display-value-member', 'label');
        el.setAttribute('checkbox-align', 'top');
        // first row taller than a plain label: big title + a tall pill, then a second line
        el.renderOptionContentCallback = ({ option }: any) =>
            `<div><div style="display:flex;align-items:center;gap:8px"><strong class="js-title" style="font-size:20px">${option.label}</strong>`
            + `<span style="display:inline-block;padding:8px 10px;font-size:12px">pill</span></div><div>second line</div></div>`;
        document.body.prepend(el);
        el.options = [{ value: 'a', label: 'Email Notifications' }];
    });
    const p = picker(page, 'cb-top');
    await openDropdown(p);
    const offset = await p.evaluate((el: any) => {
        const opt = el.shadowRoot.querySelector('.ms__option');
        const cb = opt.querySelector('.ms__checkbox').getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(opt.querySelector('.js-title'));
        const t = range.getClientRects()[0];
        return (cb.top + cb.height / 2) - (t.top + t.height / 2);
    });
    expect(Math.abs(offset)).toBeLessThan(3);
});
