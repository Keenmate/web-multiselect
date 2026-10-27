import { describe, it, expect, afterEach } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Element-level wiring for the `data-options` / `data-options-format` inputs.
 *
 * `data-options` is an HTML-authoring source (parallel to declarative <option>
 * children), parsed per `data-options-format` (json | csv | plain) into the
 * picker's option list. Both attributes are reactive inputs, so changing EITHER
 * re-renders. Precedence: <option> children > `.options` property > data-options.
 *
 * Parser correctness lives in option-formats.test.ts; here we assert the wiring:
 * options-presence via the input placeholder (present -> "Search..."; empty +
 * a no-data-placeholder -> that text), and a select round-trip for content.
 */

let el: any;

function make(attrs: Record<string, string>): any {
    el = document.createElement('web-multiselect');
    el.setAttribute('value-member', 'value');
    el.setAttribute('display-value-member', 'label');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el;
}

function placeholder(): string {
    return (el.shadowRoot.querySelector('.ms__input') as HTMLInputElement).placeholder;
}

afterEach(() => {
    el?.remove();
    el = undefined;
});

describe('data-options — json (default format)', () => {
    it('renders options from a JSON array set before connect', async () => {
        make({ 'data-options': '[{"value":"js","label":"JavaScript"}]', 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(placeholder()).toBe('Search...'); // options present
        el.setSelected(['js']);
        expect(el.selectedValue).toEqual(['js']);
        expect(el.selectedOptions[0].label).toBe('JavaScript');
    });

    it('falls back to an empty list (no throw) on invalid JSON', async () => {
        make({ 'data-options': '{not valid json', 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(placeholder()).toBe('Empty');
    });
});

describe('data-options — csv (first row header)', () => {
    it('parses the header row into objects rendered as options', async () => {
        make({ 'data-options': 'value,label\njs,JavaScript\nts,TypeScript', 'data-options-format': 'csv' });
        await el.whenSettled();
        expect(placeholder()).toBe('Search...');
        el.setSelected(['ts']);
        expect(el.selectedOptions[0].label).toBe('TypeScript');
    });
});

describe('data-options — custom delimiters', () => {
    it('csv honours data-options-splitter (semicolon) and data-options-row-splitter', async () => {
        make({
            'data-options': 'value;label|js;JavaScript|ts;TypeScript',
            'data-options-format': 'csv',
            'data-options-splitter': ';',
            'data-options-row-splitter': '|',
        });
        await el.whenSettled();
        expect(placeholder()).toBe('Search...');
        el.setSelected(['ts']);
        expect(el.selectedOptions[0].label).toBe('TypeScript');
    });

    it('plain honours a pipe data-options-splitter', async () => {
        make({ 'data-options': 'apple|banana', 'data-options-format': 'plain', 'data-options-splitter': '|', 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(placeholder()).toBe('Search...');
        el.setSelected(['banana']);
        expect(el.selectedValue).toEqual(['banana']);
    });
});

describe('data-options — plain', () => {
    it('parses comma/newline bare values into selectable value=label options', async () => {
        make({ 'data-options': 'apple,banana,cherry', 'data-options-format': 'plain', 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(placeholder()).toBe('Search...');
        el.setSelected(['banana']);
        expect(el.selectedValue).toEqual(['banana']);
    });
});

describe('data-options — reactivity', () => {
    it('re-renders when data-options changes', async () => {
        make({ 'data-options': '[{"value":"a","label":"A"},{"value":"b","label":"B"}]', 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(placeholder()).toBe('Search...');
        el.setAttribute('data-options', '[]');
        await el.whenSettled();
        expect(placeholder()).toBe('Empty'); // reactively emptied
    });

    it('re-parses when ONLY data-options-format changes (same data-options)', async () => {
        // "apple,banana" is invalid JSON (the default format) -> empty list.
        make({ 'data-options': 'apple,banana', 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        expect(placeholder()).toBe('Empty');
        // Switch the format only; the same attribute now parses as plain.
        el.setAttribute('data-options-format', 'plain');
        await el.whenSettled();
        expect(placeholder()).toBe('Search...');
    });

    it('resets to empty when the attribute is removed', async () => {
        make({ 'data-options': '[{"value":"a","label":"A"}]', 'no-data-placeholder': 'Empty' });
        await el.whenSettled();
        el.removeAttribute('data-options');
        await el.whenSettled();
        expect(placeholder()).toBe('Empty');
    });

    it('a direct .options property assignment wins over the attribute', async () => {
        make({ 'data-options': '[{"value":"a","label":"A"},{"value":"b","label":"B"}]' });
        await el.whenSettled();
        el.options = [{ value: 'x', label: 'X' }];
        await el.whenSettled();
        expect(el.options).toHaveLength(1);
        el.setSelected(['x']);
        expect(el.selectedValue).toEqual(['x']);
    });
});
