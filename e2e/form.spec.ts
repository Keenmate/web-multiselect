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

test('throwing getValueFormatCallback: host invalid, submit blocked; novalidate submits empty; recovery', async ({ page }) => {
    const r = await page.evaluate(async () => {
        const submits: (string | null)[] = [];
        const form = document.createElement('form');
        form.addEventListener('submit', (e) => { e.preventDefault(); submits.push(new FormData(form).get('fmt-err') as string | null); });
        const ms = document.createElement('web-multiselect') as any;
        ms.setAttribute('name', 'fmt-err');
        ms.setAttribute('value-member', 'value');
        ms.setAttribute('display-value-member', 'label');
        ms.options = [{ value: 'apple', label: 'Apple' }, { value: 'banana', label: 'Banana' }];
        ms.defaultValue = ['apple', 'banana'];
        ms.getValueFormatCallback = () => { throw new Error('boom'); };
        let invalids = 0;
        ms.addEventListener('invalid', () => invalids++);
        const errors: { message: string; value: unknown }[] = [];
        ms.addEventListener('value-format-error', (e: CustomEvent) => errors.push({ message: (e.detail.error as Error).message, value: e.detail.value }));
        const btn = document.createElement('button');
        btn.type = 'submit';
        form.append(ms, btn);
        document.body.append(form);
        await ms.whenSettled();

        btn.click();
        const blocked = {
            submits: submits.length, invalids, errors: errors.slice(-1),
            valid: ms.validity.valid, customError: ms.validity.customError,
            message: ms.validationMessage, isInvalid: ms.matches(':invalid'), checkValidity: ms.checkValidity(),
        };

        form.noValidate = true;
        btn.click();
        const novalidate = submits.slice();
        form.noValidate = false;

        ms.getValueFormatCallback = ({ selectedValues }: any) => selectedValues.join('|');
        await ms.whenSettled();
        btn.click();
        const recovered = { submits: submits.slice(novalidate.length), valid: ms.validity.valid, message: ms.validationMessage };
        form.remove();
        return { blocked, novalidate, recovered };
    });

    expect(r.blocked.submits).toBe(0);
    expect(r.blocked.invalids).toBeGreaterThan(0);
    expect(r.blocked.errors).toEqual([{ message: 'boom', value: ['apple', 'banana'] }]);
    expect(r.blocked.valid).toBe(false);
    expect(r.blocked.customError).toBe(true);
    expect(r.blocked.message).toBe('The value could not be formatted.');
    expect(r.blocked.isInvalid).toBe(true);
    expect(r.blocked.checkValidity).toBe(false);
    expect(r.novalidate).toEqual(['']);
    expect(r.recovered).toEqual({ submits: ['apple|banana'], valid: true, message: '' });
});

test('labels.valueFormatError sets the validation message', async ({ page }) => {
    const message = await page.evaluate(async () => {
        const ms = document.createElement('web-multiselect') as any;
        ms.setAttribute('name', 'fmt-err-label');
        ms.labels = { valueFormatError: 'Nelze naformátovat.' };
        ms.options = [{ value: 'a', label: 'A' }];
        ms.getValueFormatCallback = () => { throw new Error('x'); };
        document.body.append(ms);
        await ms.whenSettled();
        const msg = ms.validationMessage;
        ms.remove();
        return msg;
    });
    expect(message).toBe('Nelze naformátovat.');
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

    const events = await p.evaluate(async (el: any) => {
        const seen: string[] = [];
        for (const n of ['change', 'select', 'deselect', 'add', 'open', 'close', 'action']) el.addEventListener(n, () => seen.push(n));
        (document.getElementById('init-form') as HTMLFormElement).reset();
        // Catch anything deferred too (microtask / frame).
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));
        return seen;
    });

    expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['banana', 'cherry']);
    expect(await hidden.inputValue()).toBe(JSON.stringify(['banana', 'cherry']));
    // A reset is not a user action — silent, like a native form.reset() (no event at all).
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
