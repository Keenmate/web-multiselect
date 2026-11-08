import { describe, it, expect, afterEach } from 'vitest';
import '../../src/index'; // registers <web-multiselect> (core registerComponent)

/**
 * The live state across a picker rebuild (a reinit-key change such as `labels`), a DOM move,
 * a removal + re-attach, `destroy()` and a deferred `form.reset()`: the selection is kept
 * (an empty one included), a new default wins, the form never submits stale duplicates.
 */

const ITEMS = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
];

// Let the coalesced input flush (microtask) and core's post-disconnect removal check (a frame) run.
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const frame = () => tick(50);

let el: any;
let form: HTMLFormElement | undefined;

function make(attrs: Record<string, string> = {}): any {
    const node: any = document.createElement('web-multiselect');
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
}

const formEntries = () => [...new FormData(form!).entries()];
const hiddenInputs = () => el.querySelectorAll('input[type=hidden]').length;

afterEach(() => {
    // (happy-dom's form.remove() throws after a form-associated child moved — clear the body instead)
    document.body.replaceChildren();
    el = undefined;
    form = undefined;
});

describe('hidden form inputs', () => {
    it('a rebuild replaces them — no stale duplicate is submitted', async () => {
        form = document.createElement('form');
        el = make({ name: 'f' });
        el.options = ITEMS;
        form.appendChild(el);
        document.body.appendChild(form);
        await tick();

        el.setSelected(['a']);
        el.labels = { noResults: 'x' }; // reinit key → the picker is rebuilt
        await tick();
        el.setSelected(['b']);

        expect(hiddenInputs()).toBe(1);
        expect(formEntries()).toEqual([['f', '["b"]']]);
    });

    it('destroy() removes them', async () => {
        form = document.createElement('form');
        el = make({ name: 'f' });
        el.options = ITEMS;
        form.appendChild(el);
        document.body.appendChild(form);
        await tick();
        el.setSelected(['a']);

        el.destroy();
        expect(hiddenInputs()).toBe(0);
        expect(formEntries()).toEqual([]);
    });
});

describe('selection across a rebuild', () => {
    it('a `value` assigned before connect survives a later rebuild', async () => {
        el = make();
        el.options = ITEMS;
        el.value = ['a'];
        document.body.appendChild(el);
        await tick();
        expect(el.selectedValue).toEqual(['a']);

        el.labels = { noResults: 'x' };
        await tick();
        expect(el.selectedValue).toEqual(['a']);
    });

    it('a cleared selection stays cleared (the default does not come back)', async () => {
        el = make({ value: '["a"]' });
        el.options = ITEMS;
        document.body.appendChild(el);
        await tick();
        expect(el.selectedValue).toEqual(['a']);

        el.controller.clearSelection();
        el.labels = { noResults: 'x' };
        await tick();
        expect(el.selectedValue).toEqual([]);
    });

    it('a changed default (`value` attribute) wins over the live selection', async () => {
        el = make({ value: '["a"]' });
        el.options = ITEMS;
        document.body.appendChild(el);
        await tick();
        el.setSelected(['b']);

        el.setAttribute('value', '["c"]');
        el.labels = { noResults: 'x' };
        await tick();
        expect(el.selectedValue).toEqual(['c']);
    });

    it('an "add new" option stays selected when the source is re-parsed', async () => {
        el = make({ 'data-options': JSON.stringify(ITEMS), 'allow-add-new': '' });
        el.beforeAddCallback = ({ value }: { value: string }) => ({ value, label: value.toUpperCase() });
        document.body.appendChild(el);
        await tick();

        el.isOpen = true;
        el.controller.search('zed');
        el.shadowRoot.querySelector('.ms__input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await tick();
        expect(el.selectedValue).toEqual(['zed']);

        el.labels = { noResults: 'x' }; // rebuild re-parses data-options, which lacks "zed"
        await tick();
        expect(el.selectedValue).toEqual(['zed']);
        expect(el.selectedOptions[0].label).toBe('ZED');
    });
});

describe('DOM move and removal', () => {
    it('a synchronous move keeps the selection (no rebuild)', async () => {
        const a = document.createElement('div');
        const b = document.createElement('div');
        document.body.append(a, b);
        el = make();
        el.options = ITEMS;
        a.appendChild(el);
        await tick();
        el.setSelected(['b']);
        const input = el.shadowRoot.querySelector('.ms__input');

        b.appendChild(el); // disconnect + connect in the same task
        await frame();
        expect(el.selectedValue).toEqual(['b']);
        expect(el.shadowRoot.querySelector('.ms__input')).toBe(input); // same picker
        a.remove();
        b.remove();
    });

    it('a removal holds the selection; re-attaching restores it', async () => {
        el = make();
        el.options = ITEMS;
        document.body.appendChild(el);
        await tick();
        el.setSelected(['c']);

        el.remove();
        await frame(); // core's removal check → the picker is released
        expect(el.selectedValue).toEqual(['c']);
        expect(el.value).toBe('["c"]');

        document.body.appendChild(el);
        await tick();
        expect(el.selectedValue).toEqual(['c']);
    });
});

describe('form.reset() without a built picker', () => {
    it('drops a `value` assigned while deferred — the default lands on release', async () => {
        form = document.createElement('form');
        el = make({ defer: '', value: '["a"]' });
        el.options = ITEMS;
        form.appendChild(el);
        document.body.appendChild(form);
        await tick();

        el.value = ['b'];
        el.formResetCallback(); // what form.reset() calls (happy-dom doesn't)
        el.release();
        await tick();
        expect(el.selectedValue).toEqual(['a']);
    });
});

describe('single-select', () => {
    it('`el.value` with several values keeps one', async () => {
        el = make({ multiple: 'false' });
        el.options = ITEMS;
        document.body.appendChild(el);
        await tick();

        el.value = 'a,b';
        expect(el.selectedOptions.length).toBe(1);
    });
});

describe('`options` follows the source precedence', () => {
    it('an empty `options` falls back to `data-options` (same as a rebuild)', async () => {
        el = make({ 'data-options': JSON.stringify(ITEMS) });
        document.body.appendChild(el);
        await tick();
        expect(el.controller.options.length).toBe(3);

        el.options = [];
        await tick();
        expect(el.controller.options.length).toBe(3);
    });

    it('declarative <option> children win over an `options` assignment', async () => {
        el = make();
        el.innerHTML = '<option value="x">X</option><option value="y">Y</option>';
        document.body.appendChild(el);
        await tick();
        expect(el.controller.options.length).toBe(2);

        el.options = ITEMS;
        await tick();
        expect(el.controller.options.map((o: any) => o.value)).toEqual(['x', 'y']);
    });
});
