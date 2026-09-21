---
name: secure-api
description: Apply the security rules this project has already decided. Use whenever creating or changing an endpoint, a guard, an error response, an authentication or authorization path, anything that stores or returns a credential, or any client code that renders a refusal.
---

# The security rules already decided

These are not general advice. Each was decided for this product, for a reason
recorded in a story, a spec or the register. Changing one is a decision, not a
refactor.

## The server refuses. The interface only hides.

A hidden button is a courtesy, not a control. Every rule below must hold against a
caller who has never opened the web client, and every one of them needs a test that
calls the API directly with no client involved.

If the client is the only thing preventing something, it is not prevented.

## Never reveal what you are refusing

**Sign-in.** A wrong email and a wrong password answer **identically** — same
status, same code, same words, and nothing in the timing that separates them.
Otherwise anyone with a list of addresses can discover which ones have accounts
here. That is a leak even though nothing was stolen.

The client must not soften this from its side either: no second message, no hint,
no "check your email address". Doing so undoes the rule from the other end.

**Another owner's resource.** Editing or deleting a listing that belongs to another
seller answers `404`, never `403`. A `403` confirms the thing exists, which leaks
the ownership map. Absent and forbidden must be indistinguishable.

**Registration is the exception, and deliberately so.** A taken email address is
told plainly, because a registration form cannot avoid saying so and still be
usable. The non-revealing rule protects sign-in, not this.

## Credentials

- Hash with a modern password hash — a per-password salt and a deliberate work
  factor. Not a general-purpose digest, salted or otherwise.
- Never return a password or its hash, from any operation, in any shape.
- Prove the salt: two accounts registered with the **same** password must store
  **different** values. Add the two assertions that stop the test passing against
  an implementation that stores random bytes — verify the password against both
  stored values, and check neither contains the password as a substring.

## Roles

A role is fixed at registration and no operation changes it. The server must reject
an attempt to change one even though the contract offers no way to ask.

Which role may call which operation comes from `x-roles` in the contract, never from
a list written into a guard. A role name as a literal in client or server code is a
copy of the contract that will drift.

## Validation is at the boundary and belongs to the server

Validate the request body and query against the contract's schema. Reject unknown
fields. The client may validate the rules the contract publishes so the person is
told while they are still typing — but it must never pre-empt a rule the server
owns. Stock is the example: the client shows the refusal well, it does not try to
prevent the request.

## Errors say enough and no more

`message` is safe to show to a person and contains no internal detail — no stack,
no query, no identifier the caller should not already have. Anything a developer
needs goes to the log, not the response.

## Before you push

Ask, for each rule above that your change touches: is there a test that fails if
somebody removes this? The rules most likely to drift back are the ones that look
like unhelpful error messages, because the next person will try to improve them.
