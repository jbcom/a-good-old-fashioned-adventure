# State

Updated: 2026-06-11

Branch: `codex/castle-interior-depth`

## Current Build State

- Mobile incremental rescue loop is the active product frame. The player
  rescues the princess, earns coins and roses, opens a results panel, buys
  connected upgrade-graph nodes, and begins changed runs.
- Content-first JSON registry, schemas, Koota sim, Yuka enemy/NPC behaviors,
  ToneJS audio, AnimeJS motion, r3f HD-2D renderer, Errant Storybook UI, and
  Capacitor/SQLite persistence are in place.
- The existing Hearthwake -> Oldwood -> Deep Forest -> Sunken Road -> Castle
  Approach -> castle rooms -> dungeon road remains playable and is now treated
  as unlockable route-pack material for the incremental loop.
- Browser playthrough validation uses public directional/A/B input and now
  proves princess rescue -> results -> upgrade graph -> connected purchase -> B
  back to results.
- Capacitor Android scaffold, SQLite/Preferences/Device plugins, local web
  SQLite wasm copy, `cap:sync`, and debug APK assemble are green locally.
- CI, release-please manifest mode, Dependabot pinned-stack ignores, and
  standard repo docs are scaffolded.

## Active Queue

See `.agent-state/directive.md`. S9.3 is complete. Open work is S8.24
composition tuning plus S9.4 rescue-route runtime slice and S9.5 second-run
proof, but no further directive work should begin until this docs consistency
pass is committed.
