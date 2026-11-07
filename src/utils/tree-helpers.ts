/**
 * Path/string helpers for the ltree option model.
 *
 * Lifted (trimmed) from web-treeview's `helpers/string-helpers.ts` and
 * `helpers/ltree-helpers.ts`. Options in tree mode are addressed by a
 * materialized dot-path (e.g. `"1.2.3"`); parentPath and level are derived
 * from that path by these functions.
 */

export const isEmptyString = (str: string | null | undefined): boolean =>
	!str || (typeof str === 'string' && str.trim() === '');

/** Parent of a dot-path: `"a.b.c"` -> `"a.b"`, `"a"` -> `""`, empty -> null. */
export function getParentPath(path: string, pathSeparator: string = '.'): string | null {
	if (!path || typeof path !== 'string') return null;

	const lastDotIndex = path.lastIndexOf(pathSeparator);
	return lastDotIndex === -1 ? '' : path.substring(0, lastDotIndex);
}

/** Path relative to a parent: `getRelativePath("a.b.c", "a")` -> `"b.c"`. */
export function getRelativePath(path: string, parentPath: string, pathSeparator: string = '.'): string {
	if (isEmptyString(parentPath)) return path;

	return path.startsWith(parentPath + pathSeparator)
		? path.substring(parentPath.length + pathSeparator.length)
		: path;
}

/** Take `count` segments of `path` starting at `start`. */
export function getPathSegments(path: string, start: number = 0, count: number = 1, pathSeparator: string = '.'): string {
	const segments = path.split(pathSeparator);
	const taken = segments.slice(start, start + count);
	return taken.join(pathSeparator);
}

/** Depth of a path = segment count (`"a.b.c"` -> 3). */
export function getLevel(path: string, pathSeparator: string): number {
	return path.split(pathSeparator).length;
}
