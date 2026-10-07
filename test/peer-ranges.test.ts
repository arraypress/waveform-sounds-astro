/**
 * test/peer-ranges.test.ts
 * ------------------------
 *
 * The peer floors are load-bearing. This wrapper imports
 * `@arraypress/waveform-sounds/render` (server) and `/no-autoinit` (client)
 * and emits the JSON `data-strings` / `data-player-options` attributes —
 * all first shipped in waveform-sounds 0.1.0. The sounds core in turn needs
 * `@arraypress/waveform-player@1.24.5`.
 */
import { describe, it, expect } from 'vitest';
import pkg from '../package.json';

/** The lowest version a range accepts: `^x.y.z`, or a `||` union of them. */
const floor = (range: string): number[] => {
	const parts = range.split('||').map((part) => {
		const m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(part.trim());
		if (!m) throw new Error(`expected ^x.y.z ranges, got ${range}`);
		return m.slice(1).map(Number);
	});
	return parts.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])[0];
};
const atLeast = (range: string, min: string): boolean => {
	const [a, b] = [floor(range), floor(`^${min}`)];
	for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
	return true;
};

describe('peer dependency floors', () => {
	it('requires waveform-sounds >= 0.1.0 (the /render + /no-autoinit entries)', () => {
		expect(atLeast(pkg.peerDependencies['@arraypress/waveform-sounds'], '0.1.0')).toBe(true);
	});

	it("requires waveform-player >= 1.24.5 (the sounds core's own floor)", () => {
		expect(atLeast(pkg.peerDependencies['@arraypress/waveform-player'], '1.24.5')).toBe(true);
	});

	it('supports Astro 6 and 7', () => {
		expect(pkg.peerDependencies.astro).toBe('^6.0.0 || ^7.0.0');
	});
});
