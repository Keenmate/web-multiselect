import { test, expect, Page } from './fixtures';

// Motion comes from the contract's speeds and is turned off with CSS only (0s), never an attribute.
const PAGE = '/test/custom-styles.html';

// The input wrapper transitions its border; its computed duration is --ms-transition-normal.
function wrapperDuration(page: Page): Promise<string> {
    return page.locator('#cs-attr .ms__input-wrapper').evaluate(el => getComputedStyle(el).transitionDuration.split(',')[0].trim());
}

test('transitions run at --base-duration-normal (0.15s) by default', async ({ page }) => {
    await page.goto(PAGE);
    expect(await wrapperDuration(page)).toBe('0.15s');
});

test('prefers-reduced-motion: reduce turns transitions off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
    expect(await wrapperDuration(page)).toBe('0s');
});

test('--base-duration-normal: 0s on the page turns transitions off', async ({ page }) => {
    await page.goto(PAGE);
    await page.addStyleTag({ content: ':root { --base-duration-normal: 0s; }' });
    expect(await wrapperDuration(page)).toBe('0s');
});

test('--ms-transition-normal: 0s on the element turns transitions off', async ({ page }) => {
    await page.goto(PAGE);
    await page.addStyleTag({ content: '#cs-attr { --ms-transition-normal: 0s; }' });
    expect(await wrapperDuration(page)).toBe('0s');
});

// Keyboard scrolling is always instant; --ms-scroll-behavior (→ --base-scroll-behavior) drives only
// programmatic jumps (scrollToIndex / scrollToValue / scrollToGroup). Spy on scrollIntoView behaviors.
async function spyScrollBehaviors(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const calls: string[] = ((window as any).__scrollBehaviors = []);
        const orig = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
            if (arg && typeof arg === 'object') calls.push(String(arg.behavior));
            return orig.call(this, arg as any);
        };
    });
    await page.goto(PAGE);
    await page.locator('#cs-attr .ms__input').click();
    await expect(page.locator('#cs-attr .ms__dropdown')).toBeVisible();
}

function scrollBehaviors(page: Page): Promise<string[]> {
    return page.evaluate(() => (window as any).__scrollBehaviors.splice(0));
}

async function keyboardScrollBehaviors(page: Page): Promise<string[]> {
    await spyScrollBehaviors(page);
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    return scrollBehaviors(page);
}

async function programmaticScrollBehaviors(page: Page): Promise<string[]> {
    await spyScrollBehaviors(page);
    await scrollBehaviors(page); // drop anything the open itself did
    expect(await page.locator('#cs-attr').evaluate(el => (el as any).scrollToIndex(1))).toBe(true);
    return scrollBehaviors(page);
}

test('keyboard scrolling in the dropdown is instant (smooth --base-scroll-behavior does not apply)', async ({ page }) => {
    const calls = await keyboardScrollBehaviors(page);
    expect(calls.length).toBeGreaterThan(0);
    expect(new Set(calls)).toEqual(new Set(['auto']));
});

test('programmatic scrollToIndex follows --ms-scroll-behavior (smooth)', async ({ page }) => {
    const calls = await programmaticScrollBehaviors(page);
    expect(calls).toEqual(['smooth']);
});

test('reduced motion makes programmatic scrolling instant', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const calls = await programmaticScrollBehaviors(page);
    expect(calls).toEqual(['auto']);
});

// The loader slows under reduced motion (1.5s) and never stops — also without base-css-variables
// on the page (the reduced-motion block's own fallback); --base-loader-duration still wins.
function loaderDuration(page: Page): Promise<string> {
    return page.locator('#cs-attr').evaluate(el => getComputedStyle(el).getPropertyValue('--ms-loader-duration').trim());
}

test('loader: 0.8s by default, 1.5s under reduced motion without base-css-variables', async ({ page }) => {
    await page.goto(PAGE);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--base-loader-duration').trim())).toBe('');
    expect(await loaderDuration(page)).toBe('0.8s');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await loaderDuration(page)).toBe('1.5s');
});

test('loader under reduced motion: a page-wide --base-loader-duration wins', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);
    await page.addStyleTag({ content: ':root { --base-loader-duration: 3s; }' });
    expect(await loaderDuration(page)).toBe('3s');
});
