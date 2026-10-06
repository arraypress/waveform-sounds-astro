/**
 * @module types
 * @description
 * Public TypeScript types for `@arraypress/waveform-sounds-astro`.
 *
 * The option surface is owned by `@arraypress/waveform-sounds`, whose
 * hand-written `index.d.ts` is the single source of truth. This wrapper
 * re-exports the shared shapes verbatim and DERIVES its prop interface from
 * the core's {@link WaveformSoundsOptions} rather than re-declaring any
 * option, so a renamed or retyped core option flows through here without an
 * edit.
 *
 * Types flowing is not the same as values flowing: the runtime forwarding
 * (`src/WaveformSounds.astro`) is a hand-written allowlist, and
 * `test/forwarding-drift.test.ts` is what catches a core option that
 * type-checks here but is never emitted.
 *
 * @see {@link https://github.com/arraypress/waveform-sounds} — the core
 */

import type { WaveformSoundsOptions } from '@arraypress/waveform-sounds';

export type {
	WaveformSoundsOptions,
	WaveformSoundsStrings,
	WaveformSoundsEventMap,
	SoundInput,
	Sound,
	SoundsManifest,
	SoundsFilter,
	SoundsSort,
	SoundsLayout,
	SoundsFilterControl,
	SoundsColumn,
} from '@arraypress/waveform-sounds';

/**
 * Every core option key that is a lifecycle callback (`onReady`, `onPlay`,
 * …), matched by shape so a callback the core adds later is excluded too.
 */
type CallbackKeys<T> = {
	[K in keyof T]-?: K extends `on${Capitalize<string>}` ? K : never;
}[keyof T];

/**
 * Core options this component cannot forward, removed from the props so they
 * don't type-check and then vanish at runtime:
 *
 *  - the `on*` callbacks — a server-rendered component emits static HTML,
 *    and a function can't cross into a `data-*` attribute. Listen for the
 *    bubbling `waveformsounds:*` DOM events instead.
 *  - `playerClass` — a constructor reference; the core finds the player
 *    through `window.WaveformPlayer` (the page's own copy if it has one,
 *    else the one the client script loads).
 */
export type NotForwardedOption = CallbackKeys<WaveformSoundsOptions> | 'playerClass';

/**
 * Props accepted by the `<WaveformSounds>` Astro component: the core's own
 * options (minus {@link NotForwardedOption}), including `sounds` and
 * `manifest`, plus the Astro extras `id` and `class`.
 *
 * Every option is optional. An omitted option emits no `data-*` attribute,
 * so the core applies its own default.
 */
export interface WaveformSoundsProps
	extends Omit<WaveformSoundsOptions, NotForwardedOption> {
	/**
	 * DOM id for the container — handy for
	 * `WaveformSounds.getInstance('#id')` from a page script.
	 */
	id?: string;

	/**
	 * Extra classes, appended to the `waveform-sounds` and
	 * `waveform-sounds--<player>` classes the component always applies.
	 */
	class?: string;
}
