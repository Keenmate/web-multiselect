import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../src/index'; // registers <web-multiselect> (core registerComponent)

/**
 * Dev-mode lint for customStylesCallback: catches the `--ms-badge-text-background`
 * vs `--ms-badge-text-bg` class of typo, where a callback sets a `--ms-*` variable
 * no stylesheet reads and it silently does nothing.
 *
 * The pure lint logic now lives in core (`lintCssVars` / `extractConsumedCssVars`
 * — see web-components-core/src/dom/css-var-lint.test.ts). Here we cover the
 * element wiring. Under vitest the bundled stylesheet is empty (`?inline` isn't
 * bundled), so the only assertable behaviour is the guard: with no ground truth
 * the element must NOT warn.
 */

describe('element customStylesCallback lint (guard under vitest)', () => {
    let el: any;
    afterEach(() => {
        el?.remove();
        vi.restoreAllMocks();
    });

    it('does not warn when the stylesheet has no ground truth (empty inlined CSS)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el = document.createElement('web-multiselect');
        document.body.appendChild(el);
        el.customStylesCallback = () => '.x { --ms-obviously-not-real: 1px; }';
        await el.whenSettled();
        expect(warn.mock.calls.map((c) => String(c[0])).filter((w) => w.includes('customStylesCallback sets'))).toHaveLength(0);
    });
});
