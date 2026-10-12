import { test, expect, Page, Locator } from './fixtures';

/**
 * E2E for the option row-height and long-title knobs (used by tree rows, but
 * general to every `.ms__option`):
 *   - `--ms-option-min-height` gives an adjustable minimum row height.
 *   - `--ms-option-title-white-space` / `-overflow` / `-text-overflow` flip the
 *     title label (`.ms__option-title`, the treeview `node-label` analog) from
 *     the default wrap to single-line ellipsis truncation.
 * Verified in a real browser because both ride computed layout.
 */

const PAGE = '/test/tree.html';

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

test('default: long titles wrap (multi-line, not truncated)', async ({ page }) => {
    const p = picker(page, 'tree-multi');
    await openDropdown(p);
    const title = p.locator('.ms__option[data-path="1"] .ms__option-title');
    await expect(title).toHaveCSS('white-space', 'normal');
    await expect(title).toHaveCSS('text-overflow', 'clip');
});

test('--ms-option-title-* variables truncate the title to one line with ellipsis', async ({ page }) => {
    const p = picker(page, 'tree-truncate');
    await openDropdown(p);
    const title = p.locator('.ms__option[data-path="1"] .ms__option-title');

    await expect(title).toHaveCSS('white-space', 'nowrap');
    await expect(title).toHaveCSS('overflow-x', 'hidden');
    await expect(title).toHaveCSS('text-overflow', 'ellipsis');

    // Truncated → the rendered box is narrower than the text's natural width.
    const clipped = await title.evaluate(
        (el) => el.scrollWidth > el.clientWidth + 1
    );
    expect(clipped).toBe(true);
});

test('--ms-option-min-height sets an adjustable row height', async ({ page }) => {
    const p = picker(page, 'tree-tall');
    await openDropdown(p);
    const row = p.locator('.ms__option[data-path="1.2"]'); // the SHORT label

    // min-height wins even for a short single-line row.
    const h = await row.evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(56);
});

// Left edge of a row's label text (`.ms__option-title`), in the row's own
// coordinate space — this is what "ragged vs aligned" is about.
async function labelOffset(p: Locator, path: string): Promise<number> {
    const row = p.locator(`.ms__option[data-path="${path}"]`);
    return row.evaluate((el) => {
        const title = el.querySelector('.ms__option-title') as HTMLElement;
        return title.getBoundingClientRect().left - el.getBoundingClientRect().left;
    });
}

test('default slot: an icon-less row has no icon gutter (label starts further left)', async ({ page }) => {
    const p = picker(page, 'tree-icons');
    await openDropdown(p);

    // Fruit (1) carries an icon; Pear (1.2) does not → no slot rendered at all by default.
    await expect(p.locator('.ms__option[data-path="1"] .ms__option-icon')).toHaveCount(1);
    await expect(p.locator('.ms__option[data-path="1.2"] .ms__option-icon')).toHaveCount(0); // Pear: no icon

    // Within the SAME depth (level 2): Gala (1.1.1 has icon) vs Fuji (1.1.2 no icon) are
    // siblings → identical indent, so the label offsets differ by the icon slot width.
    const gala = await labelOffset(p, '1.1.1'); // has icon
    const fuji = await labelOffset(p, '1.1.2'); // no icon, no slot
    expect(gala).toBeGreaterThan(fuji + 5);
});

test('reserve-icon-slot: icon-less rows render an empty slot and share the label column', async ({ page }) => {
    const p = picker(page, 'tree-icons-reserved');
    await openDropdown(p);

    // Icon-less row now carries the reserved, empty placeholder slot.
    const emptySlot = p.locator('.ms__option[data-path="1.1.2"] .ms__option-icon.ms__option-icon--empty');
    await expect(emptySlot).toHaveCount(1);
    await expect(emptySlot).toHaveText('');

    // Siblings at the same depth now line up: icon'd Gala and icon-less Fuji share the
    // same label start column (the reserved gutter closes the gap).
    const gala = await labelOffset(p, '1.1.1'); // has icon
    const fuji = await labelOffset(p, '1.1.2'); // no icon → empty slot
    expect(Math.abs(gala - fuji)).toBeLessThanOrEqual(1);
});
