import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultiSelectEngine } from '../../src/multiselect';
import type { MultiSelectConfig } from '../../src/types';

/**
 * Unit tests for the beforeSelectCallback / beforeDeselectCallback interceptors.
 *
 * Exercised against the core MultiSelectEngine class on a plain <div>, driving the
 * interactive choke point directly via the private `toggleOption` (the same path
 * a click or keyboard Enter takes). `setSelected` is the programmatic path and is
 * asserted to bypass the veto.
 */

interface Item { value: string; label: string; }

const ITEMS: Item[] = [
    { value: 'item1', label: 'Item 1' },
    { value: 'item2', label: 'Item 2' },
    { value: 'item3', label: 'Item 3' }
];

const BASE: Partial<MultiSelectConfig<Item>> = {
    valueMember: 'value',
    displayValueMember: 'label',
    isMultiple: true,
    options: ITEMS
};

let host: HTMLDivElement;
let instance: MultiSelectEngine<Item> | undefined;

function make(opts: Partial<MultiSelectConfig<Item>> = {}): MultiSelectEngine<Item> {
    instance = new MultiSelectEngine<Item>(host, { ...BASE, ...opts });
    return instance;
}

function toggle(item: Item): void {
    (instance as any).toggleOption(item);
}

function selectedValues(): string[] {
    return instance!.selectedOptions.map(o => o.value);
}

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
});

afterEach(() => {
    instance?.destroy();
    instance = undefined;
    host.remove();
});

describe('beforeSelectCallback', () => {
    it('blocks a selection when the callback returns false', () => {
        // Block selecting item1 while item2 is already selected.
        make({
            beforeSelectCallback: ({ option, selectedOptions }) =>
                (option.value === 'item1' && selectedOptions.some(o => o.value === 'item2')) ? false : undefined
        });

        toggle(ITEMS[1]); // item2 → allowed
        expect(selectedValues()).toEqual(['item2']);

        toggle(ITEMS[0]); // item1 while item2 selected → blocked
        expect(selectedValues()).toEqual(['item2']);

        toggle(ITEMS[2]); // item3 → allowed (rule only targets item1)
        expect(selectedValues()).toEqual(['item2', 'item3']);
    });

    it('allows the selection when the callback returns nothing', () => {
        const calls: string[] = [];
        make({
            beforeSelectCallback: ({ option }) => { calls.push(option.value); /* undefined → allow */ }
        });

        toggle(ITEMS[0]);
        expect(selectedValues()).toEqual(['item1']);
        expect(calls).toEqual(['item1']);
    });

    it('receives the current selection BEFORE the change', () => {
        let seen: string[] | null = null;
        make({
            beforeSelectCallback: ({ selectedOptions }) => { seen = selectedOptions.map(o => o.value); }
        });

        toggle(ITEMS[1]);          // select item2 (selection was empty)
        expect(seen).toEqual([]);

        toggle(ITEMS[0]);          // select item1 (selection was [item2])
        expect(seen).toEqual(['item2']);
    });
});

describe('beforeDeselectCallback', () => {
    it('blocks a deselection when the callback returns false', () => {
        // item1 is "required" — cannot be removed once selected.
        make({
            beforeDeselectCallback: ({ option }) => (option.value === 'item1' ? false : undefined)
        });

        toggle(ITEMS[0]); // select item1
        toggle(ITEMS[1]); // select item2
        expect(selectedValues()).toEqual(['item1', 'item2']);

        toggle(ITEMS[0]); // try to remove item1 → blocked
        expect(selectedValues()).toEqual(['item1', 'item2']);

        toggle(ITEMS[1]); // remove item2 → allowed
        expect(selectedValues()).toEqual(['item1']);
    });
});

describe('single-select mode', () => {
    it('blocked selection keeps the previous value (no clobber)', () => {
        make({
            isMultiple: false,
            beforeSelectCallback: ({ option }) => (option.value === 'item3' ? false : undefined)
        });

        toggle(ITEMS[0]); // item1 → allowed
        expect(selectedValues()).toEqual(['item1']);

        toggle(ITEMS[2]); // item3 → blocked; item1 must remain
        expect(selectedValues()).toEqual(['item1']);
    });
});

describe('beforeDeselectCallback covers the badge remove (×) button', () => {
    it('blocks removing a required item via its badge ×, allows others', () => {
        make({
            beforeDeselectCallback: ({ option }) => (option.value === 'item1' ? false : undefined)
        });
        instance!.setSelected(['item1', 'item2']); // programmatic — bypasses veto

        const removeBadge = (value: string) =>
            host.querySelector<HTMLButtonElement>(`.ms__badge-remove[data-value="${value}"]`);

        // Required item's badge × is vetoed
        removeBadge('item1')!.click();
        expect(selectedValues()).toEqual(['item1', 'item2']);

        // A normal item's badge × goes through
        removeBadge('item2')!.click();
        expect(selectedValues()).toEqual(['item1']);
    });
});

describe('programmatic setSelected bypasses the veto', () => {
    it('does not consult beforeSelectCallback', () => {
        let called = false;
        make({ beforeSelectCallback: () => { called = true; return false; } });

        instance!.setSelected(['item1', 'item2']);
        expect(selectedValues()).toEqual(['item1', 'item2']);
        expect(called).toBe(false);
    });
});

describe('the before-hook ctx and contract', () => {
    it('gets one ctx: option, selection, source, controller and element', () => {
        let ctx: any = null;
        make({ beforeSelectCallback: (c) => { ctx = c; } });
        toggle(ITEMS[0]);
        expect(ctx.option.value).toBe('item1');
        expect(ctx.selectedOptions).toEqual([]);
        expect(ctx.selectedValues).toEqual([]);
        expect(ctx.source).toBe('option');
        expect(typeof ctx.controller.selectAll).toBe('function');
        expect(ctx.element).toBeInstanceOf(HTMLElement);
        // controller / element are non-enumerable — JSON sees only the data.
        expect(Object.keys(ctx)).not.toContain('controller');
        expect(Object.keys(ctx)).not.toContain('element');
    });

    it('a truthy non-false return (e.g. true or a string) does not veto — only false does', () => {
        make({ beforeSelectCallback: () => true as any });
        toggle(ITEMS[0]);
        expect(selectedValues()).toEqual(['item1']);
    });

    it('an async veto is awaited', async () => {
        make({ beforeSelectCallback: async ({ option }) => (option.value === 'item2' ? false : undefined) });
        toggle(ITEMS[0]);
        toggle(ITEMS[1]);
        expect(selectedValues()).toEqual([]); // nothing applied yet — the hooks are pending
        await new Promise(r => setTimeout(r, 0));
        expect(selectedValues()).toEqual(['item1']);
    });

    it('a throwing hook vetoes (and is logged)', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        make({ beforeSelectCallback: () => { throw new Error('boom'); } });
        toggle(ITEMS[0]);
        expect(selectedValues()).toEqual([]);
        expect(error).toHaveBeenCalled();
        error.mockRestore();
    });
});

describe('bulk gestures go through the per-option veto', () => {
    it('select-all skips vetoed options and applies the rest in one change', () => {
        const changes: any[] = [];
        make({
            beforeSelectCallback: ({ option, source }) => (option.value === 'item2' && source === 'select-all' ? false : undefined),
            onChange: (d) => changes.push(d),
        });
        instance!.getController().selectAll();
        expect(selectedValues()).toEqual(['item1', 'item3']);
        expect(changes.length).toBe(1);
    });

    it('clear-selection keeps vetoed options', () => {
        make({ beforeDeselectCallback: ({ option, source }) => (option.value === 'item1' && source === 'clear-selection' ? false : undefined) });
        instance!.setSelected(['item1', 'item2', 'item3']);
        instance!.getController().clearSelection();
        expect(selectedValues()).toEqual(['item1']);
    });

    it('the programmatic clearSelection() (form reset) bypasses the veto', () => {
        make({ beforeDeselectCallback: () => false });
        instance!.setSelected(['item1']);
        instance!.clearSelection();
        expect(selectedValues()).toEqual([]);
    });
});
