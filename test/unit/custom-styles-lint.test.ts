import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../src/index'; // registers <web-multiselect> (core registerComponent)

/**
 * Dev-mode lint for getCustomStylesCallback / custom-styles: catches the `--ms-badge-text-background`
 * vs `--ms-badge-text-bg` class of typo, where a callback sets a `--ms-*` variable
 * no stylesheet reads and it silently does nothing.
 *
 * The lint now runs in core `createCustomStyles({ lintCssVars })` (the element passes
 * `{ prefix: '--ms-', componentCss }` under `import.meta.env.DEV`; e2e custom-styles.spec
 * covers the warning itself). Here we cover the element wiring. Under vitest the bundled stylesheet is empty (`?inline` isn't
 * bundled), so the only assertable behaviour is the guard: with no ground truth
 * the element must NOT warn.
 */

describe('element custom-CSS lint (guard under vitest)', () => {
    let el: any;
    afterEach(() => {
        el?.remove();
        vi.restoreAllMocks();
    });

    it('does not warn when the stylesheet has no ground truth (empty inlined CSS)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el = document.createElement('web-multiselect');
        document.body.appendChild(el);
        el.getCustomStylesCallback = () => '.x { --ms-obviously-not-real: 1px; }';
        await el.whenSettled();
        expect(el.shadowRoot.querySelector('.ms-custom-styles')?.textContent).toContain('--ms-obviously-not-real');
        expect(warn.mock.calls.flat().map(String).filter((w) => w.includes('--ms-obviously-not-real'))).toHaveLength(0);
    });
});
