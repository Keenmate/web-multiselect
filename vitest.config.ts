import { defineConfig } from 'vitest/config';

/**
 * Vitest config for unit tests.
 *
 * Unit specs live in test/unit/*.test.ts and exercise the component logic in a
 * lightweight DOM (happy-dom) without a real browser — fast, isolated checks of
 * things like placeholder resolution and the setProperties() batch update.
 *
 * Broader interaction/visual behaviour stays in the Playwright e2e suite (e2e/).
 *
 * Commands:
 *   npm run test:unit        # run once
 *   npm run test:unit:watch  # watch mode
 */
export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['test/unit/**/*.test.ts'],
        globals: true
    },
    // Mirror the build-time constants vite.config.ts defines so importing src/index.ts works.
    define: {
        '__VERSION__': JSON.stringify('test'),
        '__PACKAGE_NAME__': JSON.stringify('@keenmate/web-multiselect'),
        '__AUTHOR__': JSON.stringify('test'),
        '__LICENSE__': JSON.stringify('MIT'),
        '__REPOSITORY__': JSON.stringify('test'),
        '__HOMEPAGE__': JSON.stringify('test')
    }
});
