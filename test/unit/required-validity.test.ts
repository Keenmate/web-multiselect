import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiSelectEngine } from '../../src/multiselect';
import { ENGINE_DEFAULTS } from './engine-defaults';
import type { MultiSelectConfig } from '../../src/types';

/**
 * `required` / `minSelectedCount` / `maxSelectedCount` validity — the engine half: the messages and which
 * count rule fails (the element maps them onto core's validity flags; the real `validity` is covered by
 * the e2e `required-validity.spec.ts`, jsdom has no ElementInternals validity), plus the placeholder's
 * `{ctx.missing}` / `ctx.count`.
 */

const ITEMS = ['a', 'b', 'c', 'd', 'e', 'f'].map(v => ({ value: v, label: v.toUpperCase() }));
const BASE: Partial<MultiSelectConfig<any>> = { valueMember: 'value', displayValueMember: 'label', options: ITEMS, isMultiple: true };

let host: HTMLDivElement;
let engine: MultiSelectEngine<any> | undefined;

function make(opts: Partial<MultiSelectConfig<any>> = {}): HTMLInputElement {
    engine = new MultiSelectEngine(host, { ...ENGINE_DEFAULTS, ...BASE, ...opts });
    return host.querySelector('.ms__input') as HTMLInputElement;
}

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
});
afterEach(() => {
    engine?.destroy();
    engine = undefined;
    host.remove();
});

describe('count validity', () => {
    it('minSelectedCount: an empty selection is not checked; 1 … min−1 is rangeUnderflow; min clears it', () => {
        make({ minSelectedCount: 3 });
        expect(engine!.getCountValidity()).toEqual({ rangeUnderflow: null, rangeOverflow: null });
        engine!.setSelected(['a']);
        expect(engine!.getCountValidity()).toEqual({ rangeUnderflow: 'Select at least 3.', rangeOverflow: null });
        engine!.setSelected(['a', 'b', 'c']);
        expect(engine!.getCountValidity().rangeUnderflow).toBeNull();
    });

    it('maxSelectedCount: a programmatic value above the limit is rangeOverflow', () => {
        make({ maxSelectedCount: 2 });
        engine!.setSelected(['a', 'b']);
        expect(engine!.getCountValidity().rangeOverflow).toBeNull();
        engine!.setSelected(['a', 'b', 'c']);
        expect(engine!.getCountValidity()).toEqual({ rangeUnderflow: null, rangeOverflow: 'Select at most 2.' });
    });

    it('the messages read their ctx (min / missing / max / excess / count)', () => {
        make({
            minSelectedCount: 4,
            maxSelectedCount: 1,
            labels: {
                'errors.minSelected': '{ctx.missing} missing of {ctx.min} ({ctx.selectedCount}, n={ctx.count})',
                'errors.maxSelected': '{ctx.excess} too many over {ctx.max} ({ctx.selectedCount}, n={ctx.count})',
            },
        });
        engine!.setSelected(['a', 'b']);
        expect(engine!.getCountValidity()).toEqual({
            rangeUnderflow: '2 missing of 4 (2, n=4)',
            rangeOverflow: '1 too many over 1 (2, n=1)',
        });
    });

    it('single mode ignores both counts', () => {
        make({ isMultiple: false, minSelectedCount: 2, maxSelectedCount: 1 });
        engine!.setSelected(['a']);
        expect(engine!.getCountValidity()).toEqual({ rangeUnderflow: null, rangeOverflow: null });
    });

    it('errors.required: default and an instance label', () => {
        make();
        expect(engine!.getRequiredMessage()).toBe('Select an item.');
        engine!.destroy();
        make({ labels: { 'errors.required': 'Vyberte položku.' } });
        expect(engine!.getRequiredMessage()).toBe('Vyberte položku.');
    });

    it('the validity anchor is the control input', () => {
        const input = make();
        expect(engine!.getValidityAnchor()).toBe(input);
    });
});

describe('placeholder ctx — minSelectedCount', () => {
    it('{ctx.missing} counts down; ctx.count = missing while the minimum is not met, then remaining / selectedCount', () => {
        const input = make({
            minSelectedCount: 3,
            labels: { 'placeholders.search': 'min {ctx.minSelectedCount}, missing {ctx.missing}, n={ctx.count}' },
        });
        expect(input.placeholder).toBe('min 3, missing 3, n=3');
        engine!.setSelected(['a', 'b']);
        expect(input.placeholder).toBe('min 3, missing 1, n=1');
        engine!.setSelected(['a', 'b', 'c', 'd']);
        expect(input.placeholder).toBe('min 3, missing 0, n=4');
    });

    it('with a max too: missing first, then remaining', () => {
        const input = make({
            minSelectedCount: 2,
            maxSelectedCount: 5,
            labels: { 'placeholders.search': 'n={ctx.count}' },
        });
        engine!.setSelected(['a']);
        expect(input.placeholder).toBe('n=1');
        engine!.setSelected(['a', 'b']);
        expect(input.placeholder).toBe('n=3');
    });

    it('without a minimum: minSelectedCount / missing are null', () => {
        const input = make({ labels: { 'placeholders.search': '{ctx.minSelectedCount}|{ctx.missing}' } });
        expect(input.placeholder).toBe('|');
    });
});
