import { test, expect, Page, Locator } from './fixtures';

/**
 * Section 6 — keyboard navigation.
 */

const PAGE = '/test/keyboard.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function openWithKeyboard(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
}

function focused(p: Locator): Locator {
    return p.locator('.ms__option--focused');
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('basic arrow navigation', () => {
    test('ArrowDown moves focus down', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('ArrowDown');
        await expect(focused(p)).toContainText('Item 00');

        await page.keyboard.press('ArrowDown');
        await expect(focused(p)).toContainText('Item 01');
    });

    test('ArrowUp moves focus up', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        await expect(focused(p)).toContainText('Item 00');
    });

    test('Home jumps to first option', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Home');
        await expect(focused(p)).toContainText('Item 00');
    });

    test('End jumps to last option', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);
        await page.keyboard.press('End');
        await expect(focused(p)).toContainText('Item 19');
    });

    test('Home/End are caret-aware in the search box (move the caret before navigating)', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        const input = p.locator('.ms__input');
        await openWithKeyboard(p);
        await input.type('item');                 // filters + auto-focuses the first result
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');    // focus Item 03; caret sits at end (4)
        await expect(focused(p)).toContainText('Item 03');

        // Home with the caret NOT at 0 → moves the caret, does NOT steal list focus.
        await page.keyboard.press('Home');
        await expect(input).toHaveJSProperty('selectionStart', 0);
        await expect(focused(p)).toContainText('Item 03');

        // Home again (caret already at 0) → now it navigates to the first option.
        await page.keyboard.press('Home');
        await expect(focused(p)).toContainText('Item 00');

        // End with the caret at 0 → moves the caret to the end (no navigation yet).
        await page.keyboard.press('End');
        await expect(input).toHaveJSProperty('selectionStart', 4);
    });

    test('PageDown moves 10 options', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);
        await page.keyboard.press('ArrowDown'); // → Item 00
        await page.keyboard.press('PageDown');
        await expect(focused(p)).toContainText('Item 10');
    });

    test('PageUp moves 10 options up', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);
        await page.keyboard.press('End'); // → Item 19
        await page.keyboard.press('PageUp');
        await expect(focused(p)).toContainText('Item 09');
    });
});

test.describe('Enter / Escape', () => {
    test('Enter toggles selection of focused option', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        expect(await p.evaluate((el: any) => el.getValue())).toEqual(['item-0']);
    });

    test('Escape with non-empty search clears search', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await p.locator('.ms__input').fill('Item 01');
        await page.keyboard.press('Escape');
        await expect(p.locator('.ms__input')).toHaveValue('');
        await expect(p.locator('.ms__dropdown')).toBeVisible();
    });

    test('Escape with empty search closes dropdown', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('Escape');
        await expect(p.locator('.ms__dropdown')).not.toBeVisible();
    });
});

test.describe('click anchors keyboard focus', () => {
    test('ArrowDown after click moves to the option below the clicked one', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        // Click Item 05 — the production code must do two things:
        //   1) anchor focusedIndex to the clicked option (5), so ArrowDown
        //      increments to 6 instead of jumping back to 0;
        //   2) put focus back on the search input (which clicks knock loose
        //      because each option contains a focusable checkbox), so the
        //      keydown listener actually receives the next ArrowDown.
        // No manual .focus() here — that's the production behavior under test.
        await p.locator('.ms__option').filter({ hasText: 'Item 05' }).click();
        await page.keyboard.press('ArrowDown');

        await expect(focused(p)).toContainText('Item 06');
    });
});

test.describe('navigate mode shortcuts', () => {
    test('Ctrl+ArrowDown jumps to next match', async ({ page }) => {
        const p = picker(page, 'kb-navigate');
        await openWithKeyboard(p);

        // "Item 1" matches Item 01, 10-19 — multiple matches.
        await p.locator('.ms__input').fill('Item 1');
        await page.keyboard.press('Control+ArrowDown');
        // Cursor should be on one of the matches.
        await expect(p.locator('.ms__option--matched')).not.toHaveCount(0);
    });
});

test.describe('grouped options focus highlight', () => {
    test('only the actually-focused option lights up', async ({ page }) => {
        const p = picker(page, 'kb-grouped');
        await openWithKeyboard(p);

        // Focus the 2nd item via keyboard.
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');

        // Exactly one option has the --focused class even across multiple groups.
        await expect(focused(p)).toHaveCount(1);
    });
});

test.describe('focused option scrolls into view', () => {
    test('End scrolls last option into the viewport', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await openWithKeyboard(p);

        await page.keyboard.press('End');

        // The focused last option must be visible (in viewport).
        const focusedOpt = focused(p);
        await expect(focusedOpt).toBeInViewport();
    });
});

test.describe('beforeKeydownCallback — consumer keyboard hook', () => {
    test('a custom shortcut can navigate via the controller and suppress the default', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        // Bind before opening: pressing "g" jumps to the last option and swallows the key.
        await p.evaluate((el: any) => {
            el.beforeKeydownCallback = ({ key, event, controller }: any) => {
                if (key === 'g') { event.preventDefault(); controller.focusLast(); return false; }
            };
        });
        await openWithKeyboard(p);

        await page.keyboard.press('g');
        // Focus jumped to the last option, and "g" was NOT typed into the search box.
        await expect(focused(p)).toContainText('Item 19');
        await expect(p.locator('.ms__input')).toHaveValue('');
    });

    test('returning nothing lets the built-in handling run', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        // A hook that only cares about "g" — every other key falls through to defaults.
        await p.evaluate((el: any) => {
            el.beforeKeydownCallback = ({ key }: any) => (key === 'g' ? false : undefined);
        });
        await openWithKeyboard(p);

        await page.keyboard.press('ArrowDown');       // default nav still works
        await expect(focused(p)).toContainText('Item 00');
        await p.locator('.ms__input').type('x');      // default typing still works
        await expect(p.locator('.ms__input')).toHaveValue('x');
    });

    test('controller.selectValue is a true select-all (idempotent, not a toggle)', async ({ page }) => {
        const p = picker(page, 'kb-filter');
        await p.evaluate((el: any) => {
            el.beforeKeydownCallback = ({ key, event, controller, filteredOptions }: any) => {
                if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'a') {
                    event.preventDefault();
                    filteredOptions.forEach((o: any) => controller.selectValue(o.value));
                    return false;
                }
            };
        });
        await openWithKeyboard(p);

        const total = await p.locator('.ms__option').count();
        // Pre-select one so a toggle would DEselect it — selectValue must not.
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        expect(await p.evaluate((el: any) => el.getValue().length)).toBe(1);

        await page.keyboard.press('Control+a');
        expect(await p.evaluate((el: any) => el.getValue().length)).toBe(total);
        // Pressing it again keeps them all selected (idempotent), not inverted.
        await page.keyboard.press('Control+a');
        expect(await p.evaluate((el: any) => el.getValue().length)).toBe(total);
    });
});
