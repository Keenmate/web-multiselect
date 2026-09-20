import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/single-select-events.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('single-select event semantics', () => {
    test('initial pick fires select + change, no deselect', async ({ page }) => {
        const p = picker(page, 'single');
        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();

        const ev = await page.evaluate(() => (window as any).__events);
        expect(ev.select).toHaveLength(1);
        expect(ev.select[0].selectedValues).toEqual(['apple']);
        expect(ev.deselect).toHaveLength(0);
        expect(ev.change).toHaveLength(1);
        expect(ev.change[0].selectedValues).toEqual(['apple']);
    });

    // The bet from the ai/ doc fix: picking B while A is selected should fire
    // 'select' (B) and 'change', but NOT 'deselect' for A.
    test('replacement: pick B while A selected — select(B) + change, no deselect(A)', async ({ page }) => {
        const p = picker(page, 'single');

        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();

        // Dropdown auto-closes in single mode — reopen to pick B
        await openDropdown(p);
        await p.locator('.ms__option[data-value="banana"]').click();

        const ev = await page.evaluate(() => (window as any).__events);

        // Two 'select' events — one per click. Second is for B.
        expect(ev.select).toHaveLength(2);
        expect(ev.select[1].selectedValues).toEqual(['banana']);

        // The displaced A produces NO deselect event.
        expect(ev.deselect).toHaveLength(0);

        // 'change' DOES fire on the replacement — final selection is just B.
        expect(ev.change).toHaveLength(2);
        expect(ev.change[1].selectedValues).toEqual(['banana']);
    });

    // Pins the bubbles+composed fix on web-component.ts dispatchEvent sites.
    // If a future change drops those flags, framework delegation (Svelte 5
    // onchange, React onChange, Vue @change) breaks again — see
    // svelte-test/e2e/single-select.spec.ts for the framework-level repro.
    test('events bubble to ancestor + carry composed flag', async ({ page }) => {
        const p = picker(page, 'single');

        await page.evaluate(() => {
            (window as any).__bubbled = { select: [], deselect: [], change: [] };
            const record = (kind: string) => (e: any) => {
                if (e.target?.tagName !== 'WEB-MULTISELECT') return;
                (window as any).__bubbled[kind].push({
                    bubbles: e.bubbles,
                    composed: e.composed
                });
            };
            document.addEventListener('select',   record('select'));
            document.addEventListener('deselect', record('deselect'));
            document.addEventListener('change',   record('change'));
        });

        // Select apple (select + change), then clear via the ✕ (deselect + change).
        // Single-select re-click no longer deselects, so the deselect flag coverage
        // rides the clear button — the same web-component dispatch site.
        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();
        await p.locator('.ms__input-clear').click();

        const bubbled = await page.evaluate(() => (window as any).__bubbled);

        expect(bubbled.select).toHaveLength(1);
        expect(bubbled.select[0]).toEqual({ bubbles: true, composed: true });

        expect(bubbled.deselect).toHaveLength(1);
        expect(bubbled.deselect[0]).toEqual({ bubbles: true, composed: true });

        expect(bubbled.change).toHaveLength(2);
        expect(bubbled.change[0]).toEqual({ bubbles: true, composed: true });
        expect(bubbled.change[1]).toEqual({ bubbles: true, composed: true });
    });

    // Single-select must NOT toggle off on a re-click: a single-select always keeps
    // one value once chosen (clearing is the clear-✕ button's job). Re-clicking the
    // selected option is a no-op confirm — it just closes, firing no deselect/change.
    test('re-click keeps selection: clicking already-selected is a no-op (no deselect)', async ({ page }) => {
        const p = picker(page, 'single');

        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();

        await openDropdown(p);
        await p.locator('.ms__option[data-value="apple"]').click();

        // Dropdown closes on the confirming click.
        await expect(p.locator('.ms__dropdown')).toBeHidden();

        const ev = await page.evaluate(() => (window as any).__events);
        expect(ev.select).toHaveLength(1);
        expect(ev.deselect).toHaveLength(0);
        expect(ev.change).toHaveLength(1);

        // Selection is untouched — apple stays selected.
        const sel = await page.evaluate(() =>
            (document.getElementById('single') as any).getSelected().map((o: any) => o.value));
        expect(sel).toEqual(['apple']);
    });
});
