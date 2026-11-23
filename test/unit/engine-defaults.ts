import { getInputDefaults, type InputDef } from '@keenmate/web-components-core';
import { MultiSelectElement, NON_PICKER_KEYS } from '../../src/web-component';

/**
 * What the element hands a fresh engine when nothing is set: its input table's defaults minus
 * the element-only keys — the same keys `getEngineConfig(NON_PICKER_KEYS)` passes. The engine has
 * no default table of its own (C-CA-37: engine defaults = the element's), so a test that builds
 * the engine directly seeds it with these.
 */
const inputs = (MultiSelectElement as unknown as { inputs: readonly InputDef[] }).inputs;
export const ENGINE_DEFAULTS: Readonly<Record<string, unknown>> = Object.freeze(
    getInputDefaults(inputs, inputs.map(def => def.configKey).filter(key => !NON_PICKER_KEYS.has(key)))
);
