<!-- profile: arcade-game+agent-state+mobile-android+standard-repo v1 -->
# a-good-old-fashioned-adventure Claude Adapter

This file is intentionally Claude-specific. It must not carry shared
repository instructions, product status, work queues, validation gates, or
long-running goal state.

For all overall repository instructions, read and follow `AGENTS.md`. Keep
shared progress, pivots, command lists, validation expectations, and durable
agent notes there or in the pillar docs that `AGENTS.md` names.

## Profiles loaded

@/Users/jbogaty/.claude/profiles/arcade-game.md
@/Users/jbogaty/.claude/profiles/agent-state.md
@/Users/jbogaty/.claude/profiles/mobile-android.md
@/Users/jbogaty/.claude/profiles/standard-repo.md

## Instruction Source

Use `AGENTS.md` as the authoritative repository instruction file. Start there
before making changes; it points to `docs/INCREMENTAL-RESCUE-LOOP.md` for the
active product pillar. If this file and `AGENTS.md` ever conflict, follow
`AGENTS.md` and update this file only to preserve Claude-specific behavior.

## Claude-Specific Notes

- Treat `.claude/gates.json` as Claude-side enforcement for the same gates
  described in `AGENTS.md`.
- Do not duplicate the current branch, product direction, goal status, test
  matrix, or work queue here.
- When shared instructions need to change, update `AGENTS.md`; when pillar
  docs need to change, update the relevant `docs/*.md`; when Claude-specific
  mechanics need to change, update this file.
