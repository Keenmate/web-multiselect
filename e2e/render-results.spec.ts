import { test, expect } from './fixtures';

/**
 * Render-callback results (core `renderSlotHtml`): a string is HTML, null draws the built-in content,
 * false leaves the slot empty (renderBadgeCallback: no badge). Fixture: test/search.html (#filter).
 */
test('option content + badges: string / null / false', async ({ page }) => {
    await page.goto('/test/search.html');
    const p = page.locator('#filter');
    await p.evaluate((el: any) => {
        el.options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }, { value: 'c', label: 'Gamma' }];
        el.renderOptionContentCallback = ({ option }: any) =>
            option.value === 'a' ? '<b class="custom">A!</b>' : option.value === 'b' ? null : false;
        el.renderBadgeCallback = ({ option }: any) =>
            option.value === 'a' ? '<span class="chip">A</span>' : option.value === 'b' ? null : false;
        el.setSelected(['a', 'b', 'c']);
    });
    await p.locator('.ms__input').click();
    const content = (v: string) => p.locator(`.ms__option[data-value="${v}"] .ms__option-content`);
    await expect(content('a').locator('b.custom')).toHaveText('A!');
    await expect(content('b').locator('.ms__option-title')).toHaveText('Beta'); // null → built-in
    await expect(content('c').locator('.ms__option-title')).toHaveCount(0);     // false → empty
    await expect(p.locator('.ms__badges .ms__badge--custom .chip')).toHaveText('A');
    await expect(p.locator('.ms__badges .ms__badge:not(.ms__badge--custom)')).toHaveCount(1); // b: default pill
    await expect(p.locator('.ms__badges .ms__badge')).toHaveCount(2);                         // c: no badge
});
