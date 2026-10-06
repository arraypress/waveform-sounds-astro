# Changelog

All notable changes to `@arraypress/waveform-sounds-astro` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

## [0.1.0] — 2026-10-06

### Added

- `<WaveformSounds>`, an Astro component for `@arraypress/waveform-sounds`.
  Given `sounds`, it server-renders the whole list with the core's DOM-free
  renderer (`@arraypress/waveform-sounds/render`) and the runtime adopts that
  markup. Given only `manifest`, it renders an empty container with
  `data-manifest` for the runtime to fetch.
- Props typed from the core's `WaveformSoundsOptions`: `sounds`, `manifest`,
  `player`, `search`, `filters`, `sorts`, `showCount`, `menuSearch`,
  `loopToggle`, `pageSize`, `maxTypeChips`, `columns`, `waveformStyle`, `waveformColor`,
  `progressColor`, `barWidth`, `barGap`, `loop`, `autoAdvance`, `arrowAudition`, `strings` and
  `playerOptions` (JSON), plus `id` and `class`. Each is emitted as the
  `data-*` attribute the core reads; an omitted prop emits nothing.
- A processed client script (one bundled module, identical on every page —
  safe under a strict hash-based CSP) that loads the sounds runtime,
  initialises on load and on every `astro:page-load`, and destroys
  instances whose element left the page on `astro:after-swap`
  (`transition:persist` lists are kept).
- The player is never replaced: if the page already has `window.WaveformPlayer`
  once its own scripts have run (e.g. a persistent WaveformBar's), the list
  uses it, so `singlePlay` keeps working between them. Only otherwise is
  `@arraypress/waveform-player/no-autoinit` loaded, by dynamic import.
- A forwarding-drift test that round-trips every core option through the
  emitted attributes and the real core's constructor.

### Not forwarded

- The `on*` callbacks (use the `waveformsounds:*` DOM events) and
  `playerClass`.
