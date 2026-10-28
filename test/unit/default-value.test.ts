import { describe, it, expect, afterEach } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>
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

    it('csv: always comma-split (a JSON-looking value is not decoded)', () => {
        expect(parseDefaultValue('a,b,c', 'csv')).toEqual(['a', 'b', 'c']);
        expect(parseDefaultValue('[x]', 'csv')).toEqual(['[x]']);
    });

    it('arrays pass through; blank / nullish → empty', () => {
        expect(parseDefaultValue(['x', 1], 'csv')).toEqual(['x', 1]);
        expect(parseDefaultValue('  ', 'json')).toEqual([]);
        expect(parseDefaultValue(null, 'json')).toEqual([]);
    });
});

describe('<web-multiselect value> → initial selection', () => {
    let el: any;
    afterEach(() => { el?.remove(); el = undefined; });

    const OPTIONS = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }];

    it('value attribute (csv format) selects on first build; defaultValue property mirrors it', async () => {
        el = document.createElement('web-multiselect');
        el.setAttribute('value-format', 'csv');
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
