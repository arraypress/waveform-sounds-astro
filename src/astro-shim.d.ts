/**
 * @module astro-shim
 * @description
 * Ambient declaration for `*.astro` modules so plain `tsc --noEmit`
 * can typecheck `index.ts` and the test suite without choking on
 * `.astro` extensions.
 *
 * At runtime, Astro's Vite plugin resolves these imports to real
 * component factories. For type-check-only contexts (like our
 * `typecheck` npm script) we model them as opaque components that
 * accept any props.
 *
 * In a consumer's Astro project, this shim is harmless — Astro's own
 * `astro/client` types win because they're loaded via the project's
 * `tsconfig` extends chain.
 */
declare module '*.astro' {
	const component: (_props: Record<string, unknown>) => unknown;
	export default component;
}
