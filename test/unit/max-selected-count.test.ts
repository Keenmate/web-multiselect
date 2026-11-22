import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiSelectEngine } from '../../src/multiselect';
import type { MultiSelectConfig } from '../../src/types';

/**
 * `maxSelectedCount` — a limit on the USER's picks (multiple mode). Exercised on the standalone
 * engine through its controller (the gesture funnels), so no dropdown is opened.
 */

const ITEMS = ['a', 'b', 'c', 'd', 'e', 'f'].map(v => ({ value: v, label: v.toUpperCase() }));
const BASE: Partial<MultiSelectConfig<any>> = { valueMember: 'value', displayValueMember: 'label', options: ITEMS, isMultiple: true };

let host: HTMLDivElement;
let engine: MultiSelectEngine<any> | undefined;

function make(opts: Partial<MultiSelectConfig<any>> = {}): HTMLInputElement {
    engine = new MultiSelectEngine(host, { ...BASE, ...opts });
    return host.querySelector('.ms__input') as HTMLInputElement;
}
const selected = () => engine!.selectedOptions.map((o: any) => o.value);
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
});
afterEach(() => {
    engine?.destroy();
    engine = undefined;
    host.remove();
    document.querySelectorAll('[data-km-announcer]').forEach(r => r.remove());
});

describe('maxSelectedCount — user picks', () => {
    it('blocks a pick past the limit; deselecting frees a slot', () => {
        make({ maxSelectedCount: 2 });
        const c = engine!.getController();
        c.selectValue('a');
        c.selectValue('b');
        c.selectValue('c');
        expect(selected()).toEqual(['a', 'b']);
        c.toggleValue('d');
        expect(selected()).toEqual(['a', 'b']);
        c.deselectValue('a');
        c.selectValue('c');
        expect(selected()).toEqual(['b', 'c']);
    });

    it('select-all picks only up to the limit, in display order', () => {
        make({ maxSelectedCount: 3 });
        const c = engine!.getController();
        c.selectValue('e');
        c.selectAll();
        expect(selected()).toEqual(['e', 'a', 'b']);
    });

    it('single mode ignores it', () => {
        make({ isMultiple: false, maxSelectedCount: 1 });
        const c = engine!.getController();
        c.selectValue('a');
        c.selectValue('b');
        expect(selected()).toEqual(['b']);
    });

    it('a programmatic value is not truncated; a lowered limit keeps the selection and blocks adding', () => {
        make({ maxSelectedCount: 2 });
        engine!.setSelected(['a', 'b', 'c', 'd']);
        expect(selected()).toEqual(['a', 'b', 'c', 'd']);
        engine!.getController().selectValue('e');
        expect(selected()).toEqual(['a', 'b', 'c', 'd']);
        engine!.updateOptions({ maxSelectedCount: null });
        engine!.getController().selectValue('e');
        expect(selected()).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('announces messages.limitReached once, when a pick reaches the limit', async () => {
        make({ maxSelectedCount: 2, labels: { 'messages.limitReached': 'Max {ctx.max} (count {ctx.count})' } });
        const c = engine!.getController();
        c.selectValue('a');
        await wait(70);
        expect(document.querySelector('[data-km-announcer="polite"]')?.textContent ?? '').toBe('');
        c.selectValue('b');
        await wait(70);
        expect(document.querySelector('[data-km-announcer="polite"]')!.textContent).toBe('Max 2 (count 2)');
    });
});

describe('maxSelectedCount — PlaceholderContext', () => {
    it('{ctx.remaining} counts down live; count = remaining', () => {
        const input = make({ maxSelectedCount: 5, labels: { 'placeholders.search': 'Select up to {ctx.remaining} more ({ctx.count}/{ctx.maxSelectedCount})' } });
        expect(input.placeholder).toBe('Select up to 5 more (5/5)');
        engine!.getController().selectValue('a');
        engine!.getController().selectValue('b');
        expect(input.placeholder).toBe('Select up to 3 more (3/5)');
        engine!.getController().deselectValue('a');
        expect(input.placeholder).toBe('Select up to 4 more (4/5)');
    });

    it('no limit → maxSelectedCount / remaining null, count = selectedCount', () => {
        const seen: any[] = [];
        make({
            translateCallback: ({ key, params }: any) => {
                if (key === 'web-multiselect.placeholders.search') seen.push(params.ctx);
                return null;
            },
        });
        expect(seen.at(-1)).toMatchObject({ maxSelectedCount: null, remaining: null, count: 0 });
    });

    it('translateCallback sees remaining 0 at the limit', () => {
        const input = make({
            maxSelectedCount: 1,
            translateCallback: ({ key, params }: any) =>
                key === 'web-multiselect.placeholders.search' && params.ctx.remaining === 0 ? 'Full' : null,
        });
        expect(input.placeholder).toBe('Search…');
        engine!.getController().selectValue('a');
        expect(input.placeholder).toBe('Full');
    });
});

describe('maxSelectedCount — tree cascade (counts the emitted values)', () => {
    const ROWS = [
        { value: '1', label: 'Fruit', path: '1' },
        { value: '1.1', label: 'Pome', path: '1.1' },
        { value: '1.1.1', label: 'Apple', path: '1.1.1' },
        { value: '1.1.2', label: 'Pear', path: '1.1.2' },
        { value: '1.2', label: 'Citrus', path: '1.2' },
        { value: '1.2.1', label: 'Orange', path: '1.2.1' },
        { value: '1.2.2', label: 'Lemon', path: '1.2.2' },
    ];
    const TREE: Partial<MultiSelectConfig<any>> = { options: ROWS, pathMember: 'path', cascadeSelectPolicy: 'leaves' };

    it('blocks a node toggle whose projection would pass the limit', () => {
        make({ ...TREE, maxSelectedCount: 2 });
        const c = engine!.getController();
        c.toggleValue('1.1');
        expect(selected().sort()).toEqual(['1.1.1', '1.1.2']);
        c.toggleValue('1.2.1');
        expect(selected().sort()).toEqual(['1.1.1', '1.1.2']);
    });

    it('select-all stops at the limit in display order', () => {
        make({ ...TREE, maxSelectedCount: 3 });
        engine!.getController().selectAll();
        // Display order sorts by label: Citrus (Lemon, Orange), Pome (Apple, Pear).
        expect(selected().sort()).toEqual(['1.1.1', '1.2.1', '1.2.2']);
    });
});

describe('minSelectedCount / maxSelectedCount — tree cascade: the count follows cascadeSelectPolicy', () => {
    const ROWS = [
        { value: '1', label: 'Fruit', path: '1' },
        { value: '1.1', label: 'Pome', path: '1.1' },
        { value: '1.1.1', label: 'Apple', path: '1.1.1' },
        { value: '1.1.2', label: 'Pear', path: '1.1.2' },
        { value: '1.2', label: 'Citrus', path: '1.2' },
        { value: '1.2.1', label: 'Orange', path: '1.2.1' },
        { value: '1.2.2', label: 'Lemon', path: '1.2.2' },
    ];
    const TREE: Partial<MultiSelectConfig<any>> = { options: ROWS, pathMember: 'path' };
    const validity = () => engine!.getCountValidity();

    it('rolled-up (default): a fully checked branch is ONE value — Fruit alone is under a minimum of 2', () => {
        make({ ...TREE, minSelectedCount: 2 });
        engine!.getController().toggleValue('1');
        expect(selected()).toEqual(['1']);
        expect(validity().rangeUnderflow).not.toBeNull();
    });

    it('leaves: the same click is 4 values — the minimum of 2 is met', () => {
        make({ ...TREE, cascadeSelectPolicy: 'leaves', minSelectedCount: 2 });
        engine!.getController().toggleValue('1');
        expect(selected().length).toBe(4);
        expect(validity().rangeUnderflow).toBeNull();
    });

    it('leaves: one leaf under a minimum of 3 is rangeUnderflow; a second branch meets it', () => {
        make({ ...TREE, cascadeSelectPolicy: 'leaves', minSelectedCount: 3 });
        const c = engine!.getController();
        c.toggleValue('1.1.1');
        expect(validity().rangeUnderflow).not.toBeNull();
        c.toggleValue('1.2');
        expect(selected().length).toBe(3);
        expect(validity().rangeUnderflow).toBeNull();
    });

    it('all: every fully checked node — the same click is 7 values', () => {
        make({ ...TREE, cascadeSelectPolicy: 'all', maxSelectedCount: 6 });
        engine!.getController().toggleValue('1');
        expect(selected()).toEqual([]);   // 7 > 6: blocked as a whole
    });

    it('rolled-up: max 1 still lets the user check the whole tree (one emitted value)', () => {
        make({ ...TREE, maxSelectedCount: 1 });
        engine!.getController().toggleValue('1');
        expect(selected()).toEqual(['1']);
        expect(validity().rangeOverflow).toBeNull();
    });
});
