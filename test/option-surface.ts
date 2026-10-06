/**
 * test/option-surface.ts
 * ----------------------
 *
 * The option surface this wrapper has to cover, read from the installed
 * core's hand-written `index.d.ts`: every key of `WaveformSoundsOptions`.
 * The forwarding-drift test checks each one is either forwarded at runtime
 * or listed in its `NOT_FORWARDED` map with a reason.
 */
/// <reference types="node" />
// Read from disk rather than through Vite's `?raw`: the core is a `file:`
// symlink until it's published, and Vite refuses `?raw` outside the project
// root. A relative path, not the package specifier: the core doesn't export
// `./index.d.ts`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// From the project root (vitest's cwd) — `import.meta.url` isn't a file: URL
// under the jsdom environment.
const soundsDts = readFileSync(
	resolve(process.cwd(), 'node_modules/@arraypress/waveform-sounds/index.d.ts'),
	'utf8'
);

/**
 * The property names declared directly on `export interface <name>` —
 * comments stripped, nested `{…}` / `(…)` collapsed so parameter names and
 * inline object members don't count, index signatures skipped. (Same parser
 * as waveform-playlist-astro's.)
 */
export function interfaceKeys(dts: string, name: string): string[] {
	const start = dts.indexOf(`export interface ${name}`);
	if (start < 0) throw new Error(`interface ${name} not found`);
	const open = dts.indexOf('{', start);
	let depth = 0;
	let end = open;
	for (; end < dts.length; end++) {
		if (dts[end] === '{') depth++;
		else if (dts[end] === '}' && --depth === 0) break;
	}

	let body = dts
		.slice(open + 1, end)
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, '');
	let previous: string;
	do {
		previous = body;
		body = body.replace(/\{[^{}]*\}/g, '{}').replace(/\([^()]*\)/g, '()');
	} while (body !== previous);

	return [...body.matchAll(/(?:^|[;\n])\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/g)].map(
		(m) => m[1]
	);
}

/** Every `WaveformSoundsOptions` key the installed core declares. */
export const SOUNDS_OPTIONS = interfaceKeys(soundsDts, 'WaveformSoundsOptions');

/** Core callback options (`onReady`, `onPlay`, …). */
export const isCallback = (key: string): boolean => /^on[A-Z]/.test(key);
