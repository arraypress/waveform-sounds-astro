/**
 * test/forwarding-drift.test.ts
 * -----------------------------
 *
 * Forwarding-drift guard. `WaveformSoundsProps` derives from the core's
 * `WaveformSoundsOptions`, so an option the core adds type-checks here for
 * free — and is then silently dropped, because the `Astro.props` destructure
 * and the `data-*` emitters in `WaveformSounds.astro` are written by hand.
 *
 * This suite enumerates the installed core's real option surface (see
 * `option-surface.ts`), renders each option, hands the rendered element to
 * the installed core's own constructor (in jsdom), and checks the option
 * comes back out of `instance.options` with the value that went in — i.e.
 * the attribute name, the encoding (bool / list / JSON) AND the core's
 * `readDataOptions` all agree. Any key that doesn't round-trip and isn't in
 * `NOT_FORWARDED` with a reason fails the test.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import WaveformSoundsRaw from '../src/WaveformSounds.astro';
import type { WaveformSounds as WaveformSoundsClass } from '@arraypress/waveform-sounds';
import { SOUNDS_OPTIONS, isCallback } from './option-surface';
import { installDom } from './dom';

const Component = WaveformSoundsRaw as Parameters<AstroContainer['renderToString']>[0];

/** Core options deliberately NOT emitted as attributes, each with why. */
const NOT_FORWARDED: Record<string, string> = {
	sounds: 'rendered server-side into the rows the runtime adopts — not an attribute',
	playerClass: "a constructor; the core uses window.WaveformPlayer (the page's, or the one client.ts loads)",
	...Object.fromEntries(
		SOUNDS_OPTIONS.filter(isCallback).map((key) => [key, 'callback: no runtime in static HTML'])
	),
};

/**
 * A non-default value per option. Options with a boolean or numeric default
 * get one derived from it; everything else needs an entry here — a new
 * core option with a `null` default fails with a message saying so.
 * The strings sample carries quotes, `&` and `<` to prove the JSON survives
 * attribute escaping.
 */
const SAMPLES: Record<string, unknown> = {
	manifest: '/sounds.json',
	player: 'strip',
	filters: ['bpm'],
	sorts: ['bpm', 'title'],
	idPrefix: 'pack-a',
	columns: ['key', 'bpm'],
	waveformStyle: 'bars',
	waveformColor: '#123456',
	progressColor: 'rgb(1, 2, 3)',
	strings: { count: '{count} geluiden', search: 'Zoek "x" & <y>' },
	playerOptions: { height: 48, waveformColor: '#ffffff' },
};

function sample(key: string): unknown {
	if (key in SAMPLES) return SAMPLES[key];
	const d = DEFAULT_OPTIONS[key];
	if (typeof d === 'boolean') return !d;
	if (typeof d === 'number') return d + 7;
	throw new Error(`No sample value for core option "${key}" — add one to SAMPLES.`);
}

const FORWARDED = SOUNDS_OPTIONS.filter((key) => !(key in NOT_FORWARDED));
const ONE_SOUND = [{ url: '/a.mp3', title: 'A', type: 'Drums', bpm: 120, key: 'Fmin' }];

let container: AstroContainer;
let WaveformSounds: typeof WaveformSoundsClass;
let DEFAULT_OPTIONS: Record<string, unknown>;

beforeAll(async () => {
	container = await AstroContainer.create();
	const core = await installDom();
	WaveformSounds = core.WaveformSounds;
	DEFAULT_OPTIONS = core.DEFAULT_OPTIONS as Record<string, unknown>;
});

afterEach(() => {
	for (const inst of [...WaveformSounds.instances.values()]) inst.destroy();
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

/** Render, mount into the jsdom document and return the container element. */
async function mount(props: Record<string, unknown>): Promise<HTMLElement> {
	const html = await container.renderToString(Component, { props });
	document.body.innerHTML = html;
	const el = document.querySelector<HTMLElement>('[data-waveform-sounds]');
	if (!el) throw new Error('no [data-waveform-sounds] rendered');
	return el;
}

describe('forwarding drift vs the installed core', () => {
	it('reads a plausible option surface from the core', () => {
		expect(SOUNDS_OPTIONS.length).toBeGreaterThan(20);
		expect(SOUNDS_OPTIONS).toContain('maxTypeChips');
		expect(SOUNDS_OPTIONS).toContain('onFilter');
	});

	it('NOT_FORWARDED lists only real options (no stale entries)', () => {
		expect(Object.keys(NOT_FORWARDED).filter((key) => !SOUNDS_OPTIONS.includes(key))).toEqual([]);
	});

	it('round-trips every other option through data-* and the core constructor', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const dropped: string[] = [];
		for (const key of FORWARDED) {
			const value = sample(key);
			const el = await mount({ sounds: ONE_SOUND, [key]: value });
			const inst = new WaveformSounds(el);
			const got = (inst.options as Record<string, unknown>)[key];
			if (JSON.stringify(got) !== JSON.stringify(value)) dropped.push(`${key}: got ${JSON.stringify(got)}`);
			inst.destroy();
		}
		expect(dropped, 'options neither round-tripped nor in NOT_FORWARDED').toEqual([]);
	});
});

describe('the runtime adopts the server-rendered markup', () => {
	it('keeps the SSR list (no rebuild) and reads every row back as a sound', async () => {
		const el = await mount({
			sounds: [
				...ONE_SOUND,
				{ url: '/b.mp3', title: 'B', type: 'Bass', bpm: 128, key: 'C', duration: 8.5, tags: ['dark'] },
			],
		});
		const ssrList = el.querySelector('[data-ws-list]');
		const inst = new WaveformSounds(el);
		await inst.ready;
		expect(el.querySelector('[data-ws-list]')).toBe(ssrList);
		expect(inst.sounds.map((s) => s.title)).toEqual(['A', 'B']);
		expect(inst.sounds[1]).toMatchObject({ type: 'Bass', bpm: 128, key: 'C', duration: 8.5, tags: ['dark'] });
	});

	it('fetches data-manifest when there are no sounds, and renders it', async () => {
		const fetchMock = vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({ sounds: [{ url: '/m1.mp3', title: 'M1' }, { url: '/m2.mp3', title: 'M2' }] }),
		}));
		vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as unknown as typeof fetch);
		const el = await mount({ manifest: '/sounds.json' });
		expect(el.querySelector('[data-ws-list]')).toBeNull();
		const inst = new WaveformSounds(el);
		await inst.ready;
		expect(fetchMock).toHaveBeenCalledWith('/sounds.json');
		expect(inst.sounds.map((s) => s.title)).toEqual(['M1', 'M2']);
		expect(el.querySelectorAll('[data-ws-list] > [data-ws-index]')).toHaveLength(2);
	});
});
