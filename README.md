<div align="center">

# Waveform Sounds for Astro

**Typed Astro component for `@arraypress/waveform-sounds`.**
A searchable, filterable list of sound previews — server-rendered, then brought to life — with a mini waveform per row and one shared audio engine.

[![npm version](https://img.shields.io/npm/v/@arraypress/waveform-sounds-astro?style=flat-square&labelColor=09090b&color=3f3f46)](https://www.npmjs.com/package/@arraypress/waveform-sounds-astro)
[![license](https://img.shields.io/npm/l/@arraypress/waveform-sounds-astro?style=flat-square&labelColor=09090b&color=3f3f46)](https://github.com/arraypress/waveform-sounds-astro/blob/main/LICENSE)

**[Documentation](https://docs.waveformplayer.com/)** · [npm](https://www.npmjs.com/package/@arraypress/waveform-sounds-astro)

</div>

---

## Install

```bash
npm install @arraypress/waveform-sounds-astro @arraypress/waveform-sounds @arraypress/waveform-player
```

Import the two stylesheets once, in your layout. The component does not
inject CSS (none of the family's wrappers do):

```astro
---
import '@arraypress/waveform-player/styles.css';
import '@arraypress/waveform-sounds/styles.css';
---
```

The JavaScript is handled for you: the component ships a bundled client
script that loads the player and the sounds runtime. Don't also add them with
`<script>` tags.

## Usage

### From an array — rendered on the server

```astro
---
import WaveformSounds from '@arraypress/waveform-sounds-astro';
---
<WaveformSounds
  sounds={[
    { url: '/previews/kick-01.mp3', title: 'Kick 01', type: 'Drums', bpm: 128, key: 'F minor', duration: 2.4 },
    { url: '/previews/bass-04.mp3', title: 'Bass Loop 04', type: 'Bass', bpm: 128, key: 'Fmin', peaks: 'a1b2c3…' },
  ]}
  pageSize={100}
  columns={['type', 'bpm', 'key']}
/>
```

The whole list — toolbar, filter chips, every row — is in the HTML. The
browser runtime adopts that markup instead of rebuilding it, so the list is
readable and crawlable before any script runs. Give rows `peaks` (what
`waveform-gen --manifest` writes) and the row waveforms draw without decoding
any audio.

### From a manifest — fetched in the browser

```astro
<WaveformSounds manifest="/sounds.json" player="strip" />
```

With only `manifest` (and no `sounds`), the component renders an empty
container with `data-manifest`, and the runtime fetches and renders the list.
`sounds={[]}` counts as "given" — it renders an empty list, as the core does.

Generate a manifest from a folder of previews:

```bash
npx @arraypress/waveform-gen ./public/previews/*.mp3 --manifest ./public/sounds.json
```

To server-render a manifest instead, read it at build time and pass its
`sounds` array.

## Props

Every prop is optional. An omitted prop emits nothing, so the core's default
applies. Types come straight from the core's `WaveformSoundsOptions`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `sounds` | `SoundInput[]` | — | Rendered on the server. |
| `manifest` | `string` | — | URL, fetched in the browser when there are no `sounds`. |
| `player` | `'inline' \| 'strip'` | `'inline'` | Mini waveform per row, or one docked player. |
| `search` | `boolean` | `true` | Search box. |
| `filters` | `('type' \| 'key' \| 'bpm')[]` | all three | `[]` = no filter controls. |
| `sortable` | `boolean` | `true` | Sort menu. |
| `loopToggle` | `boolean` | `true` | Loop button. |
| `pageSize` | `number` | `50` | Rows before "Show more"; `0` = all. |
| `maxTypeChips` | `number` | `10` | More types than this become a menu. |
| `columns` | `('type' \| 'bpm' \| 'key' \| 'duration')[]` | all four | Order is kept. |
| `waveformStyle` | `'mirror' \| 'bars'` | `'mirror'` | Row waveform. |
| `waveformColor` | `string` | CSS `--ws-wave-color` | |
| `progressColor` | `string` | CSS `--ws-progress-color` | |
| `loop` | `boolean` | `false` | Start with Loop on. |
| `autoAdvance` | `boolean` | `false` | Play the next visible sound at the end. |
| `arrowAudition` | `boolean` | `true` | ↑/↓ play the next row while playing. |
| `strings` | `Partial<WaveformSoundsStrings>` | English | UI words; emitted as JSON. |
| `playerOptions` | `object` | — | Options for the engine `WaveformPlayer`; emitted as JSON (functions are dropped). |
| `id` | `string` | — | Container id. |
| `class` | `string` | — | Added to `waveform-sounds waveform-sounds--<player>`. |

Not available as props: the `on*` callbacks (see Events), `playerClass`
(the bundled player is used), and `barWidth` / `barGap` (the core has no
`data-*` form for them yet — set them in JavaScript if you need them).

## Events

Callbacks can't cross server rendering. Listen for the core's bubbling DOM
events instead — on the element, or on `document`:

```astro
<WaveformSounds id="pack" manifest="/sounds.json" />

<script>
  document.addEventListener('waveformsounds:play', (e) => {
    console.log('playing', e.detail.sound.title);
  });
</script>
```

| Event | `detail` |
|---|---|
| `waveformsounds:ready` | `{ sounds, instance }` |
| `waveformsounds:play` / `:pause` / `:end` | `{ sound, index, instance }` |
| `waveformsounds:filter` | `{ visible, total, filter, sort, instance }` |
| `waveformsounds:error` | `{ error, sound?, index?, instance }` |

For the imperative API, `window.WaveformSounds.getInstance('#pack')` returns
the instance (`play()`, `setFilter()`, `setSort()`, …). It is created by the
client script, so call it from an event handler or after
`waveformsounds:ready`.

## Content Security Policy

The client script is a processed Astro `<script>`: one bundled module,
emitted as an external file (`/_astro/…`) and identical on every page — no
`is:inline`, no `define:vars`. Everything per-instance travels in `data-*`
attributes. A strict hash-based CSP needs no extra hashes for this component.

## View Transitions (`<ClientRouter />`)

Works with and without Astro's router. The script initialises on load, again
on every `astro:page-load`, and on `astro:after-swap` destroys the instances
whose element left the page (stopping their audio). A list inside a
`transition:persist` element is carried over and keeps playing.

## Using it next to `<WaveformPlayer>` / `<WaveformPlaylist>`

This component bundles `@arraypress/waveform-player` from npm. If other
players on the same page load the player from a `<script>` tag (the other
Astro wrappers' documented setup), the page ends up with two copies, and
`singlePlay` won't pause across them. Import the player from npm everywhere
(`import '@arraypress/waveform-player'` in a `<script>`) so the bundler
loads one copy.

## License

MIT © [ArrayPress](https://github.com/arraypress)
