/**
 * @module client
 * @description
 * The browser half of `<WaveformSounds>`, imported by the component's
 * processed `<script>`. Astro bundles it into one external module per site,
 * identical on every page — which is what a strict hash-based CSP needs.
 * Per-instance configuration travels in `data-*` attributes only, never in
 * the script. (The player, when needed, is a second external chunk loaded by
 * dynamic import — still no inline script.)
 *
 * - The player: {@link ensurePlayer} keeps a `window.WaveformPlayer` the page
 *   already has (a theme's persistent WaveformBar, say — replacing it would
 *   split `singlePlay` across two classes) and only otherwise loads
 *   `@arraypress/waveform-player/no-autoinit`, which registers the global
 *   without scanning for `[data-waveform-player]` markup this component
 *   doesn't own.
 * - `@arraypress/waveform-sounds/no-autoinit` is the runtime without its own
 *   DOMContentLoaded scan; {@link bindLifecycle} decides when to initialise,
 *   including after ClientRouter navigations.
 */
import WaveformSounds from '@arraypress/waveform-sounds/no-autoinit';
import { bindLifecycle, ensurePlayer } from './lifecycle';

ensurePlayer(() => import('@arraypress/waveform-player/no-autoinit'))
	.catch((err) => console.error('[WaveformSoundsAstro] could not load @arraypress/waveform-player:', err))
	.then(() => bindLifecycle(WaveformSounds));
