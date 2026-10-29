import { test, expect, Page, Locator } from './fixtures';

// Shared loader (core SPEC §12.14): every loading state draws through core
// renderLoader() — instance renderLoadingCallback > window.components.renderLoaderCallback
// > the default .ms-loader drawn from the --ms-loader-* tokens.

const PAGE = '/test/loader.html';

const picker = (page: Page, id: string): Locator => page.locator(`#${id}`);

async function startSearch(page: Page, term = 'ab'): Promise<Locator> {
    const p = picker(page, 'ms-search');
    await p.locator('.ms__input').click();
    await p.locator('.ms__input').fill(term);
    return p;
}

test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForFunction(() => customElements.get('web-multiselect'));
});

test('async search draws the default loader with role=status + labels.searching', async ({ page }) => {
    const p = await startSearch(page);
    const slot = p.locator('.ms__loader-slot');
    await expect(slot).toHaveAttribute('role', 'status');
    await expect(slot).toHaveAttribute('aria-label', 'Searching…');
    const loader = slot.locator('.ms-loader');
    await expect(loader).toHaveCount(1);
    await expect(loader).toHaveAttribute('aria-hidden', 'true');
    const style = await loader.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { anim: cs.animationName, mask: cs.maskImage || (cs as any).webkitMaskImage };
    });
    expect(style.anim).toBe('ms-loader-spin');
    expect(style.mask).toContain('url(');

    await page.evaluate(() => (window as any).__settle());
    await expect(p.locator('.ms__loader')).toHaveCount(0);
    await expect(p.locator('.ms__option')).toHaveCount(1);
});

test('aria-label is the plain text of an HTML labels.searching', async ({ page }) => {
    await page.evaluate(() => {
        (document.getElementById('ms-search') as any).labels = { searching: '<b>Hledám</b>…' };
    });
    const p = await startSearch(page);
    await expect(p.locator('.ms__loader-slot')).toHaveAttribute('aria-label', 'Hledám…');
});

test('the page-wide window.components.renderLoaderCallback replaces the default; cleanup runs on remove', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).__ctx = null;
        (window as any).__cleaned = 0;
        (window as any).components.renderLoaderCallback = (ctx: any) => {
            (window as any).__ctx = { component: ctx.component, context: ctx.context, label: ctx.label, isHost: ctx.element.id };
            const dots = document.createElement('span');
            dots.className = 'page-dots';
            ctx.containerElement.appendChild(dots);
            return () => { (window as any).__cleaned++; };
        };
    });
    const p = await startSearch(page);
    await expect(p.locator('.ms__loader-slot .page-dots')).toHaveCount(1);
    await expect(p.locator('.ms-loader')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__ctx)).toEqual({
        component: 'web-multiselect', context: 'search', label: 'Searching…', isHost: 'ms-search',
    });

    await page.evaluate(() => (window as any).__settle());
    await expect(p.locator('.page-dots')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as any).__cleaned)).toBe(1);
});

test('the instance renderLoadingCallback beats the page hook', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).components.renderLoaderCallback = ({ containerElement }: any) => {
            containerElement.insertAdjacentHTML('beforeend', '<span class="page-dots"></span>');
        };
        (document.getElementById('ms-search') as any).renderLoadingCallback = ({ containerElement }: any) => {
            containerElement.insertAdjacentHTML('beforeend', '<span class="instance-bar"></span>');
        };
    });
    const p = await startSearch(page);
    await expect(p.locator('.ms__loader-slot .instance-bar')).toHaveCount(1);
    await expect(p.locator('.page-dots')).toHaveCount(0);
    await expect(p.locator('.ms-loader')).toHaveCount(0);
});

test('async add-new pending draws the loader (context add-new, labels.addNewPending)', async ({ page }) => {
    await page.evaluate(() => {
        (window as any).__contexts = [];
        (window as any).components.renderLoaderCallback = (ctx: any) => {
            (window as any).__contexts.push(ctx.context);
        };
    });
    const p = picker(page, 'ms-add');
    await p.locator('.ms__input').click();
    await p.locator('.ms__input').fill('zeta');
    await p.locator('.ms__add-new').click();
    const slot = p.locator('.ms__add-new--loading .ms__loader-slot');
    await expect(slot).toHaveAttribute('role', 'status');
    await expect(slot).toHaveAttribute('aria-label', 'Adding "zeta"…');
    expect(await page.evaluate(() => (window as any).__contexts)).toContain('add-new');

    await page.evaluate(() => (window as any).__settle());
    await expect(p.locator('.ms__add-new--loading')).toHaveCount(0);
});
