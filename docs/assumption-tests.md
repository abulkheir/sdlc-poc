# Tests that pin the assumptions

An assumption in the register is a decision taken in the absence of a requirement.
Today it lives in a markdown file, and nothing in the running system knows it exists.

A test changes that. It cannot **confirm** an assumption — only the PO can decide
that two decimal places is right — but it can **pin** it: make the system fail
loudly the moment the assumption stops holding, instead of drifting quietly.

That changes what a contradiction costs. When the pricing slice lands and
contradicts A-001, the register tells you which four stories to revisit *and* a
named test goes red. The contradiction stops being a status in a document and
becomes a build failure.

## The tests nobody writes

Six of the sixteen below assert that something is **absent** — no lockout, no
approval step, no reservation, no pagination, no complexity rule, no revocation.
Those are the ones a normal test suite never contains, because nobody writes a test
for a feature that does not exist.

They are also the most valuable ones here. An absent behaviour is exactly what
someone adds later without realising it was a decision, and an assumption with no
test is indistinguishable from an oversight.

## The matrix

Every test below is a server test called against the API with no client involved,
unless marked *(client)*.

| # | What it pins | The test | What it does **not** prove |
|---|---|---|---|
| **A-001** | Two decimals, one currency | A price of `10.555` is refused with `400` naming `price`; `10.99` is accepted | That two decimals is the right answer |
| **A-002** | A price is above zero | `0` is refused; `0.01` is accepted | That free products should be impossible |
| **A-003** | Stock is per product | A product carries one integer `stock`; a body with a variants array is refused by `additionalProperties: false` | That variants will never be needed |
| **A-004** | One fixed role per account | A seller's token on `POST /cart/items` is `403`; a buyer's token on `POST /seller/products` is `403`; no operation accepts a role change | That nobody will want to do both |
| **A-005** | **No approval step** | A listing created by a seller appears in `GET /products` on the very next call, with no intermediate state | That moderation will never be required |
| **A-006** | Search is substring, name only | `?q=lam` matches "Desk Lamp"; `?q=LAM` matches it too; **a word that appears only in a description matches nothing** | That searching descriptions is unwanted |
| **A-007** | Hard delete, no archive | After a delete the listing is absent from `GET /products`, absent from `GET /seller/products`, and `404` by id | That nobody will need recovery |
| **A-008** | **Adding to a cart reserves nothing** | A product with stock 5: buyer A adds 5 and succeeds, then buyer B adds 5 and **also succeeds**. Both carts hold five of a thing there are five of | That this is acceptable once there is a checkout |
| **A-009** | One category per product | `categorySlug` is singular; an array is refused | That multi-category is not coming |
| **A-010** | **A token cannot be revoked** | Take a token, sign out on the client, then call `/auth/me` with that same token — it still answers `200` | That revocation will never be needed |
| **A-011** | **No pagination** | With more than 24 products seeded, `GET /products` returns every one of them | That it scales |
| **A-012** | Line totals use the current price | Add an item, change its price as the seller, re-read the cart — the total reflects the **new** price | *(confirmed — this one is settled)* |
| **A-013** | The client never reads the token *(client)* | The client works end to end with a token that is **not a JWT at all** — an opaque random string. If it functions, it provably is not reading `exp` | That a shorter session would not be better |
| **A-014** | **Length is the whole password policy** | `aaaaaaaaaa` — ten characters, no digit, no symbol, no capital — is **accepted**; nine characters is refused | That no complexity rule should ever exist |
| **A-015** | **Nothing throttles failed sign-ins** | Twenty consecutive wrong passwords, and the twenty-first answers the same `401 INVALID_CREDENTIALS` — not a lockout, not a `429` | That this survives a security review |
| **A-019** | Emails are trimmed and lowercased | Register `"  Foo@Example.TEST  "`, then sign in as `"foo@example.test"` and succeed; `user.email` comes back normalised | *(confirmed — this one is settled)* |

## Two of these are uncomfortable, and that is the point

**A-008** asserts that the system will promise the same five items to two different
buyers. [[INT-006]] worried about exactly this — *"if two buyers each put five in
their cart, have I promised ten?"* — and concluded it need not block people
collecting things, but that somebody should write down that it was not decided.

The test writes it down in a place that cannot be skimmed past.

**A-010** asserts that signing out does not actually end the session server-side.
That is true, it follows from a stateless token, and the contract says so. A test
that asserts it means nobody can later believe otherwise by accident.

Both tests will look wrong to a reviewer who has not read the register. Each one's
name should carry the assumption id, so the first question is "what is A-008" rather
than "why is this allowed".

## Naming

The assumption id goes in the test name, so a red test points straight at the
decision rather than at the line that broke:

```
A-008: adding to a cart reserves no stock, so two buyers may each hold the last five
A-014: a ten-character password with no digit, symbol or capital is accepted
A-010: a token still authenticates after the client has signed out
```

When a test with an id in its name fails, that is not a bug report. It is the
register telling you an assumption just changed, and the first thing to do is open
`assumptions/register.md` and read what else depends on it.

## What this does not do

It does not close any assumption. Fourteen of the sixteen are still `open` and only
the PO can change that.

What it does is make the fourteen **visible to the build**. An assumption with a
test is one you find out about; an assumption without one is a comment in a file
that nobody opens until it is too late.
