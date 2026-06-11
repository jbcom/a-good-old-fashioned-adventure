<!-- profile: arcade-game+agent-state+mobile-android+standard-repo v1 -->
# a-good-old-fashioned-adventure

TypeScript adventure game shipped to Android via Capacitor (arcade-cabinet dialect: Vite + Capacitor + Biome + Playwright + release-please).

## Profiles loaded

@/Users/jbogaty/.Codex/profiles/arcade-game.md
@/Users/jbogaty/.Codex/profiles/agent-state.md
@/Users/jbogaty/.Codex/profiles/mobile-android.md
@/Users/jbogaty/.Codex/profiles/standard-repo.md

## Repo-specific

Current product direction: **mobile incremental storybook rescue game**. The
core loop is now one repeatable south-to-north princess rescue route: start as
the knight at the bottom, push north, defeat the dragon guarding the princess,
earn common coins plus rarer roses, spend rewards on a connected spiderweb
upgrade web, then begin a changed run. Existing bespoke villages, roads,
interiors, NPCs, shops, props, and enemies become unlockable route packs,
objectives, modifiers, and side loops around that rescue loop. The authoritative
pillar is `docs/INCREMENTAL-RESCUE-LOOP.md`.

Content-first architecture: ALL tunables live in `src/config/*.json`, all
assets/world/story in `src/content/**/*.json` (validated by `schemas/`,
spec in `docs/CONTENT-ARCHITECTURE.md`). Code interprets content, never
embeds it. The original prototype is `kingdom_quest_rpg.tsx` (reference
only — it does not run; see decisions table in the spec).

The repo is scaffolded and in continuous build-out on the active long-running
local branch. `.agent-state/directive.md` is the durable work queue.

- **Run:** `pnpm dev`
- **Test:** `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm test:browser`
- **Build:** `pnpm build`
- **Android:** `pnpm cap:sync`; native compile check is `cd android && ./gradlew :app:assembleDebug`
- **Release:** release-please manages `CHANGELOG.md`, `package.json`, and `.release-please-manifest.json`

## Notes

- `.agent-state/directive.md` is ACTIVE and is the durable work queue.
- `.claude/gates.json` enforces visual/audio/sim and Capacitor evidence rules.
- Browser validation is not optional: `tests/browser/playthrough.test.tsx` drives the public player journey through real keyboard controls.
- Work order remains docs > tests > code. Product pivots must first update
  pillar docs and config contracts, then tests, then runtime.
