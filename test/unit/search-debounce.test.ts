import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultiSelectEngine } from '../../src/multiselect';
import type { MultiSelectConfig } from '../../src/types';

/**
 * Unit tests for searchDebounce — debouncing the async searchCallback so a burst of
 * keystrokes collapses into a single request. Default 0 keeps the per-keystroke behavior.
 */

let host: HTMLDivElement;
let instance: MultiSelectEngine<any> | undefined;
let searchCallback: ReturnType<typeof vi.fn>;

function make(debounce: number): void {
    searchCallback = vi.fn(async ({ term }: { term: string }) => [{ value: term, label: term }]);
    const opts: Partial<MultiSelectConfig<any>> = {
        valueMember: 'value',
        displayValueMember: 'label',
        searchCallback: searchCallback as any,
        searchDebounce: debounce,
        minSearchLength: 0
    };
    instance = new MultiSelectEngine(host, opts);
}

// handleSearch is private; reach it directly to drive the search path without DOM event plumbing.
function type(value: string): Promise<void> {
    return (instance as any).handleSearch(value);
}

beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.appendChild(host);
});

afterEach(() => {
    instance?.destroy();
    instance = undefined;
    host.remove();
    vi.useRealTimers();
});

describe('searchDebounce = 0 (default)', () => {
    it('fires the callback on every keystroke', async () => {
        make(0);
        await type('a');
        await type('ab');
        expect(searchCallback).toHaveBeenCalledTimes(2);
    });
});

describe('searchDebounce > 0', () => {
    it('collapses a burst of keystrokes into a single call with the latest term', async () => {
        make(200);
        type('a');
        type('ab');
        type('abc');
        expect(searchCallback).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(200);
        expect(searchCallback).toHaveBeenCalledTimes(1);
        expect(searchCallback).toHaveBeenCalledWith(expect.objectContaining({ term: 'abc', signal: expect.any(AbortSignal), searchTerm: 'abc' }));
    });

    it('resets the timer on each keystroke (no early fire)', async () => {
        make(200);
        type('a');
        await vi.advanceTimersByTimeAsync(150); // not enough on its own
        expect(searchCallback).not.toHaveBeenCalled();

        type('ab');                              // resets the 200ms window
        await vi.advanceTimersByTimeAsync(150);
        expect(searchCallback).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(50);   // now the full window elapses
        expect(searchCallback).toHaveBeenCalledTimes(1);
        expect(searchCallback).toHaveBeenCalledWith(expect.objectContaining({ term: 'ab', signal: expect.any(AbortSignal), searchTerm: 'ab' }));
    });

    it('does not debounce local (non-async) filtering', async () => {
        // No searchCallback → local path runs synchronously regardless of searchDebounce.
        instance = new MultiSelectEngine(host, {
            valueMember: 'value',
            displayValueMember: 'label',
            options: [{ value: 'apple', label: 'Apple' }, { value: 'banana', label: 'Banana' }],
            searchDebounce: 500
        });
        await type('app');
        expect((instance as any).filteredOptions).toHaveLength(1);
        expect((instance as any).filteredOptions[0].value).toBe('apple');
    });
});
