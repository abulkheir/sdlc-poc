---
id: SPEC-006
type: spec
title: Add a product to the cart
status: draft
owner: po
source: US-006
source_hash: ea7a0ad
derives_from: [INT-006]
depends_on: [A-004, A-008, A-012]
touches: [contract:/cart/items, contract:/cart]
created: 2026-09-19
updated: 2026-09-19
---

# SPEC-006 — Add a product to the cart

> Written against [[US-006]] and [[INT-006]]. **Status is `draft`, not `ready`**:
> concern 1 below cannot be closed without a change to the contract, and a contract
> change needs the backend lead and the PO to approve it. This spec should not be
> planned against until that happens.

## Summary

A signed-in buyer puts a product aside for later. Adding the same product again
raises its quantity rather than creating a second line. A seller cannot do this at
all, and the refusal comes from the API rather than from a hidden button. The stock
ceiling from [[US-009]] applies here, on the server.

## In scope

Adding one product to the signed-in buyer's cart, and the cart that comes back.

## Out of scope

Changing a quantity or removing a line ([[US-007]]), the cart surviving a sign-out
([[US-008]]), and anything resembling a purchase.

## Behaviour

### The server decides

1. **Only a buyer may add.** An unauthenticated caller gets `401`. A caller
   authenticated as a seller gets `403`. This holds against a caller who has never
   opened the web client (A-004).
2. **Unknown product is `404`.**
3. **Quantity accumulates.** If the product is already in the cart, the requested
   quantity is added to what is there. One line per product, never two.
4. **The ceiling applies to the resulting total, not to the request.** A cart
   holding 3 of a product with 5 in stock accepts a request for 2 and refuses a
   request for 3. Neither [[US-006]] nor [[US-009]] says this in isolation — it
   falls out of reading them together, and it is the most likely place for the two
   teams to diverge, so it is stated here explicitly.
5. **A refusal changes nothing.** On `409` the cart is exactly as it was. No partial
   add, no clamping to the maximum available. [[US-009]] requires the cart be
   unchanged, and silently giving someone fewer than they asked for is a surprise
   the originator explicitly did not want.
6. **`INSUFFICIENT_STOCK` carries `available`**, because the interface has to say how
   many there are ([[US-009]]).
7. **Stock is not reserved** (A-008). Two buyers may each hold the last five in
   their carts. This is accepted for now and is the originator's own worry in
   [[INT-006]]; see concern 2.

### The client shows

- The add control appears only for a signed-in buyer. A visitor pressing it is sent
  to sign in; a seller never sees it.
- On success the cart count reflects the new total.
- On `409` the buyer is told how many are available, using `available` from the
  response rather than anything the client guessed.
- The client does not pre-check stock to avoid a refusal. It may disable the control
  when `inStock` is false, but the authority is the server's answer, not the
  client's arithmetic.

## The API surface it uses

Both already in the contract. Neither is changed by this spec, subject to concern 1.

| Operation | Path | Purpose |
|---|---|---|
| `addCartItem` | `POST /cart/items` | The add itself. Returns the whole cart. |
| `getCart` | `GET /cart` | Restoring the count on load. |

The response is the entire `Cart`, not the added line. The client never assembles
its own view of the cart from a sequence of responses — it renders what the server
last returned.

## Errors

| Situation | Status | `code` | Note |
|---|---|---|---|
| Not signed in | 401 | `UNAUTHENTICATED` | |
| Signed in as a seller | 403 | `FORBIDDEN` | |
| No such product | 404 | `NOT_FOUND` | |
| Quantity not a positive integer | 400 | `VALIDATION_FAILED` | `fieldErrors` names `quantity` |
| Resulting total exceeds stock | 409 | `INSUFFICIENT_STOCK` | `available` required |

## Traceability

| [[US-006]] acceptance criterion | Satisfied by |
|---|---|
| 1 — adding puts it in the cart at quantity one | Behaviour 3, with `quantity` defaulting to 1 in the contract |
| 2 — adding again raises the quantity | Behaviour 3 |
| 3 — a seller is refused, by the API | Behaviour 1 |
| 4 — a visitor is sent to sign in | Behaviour 1, plus the client rule |

## Flagged concerns

These are the points an analyst would escalate. They are listed first on purpose.

### 1 — The contract does not say how `lineTotal` is computed. **Blocking.**

`Cart.items[].lineTotal` and `Cart.total` are required, and nothing states whether
they use the price as it was when the product was added, or the price as it is now.

The two answers behave differently the moment a seller edits a price, and BRD 0.1
§4 explicitly defers exactly this. The frontend and backend will each pick one, both
reasonably, and the carts will disagree.

**Proposed:** compute from the current price at read time — the cart is a list of
intentions, not a quotation, and there is no purchase in this release for a frozen
price to protect. Registered as **A-012**.

**This requires a change to `contract/openapi.yaml`** to state it in the `lineTotal`
description. That is a contract change, so it needs the backend lead and the PO to
approve. Until it merges, this spec stays `draft`.

*Decision needed from: PO, with the backend lead.*

### 2 — Stock can be over-promised. **Accepted, not resolved.**

A-008 says adding does not reserve. With five in stock, two buyers can each hold
five. The originator raised this themselves in [[INT-006]] and concluded, correctly,
that it need not block people collecting things.

It becomes real the moment a purchase exists. It is recorded rather than solved, and
the register names what changes if it is answered differently: carts gain expiry,
stock gains a reserved column, and the race for the last item becomes a case.

*No decision needed now. Revisit when checkout is specified.*

### 3 — A product deleted while it sits in a cart. **Not blocking here.**

BRD 0.1 §4 defers it. It does not arise while adding, so this spec is unaffected —
but it does block [[US-008]], where a cart is read back after time has passed. The
PO should answer it before US-008 is specified, not while it is being built.

*Decision needed from: PO, before [[US-008]].*

## How it will be proven

Server tests, called against the API with no client involved, because that is what
[[US-006]] criterion 3 actually asks for:

- A buyer adds an unheld product and gets a cart with one line at quantity one.
- The same buyer adds it again and gets one line at quantity two, not two lines.
- A buyer holding 3 of a 5-stock product is accepted for 2 and refused for 3, and
  the refusal carries `available: 5` and leaves the cart at 3.
- A seller's token is refused with `403`.
- No token is refused with `401`.
- An unknown product id is refused with `404`.

Client tests cover that the control is absent for a seller, that a visitor is routed
to sign-in, and that the count and the refusal message both come from the server's
response rather than from local state.

## Division of work

| Team | Does |
|---|---|
| Backend | Everything under "The server decides", and the server tests. |
| Frontend | Everything under "The client shows", against the Prism mock, with types generated from the contract. |

Neither team needs anything from the other that the contract does not already
contain — except concern 1, which is precisely why it is a contract change and not a
conversation.
