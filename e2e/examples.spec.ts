import { test, expect } from './fixtures';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The example site — the only spec allowed on examples-*.html (rulebook C-CA-11; every component
// feature is tested on a dedicated fixture under test/):
//   - SMOKE: every examples-*.html loads with no uncaught page error (the pageErrors fixture) and
//     every custom element it uses gets defined;
//   - the Builder playground (examples-builder.html), a page-level tool with its own wiring.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = readdirSync(ROOT).filter((f) => /^examples-.*\.html$/.test(f)).sort();

for (const file of PAGES) {
    test(`${file} loads cleanly and its custom elements are defined`, async ({ page }) => {
        await page.goto(`/${file}`);
        await page.waitForLoadState('networkidle');
        const undefinedTags = await page.evaluate(async () => {
            const tags = new Set<string>();
            const walk = (root: Document | ShadowRoot) => {
                for (const el of root.querySelectorAll('*')) {
                    if (el.localName.includes('-')) tags.add(el.localName);
                    if (el.shadowRoot) walk(el.shadowRoot);
                }
            };
            walk(document);
            await Promise.race([
                Promise.all([...tags].map((t) => customElements.whenDefined(t))),
                new Promise((r) => setTimeout(r, 3000)),
            ]);
            return [...tags].filter((t) => !customElements.get(t));
        });
        expect(undefinedTags).toEqual([]);
    });
}

test.describe('Builder playground (examples-builder.html)', () => {
    /**
     * The Builder playground (examples-builder.html): a VS-style property grid that drives a live
     * <web-multiselect> via attributes/style, a paste-your-own JSON data box, and a generated-markup
     * readout. This locks the wiring — enum/bool/css-var controls reach the element, bad JSON is
     * reported, and the markup reflects the live attributes.
     */

    test('builder wires property grid + data to the live component', async ({ page }) => {
        await page.goto('/examples-builder.html');
        const demo = page.locator('#demo');

        // Expand every property group so collapsed controls are interactable.
        await page.$$eval('details.prop-group', (ds) => ds.forEach((d: any) => (d.open = true)));

        // Demo data applied (12 rows), members pre-set so it renders.
        await expect.poll(() => demo.evaluate((el: any) => el.options?.length ?? 0)).toBe(12);
        await expect(page.locator('#data-status')).toContainText('12 option');

        // Enum control → attribute on the element + reflected in generated markup.
        await page.locator('#ctl-badges-display-mode').selectOption('count');
        await expect(demo).toHaveAttribute('badges-display-mode', 'count');
        await expect(page.locator('#markup')).toContainText('badges-display-mode="count"');

        // Boolean control.
        await page.locator('#ctl-show-counter').check();
        await expect(demo).toHaveAttribute('show-counter', 'true');

        // CSS var control.
        await page.locator('[id="ctl---ms-rem"]').fill('8px');
        await page.locator('[id="ctl---ms-rem"]').dispatchEvent('input');
        await expect.poll(() => demo.evaluate((el: any) => el.style.getPropertyValue('--ms-rem'))).toBe('8px');

        // Invalid JSON → error; valid → applies.
        await page.locator('#data-input').fill('{ not an array');
        await expect(page.locator('#data-status')).toHaveClass(/data-status--err/);
        await page.locator('#data-input').fill('[{"value":"x","label":"X"}]');
        await expect.poll(() => demo.evaluate((el: any) => el.options?.length ?? 0)).toBe(1);

        // Generated markup carries the pre-set members.
        await expect(page.locator('#markup')).toContainText('value-member="value"');

        // Floating-UI info tooltip on a property explains it on hover.
        const info = page.locator('.prop-info[aria-label^="multiple:"]');
        await info.hover();
        const tip = page.locator('.builder-tip');
        await expect(tip).toHaveAttribute('data-show', '');
        await expect(tip).toContainText('single-select');
    });

    test('builder add-new actually creates the option (callback is wired)', async ({ page }) => {
        await page.goto('/examples-builder.html');
        const demo = page.locator('#demo');

        await page.locator('#ctl-allow-add-new').check();
        await demo.locator('.ms__input').click();
        await demo.locator('input').first().fill('hroch');

        await expect(demo.locator('.ms__add-new')).toContainText('hroch');
        await demo.locator('.ms__add-new').click();

        expect(await demo.evaluate((el: any) => el.selectedValue)).toContain('hroch');
        await expect(page.locator('#markup')).toContainText('beforeAddCallback');
    });

    test('builder wires member + comparator dependencies so every control bites', async ({ page }) => {
        await page.goto('/examples-builder.html');
        const demo = page.locator('#demo');
        await page.$$eval('details.prop-group', (ds) => ds.forEach((d: any) => (d.open = true)));

        // Enriched data members are pre-set and reflected in the generated markup.
        await expect(page.locator('#markup')).toContainText('subtitle-member="subtitle"');
        await expect(page.locator('#markup')).toContainText('full-title-member="fullTitle"');

        // selected-order="custom" uses the wired comparator and the markup flags the JS dependency.
        await page.locator('#ctl-selected-order').selectOption('custom');
        await expect(demo).toHaveAttribute('selected-order', 'custom');
        await expect(page.locator('#markup')).toContainText('selectedOrderCompareCallback');

        // selected-order-member control exists for order="member".
        await expect(page.locator('#ctl-selected-order-member')).toBeVisible();
    });
});

test.describe('Localization page (examples-localization.html)', () => {
    /** The shared LO01–LO06 page: no console errors, every toggle changes the text its readout shows. */
    test('every toggle changes the shown text', async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
        await page.goto('/examples-localization.html');
        const out = (id: string) => page.locator(`#${id}`);

        // LO01 — instance labels (on by default), off → English.
        await expect(out('lo01-out')).toContainText('#lo01        badge: 3 vybráno');
        await expect(out('lo01-out')).toContainText('buttons: Vybrat vše / Zrušit výběr');
        await page.locator('#lo01-labels').uncheck();
        await expect(out('lo01-out')).toContainText('#lo01        badge: 3 selected');

        // LO02 — page dictionary translates every picker.
        await expect(out('lo02-out')).toContainText('#lo02a  badge: 3 selected');
        await page.locator('#lo02-dict').check();
        await expect(out('lo02-out')).toContainText('#lo02a  badge: 3 vybráno');
        await expect(out('lo02-out')).toContainText('+2 další');
        await page.locator('#lo02-dict').uncheck();
        await expect(out('lo02-out')).toContainText('#lo02a  badge: 3 selected');

        // LO03 — page callback, then the element's own one first; instance labels still win.
        await page.locator('#lo03-page').check();
        await expect(out('lo03-out')).toContainText('#lo03a  badge: 3 vybraté');
        await expect(out('lo03-out')).toContainText('#lo03b  badge: Instance wins: 3');
        await page.locator('#lo03-own').check();
        await expect(out('lo03-out')).toContainText('#lo03a  badge: 3 ausgewählt   buttons: Vybrať všetko / Clear all');
        await page.locator('#lo03-page').uncheck();
        await page.locator('#lo03-own').uncheck();
        await expect(out('lo03-out')).toContainText('#lo03a  badge: 3 selected');

        // LO04 — tooltips.removeItem only → the aria-label twin follows.
        await expect(out('lo04-out')).toHaveText('aria-label: Remove Apple');
        await page.locator('#lo04-tooltip').check();
        await expect(out('lo04-out')).toHaveText('aria-label: Odebrat Apple');

        // LO05 — the page locale reaches the picker without its own locale only.
        await page.locator('input[name="lo05-locale"][value="de-DE"]').check();
        await expect(out('lo05-out')).toContainText('(page)   badge: 1.234 selected');
        await expect(out('lo05-out')).toContainText('(en-US)  badge: 1,234 selected');

        // LO06 — data escaped, template markup raw; shouldEscapeLabels → all text.
        await page.locator('#lo06-type').click();
        await expect(out('lo06-out')).toContainText('text:   Add <i>Ann</i>');
        await page.locator('#lo06-escape').check();
        await expect(out('lo06-out')).toContainText('text:   Add <b><i>Ann</i></b>');

        // LO07–LO09 — the dynamic placeholder (max-selected-count + {ctx.remaining} / params.ctx).
        const ph = (id: string) => page.locator(`#${id} .ms__input`);
        await expect(ph('lo07')).toHaveAttribute('placeholder', 'Select up to 5 more');
        await expect(ph('lo08')).toHaveAttribute('placeholder', 'Vyberte ještě 5 položek');
        await page.locator('#lo09').evaluate((el: any) => el.controller.selectAll());
        await expect(ph('lo09')).toHaveAttribute('placeholder', 'All 5 picked — remove one to change');

        expect(consoleErrors).toEqual([]);
    });
});
