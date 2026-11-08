import { describe, it, expect, afterEach } from 'vitest';
import '../../src/index'; // registers <web-multiselect> (core registerComponent)
import { parseDefaultValue } from '../../src/converters';

/**
 * `value` attribute / `defaultValue` property — the initial selection (native
 * `defaultValue` semantics), parsed per `value-format` (the grammar the control submits).
 */

describe('parseDefaultValue', () => {
    it('json (default): JSON array, JSON scalar, bare-CSV fallback', () => {
        expect(parseDefaultValue('["a","b"]', 'json')).toEqual(['a', 'b']);
        expect(parseDefaultValue('[1,2]', undefined)).toEqual([1, 2]);
        expect(parseDefaultValue('5', 'json')).toEqual([5]);
        expect(parseDefaultValue('a, b', 'json')).toEqual(['a', 'b']);
        expect(parseDefaultValue('a', 'array')).toEqual(['a']);
    });

    it('text: always split on the separator (a JSON-looking value is not decoded)', () => {
        expect(parseDefaultValue('a,b,c', 'text')).toEqual(['a', 'b', 'c']);
        expect(parseDefaultValue('[x]', 'text')).toEqual(['[x]']);
        expect(parseDefaultValue('a | b|c', 'text', '|')).toEqual(['a', 'b', 'c']);
        expect(parseDefaultValue('a,b', 'text', '|')).toEqual(['a,b']);
    });

    it('json fallback splits on the separator too', () => {
        expect(parseDefaultValue('a;b', 'json', ';')).toEqual(['a', 'b']);
    });

    it('arrays pass through; blank / nullish → empty', () => {
        expect(parseDefaultValue(['x', 1], 'text')).toEqual(['x', 1]);
        expect(parseDefaultValue('  ', 'json')).toEqual([]);
        expect(parseDefaultValue(null, 'json')).toEqual([]);
    });
});

describe('<web-multiselect value> → initial selection', () => {
    let el: any;
    afterEach(() => { el?.remove(); el = undefined; });

    const OPTIONS = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }];

    it('value attribute (text format) selects on first build; defaultValue property mirrors it', async () => {
        el = document.createElement('web-multiselect');
        el.setAttribute('value-format', 'text');
        el.setAttribute('value', 'a,c');
        el.options = OPTIONS;
        document.body.appendChild(el);
        await el.whenSettled();
        expect(el.selectedValue).toEqual(['a', 'c']);
        expect(el.defaultValue).toBe('a,c');
    });

    it('defaultValue property (array) selects on build', async () => {
        el = document.createElement('web-multiselect');
        el.options = OPTIONS;
        el.defaultValue = ['b'];
        document.body.appendChild(el);
        await el.whenSettled();
        expect(el.selectedValue).toEqual(['b']);
    });
});

describe('el.value — the submitted value (get/set)', () => {
    let el: any;
    afterEach(() => { el?.remove(); el = undefined; });

    const OPTIONS = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }];

    async function make(attrs: Record<string, string>): Promise<any> {
        el = document.createElement('web-multiselect');
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        el.options = OPTIONS;
        document.body.appendChild(el);
        await el.whenSettled();
        return el;
    }
    const hidden = () => Array.from(el.querySelectorAll('input[type=hidden]')) as HTMLInputElement[];

    it('json (default): getter = the JSON array the form submits; setter parses the same', async () => {
        await make({ name: 'f', value: '["a","c"]' });
        expect(el.value).toBe('["a","c"]');
        expect(hidden().map((i) => i.value)).toEqual(['["a","c"]']);
        el.value = '["b"]';
        expect(el.selectedValue).toEqual(['b']);
        expect(el.value).toBe('["b"]');
        expect(el.getAttribute('value')).toBe('["a","c"]'); // the attribute stays defaultValue
    });

    it('text + value-separator: joins / splits on the separator', async () => {
        await make({ name: 'f', 'value-format': 'text', 'value-separator': '|', value: 'a|c' });
        expect(el.selectedValue).toEqual(['a', 'c']);
        expect(el.value).toBe('a|c');
        expect(hidden().map((i) => i.value)).toEqual(['a|c']);
        el.value = 'b|c';
        expect(el.value).toBe('b|c');
    });

    it('text: separator defaults to ","', async () => {
        await make({ 'value-format': 'text', value: 'a,b' });
        expect(el.value).toBe('a,b');
    });

    it('array: getter = one string per name[] field; setter takes an array', async () => {
        await make({ name: 'f', 'value-format': 'array', value: '["a","b"]' });
        expect(el.value).toEqual(['a', 'b']);
        expect(hidden().map((i) => `${i.name}=${i.value}`)).toEqual(['f[]=a', 'f[]=b']);
        el.value = ['c'];
        expect(el.value).toEqual(['c']);
    });

    it('getValueFormatCallback wins (one field, also for array)', async () => {
        el = document.createElement('web-multiselect');
        el.setAttribute('name', 'f');
        el.setAttribute('value-format', 'array');
        el.options = OPTIONS;
        el.getValueFormatCallback = (ctx: any) => ctx.selectedValues.join('+');
        el.defaultValue = ['a', 'b'];
        document.body.appendChild(el);
        await el.whenSettled();
        expect(el.value).toBe('a+b');
        expect(hidden().map((i) => `${i.name}=${i.value}`)).toEqual(['f=a+b']);
    });

    it('a throwing getValueFormatCallback: empty string submitted, value-format-error + twin, recovery', async () => {
        el = document.createElement('web-multiselect');
        el.setAttribute('name', 'f');
        el.options = OPTIONS;
        el.defaultValue = ['a'];
        const boom = new Error('boom');
        el.getValueFormatCallback = () => { throw boom; };
        const details: any[] = [];
        const twins: any[] = [];
        el.addEventListener('value-format-error', (e: CustomEvent) => details.push(e.detail));
        el.onValueFormatError = (d: any) => twins.push(d);
        document.body.appendChild(el);
        await el.whenSettled();
        expect(el.value).toBe('');
        expect(hidden().map((i) => `${i.name}=${i.value}`)).toEqual(['f=']);
        expect(details.length).toBeGreaterThan(0);
        expect(details.at(-1).error).toBe(boom);
        expect(details.at(-1).value).toEqual(['a']);
        expect(twins.at(-1)).toBe(details.at(-1));

        // A working callback recovers on the next format.
        const count = details.length;
        el.getValueFormatCallback = (ctx: any) => ctx.selectedValues.join('+');
        await el.whenSettled();
        el.value = '["a","b"]';
        expect(el.value).toBe('a+b');
        expect(hidden().map((i) => `${i.name}=${i.value}`)).toEqual(['f=a+b']);
        expect(details.length).toBe(count);
    });

    it('setter is silent (no change event)', async () => {
        await make({});
        let changes = 0;
        el.addEventListener('change', () => changes++);
        el.value = '["a"]';
        expect(el.selectedValue).toEqual(['a']);
        expect(changes).toBe(0);
    });

    it('assigned before the build: returned in the submitted form and applied on the first build', async () => {
        el = document.createElement('web-multiselect');
        el.setAttribute('value-format', 'text');
        el.value = 'b,c';
        expect(el.value).toBe('b,c');
        el.options = OPTIONS;
        document.body.appendChild(el);
        await el.whenSettled();
        expect(el.selectedValue).toEqual(['b', 'c']);
        expect(el.value).toBe('b,c');
    });
});

describe('el.options — live after the build (core getLiveValue)', () => {
    let el: any;
    afterEach(() => { el?.remove(); el = undefined; });

    it('returns the assigned array before the build, the live list after', async () => {
        el = document.createElement('web-multiselect');
        const opts = [{ value: 'a', label: 'A' }];
        el.options = opts;
        expect(el.options).toBe(opts);
        document.body.appendChild(el);
        await el.whenSettled();
        expect(el.options).toEqual(opts);
        expect(el.options).toBe(el.controller.options);
    });

    it('reflects options fed by data-options (not the property)', async () => {
        el = document.createElement('web-multiselect');
        el.setAttribute('data-options', '[{"value":"x","label":"X"}]');
        document.body.appendChild(el);
        await el.whenSettled();
        expect(el.options.map((o: any) => o.value)).toEqual(['x']);
    });

    it('a pending write is returned until it lands', async () => {
        el = document.createElement('web-multiselect');
        el.options = [{ value: 'a', label: 'A' }];
        document.body.appendChild(el);
        await el.whenSettled();
        const next = [{ value: 'b', label: 'B' }];
        el.options = next;
        expect(el.options).toBe(next);
        await el.whenSettled();
        expect(el.options.map((o: any) => o.value)).toEqual(['b']);
    });
});
