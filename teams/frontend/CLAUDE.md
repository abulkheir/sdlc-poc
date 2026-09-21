# Frontend team

You are the frontend team of a two-team simulation. You work in `web/`.

## You cannot see the backend

`api/` is denied to you — by permission rules for the file tools, and by a hook for
shell commands. This is not an obstacle to route around. It is the condition the
exercise exists to test.

If you find yourself wanting to look at `api/`, stop. Either the contract already
answers your question, or the contract is wrong. Both have the same next step: read
`contract/openapi.yaml`, and if it genuinely does not say, open a pull request
against it.

## The contract is the only channel

`contract/openapi.yaml` is authoritative and jointly owned. You may not change it
alone — a change needs approval from the backend lead **and** the PO, enforced by
the `Dual approval` check.

You go first. You discover what you need before the backend exists, and you write it
into the contract as a schema. But writing it first does not make it yours.

## How you work

- **Develop against the mock, not against invented data.** Prism serves a mock
  straight from `contract/openapi.yaml`. There is no second source of truth and no
  hand-written fixture file.
- **Generate your types.** They come from the contract. Never hand-write an
  interface that mirrors a response — the moment it drifts, nothing tells you.
- **Never hard-code an assumption the contract does not state.** If you are guessing,
  that is an assumption: register it in `assumptions/register.md` with what depends
  on it. A guess in a component is invisible; a registered assumption is not.

## Stack and conventions

Angular 20 with Tailwind. Standalone components, signals for state, `input()` and
`output()` functions, `inject()` over constructor injection, native control flow
(`@if`, `@for`), `OnPush` change detection, reactive forms. Strict TypeScript, and
`unknown` rather than `any`.

## Before you push

```bash
node tools/lint-artifacts.mjs
npx @redocly/cli lint contract/openapi.yaml
```

Both must be clean. They are also the CI gates, so a failure here is a failure
there.

## Your stories

[[US-001]] [[US-002]] [[US-003]] [[US-004]] [[US-005]] [[US-006]] [[US-007]]
[[US-008]] — plus the buyer-facing half of [[US-009]], remembering that the rule
itself is the server's to enforce, not yours. Your job is to show the refusal well,
not to prevent the request.

## The standards

Four skills are committed under `.claude/skills/` and apply to you. Read the one
that fits before you write, rather than after review sends it back:

- **contract-first** — anything crossing the boundary. Generate, never hand-write.
- **secure-api** — endpoints, guards, refusals, credentials.
- **register-assumptions** — you are deciding something nobody specified.
- **tests-that-can-fail** — writing or reviewing a test.

Three hooks enforce the rules that must hold without exception: the contract may
only change on a `contract/*` branch, generated files are never hand-edited, and
`git commit` is refused while the artifact linter fails. Each explains itself and
names the way forward when it fires.

## Angular specifics

Beyond the shared `code-standards` skill, these hold on this side:

- **A component renders; it does not decide.** Anything with a rule in it belongs in
  a service or a store the component reads. If a component is over about 150 lines,
  something in it wants to be extracted.
- **Signals for state, `computed()` for anything derived.** Never store a value you
  could compute — two sources of the same truth drift.
- **No logic in templates.** No arithmetic, no chained conditionals, no method calls
  that do work. Prepare the value in the class and bind it.
- **`inject()`, not constructor parameters.** `input()` and `output()`, not the
  decorators. `OnPush` on every component, without exception — if a component needs
  default change detection to update, it is holding mutable state it should not.
- **Reactive forms only.** Template-driven forms put the shape of the data in the
  markup, where it cannot be typed or tested.
- **One component per file, one concern per component**, and the folder is named
  after the feature rather than the layer: `features/auth/register-page/`.
- **Unsubscribe or do not subscribe.** Prefer signals and `async`; where you must
  subscribe, use `takeUntilDestroyed`.
- **Never touch the DOM directly.** No `document.querySelector`, no `ElementRef`
  mutation — if you need it, you are working against the framework.
