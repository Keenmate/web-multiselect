import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Unit tests for flat-group cascade selection (group-select-mode="cascade"):
 * a group header carries a tristate checkbox that toggles all its members, and
 * the group name is never itself a selected value.
 */

const ITEMS = [
    { value: 'a1', label: 'Apple', group: 'Fruits' },
    { value: 'a2', label: 'Banana', group: 'Fruits' },
    { value: 'a3', label: 'Cherry', group: 'Fruits' },
    { value: 'v1', label: 'Carrot', group: 'Vegetables' }
];

let el: any;
const sr = () => el.shadowRoot;
const groupLabel = (name: string) =>
    sr().querySelector(`.ms__group-label[data-group="${name}"]`) as HTMLElement | null;
const groupBox = (name: string) =>
    sr().querySelector(`.ms__group-label[data-group="${name}"] .ms__checkbox`) as HTMLInputElement | null;
const optContent = (value: string) =>
    sr().querySelector(`.ms__option[data-value="${value}"] .ms__option-content`) as HTMLElement;

beforeEach(() => {
    el = document.createElement('web-multiselect');
    el.setAttribute('value-member', 'value');
    el.setAttribute('display-value-member', 'label');
    el.setAttribute('group-member', 'group');
    el.setAttribute('group-select-mode', 'cascade');
    document.body.appendChild(el);
    el.options = ITEMS;
});

afterEach(() => el.remove());

describe('flat-group cascade — group-select-mode="cascade"', () => {
    it('renders a tristate checkbox on each group header', () => {
        expect(groupBox('Fruits')).toBeTruthy();
        expect(groupBox('Vegetables')).toBeTruthy();
    });

    it('header state goes unchecked → indeterminate → checked as members are selected', () => {
        expect(groupBox('Fruits')!.checked).toBe(false);
        expect(groupBox('Fruits')!.classList.contains('ms__checkbox--indeterminate')).toBe(false);

        optContent('a1').click();
        expect(groupBox('Fruits')!.classList.contains('ms__checkbox--indeterminate')).toBe(true);

        optContent('a2').click();
        optContent('a3').click();
        expect(groupBox('Fruits')!.checked).toBe(true);
        expect(groupBox('Fruits')!.classList.contains('ms__checkbox--indeterminate')).toBe(false);
    });

    it('clicking the header selects all members; the group name is not emitted', () => {
        groupLabel('Fruits')!.click();
        expect((el.getValue() as string[]).sort()).toEqual(['a1', 'a2', 'a3']);
        // Vegetables untouched.
        expect(groupBox('Vegetables')!.checked).toBe(false);
    });

    it('clicking a fully-checked header clears the group', () => {
        groupLabel('Fruits')!.click();
        expect((el.getValue() as string[]).length).toBe(3);
        groupLabel('Fruits')!.click();
        expect(el.getValue()).toEqual([]);
    });
});

describe('flat-group cascade — guards', () => {
    // Build the element with the guard attributes set BEFORE connect so it renders
    // synchronously (same pattern as the top-level beforeEach), rather than mutating
    // an already-built element and awaiting an async update.
    function build(attrs: Record<string, string>) {
        el.remove();
        el = document.createElement('web-multiselect');
        el.setAttribute('value-member', 'value');
        el.setAttribute('display-value-member', 'label');
        el.setAttribute('group-member', 'group');
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        document.body.appendChild(el);
        el.options = ITEMS;
    }

    it('no header checkbox in single-select mode', () => {
        build({ 'group-select-mode': 'cascade', multiple: 'false' });
        expect(groupBox('Fruits')).toBeNull();
    });

    it('no header checkbox when group-select-mode="none"', () => {
        build({ 'group-select-mode': 'none' });
        expect(groupBox('Fruits')).toBeNull();
    });
});
