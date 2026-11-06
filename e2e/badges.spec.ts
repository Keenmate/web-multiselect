import { test, expect, Page, Locator } from './fixtures';

/**
 * Section 2 — badges display modes, positions, thresholds, removal.
 *
 * Fixture: test/badges.html. Items are selected via UI clicks in each test
 * (rather than value) to side-step NOTES.md #1.
 */

const PAGE = '/test/badges.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openDropdown(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

async function closeDropdown(page: Page, p: Locator): Promise<void> {
    await page.mouse.click(0, 0); // click outside
    await expect(p.locator('.ms__dropdown')).not.toBeVisible();
}

async function select(p: Locator, ...values: string[]): Promise<void> {
    await openDropdown(p);
    for (const v of values) {
        await p.locator(`.ms__option[data-value="${v}"]`).click();
    }
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('display modes', () => {
    test('"badges" mode renders one badge per selection', async ({ page }) => {
        const p = picker(page, 'mode-badges');
        await select(p, 'apple', 'cherry');
        await closeDropdown(page, p);

        // Filter to the main badges container (not popover badges)
        const badges = p.locator('.ms__badges > .ms__badge:not([data-ms-action])');
        await expect(badges).toHaveCount(2);
    });

    test('"count" mode renders a single count badge instead of per-item', async ({ page }) => {
        const p = picker(page, 'mode-count');
        await select(p, 'apple', 'cherry', 'date');
        await closeDropdown(page, p);

        const countBadge = p.locator('.ms__badge[data-ms-action="show-selected"]');
        await expect(countBadge).toHaveCount(1);
        await expect(countBadge).toContainText(/3/);
    });

    test('"compact" mode renders first label + "+N more"', async ({ page }) => {
        const p = picker(page, 'mode-compact');
        await select(p, 'apple', 'cherry', 'date');
        await closeDropdown(page, p);

        // One named badge + one "+N more" affordance
        const moreBadge = p.locator('.ms__badge[data-ms-action="show-selected"]');
        await expect(moreBadge).toBeVisible();
        await expect(moreBadge).toContainText(/2/); // "+2 more" for 3 selected (1 shown + 2 more)
    });

    test('"partial" mode shows up to max-visible-badge-count + more badge', async ({ page }) => {
        const p = picker(page, 'mode-partial');
        await select(p, 'apple', 'banana', 'cherry', 'date');
        await closeDropdown(page, p);

        const namedBadges = p.locator('.ms__badges > .ms__badge:not([data-ms-action])');
        await expect(namedBadges).toHaveCount(2);

        const moreBadge = p.locator('.ms__badge[data-ms-action="show-selected"]');
        await expect(moreBadge).toBeVisible();
    });

    test('"none" mode renders no badges at all', async ({ page }) => {
        const p = picker(page, 'mode-none');
        await select(p, 'apple', 'cherry');
        await closeDropdown(page, p);

        await expect(p.locator('.ms__badges > .ms__badge')).toHaveCount(0);
    });
});

test.describe('positions', () => {
    test('position="top" places badges above input', async ({ page }) => {
        const p = picker(page, 'pos-top');
        await select(p, 'apple');
        await closeDropdown(page, p);

        const badgesBox = await p.locator('.ms__badges').boundingBox();
        const inputBox = await p.locator('.ms__input').boundingBox();
        expect(badgesBox!.y + badgesBox!.height).toBeLessThanOrEqual(inputBox!.y + 4);
    });

    test('position="bottom" places badges below input', async ({ page }) => {
        const p = picker(page, 'pos-bottom');
        await select(p, 'apple');
        await closeDropdown(page, p);

        const badgesBox = await p.locator('.ms__badges').boundingBox();
        const inputBox = await p.locator('.ms__input').boundingBox();
        expect(badgesBox!.y).toBeGreaterThanOrEqual(inputBox!.y + inputBox!.height - 4);
    });

    test('position="left" places badges to the left of input (inline layout)', async ({ page }) => {
        const p = picker(page, 'pos-left');
        await select(p, 'apple');
        await closeDropdown(page, p);

        const wrapper = p.locator('.ms__wrapper');
        await expect(wrapper).toHaveClass(/ms__wrapper--inline/);
    });

    test('position="right" uses inline layout', async ({ page }) => {
        const p = picker(page, 'pos-right');
        await select(p, 'apple');
        await closeDropdown(page, p);

        const wrapper = p.locator('.ms__wrapper');
        await expect(wrapper).toHaveClass(/ms__wrapper--inline/);
    });
});

test.describe('threshold', () => {
    test('badges-threshold switches to count when exceeded (default count mode)', async ({ page }) => {
        const p = picker(page, 'threshold-count');

        // Two selected — still under threshold, badges visible.
        await select(p, 'apple', 'banana');
        await closeDropdown(page, p);
        await expect(p.locator('.ms__badges > .ms__badge:not([data-ms-action])')).toHaveCount(2);

        // Three selected — over threshold, switches to count badge.
        await openDropdown(p);
        await p.locator('.ms__option[data-value="cherry"]').click();
        await closeDropdown(page, p);
        const countBadge = p.locator('.ms__badge[data-ms-action="show-selected"]');
        await expect(countBadge).toBeVisible();
        await expect(countBadge).toContainText(/3/);
    });

    test('badges-threshold-mode="partial" shows partial badges + more over threshold', async ({ page }) => {
        const p = picker(page, 'threshold-partial');
        await select(p, 'apple', 'banana', 'cherry', 'date');
        await closeDropdown(page, p);

        const namedBadges = p.locator('.ms__badges > .ms__badge:not([data-ms-action])');
        await expect(namedBadges).toHaveCount(2);
        await expect(p.locator('.ms__badge[data-ms-action="show-selected"]')).toBeVisible();
    });
});

test.describe('badge interaction', () => {
    test('badge X button removes the item', async ({ page }) => {
        const p = picker(page, 'mode-badges');
        await select(p, 'apple', 'cherry');
        await closeDropdown(page, p);

        await p.locator('.ms__badge:not([data-ms-action])').first().locator('.ms__badge-remove').click();

        const remaining = p.locator('.ms__badges > .ms__badge:not([data-ms-action])');
        await expect(remaining).toHaveCount(1);
        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['cherry']);
    });

    test('clicking the count badge opens the selected-items popover', async ({ page }) => {
        const p = picker(page, 'mode-count');
        await select(p, 'apple', 'cherry');
        await closeDropdown(page, p);

        await p.locator('.ms__badge[data-ms-action="show-selected"]').click();
        await expect(p.locator('.ms__selected-popover')).toBeVisible();
    });
});

test.describe('selected-order', () => {
    // Read the visible badge labels in DOM order (named badges only, not the "+N more").
    async function badgeLabels(p: Locator): Promise<string[]> {
        return p.locator('.ms__badges > .ms__badge:not([data-ms-action]) .ms__badge-text').allInnerTexts();
    }

    // Select in DATA order so "as-selected" == insertion order: Mango, Apricot, Plum.
    async function selectAllPriced(p: Locator): Promise<void> {
        await select(p, 'm', 'a', 'p');
    }

    test('"as-selected" (default) keeps insertion order', async ({ page }) => {
        const p = picker(page, 'order-as-selected');
        await selectAllPriced(p);
        await closeDropdown(page, p);
        expect(await badgeLabels(p)).toEqual(['Mango', 'Apricot', 'Plum']);
    });

    test('"label-asc" sorts badges A→Z by label', async ({ page }) => {
        const p = picker(page, 'order-label-asc');
        await selectAllPriced(p);
        await closeDropdown(page, p);
        expect(await badgeLabels(p)).toEqual(['Apricot', 'Mango', 'Plum']);
    });

    test('"label-desc" sorts badges Z→A by label', async ({ page }) => {
        const p = picker(page, 'order-label-desc');
        await selectAllPriced(p);
        await closeDropdown(page, p);
        expect(await badgeLabels(p)).toEqual(['Plum', 'Mango', 'Apricot']);
    });

    test('"member" sorts numerically by the sort-key property (price asc)', async ({ page }) => {
        const p = picker(page, 'order-member');
        await selectAllPriced(p);
        await closeDropdown(page, p);
        expect(await badgeLabels(p)).toEqual(['Apricot', 'Plum', 'Mango']); // 10, 20, 30
    });

    test('"custom" uses the comparator callback (price desc)', async ({ page }) => {
        const p = picker(page, 'order-custom');
        await selectAllPriced(p);
        await closeDropdown(page, p);
        expect(await badgeLabels(p)).toEqual(['Mango', 'Plum', 'Apricot']); // 30, 20, 10
    });

    test('ordering does NOT reorder the emitted value (getValue keeps as-selected)', async ({ page }) => {
        const p = picker(page, 'order-label-asc');
        await selectAllPriced(p);
        await closeDropdown(page, p);
        // Badges are Apricot, Mango, Plum — but getValue stays insertion order.
        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['m', 'a', 'p']);
    });

    test('partial "+N more" hides the items sorted AFTER the visible slice, and its X removes exactly those', async ({ page }) => {
        const p = picker(page, 'order-partial-member'); // max-visible=1, price asc
        await selectAllPriced(p);
        await closeDropdown(page, p);

        // Sorted price-asc: Apricot(10), Plum(20), Mango(30). Visible = [Apricot].
        expect(await badgeLabels(p)).toEqual(['Apricot']);
        const moreBadge = p.locator('.ms__badge--more');
        await expect(moreBadge).toContainText(/2/); // +2 more (Plum, Mango)

        // The X on the more-badge removes the two hidden (higher-priced) items only.
        await moreBadge.locator('.ms__badge-remove').click();
        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual(['a']);
    });
});

// The selected-items popover switches to virtual scrolling at 100+ selected. Its rows used a
// fixed 36px (`badge-height` default) while every other badge is --ms-badge-height (27px).
test.describe('virtual popover rows match the badge height', () => {
    async function openBigPopover(page: Page, attrs: Record<string, string> = {}, style = ''): Promise<Locator> {
        const id = 'vp-' + Math.random().toString(36).slice(2, 8);
        await page.evaluate(({ id, attrs, style }) => {
            const el = document.createElement('web-multiselect') as any;
            el.id = id;
            el.setAttribute('badges-display-mode', 'count');
            for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
            if (style) el.setAttribute('style', style);
            document.body.appendChild(el);
            el.options = Array.from({ length: 120 }, (_, i) => ({ value: 'v' + i, label: 'Item ' + i }));
            el.setSelected(el.options.map((o: any) => o.value));
        }, { id, attrs, style });
        const p = page.locator('#' + id);
        await p.locator('[data-ms-action="show-selected"]').first().click();
        await expect(p.locator('.ms__selected-popover-body--virtual .ms__badge').first()).toBeVisible();
        return p;
    }
    const rowHeight = (p: Locator) => p.locator('.ms__selected-popover-body--virtual .ms__badge').first().evaluate(b => b.getBoundingClientRect().height);
    const rowPitch = (p: Locator) => p.locator('.ms__selected-popover-body--virtual .ms__badge').evaluateAll(bs => bs[1].getBoundingClientRect().top - bs[0].getBoundingClientRect().top);
    const badgeHeightVar = (p: Locator) => p.evaluate(el => {
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;height:var(--ms-badge-height)';
        el.shadowRoot!.appendChild(probe);
        const h = probe.getBoundingClientRect().height;
        probe.remove();
        return h;
    });

    test('default: rows are --ms-badge-height (27px), spaced by the body gap', async ({ page }) => {
        const p = await openBigPopover(page);
        expect(await badgeHeightVar(p)).toBe(27);
        expect(await rowHeight(p)).toBe(27);
        expect(await rowPitch(p)).toBe(27 + 4); // --ms-selected-popover-body-gap
    });

    test('a themed --ms-badge-height reaches the virtual rows', async ({ page }) => {
        const p = await openBigPopover(page, {}, '--ms-badge-height: 40px');
        expect(await rowHeight(p)).toBe(40);
    });

    test('an explicit badge-height still wins', async ({ page }) => {
        const p = await openBigPopover(page, { 'badge-height': '50' });
        expect(await rowHeight(p)).toBe(50);
    });

    test('fullscreen sheet: virtual rows match the larger non-virtual badges of the sheet', async ({ page }) => {
        const nonVirtualHeight = await page.evaluate(async () => {
            const el = document.createElement('web-multiselect') as any;
            el.setAttribute('presentation', 'fullscreen');
            el.setAttribute('badges-display-mode', 'count');
            document.body.appendChild(el);
            el.options = Array.from({ length: 10 }, (_, i) => ({ value: 'v' + i, label: 'Item ' + i }));
            el.setSelected(el.options.map((o: any) => o.value));
            await new Promise((r) => setTimeout(r, 100));
            el.shadowRoot.querySelector('[data-ms-action="show-selected"]').click();
            await new Promise((r) => setTimeout(r, 300));
            const h = el.shadowRoot.querySelector('.ms__selected-popover-body .ms__badge').getBoundingClientRect().height;
            el.remove();
            return h;
        });
        expect(nonVirtualHeight).toBeGreaterThan(27); // the sheet's own --ms-badge-height
        const p = await openBigPopover(page, { presentation: 'fullscreen' });
        expect(Math.abs(await rowHeight(p) - nonVirtualHeight)).toBeLessThan(0.5);
    });

    test('a live presentation switch re-measures the open virtual rows', async ({ page }) => {
        const p = await openBigPopover(page, { presentation: 'floating' });
        expect(await rowHeight(p)).toBe(27);
        await p.evaluate(el => el.setAttribute('presentation', 'fullscreen'));
        await expect(p.locator('.ms__selected-popover--fullscreen')).toHaveCount(1);
        await expect.poll(() => rowHeight(p)).toBeGreaterThan(40); // the sheet's 4.2 × --ms-rem
        await p.evaluate(el => el.setAttribute('presentation', 'floating'));
        await expect(p.locator('.ms__selected-popover--fullscreen')).toHaveCount(0);
        await expect.poll(() => rowHeight(p)).toBe(27);
    });
});

// Option values are attribute data (escaped into `data-value`); display values are trusted HTML.
test.describe('escaping', () => {
    const QUOTED = 'say "hi" <now>';
    const APOS = "it's & more";

    test('a value with " / < / \' / & selects, renders a badge and is removed by its X', async ({ page }) => {
        const p = picker(page, 'escape-values');
        await openDropdown(p);
        await p.locator('.ms__option', { hasText: 'Quoted' }).click();
        await p.locator('.ms__option', { hasText: 'Apostrophe' }).click();
        // dataset reads back the original string
        expect(await p.locator('.ms__option', { hasText: 'Quoted' }).getAttribute('data-value')).toBe(QUOTED);
        await closeDropdown(page, p);

        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([QUOTED, APOS]);
        const badges = p.locator('.ms__badges > .ms__badge:not([data-ms-action])');
        await expect(badges).toHaveCount(2);
        await expect(badges.first()).toContainText('Quoted');

        await badges.first().locator('.ms__badge-remove').click();
        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([APOS]);
        await expect(badges).toHaveCount(1);
    });

    test('renderBadgeCallback wrapper carries the escaped value; its remove action works', async ({ page }) => {
        const p = picker(page, 'escape-custom-badge');
        await openDropdown(p);
        await p.locator('.ms__option', { hasText: 'Quoted' }).click();
        await closeDropdown(page, p);

        const badge = p.locator('.ms__badge--custom');
        await expect(badge).toHaveCount(1);
        expect(await badge.getAttribute('data-value')).toBe(QUOTED);
        await badge.locator('[data-ms-action="remove"]').click();
        expect(await p.evaluate((el: any) => el.selectedValue)).toEqual([]);
        await expect(badge).toHaveCount(0);
    });

    test('an HTML display value renders as HTML in the option and the badge', async ({ page }) => {
        const p = picker(page, 'escape-values');
        await openDropdown(p);
        const option = p.locator('.ms__option[data-value="bold"]');
        await expect(option.locator('b')).toHaveText('Bold');
        await option.click();
        await closeDropdown(page, p);
        await expect(p.locator('.ms__badges > .ms__badge .ms__badge-text b')).toHaveText('Bold');
    });
});
