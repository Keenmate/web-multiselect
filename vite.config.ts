import { defineComponentConfig } from '@keenmate/web-components-devkit/vite';

// Ports, lib output (dist/multiselect.js + .umd.js + style.css + rolled-up index.d.ts,
// UMD global `MultiSelect`), the build-time constants (__VERSION__ …) and the examples
// site all come from package.json#kmwc. Floating UI and core are bundled.
export default defineComponentConfig({
  overrides: {
    // Dev dep-scan only the real pages and the e2e fixtures — not test-results/ etc.
    optimizeDeps: { entries: ['index.html', 'examples-*.html', 'test/*.html'] },
  },
});
