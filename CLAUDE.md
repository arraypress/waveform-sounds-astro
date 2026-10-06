# CLAUDE.md — @arraypress/waveform-sounds-astro

Astro wrapper for `@arraypress/waveform-sounds`. Server-renders the list with the
core's DOM-free renderer (`@arraypress/waveform-sounds/render`) inside a
`[data-waveform-sounds]` container; the browser runtime ADOPTS that markup
(`[data-ws-list]`). Manifest-only → empty container with `data-manifest`.

## Commands
- `npm test` — vitest. **The only pre-publish gate: no `build`, no `prepublishOnly`** —
  ships `src/` directly, like the other astro wrappers.
- `npm run typecheck` — `tsc --noEmit`, incl. `test/types.typecheck.ts`.

## The rule that matters: two edits per option, both manual

`src/WaveformSounds.astro`. Types derive from the core (`Omit<WaveformSoundsOptions, …>`),
values do not. A new core option needs:
1. Add it to the `Astro.props` destructure.
2. A `setStr` / `setNum` / `setBool` / `setList` / `setJson` call emitting the
   kebab-case `data-*` the core's `readDataOptions` (`src/js/core/options.js`) reads.
3. If the server renderer reads it too (`resolveRenderOptions` in `src/js/render/options.js`),
   pass it to `renderSounds(...)` as well — SSR markup and runtime must agree.

`test/forwarding-drift.test.ts` renders every key of the installed core's
`WaveformSoundsOptions`, hands the element to the REAL core constructor (jsdom, via
`test/dom.ts`) and checks `instance.options[key]` comes back equal. A missed
destructure, a wrong attribute name or a wrong encoding all fail it. A deliberately
unforwarded option goes in `NOT_FORWARDED` with a reason (and in `NotForwardedOption`
in `src/types.ts`); a new option with a `null` default needs a `SAMPLES` entry.

## Client script (`src/client.ts` + `src/lifecycle.ts`)
- A **processed** `<script>` — never `is:inline`, never `define:vars`. The family's
  themes run a strict hash-based CSP; this keeps the script one external module,
  identical on every page. Per-instance data goes in `data-*` only. (The other astro
  wrappers still use `is:inline` + a script-tag core; this one bundles its deps.)
- **Never replaces the page's player.** `ensurePlayer()` waits for the page's own
  scripts (`DOMContentLoaded`, or `load`), keeps an existing `window.WaveformPlayer`
  (e.g. a theme's persistent WaveformBar's copy), and only otherwise dynamic-imports
  `@arraypress/waveform-player/no-autoinit` (a second external chunk — still no inline
  script). Overwriting the global would split `singlePlay` across two classes: the list
  and the bar would stop pausing each other. Then `bindLifecycle()`. Don't turn this back
  into a static import. `@arraypress/waveform-sounds/no-autoinit` is imported statically.
- `init()` now + on `astro:page-load`; `prune()` on `astro:after-swap` (NOT
  before-swap: the core prunes `!el.isConnected`, and nothing is disconnected yet
  before the swap). `transition:persist` lists stay connected → kept. Bound once per
  window via a `Symbol.for` flag.
- The core builds the list on a microtask after the constructor returns (since
  52f5269): `await instance.ready` before asserting on DOM in tests. `destroy()` does
  not restore adopted markup — re-render before constructing over the same element.
- Verified in headless Chrome against a real `astro build` (2026-10-06): one external
  script per page, same file on both pages, mount → navigate (prune) → back (re-init,
  manifest re-fetched); with a page-loaded player the bundled chunk is never fetched and
  the engine is an instance of the page's class.

## Dev dependency on an unpublished core
`@arraypress/waveform-sounds` is a `file:../waveform-sounds` devDependency because
0.1.0 isn't on npm yet. **Switch it to `^0.1.0` after the core is published** (and
`npm install` so package-lock follows). Two consequences of the symlink, both handled:
the drift test reads the core's `index.d.ts` with `fs` (Vite refuses `?raw` outside the
root), and a consumer smoke build must install the core from a `npm pack` tarball (Astro
can't compile a component's script through an out-of-root symlink).

## Cross-repo
Not yet in the `waveform-release` skill's 15-package list — add the sounds group
(core + 4 wrappers) there on first publish.
