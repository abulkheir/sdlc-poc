# Team boundaries

Four teams are simulated. Two of them — frontend and backend — must be unable to see
each other's work, because that is the condition the whole exercise exists to test.

## How the boundary is made

`bash tools/setup-worktrees.sh` creates a git worktree per team and installs that
team's boundary into it:

| Layer | Covers | File |
|---|---|---|
| Permission rules | Read, Edit, Write, Glob, Grep | `teams/<team>/settings.json` |
| A `PreToolUse` hook | Shell commands | `teams/hooks/no-cross-team.mjs` |
| A team `CLAUDE.md` | What the session is told it is | `teams/<team>/CLAUDE.md` |

A worktree on its own isolates nothing — every worktree holds the whole tree. What
isolates is the pair of rules copied into it. The worktree's job is to give each
session its own branch and its own working directory so they do not collide.

## Why two layers

A permission rule covers the file tools. It does not cover `cat ../api/src/main.ts`,
which would sail straight through. The hook is the deterministic layer behind the
advisory one: a skill or an instruction makes crossing unlikely, a hook makes it
fail.

## What this is not

It is not a sandbox. The hook reads the command text, so it stops the accident and
the casual shortcut — which is what it is for. A session determined to get around it
could. A genuine boundary is an OS-level sandbox in which the other directory is
simply unreadable, and that is what a real deployment of this would use.

Say this out loud when demonstrating it. The value on show is that the process
catches drift, not that the simulation is escape-proof.

## Why the config is committed here rather than on the team branches

If each team branch carried its own `CLAUDE.md` and `.claude/settings.json`, merging
that team's work into `main` would drag its configuration along with it, and the two
branches would fight over the same files forever.

So the boundaries are committed once, here, where both teams and any reviewer can
read them — and the copies inside each worktree are generated and git-ignored.
A change to a boundary is then a normal pull request against `teams/`, visible to
everyone, rather than something a team can quietly relax on its own branch.
