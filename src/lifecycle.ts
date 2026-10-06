/**
 * @module lifecycle
 * @description
 * The page lifecycle for `<WaveformSounds>` — when to initialise and when to
 * tear down — kept free of imports so it can be tested against a stand-in.
 * `client.ts` supplies the real `WaveformSounds` class.
 *
 * Three moments:
 *
 *  1. **Now.** The client script is a deferred module, so the document is
 *     parsed by the time it runs: initialise every `[data-waveform-sounds]`.
 *     This is the whole story on a site without Astro's `<ClientRouter />`.
 *  2. **`astro:page-load`** — fired by the ClientRouter after every
 *     navigation (and once on the first load, where it is a no-op because
 *     step 1 already ran). The swapped-in page's lists are fresh,
 *     uninitialised markup, and the core's `init()` skips any element that
 *     is already initialised, so re-running it is safe.
 *  3. **`astro:after-swap`** — the outgoing page's elements are now out of
 *     the document. `prune()` destroys the instances whose element left
 *     (stopping their audio engine and dropping their listeners). It runs
 *     after the swap, not before, because the core's test is
 *     `!el.isConnected`: before the swap every element is still connected.
 *     A list inside a `transition:persist` host is moved into the new page,
 *     stays connected, and is kept — with its playing sound.
 *
 * Bound once per window, however many copies of this module end up on the
 * page (a bundled module normally runs once; the guard covers two versions
 * of this package bundled side by side).
 */

/** The slice of the core's static API this module needs. */
export interface SoundsRuntime {
	init(root?: ParentNode): unknown[];
	prune(): void;
}

const BOUND = Symbol.for('@arraypress/waveform-sounds-astro:bound');

type Flagged = { [BOUND]?: boolean };

/** Log prefix, matching the family's `[<Package>Astro]` convention. */
const LOG = '[WaveformSoundsAstro]';

/**
 * Initialise every list now, and wire the ClientRouter events.
 *
 * @param runtime - The `WaveformSounds` class (or a stand-in in tests).
 * @param doc - The document to bind to.
 * @returns `false` when this document was already bound (nothing done).
 */
export function bindLifecycle(runtime: SoundsRuntime, doc: Document = document): boolean {
	const host = (doc.defaultView ?? globalThis) as unknown as Flagged;
	if (host[BOUND]) return false;
	host[BOUND] = true;

	const init = (): void => {
		try {
			runtime.init(doc);
		} catch (err) {
			console.error(`${LOG} init failed:`, err);
		}
	};

	doc.addEventListener('astro:page-load', init);
	doc.addEventListener('astro:after-swap', () => {
		try {
			runtime.prune();
		} catch (err) {
			console.error(`${LOG} prune failed:`, err);
		}
	});

	init();
	return true;
}
