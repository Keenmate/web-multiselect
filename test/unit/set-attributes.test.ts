import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>
import { MultiSelectEngine } from '../../src/multiselect';

/**
 * Unit tests for the core batching API on <web-multiselect> (v2, on BlissElement).
 *
 * Two entry points, both coalescing a group of changes into a SINGLE
 * reinit()/update() (one picker rebuild or one picker.updateOptions), flushed
 * synchronously:
 *   - `setAttributes({ configKey: typedValue })` — typed PROPERTY values by
 *     configKey (the batched analogue of a property assignment). Does NOT write
 *     attributes unless the input reflects.
 *   - `batch(() => { el.setAttribute(…); … })` — attribute STRINGS, parsed via
 *     each converter's fromAttribute, coalesced into one update.
 *
 * (Breaking vs v1: the old `setAttributes({ 'kebab-attr': 'string' })` that wrote
 * attributes is gone — use `batch()` for attribute strings.)
 */

const ITEMS = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' }
];

let el: any;

function input(): HTMLInputElement {
    return el.shadowRoot.querySelector('.ms__input') as HTMLInputElement;
}

beforeEach(() => {
    el = document.createElement('web-multiselect');
    el.setAttribute('value-member', 'value');
    el.setAttribute('display-value-member', 'label');
    document.body.appendChild(el);
    el.options = ITEMS;
});

afterEach(() => {
    el.remove();
    vi.restoreAllMocks();
});

describe('setAttributes — typed property batch', () => {
    it('applies a multi-key set as a single picker.updateOptions call', async () => {
        await el.whenSettled(); // let the initial options reinit settle first
        const spy = vi.spyOn(MultiSelectEngine.prototype, 'updateOptions');
        el.setAttributes({
            maxHeight: '15rem',
            badgeTooltipDelay: 50,
            searchDebounce: 20
        });
        // setAttributes flushes synchronously → exactly one coalesced update.
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toMatchObject({
            maxHeight: '15rem',
            badgeTooltipDelay: 50,
            searchDebounce: 20
        });
    });

    it('applies the change so the live placeholder updates (i18n switch via labels)', () => {
        el.setAttributes({ labels: { searchPlaceholder: 'Buscar…' } });
        expect(input().placeholder).toBe('Buscar…');
    });

    it('reflects only inputs marked reflect:true (members), not plain ones', () => {
        el.setAttributes({ valueMember: 'id', searchDebounce: 5 });
        // valueMember reflects; searchDebounce does not.
        expect(el.getAttribute('value-member')).toBe('id');
        expect(el.hasAttribute('search-debounce')).toBe(false);
    });
});

describe('batch — attribute-string coalescing', () => {
    it('writes attribute strings and applies them in one flush', () => {
        el.batch(() => {
            el.setAttribute('labels', '{"searchPlaceholder":"Search…","selectPlaceholder":"Pick…"}');
            el.setAttribute('max-height', '15rem');
        });
        expect(el.getAttribute('max-height')).toBe('15rem');
        expect(input().placeholder).toBe('Search…');
    });

    it('resets an input to its default when its attribute is removed', () => {
        el.setAttribute('labels', '{"searchPlaceholder":"Search…"}');
        el.batch(() => el.removeAttribute('labels'));
        // Absent attribute == the converter default.
        expect(input().placeholder).toBe('Search…');
    });

    it('coalesces an emptied search + select placeholder together', () => {
        el.batch(() => {
            el.setAttribute('enable-search', 'false');
            el.setAttribute('labels', '{"selectPlaceholder":"Choose"}');
        });
        expect(input().placeholder).toBe('Choose');
    });
});
