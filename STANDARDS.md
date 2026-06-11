# Standards

This repo follows the arcade-game dialect: Vite, TypeScript, React, Capacitor,
Biome, Vitest browser mode, Playwright, and release-please.

## Architecture

- Content and tunables live in JSON under `src/content/` and `src/config/`.
- Code interprets content; it does not embed map, quest, combat, or UI constants.
- `src/sim/**` stays pure TypeScript: no DOM, no `Math.random()`, no
  `performance.now()`.
- Renderer decisions stay in `docs/ARCHITECTURE.md`; design decisions stay in
  `docs/DESIGN.md` and `docs/DESIGN-SYSTEM.md`.

## Validation

- Run focused tests while developing, then run the full gate before committing.
- Visual/UI changes require headed browser validation and screenshots that are
  actually inspected.
- Android/platform changes require both `pnpm cap:sync` and
  `cd android && ./gradlew :app:assembleDebug`.
- Persistence stack upgrades must move Capacitor, jeep-sqlite, and sql.js as a
  tested set.

## Style

- Biome owns formatting.
- UI text and controls use the Errant Storybook language, local fonts, and
  design tokens. No CDN fonts, CRT filters, neon/cyberpunk styling, or generic
  arcade typography.
- Mobile gameplay should preserve at least 80% gameplay area.
