import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Unit tests for per-node selectability in tree mode
 * (`is-selectable-member` / `getIsSelectableCallback`).
 *
 * A non-selectable node is NOT the same as a disabled one: it renders normally
 * (no grey/`--disabled` styling) but carries no checkbox, is skipped by keyboard
 * focus, and cannot be toggled by click/Enter or picked by Select-All. The classic
 * use case is a leaves-only tree (`({ node }) => !node.hasChildren`), where branches
 * are pure structure.
 */

const TREE = [
    { value: 'fruit', label: 'Fruit', path: '1', selectable: false },
    { value: 'apple', label: 'Apple', path: '1.1', selectable: true },
    { value: 'gala',  label: 'Gala',  path: '1.1.1', selectable: true },
    { value: 'pear',  label: 'Pear',  path: '1.2', selectable: true },
    { value: 'veg',   label: 'Veg',   path: '2', selectable: false }
];

let el: any;

function rows(): HTMLElement[] {
    return Array.from(el.shadowRoot.querySelectorAll('.ms__option')) as HTMLElement[];
}
function rowByPath(path: string): HTMLElement {
    return rows().find(r => r.dataset.path === path)!;
}
function input(): HTMLInputElement {
    return el.shadowRoot.querySelector('.ms__input') as HTMLInputElement;
}
function arrowDown() {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
}

afterEach(() => el?.remove());

describe('tree selectability — via member', () => {
    beforeEach(() => {
        el = document.createElement('web-multiselect');
        el.setAttribute('value-member', 'value');
        el.setAttribute('display-value-member', 'label');
        el.setAttribute('path-member', 'path');
        el.setAttribute('is-selectable-member', 'selectable');
        el.setAttribute('multiple', 'true');
        el.setAttribute('show-checkboxes', 'true');
        document.body.appendChild(el);
        el.options = TREE;
    });

    it('marks non-selectable rows with the hook class and data attribute', () => {
        expect(rowByPath('1').classList.contains('ms__option--tree-unselectable')).toBe(true);
        expect(rowByPath('2').classList.contains('ms__option--tree-unselectable')).toBe(true);
        expect(rowByPath('1.1').classList.contains('ms__option--tree-unselectable')).toBe(false);
        expect(rowByPath('1').dataset.selectable).toBe('false');
    });

    it('does NOT grey them out (no disabled styling)', () => {
        expect(rowByPath('1').classList.contains('ms__option--disabled')).toBe(false);
    });

    it('drops the checkbox for non-selectable rows but keeps it for selectable ones', () => {
        expect(rowByPath('1').querySelector('.ms__checkbox')).toBeNull();
        expect(rowByPath('2').querySelector('.ms__checkbox')).toBeNull();
        expect(rowByPath('1.1').querySelector('.ms__checkbox')).not.toBeNull();
    });

    it('ignores clicks on a non-selectable node', () => {
        (rowByPath('1').querySelector('.ms__option-content') as HTMLElement).click();
        expect(el.getValue()).toEqual([]);
    });

    it('still selects a selectable node on click', () => {
        (rowByPath('1.1').querySelector('.ms__option-content') as HTMLElement).click();
        expect(el.getValue()).toContain('apple');
    });

    it('skips non-selectable nodes with keyboard focus', () => {
        arrowDown(); // first ArrowDown opens the dropdown (focus still unset)
        arrowDown(); // moving down must skip path '1' (non-selectable) → land on '1.1'
        const focused = rows().find(r => r.classList.contains('ms__option--focused'));
        expect(focused?.dataset.path).toBe('1.1');
    });
});

describe('tree selectability — via callback (leaves only)', () => {
    beforeEach(() => {
        el = document.createElement('web-multiselect');
        el.valueMember = 'value';
        el.displayValueMember = 'label';
        el.pathMember = 'path';
        el.setAttribute('multiple', 'true');
        el.setAttribute('show-checkboxes', 'true');
        // Only leaves are selectable — the callback sees derived hasChildren.
        el.getIsSelectableCallback = ({ node }: any) => !node.hasChildren;
        document.body.appendChild(el);
        el.options = TREE;
    });

    it('makes every branch non-selectable and every leaf selectable', () => {
        // Branches: 1 (has 1.1/1.2), 1.1 (has 1.1.1)
        expect(rowByPath('1').classList.contains('ms__option--tree-unselectable')).toBe(true);
        expect(rowByPath('1.1').classList.contains('ms__option--tree-unselectable')).toBe(true);
        // Leaves: 1.1.1, 1.2, 2
        expect(rowByPath('1.1.1').classList.contains('ms__option--tree-unselectable')).toBe(false);
        expect(rowByPath('1.2').classList.contains('ms__option--tree-unselectable')).toBe(false);
        expect(rowByPath('2').classList.contains('ms__option--tree-unselectable')).toBe(false);
    });

    it('cannot toggle a branch but can toggle a leaf', () => {
        (rowByPath('1.1').querySelector('.ms__option-content') as HTMLElement).click();
        expect(el.getValue()).toEqual([]);
        (rowByPath('1.1.1').querySelector('.ms__option-content') as HTMLElement).click();
        expect(el.getValue()).toContain('gala');
    });
});
