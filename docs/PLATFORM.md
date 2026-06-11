---
title: Platform
updated: 2026-06-11
status: current
domain: technical
---

# Platform

The shipping wrapper is Capacitor Android over the Vite web app. The web app is
still first-class: the same `dist/` bundle runs in browser tests and is copied
into the native Android project by `pnpm cap:sync`.

## Android Contract

- App id: `com.jbogaty.goodoldfashionedadventure`.
- App name: `A Good Old-Fashioned Adventure`.
- Web dir: `dist`.
- Bundled assets only. Fonts and `sql-wasm.wasm` live in `public/assets`; no
  runtime CDN dependency is allowed.
- `pnpm cap:sync` runs the production build first, then syncs Android.
- The generated Android project is committed because native Gradle, manifest,
  plugin, and asset wiring are part of the product surface.
- `./gradlew :app:assembleDebug` must pass locally before Android changes are
  accepted. The app module explicitly links `appcompat-resources` because
  Capacitor's `BridgeActivity` themes depend on those resource AARs during
  Android resource linking.

## Persistence Contract

Runtime saves use `@capacitor-community/sqlite`. Browser/web saves use the
jeep-sqlite web store and the pinned local `sql.js` wasm copy. Android uses the
native SQLite implementation through the same `SaveRepository` contract.
Settings use `@capacitor/preferences`.

The save stack moves only as one compatibility set:
`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`,
`@capacitor-community/sqlite`, `@capacitor/device`,
`@capacitor/preferences`, `jeep-sqlite`, and `sql.js`.

## Device Profile

The HUD density is platform-aware. CSS breakpoints are still useful for browser
resizing, but Capacitor builds must ask `@capacitor/device` for platform
metadata and combine it with viewport measurements:

- `phone`: one-line top HUD, HP as percentage, bars hidden, virtual controls
  as translucent overlays.
- `tablet`: one-line top HUD plus HP/XP bars, slideout minimap/quest log.
- `desktop`: browser/dev profile with the same play controls and visible bars.

The profile is exposed as `data-device-profile` on the app shell so browser
tests can validate phone/tablet layout without mutating sim state.
