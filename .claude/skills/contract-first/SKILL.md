---
name: contract-first
description: Apply the contract-first rule. Use whenever writing or changing anything that crosses the client/server boundary — a request, a response, an error shape, a type that mirrors one, a mock, a fixture — or when you find yourself wanting to know what the other team does.
---

# Contract first

`contract/openapi.yaml` is the only channel between the frontend and the backend.
It is a schema, not a set of examples, because examples cannot express nullability,
numeric precision, error shapes or pagination — and those are exactly the things two
teams resolve differently in good faith.

## Never hand-write what the contract can generate

| Never write by hand | Generate it |
|---|---|
| A TypeScript interface mirroring a response | `openapi-typescript` from the contract |
| A mock response, fixture or stub | Prism, served from the contract |
| A list of role names in a route guard | The `x-roles` extension |
| An error code string literal | The `const` on that error's schema |

A hand-written copy is a second source of truth. It agrees with the contract on the
day it is written and silently stops agreeing later, and nothing tells you when.

If generated output is committed, a `types:verify` script must regenerate it and
fail on any difference. Committed without that check, it is a hand-written copy
wearing a generated file's name.

## When the contract does not answer your question

This is the moment the rule exists for. You will be tempted to look at the other
team's code, or to guess and move on. Do neither.

1. **Read the contract again.** Most questions are already answered in a
   description, a `required` list or an error schema.
2. **If it genuinely does not say, that is a defect in the contract**, not a reason
   to go looking. Open a pull request against `contract/openapi.yaml`.
3. **If you must proceed before it merges**, register an assumption first — see the
   `register-assumptions` skill — and reference it from whatever you write.

Wanting to read the other side is a signal, not an obstacle. Every time that urge
has come up in this project it turned out the contract was underspecified, and
fixing the contract helped both teams rather than one.

## Changing the contract

A contract change is a pull request that **both** the backend lead and the PO must
approve. Neither may change it alone, and the `Both teams approved` check enforces
that independently of `CODEOWNERS`.

Before pushing a contract change:

```
npx @redocly/cli lint contract/openapi.yaml    # must report zero, not just no errors
node tools/lint-artifacts.mjs                  # x-story, x-assumptions, x-roles resolve
```

And verify the change does what you claim. For a schema, that means running an
instance through a validator — one that should pass and one that should fail. A
schema that was never tested against a rejection has not been tested.

## Every operation carries its links

`x-story` (the work item that asked for it), `x-assumptions` (decisions its shape
rests on) and `x-roles` (who may call it) are required on every operation and
checked by the linter. `x-roles` is written explicitly, including `public` —
absence must never mean anything, because an operation that simply forgot its roles
would otherwise read as public.
