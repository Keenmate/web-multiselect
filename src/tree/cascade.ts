/**
 * cascade — checkbox cascade selection + tristate math for tree mode.
 *
 * Two orthogonal concepts the multiselect exposes:
 *   - `checkbox-mode`: cascade (default) vs independent. Cascade means checking a
 *     branch checks its whole subtree, and a branch shows a tristate box.
 *   - `cascade-select-policy`: which VALUES a cascade selection emits (badges /
 *     form / change event). svelte-treeview has the first but not the second.
 *
 * The canonical state is the set of checked **atoms**. An atom is a *selectable*
 * node with no selectable descendant — the finest-grained unit a cascade can
 * toggle. A branch is `checked` iff all its atoms are checked, `indeterminate`
 * iff only some are, `unchecked` iff none. Everything the UI shows and every
 * value emitted is derived from the checked-atom set + the tree shape, so the
 * three policies are pure projections and always round-trip.
 *
 * Kept framework-free and side-effect-free so it can be unit-tested in isolation.
 */

import type { LTree } from './ltree';
import type { LTreeNode } from './ltree-node';

export type CheckboxMode = 'independent' | 'cascade';
export type CascadeSelectPolicy = 'rolled-up' | 'leaves' | 'all';
export type NodeCheckState = 'checked' | 'indeterminate' | 'unchecked';

/**
 * Precomputed cascade index over a built tree. Rebuild whenever the tree (or the
 * value accessor / selectability) changes; cheap O(n) and pure.
 */
export interface CascadeIndex<T> {
	/** value → node, for resolving emitted values back to option objects. */
	nodeByValue: Map<string, LTreeNode<T>>;
	/** path → the atom values contained in that node's subtree (self included). */
	atomsUnder: Map<string, string[]>;
	/** paths of atoms (selectable nodes with no selectable descendant). */
	atomPaths: Set<string>;
	/** Root nodes, in render order. */
	roots: LTreeNode<T>[];
}

/** Build the cascade index from a tree and a value accessor. */
export function buildCascadeIndex<T>(
	tree: LTree<T>,
	getValue: (data: T) => string
): CascadeIndex<T> {
	const nodeByValue = new Map<string, LTreeNode<T>>();
	const atomsUnder = new Map<string, string[]>();
	const atomPaths = new Set<string>();

	const valueOf = (node: LTreeNode<T>): string => String(getValue(node.data as T));

	const visit = (node: LTreeNode<T>): string[] => {
		nodeByValue.set(valueOf(node), node);

		const childAtoms: string[] = [];
		for (const child of Object.values(node.children)) {
			childAtoms.push(...visit(child));
		}

		let atoms: string[];
		if (childAtoms.length > 0) {
			// Has selectable descendants → not an atom; carries their atoms.
			atoms = childAtoms;
		} else if (node.isSelectable !== false) {
			// Deepest selectable node on this branch → it is the atom.
			atoms = [valueOf(node)];
			atomPaths.add(node.path);
		} else {
			atoms = [];
		}
		atomsUnder.set(node.path, atoms);
		return atoms;
	};

	const roots = tree.tree;
	for (const root of roots) visit(root);

	return { nodeByValue, atomsUnder, atomPaths, roots };
}

/** The tristate of a node given the current checked-atom set. */
export function nodeCheckState<T>(
	index: CascadeIndex<T>,
	node: LTreeNode<T>,
	checkedAtoms: Set<string>
): NodeCheckState {
	const atoms = index.atomsUnder.get(node.path);
	if (!atoms || atoms.length === 0) return 'unchecked';
	let checked = 0;
	for (const a of atoms) if (checkedAtoms.has(a)) checked++;
	if (checked === 0) return 'unchecked';
	if (checked === atoms.length) return 'checked';
	return 'indeterminate';
}

/**
 * Expand an emitted value set (any policy) back to the canonical checked-atom
 * set. Every emitted value denotes a fully-checked node, so its atoms are all
 * checked; unknown values (non-tree) are ignored.
 */
export function expandToAtoms<T>(
	index: CascadeIndex<T>,
	emittedValues: Iterable<string>
): Set<string> {
	const atoms = new Set<string>();
	for (const v of emittedValues) {
		const node = index.nodeByValue.get(String(v));
		if (!node) continue;
		for (const a of index.atomsUnder.get(node.path) ?? []) atoms.add(a);
	}
	return atoms;
}

/**
 * Toggle a node in cascade mode. Returns the new checked-atom set plus the atoms
 * that were added / removed. Toggling an `indeterminate` or `unchecked` node
 * checks its whole subtree; toggling a `checked` node unchecks it (matches
 * svelte-treeview: a dash click completes the selection).
 */
export function toggleNodeCascade<T>(
	index: CascadeIndex<T>,
	node: LTreeNode<T>,
	checkedAtoms: Set<string>
): { checkedAtoms: Set<string>; addedAtoms: string[]; removedAtoms: string[] } {
	const atoms = index.atomsUnder.get(node.path) ?? [];
	const next = new Set(checkedAtoms);
	const state = nodeCheckState(index, node, checkedAtoms);

	const addedAtoms: string[] = [];
	const removedAtoms: string[] = [];
	if (state === 'checked') {
		for (const a of atoms) if (next.delete(a)) removedAtoms.push(a);
	} else {
		for (const a of atoms) if (!next.has(a)) { next.add(a); addedAtoms.push(a); }
	}
	return { checkedAtoms: next, addedAtoms, removedAtoms };
}

/**
 * Project the checked-atom set to the emitted value list under a policy, in tree
 * (depth-first) order:
 *   - `all`      → every fully-checked selectable node (branches + atoms).
 *   - `leaves`   → the checked atoms only.
 *   - `rolled-up`→ minimal cover: a fully-checked selectable node emits itself and
 *                  stops; a fully-checked *non-selectable* node rolls into its
 *                  subtree (nearest selectable descendants); an indeterminate node
 *                  descends so its individually-checked descendants surface.
 */
export function projectSelection<T>(
	index: CascadeIndex<T>,
	checkedAtoms: Set<string>,
	policy: CascadeSelectPolicy,
	getValue: (data: T) => string
): string[] {
	const valueOf = (node: LTreeNode<T>): string => String(getValue(node.data as T));
	const out: string[] = [];

	const walk = (node: LTreeNode<T>): void => {
		const state = nodeCheckState(index, node, checkedAtoms);
		if (state === 'unchecked') return;

		const selectable = node.isSelectable !== false;
		const children = Object.values(node.children);

		if (policy === 'leaves') {
			if (index.atomPaths.has(node.path) && state === 'checked') out.push(valueOf(node));
			for (const child of children) walk(child);
			return;
		}

		if (policy === 'all') {
			if (state === 'checked' && selectable) out.push(valueOf(node));
			for (const child of children) walk(child);
			return;
		}

		// rolled-up
		if (state === 'checked' && selectable) {
			out.push(valueOf(node));
			return; // whole subtree is covered by this one value
		}
		// checked-but-non-selectable, or indeterminate → descend
		for (const child of children) walk(child);
	};

	for (const root of index.roots) walk(root);
	return out;
}
