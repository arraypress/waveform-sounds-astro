/**
 * vitest.config.ts
 * ----------------
 *
 * Vitest configuration for testing the `<WaveformSounds>` Astro
 * component. We render the component through Astro's official
 * `experimental_AstroContainer` API (the supported way to test `.astro`
 * files without a browser) and assert on the resulting HTML string.
 *
 * The `getViteConfig` helper from `astro/config` wires Vitest up with
 * Astro's Vite plugin so `.astro` imports resolve correctly inside
 * tests.
 *
 * @see https://docs.astro.build/en/guides/testing/#vitest
 */
import { getViteConfig } from 'astro/config';

export default getViteConfig({
	test: {
		include: ['test/**/*.test.ts'],
		environment: 'node',
		globals: false,
	},
});
