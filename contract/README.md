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

## Two rough edges in how GitHub displays this

Neither is a fault in the gate. Both will confuse you at the worst possible moment
if you meet them for the first time during a demonstration.

### The same check appears more than once, and only one says "Required"

The dual approval workflow runs on two events: `pull_request`, so a check exists the
moment a pull request opens or someone pushes to it, and `pull_request_review`, so it
re-evaluates whenever an approval arrives or is withdrawn. Both are needed — without
the first, a pull request nobody has reviewed would never run the check at all and
would sit waiting for a result that never comes.

The cost is that one commit ends up with two check runs of the same name. GitHub
matches required checks **by name**, so when it finds several it counts one and
leaves the other merely displayed. An entry without the `Required` label is not
being ignored and has not failed; it simply is not the one being counted.

**The merge box is the authority, not the list.** When it says the pull request is
blocked, it is blocked; when it offers you the merge button, every requirement is
met. Do not try to read the outcome off the individual rows.

### A run that failed earlier stays red forever

Check runs are recorded against the commit, and nothing removes the old ones. The
run from the moment the pull request opened — when, correctly, nobody had approved
yet — keeps showing red long after both approvals have arrived and a later run has
passed.

To clear it, open that run in the Actions tab and choose **Re-run all jobs**. It
will pass this time, because the approvals now exist.

> **Do not push a commit to tidy this up.** Branch protection dismisses stale
> approvals on every new commit, so a cosmetic push costs you both approvals and you
> start the review again from nothing.

Leaving the old red run in place is also a defensible choice while presenting: the
sequence of runs — failed with no approvals, failed with one, passed with two — is a
better demonstration of the gate working than a uniformly green list.
