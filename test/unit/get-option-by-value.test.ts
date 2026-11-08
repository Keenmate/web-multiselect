import { describe, it, expect, afterEach } from 'vitest';
import '../../src/index'; // registers <web-multiselect> (core registerComponent)

/** L6 lookup: `getOptionByValue(value) → option | null` on the element and the controller. */
describe('getOptionByValue', () => {
    let el: any;
    afterEach(() => { el?.remove(); el = undefined; });

    const OPTIONS = [{ value: 'a', label: 'A' }, { value: 1, label: 'One' }];

    it('finds by value (string comparison) on element and controller; null when missing', async () => {
        el = document.createElement('web-multiselect');
        el.options = OPTIONS;
        document.body.appendChild(el);
        await el.whenSettled();
        expect(el.getOptionByValue('a')).toBe(OPTIONS[0]);
        expect(el.getOptionByValue('1')).toBe(OPTIONS[1]);
        expect(el.controller.getOptionByValue(1)).toBe(OPTIONS[1]);
        expect(el.getOptionByValue('zzz')).toBeNull();
        expect(el.controller.getOptionByValue('zzz')).toBeNull();
    });

    it('returns null before the first build', () => {
        el = document.createElement('web-multiselect');
        expect(el.getOptionByValue('a')).toBeNull();
    });
});
