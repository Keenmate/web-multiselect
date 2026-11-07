/**
 * ltree — hierarchical option model for the multiselect's tree mode.
 *
 * A trimmed lift of web-treeview's `ltree/ltree.ts`. The multiselect renders
 * every tree node expanded (there is no collapse — that's web-treeview's job),
 * so all we need from the tree is:
 *   - build a hierarchy from each option's materialized dot-`path`
 *   - flatten it to a depth-first list (parents before children) with each
 *     node's `level` + `hasChildren`, for indented rendering
 *
 * Everything else from the original (expand/collapse, FlexSearch indexing,
 * drag-drop, filtering, tree-editor mutations, context menus, selection) is
 * intentionally thrown out. The build/flatten algorithms are kept faithful to
 * the originals so ordering matches web-treeview.
 */

import { type LTreeNode, createLTreeNode } from '../utils/ltree-node';
import { dataLogger } from '../logger';
import {
	isEmptyString,
	getLevel,
	getParentPath,
	getPathSegments,
	getRelativePath
} from '../utils/tree-helpers';

/** Safely read a string-named member off a generic data item. */
function getField(item: unknown, member: string): any {
	return (item as Record<string, unknown>)[member];
}

export interface LTreeOptions<T> {
	/** Member holding a unique id (optional; falls back to path). */
	idMember?: string | null;

	/** Member holding the materialized dot-path. */
	pathMember?: string | null;
	/** Callback returning the materialized dot-path (takes precedence over pathMember). */
	getPathCallback?: ((item: T) => string) | null;

	/** Member holding the parent path (otherwise derived from `path`). */
	parentPathMember?: string | null;
	/** Member holding the depth/level (otherwise derived from `path`). */
	levelMember?: string | null;
	/** Member holding a precomputed hasChildren flag (otherwise derived). */
	hasChildrenMember?: string | null;
	/** Callback returning the parent path (takes precedence over parentPathMember). */
	getParentPathCallback?: ((item: T) => string) | null;
	/** Callback returning the depth/level (takes precedence over levelMember). */
	getLevelCallback?: ((item: T) => number) | null;
	/** Callback returning a precomputed hasChildren flag (takes precedence over hasChildrenMember). */
	getHasChildrenCallback?: ((item: T) => boolean) | null;

	/** Member holding a per-node `isSelectable` flag (otherwise every node is selectable). */
	isSelectableMember?: string | null;
	/**
	 * Callback deciding whether a node is selectable (takes precedence over
	 * `isSelectableMember`). Receives the fully-built node, so `node.hasChildren`
	 * / `node.level` are accurate — e.g. `(node) => !node.hasChildren` to allow
	 * selecting leaves only.
	 */
	getIsSelectableCallback?: ((node: LTreeNode<T>) => boolean) | null;

	treeId?: string;
	treePathSeparator?: string | null;

	/** Optional sibling ordering. */
	isSorted?: boolean;
	orderMember?: string | null;
	sortCallback?: ((items: LTreeNode<T>[]) => LTreeNode<T>[]) | null;
	getDisplayValueCallback?: ((node: LTreeNode<T>) => string) | null;
}

export interface LTree<T> {
	readonly treePathSeparator: string;
	readonly root: LTreeNode<T>;

	/** Root-level nodes. */
	readonly tree: LTreeNode<T>[];
	/** Flat array of every node in depth-first render order (parents before children). */
	readonly flatNodes: LTreeNode<T>[];

	insertArray(data: T[]): void;
	getNodeByPath(path: string, _root?: LTreeNode<T> | null): LTreeNode<T> | null;
}

export function createLTree<T>(options: LTreeOptions<T> = {}): LTree<T> {
	const _idMember = options.idMember;
	const _pathMember = options.pathMember;
	const _getPathCallback = options.getPathCallback;
	const _parentPathMember = options.parentPathMember;
	const _levelMember = options.levelMember;
	const _hasChildrenMember = options.hasChildrenMember;
	const _getParentPathCallback = options.getParentPathCallback;
	const _getLevelCallback = options.getLevelCallback;
	const _getHasChildrenCallback = options.getHasChildrenCallback;
	const _isSelectableMember = options.isSelectableMember;
	const _getIsSelectableCallback = options.getIsSelectableCallback;
	const _treeId = options.treeId || 'multiselect-tree';
	const _orderMember = options.orderMember;
	const _getDisplayValueCallback = options.getDisplayValueCallback;

	const shouldCalculateParentPath = !_getParentPathCallback && isEmptyString(_parentPathMember);
	const shouldCalculateLevel = !_getLevelCallback && isEmptyString(_levelMember);
	const shouldCalculateHasChildren = !_getHasChildrenCallback && isEmptyString(_hasChildrenMember);
	const shouldCalculateIsSelectable = isEmptyString(_isSelectableMember);

	// Crucial for keeping the order of numeric segments: object keys that are
	// pure numbers are auto-sorted numerically by the JS engine, so we prefix
	// every child key with a letter to preserve insertion order.
	// See https://stackoverflow.com/a/51497854
	const segmentPrefix = 'x';
	const treePathSeparator = options.treePathSeparator || '.';

	const root = createLTreeNode<T>();

	let nodeCount = 0;
	let maxLevel = 0;

	let cachedFlatNodes: LTreeNode<T>[] | null = null;

	const resolvePath = (row: T): string | undefined => {
		if (_getPathCallback) return _getPathCallback(row);
		return _pathMember ? getField(row, _pathMember) : undefined;
	};

	const api: LTree<T> = {
		treePathSeparator,
		root,

		get tree(): LTreeNode<T>[] {
			return Object.values(root.children);
		},

		/**
		 * Every node in depth-first render order (a parent immediately precedes
		 * its subtree). Computed once per `insertArray` and cached.
		 */
		get flatNodes(): LTreeNode<T>[] {
			if (cachedFlatNodes) return cachedFlatNodes;

			const result: LTreeNode<T>[] = [];
			const isSorted = options.isSorted ?? false;
			const sortCallback = options.sortCallback;

			function traverse(node: LTreeNode<T>) {
				let children = Object.values(node.children);
				if (isSorted && sortCallback && children.length > 0) {
					children = sortCallback(children);
				}
				for (const child of children) {
					result.push(child);
					if (child.hasChildren) traverse(child);
				}
			}

			traverse(root);
			cachedFlatNodes = result;
			return result;
		},

		insertArray(data: T[]): void {
			data = data || [];

			// Reset the tree.
			root.children = {};
			nodeCount = 0;
			maxLevel = 0;
			cachedFlatNodes = null;

			const invalidPaths: string[] = [];

			let mappedData = data
				.map((row, index) => {
					const node = createLTreeNode<T>();
					node.treeId = _treeId;
					node.id = _idMember ? getField(row, _idMember) : undefined;

					const rawPath = resolvePath(row);

					// Path must be a non-empty string.
					if (rawPath == null || rawPath === '' || typeof rawPath !== 'string') {
						invalidPaths.push(`index ${index}`);
						return null;
					}
					node.path = rawPath;
					if (node.id === undefined || node.id === -1) node.id = rawPath;

					if (shouldCalculateParentPath) {
						node.parentPath = getParentPath(node.path, treePathSeparator);
					} else {
						node.parentPath = _getParentPathCallback ? _getParentPathCallback(row) : getField(row, _parentPathMember!);
					}

					node.pathSegment = getPathSegments(
						getRelativePath(node.path, node.parentPath ?? '', treePathSeparator),
						0,
						1,
						treePathSeparator
					);

					if (!shouldCalculateLevel) node.level = _getLevelCallback ? _getLevelCallback(row) : getField(row, _levelMember!);
					else node.level = getLevel(node.path, treePathSeparator);

					if (!shouldCalculateHasChildren) {
						node.hasChildren = _getHasChildrenCallback ? _getHasChildrenCallback(row) : getField(row, _hasChildrenMember!);
					}

					node.data = row;
					return node;
				})
				.filter((node): node is LTreeNode<T> => node !== null);

			if (!options.isSorted) {
				if (options.sortCallback) mappedData = options.sortCallback(mappedData);
				else mappedData = defaultSort(mappedData);
			}

			for (const node of mappedData) {
				insertTreeNode(node.parentPath ?? '', node);
			}

			// isSelectable: callback > member. Applied AFTER every node is inserted
			// so the callback sees the derived `hasChildren` (letting the common
			// "leaves only" rule — `(node) => !node.hasChildren` — work correctly).
			// Nodes default to selectable; a member value only flips it when present.
			if (_getIsSelectableCallback || !shouldCalculateIsSelectable) {
				for (const node of mappedData) {
					if (_getIsSelectableCallback) {
						node.isSelectable = _getIsSelectableCallback(node) !== false;
					} else {
						const raw = getField(node.data, _isSelectableMember!);
						node.isSelectable = raw == null ? true : !!raw;
					}
				}
			}

			if (invalidPaths.length > 0) {
				dataLogger.warn(
					`[ltree ${_treeId}] ${invalidPaths.length} option(s) had an invalid path and were skipped ` +
						`(pathMember="${_pathMember}"). Offending: ${invalidPaths.slice(0, 5).join(', ')}` +
						(invalidPaths.length > 5 ? ', …' : '')
				);
			}
		},

		getNodeByPath(path: string, _root?: LTreeNode<T> | null): LTreeNode<T> | null {
			let node = _root || root;

			if (path) {
				const parts = path.split(treePathSeparator);
				for (let i = 0; i < parts.length; i++) {
					const segment = segmentPrefix + parts[i];
					if (!node.children.hasOwnProperty(segment)) {
						return null;
					}
					node = node.children[segment]!;
				}
			}

			return node;
		}
	};

	/** Attach a node under its parent, deriving level/hasChildren as needed. */
	function insertTreeNode(parentPath: string, newNode: LTreeNode<T>): string | null {
		const parentNode = api.getNodeByPath(parentPath);

		if (!parentNode) {
			return `Node: ${newNode.path} - Could not find parent node: ${parentPath}`;
		}
		if (shouldCalculateLevel) {
			newNode.level = (parentNode.level || 0) + 1;
		}

		const newSegment =
			segmentPrefix +
			getPathSegments(getRelativePath(newNode.path, parentPath, treePathSeparator), 0, 1, treePathSeparator);

		if (!parentNode.children.hasOwnProperty(newSegment)) {
			parentNode.children[newSegment] = newNode;
			if (shouldCalculateHasChildren && !parentNode.hasChildren) {
				parentNode.hasChildren = true;
			}
			nodeCount++;
			maxLevel = Math.max(maxLevel, newNode.level || 0);
		}

		return null;
	}

	function defaultSort(items: LTreeNode<T>[]): LTreeNode<T>[] {
		return items.sort((a, b) => {
			const aLevel = a.level || 0;
			const bLevel = b.level || 0;
			if (aLevel !== bLevel) return aLevel - bLevel;

			if (a.parentPath !== b.parentPath) {
				if (!a.parentPath) return -1;
				if (!b.parentPath) return 1;
				return a.parentPath.localeCompare(b.parentPath);
			}

			if (_orderMember && a.data && b.data) {
				const aOrder = getField(a.data, _orderMember) ?? 0;
				const bOrder = getField(b.data, _orderMember) ?? 0;
				if (aOrder !== bOrder) return aOrder - bOrder;
			}

			if (_getDisplayValueCallback) {
				return _getDisplayValueCallback(a).localeCompare(_getDisplayValueCallback(b));
			}
			return a.path.localeCompare(b.path);
		});
	}

	return api;
}
