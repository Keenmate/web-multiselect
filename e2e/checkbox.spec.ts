import { test, expect, Page, Locator } from './fixtures';

/**
 * The option checkbox is a custom-drawn box (native appearance removed). It reads
 * as a real control via a dedicated mid-grey border colour (--ms-checkbox-border-color,
 * default #8f8f8f) rather than the generic --ms-border, plus a bold checkmark when
 * checked. Width/colour are themeable via --ms-checkbox-border-width/-color.
 */

const PAGE = '/test/tree.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

// A leaf row carries the checkbox (branches don't, in this fixture).
const LEAF_CB = '.ms__option[data-path="1.1.1"] .ms__checkbox';

async function openLeafCheckbox(page: Page, id: string): Promise<Locator> {
    const p = picker(page, id);
    await p.locator('.ms__input').click();
    await expect(p.locator('.ms__dropdown')).toBeVisible();
    return p.locator(LEAF_CB);
}

test('unchecked checkbox uses the dedicated mid-grey border colour', async ({ page }) => {
    await page.goto(PAGE);
    const cb = await openLeafCheckbox(page, 'tree-sel-member');
    await expect(cb).toHaveCSS('border-top-width', '1px');
    // #8f8f8f → rgb(143, 143, 143)
    await expect(cb).toHaveCSS('border-top-color', 'rgb(143, 143, 143)');
});

/**
 * --ms-checkbox-scale (shared --base-checkbox-scale contract) resizes the box via
 * calc, NOT a CSS transform: box-sizing is border-box and the declared size IS the
 * rendered outer size, so width/height/border-width/radius all grow proportionally
 * while the masked ::after tick stays crisp (a transform would promote a compositing
 * layer and pixel-snap the mark off-centre). Defaults: --ms-rem 10px → 1.6rem box
 * (16px), 1px border, 0.3rem radius (3px). See variables.css + options.css comments.
 */
test('default scale renders the baseline box geometry', async ({ page }) => {
    await page.goto(PAGE);
    const cb = await openLeafCheckbox(page, 'tree-sel-member');
    await expect(cb).toHaveCSS('width', '16px');
    await expect(cb).toHaveCSS('height', '16px');
    await expect(cb).toHaveCSS('border-top-left-radius', '3px');
    // box-sizing: border-box is load-bearing — the declared size is the outer size.
    await expect(cb).toHaveCSS('box-sizing', 'border-box');
});

test('--ms-checkbox-scale grows box, border-width and radius proportionally (no transform)', async ({ page }) => {
    await page.goto(PAGE);
    // Set the scale on the host before opening so the first paint already carries it.
    await picker(page, 'tree-sel-member').evaluate((el) => {
        el.style.setProperty('--ms-checkbox-scale', '2');
    });
    const cb = await openLeafCheckbox(page, 'tree-sel-member');

    // 16px × 2 = 32px box; 1px × 2 = 2px border; 3px × 2 = 6px radius.
    await expect(cb).toHaveCSS('width', '32px');
    await expect(cb).toHaveCSS('height', '32px');
    await expect(cb).toHaveCSS('border-top-width', '2px');
    await expect(cb).toHaveCSS('border-top-left-radius', '6px');
    // The box must NOT be scaled via transform (that's the regression this guards).
    await expect(cb).toHaveCSS('transform', 'none');
});
