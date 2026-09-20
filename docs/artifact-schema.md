# Artifact schema

Every markdown artifact in this repository carries YAML front-matter. Humans read the
prose; the tooling walks the front-matter. Without it an artifact is invisible to the
linter, which is why a missing block is an error rather than a warning.

## Front-matter fields

| Field | Required | Meaning |
|---|---|---|
| `id` | always | Unique across the repo. Prefix encodes the type: `EPIC-`, `US-`, `INT-`, `SPEC-`, `PLAN-`, `A-`. |
| `type` | always | One of `brd`, `epic`, `story`, `intent`, `spec`, `plan`, `register`. |
| `title` | always | One line. |
| `status` | always | `draft`, `ready`, `approved`, `blocked`, `superseded`. |
| `owner` | always | The role accountable, not a person: `po`, `ux`, `frontend-lead`, `backend-lead`. |
| `source` | derived artifacts | The id of the authoritative work item this was derived from. |
| `source_hash` | derived artifacts | Short SHA-256 of the source file when this was written. If the source changes, this artifact is **stale**. |
| `derives_from` | optional | Other artifact ids this builds on. |
| `depends_on` | optional | Assumption ids this relies on. If one is contradicted, this artifact is affected. |
| `touches` | optional | Contract paths or code paths, e.g. `contract:/products/{id}`. |
| `parent` | epics/stories | The parent work item id. |
| `created`, `updated` | always | ISO dates. |

## Example

```yaml
---
id: SPEC-007
type: spec
title: Add a product to the cart
status: draft
owner: backend-lead
source: US-007
source_hash: a3f19c2
derives_from: [INT-007]
depends_on: [A-001, A-003]
touches: [contract:/cart/items]
created: 2026-09-19
updated: 2026-09-19
---
```

## Two directions of linking

**Front-matter** is for the machine. It is what the linter walks and what a future
consistency auditor would traverse to find the neighbours of a changed artifact.

**Inline `[[US-007]]` links** are for the human reading the prose. The linter checks
that they resolve, but they carry no structural meaning.

## The source-of-truth rule

The work item in `backlog/` is authoritative. Everything derived from it — intent,
spec, plan — is a **working copy** that records which version it was derived from via
`source_hash`. When the story changes, those copies do not silently become wrong; the
linter marks them stale and names them.

In production the `backlog/` folder is replaced by a live Azure DevOps connection and
`source` becomes a work item ID. Nothing else in this schema changes, which is the
point of writing it this way.

## Assumptions

An assumption is what a team decided in the absence of a requirement. It is not a
note in a document — it is a numbered artifact with an owner, a status, and a list of
what depends on it.

The register is `assumptions/register.md`. Every `depends_on` entry anywhere in the
repository must resolve to an entry there, or the linter fails.

When a BRD slice lands, the question is not "does this look right" but "which
assumptions does this confirm, and which does it contradict" — and the register
answers that in one pass.

## Naming a plan

A story is planned **once per team**, because the teams cannot see each other and
each is accountable for its own side. So a plan's id carries the team:

```
plan/PLAN-006-API.md    id: PLAN-006-API    owner: backend-lead
plan/PLAN-006-WEB.md    id: PLAN-006-WEB    owner: frontend-lead
```

Both carry `source: US-006` and the same `source_hash`, so if the story moves, both
plans are marked stale together — which is correct: neither is still planning the
thing that was asked for.

A story only one team touches gets only one plan. There is no requirement that both
exist.

This convention was missing when the first plans were about to be written, and the
`-API` / `-WEB` suffix exposed a defect in the link checker: its pattern for inline
`[[…]]` links did not accept hyphens beyond the first, so `[[PLAN-006-API]]` was
silently skipped rather than resolved. A broken link to any hyphenated id would have
passed for as long as the rule existed. Fixed, and proved by a link that must fail.
