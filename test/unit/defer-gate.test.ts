import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Render gate (`defer`): with the attribute present the element builds NO shadow
 * content on connect — it waits until `el.ready()` (or the attribute is removed),
 * then builds once with everything wired. This closes the upgrade-then-restyle
 * flash for consumers who assign options / callbacks after upgrade (§FOUC).
 *
 * "Built" is observed via the `[data-multiselect]` container #ensureContainer()
 * appends, the reflected `is-ready` attribute, and the once-only `ready` event.
 */
const built = (el: any): boolean => !!el.shadowRoot?.querySelector('[data-multiselect]');

describe('defer render gate', () => {
    let el: any;
    afterEach(() => {
        el?.remove();
        vi.restoreAllMocks();
    });

    it('holds the build while `defer` is set, then builds once on ready()', async () => {
        const onReady = vi.fn();
        el = document.createElement('web-multiselect');
        el.setAttribute('defer', '');
        el.addEventListener('ready', onReady);
        document.body.appendChild(el);
        await el.whenSettled();

        // Held: nothing built, not ready, no event.
        expect(built(el)).toBe(false);
        expect(el.isReady).toBe(false);
        expect(el.hasAttribute('is-ready')).toBe(false);
        expect(onReady).not.toHaveBeenCalled();

        el.ready();
        await el.whenSettled();

        // Released: built once, reflected, announced.
        expect(built(el)).toBe(true);
        expect(el.isReady).toBe(true);
        expect(el.hasAttribute('is-ready')).toBe(true);
        expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('applies options assigned while deferred in the single build', async () => {
        el = document.createElement('web-multiselect');
        el.setAttribute('defer', '');
        document.body.appendChild(el);
        el.options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
        await el.whenSettled();
        expect(built(el)).toBe(false); // still held despite the pending write

        el.ready();
        await el.whenSettled();
        expect(built(el)).toBe(true);
        expect(el.getSelected()).toEqual([]); // picker is live and queryable
    });

    it('builds and fires `ready` immediately for a normal (non-deferred) element', async () => {
        const onReady = vi.fn();
        el = document.createElement('web-multiselect');
        el.addEventListener('ready', onReady);
        document.body.appendChild(el);
        await el.whenSettled();

        expect(built(el)).toBe(true);
        expect(el.isReady).toBe(true);
        expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('releases the gate when the `defer` attribute is removed (server-driven)', async () => {
        el = document.createElement('web-multiselect');
        el.setAttribute('defer', '');
        document.body.appendChild(el);
        await el.whenSettled();
        expect(built(el)).toBe(false);

        el.removeAttribute('defer');
        await el.whenSettled();
        expect(built(el)).toBe(true);
        expect(el.isReady).toBe(true);
    });

    it('fires `ready` only once even across a later reinit', async () => {
        const onReady = vi.fn();
        el = document.createElement('web-multiselect');
        el.setAttribute('defer', '');
        el.addEventListener('ready', onReady);
        document.body.appendChild(el);
        await el.whenSettled();

        el.ready();
        await el.whenSettled();
        expect(onReady).toHaveBeenCalledTimes(1);

        // A structural change rebuilds the picker but must not re-announce ready.
        el.valueMember = 'value';
        await el.whenSettled();
        expect(built(el)).toBe(true);
        expect(onReady).toHaveBeenCalledTimes(1);
    });
});
