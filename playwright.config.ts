import { definePlaywrightConfig, devices } from '@keenmate/web-components-devkit/playwright';

/**
 * Playwright config for end-to-end tests.
 *
 * Specs live in e2e/ and target dedicated fixture pages under test/*.html. The
 * fixture pages are intentionally separate from the examples-*.html development
 * pages so they stay minimal and focused on the feature under test. baseURL and
 * the `npm run dev` web server come from package.json#kmwc.ports.dev (the devkit
 * preset), so the port can't drift from vite.config / the Makefile.
 *
 * Commands:
 *   npm run test:e2e:install   # one-time: download chromium, firefox, webkit binaries
 *   npm run test:e2e           # headless run, chromium + mobile (the publish gate)
 *   npm run test:e2e:all       # + firefox, webkit, mobile-webkit; 4 workers, because the
 *                              #   dev server refuses some Firefox connections under more load
 *   npm run test:e2e:ui        # Playwright Test UI (debugging)
 *   npm run test:e2e:headed    # watch the browser do its thing
 */
const viewport = { width: 1440, height: 1024 };

// The desktop projects own every spec except the touch-only ones — a desktop context
// reports a fine pointer + hover, so the phone (fullscreen) branch never engages there.
const touchOnlySpecs = ['**/presentation.spec.ts', '**/mobile-features.spec.ts'];

export default definePlaywrightConfig({
  projects: [
    { name: 'chromium', testIgnore: touchOnlySpecs, use: { ...devices['Desktop Chrome'], viewport } },
    // Touch-primary phone context: Pixel 7 emulation gives a coarse pointer and no hover
    // (isMobile + hasTouch), so `presentation="auto"` resolves to fullscreen and rotation
    // (viewport swap) is testable.
    { name: 'mobile', testMatch: touchOnlySpecs, use: { ...devices['Pixel 7'] } },
    // Same desktop suite on Gecko and WebKit (Safari's engine).
    { name: 'firefox', testIgnore: touchOnlySpecs, use: { ...devices['Desktop Firefox'], viewport } },
    { name: 'webkit', testIgnore: touchOnlySpecs, use: { ...devices['Desktop Safari'], viewport } },
    // iOS Safari: WebKit supports isMobile/hasTouch emulation (Firefox does not, so there
    // is no mobile-firefox project).
    { name: 'mobile-webkit', testMatch: touchOnlySpecs, use: { ...devices['iPhone 14'] } },
  ],
});
