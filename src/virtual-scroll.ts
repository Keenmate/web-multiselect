/**
 * Virtual scroll for the options list and the selected-items popover — a thin adapter over core's
 * `createVirtualWindow` (SPEC §12.26, rulebook C-CA-26): core owns the window math (visible range,
 * overscan, the full-height spacer, index → scrollTop with the container's scroll-padding); this class
 * keeps the picker's item model (`setItems` resets the scroll on a new list, a row = `renderItem(item, i)`
 * wrapped in a fixed-height `.ms__virtual-item`).
 *
 * Structure: container (overflow-y: auto) → `.km-virtual-spacer` (total height) →
 * `.km-virtual-window.ms__virtual-scroll-viewport` (translateY) → `.ms__virtual-item` rows.
 *
 * @example
 * ```typescript
 * const virtualScroll = new VirtualScroll({
 *   container: dropdownElement,
 *   itemHeight: 50,
 *   items: largeArray,
 *   renderItem: (item, index) => `<div class="option">${item.label}</div>`,
 *   bufferSize: 10
 * });
 * ```
 */

import { createVirtualWindow, type VirtualWindow } from '@keenmate/web-components-core';

export interface VirtualScrollConfig<T> {
    /** Container element with overflow-y: auto */
    container: HTMLElement;

    /** Fixed height of each item in pixels */
    itemHeight: number;

    /** Array of items to render */
    items: T[];

    /** Function that returns HTML string for each item */
    renderItem: (item: T, index: number) => string;

    /** Number of items to render above/below the viewport (default: 10) */
    bufferSize?: number;

    /** Called after the visible rows were (re)rendered — they are in the DOM */
    onVisibleRangeChange?: (start: number, end: number) => void;
}

export class VirtualScroll<T> {
    private container: HTMLElement;
    private itemHeight: number;
    private items: T[];
    private renderItem: (item: T, index: number) => string;
    private onVisibleRangeChange?: (start: number, end: number) => void;
    private window: VirtualWindow;

    constructor(config: VirtualScrollConfig<T>) {
        this.container = config.container;
        this.itemHeight = config.itemHeight;
        this.items = config.items;
        this.renderItem = config.renderItem;
        this.onVisibleRangeChange = config.onVisibleRangeChange;

        this.container.innerHTML = '';
        this.window = createVirtualWindow(this.container, {
            getCount: () => this.items.length,
            rowHeight: () => this.itemHeight,
            overscan: config.bufferSize ?? 10,
            render: ({ start, end, window }) => {
                if (!window) return;
                window.classList.add('ms__virtual-scroll-viewport');
                let html = '';
                for (let i = start; i < end; i++) {
                    html += `<div class="ms__virtual-item" style="height: ${this.itemHeight}px;" data-index="${i}">${this.renderItem(this.items[i], i)}</div>`;
                }
                window.innerHTML = html;
                // After the rows are in the DOM, so consumers can read / measure them
                // (per-row tooltips, clipped-label flags).
                this.onVisibleRangeChange?.(start, end);
            },
        });
    }

    /** Replace the items and re-render; a different list (search results) starts at the top. */
    public setItems(items: T[]): void {
        const itemsChanged = items !== this.items || items.length !== this.items.length;
        this.items = items;
        if (itemsChanged) this.container.scrollTop = 0;
        this.window.refresh();
    }

    /** Scroll the container (never the page) so row `index` shows, rendering the rows at once. */
    public scrollToIndex(index: number, block: 'start' | 'center' | 'end' | 'nearest' = 'start'): void {
        if (index < 0 || index >= this.items.length) return;
        this.window.scrollToIndex(index, { block, behavior: 'auto' });
    }

    /** The rendered range (overscan included). */
    public getVisibleRange(): { start: number; end: number } {
        return this.window.range;
    }

    public getItemCount(): number {
        return this.items.length;
    }

    /** Change the row height (a presentation switch rescales it) and re-render. */
    public setItemHeight(height: number): void {
        this.itemHeight = height;
        this.window.refresh();
    }

    /** Force a re-render of the current range. */
    public refresh(): void {
        this.window.refresh();
    }

    public destroy(): void {
        this.window.destroy();
        this.container.innerHTML = '';
    }
}
