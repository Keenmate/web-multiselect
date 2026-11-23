import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiSelectEngine } from '../../src/multiselect';
import { createLTree } from '../../src/tree/ltree';
import { ENGINE_DEFAULTS } from './engine-defaults';
import type { MultiSelectConfig } from '../../src/types';

/**
 * Text sorting goes through core `getCollator(locale, { numeric: true })` (G33): the `locale`
 * input decides the collation (Czech sorts "ch" after "h"), numbers inside text sort numerically.
 */

let host: HTMLDivElement;
let instance: MultiSelectEngine<any> | undefined;

function orderedLabels(opts: Partial<MultiSelectConfig<any>>, labels: string[]): string[] {
    instance = new MultiSelectEngine(host, {
        ...ENGINE_DEFAULTS, valueMember: 'value', displayValueMember: 'label',
        options: labels.map((label) => ({ value: label, label })),
        initialSelection: labels, selectedOrder: 'label-asc', ...opts,
    });
    return (instance as any).getOrderedSelectedOptions().map((o: any) => o.label);
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

describe('selectedOrder label sort uses the locale collation', () => {
    it('cs-CZ sorts "ch" after "h"', () => {
        expect(orderedLabels({ locale: 'cs-CZ' }, ['chata', 'hrad'])).toEqual(['hrad', 'chata']);
    });

    it('en-US sorts "ch" before "h"', () => {
        expect(orderedLabels({ locale: 'en-US' }, ['hrad', 'chata'])).toEqual(['chata', 'hrad']);
    });

    it('is numeric-aware ("item 2" before "item 10")', () => {
        expect(orderedLabels({ locale: 'en-US' }, ['item 10', 'item 2'])).toEqual(['item 2', 'item 10']);
    });
});

describe('ltree takes the comparer passed in', () => {
    it('sorts siblings by display value with the given compare', () => {
        const items = [{ id: 'c', path: 'c', label: 'chata' }, { id: 'h', path: 'h', label: 'hrad' }];
        const tree = createLTree<any>({
            idMember: 'id', pathMember: 'path',
            getDisplayValueCallback: (n) => n.data.label,
            compare: new Intl.Collator('cs-CZ', { numeric: true }).compare,
        });
        tree.insertArray(items);
        expect(tree.flatNodes.map((n) => n.data.label)).toEqual(['hrad', 'chata']);
    });
});
