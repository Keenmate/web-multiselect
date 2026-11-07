/**
 * LTreeNode — a single node in the option tree.
 *
 * Trimmed lift of web-treeview's `ltree/ltree-node.ts`. The multiselect renders
 * every node expanded (no collapse), so this keeps only the structural fields
 * needed to order nodes and indent them: path/parent/level/children/hasChildren
 * plus the original option `data`. Expand state, drag-drop, checkbox, selection
 * and drop-position fields are all thrown out.
 */

export type NodeId = string | number;

export interface LTreeNode<T> {
	treeId: string;
	id: NodeId;
	/** Materialized dot-path, e.g. "1.2.3". */
	path: string;
	/** This node's own segment relative to its parent. */
	pathSegment: string;
	parentPath: string | null | undefined;
	/** Depth in the tree (1-based; root children are level 1). */
	level: number | null | undefined;

	/** Children keyed by prefixed segment (see `segmentPrefix` in ltree.ts). */
	children: Record<string, LTreeNode<T>>;
	hasChildren: boolean;
	/**
	 * Whether this node may be selected. Defaults to `true`; set `false` (via
	 * `isSelectableMember`/`getIsSelectableCallback`) to make a node non-interactive
	 * — it renders normally (no grey/disabled styling) but has no checkbox, is
	 * skipped by keyboard focus, and cannot be toggled or selected by Select-All.
	 * This is distinct from `disabled` (which greys the row out).
	 */
	isSelectable: boolean;
	/** The original option object this node was built from. */
	data: T | null | undefined;
}

export function createLTreeNode<T>(data?: Partial<LTreeNode<T>>): LTreeNode<T> {
	return {
		treeId: '',
		id: -1,
		path: '',
		pathSegment: '',
		parentPath: undefined,
		level: undefined,

		children: {},
		hasChildren: false,
		isSelectable: true,
		data: undefined,

		...data
	};
}
