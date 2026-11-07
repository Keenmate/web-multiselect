import { test, expect } from './fixtures';

// The dropdown on core createPopover(): behaviours no other spec pins (re-anchoring after async
// results, the floating ↔ fullscreen switch while open).

test.beforeEach(async ({ page }) => {
    await page.goto('/test/search.html');
});

test('async results that outgrow the space below flip the open dropdown above (reanchor)', async ({ page }) => {
    await page.evaluate(() => {
        const box = document.createElement('div');
        box.style.cssText = 'position: fixed; left: 20px; right: 20px; bottom: 170px;'; // the empty panel fits below, 40 results don't
        const ms = document.createElement('web-multiselect') as any;
        ms.id = 'async-reanchor';
        box.append(ms);
        document.body.append(box);
        const items = Array.from({ length: 40 }, (_, i) => ({ value: `v${i}`, label: `Result ${i}` }));
        ms.searchCallback = async () => {
            await new Promise((r) => setTimeout(r, 400));
            return items;
        };
    });
    const ms = page.locator('#async-reanchor');
    await ms.locator('.ms__input').click();
    await ms.locator('.ms__input').pressSequentially('re');
    const dropdown = ms.locator('.ms__dropdown');
    await expect(dropdown).toBeVisible();
    await expect(ms.locator('.ms__option').first()).toBeVisible({ timeout: 3000 });
    await expect.poll(async () => {
        const input = (await ms.locator('.ms__input-wrapper').boundingBox())!;
        const panel = (await dropdown.boundingBox())!;
        return panel.y + panel.height <= input.y + 1; // above the field
    }, { timeout: 3000 }).toBe(true);
});

test('fullscreen ↔ floating while open: un-anchoring hands the panel back to CSS, re-anchoring places it again', async ({ page }) => {
    const ms = page.locator('web-multiselect').first();
    await ms.locator('.ms__input').click();
    const dropdown = ms.locator('.ms__dropdown');
    await expect(dropdown).toBeVisible();
    const inline = () => dropdown.evaluate((el: HTMLElement) => ({ position: el.style.position, left: el.style.left, visibility: el.style.visibility }));
    await expect.poll(async () => (await inline()).position).toBe('fixed');

    await ms.evaluate((el: any) => el.setAttribute('presentation', 'fullscreen'));
    await expect.poll(async () => (await inline()).left).toBe(''); // core put back the panel's own (empty) left
    const sheet = (await dropdown.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(sheet.width).toBeGreaterThan(viewport.width - 2); // CSS fullscreen, not anchored

    await ms.evaluate((el: any) => el.setAttribute('presentation', 'floating'));
    await expect.poll(async () => (await inline()).position).toBe('fixed');
    const input = (await ms.locator('.ms__input-wrapper').boundingBox())!;
    const panel = (await dropdown.boundingBox())!;
    expect(Math.abs(panel.y - (input.y + input.height)) < 12 || panel.y + panel.height <= input.y + 1).toBe(true);
    expect((await inline()).visibility).toBe('');
});
