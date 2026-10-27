import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Element-level form association. `<web-multiselect>` is a form-associated custom
 * element (`static formAssociated = true`); core's `BlissElement` exposes the
 * associated <form> via the public `el.form` getter (lazily attaching
 * ElementInternals). This is the surface host frameworks depend on: Phoenix
 * LiveView's `phx-change` delegation resolves the parent form through
 * `event.target.form`, which is `undefined` on a custom element without this
 * getter. See the v2 regression where `internals` went `#private` and the
 * wrapper's `.form` polyfill (reading the old, accidentally-public field) died.
 *
 * jsdom does not wire real form association (`ElementInternals.form` is always
 * undefined), so the happy path is modelled by stubbing `attachInternals`.
 */

let el: any;

afterEach(() => {
    el?.remove();
    el = undefined;
    vi.restoreAllMocks();
});

describe('<web-multiselect> form association', () => {
    it('exposes a public `form` getter (inherited from core)', () => {
        el = document.createElement('web-multiselect');
        expect('form' in el).toBe(true);
        // No form + jsdom's unwired internals → null, but the read must not throw.
        expect(el.form).toBeNull();
    });

    it('resolves the associated <form> through ElementInternals', () => {
        el = document.createElement('web-multiselect');
        const form = document.createElement('form');
        // jsdom leaves ElementInternals.form undefined; shadow attachInternals to model it.
        (el as any).attachInternals = () => ({ form });
        expect(el.form).toBe(form);
        // event.target.form — the exact shape LiveView reads — resolves too.
        const evt = { target: el } as unknown as { target: { form: HTMLFormElement | null } };
        expect(evt.target.form).toBe(form);
    });

    it('does not attach internals itself (core owns the single attachInternals)', () => {
        el = document.createElement('web-multiselect');
        let calls = 0;
        const form = document.createElement('form');
        (el as any).attachInternals = () => {
            calls += 1;
            return { form };
        };
        document.body.appendChild(el); // construct + connect (core attaches for :state(ready))
        void el.form;
        void el.form;
        expect(el.form).toBe(form);
        expect(calls).toBe(1); // memoized — attached exactly once, by core
    });
});
