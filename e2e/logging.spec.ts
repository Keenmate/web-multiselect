import { test, expect, Page, Locator } from './fixtures';

const PAGE = '/test/logging.html';

function picker(page: Page, id: string): Locator {
    return page.locator(`#${id}`);
}

async function clickAnOption(p: Locator): Promise<void> {
    await p.locator('.ms__input').click();
    await p.locator('.ms__option[data-value="apple"]').click();
}

test('default level is silent — no logger output without explicit enable', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', m => consoleMessages.push(m.text()));

    await page.goto(PAGE);
    const p = picker(page, 'log-picker');
    await clickAnOption(p);

    // No MULTISELECT-prefixed logs.
    const multiselectLogs = consoleMessages.filter(m => m.includes('MULTISELECT'));
    expect(multiselectLogs).toHaveLength(0);
});

test('setLogLevel("debug") at runtime starts producing logs without a reload', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', m => consoleMessages.push(m.text()));

    await page.goto(PAGE);
    await page.evaluate(() => (window as any).__log.setLogLevel('debug'));

    const p = picker(page, 'log-picker');
    await clickAnOption(p);

    // Each selection emits interaction logs prefixed with the category.
    const multiselectLogs = consoleMessages.filter(m => m.includes('MULTISELECT'));
    expect(multiselectLogs.length).toBeGreaterThan(0);
});

test('setCategoryLevel accepts bare names ("INTERACTION")', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', m => consoleMessages.push(m.text()));

    await page.goto(PAGE);
    await page.evaluate(() => {
        (window as any).__log.setLogLevel('silent');
        (window as any).__log.setCategoryLevel('INTERACTION', 'debug');
    });

    const p = picker(page, 'log-picker');
    await clickAnOption(p);

    const interactionLogs = consoleMessages.filter(m => m.includes('MULTISELECT:INTERACTION'));
    expect(interactionLogs.length).toBeGreaterThan(0);
});

test('show-debug-info is removed — no input, no debug panel (use logging instead)', async ({ page }) => {
    await page.goto(PAGE);
    const p = picker(page, 'log-picker');
    const state = await p.evaluate(async (el: any) => {
        el.setAttribute('show-debug-info', '');
        el.showDebugInfo = true;
        await el.whenSettled();
        const ctor = el.constructor as any;
        return {
            observed: ctor.observedAttributes.includes('show-debug-info'),
            panel: el.shadowRoot.querySelectorAll('.ms__debug-info').length,
        };
    });
    expect(state).toEqual({ observed: false, panel: 0 });
});
