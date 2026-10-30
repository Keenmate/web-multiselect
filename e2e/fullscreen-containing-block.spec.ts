import { test, expect, Page, Locator } from './fixtures';

/**
 * Fullscreen overlay + a fixed-positioning containing block.
 *
 * The phone overlay is a `position: fixed`, full-viewport sheet. If an ancestor of the
 * host establishes a containing block for fixed descendants (`transform` / `perspective`
 * / `filter` / `backdrop-filter` / a qualifying `will-change`), the browser anchors the
 * sheet to that ancestor's box instead of the viewport, so it stops covering the screen.
 * Unlike the floating path there's no drift to measure (nothing anchors the sheet), so the
 * component proactively asks core's containing-block heuristic on open and warns once per
 * instance. This spec verifies the warning fires for a transformed ancestor and stays
 * silent for a plain one.
 *
 * Fixture: test/fullscreen-containing-block.html. `presentation="fullscreen"` forces
 * the overlay on any device, so this runs under the default desktop project.
 */

const PAGE = '/test/fullscreen-containing-block.html';
const WARN_TAG = '[@keenmate/web-multiselect] Fullscreen overlay is anchored to an ancestor';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

test('warns once, pointing at the culprit, when a transformed ancestor mis-anchors the sheet', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });

    await page.goto(PAGE);
    const p = picker(page, 'fs-transform');
    // The --fullscreen modifier is the presentation mode (persists when closed); --visible
    // is the open flag, so the open sheet is the compound of the two.
    const openSheet = p.locator('.ms__dropdown--fullscreen.ms__dropdown--visible');
    await p.locator('.ms__input').click();
    await expect(openSheet).toBeVisible();

    const fsWarnings = warnings.filter((w) => w.includes(WARN_TAG));
    expect(fsWarnings).toHaveLength(1);
    // Names the culprit element + its containing-block CSS, and stays actionable.
    expect(fsWarnings[0]).toContain('transform');
    expect(fsWarnings[0]).toContain('wrap-transform');

    // Once per instance: reopening must not warn again. Close via the sheet's own ✕
    // (Escape doesn't close the fullscreen overlay — it's the phone close affordance).
    await p.locator('.ms__fullscreen-close').click();
    await expect(openSheet).toBeHidden();
    await p.locator('.ms__input').click();
    await expect(openSheet).toBeVisible();
    expect(warnings.filter((w) => w.includes(WARN_TAG))).toHaveLength(1);
});

test('stays silent when the ancestor is a plain box (sheet anchors to the viewport)', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });

    await page.goto(PAGE);
    const p = picker(page, 'fs-plain');
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown--fullscreen.ms__dropdown--visible')).toBeVisible();

    expect(warnings.filter((w) => w.includes(WARN_TAG))).toHaveLength(0);
});
