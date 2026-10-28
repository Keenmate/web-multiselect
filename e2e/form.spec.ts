import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/form.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function selectAll(p: Locator, ...values: string[]): Promise<void> {
    await p.locator('.ms__input').click();
    for (const v of values) {
        await p.locator(`.ms__option[data-value="${v}"]`).click();
    }
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test('default JSON format emits a single hidden input with JSON array value', async ({ page }) => {
    const p = picker(page, 'json-form');
    await selectAll(p, 'apple', 'banana');

    // Hidden input is rendered in light DOM (host), not shadow DOM.
    const hidden = page.locator('input[type="hidden"][name="fruits-json"]');
    await expect(hidden).toHaveCount(1);
    expect(await hidden.inputValue()).toBe(JSON.stringify(['apple', 'banana']));
});

test('value-format="text" emits comma-separated values', async ({ page }) => {
    const p = picker(page, 'text-form');
    await selectAll(p, 'apple', 'banana');

    const hidden = page.locator('input[type="hidden"][name="fruits-text"]');
    expect(await hidden.inputValue()).toBe('apple,banana');
});

test('value-separator: the initial value is submitted and el.value is exactly what the form submits', async ({ page }) => {
    const read = () => page.evaluate(() => {
        const el = document.getElementById('sep-form') as any;
        const fd = new FormData(document.getElementById('sep-real-form') as HTMLFormElement);
        return { value: el.value, submitted: fd.getAll('fruits-sep'), arr: fd.getAll('fruits-arr-init[]'), arrValue: (document.getElementById('arr-init') as any).value };
    });
    await expect.poll(async () => (await read()).submitted).toEqual(['apple|cherry']);
    expect(await read()).toEqual({ value: 'apple|cherry', submitted: ['apple|cherry'], arr: ['banana', 'cherry'], arrValue: ['banana', 'cherry'] });

    // The setter takes the same form; the selection follows, the `value` attribute stays the default.
    await page.evaluate(() => { (document.getElementById('sep-form') as any).value = 'banana|apple'; });
    const after = await read();
    expect(after.value).toBe('banana|apple');
    expect(after.submitted).toEqual(['banana|apple']);
    expect(await picker(page, 'sep-form').getAttribute('value')).toBe('apple|cherry');

    // Picking adds to the same submitted form.
    await selectAll(picker(page, 'sep-form'), 'cherry');
    expect((await read()).value).toBe('banana|apple|cherry');
});

test('value-format="array" emits multiple hidden inputs with name[]', async ({ page }) => {
    const p = picker(page, 'arr-form');
    await selectAll(p, 'apple', 'banana');

    const hidden = page.locator('input[type="hidden"][name="fruits-arr[]"]');
    await expect(hidden).toHaveCount(2);
    const values = await hidden.evaluateAll((inputs: HTMLInputElement[]) => inputs.map(i => i.value));
    expect(values).toEqual(['apple', 'banana']);
});

test('getValueFormatCallback overrides serialization', async ({ page }) => {
    const p = picker(page, 'custom-fmt');
    await selectAll(p, 'apple', 'banana');

    const hidden = page.locator('input[type="hidden"][name="custom-fmt"]');
    expect(await hidden.inputValue()).toBe('apple|banana');
});

test('form.reset() clears a multiselect that has no value', async ({ page }) => {
    const p = picker(page, 'form-in-form');
    await selectAll(p, 'apple');

    const hidden = page.locator('input[type="hidden"][name="form-field"]');
    expect(await hidden.inputValue()).toBe(JSON.stringify(['apple']));

    // Trigger reset programmatically — the visible reset button can be covered
    // by the open dropdown in this fixture, but the form lifecycle is the same.
    await page.evaluate(() => (document.getElementById('real-form') as HTMLFormElement).reset());

    // formResetCallback should have cleared the picker; the hidden input
    // reflects the empty array now.
    expect(await hidden.inputValue()).toBe(JSON.stringify([]));
    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([]);
});

test('form.reset() restores the value selection; JS selection never rewrites the attribute', async ({ page }) => {
    const p = picker(page, 'form-init');
    const hidden = page.locator('input[type="hidden"][name="init-field"]');
    await expect.poll(() => p.evaluate((el: any) => el.selectedValue)).toEqual(['banana', 'cherry']);

    // User change + JS change: neither touches the `value` attribute.
    await selectAll(p, 'apple');
    await p.evaluate((el: any) => el.setSelected(['apple']));
    expect(await p.getAttribute('value')).toBe('banana,cherry');
    expect(await hidden.inputValue()).toBe(JSON.stringify(['apple']));

    const events = await p.evaluate((el: any) => {
        const seen: string[] = [];
        for (const n of ['change', 'select', 'deselect']) el.addEventListener(n, () => seen.push(n));
        (document.getElementById('init-form') as HTMLFormElement).reset();
        return seen;
    });

    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['banana', 'cherry']);
    expect(await hidden.inputValue()).toBe(JSON.stringify(['banana', 'cherry']));
    // A reset is not a user action — no selection events.
    expect(events).toEqual([]);
});

test('form.reset() on a single-select restores its initial value', async ({ page }) => {
    const p = picker(page, 'form-init-single');
    await expect.poll(() => p.evaluate((el: any) => el.selectedValue)).toBe('cherry');
    await p.evaluate((el: any) => el.setSelected(['apple']));
    expect(await p.evaluate((el: any) => el.selectedValue)).toBe('apple');

    await page.evaluate(() => (document.getElementById('init-form') as HTMLFormElement).reset());
    expect(await p.evaluate((el: any) => el.selectedValue)).toBe('cherry');
});

test('form.reset() uses an defaultValue set from JS as the default', async ({ page }) => {
    const p = picker(page, 'form-in-form');
    await p.evaluate(async (el: any) => { el.defaultValue = ['cherry']; await el.whenSettled(); });
    await p.evaluate((el: any) => el.setSelected(['apple', 'banana']));

    await page.evaluate(() => (document.getElementById('real-form') as HTMLFormElement).reset());
    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['cherry']);
});
