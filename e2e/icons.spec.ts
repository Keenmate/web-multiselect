import { test, expect } from './fixtures';

/**
 * Option / action-button icons are data read by core `renderIcon` (SPEC §12.33): markup raw, an ASCII
 * name → a `.km-icon` masked from `--base-icon-<name>`, anything else escaped text. Fixture: test/search.html.
 */
test('option icons: markup raw, a name masked, other text escaped', async ({ page }) => {
    await page.goto('/test/search.html');
    const p = page.locator('#filter');
    await p.evaluate((el: any) => {
        el.options = [
            { value: 'svg', label: 'Svg', icon: '<svg class="probe" viewBox="0 0 1 1"></svg>' },
            { value: 'name', label: 'Name', icon: 'star' },
            { value: 'emoji', label: 'Emoji', icon: '🚀' },
            { value: 'text', label: 'Text', icon: '1 < 2 <b>' },
        ];
    });
    await p.locator('.ms__input').click();
    const icon = (v: string) => p.locator(`.ms__option[data-value="${v}"] .ms__option-icon`);
    await expect(icon('svg').locator('svg.probe')).toHaveCount(1);
    await expect(icon('name').locator('.km-icon.ms__icon--star')).toHaveCount(1);
    await expect(icon('emoji')).toHaveText('🚀');
    await expect(icon('text')).toHaveText('1 < 2 <b>');
    await expect(icon('text').locator('b')).toHaveCount(0);
});
