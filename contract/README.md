# The contract

`openapi.yaml` is the agreement between the frontend and backend teams. It is a
schema, not a set of examples, because examples cannot express nullability, numeric
precision, error shapes or what happens when something is missing — and those are
exactly the things two teams resolve differently in good faith.

## Who owns it

**Both teams, jointly.** Neither may change it alone. A change is a pull request
touching this folder, and `CODEOWNERS` requires approval from the backend lead and
the PO before it can merge.

## How each side uses it

| Team | Uses it by |
|---|---|
| Frontend | Running a mock server straight from this file, and generating TypeScript types from it. No mock data is written by hand. |
| Backend | Implementing against it. The API's emitted Swagger is compared to this file on every push. |

## Drift

Strict. **Any** difference between the emitted Swagger and this file fails the build
— not only breaking ones. A gate that sometimes shrugs is not worth having, and
descriptions and examples rot quietly when nothing checks them.

The only way to make a failing drift check pass is a pull request against this file
that both approvers have signed off. That is the point: the build cannot be made
green by one team quietly changing its own side.

## Traceability

Every operation carries `x-story`, naming the work item or items that asked for it, and
`x-assumptions` where its shape rests on a decision taken in the absence of a
requirement. `tools/lint-artifacts.mjs` checks that both resolve, and warns about any
story no operation covers.

This is what makes impact analysis cheap. When A-001 is contradicted by the pricing
slice, the affected operations are a grep away rather than a meeting.
