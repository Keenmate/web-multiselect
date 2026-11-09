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

test.describe('close-on-scroll (default true, like a native select)', () => {
    async function openTallPage(page: import('@playwright/test').Page, attrs = '') {
        await page.setViewportSize({ width: 1200, height: 700 });
        await page.evaluate((extra) => {
            document.body.style.paddingBottom = '2000px';
            const box = document.createElement('div');
            box.innerHTML = `<web-multiselect id="scroll-picker" ${extra}></web-multiselect>
                <div id="other-scroller" style="height: 80px; overflow: auto"><div style="height: 400px">unrelated</div></div>`;
            document.body.prepend(box);
            const ms = box.querySelector('web-multiselect') as any;
            ms.options = Array.from({ length: 40 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));
        }, attrs);
        const ms = page.locator('#scroll-picker');
        await ms.locator('.ms__input').click();
        await page.waitForTimeout(200);
        return ms;
    }
    const isOpen = (ms: import('@playwright/test').Locator) => ms.evaluate((h: any) => h.isOpen);

    test('a page scroll closes the floating dropdown', async ({ page }) => {
        const ms = await openTallPage(page);
        expect(await isOpen(ms)).toBe(true);
        await page.evaluate(() => window.scrollBy(0, 200));
        await expect.poll(() => isOpen(ms)).toBe(false);
    });

    test('close-on-scroll="false" keeps it open and following the field', async ({ page }) => {
        const ms = await openTallPage(page, 'close-on-scroll="false"');
        await page.evaluate(() => window.scrollBy(0, 200));
        await page.waitForTimeout(300);
        expect(await isOpen(ms)).toBe(true);
    });

    test('scrolling the list inside the dropdown, or an unrelated scroller, does not close it', async ({ page }) => {
        const ms = await openTallPage(page);
        // The element in the dropdown that really scrolls (it must move, or the test proves nothing).
        const listScrolled = await ms.evaluate((h: any) => {
            const all = [h.shadowRoot.querySelector('.ms__dropdown'), ...h.shadowRoot.querySelectorAll('.ms__dropdown *')];
            const list = all.find((el: Element) => el.scrollHeight > el.clientHeight + 10 && getComputedStyle(el).overflowY !== 'visible');
            list.scrollTop = 120;
            return list.scrollTop;
        });
        expect(listScrolled).toBeGreaterThan(0);
        const otherScrolled = await page.locator('#other-scroller').evaluate((el) => { el.scrollTop = 100; return el.scrollTop; });
        expect(otherScrolled).toBeGreaterThan(0);
        await page.waitForTimeout(300);
        expect(await isOpen(ms)).toBe(true);
    });

    test('Tab into a field below the fold: the browser scrolling it into view keeps it open; a real page scroll closes it', async ({ page }) => {
        // Firefox scrolls the field into view BEFORE focus (which opens the dropdown), then makes a
        // 1px correction scroll a frame later — that must not count as the user scrolling away.
        await page.setViewportSize({ width: 1200, height: 700 });
        await page.evaluate(() => {
            document.body.style.paddingBottom = '2000px';
            const box = document.createElement('div');
            box.innerHTML = `<button id="before-fold">before</button><div style="height: 1200px"></div>
                <web-multiselect id="fold-picker"></web-multiselect>`;
            document.body.prepend(box);
            (box.querySelector('web-multiselect') as any).options = Array.from({ length: 40 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));
            window.scrollTo(0, 0);
        });
        const ms = page.locator('#fold-picker');
        await ms.evaluate((h: any) => h.whenReady());
        await page.locator('#before-fold').focus();
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0); // the browser scrolled it into view
        expect(await isOpen(ms)).toBe(true);
        await page.evaluate(() => window.scrollBy(0, 200));
        await expect.poll(() => isOpen(ms)).toBe(false);
    });
});

test('the close event says why: detail.reason', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await page.evaluate(() => {
        document.body.style.paddingBottom = '2000px';
        const box = document.createElement('div');
        box.innerHTML = '<web-multiselect id="reason-picker" multiple="false"></web-multiselect>';
        document.body.prepend(box);
        const ms = box.querySelector('web-multiselect') as any;
        ms.options = Array.from({ length: 10 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));
        const reasons: string[] = ((window as any).__reasons = []);
        ms.addEventListener('close', (e: CustomEvent) => reasons.push(e.detail.reason));
    });
    const ms = page.locator('#reason-picker');
    const reasons = () => page.evaluate(() => (window as any).__reasons);

    await ms.locator('.ms__input').click();
    await page.keyboard.press('Escape');
    await expect.poll(reasons).toEqual(['escape']);

    await ms.locator('.ms__input').click();
    await ms.locator('.ms__option').nth(2).click(); // single-select: a pick closes it
    await expect.poll(reasons).toEqual(['escape', 'select']);

    await ms.locator('.ms__input').click();
    await page.waitForTimeout(150);
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect.poll(reasons).toEqual(['escape', 'select', 'scroll']);

    await page.evaluate(() => { window.scrollTo(0, 0); (document.getElementById('reason-picker') as any).open(); });
    await page.evaluate(() => (document.getElementById('reason-picker') as any).close());
    await expect.poll(reasons).toEqual(['escape', 'select', 'scroll', 'api']);
});
