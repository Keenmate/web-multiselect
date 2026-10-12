import { describe, it, expect, afterEach } from 'vitest';
import '../../src/web-component'; // registers <web-multiselect>

/**
 * Unit tests for `reserve-icon-slot` (config `isIconSlotReserved`).
 *
 * The icon slot (`.ms__option-icon`) is a fixed-width box rendered before the label.
 * By default it's drawn ONLY on rows that have an icon, so a list mixing icon and
 * icon-less rows gets ragged label starts. With `reserve-icon-slot` on, every row
 * renders the slot — an empty placeholder (`.ms__option-icon--empty`) on icon-less
 * rows — so all labels share one start column. The knob is option-level (works on a
 * flat list and in tree mode) and applies in place (`on: 'update'`).
 */

const FLAT = [
    { value: 'a', label: 'Apple',  icon: '🍎' },
    { value: 'b', label: 'Banana' },            // no icon
    { value: 'c', label: 'Cherry', icon: '🍒' }
];

const TREE = [
    { value: 'fruit', label: 'Fruit', path: '1', icon: '📁' },
    { value: 'apple', label: 'Apple', path: '1.1' },          // no icon
    { value: 'pear',  label: 'Pear',  path: '1.2', icon: '🍐' }
];

let el: any;

function rows(): HTMLElement[] {
    return Array.from(el.shadowRoot.querySelectorAll('.ms__option')) as HTMLElement[];
}
function iconSpan(row: HTMLElement) {
    return row.querySelector('.ms__option-icon');
}

afterEach(() => el?.remove());

describe('reserve-icon-slot — flat list', () => {
    function build(reserve: boolean) {
        el = document.createElement('web-multiselect');
        el.setAttribute('value-member', 'value');
        el.setAttribute('display-value-member', 'label');
        el.setAttribute('icon-member', 'icon');
        if (reserve) el.setAttribute('reserve-icon-slot', 'true');
        document.body.appendChild(el);
        el.options = FLAT;
        el.open(); // options render into the dropdown only while it's open
    }

    it('default: icon-less rows render NO icon slot', () => {
        build(false);
        const [apple, banana, cherry] = rows();
        expect(iconSpan(apple)).not.toBeNull();
        expect(iconSpan(banana)).toBeNull();
        expect(iconSpan(cherry)).not.toBeNull();
    });

    it('reserved: every row renders a slot; icon-less ones are empty placeholders', () => {
        build(true);
        const [apple, banana, cherry] = rows();
        // icon'd rows keep the real icon (not the empty modifier)
        expect(iconSpan(apple)).not.toBeNull();
        expect(iconSpan(apple)!.classList.contains('ms__option-icon--empty')).toBe(false);
        expect(iconSpan(apple)!.textContent).toBe('🍎');
        // icon-less row now has the reserved, empty slot
        const emptySlot = iconSpan(banana);
        expect(emptySlot).not.toBeNull();
        expect(emptySlot!.classList.contains('ms__option-icon--empty')).toBe(true);
        expect(emptySlot!.textContent).toBe('');
        expect(emptySlot!.getAttribute('aria-hidden')).toBe('true');
        expect(iconSpan(cherry)!.classList.contains('ms__option-icon--empty')).toBe(false);
    });

    it('applies in place — flipping the attribute live re-renders without rebuild', async () => {
        build(false);
        expect(iconSpan(rows()[1])).toBeNull();            // Banana: no slot
        el.setAttribute('reserve-icon-slot', 'true');
        await Promise.resolve();                           // attribute reactivity is microtask-coalesced
        const slot = iconSpan(rows()[1]);
        expect(slot).not.toBeNull();
        expect(slot!.classList.contains('ms__option-icon--empty')).toBe(true);
        // and back off again
        el.setAttribute('reserve-icon-slot', 'false');
        await Promise.resolve();
        expect(iconSpan(rows()[1])).toBeNull();
    });
});

describe('reserve-icon-slot — tree mode', () => {
    function build(reserve: boolean) {
        el = document.createElement('web-multiselect');
        el.setAttribute('value-member', 'value');
        el.setAttribute('display-value-member', 'label');
        el.setAttribute('path-member', 'path');
        el.setAttribute('icon-member', 'icon');
        el.setAttribute('multiple', 'true');
        if (reserve) el.setAttribute('reserve-icon-slot', 'true');
        document.body.appendChild(el);
        el.options = TREE;
        el.open();
    }

    function rowByPath(path: string): HTMLElement {
        return rows().find(r => r.dataset.path === path)!;
    }

    it('default: icon-less tree node renders no slot', () => {
        build(false);
        expect(iconSpan(rowByPath('1.1'))).toBeNull();
        expect(iconSpan(rowByPath('1'))).not.toBeNull();
    });

    it('reserved: icon-less tree node gets an empty placeholder slot', () => {
        build(true);
        const slot = iconSpan(rowByPath('1.1'));
        expect(slot).not.toBeNull();
        expect(slot!.classList.contains('ms__option-icon--empty')).toBe(true);
        expect(iconSpan(rowByPath('1'))!.textContent).toBe('📁');
    });
});
