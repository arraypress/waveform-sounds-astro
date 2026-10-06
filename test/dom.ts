/**
 * test/dom.ts
 * -----------
 *
 * A jsdom document for running the REAL core against this component's
 * output, while the suite itself stays in vitest's `node` environment —
 * under the `jsdom` environment Vite resolves `.astro` imports as client
 * modules and the container API can't render them.
 *
 * `installDom()` puts the jsdom window's globals in place (the core reads
 * `document`, `window`, `CustomEvent`, `AbortController`, … at call time;
 * jsdom rejects a Node `AbortSignal` / `Event` handed to its own DOM, so
 * those must be jsdom's too) and returns the core, imported afterwards.
 */
import { JSDOM } from 'jsdom';
import { vi } from 'vitest';

/** Constructors and objects, taken from the jsdom window as they are. */
const GLOBALS = [
	'document',
	'navigator',
	'HTMLElement',
	'Element',
	'Node',
	'Event',
	'CustomEvent',
	'EventTarget',
	'AbortController',
	'AbortSignal',
	'MutationObserver',
] as const;

/** Window functions, bound to the jsdom window (they throw unbound). */
const FUNCTIONS = ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'] as const;

export async function installDom() {
	const dom = new JSDOM('<!doctype html><html><body></body></html>', {
		url: 'http://localhost/',
		pretendToBeVisual: true,
	});
	const win = dom.window as unknown as Record<string, unknown>;
	vi.stubGlobal('window', win);
	for (const key of GLOBALS) vi.stubGlobal(key, win[key]);
	for (const key of FUNCTIONS) vi.stubGlobal(key, (win[key] as (...a: unknown[]) => unknown).bind(win));
	const core = await import('@arraypress/waveform-sounds/no-autoinit');
	return { dom, ...core };
}
