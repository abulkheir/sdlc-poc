---
id: SPEC-004
type: spec
title: Register as a buyer or a seller
status: draft
owner: po
source: US-004
source_hash: 5f7cbce
derives_from: [INT-004]
depends_on: [A-004, A-010, A-014]
touches: [contract:/auth/register]
created: 2026-09-20
updated: 2026-09-20
---

# SPEC-004 — Register as a buyer or a seller

> Written against [[US-004]] and [[INT-004]]. **Status is `draft`**: concerns 1 and
> 2 need the contract changed, and a contract change needs both approvals. Do not
> plan against this until they have merged.

## Summary

Anyone not signed in creates an account with an email address, a password and a
choice of **buyer** or **seller**. The choice is fixed for the life of the account
(A-004). Registration succeeds into a signed-in session — nobody registers and then
immediately signs in with what they just typed.

## In scope

The one operation, its validation, and the session it returns.

## Out of scope

Email verification, password reset, seller approval, and any way to change a role
after the fact. [[INT-004]] rules all four out explicitly.

## Behaviour

### The server decides

1. **Email, password and role are all required.** Role is one of `buyer` or
   `seller`; nothing else is accepted.
2. **An address already registered is refused** with `409` and its own code. The
   answer says the address is taken — [[INT-005]]'s non-revealing rule protects the
   *sign-in* path, not this one, because a registration form cannot avoid telling
   you an address is in use and still be usable.
3. **A password shorter than ten characters or longer than 128 is refused** with
   `400`, and the answer names the field. Length is the whole policy (A-014).
4. **The password is stored so that a copy of the database is not a copy of
   everyone's password.** A modern password hash with a per-password salt and a
   deliberate work factor. Not a general-purpose digest, salted or otherwise.
5. **The password is never returned**, by this operation or any other, in any shape.
6. **Success returns `201` with a token and the user** — the session starts here.
7. **Role is set once.** No operation in the contract changes it, and the server
   must not accept one that tries.

### The client shows

- Errors appear against the field that caused them, using `fieldErrors`, not as one
  message above the form.
- What was typed survives a rejection. [[INT-004]] is explicit that losing the form
  is the failure it minds most.
- On success the interface is already the signed-in one for that role.

## The API surface it uses

| Operation | Path |
|---|---|
| `register` | `POST /auth/register` |

## Errors

| Situation | Status | `code` |
|---|---|---|
| Missing or malformed field, or a password outside the length rule | 400 | `VALIDATION_FAILED` |
| Email already registered | 409 | `EMAIL_ALREADY_REGISTERED` |

## Traceability

| [[US-004]] acceptance criterion | Satisfied by |
|---|---|
| 1 — email, password and a role are required | Behaviour 1 |
| 2 — a registered address is refused and no second account is made | Behaviour 2 |
| 3 — told which rule the password broke | Behaviour 3, subject to concern 1 |
| 4 — signed in on success, role fixed for the life of the account | Behaviour 6 and 7 |
| 5 — the password is not recoverable from what is stored | Behaviour 4 and 5 |

## Flagged concerns

Concerns 1, 2 and 3 were found by the frontend team auditing the contract from
behind the wall, without sight of any server code.

### 1 — `fieldErrors` is optional, so criterion 3 is not guaranteed. **Blocking.**

`Error` requires only `code` and `message`. `fieldErrors` is optional and appears in
an *example*, and an example is not a promise. US-004 criterion 3 is written as a
certainty while the contract makes it best-effort. [[SPEC-006]] already relies on
the stronger reading for the cart's `400`, so a spec of ours is resting on something
the contract does not guarantee.

**Decided:** a `ValidationError` schema, written out longhand — `code`, `message`
and `fieldErrors`, all three required, `additionalProperties: false` — referenced by
the `ValidationFailed` response instead of `Error`. `Error` stays as it is, because
`401`, `403` and `404` have no field to name and must not be forced to carry one.

Written longhand for legibility and consistency, not because composition would fail.
`allOf: [Error, {required: [fieldErrors]}]` was checked against a validator and is
valid, because `fieldErrors` is already declared in `Error` — unlike
`InsufficientStockError`, where the sibling added a property the base did not
declare and `additionalProperties: false` rejected it. Recorded here so nobody
"tidies" this into an `allOf` and nobody repeats the other mistake.

*Needs a contract pull request. Both approvals.*

### 2 — The shape of `FieldError.field` is never stated. **Blocking.**

`field` is `type: string` with no pattern, no description, and one example: `price`.
Nothing says whether it is a bare property name, a JSON Pointer, or a dotted path.
The client binds that value to a form control.

This is the most valuable of the three because **it fails silently**: pick the wrong
convention and messages surface above the form instead of under the field, and no
test, type or lint notices.

**Decided:** the bare property name exactly as the request body spells it —
`password`, not `/password` and not `body.password` — stated in the description.

*Needs a contract pull request. Both approvals.*

### 3 — The `409` code is pinned by example, not by schema. **Not blocking.**

The response uses `Error`, whose `code` is a seven-value enum; only the example and
the prose say a `409` carries `EMAIL_ALREADY_REGISTERED`. The client branches on
status anyway, but chooses its message from `code`.

**Decided:** `const: EMAIL_ALREADY_REGISTERED`, matching what
`InsufficientStockError` already does. Applying the idiom in one place and not
others is worse than not having it.

*Rolls into the same contract pull request.*

### 4 — The one-way role is a limitation, not an oversight. **Accepted.**

A buyer who later wants to sell needs a second account (A-004). [[INT-004]] chose
this deliberately and asked that it be said out loud rather than discovered. It is
said here, and the register names what changes if it is answered differently.

*No decision needed.*

## How it will be proven

Server tests, called against the API with no client involved:

- A valid buyer registration returns `201`, a token, and a user whose role is
  `buyer`; the same for `seller`.
- The same address twice returns `409`, and the second attempt creates nothing.
- A nine-character password returns `400` and names `password` in `fieldErrors`.
- A role outside the two values returns `400`.
- No response anywhere contains the password or its hash.
- The stored value differs for two accounts registered with the *same* password —
  which is what proves the hash is salted, and cannot be faked by hashing alone.

Client tests cover that a rejection keeps what was typed, that a field error lands
against its field, and that success lands on the signed-in interface for the role.

## Division of work

| Team | Does |
|---|---|
| Backend | Everything under "The server decides", and the server tests. This is also the first code in the repository, so it carries the project skeleton with it. |
| Frontend | Everything under "The client shows", against the Prism mock. |
