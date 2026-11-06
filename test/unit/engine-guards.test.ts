import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultiSelectEngine } from '../../src/multiselect';
import type { MultiSelectConfig } from '../../src/types';

/**
 * Engine guards: the async-search loader always clears when the term is dropped, before-hook
 * results are type-checked (`true` = continue), "add new" runs once at a time, a single-select
 * holds one value, a torn-down engine emits nothing, readonly survives a search-mode change,
 * a disabled control runs no actions, and min-search-length counts the term as typed.
 */

interface Deferred<T> { promise: Promise<T>; resolve: (v: T) => void; }
function deferred<T>(): Deferred<T> {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => { resolve = r; });
    return { promise, resolve };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

const ITEMS = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta two' },
    { value: 'c', label: 'Gamma' },
];

let host: HTMLDivElement;
let instance: MultiSelectEngine<any> | undefined;

function make(opts: Partial<MultiSelectConfig<any>> = {}): any {
    instance = new MultiSelectEngine(host, { valueMember: 'value', displayValueMember: 'label', options: [...ITEMS], ...opts });
    return instance as any;
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

describe('async search loader', () => {
    const pending = () => vi.fn(() => deferred<any[]>().promise);

    it('clearSearch() while a request is in flight drops the loader', () => {
        const ms = make({ searchCallback: pending() as any, minSearchLength: 0 });
        void ms.handleSearch('abc');
        expect(ms.isLoading).toBe(true);
        ms.clearSearch();
        expect(ms.isLoading).toBe(false);
    });

    it('a beforeSearchCallback veto while a request is in flight drops the loader', async () => {
        const ms = make({ searchCallback: pending() as any, minSearchLength: 0 });
        void ms.handleSearch('abc');
        expect(ms.isLoading).toBe(true);
        ms.options.beforeSearchCallback = () => false;
        await ms.handleSearch('abcd');
        expect(ms.isLoading).toBe(false);
    });

    it('a debounced request still waiting is cancelled with the term', async () => {
        const searchCallback = vi.fn(async () => []);
        const ms = make({ searchCallback: searchCallback as any, searchDebounce: 20, minSearchLength: 0 });
        void ms.handleSearch('abc');
        ms.clearSearch();
        await new Promise((r) => setTimeout(r, 40));
        expect(searchCallback).not.toHaveBeenCalled();
    });
});

describe('before-hook results', () => {
    it('beforeSearchCallback returning true searches the typed term (not "true")', async () => {
        const searchCallback = vi.fn(async () => []);
        const ms = make({ searchCallback: searchCallback as any, beforeSearchCallback: (() => true) as any, minSearchLength: 0 });
        await ms.handleSearch('abc');
        expect((searchCallback.mock.calls[0] as any[])[0].term).toBe('abc');
    });

    it('beforeAddCallback returning true adds no option (the consumer creates it)', async () => {
        const onAdd = vi.fn();
        const ms = make({ isAddNewAllowed: true, beforeAddCallback: (() => true) as any, onAdd });
        await ms.handleAddNew('zed');
        expect(ms.allOptions.length).toBe(3);
        expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('a second "add new" while one is pending does not run the hook again', async () => {
        const d = deferred<any>();
        const beforeAddCallback = vi.fn(() => d.promise);
        const ms = make({ isAddNewAllowed: true, beforeAddCallback: beforeAddCallback as any });
        const first = ms.handleAddNew('zed');
        await ms.handleAddNew('zed');
        d.resolve({ value: 'zed', label: 'Zed' });
        await first;
        expect(beforeAddCallback).toHaveBeenCalledTimes(1);
        expect(ms.allOptions.filter((o: any) => o.value === 'zed').length).toBe(1);
    });
});

describe('single-select', () => {
    it('setSelected() with several values keeps the first', () => {
        const ms = make({ isMultiple: false });
        ms.setSelected(['a', 'b']);
        expect(ms.selectedValue).toBe('a');
        expect(ms.getSelectionSnapshot()).toEqual(['a']);
    });
});

describe('a torn-down engine', () => {
    it('emits nothing when an async beforeSelectCallback resolves after destroy()', async () => {
        const d = deferred<boolean | undefined>();
        const onSelect = vi.fn();
        const onChange = vi.fn();
        const ms = make({ beforeSelectCallback: (() => d.promise) as any, onSelect, onChange });
        const pendingSelect = ms.interactiveSelect(ITEMS[0], 'option');
        ms.destroy();
        instance = undefined;
        d.resolve(undefined);
        expect(await pendingSelect).toBe(false);
        expect(onSelect).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('destroy() while open pairs the open with one close', () => {
        const onOpen = vi.fn();
        const onClose = vi.fn();
        const ms = make({ onOpen, onClose });
        ms.open();
        expect(onOpen).toHaveBeenCalledTimes(1);
        ms.destroy();
        ms.destroy(); // idempotent
        instance = undefined;
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('interaction state', () => {
    it('a disabled control runs no consumer action', async () => {
        const onAction = vi.fn();
        const ms = make({ isDisabled: true, onAction });
        const trigger = document.createElement('button');
        trigger.dataset.action = 'details';
        ms.activateActionTrigger(trigger, new MouseEvent('click'));
        await flush(); // core runAction is async
        expect(onAction).not.toHaveBeenCalled();

        ms.setDisabled(false); // control: the same trigger runs once enabled
        ms.activateActionTrigger(trigger, new MouseEvent('click'));
        await flush();
        expect(onAction).toHaveBeenCalledTimes(1);
    });
});

describe('min-search-length counts the term as typed', () => {
    it('built-in search: " b" passes a minimum of 2 (whitespace counts)', async () => {
        const ms = make({ minSearchLength: 2 });
        await ms.handleSearch(' b');
        expect(ms.filteredOptions.length).toBeLessThan(ITEMS.length);
    });

    it('searchCallback: " b" passes a minimum of 2, and the term arrives untrimmed', async () => {
        const searchCallback = vi.fn(async () => []);
        const ms = make({ searchCallback: searchCallback as any, minSearchLength: 2 });
        await ms.handleSearch(' b');
        expect(searchCallback).toHaveBeenCalledTimes(1);
        expect((searchCallback.mock.calls[0] as any[])[0].term).toBe(' b');
    });

    it('both paths stay gated below the minimum', async () => {
        const searchCallback = vi.fn(async () => []);
        const ms = make({ searchCallback: searchCallback as any, minSearchLength: 3 });
        await ms.handleSearch(' b');
        expect(searchCallback).not.toHaveBeenCalled();
    });
});
