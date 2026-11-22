import { test, expect, Page, Locator } from './fixtures';

/**
 * `required` + `min-selected-count` / `max-selected-count` form validity through core (SPEC §6.6, C-CA-41)
 * (fixture: test/required-validity.html).
 */

const PAGE = '/test/required-validity.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}
const validity = (p: Locator) => p.evaluate((el: any) => ({
    valid: el.validity.valid,
    valueMissing: el.validity.valueMissing,
    rangeUnderflow: el.validity.rangeUnderflow,
    rangeOverflow: el.validity.rangeOverflow,
    message: el.validationMessage,
    checkValidity: el.checkValidity(),
}));
const setSelected = (p: Locator, values: string[]) =>
    p.evaluate(async (el: any, v) => { el.setSelected(v); await el.whenSettled(); }, values);

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(picker(page, 'fsreq')).toHaveAttribute('ready');
});

test('required + empty → valueMissing, checkValidity() false, :state(required), aria-required', async ({ page }) => {
    const p = picker(page, 'req');
    expect(await validity(p)).toEqual({
        valid: false, valueMissing: true, rangeUnderflow: false, rangeOverflow: false,
        message: 'Select an item.', checkValidity: false,
    });
    expect(await p.evaluate((el: Element) => el.matches(':state(required)') && el.matches(':invalid'))).toBe(true);
    // aria-required on the internals (core; the TS-protected getter is reachable at runtime).
    expect(await p.evaluate((el: any) => el.internals?.ariaRequired)).toBe('true');
    // The placeholder reads {ctx.missing}.
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Select 3 more');
});

test('form submit is blocked while invalid; a valid selection submits', async ({ page }) => {
    await page.locator('#submit').click();
    await expect(page.locator('#submitted')).toHaveText('');
    await setSelected(picker(page, 'req'), ['apple', 'banana', 'cherry']);
    await setSelected(picker(page, 'min'), []);
    await page.evaluate(() => (document.getElementById('fs') as HTMLFieldSetElement).disabled = true);
    await page.locator('#submit').click();
    await expect(page.locator('#submitted')).toHaveText('submitted');
});

test('a user pick clears valueMissing; fewer than min → rangeUnderflow (blocks nothing); min reached → valid', async ({ page }) => {
    const p = picker(page, 'req');
    await p.locator('.ms__input').click();
    await p.locator('.ms__option', { hasText: 'Apple' }).click();
    await expect.poll(() => validity(p)).toEqual({
        valid: false, valueMissing: false, rangeUnderflow: true, rangeOverflow: false,
        message: 'Select at least 3.', checkValidity: false,
    });
    await expect(p.locator('.ms__input')).toHaveAttribute('placeholder', 'Select 2 more');
    await p.locator('.ms__option', { hasText: 'Banana' }).click();
    await p.locator('.ms__option', { hasText: 'Cherry' }).click();
    await expect.poll(async () => (await validity(p)).valid).toBe(true);
    expect(await p.evaluate((el: Element) => el.matches(':valid'))).toBe(true);
});

test('above max-selected-count (programmatic) → rangeOverflow', async ({ page }) => {
    const p = picker(page, 'req');
    await setSelected(p, ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig']);
    expect(await validity(p)).toEqual({
        valid: false, valueMissing: false, rangeUnderflow: false, rangeOverflow: true,
        message: 'Select at most 5.', checkValidity: false,
    });
    await setSelected(p, ['apple', 'banana', 'cherry', 'date', 'elderberry']);
    expect((await validity(p)).valid).toBe(true);
});

test('min-selected-count without required: empty is valid, 1 is rangeUnderflow', async ({ page }) => {
    const p = picker(page, 'min');
    expect((await validity(p)).valid).toBe(true);
    expect(await p.evaluate((el: Element) => el.matches(':state(required)'))).toBe(false);
    await setSelected(p, ['apple']);
    expect(await validity(p)).toMatchObject({ valid: false, rangeUnderflow: true, valueMissing: false });
    await setSelected(p, ['apple', 'banana']);
    expect((await validity(p)).valid).toBe(true);
});

test('readonly and disabled are never missing', async ({ page }) => {
    expect((await validity(picker(page, 'ro'))).valueMissing).toBe(false);
    const fsreq = picker(page, 'fsreq');
    expect((await validity(fsreq)).valueMissing).toBe(true);
    await page.evaluate(() => (document.getElementById('fs') as HTMLFieldSetElement).disabled = true);
    await expect.poll(async () => (await validity(fsreq)).valueMissing).toBe(false);
    await page.evaluate(() => (document.getElementById('fs') as HTMLFieldSetElement).disabled = false);
    await expect.poll(async () => (await validity(fsreq)).valueMissing).toBe(true);

    // The own attributes too: readonly on, off; disabled on.
    const p = picker(page, 'req');
    await p.evaluate(async (el: any) => { el.isReadonly = true; await el.whenSettled(); });
    expect((await validity(p)).valueMissing).toBe(false);
    await p.evaluate(async (el: any) => { el.isReadonly = false; await el.whenSettled(); });
    expect((await validity(p)).valueMissing).toBe(true);
    await p.evaluate(async (el: any) => { el.isDisabled = true; await el.whenSettled(); });
    expect((await validity(p)).valueMissing).toBe(false);
});

test('readonly also suspends the count rules', async ({ page }) => {
    const p = picker(page, 'min');
    await setSelected(p, ['apple']);
    expect((await validity(p)).rangeUnderflow).toBe(true);
    await p.evaluate(async (el: any) => { el.isReadonly = true; await el.whenSettled(); });
    expect((await validity(p)).rangeUnderflow).toBe(false);
});

test('removing required clears valueMissing and :state(required); the attribute reflects', async ({ page }) => {
    const p = picker(page, 'req');
    await p.evaluate(async (el: any) => { el.isRequired = false; await el.whenSettled(); });
    expect(await p.evaluate((el: Element) => el.hasAttribute('required'))).toBe(false);
    expect((await validity(p)).valid).toBe(true);
    expect(await p.evaluate((el: Element) => el.matches(':state(required)'))).toBe(false);
    await p.evaluate(async (el: any) => { el.isRequired = true; await el.whenSettled(); });
    expect(await p.evaluate((el: Element) => el.hasAttribute('required'))).toBe(true);
    expect((await validity(p)).valueMissing).toBe(true);
});

test('form reset re-evaluates (back to empty → valueMissing)', async ({ page }) => {
    const p = picker(page, 'req');
    await setSelected(p, ['apple', 'banana', 'cherry']);
    expect((await validity(p)).valid).toBe(true);
    await page.locator('#reset').click();
    await expect.poll(async () => (await validity(p)).valueMissing).toBe(true);
});

test('labels: errors.required / errors.minSelected follow an instance labels change', async ({ page }) => {
    const p = picker(page, 'req');
    await p.evaluate(async (el: any) => {
        el.labels = {
            'placeholders.search': 'Select {ctx.missing} more',
            'errors.required': 'Vyberte položku.',
            'errors.minSelected': 'Ještě {ctx.missing} (min {ctx.min})',
        };
        await el.whenSettled();
    });
    expect((await validity(p)).message).toBe('Vyberte položku.');
    await setSelected(p, ['apple']);
    expect((await validity(p)).message).toBe('Ještě 2 (min 3)');
});

test('reportValidity() anchors at the control input (no console error)', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
    const p = picker(page, 'req');
    expect(await p.evaluate((el: any) => el.reportValidity())).toBe(false);
    await setSelected(p, ['apple']);
    expect(await p.evaluate((el: any) => el.reportValidity())).toBe(false);
    expect(warnings.filter((w) => w.includes('anchor rejected'))).toEqual([]);
});
