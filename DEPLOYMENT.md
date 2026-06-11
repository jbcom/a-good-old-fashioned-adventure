# Deployment

The shipping target is a static Vite web build wrapped by Capacitor Android.

## Web Build

```bash
pnpm build
```

The build emits `dist/`. Runtime web persistence uses
`public/assets/sql-wasm.wasm`, copied from the pinned `sql.js` package by
`scripts/copy-sql-wasm.mjs`.

## Android Build

```bash
pnpm cap:sync
cd android
./gradlew :app:assembleDebug
```

The debug APK is written under `android/app/build/outputs/apk/debug/`. CI uploads
that APK as an artifact.

The Android project is committed, but generated web assets, Gradle caches,
local SDK paths, and APK outputs are ignored.

## Release

release-please opens release PRs from `main`, updates `CHANGELOG.md`, bumps
`package.json`, and tracks the manifest in `.release-please-manifest.json`.
