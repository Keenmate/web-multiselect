import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiSelectEngine } from '../../src/multiselect';
import { ENGINE_DEFAULTS } from './engine-defaults';
import type { MultiSelectConfig } from '../../src/types';

/**
 * Unit tests for input placeholder resolution (getPlaceholderText):
 *   - labels["placeholders.search"]  when search is usable
 *   - labels["placeholders.select"]  when search is disabled
 *   - labels["placeholders.noData"]             when the option list is empty (opt-in, highest priority)
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
    instance = new MultiSelectEngine(host, { ...ENGINE_DEFAULTS, ...BASE, ...opts });
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
    it('defaults to "Search…" when search is enabled and options exist', () => {
        const input = make({ options: ITEMS });
        expect(input.placeholder).toBe('Search…');
    });

    it('honours a custom labels["placeholders.search"]', () => {
        const input = make({ options: ITEMS, labels: { 'placeholders.search': 'Type to filter…' } });
        expect(input.placeholder).toBe('Type to filter…');
    });
});

describe('placeholder — search disabled', () => {
    it('uses the default placeholders.select when enableSearch is false', () => {
        const input = make({ options: ITEMS, isSearchEnabled: false });
        expect(input.placeholder).toBe('Pick an option…');
    });

    it('honours a custom labels["placeholders.select"]', () => {
        const input = make({ options: ITEMS, isSearchEnabled: false, labels: { 'placeholders.select': 'Choose one' } });
        expect(input.placeholder).toBe('Choose one');
    });
});

describe('placeholder — no data', () => {
    it('shows labels["placeholders.noData"] when the list is empty', () => {
        const input = make({ options: [], labels: { 'placeholders.noData': 'No data' } });
        expect(input.placeholder).toBe('No data');
    });

    it('is opt-in: empty list without labels["placeholders.noData"] keeps the search placeholder', () => {
        const input = make({ options: [] });
        expect(input.placeholder).toBe('Search…');
    });

    it('does not apply once options are present', () => {
        const input = make({ options: ITEMS, labels: { 'placeholders.noData': 'No data' } });
        expect(input.placeholder).toBe('Search…');
    });

    it('takes priority over the select placeholder when search is also disabled', () => {
        const input = make({ options: [], isSearchEnabled: false, labels: { 'placeholders.noData': 'No data' } });
        expect(input.placeholder).toBe('No data');
    });

    it("an empty-string placeholders.select is deliberately empty (no fallback to the search text)", () => {
        const input = make({ options: ITEMS, isSearchEnabled: false, labels: { 'placeholders.select': '' } });
        expect(input.placeholder).toBe('');
    });
});

describe('placeholder — live updates (cascade / i18n)', () => {
    it('a labels change applies in place (no rebuild): same input, new placeholder', () => {
        const input = make({ options: ITEMS });
        expect(instance!.updateOptions({ labels: { 'placeholders.search': 'Buscar…' } })).toBe(true);
        expect(host.querySelector('.ms__input')).toBe(input);
        expect(input.placeholder).toBe('Buscar…');
    });

    it('a labels change creates / removes the search hint in place', () => {
        make({ options: ITEMS });
        const hint = () => document.querySelector('.ms__hint');
        expect(hint()).toBeNull(); // the default hint is empty
        instance!.updateOptions({ labels: { 'labels.searchHint': 'Type to filter' } });
        expect(hint()?.textContent).toBe('Type to filter');
        instance!.updateOptions({ labels: { 'labels.searchHint': '' } });
        expect(hint()).toBeNull();
    });

    it('switches to labels["placeholders.noData"] when options are emptied (cascade clear)', () => {
        const input = make({ options: ITEMS, labels: { 'placeholders.noData': 'No data' } });
        expect(input.placeholder).toBe('Search…');
        instance!.updateOptions({ options: [] });
        expect(input.placeholder).toBe('No data');
    });

    it('returns to the search placeholder when options are repopulated', () => {
        const input = make({ options: [], labels: { 'placeholders.noData': 'No data' } });
        expect(input.placeholder).toBe('No data');
        instance!.updateOptions({ options: ITEMS });
        expect(input.placeholder).toBe('Search…');
    });
});

describe('placeholder — key by mode + {ctx.*} (PlaceholderContext)', () => {
    it('toggle shown → placeholders.filter / .navigate by mode, even with an instance placeholders.search', () => {
        const input = make({ options: ITEMS, isSearchModeToggleShown: true, labels: { 'placeholders.search': 'Pinned' } });
        expect(input.placeholder).toBe('Filter…');
        instance!.destroy();
        const nav = make({ options: ITEMS, isSearchModeToggleShown: true, searchMode: 'navigate', labels: { 'placeholders.navigate': 'Jump to…' } });
        expect(nav.placeholder).toBe('Jump to…');
    });

    it('templates read the placeholder context (count = selection count)', () => {
        const input = make({
            options: ITEMS, isMultiple: true,
            labels: { 'placeholders.search': '{ctx.key}: {ctx.count}/{ctx.totalCount} ({ctx.searchMode}, open={ctx.isOpen})' },
        });
        expect(input.placeholder).toBe('placeholders.search: 0/2 (filter, open=false)');
        instance!.setSelected(['apple']);
        expect(input.placeholder).toBe('placeholders.search: 1/2 (filter, open=false)');
    });

    it('translateCallback gets the context raw as params.ctx', () => {
        const seen: any[] = [];
        const input = make({
            options: ITEMS, isSearchEnabled: false,
            translateCallback: ({ key, params }: any) => {
                if (key !== 'web-multiselect.placeholders.select') return null;
                seen.push(params.ctx);
                return `Vyberte (${params.ctx.count})`;
            },
        });
        expect(input.placeholder).toBe('Vyberte (0)');
        expect(seen[0]).toMatchObject({ key: 'placeholders.select', selectedCount: 0, totalCount: 2, count: 0, isOpen: false });
    });
});
