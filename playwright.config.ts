import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for end-to-end tests.
 *
 * Specs live in e2e/ and target dedicated fixture pages under test/*.html
 * (served by the vite dev server on port 12200). The fixture pages are
 * intentionally separate from the examples-*.html development pages so they
 * stay minimal and focused on the feature under test.
 *
 * Commands:
 *   npm run test:e2e:install   # one-time: download chromium browser binary
 *   npm run test:e2e           # headless run
 *   npm run test:e2e:ui        # Playwright Test UI (debugging)
 *   npm run test:e2e:headed    # watch the browser do its thing
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },

    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,

    reporter: process.env.CI ? 'github' : 'list',

    use: {
        baseURL: 'http://localhost:12200',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },

    projects: [
        {
            name: 'chromium',
            // The desktop project owns every spec except the touch-only ones — a desktop
            // context reports a fine pointer + hover, so the phone (fullscreen) branch never
            // engages there. `presentation` and `mobile-features` are mobile-project only.
            testIgnore: ['**/presentation.spec.ts', '**/mobile-features.spec.ts'],
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1440, height: 1024 }
            }
        },
        {
            // Touch-primary phone context: Pixel 7 emulation gives a coarse pointer
            // and no hover (isMobile + hasTouch), so `mobile-presentation="auto"`
            // resolves to fullscreen and rotation (viewport swap) is testable.
            // Chromium-only — `isMobile` is unsupported on Firefox/WebKit in Playwright,
            // and this suite runs on chromium anyway.
            name: 'mobile',
            testMatch: ['**/presentation.spec.ts', '**/mobile-features.spec.ts'],
            use: { ...devices['Pixel 7'] }
        }
    ],

    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:12200',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'ignore',
        stderr: 'pipe'
    }
});
