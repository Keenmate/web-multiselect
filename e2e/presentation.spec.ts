import { test, expect, Page, Locator } from './fixtures';

/**
 * Mobile presentation + device rotation.
 *
 * Runs under the `mobile` Playwright project only (see playwright.config.ts):
 * a Pixel 7 context reports a coarse pointer and no hover, so it is
 * `isTouchPrimary` — the precondition for `presentation="auto"` to
 * resolve to the fullscreen overlay. A desktop context never takes that branch.
 *
 * "Rotation" in Playwright is a viewport-dimension swap: there is no literal
 * rotate API, but swapping width/height fires a real `resize`, flips the
 * `(orientation: …)` media query, and re-runs core's environment observable —
 * which is exactly what `resolvePresentation` / `classifyDevice` react to. The
 * phone/tablet cut is the *shorter* viewport side vs the `sw600dp` line, so it is
 * orientation-robust: a phone stays a phone in landscape.
 *
 * Fixture: test/presentation.html.
 */

const PAGE = '/test/presentation.html';

// A phone's two orientations: same device, shorter side stays < 600 either way.
const PHONE_PORTRAIT = { width: 412, height: 915 };
const PHONE_LANDSCAPE = { width: 915, height: 412 };
// A tablet-class viewport: shorter side >= 600 crosses the sw600dp line, so even a
// touch-primary context resolves to the floating panel.
const TABLET_PORTRAIT = { width: 820, height: 1180 };

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

function input(p: Locator): Locator {
    return p.locator('.ms__input');
}

function fullscreen(p: Locator): Locator {
    return p.locator('.ms__dropdown--fullscreen');
}

// Open + floating: the panel is visible but NOT the fullscreen overlay.
function floatingOpen(p: Locator): Locator {
    return p.locator('.ms__dropdown--visible:not(.ms__dropdown--fullscreen)');
}

test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE_PORTRAIT);
    await page.goto(PAGE);
});

test.describe('presentation="auto" on a touch phone', () => {
    test('opens as a fullscreen overlay in portrait', async ({ page }) => {
        const p = picker(page, 'auto');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
    });

    test('stays fullscreen when rotated to landscape (shorter side still < 600)', async ({ page }) => {
        const p = picker(page, 'auto');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();

        // Rotate the open sheet: same device, now landscape. Still a phone.
        await page.setViewportSize(PHONE_LANDSCAPE);

        await expect(fullscreen(p)).toBeVisible();
        await expect(floatingOpen(p)).toHaveCount(0);
    });

    test('resolves fullscreen when the picker is opened while already in landscape', async ({ page }) => {
        await page.setViewportSize(PHONE_LANDSCAPE);
        const p = picker(page, 'auto');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
    });

    test('live-swaps fullscreen → floating when resized past the tablet boundary', async ({ page }) => {
        const p = picker(page, 'auto');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();

        // Grow the viewport so the shorter side crosses sw600dp — a tablet now,
        // even though the pointer is still coarse. The open panel re-presents live.
        await page.setViewportSize(TABLET_PORTRAIT);

        await expect(fullscreen(p)).toBeHidden();
        await expect(floatingOpen(p)).toBeVisible();
    });

    test('swaps back to fullscreen when rotated/resized back to phone dimensions', async ({ page }) => {
        const p = picker(page, 'auto');
        await input(p).click();

        await page.setViewportSize(TABLET_PORTRAIT);
        await expect(floatingOpen(p)).toBeVisible();

        await page.setViewportSize(PHONE_PORTRAIT);
        await expect(fullscreen(p)).toBeVisible();
        await expect(floatingOpen(p)).toHaveCount(0);
    });
});

test.describe('forced modes ignore rotation', () => {
    test('floating stays anchored across a rotation', async ({ page }) => {
        const p = picker(page, 'floating');
        await input(p).click();
        await expect(floatingOpen(p)).toBeVisible();
        await expect(fullscreen(p)).toHaveCount(0);

        await page.setViewportSize(PHONE_LANDSCAPE);
        await expect(floatingOpen(p)).toBeVisible();
        await expect(fullscreen(p)).toHaveCount(0);
    });

    test('fullscreen stays an overlay across a rotation and a tablet resize', async ({ page }) => {
        const p = picker(page, 'fullscreen');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();

        await page.setViewportSize(PHONE_LANDSCAPE);
        await expect(fullscreen(p)).toBeVisible();

        await page.setViewportSize(TABLET_PORTRAIT);
        await expect(fullscreen(p)).toBeVisible();
    });
});

test.describe('fullscreen scale under base-css-variables (--base-rem: 1rem)', () => {
    // --ms-rem is var(--base-rem, 10px). With the contract loaded it is `1rem`: the
    // JS-driven virtual row height must scale by --ms-fullscreen-rem / --ms-rem (1.2),
    // measured as lengths — parseFloat('1rem') used to give 12× (600px rows).
    test('virtual rows are 1.2× the option height, not 12×', async ({ page }) => {
        await page.addStyleTag({ content: ':root { --base-rem: 1rem; }' });
        const p = picker(page, 'fullscreen');
        await p.evaluate((el) => el.setAttribute('enable-virtual-scroll', ''));
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
        const height = await p.evaluate((el) => {
            const box = el.shadowRoot!.querySelector<HTMLElement>('[style*="--_ms-option-height"]');
            return box?.style.getPropertyValue('--_ms-option-height');
        });
        expect(height).toBe('60px');
    });
});

test.describe('the phone sheet is modal (core startModalSession + .km-sheet frame, C-CA-19)', () => {
    // Is `el` (or an ancestor, across shadow roots) inert?
    const isInert = (loc: Locator) => loc.evaluate((el) => {
        for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host ?? null)) {
            if (n instanceof Element && n.hasAttribute('inert')) return true;
        }
        return false;
    });
    // The focused element, through shadow roots: its class name.
    const focusedClass = (page: Page) => page.evaluate(() => {
        let a: Element | null = document.activeElement;
        while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
        return a?.className ?? '';
    });

    test('covers the viewport, makes the page inert, keeps Tab inside, Escape closes and returns focus', async ({ page }) => {
        const p = picker(page, 'fullscreen');
        await input(p).click();
        const sheet = fullscreen(p);
        await expect(sheet).toBeVisible();
        await expect(sheet).toHaveClass(/km-sheet/);
        await expect(sheet).toHaveAttribute('aria-modal', 'true');
        await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        const box = (await sheet.boundingBox())!;
        expect(box).toMatchObject({ x: 0, y: 0, width: PHONE_PORTRAIT.width, height: PHONE_PORTRAIT.height });

        // The page behind (another picker, the control under the sheet) is inert.
        expect(await isInert(input(picker(page, 'floating')))).toBe(true);
        expect(await isInert(input(p))).toBe(true);

        // Tab cycles inside the sheet, never closes it.
        await p.locator('.ms__fullscreen-search').focus();
        for (let i = 0; i < 6; i++) {
            await page.keyboard.press('Tab');
            await expect(sheet).toBeVisible();
            expect(await sheet.evaluate((el) => {
                let a: Element | null = document.activeElement;
                while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
                return !!a && el.contains(a);
            })).toBe(true);
        }

        // Escape: a typed search is cleared first, the next Escape closes.
        await p.locator('.ms__fullscreen-search').fill('ch');
        await page.keyboard.press('Escape');
        await expect(sheet).toBeVisible();
        await expect(p.locator('.ms__fullscreen-search')).toHaveValue('');
        await page.keyboard.press('Escape');
        await expect(p.locator('.ms__dropdown--visible')).toHaveCount(0);
        await expect(p.locator('.km-sheet')).toHaveCount(0);
        // Focus is back on the control (a keyboard close), the page is live again, no reopen.
        expect(await focusedClass(page)).toContain('ms__input');
        expect(await isInert(input(picker(page, 'floating')))).toBe(false);
        await expect(p.locator('.ms__dropdown--visible')).toHaveCount(0);
    });

    test('the phone Back gesture closes it; a touch close leaves focus alone (no soft keyboard)', async ({ page }) => {
        const p = picker(page, 'fullscreen');
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
        await page.evaluate(() => history.back());
        await expect(p.locator('.ms__dropdown--visible')).toHaveCount(0);
        expect(await focusedClass(page)).not.toContain('ms__input');

        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
        await p.locator('.ms__fullscreen-close').click();
        await expect(p.locator('.ms__dropdown--visible')).toHaveCount(0);
        expect(await focusedClass(page)).not.toContain('ms__input');
        expect(await isInert(input(p))).toBe(false);
    });
});

test.describe('closing the fullscreen sheet keeps the page scroll (core claimBackEntry, C-RO-15)', () => {
    test('✕ and the phone Back gesture close it without jumping the page to the top', async ({ page }) => {
        // A tall page with the picker well below the top.
        await page.evaluate(() => {
            const spacer = document.createElement('div');
            spacer.style.height = '1500px';
            document.body.prepend(spacer);
            document.body.style.minHeight = '4000px';
        });
        const p = picker(page, 'fullscreen');
        // Near the top of the viewport, not centred: a focus-driven scrollIntoView on close would
        // centre it and land elsewhere, so only a kept position passes.
        await p.evaluate((el) => { el.scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy({ top: -80, behavior: 'instant' }); });
        const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
        const before = await scrollY();
        expect(before).toBeGreaterThan(1000);
        // Every scroll position the page passes through from the close on (a jump to the top
        // and back is a visible flash even when the final position is right).
        // Two frames first: scroll events dispatch at the next rendering step, so the open's scroll
        // lock (window scroll 0) would otherwise land in the close's tracker under load.
        const frames = () => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
        const watch = async () => {
            await frames();
            await page.evaluate(() => {
                const w = window as unknown as { __scrolls: number[] };
                w.__scrolls = [];
                window.addEventListener('scroll', () => w.__scrolls.push(Math.round(window.scrollY)));
            });
        };
        // No sheet history entry left (core claimBackEntry: a deferred history.back(), its popstate,
        // then the page's scrollRestoration one task later).
        const historySettled = () => page.evaluate(() =>
            !(history.state as { kmBackEntry?: boolean } | null)?.kmBackEntry && history.scrollRestoration === 'auto');
        const closedAt = async () => {
            await expect(fullscreen(p)).toHaveCount(0);
            await expect.poll(historySettled).toBe(true);
            await frames(); // any scroll the traversal caused is dispatched by now
            const seen = await page.evaluate(() => (window as unknown as { __scrolls: number[] }).__scrolls);
            return [...new Set([...seen, await scrollY()])];
        };

        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
        await watch();
        await p.locator('.ms__fullscreen-close').click();
        expect(await closedAt()).toEqual([before]);

        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
        await watch();
        await page.evaluate(() => history.back());
        expect(await closedAt()).toEqual([before]);
        expect(await page.evaluate(() => history.scrollRestoration)).toBe('auto');
    });
});

test.describe('fullscreen truncated-label reveal (info button → createPopover panel)', () => {
    // The reveal panel is created hidden (opacity 0 / visibility hidden) and gets
    // `.ms__option-tooltip--visible` one frame after its first (async) placement, so it never
    // paints at the 0,0 origin (a51f731 moved that fade-in under `.ms__option-tooltip--fullscreen`).
    test('a clipped row shows the info button; tapping it reveals the full label at the button, tapping again hides it', async ({ page }) => {
        const LONG = 'Elderberry — a very long option label that cannot fit on one line of a phone-width sheet';
        const p = picker(page, 'fullscreen');
        await p.evaluate((el: any, long: string) => {
            el.style.setProperty('--ms-option-title-white-space', 'nowrap');
            el.style.setProperty('--ms-option-title-overflow', 'hidden');
            el.style.setProperty('--ms-option-title-text-overflow', 'ellipsis');
            el.options = [{ value: 'apple', label: 'Apple' }, { value: 'long', label: long }];
        }, LONG);
        await input(p).click();
        await expect(fullscreen(p)).toBeVisible();
        // The sheet slides in (core .km-sheet); a click mid-slide scrolls the moving panel.
        await fullscreen(p).evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));

        const longRow = fullscreen(p).locator('.ms__option[data-value="long"]');
        const shortRow = fullscreen(p).locator('.ms__option[data-value="apple"]');
        await expect(longRow).toHaveClass(/ms__option--truncated/);
        await expect(shortRow).not.toHaveClass(/ms__option--truncated/);
        const info = longRow.locator('.ms__option-info');
        await expect(info).toBeVisible();
        await expect(shortRow.locator('.ms__option-info')).toBeHidden();

        const panel = p.locator('.ms__option-tooltip--fullscreen');
        await info.click();
        await expect(panel).toHaveCount(1);
        await expect(panel).toHaveClass(/ms__option-tooltip--visible/);
        await expect(panel).toHaveText(LONG);
        // Faded in (the CSS transition finishes) — opaque and visible.
        await expect.poll(() => panel.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
        await expect(panel).toBeVisible();
        // The tap toggles the reveal only — the row's selection is untouched.
        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([]);

        // Placed at the button (placement top-end), not at the 0,0 origin.
        const btn = (await info.boundingBox())!;
        const box = (await panel.boundingBox())!;
        expect(box.x + box.y).toBeGreaterThan(20);
        expect(box.y + box.height).toBeLessThanOrEqual(btn.y + 1);       // above the button
        expect(btn.y - (box.y + box.height)).toBeLessThan(40);           // …close to it (offset 8)
        expect(Math.abs(box.x + box.width - (btn.x + btn.width))).toBeLessThan(16); // trailing edges align (shift ≤ 8)

        // A second tap on the same button hides it (panel removed).
        await info.click();
        await expect(panel).toHaveCount(0);
        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([]);
    });
});

test.describe('the phone sheet header + close animation (core createSheetHeader / animateOut, W3)', () => {
    const isInert = (loc: Locator) => loc.evaluate((el) => {
        for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host ?? null)) {
            if (n instanceof Element && n.hasAttribute('inert')) return true;
        }
        return false;
    });
    test('the header is core\'s sheet header: the search field as content, then the ✕', async ({ page }) => {
        const p = picker(page, 'fullscreen');
        await input(p).click();
        const header = p.locator('.ms__fullscreen-header.km-sheet-header');
        await expect(header).toHaveCount(1);
        expect(await header.evaluate((h) => Array.from(h.children).map((c) => c.className))).toEqual([
            'ms__fullscreen-search-wrapper',
            'km-sheet-close ms__fullscreen-close',
        ]);
        await expect(header.locator('.km-sheet-close')).toHaveAttribute('aria-label', 'Close');
    });

    test('closing animates the sheet out (km-sheet--closing, inert) and then hides it', async ({ page }) => {
        const p = picker(page, 'fullscreen');
        await input(p).click();
        const sheet = fullscreen(p);
        await expect(sheet).toBeVisible();
        await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        // Read the state in the same task as the close: the sheet is still shown, closing, inert.
        const during = await sheet.evaluate((el: HTMLElement) => {
            (el.querySelector('.ms__fullscreen-close') as HTMLElement).click();
            return {
                isClosing: el.classList.contains('km-sheet--closing'),
                isShown: el.classList.contains('ms__dropdown--visible'),
                isInert: el.inert,
                animationName: getComputedStyle(el).animationName,
            };
        });
        expect(during).toEqual({ isClosing: true, isShown: true, isInert: true, animationName: 'km-sheet-out' });
        await expect(p.locator('.ms__dropdown--visible')).toHaveCount(0);
        await expect(p.locator('.km-sheet, .km-sheet--closing, .ms__fullscreen-header')).toHaveCount(0);
        expect(await isInert(input(p))).toBe(false);
    });

    test('motion="none" closes it at once', async ({ page }) => {
        const p = picker(page, 'fullscreen');
        await p.evaluate((el) => el.setAttribute('motion', 'none'));
        await input(p).click();
        const sheet = fullscreen(p);
        await expect(sheet).toBeVisible();
        const isShown = await sheet.evaluate((el: HTMLElement) => {
            (el.querySelector('.ms__fullscreen-close') as HTMLElement).click();
            return el.classList.contains('ms__dropdown--visible');
        });
        expect(isShown).toBe(false);
    });

    test('reopening while the sheet animates out shows a fresh sheet', async ({ page }) => {
        const p = picker(page, 'fullscreen');
        await input(p).click();
        const sheet = fullscreen(p);
        await expect(sheet).toBeVisible();
        await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        await p.evaluate((el: any) => { el.close(); el.open(); });
        await expect(sheet).toBeVisible();
        await expect(sheet).toHaveClass(/km-sheet/);
        await expect(sheet).not.toHaveClass(/km-sheet--closing/);
        await expect(p.locator('.ms__fullscreen-header')).toHaveCount(1);
        expect(await sheet.evaluate((el: HTMLElement) => el.inert)).toBe(false);
        // Still a working modal sheet: Escape closes it.
        await p.locator('.ms__fullscreen-search').focus();
        await page.keyboard.press('Escape');
        await expect(p.locator('.ms__dropdown--visible')).toHaveCount(0);
    });
});
