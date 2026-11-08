import { test, expect } from './fixtures';

/**
 * Regression: the synchronous `el.options = data; el.setSelected(sel)` contract,
 * exercised in a real browser.
 *
 * Under the core async model a loose property write (`el.options = …`) coalesces
 * into a microtask reinit, so a synchronous imperative call on the next line ran
 * against the picker's *previous* (empty) options. `count` (requested values)
 * then diverged from the found options, and compact-mode badge rendering
 * dereferenced `selectedOptions[0]` (undefined) → "Cannot read properties of
 * undefined (reading 'label')". That threw *during* the demo's init script and
 * aborted it, leaving every picker declared after the throwing one empty — which
 * is why the partial/compact badge examples showed no options.
 *
 * The whole failure surfaced only as an uncaught page error: the existing e2e
 * suite stayed green because nothing asserted on `pageerror`. This spec closes
 * that gap two ways — a page-level "no uncaught errors" guard on a fixture
 * (test/sync-imperative.html) that drives partial/compact pickers through the exact
 * options-then-setSelected pattern of the examples-data-api API06 demo, and a direct
 * reproduction of it.
 */

const PAGE = '/test/sync-imperative.html';

test.describe('synchronous el.options = data; el.setSelected(sel)', () => {
    test('data-api init runs to completion with no uncaught page errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        await page.goto(PAGE);
        await page.waitForLoadState('networkidle');

        // The crash aborted the init script, so pickers declared after the throw
        // ended up with zero options. Assert the reported ones populated AND
        // rendered their pre-set selection as badges.
        const partial = page.locator('#partial-mode');
        await expect
            .poll(() => partial.evaluate((el: any) => el.options?.length ?? 0))
            .toBeGreaterThan(0);
        await expect(partial.locator('.ms__badge')).not.toHaveCount(0);

        const compact = page.locator('#compact-mode');
        await expect
            .poll(() => compact.evaluate((el: any) => el.options?.length ?? 0))
            .toBeGreaterThan(0);
        await expect(compact.locator('.ms__badge-text')).toContainText('JavaScript');

        // The actual signal that regressed: nothing may throw during init.
        expect(errors, 'no uncaught page errors during init').toEqual([]);
    });

    test('setSelected right after options = … applies synchronously (no await, no throw)', async ({ page }) => {
        await page.goto(PAGE);

        const result = await page.evaluate(async () => {
            const el: any = document.createElement('web-multiselect');
            el.setAttribute('value-member', 'value');
            el.setAttribute('display-value-member', 'label');
            el.setAttribute('badges-display-mode', 'compact'); // the mode that crashed
            document.body.appendChild(el); // upgrades + connects synchronously

            // Loose property write coalesces on a microtask...
            el.options = [
                { value: 'js', label: 'JavaScript' },
                { value: 'ts', label: 'TypeScript' },
                { value: 'py', label: 'Python' },
                { value: 'go', label: 'Go' }
            ];

            // ...and this synchronous call must still see it (imperative flush).
            let threw: string | null = null;
            try {
                el.setSelected(['js', 'ts', 'py', 'go']);
            } catch (e) {
                threw = String(e);
            }

            const badges = el.shadowRoot?.querySelector('.ms__badges')?.textContent ?? '';
            return {
                threw,
                selected: el.selectedOptions.map((o: any) => o.value),
                badges
            };
        });

        expect(result.threw).toBeNull();
        expect(result.selected).toEqual(['js', 'ts', 'py', 'go']);
        expect(result.badges).toContain('JavaScript');
        expect(result.badges).not.toContain('undefined');
    });
});
