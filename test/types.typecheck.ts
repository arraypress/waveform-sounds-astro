/**
 * test/types.typecheck.ts
 * -----------------------
 *
 * Type-level assertions, checked by `npm run typecheck` (not vitest).
 *
 * The props derive from the core's `WaveformSoundsOptions`. These pin that
 * the derivation keeps the core's own types, removes exactly what can't be
 * forwarded (callbacks — matched by shape — and `playerClass`), and stays strict (no index
 * signature, so a typo'd prop is an error).
 */
import type { WaveformSoundsOptions } from '@arraypress/waveform-sounds';
import type { WaveformSoundsProps, NotForwardedOption } from '../src/types';

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

// Forwarded options keep the core's types exactly.
assert<Equal<WaveformSoundsProps['player'], WaveformSoundsOptions['player']>>();
assert<Equal<WaveformSoundsProps['filters'], WaveformSoundsOptions['filters']>>();
assert<Equal<WaveformSoundsProps['columns'], WaveformSoundsOptions['columns']>>();
assert<Equal<WaveformSoundsProps['sorts'], WaveformSoundsOptions['sorts']>>();
assert<Equal<WaveformSoundsProps['showCount'], boolean | undefined>>();
assert<Equal<WaveformSoundsProps['menuSearch'], number | undefined>>();
assert<Equal<WaveformSoundsProps['strings'], WaveformSoundsOptions['strings']>>();
assert<Equal<WaveformSoundsProps['sounds'], WaveformSoundsOptions['sounds']>>();
assert<Equal<WaveformSoundsProps['manifest'], WaveformSoundsOptions['manifest']>>();
assert<Equal<WaveformSoundsProps['pageSize'], number | undefined>>();
assert<Equal<WaveformSoundsProps['barWidth'], number | undefined>>();
assert<Equal<WaveformSoundsProps['barGap'], number | undefined>>();
assert<Equal<WaveformSoundsProps['player'], 'inline' | 'strip' | undefined>>();

// Exactly these are removed.
assert<
	Equal<
		NotForwardedOption,
		'onReady' | 'onPlay' | 'onPause' | 'onEnd' | 'onFilter' | 'onError' | 'playerClass'
	>
>();
assert<Equal<Extract<keyof WaveformSoundsProps, NotForwardedOption>, never>>();

// Astro extras.
assert<Equal<WaveformSoundsProps['id'], string | undefined>>();
assert<Equal<WaveformSoundsProps['class'], string | undefined>>();

// Strict: unknown props and callbacks are errors.
// @ts-expect-error — no index signature
const typo: WaveformSoundsProps = { pagesize: 10 };
// @ts-expect-error — `sortable` was removed from the core (use `sorts={[]}`)
const removed: WaveformSoundsProps = { sortable: false };
void removed;
// @ts-expect-error — callbacks can't cross SSR
const callback: WaveformSoundsProps = { onPlay: () => {} };
void typo;
void callback;
