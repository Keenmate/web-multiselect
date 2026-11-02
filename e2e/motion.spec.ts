import { test, expect, Page } from './fixtures';

// Motion comes from the contract's speeds. The component has no reduced-motion block of its own:
// the motion level (core: `motion`, `data-motion`, window.components.motion) and the OS
// reduced-motion setting set --base-duration-* / --base-scroll-behavior, the --ms-* tokens read them.
// Neither page loads base-css-variables, so everything here comes from core alone (unless a test adds it).
const STYLES_PAGE = '/test/custom-styles.html';
const PAGE = '/test/motion.html';
const BASE_CSS = 'node_modules/@keenmate/base-css-variables/base-variables.css';

// The input wrapper transitions its border; its computed duration is --ms-transition-normal.
function wrapperDuration(page: Page, id = 'cs-attr'): Promise<string> {
    return page.locator(`#${id} .ms__input-wrapper`).evaluate(el => getComputedStyle(el).transitionDuration.split(',')[0].trim());
}

test('transitions run at --base-duration-normal (0.15s) by default', async ({ page }) => {
    await page.goto(STYLES_PAGE);
    expect(await wrapperDuration(page)).toBe('0.15s');
});

test('prefers-reduced-motion: reduce turns transitions off without base-css-variables (core)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(STYLES_PAGE);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--base-loader-duration').trim())).toBe('');
    expect(await wrapperDuration(page)).toBe('0s');
});

test('prefers-reduced-motion: reduce turns transitions off with base-css-variables', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(STYLES_PAGE);
    await page.addStyleTag({ path: BASE_CSS });
    expect(await wrapperDuration(page)).toBe('0s');
});

test('--base-duration-normal: 0s on the page turns transitions off', async ({ page }) => {
    await page.goto(STYLES_PAGE);
    await page.addStyleTag({ content: ':root { --base-duration-normal: 0s; }' });
    expect(await wrapperDuration(page)).toBe('0s');
});

test('--ms-transition-normal: 0s on the element turns transitions off', async ({ page }) => {
    await page.goto(STYLES_PAGE);
    await page.addStyleTag({ content: '#cs-attr { --ms-transition-normal: 0s; }' });
    expect(await wrapperDuration(page)).toBe('0s');
});

// ── Motion level ─────────────────────────────────────────────────────────────────────────────

test('motion attribute: none / snappy / smooth set the duration', async ({ page }) => {
    await page.goto(PAGE);
    const el = page.locator('#mo-list');
    for (const [level, duration] of [['none', '0s'], ['snappy', '0.08s'], ['smooth', '0.25s']]) {
        await el.evaluate((node, l) => node.setAttribute('motion', l), level);
        await expect.poll(() => wrapperDuration(page, 'mo-list')).toBe(duration);
    }
    await el.evaluate(node => node.removeAttribute('motion'));
    await expect.poll(() => wrapperDuration(page, 'mo-list')).toBe('0.15s');
});

test('data-motion on a section applies to the component inside it', async ({ page }) => {
    await page.goto(PAGE);
    expect(await wrapperDuration(page, 'mo-nested')).toBe('0.25s');
    expect(await wrapperDuration(page, 'mo-list')).toBe('0.15s');
});

test('window.components.motion sets every component left on auto', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('#mo-list .ms__input-wrapper').waitFor();
    await page.evaluate(() => { (window as any).components.motion = 'none'; });
    await expect.poll(() => wrapperDuration(page, 'mo-list')).toBe('0s');
});

test('reduced motion beats motion="smooth"', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
    await page.locator('#mo-list').evaluate(node => node.setAttribute('motion', 'smooth'));
    await expect.poll(() => wrapperDuration(page, 'mo-list')).toBe('0s');
    expect(await wrapperDuration(page, 'mo-nested')).toBe('0s');
});

// ── List scrolling ───────────────────────────────────────────────────────────────────────────
// Keyboard scrolling is always instant; --ms-scroll-behavior (→ --base-scroll-behavior) drives only
// programmatic jumps (scrollToIndex / scrollToValue / scrollToGroup). Only the list scrolls (core
// scrollIntoContainer → container.scrollTo); scrollIntoView (which also moves the page) isn't used.
// Spy on both and record the behaviour and whether the page itself was scrolled.
interface ScrollCall { kind: 'scrollTo' | 'scrollIntoView'; behavior: string; isPage: boolean; }

async function openList(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const calls: ScrollCall[] = ((window as any).__scrollCalls = []);
        const isPage = (el: Element) => el === document.documentElement || el === document.body;
        const origTo = Element.prototype.scrollTo;
        Element.prototype.scrollTo = function (this: Element, ...args: any[]) {
            const arg = args[0];
            if (arg && typeof arg === 'object') calls.push({ kind: 'scrollTo', behavior: String(arg.behavior), isPage: isPage(this) });
            return (origTo as any).apply(this, args);
        };
        const origView = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
            calls.push({ kind: 'scrollIntoView', behavior: String(arg && typeof arg === 'object' ? arg.behavior : 'auto'), isPage: false });
            return origView.call(this, arg as any);
        };
    });
    await page.goto(PAGE);
    await page.locator('#mo-list .ms__input').click();
    await expect(page.locator('#mo-list .ms__dropdown')).toBeVisible();
    await scrollCalls(page); // drop anything the open itself did
}

function scrollCalls(page: Page): Promise<ScrollCall[]> {
    return page.evaluate(() => (window as any).__scrollCalls.splice(0));
}

async function keyboardScrollCalls(page: Page): Promise<ScrollCall[]> {
    await openList(page);
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowDown');
    return scrollCalls(page);
}

async function programmaticScrollCalls(page: Page): Promise<ScrollCall[]> {
    await openList(page);
    expect(await page.locator('#mo-list').evaluate(el => (el as any).scrollToIndex(40))).toBe(true);
    return scrollCalls(page);
}

const listScroll = (page: Page) => page.locator('#mo-list .ms__dropdown-inner').evaluate(el => el.scrollTop);

test('keyboard scrolling moves only the list, instantly (smooth --base-scroll-behavior does not apply)', async ({ page }) => {
    const calls = await keyboardScrollCalls(page);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(c => c.kind === 'scrollTo' && !c.isPage)).toBe(true);
    expect(new Set(calls.map(c => c.behavior))).toEqual(new Set(['auto']));
    expect(await listScroll(page)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('programmatic scrollToIndex scrolls only the list, following --ms-scroll-behavior (smooth)', async ({ page }) => {
    const calls = await programmaticScrollCalls(page);
    expect(calls).toEqual([{ kind: 'scrollTo', behavior: 'smooth', isPage: false }]);
    await expect.poll(() => listScroll(page)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('reduced motion makes programmatic scrolling instant (core, no base-css-variables)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const calls = await programmaticScrollCalls(page);
    expect(calls.map(c => c.behavior)).toEqual(['auto']);
});

test('motion="none" makes programmatic scrolling instant', async ({ page }) => {
    await openList(page);
    await page.locator('#mo-list').evaluate(node => node.setAttribute('motion', 'none'));
    await expect.poll(() => wrapperDuration(page, 'mo-list')).toBe('0s');
    expect(await page.locator('#mo-list').evaluate(el => (el as any).scrollToIndex(40))).toBe(true);
    expect((await scrollCalls(page)).map(c => c.behavior)).toEqual(['auto']);
});

// ── Loader ───────────────────────────────────────────────────────────────────────────────────
// The loader never stops. 0.8s by default; base-css-variables slows it to 1.5s under reduced
// motion (--base-loader-duration) — without it, reduced motion leaves it at 0.8s.
function loaderDuration(page: Page): Promise<string> {
    return page.locator('#cs-attr').evaluate(el => getComputedStyle(el).getPropertyValue('--ms-loader-duration').trim());
}

test('loader: 0.8s by default, unchanged under reduced motion without base-css-variables', async ({ page }) => {
    await page.goto(STYLES_PAGE);
    expect(await loaderDuration(page)).toBe('0.8s');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await loaderDuration(page)).toBe('0.8s');
});

test('loader: 1.5s under reduced motion with base-css-variables', async ({ page }) => {
    await page.goto(STYLES_PAGE);
    await page.addStyleTag({ path: BASE_CSS });
    expect(await loaderDuration(page)).toBe('0.8s');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await loaderDuration(page)).toBe('1.5s');
});

test('loader: a page-wide --base-loader-duration wins', async ({ page }) => {
    await page.goto(STYLES_PAGE);
    await page.addStyleTag({ content: ':root { --base-loader-duration: 3s; }' });
    expect(await loaderDuration(page)).toBe('3s');
});
