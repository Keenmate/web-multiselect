import { test, expect } from './fixtures';

/**
 * Properties assigned before `<web-multiselect>` is defined (the script loads late, a framework
 * sets props on an un-upgraded element). `value` is a class accessor, not an input row: core rc20
 * lifts the early own property and replays it through the setter at the first connect, so the
 * component needs no rescue code of its own. Without that, the own property would shadow the
 * setter for good: the selection never applied and later writes were swallowed.
 */
const PAGE = '/test/pre-upgrade.html';

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate(() => customElements.whenDefined('web-multiselect'));
});

test('the page assigned the properties before the element was defined', async ({ page }) => {
    expect(await page.evaluate(() => (window as any).__definedBeforeScript)).toBe(false);
});

test('an early value is applied through the setter (JSON format)', async ({ page }) => {
    const r = await page.evaluate(async () => {
        const el = document.getElementById('early-json') as any;
        await el.whenReady();
        return {
            isOwn: Object.prototype.hasOwnProperty.call(el, 'value'),
            selected: el.selectedValue,
            value: el.value,
            submitted: el.querySelector('input[type="hidden"]')?.value ?? null,
        };
    });
    expect(r.isOwn).toBe(false); // the accessor is no longer shadowed
    expect(r.selected).toEqual(['banana', 'cherry']);
    expect(r.value).toBe('["banana","cherry"]');
    expect(r.submitted).toBe('["banana","cherry"]');
});

test('an early value is applied through the setter (text format, array assignment)', async ({ page }) => {
    const r = await page.evaluate(async () => {
        const el = document.getElementById('early-text') as any;
        await el.whenReady();
        return { selected: el.selectedValue, value: el.value };
    });
    expect(r.selected).toEqual(['apple']);
    expect(r.value).toBe('apple');
});

test('a later write after the replay still reaches the component', async ({ page }) => {
    const r = await page.evaluate(async () => {
        const el = document.getElementById('early-json') as any;
        await el.whenReady();
        el.value = '["apple"]';
        return { selected: el.selectedValue, badges: el.shadowRoot.querySelectorAll('.ms__badge').length };
    });
    expect(r.selected).toEqual(['apple']);
    expect(r.badges).toBe(1);
});
