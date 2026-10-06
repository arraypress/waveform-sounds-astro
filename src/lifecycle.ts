/**
 * @module lifecycle
 * @description
 * The page lifecycle for `<WaveformSounds>` — when to initialise and when to
 * tear down — kept free of imports so it can be tested against a stand-in.
 * `client.ts` supplies the real `WaveformSounds` class. Also here:
 * {@link ensurePlayer}, which loads the bundled player only when the page
 * has none.
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

/** The window slice {@link ensurePlayer} reads. */
type PlayerHost = { WaveformPlayer?: unknown };

/** The document slice {@link ensurePlayer} waits on. */
type ReadyDoc = Pick<Document, 'readyState' | 'addEventListener'>;

/**
 * Resolve once every static script on the page has run: immediately when the
 * document is complete, else at `DOMContentLoaded` (which waits for deferred
 * and module scripts) — or `load`, for an async script that missed it.
 */
function afterPageScripts(doc: ReadyDoc): Promise<void> {
	if (doc.readyState === 'complete') return Promise.resolve();
	return new Promise((resolve) => {
		doc.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
		doc.addEventListener('load', () => resolve(), { once: true });
	});
}

/**
 * Make sure a `WaveformPlayer` class is on `window`, WITHOUT replacing one the
 * page already has.
 *
 * The sounds runtime constructs its engine from `window.WaveformPlayer`, and
 * the player's `singlePlay` hand-off only works between instances of the SAME
 * class. A page that already runs a player — e.g. a theme's persistent
 * WaveformBar, from its own copy — must keep its class, or the list and the
 * bar stop pausing each other. So the page's scripts get to run first, and the
 * bundled player is loaded (by `load`, a dynamic import) only when there is
 * still no global.
 *
 * @param load - Loads the player (registers `window.WaveformPlayer`).
 * @param win - The window to check.
 * @param doc - The document whose scripts to wait for.
 * @returns `true` when `load` ran, `false` when the page's player was kept.
 */
export async function ensurePlayer(
	load: () => Promise<unknown>,
	win: PlayerHost = window as unknown as PlayerHost,
	doc: ReadyDoc = document
): Promise<boolean> {
	await afterPageScripts(doc);
	if (win.WaveformPlayer) return false;
	await load();
	return true;
}
