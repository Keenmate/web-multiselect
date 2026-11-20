import { test, expect } from './fixtures';

/**
 * Option / action-button icons are data read by core `renderIcon` (SPEC §12.33): markup raw, a built-in name
 * masked (no hook sees it), the element's `renderIconCallback`, then the page-wide one (`null` = not mine), an
 * ASCII class list → `<i class="ms__icon …">`, anything else escaped text. Fixture: test/icons.html.
 */
const OPTIONS = [
    { value: 'svg', label: 'Svg', icon: '<svg class="probe" viewBox="0 0 1 1"></svg>' },
    { value: 'builtin', label: 'Built-in', icon: 'check' },
    { value: 'font', label: 'Font', icon: 'fa-solid fa-flag' },
    { value: 'word', label: 'Word', icon: 'star' },
    { value: 'emoji', label: 'Emoji', icon: '🚀' },
    { value: 'text', label: 'Text', icon: '1 < 2 <b>' },
];

test.beforeEach(async ({ page }) => {
    await page.goto('/test/icons.html');
    await page.waitForFunction(() => !!customElements.get('web-multiselect'));
});

const icon = (page: any, v: string) => page.locator(`#ms-icons .ms__option[data-value="${v}"] .ms__option-icon`);

test('no hook: markup raw, a built-in masked, a class list an icon-font <i>, other text escaped', async ({ page }) => {
    const p = page.locator('#ms-icons');
    await p.evaluate((el: any, options) => { el.options = options; }, OPTIONS);
    await p.locator('.ms__input').click();
    await expect(icon(page, 'svg').locator('svg.probe')).toHaveCount(1);
    await expect(icon(page, 'builtin').locator('.km-icon.ms__icon--check')).toHaveCount(1);
    await expect(icon(page, 'font').locator('i.ms__icon.fa-solid.fa-flag[aria-hidden="true"]')).toHaveCount(1);
    // A one-word name that is NOT built-in is an icon-font class now (core rc25), not a mask.
    await expect(icon(page, 'word').locator('i.ms__icon.star')).toHaveCount(1);
    await expect(icon(page, 'word').locator('.km-icon')).toHaveCount(0);
    await expect(icon(page, 'emoji')).toHaveText('🚀');
    await expect(icon(page, 'text')).toHaveText('1 < 2 <b>');
    await expect(icon(page, 'text').locator('b')).toHaveCount(0);
    // The icon-font <i> is a fixed glyph (flex: none).
    expect(await icon(page, 'font').locator('i').evaluate((el: Element) => getComputedStyle(el).flexShrink)).toBe('0');
});

test('the element hook beats the page hook; null falls through; a built-in never reaches a hook', async ({ page }) => {
    const p = page.locator('#ms-icons');
    await p.evaluate((el: any, options) => {
        const calls: string[] = [];
        (window as any).components.renderIconCallback = (name: string) => {
            calls.push(`page:${name}`);
            return `<b class="page-${name.replace(/\W/g, '')}"></b>`;
        };
        el.renderIconCallback = (name: string, ctx: any) => {
            calls.push(`el:${name}:${ctx.component}:${ctx.prefix}:${ctx.element === el}:${ctx.option?.value}`);
            return name === 'star' ? '<b class="mine"></b>' : null;
        };
        el.options = options;
        (window as any).__calls = calls;
    }, OPTIONS);
    await p.locator('.ms__input').click();
    // Element hook answered 'star' → the page hook is not asked for it.
    await expect(icon(page, 'word').locator('b.mine')).toHaveCount(1);
    // Element hook said null for the class list → the page hook decides.
    await expect(icon(page, 'font').locator('b.page-fasolidfaflag')).toHaveCount(1);
    // Built-in stays the mask.
    await expect(icon(page, 'builtin').locator('.km-icon.ms__icon--check')).toHaveCount(1);
    const calls: string[] = await page.evaluate(() => (window as any).__calls);
    expect(calls).toContain('el:star:web-multiselect:ms:true:word');
    expect(calls).not.toContain('page:star');
    expect(calls).toContain('page:fa-solid fa-flag');
    expect(calls.some((c) => c.includes(':check'))).toBe(false);
    expect(calls.some((c) => c.startsWith('page:<') || c.startsWith('el:<'))).toBe(false);
});

test('changing renderIconCallback re-renders the icons in place', async ({ page }) => {
    const p = page.locator('#ms-icons');
    await p.evaluate((el: any, options) => { el.options = options; }, OPTIONS);
    await p.locator('.ms__input').click();
    await expect(icon(page, 'word').locator('i.ms__icon.star')).toHaveCount(1);
    await p.evaluate((el: any) => { el.renderIconCallback = (name: string) => (name === 'star' ? '<b class="late"></b>' : null); });
    await expect(icon(page, 'word').locator('b.late')).toHaveCount(1);
    await p.evaluate((el: any) => { el.renderIconCallback = null; });
    await expect(icon(page, 'word').locator('i.ms__icon.star')).toHaveCount(1);
});

test('action-button icons go through the element hook with ctx.item', async ({ page }) => {
    const p = page.locator('#ms-actions');
    await p.evaluate((el: any) => {
        el.renderIconCallback = (name: string, ctx: any) => (name === 'my-all' ? `<b class="act-${ctx.item?.action}"></b>` : null);
        el.actionButtons = [
            { action: 'select-all', text: 'All', icon: 'my-all' },
            { action: 'clear-selection', text: 'None', icon: 'close' },
        ];
    });
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__action-btn[data-action="select-all"] .ms__action-btn-icon b.act-select-all')).toHaveCount(1);
    await expect(p.locator('.ms__action-btn[data-action="clear-selection"] .km-icon.ms__icon--close')).toHaveCount(1);
});
