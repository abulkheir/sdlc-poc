---
id: SPEC-005
type: spec
title: Sign in and sign out
status: draft
owner: po
source: US-005
source_hash: f227e5b
derives_from: [INT-005]
depends_on: [A-004, A-010, A-013, A-015]
touches: [contract:/auth/login, contract:/auth/me]
created: 2026-09-20
updated: 2026-09-20
---

# SPEC-005 — Sign in and sign out

> Written against [[US-005]] and [[INT-005]]. **Status is `draft`**: concerns 1 and
> 2 need the contract changed, and a contract change needs both approvals.

## Summary

A registered person signs in with their email and password and gets a token. The
interface reflects their role. Signing out discards the token, and after it nothing
that needed an account works. A wrong email and a wrong password are deliberately
indistinguishable.

## In scope

Signing in, restoring the signed-in state on load, and signing out.

## Out of scope

Password reset, a second factor, remembering a device, and account lockout. All
four are named as absent in [[INT-005]] rather than overlooked; lockout is
registered as A-015.

## Behaviour

### The server decides

1. **A wrong email and a wrong password answer identically** — same status, same
   code, same words. Nothing in the response, and nothing in how long it takes,
   distinguishes "no such account" from "wrong password". [[INT-005]] calls this
   the thing it minds most, and accepts that it makes the message less useful to
   someone who mistyped.
2. **A correct pair returns a token and the user**, whose role the client reads to
   decide what to render.
3. **`/auth/me` answers who the bearer is**, and `401` when the token is missing,
   malformed or expired. This is how the client restores state on load.
4. **There is no sign-out operation.** Tokens are stateless and signing out
   discards the token on the client (A-010). The server cannot revoke one before it
   expires, and the contract says so rather than implying otherwise.
5. **Failed attempts are neither counted nor throttled** (A-015).

### The client shows

- One refusal message for sign-in, whatever was wrong. The client must not soften
  it, split it, or add a hint — doing so would undo rule 1 from the other side.
- On load, `/auth/me` decides the signed-in state. The client does not trust a
  stored token without asking.
- Signing out clears the token and returns to the signed-out interface immediately,
  without waiting for a request.
- **A `401` at any point means the session is over.** The client clears its token
  and routes to sign-in. It does not inspect the token to anticipate this
  (A-013): `bearerFormat: JWT` in the contract is an OpenAPI *hint*, not a promise
  the token is a decodable JWT, and reading `exp` would be an assumption dressed up
  as a fact.

## The API surface it uses

| Operation | Path |
|---|---|
| `login` | `POST /auth/login` |
| `getCurrentUser` | `GET /auth/me` |

## Errors

| Situation | Status | `code` |
|---|---|---|
| Wrong email, or wrong password | 401 | `INVALID_CREDENTIALS` |
| Missing, malformed or expired token on `/auth/me` | 401 | `UNAUTHENTICATED` |

## Traceability

| [[US-005]] acceptance criterion | Satisfied by |
|---|---|
| 1 — right details sign me in, interface reflects my role | Behaviour 2, plus the client rules |
| 2 — a refusal that does not reveal which was wrong | Behaviour 1, both sides |
| 3 — after signing out, protected things stop working | Behaviour 4 and the client rules |
| 4 — a signed-out person asking for a role page is sent to sign in | Client rules, and the route guard |

## Flagged concerns

### 1 — The `401` code is pinned by example, not by schema. **Not blocking.**

As with [[SPEC-004]] concern 3: the response uses `Error`, and only the example says
a sign-in `401` carries `INVALID_CREDENTIALS`. The client chooses its message from
`code`.

**Decided:** `const: INVALID_CREDENTIALS`. Same contract pull request as SPEC-004's.

*Both approvals.*

### 2 — Which role may call which operation is stated in prose only. **Not blocking.**

The public/protected split is unambiguous: `security: []` sits explicitly on the
three catalogue operations and everything else inherits `bearerAuth`. The
buyer/seller split is not — it lives in descriptions such as "a seller has no cart
and is refused", and in which operations declare a `403`. A `403` says "wrong role"
without naming the right one.

Left alone, that map becomes a constant inside a route guard: an assumption nothing
can see and nothing can check.

**Decided:** an `x-roles` extension on **every** operation, alongside `x-story` and
`x-assumptions`, with an explicit `public` value rather than absence. The linter
requires it on every operation and cross-checks in both directions: `x-roles:
[public]` and `security: []` must agree. A protected operation that forgets its
roles fails; one mislabelled public fails too.

Absence must not mean anything. That was the same silent failure as the link
checker's missing hyphen, and it is not being repeated.

*Rolls into the same contract pull request.*

### 3 — Nothing limits repeated sign-in attempts. **Accepted, not resolved.**

A-015. [[INT-005]] named it rather than missing it, and there is nothing to buy yet.
This is the assumption most likely to be contradicted by a security review rather
than by a BRD slice, and the register says what changes when it is.

*No decision needed now.*

### 4 — How long a session lasts is unanswered. **Accepted.**

A-013. [[INT-005]] says outright that the originator does not know enough to set the
number and asks that someone pick one and write down why. Until then the client
reacts to `401` and does not anticipate.

*Decision needed from: whoever owns session policy, before this reaches production —
which for this proof of concept is never, so it stays open.*

## How it will be proven

Server tests, called against the API with no client involved:

- The right pair returns `200`, a token and the user.
- A wrong password and an unregistered email produce **byte-identical** responses.
  This is asserted directly, not eyeballed, because it is the rule most likely to
  drift back when someone later "improves" an error message.
- `/auth/me` with the token returns that user; with no token, a malformed token, and
  a token for a deleted account, `401` each time.
- A token issued for one account never resolves to another.

Client tests cover that the refusal message is identical in both cases, that load
asks `/auth/me` rather than trusting stored state, that signing out clears the token
without a request, and that a `401` mid-session routes to sign-in.

## Division of work

| Team | Does |
|---|---|
| Backend | Everything under "The server decides", and the server tests. Depends on [[SPEC-004]] being built first, since there is nothing to sign in to before there are accounts. |
| Frontend | Everything under "The client shows", against the Prism mock, plus the route guard. |
