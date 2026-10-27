import { test, expect } from './fixtures';
// @ts-expect-error — plain ESM helper shipped by the contract package (no .d.ts)
import { contractParity } from '@keenmate/base-css-variables/testing/parity';

/**
 * The component looks the same with and without @keenmate/base-css-variables.
 *
 * Renders test/contract-parity.html standalone and with the contract injected, in light and
 * dark, and compares every color-valued --ms-* token. A second pass sets a different accent
 * (--ms-accent-color standalone vs --base-primary-color with the contract): the derived
 * fallbacks are the contract's formulas on --ms-accent-color, so hover / tint / text follow.
 * The static side of the same rule is `npm run check:contract`.
 */

// Deliberate differences (same reasons as contract-check.json).
const allow = {
    '--ms-option-title-color-selected': 'contract default currentColor = unchanged; the title keeps --ms-option-title-color',
    '--ms-option-title-color-focused': 'contract default currentColor = unchanged; the title keeps --ms-option-title-color',
};

test('standalone colors match the contract (light + dark, default + custom accent)', async ({ page }) => {
    const diffs = await contractParity(page, {
        url: '/test/contract-parity.html',
        selector: '#parity',
        prefix: 'ms',
        accentToken: '--ms-accent-color',
        allow,
    });
    expect(diffs).toEqual([]);
});
