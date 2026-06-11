# Testing

## Local Gate

Run this before committing gameplay, UI, platform, or release changes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:browser
pnpm cap:sync
cd android && ./gradlew :app:assembleDebug
```

`pnpm test:browser` intentionally runs the Vitest browser project in two
groups: core UI/persistence/visual specs first, then the long player journey.
The browser provider is Playwright Chromium with GPU flags. Local runs are
headed; CI runs the browser job on macOS with `VITEST_BROWSER_HEADLESS=false`
so the WebGL renderer test does not silently accept a Linux SwiftShader
fallback. Browser spec files are serialized because they share the public page
and must not collide.

## Playthrough Rule

The full journey test drives the app through public controls only:

- directional keyboard input
- A/B actions
- visible buttons where a real player would press them

It may read shell `data-*` attributes for diagnostics, but it must not write
Koota state or teleport the player.

## Screenshots

Visual tests write ignored PNGs under `tests/browser/`. Read screenshots before
accepting a visual change; nonblank canvas tests do not prove art direction.

## Native Android

`pnpm cap:sync` proves that the Vite bundle, local fonts, local SQL wasm, and
native plugin metadata sync into Android. `./gradlew :app:assembleDebug` proves
the scaffold compiles into a debug APK.
