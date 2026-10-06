/**
 * test/lifecycle.test.ts
 * ----------------------
 *
 * The client lifecycle (`src/lifecycle.ts`): initialise now, re-initialise
 * on every ClientRouter `astro:page-load`, prune on `astro:after-swap`, bind
 * once. First against a stand-in runtime (what is called, when), then
 * against the REAL core and real server-rendered markup through a simulated
 * ClientRouter navigation, including a `transition:persist` element that
 * must survive it.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import WaveformSoundsRaw from '../src/WaveformSounds.astro';
import type { WaveformSounds as WaveformSoundsClass } from '@arraypress/waveform-sounds';
import { bindLifecycle, ensurePlayer } from '../src/lifecycle';
import { installDom } from './dom';

const Component = WaveformSoundsRaw as Parameters<AstroContainer['renderToString']>[0];

const fresh = (): Document => new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' }).window.document;

function standIn() {
	return { init: vi.fn(() => []), prune: vi.fn() };
}

describe('bindLifecycle — with a stand-in runtime', () => {
	it('initialises immediately (no ClientRouter needed)', () => {
		const rt = standIn();
		const doc = fresh();
		expect(bindLifecycle(rt, doc)).toBe(true);
		expect(rt.init).toHaveBeenCalledTimes(1);
		expect((rt.init.mock.calls[0] as unknown[])[0]).toBe(doc);
	});

	it('re-initialises on every astro:page-load', () => {
		const rt = standIn();
		const doc = fresh();
		bindLifecycle(rt, doc);
		doc.dispatchEvent(new doc.defaultView!.Event('astro:page-load'));
		doc.dispatchEvent(new doc.defaultView!.Event('astro:page-load'));
		expect(rt.init).toHaveBeenCalledTimes(3);
	});

	it('prunes on astro:after-swap — and not on astro:before-swap, where nothing has left yet', () => {
		const rt = standIn();
		const doc = fresh();
		bindLifecycle(rt, doc);
		doc.dispatchEvent(new doc.defaultView!.Event('astro:before-swap'));
		expect(rt.prune).not.toHaveBeenCalled();
		doc.dispatchEvent(new doc.defaultView!.Event('astro:after-swap'));
		expect(rt.prune).toHaveBeenCalledTimes(1);
	});

	it('binds once per window, however many copies run', () => {
		const a = standIn();
		const b = standIn();
		const doc = fresh();
		expect(bindLifecycle(a, doc)).toBe(true);
		expect(bindLifecycle(b, doc)).toBe(false);
		doc.dispatchEvent(new doc.defaultView!.Event('astro:page-load'));
		expect(a.init).toHaveBeenCalledTimes(2);
		expect(b.init).not.toHaveBeenCalled();
	});

	it('logs instead of throwing when the runtime fails', () => {
		const err = vi.spyOn(console, 'error').mockImplementation(() => {});
		const doc = fresh();
		const rt = {
			init: () => {
				throw new Error('boom');
			},
			prune: () => {
				throw new Error('bang');
			},
		};
		expect(() => bindLifecycle(rt, doc)).not.toThrow();
		expect(() => doc.dispatchEvent(new doc.defaultView!.Event('astro:after-swap'))).not.toThrow();
		expect(err).toHaveBeenCalledTimes(2);
		expect(String(err.mock.calls[0][0])).toContain('[WaveformSoundsAstro]');
		err.mockRestore();
	});
});

describe('ensurePlayer — never replaces the page\'s player', () => {
	const complete = { readyState: 'complete', addEventListener: () => {} } as unknown as Document;

	it('keeps an existing window.WaveformPlayer and does not load the bundled one', async () => {
		const pagePlayer = class PagePlayer {};
		const win: { WaveformPlayer?: unknown } = { WaveformPlayer: pagePlayer };
		const load = vi.fn(async () => {
			win.WaveformPlayer = class Bundled {};
		});
		expect(await ensurePlayer(load, win, complete)).toBe(false);
		expect(load).not.toHaveBeenCalled();
		expect(win.WaveformPlayer).toBe(pagePlayer);
	});

	it('loads the bundled player when there is none', async () => {
		const win: { WaveformPlayer?: unknown } = {};
		const load = vi.fn(async () => {
			win.WaveformPlayer = class Bundled {};
		});
		expect(await ensurePlayer(load, win, complete)).toBe(true);
		expect(load).toHaveBeenCalledTimes(1);
		expect(win.WaveformPlayer).toBeTypeOf('function');
	});

	it("waits for the page's own scripts (DOMContentLoaded) before deciding", async () => {
		const doc = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' }).window.document;
		Object.defineProperty(doc, 'readyState', { value: 'interactive', configurable: true });
		const win: { WaveformPlayer?: unknown } = {};
		const load = vi.fn(async () => {});
		const pending = ensurePlayer(load, win, doc);
		// A later module script on the page registers its player…
		const pagePlayer = class PagePlayer {};
		win.WaveformPlayer = pagePlayer;
		doc.dispatchEvent(new doc.defaultView!.Event('DOMContentLoaded'));
		// …and is kept.
		expect(await pending).toBe(false);
		expect(load).not.toHaveBeenCalled();
		expect(win.WaveformPlayer).toBe(pagePlayer);
	});

	it('the client script loads the player by dynamic import, behind ensurePlayer', () => {
		const src = readFileSync(resolve(process.cwd(), 'src/client.ts'), 'utf8');
		expect(src).not.toMatch(/^import\s+['"]@arraypress\/waveform-player/m);
		expect(src).toMatch(/ensurePlayer\(\(\) => import\('@arraypress\/waveform-player\/no-autoinit'\)\)/);
	});
});

describe('bindLifecycle — real core, simulated ClientRouter navigation', () => {
	let container: AstroContainer;
	let WaveformSounds: typeof WaveformSoundsClass;

	beforeAll(async () => {
		container = await AstroContainer.create();
		WaveformSounds = (await installDom()).WaveformSounds;
	});

	const page = async (id: string, persist?: string) => {
		const html = await container.renderToString(Component, {
			props: { id, sounds: [{ url: `/${id}.mp3`, title: id }] },
		});
		// Only the component's markup; the module script is the bundler's job.
		const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
		return persist ? `<div data-astro-transition-persist="${persist}">${markup}</div>` : markup;
	};

	it('mounts on load, destroys what a swap removed, mounts what it added, keeps what it carried over', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		document.body.innerHTML = (await page('one')) + (await page('kept', 'player'));
		bindLifecycle(WaveformSounds, document);

		const one = WaveformSounds.getInstance('#one');
		const kept = WaveformSounds.getInstance('#kept');
		expect(one).toBeTruthy();
		expect(kept).toBeTruthy();
		await one!.ready;
		expect(one!.sounds.map((s) => s.title)).toEqual(['one']);

		// The ClientRouter swap: new body, with the persisted element moved across.
		const keptHost = document.querySelector('[data-astro-transition-persist]')!;
		document.dispatchEvent(new Event('astro:before-swap'));
		document.body.innerHTML = await page('two');
		document.body.appendChild(keptHost);
		document.dispatchEvent(new Event('astro:after-swap'));

		expect(WaveformSounds.instances.has(one!.container)).toBe(false);
		expect(WaveformSounds.getInstance('#kept')).toBe(kept);
		expect(WaveformSounds.getInstance('#two')).toBeNull();

		document.dispatchEvent(new Event('astro:page-load'));
		const two = WaveformSounds.getInstance('#two');
		expect(two).toBeTruthy();
		await two!.ready;
		expect(two!.sounds.map((s) => s.title)).toEqual(['two']);
		// Re-running init never re-mounts a live list.
		expect(WaveformSounds.getInstance('#kept')).toBe(kept);
		vi.restoreAllMocks();
	});
});
