/**
 * Categorized loggers for @keenmate/web-multiselect — now a thin shim over the
 * core logging module (`@keenmate/web-components-core`, SPEC §12.1). Core owns the
 * vendored logging engine and the colour-coded `%c` prefix (ordering-safe); as of
 * core rc04 `loglevel` is no longer a runtime dependency (it was vendored into
 * core), so nothing here pulls `loglevel` transitively and the previously vendored
 * `loglevel` + `loglevel-plugin-prefix` copies under `src/vendor/` are gone.
 *
 * The picker (`multiselect.ts`) imports the four category loggers by name, so
 * this module keeps that surface:
 *
 * Categories (`MULTISELECT:*`):
 * - INIT        — component initialization and configuration
 * - DATA        — data loading, async operations, option parsing
 * - UI          — rendering, dropdown/popover/tooltip operations
 * - INTERACTION — user interactions, clicks, selections, keyboard events
 *
 * Enable logging from the console (or the `window.components['web-multiselect'].logging` API):
 *
 * ```js
 * import { enableLogging, setLogLevel, setCategoryLevel, resetLogging } from '@keenmate/web-multiselect';
 * enableLogging();                          // all categories → debug
 * setLogLevel('info');                      // all categories → info
 * setCategoryLevel('UI', 'debug');          // one category (bare or 'MULTISELECT:UI')
 * setCategoryLevel('UI', null);             // clear it again
 * resetLogging();                           // clear every category: follow the page level
 * ```
 */
import { createLoggers, type Logger, type LogLevelDesc } from '@keenmate/web-components-core';

/** Category order matches the original component (INIT/DATA/UI plus INTERACTION). */
const CATEGORIES = ['INIT', 'DATA', 'UI', 'INTERACTION'] as const;
type Category = (typeof CATEGORIES)[number];

/**
 * The single core logger bundle for this component. Exported so the element
 * registration (`index.ts` → `registerComponent`) can expose its controls on
 * `window.components['web-multiselect'].logging` and `BlissElement` can build the
 * per-instance `this.log` loggers from it.
 */
export const logging = createLoggers('MULTISELECT', CATEGORIES);

// The four category loggers, by their historical names. Each is a core `Logger`
// (loglevel-compatible surface), so `dataLogger.debug(...)` etc. work as before.
export const initLogger: Logger = logging.loggers.INIT;
export const dataLogger: Logger = logging.loggers.DATA;
export const uiLogger: Logger = logging.loggers.UI;
export const interactionLogger: Logger = logging.loggers.INTERACTION;

/**
 * Full (namespaced) category names, kept for the `getCategories()` global API
 * and any consumer that introspected the list.
 */
export const LOGGING_CATEGORIES = CATEGORIES.map((c) => `MULTISELECT:${c}`);

/** Enable all logging (debug level). */
export function enableLogging(): void {
  logging.enableLogging();
}

/** Disable all logging (silent). */
export function disableLogging(): void {
  logging.disableLogging();
}

/**
 * Clear web-multiselect's own levels (every category, persisted copies too): it follows the
 * page-wide level (`window.components.logging`) again, else the built-in `warn`.
 */
export function resetLogging(): void {
  logging.resetLogging();
}

/** Set the same level on every category. */
export function setLogLevel(level: LogLevelDesc): void {
  logging.setLogLevel(level);
}

/**
 * Set the level of one category. Accepts the full prefixed name
 * (`MULTISELECT:UI`) or the bare suffix (`UI`) — both normalize to the category
 * key the core bundle expects. `null` clears the category's own level (it follows
 * the page-wide level again).
 */
export function setCategoryLevel(category: string, level: LogLevelDesc | null): void {
  const bare = (category.includes(':') ? category.split(':').pop()! : category) as Category;
  logging.setCategoryLevel(bare, level);
}
