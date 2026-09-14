/**
 * Virtual Scroll Implementation
 *
 * Renders only visible items in the viewport for optimal performance with large datasets.
 * Based on fixed-height items for fast offset calculations.
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

export interface VirtualScrollConfig<T> {
    /** Container element with overflow-y: auto */
    container: HTMLElement;

    /** Fixed height of each item in pixels (required for performance) */
    itemHeight: number;

    /** Array of items to render */
    items: T[];

    /** Function that returns HTML string for each item */
    renderItem: (item: T, index: number) => string;

    /** Number of items to render above/below viewport (default: 10) */
    bufferSize?: number;

    /** Optional callback when visible range changes */
    onVisibleRangeChange?: (start: number, end: number) => void;

    /** Optional callback on scroll */
    onScroll?: (scrollTop: number) => void;
}

export class VirtualScroll<T> {
    private container: HTMLElement;
    private wrapper: HTMLDivElement;
    private viewport: HTMLDivElement;
    private itemHeight: number;
    private items: T[];
    private renderItem: (item: T, index: number) => string;
    private bufferSize: number;
    private onVisibleRangeChange?: (start: number, end: number) => void;
    private onScroll?: (scrollTop: number) => void;

    private scrollTop = 0;
    private viewportHeight = 0;
    private visibleStart = 0;
    private visibleEnd = 0;

    private scrollHandler: () => void;
    private resizeObserver?: ResizeObserver;

    constructor(config: VirtualScrollConfig<T>) {
        this.container = config.container;
        this.itemHeight = config.itemHeight;
        this.items = config.items;
        this.renderItem = config.renderItem;
        this.bufferSize = config.bufferSize ?? 10;
        this.onVisibleRangeChange = config.onVisibleRangeChange;
        this.onScroll = config.onScroll;

        // Bind scroll handler
        this.scrollHandler = this.handleScroll.bind(this);

        // Initialize DOM structure
        this.init();
    }

    /**
     * Initialize virtual scroll DOM structure
     *
     * Structure:
     * container (overflow-y: auto)
     *   └─ wrapper (height: totalItems * itemHeight)
     *      └─ viewport (position: absolute, top: 0)
     *         └─ items (position: absolute, top: index * itemHeight)
     */
    private init(): void {
        // Clear container
        this.container.innerHTML = '';

        // Create wrapper (sets total scrollable height)
        this.wrapper = document.createElement('div');
        this.wrapper.style.position = 'relative';
        this.wrapper.style.width = '100%';
        this.wrapper.style.height = `${this.items.length * this.itemHeight}px`;
        this.wrapper.className = 'ms__virtual-scroll-wrapper';

        // Create viewport (holds visible items)
        this.viewport = document.createElement('div');
        this.viewport.style.position = 'absolute';
        this.viewport.style.top = '0';
        this.viewport.style.left = '0';
        this.viewport.style.right = '0';
        this.viewport.style.width = '100%';
        this.viewport.className = 'ms__virtual-scroll-viewport';

        // Assemble structure
        this.wrapper.appendChild(this.viewport);
        this.container.appendChild(this.wrapper);

        // Setup event listeners
        this.container.addEventListener('scroll', this.scrollHandler);

        // Watch for container size changes
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateViewportHeight();
                this.render();
            });
            this.resizeObserver.observe(this.container);
        }

        // Initial render
        this.updateViewportHeight();
        this.render();
    }

    /**
     * Update viewport height (visible area)
     */
    private updateViewportHeight(): void {
        const newHeight = this.container.clientHeight;
        // Only update if we have a valid height (prevent 0 height from breaking rendering)
        if (newHeight > 0) {
            this.viewportHeight = newHeight;
        }
    }

    /**
     * Handle scroll event
     */
    private handleScroll(): void {
        this.scrollTop = this.container.scrollTop;

        // Call optional scroll callback
        if (this.onScroll) {
            this.onScroll(this.scrollTop);
        }

        // Re-render if visible range changed
        this.render();
    }

    /**
     * Calculate visible range based on scroll position
     */
    private calculateVisibleRange(): { start: number; end: number } {
        // Calculate indices for visible area
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.ceil((this.scrollTop + this.viewportHeight) / this.itemHeight);

        // Add buffer zone for smooth scrolling
        const bufferedStart = Math.max(0, startIndex - this.bufferSize);
        const bufferedEnd = Math.min(this.items.length, endIndex + this.bufferSize);

        return { start: bufferedStart, end: bufferedEnd };
    }

    /**
     * Render visible items
     */
    private render(): void {
        const { start, end } = this.calculateVisibleRange();

        // Skip if range hasn't changed
        if (start === this.visibleStart && end === this.visibleEnd) {
            return;
        }

        this.visibleStart = start;
        this.visibleEnd = end;

        // Build HTML for visible items
        let html = '';
        for (let i = start; i < end; i++) {
            const item = this.items[i];
            const itemHtml = this.renderItem(item, i);

            // Wrap with positioned container
            const top = i * this.itemHeight;
            html += `<div class="ms__virtual-item" style="position: absolute; top: ${top}px; left: 0; right: 0; height: ${this.itemHeight}px;" data-index="${i}">`;
            html += itemHtml;
            html += '</div>';
        }

        // Update viewport
        this.viewport.innerHTML = html;

        // Fire the range-change callback AFTER the new rows are in the DOM, so
        // consumers can read/measure them (e.g. attach per-row tooltips, flag
        // clipped labels). Firing it before innerHTML would hand them the previous
        // frame's rows — or nothing on the first render.
        if (this.onVisibleRangeChange) {
            this.onVisibleRangeChange(start, end);
        }
    }

    /**
     * Update items and re-render
     */
    public setItems(items: T[]): void {
        // Check if items actually changed (different array or different length)
        const itemsChanged = items !== this.items || items.length !== this.items.length;

        this.items = items;

        // Update wrapper height
        this.wrapper.style.height = `${items.length * this.itemHeight}px`;

        // Update viewport height (container dimensions may have changed)
        this.updateViewportHeight();

        // Only reset scroll position when items actually change (e.g., search results)
        // Don't reset when just re-rendering with same items (e.g., focus change)
        if (itemsChanged) {
            this.scrollTop = 0;
            this.container.scrollTop = 0;
        }

        // Reset visible range to force re-render
        this.visibleStart = -1;
        this.visibleEnd = -1;

        // Re-render
        this.render();
    }

    /**
     * Scroll to make item at index visible (like scrollIntoView with block: 'nearest')
     * Only scrolls if item is outside visible area, and scrolls minimally
     */
    public scrollToIndex(index: number, block: 'start' | 'center' | 'nearest' = 'start'): void {
        if (index < 0 || index >= this.items.length) {
            return;
        }

        // Refresh the height first — right after open() the container may not have been measured
        // yet, and a stale (or 0) viewportHeight throws off the center/nearest math.
        this.updateViewportHeight();

        const itemTop = index * this.itemHeight;
        const itemBottom = itemTop + this.itemHeight;
        const maxScroll = Math.max(0, this.items.length * this.itemHeight - this.viewportHeight);

        let target: number;
        if (block === 'center') {
            target = itemTop - (this.viewportHeight - this.itemHeight) / 2;
        } else if (block === 'nearest') {
            const viewportTop = this.container.scrollTop;
            const viewportBottom = viewportTop + this.viewportHeight;
            if (itemTop >= viewportTop && itemBottom <= viewportBottom) return; // already fully visible
            target = itemTop < viewportTop ? itemTop : itemBottom - this.viewportHeight;
        } else {
            // 'start' — deterministic: put the item at the top of the viewport.
            target = itemTop;
        }

        target = Math.max(0, Math.min(target, maxScroll));

        // Set scrollTop AND sync our cached value + re-render synchronously, rather than waiting
        // for the async 'scroll' event — so the correct rows are in place immediately.
        this.container.scrollTop = target;
        this.scrollTop = target;
        this.render();
    }

    /**
     * Get currently visible range
     */
    public getVisibleRange(): { start: number; end: number } {
        return { start: this.visibleStart, end: this.visibleEnd };
    }

    /**
     * Get total number of items
     */
    public getItemCount(): number {
        return this.items.length;
    }

    /**
     * Update item height and re-render
     */
    public setItemHeight(height: number): void {
        this.itemHeight = height;
        this.wrapper.style.height = `${this.items.length * height}px`;
        this.visibleStart = -1;
        this.visibleEnd = -1;
        this.render();
    }

    /**
     * Update buffer size
     */
    public setBufferSize(size: number): void {
        this.bufferSize = size;
        this.visibleStart = -1;
        this.visibleEnd = -1;
        this.render();
    }

    /**
     * Refresh/force re-render
     */
    public refresh(): void {
        this.visibleStart = -1;
        this.visibleEnd = -1;
        this.render();
    }

    /**
     * Cleanup and remove event listeners
     */
    public destroy(): void {
        this.container.removeEventListener('scroll', this.scrollHandler);

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Clear container
        this.container.innerHTML = '';
    }
}
