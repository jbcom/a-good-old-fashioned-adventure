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

## Queue State

The continuous directive in `.agent-state/directive.md` is **RELEASED**: the
incremental princess-rescue milestone (S8.24 plus the full S9 ladder through
the S10 release step) shipped via PR #2. The directive's learnings log names
the next-milestone candidates; a new milestone reopens the directive with a
fresh queue and Status: ACTIVE.
