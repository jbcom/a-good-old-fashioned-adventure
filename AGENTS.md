<!-- profile: arcade-game+agent-state+mobile-android+standard-repo v1 -->
# a-good-old-fashioned-adventure

TypeScript adventure game shipped to Android via Capacitor (arcade-cabinet dialect: Vite + Capacitor + Biome + Playwright + release-please).

## Profiles loaded

@/Users/jbogaty/.Codex/profiles/arcade-game.md
@/Users/jbogaty/.Codex/profiles/agent-state.md
@/Users/jbogaty/.Codex/profiles/mobile-android.md
@/Users/jbogaty/.Codex/profiles/standard-repo.md

## Repo-specific

Content-first architecture: ALL tunables live in `src/config/*.json`, all
assets/world/story in `src/content/**/*.json` (validated by `schemas/`,
spec in `docs/CONTENT-ARCHITECTURE.md`). Code interprets content, never
embeds it. The original prototype is `kingdom_quest_rpg.tsx` (reference
only — it does not run; see decisions table in the spec).

Repo is pre-scaffold — no `package.json` yet. Next work unit: scaffold the
arcade-game dialect (pnpm + Vite + TS + Capacitor + Biome + Playwright +
release-please) plus the content loader (Koota traits + React bindings +
ajv validation), then verify and fill in the real commands below.

- **Run:** _not scaffolded yet — will be `pnpm dev` once package.json exists_
- **Test:** _not scaffolded yet — will be `pnpm test` / `pnpm test:browser` / `pnpm test:e2e`_
- **Build:** _not scaffolded yet — will be `pnpm build`_
- **Deploy:** _not scaffolded yet — Android via `pnpm cap:sync` + `pnpm cap:run:android`_

## Notes

- `.agent-state/directive.md` seeded with Status: RELEASED — flip to ACTIVE to start a continuous work session.
- `.Codex/gates.json` seeded with the arcade-game defaults (sim-purity bans, visual/audio coverage rules, `pnpm cap:sync` evidence). Adjust globs once the real `src/` layout exists.
- Git repo initialized on `main` 2026-06-10; no remote yet.
