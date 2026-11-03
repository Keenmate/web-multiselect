import { describe, it, expect, afterEach } from 'vitest';
import { VirtualScroll } from '../../src/virtual-scroll';

/** VirtualScroll.scrollToIndex places the row per `block` — 'end' at the bottom (it used to act as 'start'). */

const ITEM = 30;
const VIEWPORT = 300; // 10 rows visible
let vs: VirtualScroll<number> | undefined;
let container: HTMLDivElement;

function make(): VirtualScroll<number> {
    container = document.createElement('div');
    document.body.appendChild(container);
    // happy-dom has no layout: give the viewport a height
    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => VIEWPORT });
    vs = new VirtualScroll<number>({ container, itemHeight: ITEM, items: Array.from({ length: 100 }, (_, i) => i), renderItem: (i) => `<div>${i}</div>` });
    return vs;
}

afterEach(() => {
    vs?.destroy();
    vs = undefined;
    container.remove();
});

describe('VirtualScroll.scrollToIndex block', () => {
    it('start puts the row at the top', () => {
        make().scrollToIndex(50, 'start');
        expect(container.scrollTop).toBe(50 * ITEM);
    });

    it('center centres the row', () => {
        make().scrollToIndex(50, 'center');
        expect(container.scrollTop).toBe(50 * ITEM - (VIEWPORT - ITEM) / 2);
    });

    it('end puts the row at the bottom', () => {
        make().scrollToIndex(50, 'end');
        expect(container.scrollTop).toBe(51 * ITEM - VIEWPORT);
    });

    it('nearest leaves a visible row alone and moves an off-screen one to the closer edge', () => {
        const v = make();
        v.scrollToIndex(50, 'end');
        const before = container.scrollTop;
        v.scrollToIndex(45, 'nearest'); // visible
        expect(container.scrollTop).toBe(before);
        v.scrollToIndex(80, 'nearest'); // below → bottom edge
        expect(container.scrollTop).toBe(81 * ITEM - VIEWPORT);
    });
});
