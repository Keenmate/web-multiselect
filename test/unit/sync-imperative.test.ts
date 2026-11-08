import { describe, it, expect, afterEach } from 'vitest';
import '../../src/index'; // registers <web-multiselect> (core registerComponent)

/**
 * Regression: the synchronous `el.options = data; el.setSelected(sel)` contract.
 *
 * Under the core async model a loose property write (`el.options = …`) coalesces
 * into a microtask reinit, so the picker still holds the *previous* options when
 * a synchronous imperative method runs on the very next line. That mismatch let
 * `setSelected` see `count` (from the requested values) diverge from the found
 * options — compact/partial badge rendering then dereferenced `selectedOptions[0]`
 * (undefined) and threw, aborting the caller's script.
 *
 * The element's imperative methods now `flush()` any pending write first, so this
 * classic ordering works without an intervening `await el.whenSettled()`.
 */

const ITEMS = [
    { value: 'js', label: 'JavaScript' },
    { value: 'ts', label: 'TypeScript' },
    { value: 'py', label: 'Python' },
    { value: 'go', label: 'Go' }
];

let el: any;
afterEach(() => el?.remove());

function mount(attrs: Record<string, string> = {}): any {
    el = document.createElement('web-multiselect');
    el.setAttribute('value-member', 'value');
    el.setAttribute('display-value-member', 'label');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el;
}

describe('synchronous imperative API after a property write', () => {
    it('setSelected right after options = … applies without awaiting', () => {
        mount();
        el.options = ITEMS;
        el.setSelected(['js', 'ts', 'py']); // no await — must not throw
        expect(el.selectedOptions.map((o: any) => o.value)).toEqual(['js', 'ts', 'py']);
    });

    it('compact mode renders the picked option, not undefined (the original crash)', () => {
        mount({ 'badges-threshold': '5', 'badges-display-mode': 'compact' });
        el.options = ITEMS;
        el.setSelected(['js', 'ts', 'py']);
        const badges = el.shadowRoot.querySelector('.ms__badges')?.textContent ?? '';
        expect(badges).toContain('JavaScript');
        expect(badges).not.toContain('undefined');
    });

    it('partial mode renders visible badges + a "+N more" badge synchronously', () => {
        mount({
            'badges-threshold': '3',
            'badges-threshold-mode': 'partial',
            'max-visible-badge-count': '3'
        });
        el.options = ITEMS;
        el.setSelected(['js', 'ts', 'py', 'go']); // 4 > threshold 3 → partial; 3 visible → "+1 more"
        const badges = el.shadowRoot.querySelector('.ms__badges')?.textContent ?? '';
        expect(badges).toContain('JavaScript');
        expect(badges).toContain('more');
        expect(badges).not.toContain('undefined');
    });

    it('getValue reflects a selection made right after options =', () => {
        mount();
        el.options = ITEMS;
        el.setSelected(['py']);
        expect(el.selectedValue).toEqual(['py']);
    });
});
