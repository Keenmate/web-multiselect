import { describe, it, expect } from 'vitest';
import { createLTree } from '../../src/tree/ltree';

/**
 * Unit tests for the trimmed ltree option model (src/tree/ltree.ts).
 *
 * Covers the only thing tree mode asks of it: build a hierarchy from each
 * option's dot-path and flatten it depth-first (parents before children) with
 * correct level + hasChildren, regardless of input order.
 */

interface Item {
    id: string;
    path: string;
    label: string;
}

const ITEMS: Item[] = [
    // Deliberately out of order to exercise the default sort.
    { id: 'e', path: '1.1.1', label: 'Gala' },
    { id: 'a', path: '1', label: 'Fruit' },
    { id: 'd', path: '2', label: 'Veg' },
    { id: 'c', path: '1.2', label: 'Pear' },
    { id: 'b', path: '1.1', label: 'Apple' }
];

function build() {
    const tree = createLTree<Item>({ idMember: 'id', pathMember: 'path' });
    tree.insertArray(ITEMS);
    return tree;
}

describe('ltree — build + flatten', () => {
    it('flattens depth-first, parents immediately before their subtree', () => {
        const paths = build().flatNodes.map(n => n.path);
        expect(paths).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
    });

    it('derives level from the path', () => {
        const byPath = new Map(build().flatNodes.map(n => [n.path, n.level]));
        expect(byPath.get('1')).toBe(1);
        expect(byPath.get('1.1')).toBe(2);
        expect(byPath.get('1.1.1')).toBe(3);
        expect(byPath.get('2')).toBe(1);
    });

    it('derives hasChildren', () => {
        const byPath = new Map(build().flatNodes.map(n => [n.path, n.hasChildren]));
        expect(byPath.get('1')).toBe(true);
        expect(byPath.get('1.1')).toBe(true);
        expect(byPath.get('1.1.1')).toBe(false);
        expect(byPath.get('1.2')).toBe(false);
        expect(byPath.get('2')).toBe(false);
    });

    it('carries the original data on each node', () => {
        const node = build().flatNodes.find(n => n.path === '1.1.1');
        expect(node?.data?.label).toBe('Gala');
    });

    it('getNodeByPath walks the hierarchy', () => {
        const tree = build();
        expect(tree.getNodeByPath('1.1.1')?.data?.id).toBe('e');
        expect(tree.getNodeByPath('9.9')).toBeNull();
    });

    it('supports getPathCallback in place of pathMember', () => {
        const tree = createLTree<Item>({ getPathCallback: (it) => it.path });
        tree.insertArray(ITEMS);
        expect(tree.flatNodes.map(n => n.path)).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
    });

    it('honours a custom path separator', () => {
        const items = [
            { id: 'a', path: '1', label: 'A' },
            { id: 'b', path: '1/2', label: 'B' }
        ];
        const tree = createLTree<{ id: string; path: string; label: string }>({
            idMember: 'id',
            pathMember: 'path',
            treePathSeparator: '/'
        });
        tree.insertArray(items);
        const b = tree.flatNodes.find(n => n.path === '1/2');
        expect(b?.level).toBe(2);
        expect(tree.flatNodes.find(n => n.path === '1')?.hasChildren).toBe(true);
    });

    it('skips options with an invalid/missing path', () => {
        const tree = createLTree<any>({ idMember: 'id', pathMember: 'path' });
        tree.insertArray([{ id: 'a', path: '1' }, { id: 'x' }, { id: 'b', path: '1.1' }]);
        expect(tree.flatNodes.map(n => n.path)).toEqual(['1', '1.1']);
    });

    it('defaults every node to selectable', () => {
        expect(build().flatNodes.every(n => n.isSelectable)).toBe(true);
    });

    it('reads isSelectable from a member (falsy → not selectable, missing → selectable)', () => {
        const tree = createLTree<any>({ idMember: 'id', pathMember: 'path', isSelectableMember: 'sel' });
        tree.insertArray([
            { id: 'a', path: '1', sel: false },
            { id: 'b', path: '1.1', sel: true },
            { id: 'c', path: '1.2' } // no member → stays selectable
        ]);
        const byPath = new Map(tree.flatNodes.map(n => [n.path, n.isSelectable]));
        expect(byPath.get('1')).toBe(false);
        expect(byPath.get('1.1')).toBe(true);
        expect(byPath.get('1.2')).toBe(true);
    });

    it('applies getIsSelectableCallback with derived hasChildren (leaves only)', () => {
        const tree = createLTree<Item>({
            idMember: 'id',
            pathMember: 'path',
            getIsSelectableCallback: (node) => !node.hasChildren
        });
        tree.insertArray(ITEMS);
        const byPath = new Map(tree.flatNodes.map(n => [n.path, n.isSelectable]));
        // Branches (hasChildren) are non-selectable; leaves are selectable.
        expect(byPath.get('1')).toBe(false);
        expect(byPath.get('1.1')).toBe(false);
        expect(byPath.get('1.1.1')).toBe(true);
        expect(byPath.get('1.2')).toBe(true);
        expect(byPath.get('2')).toBe(true);
    });
});

describe('ltree — parent path / level / hasChildren from callbacks', () => {
    it('callbacks win over the members and over derivation', () => {
        type Row = Item & { parent: string; depth: number; folder: boolean };
        const rows: Row[] = [
            { id: 'a', path: '1', label: 'Fruit', parent: '', depth: 7, folder: true },
            { id: 'b', path: '1.1', label: 'Apple', parent: '1', depth: 8, folder: false },
        ];
        const tree = createLTree<Row>({
            idMember: 'id',
            pathMember: 'path',
            levelMember: 'label', // ignored: the callback wins
            getParentPathCallback: (row) => row.parent,
            getLevelCallback: (row) => row.depth,
            getHasChildrenCallback: (row) => row.folder,
        });
        tree.insertArray(rows);
        const byId = new Map(tree.flatNodes.map((n) => [n.id, n]));
        expect(byId.get('b')!.parentPath).toBe('1');
        expect(byId.get('a')!.level).toBe(7);
        expect(byId.get('b')!.level).toBe(8);
        expect(byId.get('a')!.hasChildren).toBe(true);
        expect(byId.get('b')!.hasChildren).toBe(false);
    });
});
