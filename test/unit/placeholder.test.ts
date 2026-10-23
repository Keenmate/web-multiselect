import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiSelectEngine } from '../../src/multiselect';
import type { MultiSelectConfig } from '../../src/types';

/**
 * Unit tests for input placeholder resolution (getPlaceholderText):
 *   - searchPlaceholder        when search is usable
 *   - selectPlaceholder        when search is disabled / readonly / hidden
 *   - noDataPlaceholder        when the option list is empty (opt-in, highest priority)
 *
 * Exercised against the core MultiSelectEngine class on a plain <div> so no dropdown
 * is ever opened (Floating UI / positioning stay out of the way).
 */

const ITEMS = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' }
];

const BASE: Partial<MultiSelectConfig<any>> = {
    valueMember: 'value',
    displayValueMember: 'label'
};

let host: HTMLDivElement;
let instance: MultiSelectEngine<any> | undefined;

function make(opts: Partial<MultiSelectConfig<any>> = {}): HTMLInputElement {
    instance = new MultiSelectEngine(host, { ...BASE, ...opts });
    return host.querySelector('.ms__input') as HTMLInputElement;
}

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
});

afterEach(() => {
    instance?.destroy();
    instance = undefined;
    host.remove();
});

describe('placeholder — search usable', () => {
    it('defaults to "Search..." when search is enabled and options exist', () => {
        const input = make({ options: ITEMS });
        expect(input.placeholder).toBe('Search...');
    });

    it('honours a custom searchPlaceholder', () => {
        const input = make({ options: ITEMS, searchPlaceholder: 'Type to filter…' });
        expect(input.placeholder).toBe('Type to filter…');
    });
});

describe('placeholder — search disabled', () => {
    it('uses the default selectPlaceholder when enableSearch is false', () => {
        const input = make({ options: ITEMS, isSearchEnabled: false });
        expect(input.placeholder).toBe('Pick an option...');
    });

    it('uses selectPlaceholder when searchInputMode is "readonly"', () => {
        const input = make({ options: ITEMS, searchInputMode: 'readonly' });
        expect(input.placeholder).toBe('Pick an option...');
    });

    it('uses selectPlaceholder when searchInputMode is "hidden"', () => {
        const input = make({ options: ITEMS, searchInputMode: 'hidden' });
        expect(input.placeholder).toBe('Pick an option...');
    });

    it('honours a custom selectPlaceholder', () => {
        const input = make({ options: ITEMS, isSearchEnabled: false, selectPlaceholder: 'Choose one' });
        expect(input.placeholder).toBe('Choose one');
    });
});

describe('placeholder — no data', () => {
    it('shows noDataPlaceholder when the list is empty', () => {
        const input = make({ options: [], noDataPlaceholder: 'No data' });
        expect(input.placeholder).toBe('No data');
    });

    it('is opt-in: empty list without noDataPlaceholder keeps the search placeholder', () => {
        const input = make({ options: [] });
        expect(input.placeholder).toBe('Search...');
    });

    it('does not apply once options are present', () => {
        const input = make({ options: ITEMS, noDataPlaceholder: 'No data' });
        expect(input.placeholder).toBe('Search...');
    });

    it('takes priority over the select placeholder when search is also disabled', () => {
        const input = make({ options: [], isSearchEnabled: false, noDataPlaceholder: 'No data' });
        expect(input.placeholder).toBe('No data');
    });
});

describe('placeholder — live updates (cascade / i18n)', () => {
    it('reflects a changed searchPlaceholder via updateOptions', () => {
        const input = make({ options: ITEMS });
        instance!.updateOptions({ searchPlaceholder: 'Buscar…' });
        expect(input.placeholder).toBe('Buscar…');
    });

    it('switches to noDataPlaceholder when options are emptied (cascade clear)', () => {
        const input = make({ options: ITEMS, noDataPlaceholder: 'No data' });
        expect(input.placeholder).toBe('Search...');
        instance!.updateOptions({ options: [] });
        expect(input.placeholder).toBe('No data');
    });

    it('returns to the search placeholder when options are repopulated', () => {
        const input = make({ options: [], noDataPlaceholder: 'No data' });
        expect(input.placeholder).toBe('No data');
        instance!.updateOptions({ options: ITEMS });
        expect(input.placeholder).toBe('Search...');
    });
});
