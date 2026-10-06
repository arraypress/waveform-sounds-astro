/**
 * @module client
 * @description
 * The browser half of `<WaveformSounds>`, imported by the component's
 * processed `<script>`. Astro bundles it into one external module per site,
 * identical on every page — which is what a strict hash-based CSP needs.
 * Per-instance configuration travels in `data-*` attributes only, never in
 * the script.
 *
 * - `@arraypress/waveform-player/no-autoinit` registers
 *   `window.WaveformPlayer`, which the sounds runtime constructs its one audio
 *   engine from. The no-autoinit entry is deliberate: this component owns
 *   `[data-waveform-sounds]` markup, not `[data-waveform-player]`, so it
 *   doesn't scan the page for players it didn't render.
 * - `@arraypress/waveform-sounds/no-autoinit` is the runtime without its own
 *   DOMContentLoaded scan; {@link bindLifecycle} decides when to initialise,
 *   including after ClientRouter navigations.
 */
import '@arraypress/waveform-player/no-autoinit';
import WaveformSounds from '@arraypress/waveform-sounds/no-autoinit';
import { bindLifecycle } from './lifecycle';

bindLifecycle(WaveformSounds);
