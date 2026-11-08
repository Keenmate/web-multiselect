import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../src/index'; // registers <web-multiselect> (core registerComponent)

/**
 * Tree mode + externalized search (`searchCallback`). The consumer's callback
 * returns the matching options (from their own index/engine); the component must
 * rebuild the visible tree from those matches, KEEPING their ancestors so the
 * hierarchy stays coherent — the async-search analogue of the local
 * matches-plus-ancestors behaviour.
 */

const TREE = [
    { value: 'fruit', label: 'Fruit', path: '1' },
    { value: 'apple', label: 'Apple', path: '1.1' },
    { value: 'gala', label: 'Gala', path: '1.1.1' },
    { value: 'pear', label: 'Pear', path: '1.2' },
    { value: 'veg', label: 'Veg', path: '2' },
    { value: 'carrot', label: 'Carrot', path: '2.1' }
];

let el: any;

function rows(): HTMLElement[] {
    return Array.from(el.shadowRoot.querySelectorAll('.ms__option')) as HTMLElement[];
}
function input(): HTMLInputElement {
    return el.shadowRoot.querySelector('.ms__input') as HTMLInputElement;
}
async function type(value: string) {
    input().value = value;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    // let the async searchCallback + render settle
    await new Promise(r => setTimeout(r, 0));
    await Promise.resolve();
}

beforeEach(() => {
    el = document.createElement('web-multiselect');
    el.setAttribute('value-member', 'value');
    el.setAttribute('display-value-member', 'label');
    el.setAttribute('path-member', 'path');
    document.body.appendChild(el);
    el.options = TREE;
    // Externalized search: return matches by value from a trivial "index".
    el.searchCallback = async ({ term }: { term: string }) => {
        const t = term.toLowerCase();
        return TREE.filter(o => o.label.toLowerCase().includes(t));
    };
});

afterEach(() => el.remove());

describe('tree mode — external searchCallback', () => {
    it('rebuilds the tree from returned matches, keeping ancestors', async () => {
        await type('gala');
        // "gala" (1.1.1) → its ancestors 1 and 1.1 must appear, in tree order.
        expect(rows().map(r => r.dataset.path)).toEqual(['1', '1.1', '1.1.1']);
    });

    it('handles matches in two branches with each ancestry preserved', async () => {
        // Match both a fruit leaf and a veg leaf.
        el.searchCallback = async () => [TREE[2], TREE[5]]; // gala (1.1.1), carrot (2.1)
        await el.whenSettled(); // apply the reassigned callback before searching
        await type('x');
        expect(rows().map(r => r.dataset.path)).toEqual(['1', '1.1', '1.1.1', '2', '2.1']);
    });

    it('renders nothing when the callback returns no matches', async () => {
        el.searchCallback = async () => [];
        await el.whenSettled(); // apply the reassigned callback before searching
        await type('zzz');
        expect(rows().length).toBe(0);
    });

    it('restores the full tree when the search is cleared', async () => {
        await type('gala');
        expect(rows().length).toBe(3);
        await type('');
        expect(rows().map(r => r.dataset.path)).toEqual(['1', '1.1', '1.1.1', '1.2', '2', '2.1']);
    });
});
