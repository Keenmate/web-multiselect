import { test, expect, Page, Locator } from './fixtures';

/**
 * E2E for `search-mode="navigate"` on a TREE.
 *
 * Filter mode collapses the hierarchy to matches + ancestors; navigate mode instead
 * keeps the whole (always-expanded) tree visible and jumps focus between matches —
 * the same contract as a flat list, which trees previously ignored (the tree search
 * path short-circuited before the filter/navigate switch). Desktop steps matches with
 * Ctrl+Arrow; the phone fullscreen sheet gets the on-screen match navigator.
 *
 * Fixture: test/tree.html (`tree-navigate`, `tree-navigate-fs`).
 * Tree data (8 nodes): Fruit > {Apple > {Gala, Fuji}, Pear}, Vegetables > {Carrot, Kale}.
 * Term "e" matches Apple, Pear, Vegetables, Kale (4 of 8).
 */

const PAGE = '/test/tree.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

const input = (p: Locator) => p.locator('.ms__input');
const options = (p: Locator) => p.locator('.ms__option:visible');
const matched = (p: Locator) => p.locator('.ms__option--matched');
const focused = (p: Locator) => p.locator('.ms__option--focused');

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
});

test.describe('tree — navigate mode (floating)', () => {
    async function openDropdown(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown')).toBeVisible();
    }

    test('keeps the whole tree visible and highlights matches in place', async ({ page }) => {
        const p = picker(page, 'tree-navigate');
        await openDropdown(p);
        await expect(options(p)).toHaveCount(8); // full tree before searching

        await input(p).fill('e');

        // The list is NOT narrowed — all 8 nodes remain visible (that's the point of
        // navigate mode); only the 4 matches gain the --matched highlight.
        await expect(options(p)).toHaveCount(8);
        await expect(matched(p)).toHaveCount(4);
    });

    test('focus jumps to the first match', async ({ page }) => {
        const p = picker(page, 'tree-navigate');
        await openDropdown(p);

        await input(p).fill('e');
        // First match in document order is Apple (index 1).
        await expect(focused(p)).toHaveText(/Apple/);
    });

    test('clearing the search restores the tree with no matches', async ({ page }) => {
        const p = picker(page, 'tree-navigate');
        await openDropdown(p);

        await input(p).fill('e');
        await expect(matched(p)).toHaveCount(4);

        await input(p).fill('');
        await expect(options(p)).toHaveCount(8);
        await expect(matched(p)).toHaveCount(0);
    });

    test('Ctrl+ArrowDown / ArrowUp step focus through matches', async ({ page }) => {
        const p = picker(page, 'tree-navigate');
        await openDropdown(p);
        await input(p).fill('e'); // matches: Apple, Pear, Vegetables, Kale
        await expect(focused(p)).toHaveText(/Apple/);

        await input(p).press('Control+ArrowDown');
        await expect(focused(p)).toHaveText(/Pear/);

        await input(p).press('Control+ArrowDown');
        await expect(focused(p)).toHaveText(/Vegetables/);

        await input(p).press('Control+ArrowUp');
        await expect(focused(p)).toHaveText(/Pear/);
    });
});

test.describe('tree — navigate mode (fullscreen match navigator)', () => {
    const fsSearch = (p: Locator) => p.locator('.ms__fullscreen-search');
    const nav = (p: Locator) => p.locator('.ms__fullscreen-nav');
    const navCount = (p: Locator) => p.locator('.ms__fullscreen-nav-count');

    async function openFullscreen(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
    }

    test('navigator is hidden until a term is entered, then shows "N of M"', async ({ page }) => {
        const p = picker(page, 'tree-navigate-fs');
        await openFullscreen(p);
        await expect(nav(p)).toBeHidden();

        await fsSearch(p).fill('e');
        await expect(nav(p)).toBeVisible();
        await expect(navCount(p)).toHaveText('1 of 4');
        await expect(options(p)).toHaveCount(8); // whole tree still visible
    });

    test('prev/next step focus through matches and update the count', async ({ page }) => {
        const p = picker(page, 'tree-navigate-fs');
        await openFullscreen(p);
        await fsSearch(p).fill('e');

        await expect(focused(p)).toHaveText(/Apple/);
        await p.locator('.ms__fullscreen-nav-btn--next').click();
        await expect(navCount(p)).toHaveText('2 of 4');
        await expect(focused(p)).toHaveText(/Pear/);

        await p.locator('.ms__fullscreen-nav-btn--prev').click();
        await expect(navCount(p)).toHaveText('1 of 4');
        await expect(focused(p)).toHaveText(/Apple/);
    });

    test('no matches disables the step buttons', async ({ page }) => {
        const p = picker(page, 'tree-navigate-fs');
        await openFullscreen(p);
        await fsSearch(p).fill('zzzz');

        await expect(nav(p)).toBeVisible();
        await expect(p.locator('.ms__fullscreen-nav-btn--next')).toBeDisabled();
        await expect(p.locator('.ms__fullscreen-nav-btn--prev')).toBeDisabled();
    });
});

test.describe('tree — fullscreen search-mode toggle (show-search-mode-toggle)', () => {
    const fsSearch = (p: Locator) => p.locator('.ms__fullscreen-search');
    const nav = (p: Locator) => p.locator('.ms__fullscreen-nav');
    const toggle = (p: Locator) => p.locator('.ms__fullscreen-mode-toggle');

    // Fixture tree-navigate-fs-toggle starts in FILTER mode, so the toggle builds the
    // navigator on demand when switched to navigate. Term "e" matches 4 of 8.
    async function openFullscreen(p: Locator): Promise<void> {
        await input(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible();
    }

    test('toggle reflects the current mode and is present at the search leading edge', async ({ page }) => {
        const p = picker(page, 'tree-navigate-fs-toggle');
        await openFullscreen(p);
        // Starts in filter mode → funnel icon, label points to the other mode.
        await expect(toggle(p)).toHaveAttribute('data-mode', 'filter');
        await expect(toggle(p)).toHaveAttribute('aria-label', 'Switch to navigate mode');
    });

    test('switching mode on an empty search box leaves nothing focused', async ({ page }) => {
        const p = picker(page, 'tree-navigate-fs-toggle');
        await openFullscreen(p);
        // Empty box on open: no row focused (parity with a fresh open).
        await expect(focused(p)).toHaveCount(0);
        await toggle(p).click(); // → navigate, still empty
        await expect(focused(p)).toHaveCount(0);
        await toggle(p).click(); // → filter, still empty (the reported bug)
        await expect(focused(p)).toHaveCount(0);
        // Typing still auto-focuses the first result.
        await fsSearch(p).fill('e');
        await expect(focused(p)).toHaveCount(1);
    });

    test('the placeholder is mode-aware and switches with the toggle', async ({ page }) => {
        const p = picker(page, 'tree-navigate-fs-toggle');
        await openFullscreen(p);
        // No labels.searchPlaceholder + toggle on → mode-aware default.
        await expect(fsSearch(p)).toHaveAttribute('placeholder', 'Filter…');
        await toggle(p).click();
        await expect(fsSearch(p)).toHaveAttribute('placeholder', 'Search…');
        await toggle(p).click();
        await expect(fsSearch(p)).toHaveAttribute('placeholder', 'Filter…');
    });

    test('clicking flips filter → navigate live: whole tree returns, navigator appears', async ({ page }) => {
        const p = picker(page, 'tree-navigate-fs-toggle');
        await openFullscreen(p);

        // Filter mode: typing narrows the tree to matches + ancestors, no navigator.
        await fsSearch(p).fill('e');
        await expect(nav(p)).toBeHidden();
        await expect(options(p)).toHaveCount(5); // Fruit>Apple, Pear, Vegetables>Kale (matches + ancestors)

        // Flip to navigate in place — no reopen.
        await toggle(p).click();
        await expect(p.locator('.ms__dropdown--fullscreen')).toBeVisible(); // still open
        await expect(toggle(p)).toHaveAttribute('data-mode', 'navigate');
        await expect(options(p)).toHaveCount(8); // whole tree back
        await expect(matched(p)).toHaveCount(4);
        await expect(nav(p)).toBeVisible();
        await expect(p.locator('.ms__fullscreen-nav-count')).toHaveText('1 of 4');
    });

    test('flipping navigate → filter removes the navigator and re-narrows the list', async ({ page }) => {
        const p = picker(page, 'tree-navigate-fs-toggle');
        await openFullscreen(p);
        await fsSearch(p).fill('e');

        await toggle(p).click(); // → navigate
        await expect(nav(p)).toBeVisible();

        await toggle(p).click(); // → filter
        await expect(toggle(p)).toHaveAttribute('data-mode', 'filter');
        await expect(nav(p)).toBeHidden();
        await expect(options(p)).toHaveCount(5);
    });
});
