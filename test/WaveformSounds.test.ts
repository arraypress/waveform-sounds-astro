/**
 * test/WaveformSounds.test.ts
 * ---------------------------
 *
 * Output tests for the `<WaveformSounds>` Astro component, rendered through
 * Astro's `experimental_AstroContainer` API and asserted on as HTML:
 *
 *  - the container: marker attribute, classes, `data-player`, and every
 *    option as the `data-*` attribute the core reads (and no attribute for an
 *    omitted prop, so the core's default applies);
 *  - the server-rendered list from `sounds` (the markup the runtime adopts);
 *  - the manifest-only mode (an empty container the runtime fills);
 *  - the processed client script.
 *
 * The round trip through the real core lives in `forwarding-drift.test.ts`.
 *
 * @see ../src/WaveformSounds.astro
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { renderSounds } from '@arraypress/waveform-sounds/render';
// Cast at the import boundary: the shim in src/astro-shim.d.ts models
// `.astro` imports as opaque factories.
import WaveformSoundsRaw from '../src/WaveformSounds.astro';
import type { WaveformSoundsProps, SoundInput } from '../src/types';

const WaveformSounds = WaveformSoundsRaw as Parameters<AstroContainer['renderToString']>[0];

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

async function render(props: WaveformSoundsProps): Promise<string> {
	return container.renderToString(WaveformSounds, {
		props: props as unknown as Record<string, unknown>,
	});
}

const SOUNDS: SoundInput[] = [
	{ url: '/p/kick.mp3', title: 'Kick 01', type: 'Drums', bpm: 128, key: 'F minor', duration: 2.5, tags: ['punchy'] },
	{ url: '/p/bass.mp3', title: 'Bass Loop', type: 'Bass', bpm: 120, key: 'C', duration: '0:08', peaks: [0, 0.5, 1] },
	{ url: '/p/pad.mp3', title: 'Pad', type: 'Synth', bpm: 90, key: 'Am' },
];

/** Decode the entities Astro emits in attribute values (as `dataset` would). */
function decodeEntities(value: string): string {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&#x27;|&#39;|&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

/** An attribute's decoded value; `''` if bare; `null` if absent. */
function getAttr(html: string, name: string): string | null {
	const valued = new RegExp(`\\s${name}="([^"]*)"`).exec(html);
	if (valued) return decodeEntities(valued[1]);
	return new RegExp(`\\s${name}(?=[\\s>/])`).test(html) ? '' : null;
}

function expectNoAttr(html: string, name: string): void {
	expect(getAttr(html, name), `expected ${name} to be absent`).toBeNull();
}

/** The container's opening tag, so row attributes (data-bpm, …) don't leak in. */
function containerTag(html: string): string {
	// Quote-aware: a `>` inside a JSON attribute value doesn't end the tag.
	return /<div(?:\s+[^\s=>]+(?:="[^"]*")?)*\s*>/.exec(html)?.[0] ?? '';
}

/** The container's inner HTML (everything up to its closing tag before the script). */
function innerOf(html: string): string {
	const open = containerTag(html);
	const start = html.indexOf(open) + open.length;
	return html.slice(start, html.lastIndexOf('</div>'));
}

const rows = (html: string): string[] => [...html.matchAll(/<li class="ws-row"[^>]*>/g)].map((m) => m[0]);

// ─── Container ──────────────────────────────────────────────────────────────

describe('<WaveformSounds> — container', () => {
	it('renders the marker attribute and the base classes', async () => {
		const tag = containerTag(await render({ sounds: SOUNDS }));
		expect(getAttr(tag, 'data-waveform-sounds')).toBe('');
		expect(getAttr(tag, 'class')).toBe('waveform-sounds waveform-sounds--inline');
	});

	it('always emits the resolved data-player (inline unless strip)', async () => {
		expect(getAttr(containerTag(await render({ sounds: SOUNDS })), 'data-player')).toBe('inline');
		const strip = containerTag(await render({ sounds: SOUNDS, player: 'strip' }));
		expect(getAttr(strip, 'data-player')).toBe('strip');
		expect(getAttr(strip, 'class')).toContain('waveform-sounds--strip');
	});

	it('appends class and passes id through', async () => {
		const tag = containerTag(await render({ sounds: SOUNDS, class: 'pack-list dark', id: 'pack' }));
		expect(getAttr(tag, 'class')).toBe('waveform-sounds waveform-sounds--inline pack-list dark');
		expect(getAttr(tag, 'id')).toBe('pack');
	});

	it('emits no option attributes when no options are set', async () => {
		const tag = containerTag(await render({ sounds: SOUNDS }));
		for (const name of [
			'data-manifest', 'data-search', 'data-filters', 'data-sorts', 'data-show-count',
			'data-menu-search', 'data-id-prefix', 'data-url-state', 'data-loop-toggle',
			'data-page-size', 'data-max-type-chips', 'data-columns', 'data-waveform-style',
			'data-waveform-color', 'data-progress-color', 'data-bar-width', 'data-bar-gap', 'data-loop', 'data-auto-advance',
			'data-arrow-audition', 'data-strings', 'data-player-options', 'id',
		]) {
			expectNoAttr(tag, name);
		}
	});

	it('never emits attributes for the options it cannot forward', async () => {
		const tag = containerTag(
			await render({ sounds: SOUNDS, ...({ playerClass: {} } as object) })
		);
		expectNoAttr(tag, 'data-player-class');
		expectNoAttr(tag, 'data-sounds');
	});
});

// ─── Options → data-* ───────────────────────────────────────────────────────

describe('<WaveformSounds> — options as data-* attributes', () => {
	it('emits booleans as "true" / "false"', async () => {
		const tag = containerTag(
			await render({
				sounds: SOUNDS,
				search: false,
				showCount: false,
				loopToggle: false,
				loop: true,
				autoAdvance: true,
				arrowAudition: false,
			})
		);
		expect(getAttr(tag, 'data-search')).toBe('false');
		expect(getAttr(tag, 'data-show-count')).toBe('false');
		expect(getAttr(tag, 'data-loop-toggle')).toBe('false');
		expect(getAttr(tag, 'data-loop')).toBe('true');
		expect(getAttr(tag, 'data-auto-advance')).toBe('true');
		expect(getAttr(tag, 'data-arrow-audition')).toBe('false');
	});

	it('emits urlState as "true" / "false", or its prefix verbatim', async () => {
		expect(getAttr(containerTag(await render({ sounds: SOUNDS, urlState: true })), 'data-url-state')).toBe('true');
		expect(getAttr(containerTag(await render({ sounds: SOUNDS, urlState: false })), 'data-url-state')).toBe('false');
		expect(getAttr(containerTag(await render({ sounds: SOUNDS, urlState: 'pack' })), 'data-url-state')).toBe('pack');
	});

	it('emits numbers, keeping 0 (pageSize 0 = show all)', async () => {
		const tag = containerTag(
			await render({ sounds: SOUNDS, pageSize: 0, maxTypeChips: 4, menuSearch: 0, barWidth: 3, barGap: 0 })
		);
		expect(getAttr(tag, 'data-page-size')).toBe('0');
		expect(getAttr(tag, 'data-max-type-chips')).toBe('4');
		expect(getAttr(tag, 'data-menu-search')).toBe('0');
		expect(getAttr(tag, 'data-bar-width')).toBe('3');
		expect(getAttr(tag, 'data-bar-gap')).toBe('0');
	});

	it('ignores a non-finite number', async () => {
		const tag = containerTag(await render({ sounds: SOUNDS, pageSize: Number.NaN }));
		expectNoAttr(tag, 'data-page-size');
	});

	it('emits lists comma-separated, and an empty list as "" (= none, not the default)', async () => {
		const tag = containerTag(
			await render({ sounds: SOUNDS, filters: ['key', 'bpm'], sorts: ['bpm', 'title'], columns: ['bpm'] })
		);
		expect(getAttr(tag, 'data-filters')).toBe('key,bpm');
		expect(getAttr(tag, 'data-sorts')).toBe('bpm,title');
		expect(getAttr(tag, 'data-columns')).toBe('bpm');

		const none = containerTag(await render({ sounds: SOUNDS, filters: [], sorts: [] }));
		expect(getAttr(none, 'data-filters')).toBe('');
		expect(getAttr(none, 'data-sorts')).toBe('');
	});

	it('emits strings verbatim (style, colours, manifest)', async () => {
		const tag = containerTag(
			await render({
				sounds: SOUNDS,
				manifest: '/sounds.json',
				waveformStyle: 'bars',
				waveformColor: 'rgba(255,255,255,0.4)',
				progressColor: '#d1fe17',
			})
		);
		expect(getAttr(tag, 'data-manifest')).toBe('/sounds.json');
		expect(getAttr(tag, 'data-waveform-style')).toBe('bars');
		expect(getAttr(tag, 'data-waveform-color')).toBe('rgba(255,255,255,0.4)');
		expect(getAttr(tag, 'data-progress-color')).toBe('#d1fe17');
	});

	it('emits strings and playerOptions as JSON that survives attribute escaping', async () => {
		const strings = { count: '{count} geluiden', searchPlaceholder: 'Zoek "kick" & <snare>' };
		const playerOptions = { height: 48, waveformColor: '#fff', showTime: false };
		const tag = containerTag(await render({ sounds: SOUNDS, strings, playerOptions }));
		expect(JSON.parse(getAttr(tag, 'data-strings') ?? 'null')).toEqual(strings);
		expect(JSON.parse(getAttr(tag, 'data-player-options') ?? 'null')).toEqual(playerOptions);
	});
});

// ─── Server-rendered list ───────────────────────────────────────────────────

describe('<WaveformSounds> — server-rendered list', () => {
	it('renders exactly what the core renderer renders for the same sounds + options', async () => {
		// One non-default value for every option the renderer reads.
		const options = {
			player: 'strip' as const,
			search: false,
			filters: ['key' as const],
			sorts: ['title' as const, 'bpm' as const],
			showCount: true,
			menuSearch: 1,
			idPrefix: 'pack',
			loopToggle: false,
			pageSize: 2,
			maxTypeChips: 1,
			columns: ['bpm' as const],
			strings: { count: '{count} x', sortBy: 'Order' },
		};
		const html = await render({ sounds: SOUNDS, ...options });
		expect(innerOf(html)).toBe(renderSounds(SOUNDS, options));
	});

	it('renders one row per sound, in order, with the row data the runtime reads', async () => {
		const html = await render({ sounds: SOUNDS });
		const r = rows(html);
		expect(r).toHaveLength(3);
		expect(r.map((row) => getAttr(row, 'data-title'))).toEqual(['Kick 01', 'Bass Loop', 'Pad']);
		expect(getAttr(r[0], 'data-url')).toBe('/p/kick.mp3');
		expect(getAttr(r[0], 'data-bpm')).toBe('128');
		// Keys are normalised to the short canonical form.
		expect(getAttr(r[0], 'data-key')).toBe('Fm');
		expect(getAttr(r[1], 'data-duration')).toBe('8');
		expect(getAttr(r[1], 'data-peaks')).toBeTruthy();
		expect(html).toContain('data-ws-list');
	});

	it('renders the toolbar from the data (type chips, key + sort menus, BPM range, count)', async () => {
		const html = await render({ sounds: SOUNDS });
		expect(html).toContain('data-ws-search');
		expect([...html.matchAll(/data-ws-type="/g)]).toHaveLength(4); // All + 3 types
		expect(html).toContain('<span class="ws-chip-label">Drums</span>');
		expect(html).toContain('data-ws-menu="key"');
		expect(html).toContain('data-ws-menu="sort"');
		expect(html).not.toContain('<select');
		expect(html).toContain('data-ws-bpm-min');
		expect(html).toContain('3 sounds');
	});

	it('prefixes the dropdown ids with idPrefix, else the id (as the core does when it renders)', async () => {
		const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((v) => v !== 'x');
		const own = await render({ sounds: SOUNDS, idPrefix: 'pack-a' });
		expect(getAttr(containerTag(own), 'data-id-prefix')).toBe('pack-a');
		expect(ids(own).length).toBeGreaterThan(0);
		expect(ids(own).every((v) => v.startsWith('pack-a'))).toBe(true);

		const fromId = await render({ sounds: SOUNDS, id: 'pack-b' });
		expectNoAttr(containerTag(fromId), 'data-id-prefix');
		expect(innerOf(fromId)).toBe(renderSounds(SOUNDS, { idPrefix: 'pack-b' }));

		// Explicit idPrefix wins over id.
		const both = await render({ sounds: SOUNDS, id: 'outer', idPrefix: 'inner' });
		expect(innerOf(both)).toBe(renderSounds(SOUNDS, { idPrefix: 'inner' }));
	});

	it('lets sorts / showCount / filters remove controls from the SSR markup', async () => {
		const html = await render({ sounds: SOUNDS, sorts: [], showCount: false, filters: ['type'] });
		expect(html).not.toContain('data-ws-menu="sort"');
		expect(html).not.toContain('data-ws-menu="key"');
		expect(html).not.toContain('3 sounds');
		expect(html).toContain('data-ws-type="Drums"');
	});

	it('lets the options shape the SSR markup (strings, toggles, layout, paging)', async () => {
		const html = await render({
			sounds: SOUNDS,
			player: 'strip',
			search: false,
			loopToggle: false,
			pageSize: 2,
			strings: { count: '{count} geluiden' },
		});
		expect(html).toContain('3 geluiden');
		expect(html).not.toContain('data-ws-search');
		expect(html).not.toContain('data-ws-loop');
		// Strip rows carry no canvas; inline rows do.
		expect(html).not.toContain('ws-canvas');
		expect(html).toContain('ws-list--strip');
		// Rows past the page are hidden, not dropped (the runtime pages them).
		expect(rows(html)[2]).toMatch(/\shidden/);
	});

	it('uses a type menu instead of chips past maxTypeChips', async () => {
		const html = await render({ sounds: SOUNDS, maxTypeChips: 2 });
		expect(html).toContain('data-ws-menu="type"');
		expect(html).not.toContain('data-ws-type="');
	});

	it('renders a download link only on rows that have one', async () => {
		const html = await render({
			sounds: [
				{ url: '/a.mp3', title: 'Free Kick', download: '/files/free-kick.wav' },
				{ url: '/b.mp3', title: 'Paid Bass' },
			],
		});
		const [free, paid] = html.split('<li class="ws-row"').slice(1);
		expect(free).toMatch(/<a class="ws-download" href="\/files\/free-kick\.wav" download/);
		expect(getAttr(free, 'data-download')).toBe('/files/free-kick.wav');
		expect(paid).not.toContain('ws-download');
	});

	it('escapes sound text (no markup injection through titles)', async () => {
		const html = await render({ sounds: [{ url: '/x.mp3', title: '<img src=x onerror=alert(1)>' }] });
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
	});

	it('renders an empty list (not the manifest mode) for sounds={[]}', async () => {
		const html = await render({ sounds: [], manifest: '/sounds.json' });
		expect(html).toContain('data-ws-list');
		expect(rows(html)).toHaveLength(0);
	});
});

// ─── Manifest mode ──────────────────────────────────────────────────────────

describe('<WaveformSounds> — manifest only', () => {
	it('renders an empty container carrying data-manifest', async () => {
		const html = await render({ manifest: '/sounds.json', pageSize: 100 });
		const tag = containerTag(html);
		expect(getAttr(tag, 'data-manifest')).toBe('/sounds.json');
		expect(getAttr(tag, 'data-page-size')).toBe('100');
		expect(innerOf(html)).toBe('');
		expect(html).not.toContain('data-ws-list');
	});
});

// ─── Client script ──────────────────────────────────────────────────────────

describe('<WaveformSounds> — client script', () => {
	it('ships a processed module script (bundled, external), not an inline one', async () => {
		const html = await render({ sounds: SOUNDS });
		expect(html).toMatch(/<script type="module" src="[^"]*WaveformSounds\.astro\?astro&(amp;)?type=script/);
		expect(html).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/);
	});

	it('is the same script whatever the props (CSP: one hash / one file for every page)', async () => {
		const scriptOf = (html: string) => /<script[^>]*><\/script>/.exec(html)?.[0];
		const a = scriptOf(await render({ sounds: SOUNDS, id: 'a', strings: { count: 'x' } }));
		const b = scriptOf(await render({ manifest: '/m.json', player: 'strip' }));
		expect(a).toBeTruthy();
		expect(a).toBe(b);
	});

	it('the component source has no is:inline / define:vars script', () => {
		const src = readFileSync(resolve(process.cwd(), 'src/WaveformSounds.astro'), 'utf8');
		const template = src.slice(src.lastIndexOf('---') + 3);
		expect(template).not.toMatch(/is:inline|define:vars/);
		expect(template).toMatch(/<script>\s*import '\.\/client';\s*<\/script>/);
	});
});
