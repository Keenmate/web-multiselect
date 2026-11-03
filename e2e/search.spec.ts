import { test, expect, Page, Locator } from './fixtures';

/**
 * Section 3 — search behavior.
 *
 * Fixture: test/search.html.
 */

const PAGE = '/test/search.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function input(p: Locator): Locator {
    return p.locator('.ms__input');
}

async function openDropdown(p: Locator): Promise<void> {
    await input(p).click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

function visibleOptions(p: Locator): Locator {
    return p.locator('.ms__option:visible');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('filter mode (default)', () => {
    test('non-matching options are hidden as user types', async ({ page }) => {
        const p = picker(page, 'filter');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText(/Cherry/i);
    });

    test('clearing search restores all options', async ({ page }) => {
        const p = picker(page, 'filter');
        await openDropdown(p);

        await input(p).fill('ch');
        await input(p).fill('');
        await expect(visibleOptions(p)).toHaveCount(5);
    });
});

test.describe('navigate mode', () => {
    test('all options remain visible while searching', async ({ page }) => {
        const p = picker(page, 'navigate');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(5);
    });

    test('matched options receive --matched class', async ({ page }) => {
        const p = picker(page, 'navigate');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(p.locator('.ms__option--matched')).toHaveCount(1);
    });

    // Regression: the current match's leading accent bar used to be a real
    // `border-inline-start` on the row, which — with the option's box model — shoved the
    // checkbox/label ~3px inward the moment a row became matched, so content "jumped" as
    // focus stepped between matches. The bar is now an out-of-flow ::before overlay, so a
    // row becoming matched must NOT move its checkbox horizontally.
    test('a row becoming matched does not shift its checkbox (no border reflow)', async ({ page }) => {
        const p = picker(page, 'navigate');
        await openDropdown(p);

        // "Cherry" is the sole match for "ch"; grab its row before it's matched.
        const cherry = p.locator('.ms__option', { hasText: 'Cherry' });
        const checkbox = cherry.locator('.ms__checkbox');
        const leftBefore = await checkbox.evaluate(el => el.getBoundingClientRect().left);
        await expect(cherry).not.toHaveClass(/ms__option--matched/);

        await input(p).fill('ch');
        await expect(cherry).toHaveClass(/ms__option--matched/);

        const leftAfter = await checkbox.evaluate(el => el.getBoundingClientRect().left);
        expect(Math.abs(leftAfter - leftBefore)).toBeLessThan(0.5); // no horizontal jump

        // ...but the accent bar is still drawn — as the ::before overlay, not a row border.
        const barWidth = await cherry.evaluate(el =>
            getComputedStyle(el, '::before').borderInlineStartWidth);
        expect(parseFloat(barWidth)).toBeGreaterThan(0);
    });
});

test.describe('navigate mode — fullscreen match navigator', () => {
    // The fullscreen overlay covers the main input; its own header search + the
    // match navigator (count + prev/next) take over. Touch has no Ctrl+Arrow, so
    // these buttons are the on-screen way to step through matches.
    const fsSearch = (p: Locator) => p.locator('.ms__fullscreen-search');
    const nav = (p: Locator) => p.locator('.ms__fullscreen-nav');
    const navCount = (p: Locator) => p.locator('.ms__fullscreen-nav-count');

    async function openFullscreen(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
    }

    test('navigator is hidden until a search term is entered', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);
        await expect(nav(p)).toBeHidden();
    });

    test('shows "1 of N" once a term matches, all options stay visible', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);

        // "e" matches Apple, Cherry, Date, Elderberry (4 of 5).
        await fsSearch(p).fill('e');
        await expect(nav(p)).toBeVisible();
        await expect(navCount(p)).toHaveText('1 of 4');
        await expect(visibleOptions(p)).toHaveCount(5);
    });

    test('next/prev buttons step focus through matches and update the count', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);

        await fsSearch(p).fill('e');
        await expect(navCount(p)).toHaveText('1 of 4');

        await p.locator('.ms__fullscreen-nav-btn--next').click();
        await expect(navCount(p)).toHaveText('2 of 4');

        await p.locator('.ms__fullscreen-nav-btn--prev').click();
        await expect(navCount(p)).toHaveText('1 of 4');
    });

    test('no matches disables the step buttons', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);

        await fsSearch(p).fill('zzzz');
        await expect(nav(p)).toBeVisible();
        await expect(p.locator('.ms__fullscreen-nav-btn--next')).toBeDisabled();
        await expect(p.locator('.ms__fullscreen-nav-btn--prev')).toBeDisabled();
    });

    // Regression: a below-the-fold match must be scrolled to the CENTRE of the sheet's
    // list, not bottom-aligned (block:'nearest'). On a phone the bottom edge sits behind
    // the soft keyboard, so a bottom-aligned match "scrolls" but lands hidden. We can't
    // raise a real keyboard here, but we can assert the match lands centred (~0.5 down
    // the scroller) rather than jammed at the bottom (~0.9+), which is the fix.
    test('a deep match is centred in the fullscreen list, not bottom-aligned', async ({ page }) => {
        const p = picker(page, 'navigate-fs-big');
        await openFullscreen(p);

        await fsSearch(p).fill('Item 25'); // unique match well below the first screenful
        await expect(p.locator('.ms__option--focused')).toContainText('Item 25');

        const frac = await p.evaluate(() => {
            const root = (document.querySelector('#navigate-fs-big') as any).shadowRoot;
            const scroller = root.querySelector('.ms__options') as HTMLElement;
            const focused = root.querySelector('.ms__option--focused') as HTMLElement;
            const s = scroller.getBoundingClientRect();
            const f = focused.getBoundingClientRect();
            // Vertical position of the focused row's centre within the scroller (0=top, 1=bottom).
            return ((f.top + f.height / 2) - s.top) / s.height;
        });
        expect(frac).toBeGreaterThan(0.25);
        expect(frac).toBeLessThan(0.75); // centred, NOT bottom-aligned (would be ~0.9+)
    });

    // The phone Back gesture/button should close the sheet, not navigate the page away.
    // Opening the fullscreen sheet pushes a history entry; a back navigation pops it and
    // closes the overlay instead of leaving the page.
    test('Back gesture closes the fullscreen sheet instead of navigating away', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        const url = page.url();
        const lenBefore = await page.evaluate(() => history.length);

        await openFullscreen(p);
        // A history entry was pushed for the open overlay.
        expect(await page.evaluate(() => history.length)).toBe(lenBefore + 1);

        // Same-document back navigation (what the Back gesture triggers).
        await page.evaluate(() => history.back());

        await expect(p.locator('.ms__dropdown--fullscreen')).toBeHidden();
        await expect(p.locator('.ms__dropdown--visible')).toHaveCount(0);
        expect(page.url()).toBe(url); // still on the page, no navigation away
    });

    // A programmatic close (✕) consumes the pushed entry, so it doesn't leave a history
    // trap. The overlay entry carries a marker in history.state; while open it's the
    // current entry, and after ✕ the current entry is no longer the overlay's (we moved
    // back off it via history.back()).
    const onOverlayEntry = (page: Page) =>
        page.evaluate(() => !!(history.state && (history.state as any).msOverlay));

    test('closing via the ✕ button consumes the pushed history entry', async ({ page }) => {
        const p = picker(page, 'navigate-fs');

        await openFullscreen(p);
        expect(await onOverlayEntry(page)).toBe(true); // sitting on the pushed entry

        await p.locator('.ms__fullscreen-close').click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeHidden();

        await expect.poll(() => onOverlayEntry(page)).toBe(false); // moved back off it
    });

    // Regression: selecting an option in the fullscreen sheet used to call
    // this.input.focus() (to keep desktop arrow-key nav working). That input is the
    // control field hidden behind the overlay — focusing it popped the soft keyboard
    // on every tap and made the keyboard-inset observer shrink the sheet ("blink").
    // In fullscreen the select must NOT move focus to the underlying input.
    test('selecting an option does not focus the underlying control input', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);

        // Keyboard-off default: no field is focused right after open.
        const focusedAfterOpen = await p.evaluate((host: any) =>
            host.shadowRoot?.activeElement?.className ?? null);
        expect(focusedAfterOpen ?? '').not.toContain('ms__input');

        await p.locator('.ms__option').first().click();
        await expect(p.locator('.ms__option--selected')).toHaveCount(1); // the select happened

        // The tap must not have focused the hidden control input.
        const focusedAfterSelect = await p.evaluate((host: any) =>
            host.shadowRoot?.activeElement?.className ?? null);
        expect(focusedAfterSelect ?? '').not.toContain('ms__input');
    });
});

test.describe('fullscreen selected-items popover — Back-gesture guard', () => {
    // The selected-items popover goes fullscreen on phones too. Like the options sheet it
    // must push a history entry on open, so the phone Back gesture CLOSES the popover
    // instead of navigating the page away. Regression: it used to skip the guard entirely,
    // so a Back gesture fired a real history(-1) and left the page.
    const popover = (p: Locator) => p.locator('.ms__selected-popover--fullscreen');

    async function openPopoverFullscreen(p: Locator): Promise<void> {
        // count mode renders a counter badge carrying data-ms-action="show-selected".
        await p.locator('[data-ms-action="show-selected"]').first().click();
        await expect(popover(p)).toBeVisible();
    }

    test('Back gesture closes the popover instead of navigating away', async ({ page }) => {
        const p = picker(page, 'popover-fs');
        const url = page.url();
        const lenBefore = await page.evaluate(() => history.length);

        await openPopoverFullscreen(p);
        // A history entry was pushed for the open overlay.
        expect(await page.evaluate(() => history.length)).toBe(lenBefore + 1);

        // Same-document back navigation (what the Back gesture triggers).
        await page.evaluate(() => history.back());

        await expect(p.locator('.ms__selected-popover--visible')).toHaveCount(0);
        expect(page.url()).toBe(url); // still on the page, no navigation away
    });

    test('closing via the ✕ button consumes the pushed history entry', async ({ page }) => {
        const p = picker(page, 'popover-fs');
        const onOverlayEntry = () =>
            page.evaluate(() => !!(history.state && (history.state as any).msOverlay));

        await openPopoverFullscreen(p);
        expect(await onOverlayEntry()).toBe(true); // sitting on the pushed entry

        await p.locator('.ms__selected-popover-close').click();
        await expect(p.locator('.ms__selected-popover--visible')).toHaveCount(0);

        await expect.poll(() => onOverlayEntry()).toBe(false); // moved back off it
    });
});

test.describe('fullscreen — host-page overflow clamp', () => {
    // A host page that overflows horizontally makes the mobile browser shrink-to-fit
    // (zoom out), which desyncs the `position: fixed` sheet from the physical screen so
    // its top slips under the system bar. Opening a fullscreen sheet clamps <html>'s
    // overflow-x to remove that zoom; closing restores the prior inline value.
    const htmlOverflowX = (page: Page) =>
        page.evaluate(() => document.documentElement.style.overflowX);

    test('clamps <html> overflow-x while open, restores it on close', async ({ page }) => {
        const p = picker(page, 'navigate-fs');

        const before = await htmlOverflowX(page); // whatever the page had (here: unset)

        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
        expect(await htmlOverflowX(page)).toBe('hidden');

        await p.locator('.ms__fullscreen-close').click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeHidden();
        expect(await htmlOverflowX(page)).toBe(before); // restored, not left clamped
    });
});

test.describe('fullscreen search — inline clear (✕)', () => {
    // The fullscreen sheet opens with the keyboard closed; touch has no Escape to
    // reset a search, so the header search carries an inline ✕ that clears the term.
    const fsSearch = (p: Locator) => p.locator('.ms__fullscreen-search');
    const clear = (p: Locator) => p.locator('.ms__fullscreen-search-clear');

    async function openFullscreen(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
    }

    test('clear button is hidden until a term is entered', async ({ page }) => {
        const p = picker(page, 'navigate-fs');
        await openFullscreen(p);
        await expect(clear(p)).toBeHidden();

        await fsSearch(p).fill('ch');
        await expect(clear(p)).toBeVisible();
    });

    test('clicking clear empties the field and resets the results', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreen(p);

        // Filter mode narrows the list; "ch" leaves only Cherry.
        await fsSearch(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(clear(p)).toBeVisible();

        await clear(p).click();

        await expect(fsSearch(p)).toHaveValue('');
        await expect(visibleOptions(p)).toHaveCount(5); // full list restored
        await expect(clear(p)).toBeHidden();             // hides itself again
    });

    test('clear keeps focus on the search field so typing can continue', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreen(p);

        await fsSearch(p).fill('ch');
        await clear(p).click();

        const focused = await p.evaluate((host: any) =>
            host.shadowRoot?.activeElement?.className ?? null);
        expect(focused ?? '').toContain('ms__fullscreen-search');
    });
});

test.describe('fullscreen search — keyboard dismissal', () => {
    // The soft keyboard is tied 1:1 to focus on the header search input; there's no
    // real keyboard in headless chromium, so we assert its proxy — after each
    // "done typing" gesture the search input must no longer be the shadow root's
    // activeElement (a blur is what tucks the keyboard away on a device).
    const fsSearch = (p: Locator) => p.locator('.ms__fullscreen-search');

    async function openFullscreenFocused(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
        await fsSearch(p).fill('e'); // matches several fruits; also focuses the field
    }

    const searchIsFocused = (p: Locator) =>
        p.evaluate((host: any) =>
            (host.shadowRoot?.activeElement?.className ?? '').includes('ms__fullscreen-search'));

    test('tapping an option blurs the search (dismisses the keyboard)', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreenFocused(p);
        expect(await searchIsFocused(p)).toBe(true);

        await visibleOptions(p).first().click();
        await expect(p.locator('.ms__option--selected')).toHaveCount(1); // select still happens
        await expect.poll(() => searchIsFocused(p)).toBe(false);
    });

    test('the Enter/Search key blurs the search', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreenFocused(p);
        expect(await searchIsFocused(p)).toBe(true);

        await fsSearch(p).press('Enter');
        await expect.poll(() => searchIsFocused(p)).toBe(false);
    });

    test('scrolling the options list blurs the search', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreenFocused(p);
        expect(await searchIsFocused(p)).toBe(true);

        // A genuine drag on the list fires touchmove; dispatch one on the scroller.
        await p.evaluate((host: any) => {
            const list = host.shadowRoot.querySelector('.ms__options');
            list.dispatchEvent(new Event('touchmove', { bubbles: true }));
        });
        await expect.poll(() => searchIsFocused(p)).toBe(false);
    });
});

test.describe('fullscreen close — corner hit target', () => {
    // The close ✕ tap target is enlarged and anchored into the sheet's top-trailing
    // corner, so the previously-dead padding around a centered button is now clickable
    // (the corner is the easiest place to tap). We click a point a few px from the
    // header's physical top-right corner — outside where the old centered 43.2px button
    // sat — and expect the sheet to close.
    async function openFullscreen(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
    }

    test('clicking the top-right corner closes the sheet', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreen(p);

        const header = await p.locator('.ms__fullscreen-header').boundingBox();
        if (!header) throw new Error('no header box');
        // A few px inside the header's top-right corner — the old dead zone.
        await page.mouse.click(header.x + header.width - 6, header.y + 6);

        await expect(p.locator('.ms__dropdown--fullscreen')).toBeHidden();
    });

    test('the close hit target covers the top-trailing corner without stealing other taps', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        await openFullscreen(p);

        // Hit-test the top-right and right-middle of the header — the former dead padding —
        // and assert they resolve to the close button (its ::after hit-area extension).
        // The extension is bounded below/leading so it must NOT cover the search field or
        // the first option row.
        const hits = await p.evaluate((host: any) => {
            const root = host.shadowRoot;
            const h = root.querySelector('.ms__fullscreen-header').getBoundingClientRect();
            const close = root.querySelector('.ms__fullscreen-close');
            const isClose = (x: number, y: number) => {
                const el = root.elementFromPoint(x, y);
                return el === close || (el && close.contains(el));
            };
            const cls = (x: number, y: number) =>
                (root.elementFromPoint(x, y) as HTMLElement)?.className ?? '';
            return {
                topRight: isClose(h.right - 3, h.top + 3),
                rightMid: isClose(h.right - 3, (h.top + h.bottom) / 2),
                input: cls(h.left + 40, (h.top + h.bottom) / 2).includes('ms__fullscreen-search'),
                firstOption: cls(h.left + 40, h.bottom + 20).includes('ms__option'),
            };
        });
        expect(hits.topRight).toBe(true);
        expect(hits.rightMid).toBe(true);
        expect(hits.input).toBe(true);       // search field not covered
        expect(hits.firstOption).toBe(true); // first option row not covered
    });

    test('close chip accepts a themed border via CSS variables', async ({ page }) => {
        const p = picker(page, 'filter-fs');
        // Turn the ✕ into a bordered "button" through the public vars.
        await p.evaluate((host: HTMLElement) => {
            host.style.setProperty('--ms-fullscreen-close-border', '2px solid rgb(10, 20, 30)');
            host.style.setProperty('--ms-fullscreen-close-border-radius', '8px');
        });
        await openFullscreen(p);

        const style = await p.evaluate((host: any) => {
            const cs = getComputedStyle(host.shadowRoot.querySelector('.ms__fullscreen-close'));
            return { width: cs.borderTopWidth, color: cs.borderTopColor, radius: cs.borderTopLeftRadius, box: cs.boxSizing };
        });
        expect(style.width).toBe('2px');
        expect(style.color).toBe('rgb(10, 20, 30)');
        expect(style.radius).toBe('8px');
        expect(style.box).toBe('border-box'); // the border doesn't grow the chip
    });
});

test.describe('search-input-mode', () => {
    test('readonly prevents typing', async ({ page }) => {
        const p = picker(page, 'readonly');
        await openDropdown(p);

        await expect(input(p)).toHaveAttribute('readonly', '');
    });

    test('hidden: the field is invisible and takes no typing', async ({ page }) => {
        const p = picker(page, 'hidden-input');
        await expect(input(p)).toHaveCSS('opacity', '0');
        await expect(input(p)).toHaveAttribute('readonly', '');
    });

    test('hidden: a click on the field opens the dropdown (not only the chevron)', async ({ page }) => {
        const p = picker(page, 'hidden-input');
        await p.locator('.ms__input-wrapper').click({ position: { x: 20, y: 10 } });
        await expect(p.locator('.ms__dropdown')).toBeVisible();
        // a second click on the field closes it again
        await p.locator('.ms__input-wrapper').click({ position: { x: 20, y: 10 } });
        await expect(p.locator('.ms__dropdown')).toBeHidden();
    });

    test('hidden: keyboard focus, arrows and Enter still work; typing does not filter', async ({ page }) => {
        const p = picker(page, 'hidden-input');
        await input(p).focus();
        await expect(input(p)).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(p.locator('.ms__dropdown')).toBeVisible();
        await page.keyboard.type('zzz');
        await expect(visibleOptions(p)).toHaveCount(5);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await expect.poll(() => p.evaluate((el: any) => el.selectedOptions.length)).toBe(1);
    });
});

test.describe('enable-search="false"', () => {
    test('typing into the input does not filter options', async ({ page }) => {
        const p = picker(page, 'no-search');
        await openDropdown(p);

        // Try to type — the search subsystem is disabled, so filtering is a no-op.
        await input(p).fill('apple');
        await expect(visibleOptions(p)).toHaveCount(5);
    });
});

test.describe('labels.noResults', () => {
    test('custom empty message shown when no results', async ({ page }) => {
        const p = picker(page, 'empty-msg');
        await openDropdown(p);

        await input(p).fill('zzzzz');
        await expect(p.locator('.ms__empty')).toContainText('nothing here');
    });
});

/** Append a fresh picker (value/label members) with the given attributes + options. */
async function makePicker(page: Page, attrs: Record<string, string>, options: unknown[]): Promise<Locator> {
    const id = 'lbl-' + Math.random().toString(36).slice(2, 8);
    await page.evaluate(({ id, attrs, options }) => {
        const el = document.createElement('web-multiselect') as any;
        el.id = id;
        el.setAttribute('value-member', 'value');
        el.setAttribute('display-value-member', 'label');
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        document.body.appendChild(el);
        el.options = options;
    }, { id, attrs, options });
    return page.locator('#' + id);
}

test.describe('empty states: labels.noData vs labels.noResults', () => {
    test('no options at all shows noData (default "No data")', async ({ page }) => {
        const p = await makePicker(page, {}, []);
        await openDropdown(p);
        await expect(p.locator('.ms__empty')).toHaveText('No data');
    });

    test('options exist but the search misses shows noResults (default "No results found")', async ({ page }) => {
        const p = await makePicker(page, {}, [{ value: 'a', label: 'Apple' }]);
        await openDropdown(p);
        await input(p).fill('zzz');
        await expect(p.locator('.ms__empty')).toHaveText('No results found');
    });

    test("an empty-string label renders nothing (L4: '' = deliberately empty)", async ({ page }) => {
        const p = await makePicker(page, { labels: '{"noData":""}' }, []);
        await openDropdown(p);
        await expect(p.locator('.ms__empty')).toHaveText('');
    });

    test('labels.noDisplayValue replaces the missing-display fallback (default "[N/A]")', async ({ page }) => {
        const p = await makePicker(page, {}, [{ value: 'a' }]);
        await openDropdown(p);
        await expect(visibleOptions(p).first()).toContainText('[N/A]');
        const q = await makePicker(page, { labels: '{"noDisplayValue":"(unnamed)"}' }, [{ value: 'a' }]);
        await openDropdown(q);
        await expect(visibleOptions(q).first()).toContainText('(unnamed)');
    });
});

test.describe('min-search-length (local search)', () => {
    test('filter mode does not filter below threshold', async ({ page }) => {
        const p = picker(page, 'filter');
        await p.evaluate(el => el.setAttribute('min-search-length', '2'));
        await openDropdown(p);
        const all = await visibleOptions(p).count();

        await input(p).fill('c'); // 1 char — under threshold: nothing filtered or highlighted
        await expect(visibleOptions(p)).toHaveCount(all);
        await expect(p.locator('.ms__option mark')).toHaveCount(0);

        await input(p).fill('ch'); // threshold met
        await expect(visibleOptions(p)).toHaveCount(1);
    });

    test('lowering the threshold live re-runs the typed term', async ({ page }) => {
        const p = picker(page, 'filter');
        await p.evaluate(el => el.setAttribute('min-search-length', '3'));
        await openDropdown(p);
        const all = await visibleOptions(p).count();

        await input(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(all);
        await p.evaluate(el => el.setAttribute('min-search-length', '0'));
        await expect(visibleOptions(p)).toHaveCount(1);
    });
});

test.describe('min-search-length (with async searchCallback)', () => {
    test('searchCallback is not invoked below threshold', async ({ page }) => {
        const p = picker(page, 'min-len');
        await openDropdown(p);

        await input(p).fill('c'); // 1 char — under threshold
        // Give any async work time to settle.
        await page.waitForTimeout(150);
        const callsAfterOne = await page.evaluate(() => (window as any).__minLenCalls.length);
        expect(callsAfterOne).toBe(0);

        await input(p).fill('ch'); // 2 chars — threshold met
        await expect(visibleOptions(p)).toHaveCount(1);
        const callsAfterTwo = await page.evaluate(() => (window as any).__minLenCalls.length);
        expect(callsAfterTwo).toBeGreaterThan(0);
    });
});

test.describe('async searchCallback', () => {
    test('loading message appears during pending request', async ({ page }) => {
        const p = picker(page, 'async-search');
        await openDropdown(p);

        await input(p).fill('ch');
        // The loading state is brief (50ms); race the message into view.
        const loading = p.locator('.ms__loading');
        await expect(loading.or(visibleOptions(p).first())).toBeVisible();
    });

    test('results populate from async callback', async ({ page }) => {
        const p = picker(page, 'async-search');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText(/Cherry/i);
    });
});

test.describe('keep-options-on-search', () => {
    test('initial options remain visible below min-search-length threshold', async ({ page }) => {
        const p = picker(page, 'keep-options');
        await openDropdown(p);

        // Before any typing, all options should be visible (no callback fired yet
        // because no search term).
        await input(p).fill('a'); // 1 char — under min-search-length 2
        await expect(visibleOptions(p)).toHaveCount(5);
    });
});

test.describe('keep-search-on-close', () => {
    test('clears search and options on close when false', async ({ page }) => {
        const p = picker(page, 'clear-on-close');
        await openDropdown(p);

        await input(p).fill('ch');
        await expect(visibleOptions(p)).toHaveCount(1);

        await page.mouse.click(0, 0); // outside-click
        await expect(p.locator('.ms__dropdown')).not.toBeVisible();

        await openDropdown(p);
        await expect(input(p)).toHaveValue('');
        await expect(visibleOptions(p)).toHaveCount(5);
    });
});

test.describe('beforeSearchCallback', () => {
    test('strips spaces from search term', async ({ page }) => {
        const p = picker(page, 'before-search');
        await openDropdown(p);

        // "c h e" → "che" (matches cherry) after strip.
        await input(p).fill('c h e');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText(/Cherry/i);
    });
});

test.describe('search-behavior', () => {
    test('default (normalized) ignores case and diacritics', async ({ page }) => {
        const p = picker(page, 'sb-default');
        await openDropdown(p);

        await input(p).fill('cesky');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText('Český Krumlov');

        await input(p).fill('MULLER');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText('Müller');

        // ł has no Unicode decomposition: folded by hand.
        await input(p).fill('lodz');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText('Łódź');
    });

    test('default matches decomposed data with a composed term, and trims the term', async ({ page }) => {
        const p = picker(page, 'sb-default');
        await openDropdown(p);

        await input(p).fill('zlín');
        await expect(visibleOptions(p)).toHaveCount(1);

        await input(p).fill('york ');
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText('New York');
    });

    test('highlight marks the original accented text', async ({ page }) => {
        const p = picker(page, 'sb-default');
        await openDropdown(p);

        await input(p).fill('cesk');
        await expect(p.locator('.ms__option mark').first()).toHaveText('Česk');
    });

    test('case-insensitive ignores case but not diacritics', async ({ page }) => {
        const p = picker(page, 'sb-ci');
        await openDropdown(p);

        await input(p).fill('ČES');
        await expect(visibleOptions(p)).toHaveCount(1);

        await input(p).fill('ces');
        await expect(visibleOptions(p)).toHaveCount(0);
    });

    test('exact is case- and diacritic-sensitive', async ({ page }) => {
        const p = picker(page, 'sb-exact');
        await openDropdown(p);

        await input(p).fill('Čes');
        await expect(visibleOptions(p)).toHaveCount(1);

        await input(p).fill('čes');
        await expect(visibleOptions(p)).toHaveCount(0);
    });
});

test.describe('search-behavior: prepared search values', () => {
    test('each item is prepared once, not per keystroke; replacing options re-prepares', async ({ page }) => {
        const p = picker(page, 'sb-index');
        await openDropdown(p);
        const calls = () => page.evaluate(() => (window as any).__searchValueCalls as number);

        for (const term of ['p', 'po', 'pol', 'polo', 'polozka 19']) {
            await input(p).fill(term);
        }
        await expect(p.locator('.ms__option mark').first()).toBeVisible();
        expect(await calls()).toBe(2000);

        // New option objects → the index is dropped and rebuilt on the next search.
        await p.evaluate((el: any) => {
            el.options = Array.from({ length: 2000 }, (_, i) => ({ value: String(i), label: `Item ${i}` }));
        });
        await input(p).fill('item 7');
        await expect(p.locator('.ms__option').first()).toContainText('Item 7');
        expect(await calls()).toBe(4000);
    });
});

test.describe('search-match', () => {
    const setMatch = (p: Locator, match: string) =>
        p.evaluate((el: any, m) => { el.searchMatch = m; }, match);

    const cases: Array<[string, string, string[]]> = [
        ['contains',         'krumlov', ['Český Krumlov', 'Krumlov']],
        ['equals',           'KRUMLOV', ['Krumlov']],
        ['equals',           'krum',    []],
        ['equals',           'cesky krumlov', ['Český Krumlov']], // whole value, normalized
        ['starts-with',      'krumlov', ['Krumlov']],
        ['ends-with',        'krumlov', ['Český Krumlov', 'Krumlov']],
        ['starts-with',      'town',    ['Townsend']],
        ['word-starts-with', 'town',    ['Old Town', 'Townsend']],
        ['ends-with',        'own',     ['Old Town']],
        ['word-ends-with',   'town',    ['Old Town']],
        ['word-starts-with', 'ces',     ['Český Krumlov']], // still normalized
    ];
    for (const [match, term, expected] of cases) {
        test(`${match}: "${term}"`, async ({ page }) => {
            const p = picker(page, 'sm');
            await setMatch(p, match);
            await openDropdown(p);
            await input(p).fill(term);
            await expect(p.locator('.ms__option:visible .ms__option-title')).toHaveText(expected);
        });
    }

    test('word-starts-with highlights only the word start', async ({ page }) => {
        const p = picker(page, 'sm');
        await setMatch(p, 'word-starts-with');
        await openDropdown(p);
        await input(p).fill('town');
        await expect(p.locator('.ms__option mark')).toHaveText(['Town', 'Town']);
    });

    test('regex runs on the raw value (no normalization) and keeps the last valid pattern', async ({ page }) => {
        const p = picker(page, 'sm');
        await setMatch(p, 'regex');
        await openDropdown(p);

        await input(p).fill('^(Old|Kr)');
        await expect(visibleOptions(p)).toHaveCount(2);
        // Mid-typing invalid pattern: last valid result stays.
        await input(p).fill('^(Old|Kr');
        await expect(visibleOptions(p)).toHaveCount(2);

        await input(p).fill('^Čes');
        await expect(visibleOptions(p)).toHaveCount(1);
        await input(p).fill('^ces');
        await expect(visibleOptions(p)).toHaveCount(0);
    });

    test('live switch re-runs the open search in place', async ({ page }) => {
        const p = picker(page, 'sb-default');
        await openDropdown(p);
        await input(p).fill('ces');
        await expect(visibleOptions(p)).toHaveCount(1);

        await p.evaluate((el: any) => { el.searchBehavior = 'case-insensitive'; });
        await expect(visibleOptions(p)).toHaveCount(0);
        await p.evaluate((el: any) => { el.searchBehavior = 'normalized'; });
        await expect(visibleOptions(p)).toHaveCount(1);
    });
});

test.describe('getSearchTermCallback', () => {
    test('internal: a returned RegExp matches part numbers regardless of separators', async ({ page }) => {
        const p = picker(page, 'sm-term');
        await openDropdown(p);
        await input(p).fill('ha-324/56');
        await expect(visibleOptions(p)).toHaveCount(2);
        await expect(p.locator('.ms__option mark').first()).toHaveText('HA 324-56');
    });

    test('callback: searchCallback gets the object term and entries with object search values', async ({ page }) => {
        const p = picker(page, 'sm-callback');
        await openDropdown(p);

        await input(p).fill('381 0');      // zip, typed with a space
        await expect(visibleOptions(p)).toHaveCount(1);
        await expect(visibleOptions(p).first()).toContainText('Český Krumlov');

        await input(p).fill('cesk');       // title, accent-free
        await expect(visibleOptions(p)).toHaveCount(2);

        const info = await page.evaluate(() => {
            const w = window as any;
            return {
                sameEntries: w.__entriesRefs.every((e: unknown) => e === w.__entriesRefs[0]),
                calls: w.__entriesRefs.length,
                lastTerm: w.__callbackTerms[w.__callbackTerms.length - 1],
            };
        });
        expect(info.calls).toBeGreaterThanOrEqual(2);
        expect(info.sameEntries).toBe(true);
        expect(info.lastTerm).toEqual({ zip: 'cesk', text: 'cesk' });
    });

    test('object search value without searchCallback falls back to the display value (with a warning)', async ({ page }) => {
        const warnings: string[] = [];
        page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
        const p = picker(page, 'sm-object');
        await openDropdown(p);
        await input(p).fill('praha');
        await expect(visibleOptions(p)).toHaveCount(1);
        expect(warnings.some(w => w.includes('getSearchValueCallback returned an object'))).toBe(true);
    });
});
