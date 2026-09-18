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
