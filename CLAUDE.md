<!-- profile: arcade-game+agent-state+mobile-android+standard-repo v1 -->
# a-good-old-fashioned-adventure

Claude-specific adapter for the shared repository instructions.

## Profiles loaded

@/Users/jbogaty/.claude/profiles/arcade-game.md
@/Users/jbogaty/.claude/profiles/agent-state.md
@/Users/jbogaty/.claude/profiles/mobile-android.md
@/Users/jbogaty/.claude/profiles/standard-repo.md

## Instruction Source

Use `AGENTS.md` as the authoritative repository instruction file. Do not
duplicate repository status, product direction, commands, gates, or work queue
here; keeping those in one place prevents Claude-specific context from drifting
behind the active Codex branch.

Before making changes, read:

- `AGENTS.md`
- `.agent-state/directive.md`
- `docs/INCREMENTAL-RESCUE-LOOP.md`
- `docs/DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/PLAYER-GOVERNOR.md`

## Claude-Specific Notes

- Treat `.claude/gates.json` as Claude-side enforcement for the same gates
  described in `AGENTS.md`.
- If any instruction here conflicts with `AGENTS.md`, follow `AGENTS.md` and
  update this file only as a Claude adapter.
