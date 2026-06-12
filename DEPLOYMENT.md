# Deployment

The shipping target is a static Vite web build wrapped by Capacitor Android.
Automation flows **ci.yml → release-please → release.yml → cd.yml**:

| Workflow | Trigger | Job |
| --- | --- | --- |
| `ci.yml` | pull requests and pushes to `main` | merge gates: lint, typecheck, unit, headed-GPU browser suite, web build, Android debug APK check |
| `release-please.yml` | push to `main` | opens/updates the release PR; merging it bumps the version, updates `CHANGELOG.md`, tags, and publishes the GitHub release |
| `release.yml` | release published (or `workflow_dispatch` with a tag to backfill) | builds the **versioned artifacts** — the web bundle zip and the Android debug APK — attests build provenance for both, and uploads them as assets on the GitHub release |
| `cd.yml` | push to `main` | builds the game and deploys it to **GitHub Pages** (workflow build type, official Pages actions) |

## Web Build

```bash
pnpm build
```

The build emits `dist/` with a relative `base` so the same bundle serves from
the GitHub Pages project subpath and from Capacitor's `file://` origin.
Runtime web persistence uses `public/assets/sql-wasm.wasm`, copied from the
pinned `sql.js` package by `scripts/copy-sql-wasm.mjs` and fetched relatively
by jeep-sqlite.

## Android Build

```bash
pnpm cap:sync
cd android
./gradlew :app:assembleDebug
```

The debug APK is written under `android/app/build/outputs/apk/debug/`. CI
uploads it as a check artifact; `release.yml` attaches the versioned copy to
each GitHub release.

## Release

release-please opens release PRs from `main`, updates `CHANGELOG.md`, bumps
`package.json`, and tracks the manifest in `.release-please-manifest.json`.
Publishing the release triggers `release.yml`, which hangs the attested web
bundle and debug APK off the release. The live game is served from GitHub
Pages by `cd.yml` on every `main` push.
