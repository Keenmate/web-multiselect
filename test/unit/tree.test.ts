import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Unit tests for tree mode on the <web-multiselect> element.
 *
 * Tree mode auto-enables when `path-member` is present. Options render as an
 * always-expanded hierarchy: depth-first order, indented by level, tagged
 * branch/leaf. There is no expand/collapse. Search filters the hierarchy to
 * matches + their ancestors so indentation stays coherent.
 */

const TREE = [
    { value: 'fruit', label: 'Fruit', path: '1' },
    { value: 'apple', label: 'Apple', path: '1.1' },
    { value: 'gala', label: 'Gala', path: '1.1.1' },
    { value: 'pear', label: 'Pear', path: '1.2' },
    { value: 'veg', label: 'Veg', path: '2' }
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
    await Promise.resolve();
}

beforeEach(() => {
    el = document.createElement('web-multiselect');
    el.setAttribute('value-member', 'value');
    el.setAttribute('display-value-member', 'label');
    el.setAttribute('path-member', 'path');
    document.body.appendChild(el);
    el.options = TREE;
});

afterEach(() => el.remove());

describe('tree mode — rendering', () => {
    it('renders every node as a tree row in depth-first order', () => {
        const paths = rows().map(r => r.dataset.path);
        expect(paths).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
        expect(rows().every(r => r.classList.contains('ms__option--tree'))).toBe(true);
    });

    it('indents each row by depth via --ms-tree-depth (level - 1)', () => {
        const depthByPath = new Map(
            rows().map(r => [r.dataset.path, r.style.getPropertyValue('--ms-tree-depth').trim()])
        );
        expect(depthByPath.get('1')).toBe('0');
        expect(depthByPath.get('1.1')).toBe('1');
        expect(depthByPath.get('1.1.1')).toBe('2');
        expect(depthByPath.get('1.2')).toBe('1');
        expect(depthByPath.get('2')).toBe('0');
    });

    it('tags branch vs leaf nodes', () => {
        const byPath = new Map(rows().map(r => [r.dataset.path, r]));
        expect(byPath.get('1')!.classList.contains('ms__option--tree-branch')).toBe(true);
        expect(byPath.get('1.1')!.classList.contains('ms__option--tree-branch')).toBe(true);
        expect(byPath.get('1.1.1')!.classList.contains('ms__option--tree-leaf')).toBe(true);
        expect(byPath.get('2')!.classList.contains('ms__option--tree-leaf')).toBe(true);
    });

    it('does not render a chevron/toggle (no collapse)', () => {
        expect(el.shadowRoot.querySelector('.ms__tree-toggle')).toBeNull();
    });
});

describe('tree mode — search keeps ancestors', () => {
    it('filters to matches plus their ancestors', async () => {
        await type('gala');
        expect(rows().map(r => r.dataset.path)).toEqual(['1', '1.1', '1.1.1']);
    });

    it('restores the full tree when search is cleared', async () => {
        await type('gala');
        await type('');
        expect(rows().map(r => r.dataset.path)).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
    });
});

describe('tree mode — enabled via JS property (not just attribute)', () => {
    it('renders a tree when pathMember is set as a property', async () => {
        const el2: any = document.createElement('web-multiselect');
        el2.valueMember = 'value';
        el2.displayValueMember = 'label';
        el2.pathMember = 'path'; // property, not setAttribute
        document.body.appendChild(el2);
        el2.options = TREE;
        await el2.whenSettled();

        const paths = Array.from(el2.shadowRoot.querySelectorAll('.ms__option--tree')).map(
            (r: any) => r.dataset.path
        );
        expect(paths).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
        // reflected to the attribute so it survives re-parse
        expect(el2.getAttribute('path-member')).toBe('path');
        el2.remove();
    });
});

describe('tree mode — selection', () => {
    // Cascade is the DEFAULT checkbox mode (tree + multiple). Clicking Gala
    // (1.1.1) — Apple's only child — fills Apple's whole subtree, so the
    // rolled-up policy collapses the selection to 'apple'.
    it('cascade (default): clicking the only leaf rolls its subtree up to the parent', () => {
        const gala = rows().find(r => r.dataset.path === '1.1.1')!;
        (gala.querySelector('.ms__option-content') as HTMLElement).click();
        expect(el.getValue()).toContain('apple');
    });

    it('checkbox-mode="independent" selects the literal clicked node only', async () => {
        el.setAttribute('checkbox-mode', 'independent');
        await el.whenSettled();
        const gala = rows().find(r => r.dataset.path === '1.1.1')!;
        (gala.querySelector('.ms__option-content') as HTMLElement).click();
        expect(el.getValue()).toContain('gala');
        expect(el.getValue()).not.toContain('apple');
    });
});
