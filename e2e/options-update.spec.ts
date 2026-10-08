import { test, expect, Page, Locator } from './fixtures';

/**
 * In-place `options` update + `refresh()`.
 *
 * Before the fix, the `options` property was wired `on: 'reinit'` — every assignment
 * tore down and rebuilt the picker, which CLOSED an open dropdown and dropped scroll /
 * focus / search. A parent framework handing a fresh-but-equivalent array on each render
 * (the "reports" bug) therefore closed the dropdown after every pick.
 *
 * `options` now routes `on: 'update'` → the core's in-place `updateOptions()` path, and a
 * new `refresh()` method re-renders from the current set without re-ingesting it (for
 * in-place field mutations / callback-driven state). These specs lock both in, plus the
 * virtual-scroll threshold crossing and a 5000-option churn (proof it's in-place, not a
 * rebuild: the dropdown stays open throughout).
 *
 * Fixture: test/options-update.html.
 */

const PAGE = '/test/options-update.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

function optionByValue(p: Locator, value: string): Locator {
    return p.locator(`.ms__option[data-value="${value}"]`);
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('in-place options update keeps the dropdown open', () => {
    test('re-assigning a fresh array on every change (reports repro) does NOT close the dropdown', async ({ page }) => {
        const p = picker(page, 'churn');
        await openDropdown(p);

        await optionByValue(p, 'fruit-0').click();
        // The change handler reassigned options with a brand-new array + new objects.
        // Pre-fix this reinitialised and closed the dropdown; it must stay open.
        await expect(p.locator('.ms__dropdown')).toBeVisible();

        await optionByValue(p, 'fruit-1').click();
        await expect(p.locator('.ms__dropdown')).toBeVisible();

        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['fruit-0', 'fruit-1']);
    });

    test('replacing options while open preserves the live selection and the open state', async ({ page }) => {
        const p = picker(page, 'dm');
        await openDropdown(p);
        await optionByValue(p, 'apple').click();
        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['apple']);

        // Hand a brand-new array (new identity, equivalent content) — the in-place path.
        await p.evaluate((el: any) => {
            el.options = [
                { value: 'apple',  label: 'Apple' },
                { value: 'banana', label: 'Banana' },
                { value: 'cherry', label: 'Cherry' },
                { value: 'date',   label: 'Date' },
                { value: 'elderberry', label: 'Elderberry' }
            ];
        });

        await expect(p.locator('.ms__dropdown')).toBeVisible();
        await expect(optionByValue(p, 'elderberry')).toBeVisible();      // new item rendered
        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['apple']); // selection survived
        await expect(optionByValue(p, 'apple')).toHaveClass(/ms__option--selected/);
    });
});

test.describe('refresh() re-renders without re-ingesting', () => {
    test('picks up an in-place `disabled` field mutation', async ({ page }) => {
        const p = picker(page, 'dm');
        await openDropdown(p);
        await expect(optionByValue(p, 'cherry')).not.toHaveClass(/ms__option--disabled/);

        // Mutate the SAME object the component already holds, then refresh (no new array).
        await p.evaluate((el: any) => {
            const cherry = el.options.find((o: any) => o.value === 'cherry');
            cherry.disabled = true;
            el.refresh();
        });

        await expect(optionByValue(p, 'cherry')).toHaveClass(/ms__option--disabled/);
    });

    test('picks up a callback-state change with no data change', async ({ page }) => {
        const p = picker(page, 'cb');
        await openDropdown(p);
        await expect(optionByValue(p, 'opt-2')).not.toHaveClass(/ms__option--disabled/);

        // Nothing about the option DATA changes — only external state the callback reads.
        await p.evaluate((el: any) => {
            (window as any).disabledIds.add('opt-2');
            el.refresh();
        });

        await expect(optionByValue(p, 'opt-2')).toHaveClass(/ms__option--disabled/);

        // And it reverses — refresh is a pure recompute, not a latch.
        await p.evaluate((el: any) => {
            (window as any).disabledIds.delete('opt-2');
            el.refresh();
        });
        await expect(optionByValue(p, 'opt-2')).not.toHaveClass(/ms__option--disabled/);
    });

    test('refresh() does not emit select/deselect/change', async ({ page }) => {
        const p = picker(page, 'dm');
        await openDropdown(p);
        await optionByValue(p, 'apple').click();

        const events = await p.evaluate(async (el: any) => {
            const seen: string[] = [];
            for (const type of ['select', 'deselect', 'change']) {
                el.addEventListener(type, () => seen.push(type));
            }
            el.refresh();
            await new Promise((r) => requestAnimationFrame(r));
            return seen;
        });

        expect(events).toEqual([]);
    });
});

test.describe('stale-selection policy when the option set is replaced', () => {
    test('default KEEPS a selection whose option left the list', async ({ page }) => {
        const p = picker(page, 'churn'); // no prune-missing-selection attribute
        await openDropdown(p);
        await optionByValue(p, 'fruit-2').click();
        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['fruit-2']);

        // Replace with a list that no longer contains fruit-2.
        await p.evaluate((el: any) => {
            el.options = (window as any).makeItems(8, 'fruit').filter((o: any) => o.value !== 'fruit-2');
        });

        // Kept: still reported by getValue even though it's no longer an option.
        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['fruit-2']);
        await expect(p.locator('.ms__badge-text')).toContainText('FRUIT 002');
    });

    test('prune-missing-selection DROPS a selection whose option left the list, silently', async ({ page }) => {
        const p = picker(page, 'prune');
        await openDropdown(p);
        await optionByValue(p, 'fruit-2').click();
        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['fruit-2']);

        const events = await p.evaluate(async (el: any) => {
            const seen: string[] = [];
            for (const type of ['select', 'deselect', 'change']) {
                el.addEventListener(type, () => seen.push(type));
            }
            el.options = (window as any).makeItems(8, 'fruit').filter((o: any) => o.value !== 'fruit-2');
            await new Promise((r) => requestAnimationFrame(r));
            return { seen, value: el.getValue() };
        });

        // Dropped from the selection, and no event fired (data-driven correction).
        expect(events.value).toEqual([]);
        expect(events.seen).toEqual([]);
        await expect(p.locator('.ms__badge')).toHaveCount(0);

        // A still-present selection is untouched by the prune. The dropdown stayed open through
        // the replace, so pick directly (reopening would toggle it shut).
        await expect(p.locator('.ms__dropdown')).toBeVisible();
        await optionByValue(p, 'fruit-3').click();
        await p.evaluate((el: any) => {
            el.options = (window as any).makeItems(8, 'fruit').filter((o: any) => o.value !== 'fruit-2');
        });
        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['fruit-3']);
    });
});

test.describe('virtual scroll', () => {
    test('growing the list across the threshold in place switches to virtual and stays open', async ({ page }) => {
        const p = picker(page, 'vs');
        await openDropdown(p);
        // Seeded with 10 (< threshold 50) → normal render.
        await expect(p.locator('.ms__dropdown--virtual')).toHaveCount(0);

        await p.evaluate((el: any) => { el.options = (window as any).makeItems(200, 'row'); });
        await expect(p.locator('.ms__dropdown')).toBeVisible();          // did not close
        await expect(p.locator('.ms__dropdown--virtual')).toHaveCount(1); // crossed → virtual

        // Shrink back below threshold in place → virtual torn down, still open.
        await p.evaluate((el: any) => { el.options = (window as any).makeItems(10, 'row'); });
        await expect(p.locator('.ms__dropdown')).toBeVisible();
        await expect(p.locator('.ms__dropdown--virtual')).toHaveCount(0);
    });
});

test.describe('5000-option performance / in-place proof', () => {
    test('repeated full-array reassignment stays open, keeps selection, and is fast', async ({ page }) => {
        const p = picker(page, 'vs');

        await p.evaluate((el: any) => { el.options = (window as any).makeItems(5000, 'big'); });
        await openDropdown(p);
        await expect(p.locator('.ms__dropdown--virtual')).toHaveCount(1);

        // Select one item so we can prove the selection survives the churn.
        await optionByValue(p, 'big-0').click();
        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['big-0']);

        // Churn: hand a fresh 5000-item array 20× (what a re-rendering parent does). Pre-fix
        // each assignment was a full teardown+rebuild; now it's an in-place update.
        const elapsed = await p.evaluate((el: any) => {
            const make = (window as any).makeItems;
            const t0 = performance.now();
            for (let i = 0; i < 20; i++) {
                el.options = make(5000, 'big');
                el.getSelected(); // force the coalesced update to flush synchronously
            }
            return performance.now() - t0;
        });

        // Proof it was in-place, not 20 rebuilds: the dropdown is still open and the
        // selection is intact. (A reinit would have closed it and reset scroll.)
        await expect(p.locator('.ms__dropdown')).toBeVisible();
        await expect(p.locator('.ms__dropdown--virtual')).toHaveCount(1);
        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['big-0']);

        // Generous ceiling — 20 in-place updates of 5000 items should be well under this;
        // a per-update full rebuild (Floating-UI re-anchor + fresh VirtualScroll) would blow it.
        expect(elapsed).toBeLessThan(3000);
        // eslint-disable-next-line no-console
        console.log(`[perf] 20× in-place reassign of 5000 options: ${elapsed.toFixed(0)}ms`);
    });
});
