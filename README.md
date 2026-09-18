# AI-Native SDLC — proof of concept

This repository is a rehearsal. The product it builds — a small marketplace — is a
prop. The deliverable is the **chain of artifacts** in the git history, and the gates
that keep them honest.

## What we are proving

That the process can hold an agreement between **teams who cannot see each other's
work**, while the business requirements are still incomplete and the client is still
changing their mind.

Four teams are simulated: PO, UX, frontend and backend. The frontend and backend
sessions run in separate git worktrees with permission rules that deny each one read
access to the other's code. The only channel between them is `contract/openapi.yaml`.

## The chain

```
backlog/US-007.md          the work item — the single source of truth
  └─ intent/US-007.intent.md   what is wanted, in the originator's words
       └─ spec/SPEC-007.md      requirements and design, policy applied
            └─ contract/openapi.yaml   the agreement between the two teams
                 └─ plan/PLAN-007.md    how it will be built
                      └─ the diff, its tests, and the PR with its review findings
```

Each stage reads the artifact the last one committed. The chain of commits is the
audit trail: who asked for what, what was produced, and who approved it.

## Layout

| Path | Holds |
|---|---|
| `brd/` | Business requirements. **Deliberately incomplete** — released in slices over the project, exactly as they arrive in real life. |
| `backlog/` | Epics and user stories, shaped like Azure DevOps work items so the folder can be swapped for a live connection later. **Authoritative.** |
| `intent/` | One intent per story, derived from the work item. A working copy, never the source of truth. |
| `spec/` | Requirements and design, written against what is known at the time. |
| `contract/` | `openapi.yaml` — the frontend/backend agreement. Neither team may change it alone. |
| `assumptions/` | Every decision taken in the absence of a requirement, numbered, owned, and linked to what depends on it. |
| `docs/` | How the artifacts are structured and linked. |
| `tools/` | The checks that keep the above from rotting. |
| `web/`, `api/` | The product. Built last, deliberately boring. |

## Checking the artifacts

```
node tools/lint-artifacts.mjs
```

Runs in under a second, costs nothing, and fails the build on broken links, missing
front-matter, unregistered assumptions, or a derived artifact whose source has
changed since it was written.
