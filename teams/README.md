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

## The standards both teams work to

Four skills, committed under `.claude/skills/`, so every worktree picks them up from
git with nothing to copy. They are advisory: they make the right thing likely while
the code is being written.

| Skill | Triggers on | Says |
|---|---|---|
| `contract-first` | anything crossing the client/server boundary | generate, never hand-write; the contract is the only channel; how to change it |
| `secure-api` | endpoints, guards, refusals, credentials | the security rules already decided, each with its reason |
| `register-assumptions` | deciding something the requirements do not state | the two fields everyone skips, and why they are the point |
| `tests-that-can-fail` | writing or reviewing a test | test the rule, not its shadow |

Each was written from something that actually went wrong here, not from general
advice. The reasons are in the skills.

## The hooks behind them

A skill makes a violation unlikely. A hook makes it fail. Three rules hold without
exception, so each has one — installed into every worktree by
`tools/setup-worktrees.sh`.

| Hook | Refuses | Because |
|---|---|---|
| `no-cross-team.mjs` | a shell command reaching into the other team's folder | permissions cover the file tools and not `cat` |
| `contract-branch-only.mjs` | changing the contract off a `contract/*` branch | mixed into a feature branch, the change never becomes its own pull request and the dual-approval gate never runs |
| `no-generated-edits.mjs` | hand-editing generated types or the role map | a hand-edit is a second source of truth that agrees only until the next regeneration |
| `lint-before-commit.mjs` | `git commit` while the artifact linter fails | CI would catch it twenty minutes and one context switch later, and cost a second commit that explains nothing |

Every one of them explains itself when it fires and names the way forward, because a
block with no route out just gets worked around.

`lint-before-commit` has a deliberate escape hatch: `git commit --no-verify` still
works and says so in the output. Recording a knowingly broken state is occasionally
right, and it should be visible in the command rather than impossible.

All four were proved against deliberate violations before being trusted — the same
rule this project applies to every gate it adds.
