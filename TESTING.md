# Testing

## Local Gate

Run this before committing gameplay, UI, platform, or release changes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:browser
pnpm author:pixelart
pnpm cap:sync
cd android && ./gradlew :app:assembleDebug
```

`pnpm test:browser` intentionally runs the Vitest browser project in two
groups: core UI/persistence/visual specs first, then the long player journey.
The browser provider is Playwright Chromium with GPU flags. Local runs are
headed; CI runs the browser job on macOS with `VITEST_BROWSER_HEADLESS=false`
so the WebGL renderer test does not silently accept a Linux SwiftShader
fallback. Browser spec files are serialized because they share the public page
and must not collide; both browser script groups pass
`--browser.fileParallelism=false --no-file-parallelism` so CI uses the same
single-page discipline as local headed runs.

## Playthrough Rule

The full journey test drives the app through public controls only:

- directional keyboard input
- A/B actions
- visible buttons where a real player would press them

It may read shell `data-*` attributes for diagnostics, but it must not write
Koota state or teleport the player.

The current journey must cover princess rescue, the results panel, upgrade-web
entry, a connected upgrade purchase with A, and B returning to results. The
next rescue-loop proof must add the second run and visible unlocked mutation
without bypassing public controls.

## Screenshots

Visual tests write ignored PNGs under `tests/browser/`. Read screenshots before
accepting a visual change; nonblank canvas tests do not prove art direction.
For pixel-art source changes, inspect the relevant preview PNG under
`src/content/pixelart/` and rerun `pnpm author:pixelart` so the `.aseprite`
master matches the committed `.pix` rows.

## Native Android

`pnpm cap:sync` proves that the Vite bundle, local fonts, local SQL wasm, and
native plugin metadata sync into Android. `./gradlew :app:assembleDebug` proves
the scaffold compiles into a debug APK.
