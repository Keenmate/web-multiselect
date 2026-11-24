import { describe, it, expect } from 'vitest';
import { createLTree } from '../../src/tree/ltree';
import {
	buildCascadeIndex,
	nodeCheckState,
	toggleNodeCascade,
	expandToAtoms,
	computeSelection
} from '../../src/tree/cascade';

interface Row {
	value: string;
	label: string;
	path: string;
}

// Fruit
// ├─ Pome (1.1)          ├─ Apple (1.1.1)   └─ Pear (1.1.2)
// └─ Citrus (1.2)        ├─ Orange (1.2.1)  └─ Lemon (1.2.2)
const ROWS: Row[] = [
	{ value: '1', label: 'Fruit', path: '1' },
	{ value: '1.1', label: 'Pome', path: '1.1' },
	{ value: '1.1.1', label: 'Apple', path: '1.1.1' },
	{ value: '1.1.2', label: 'Pear', path: '1.1.2' },
	{ value: '1.2', label: 'Citrus', path: '1.2' },
	{ value: '1.2.1', label: 'Orange', path: '1.2.1' },
	{ value: '1.2.2', label: 'Lemon', path: '1.2.2' }
];

const getValue = (r: Row) => r.value;

function makeTree(opts: { leavesOnly?: boolean } = {}) {
	const tree = createLTree<Row>({
		pathMember: 'path',
		getIsSelectableCallback: opts.leavesOnly ? (node) => !node.hasChildren : null
	});
	tree.insertArray(ROWS);
	return tree;
}

function nodeAt(tree: ReturnType<typeof makeTree>, path: string) {
	return tree.getNodeByPath(path)!;
}

describe('cascade index', () => {
	it('atoms of a full tree are its leaves', () => {
		const tree = makeTree();
		const index = buildCascadeIndex(tree, getValue);
		expect(index.atomsUnder.get('1')!.sort()).toEqual(['1.1.1', '1.1.2', '1.2.1', '1.2.2']);
		expect(index.atomsUnder.get('1.1')!.sort()).toEqual(['1.1.1', '1.1.2']);
		expect([...index.atomPaths].sort()).toEqual(['1.1.1', '1.1.2', '1.2.1', '1.2.2']);
	});

	it('a selectable branch with no selectable descendants is itself an atom', () => {
		// Only Pome (1.1) selectable, its children not → 1.1 becomes the atom.
		const tree = createLTree<Row>({
			pathMember: 'path',
			getIsSelectableCallback: (node) => node.path === '1.1'
		});
		tree.insertArray(ROWS);
		const index = buildCascadeIndex(tree, getValue);
		expect(index.atomPaths.has('1.1')).toBe(true);
		expect(index.atomsUnder.get('1.1')).toEqual(['1.1']);
		expect(index.atomsUnder.get('1')).toEqual(['1.1']);
	});
});

describe('nodeCheckState + toggle', () => {
	it('checking a parent checks the whole subtree', () => {
		const tree = makeTree();
		const index = buildCascadeIndex(tree, getValue);
		const { checkedAtoms } = toggleNodeCascade(index, nodeAt(tree, '1'), new Set());
		expect([...checkedAtoms].sort()).toEqual(['1.1.1', '1.1.2', '1.2.1', '1.2.2']);
		expect(nodeCheckState(index, nodeAt(tree, '1'), checkedAtoms)).toBe('checked');
		expect(nodeCheckState(index, nodeAt(tree, '1.1'), checkedAtoms)).toBe('checked');
	});

	it('a partially-selected branch is indeterminate', () => {
		const tree = makeTree();
		const index = buildCascadeIndex(tree, getValue);
		const checked = new Set(['1.1.1']); // only Apple
		expect(nodeCheckState(index, nodeAt(tree, '1.1'), checked)).toBe('indeterminate');
		expect(nodeCheckState(index, nodeAt(tree, '1'), checked)).toBe('indeterminate');
		expect(nodeCheckState(index, nodeAt(tree, '1.2'), checked)).toBe('unchecked');
	});

	it('toggling a checked node unchecks its subtree; toggling indeterminate completes it', () => {
		const tree = makeTree();
		const index = buildCascadeIndex(tree, getValue);
		// indeterminate → check all
		let r = toggleNodeCascade(index, nodeAt(tree, '1.1'), new Set(['1.1.1']));
		expect([...r.checkedAtoms].sort()).toEqual(['1.1.1', '1.1.2']);
		expect(r.addedAtoms).toEqual(['1.1.2']);
		// checked → uncheck all
		r = toggleNodeCascade(index, nodeAt(tree, '1.1'), r.checkedAtoms);
		expect([...r.checkedAtoms]).toEqual([]);
		expect(r.removedAtoms.sort()).toEqual(['1.1.1', '1.1.2']);
	});
});

describe('policy projection', () => {
	const tree = makeTree();
	const index = buildCascadeIndex(tree, getValue);
	const all = new Set(['1.1.1', '1.1.2', '1.2.1', '1.2.2']); // whole tree

	it('rolled-up collapses a full subtree to its root', () => {
		expect(computeSelection(index, all, 'rolled-up', getValue)).toEqual(['1']);
	});
	it('leaves emits only atoms', () => {
		expect(computeSelection(index, all, 'leaves', getValue).sort()).toEqual([
			'1.1.1', '1.1.2', '1.2.1', '1.2.2'
		]);
	});
	it('all emits every fully-checked node (branches + leaves)', () => {
		expect(computeSelection(index, all, 'all', getValue)).toEqual([
			'1', '1.1', '1.1.1', '1.1.2', '1.2', '1.2.1', '1.2.2'
		]);
	});

	it('partial selection: rolled-up surfaces the individual leaf', () => {
		const partial = new Set(['1.1.1']);
		expect(computeSelection(index, partial, 'rolled-up', getValue)).toEqual(['1.1.1']);
		expect(computeSelection(index, partial, 'all', getValue)).toEqual(['1.1.1']);
	});

	it('mixed: one full branch rolls up, a sibling partial stays granular', () => {
		const mixed = new Set(['1.1.1', '1.1.2', '1.2.1']); // Pome full, Citrus partial
		expect(computeSelection(index, mixed, 'rolled-up', getValue)).toEqual(['1.1', '1.2.1']);
	});

	it('every policy round-trips back to the same atoms', () => {
		for (const policy of ['rolled-up', 'leaves', 'all'] as const) {
			const emitted = computeSelection(index, all, policy, getValue);
			expect(expandToAtoms(index, emitted)).toEqual(all);
		}
	});
});

describe('select-all parity (fill every atom, then project)', () => {
	it('checking every atom projects to the same rolled-up roots as clicking each root', () => {
		const tree = makeTree();
		const index = buildCascadeIndex(tree, getValue);
		// "Select All" = fill every atom in the tree.
		const everyAtom = new Set(index.atomPaths); // atom paths == atom values here
		expect(computeSelection(index, everyAtom, 'rolled-up', getValue)).toEqual(['1']);
		expect(computeSelection(index, everyAtom, 'leaves', getValue).sort()).toEqual([
			'1.1.1', '1.1.2', '1.2.1', '1.2.2'
		]);
	});
});

describe('rolled-up with non-selectable roots (leaves-only tree)', () => {
	it('falls to the nearest selectable descendants when the complete node is non-selectable', () => {
		const tree = makeTree({ leavesOnly: true });
		const index = buildCascadeIndex(tree, getValue);
		const all = new Set(['1.1.1', '1.1.2', '1.2.1', '1.2.2']);
		// Fruit + Pome + Citrus are non-selectable branches → cannot be emitted;
		// roll-up descends to the leaves.
		expect(computeSelection(index, all, 'rolled-up', getValue).sort()).toEqual([
			'1.1.1', '1.1.2', '1.2.1', '1.2.2'
		]);
	});
});
