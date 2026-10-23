import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultiSelectEngine } from '../../src/multiselect';
import type { MultiSelectConfig } from '../../src/types';

/**
 * Unit tests for in-flight request cancellation: each async searchCallback receives an
 * AbortSignal; starting a newer search (or destroying the component) aborts the previous
 * one, and aborted/stale results never overwrite the live filtered options.
 */

interface Deferred<T> { promise: Promise<T>; resolve: (v: T) => void; }
function deferred<T>(): Deferred<T> {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => { resolve = r; });
    return { promise, resolve };
}

// Flush pending microtasks (await points inside performAsyncSearch).
const flush = () => new Promise((r) => setTimeout(r, 0));

let host: HTMLDivElement;
let instance: MultiSelectEngine<any> | undefined;
let signals: AbortSignal[];
let deferreds: Deferred<any>[];
let searchCallback: ReturnType<typeof vi.fn>;

function make(): void {
    signals = [];
    deferreds = [];
    searchCallback = vi.fn(({ signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        const d = deferred<any>();
        deferreds.push(d);
        return d.promise;
    });
    const opts: Partial<MultiSelectConfig<any>> = {
        valueMember: 'value',
        displayValueMember: 'label',
        searchCallback: searchCallback as any,
        minSearchLength: 0
    };
    instance = new MultiSelectEngine(host, opts);
}

function type(value: string): Promise<void> {
    return (instance as any).handleSearch(value);
}

function filtered(): any[] {
    return (instance as any).filteredOptions;
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

describe('searchCallback AbortSignal', () => {
    it('passes a non-aborted AbortSignal as the second argument', () => {
        make();
        void type('a');
        expect(searchCallback).toHaveBeenCalledTimes(1);
        expect(signals[0]).toBeInstanceOf(AbortSignal);
        expect(signals[0].aborted).toBe(false);
    });

    it('aborts the previous in-flight request when a newer search starts', () => {
        make();
        void type('a');
        void type('ab');
        expect(signals[0].aborted).toBe(true);
        expect(signals[1].aborted).toBe(false);
    });

    it('ignores results from an aborted request, applies the live one', async () => {
        make();
        void type('a');  // request 0
        void type('ab'); // aborts 0, starts 1

        // Late-resolving the aborted request must not clobber the options.
        deferreds[0].resolve([{ value: 'stale', label: 'Stale' }]);
        await flush();
        expect(filtered().some((o) => o.value === 'stale')).toBe(false);

        // The live request's results are applied.
        deferreds[1].resolve([{ value: 'fresh', label: 'Fresh' }]);
        await flush();
        expect(filtered().map((o) => o.value)).toEqual(['fresh']);
    });

    it('aborts the in-flight request on destroy', () => {
        make();
        void type('a');
        expect(signals[0].aborted).toBe(false);
        instance!.destroy();
        expect(signals[0].aborted).toBe(true);
        instance = undefined; // already destroyed; skip afterEach teardown
    });

    it('aborts the in-flight request when the term drops below min-search-length', () => {
        signals = [];
        deferreds = [];
        searchCallback = vi.fn(({ signal }: { signal: AbortSignal }) => {
            signals.push(signal);
            const d = deferred<any>();
            deferreds.push(d);
            return d.promise;
        });
        instance = new MultiSelectEngine(host, {
            valueMember: 'value',
            displayValueMember: 'label',
            searchCallback: searchCallback as any,
            minSearchLength: 2
        });

        void type('ab');  // meets min length → request fires
        expect(signals[0].aborted).toBe(false);
        void type('a');   // below min length → abandon search
        expect(signals[0].aborted).toBe(true);
    });
});
