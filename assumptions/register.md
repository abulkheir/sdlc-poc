---
id: REG-001
type: register
title: Assumptions register
status: approved
owner: po
created: 2026-09-19
updated: 2026-09-19
---

# Assumptions register

Every decision taken in the absence of a requirement lives here. An assumption is not
a note — it has an owner, a status, and a list of what breaks if it turns out wrong.

When a BRD slice lands, the question is not "does this look right" but **"which of
these does it confirm, and which does it contradict"**.

**Status values:** `open` (nobody has confirmed it) · `confirmed` (a BRD slice or the
PO has agreed it) · `contradicted` (a later requirement disagrees — everything in
Depends must be revisited) · `retired` (no longer relevant).

---

### A-001 — Prices have two decimal places and there is a single implied currency

- **Status:** open
- **Raised by:** frontend · 2026-09-19
- **Owner:** po
- **Because:** BRD 0.1 §7 Pricing and currency is entirely TBD, but a price has to be
  stored, validated and rendered today.
- **Depends:** US-001, US-003, US-010, US-011
- **If wrong:** the storage type, the validation rule, the contract's numeric format
  and every price display change together. Currencies with three decimal places, or
  more than one currency, would break all four.

### A-002 — A price must be greater than zero

- **Status:** open
- **Raised by:** backend · 2026-09-19
- **Owner:** po
- **Because:** nothing states whether a free product is allowed.
- **Depends:** US-010, US-011
- **If wrong:** the validation rule relaxes and the catalogue needs a way to render
  "free" rather than a zero price.

### A-003 — Stock is held against a product, not against a variant

- **Status:** open
- **Raised by:** backend · 2026-09-19
- **Owner:** po
- **Because:** BRD 0.1 §6 says stock is "a whole number held against a product" and
  never mentions sizes, colours or any other variant.
- **Depends:** US-009, US-010
- **If wrong:** the data model gains a level, and the stock rule moves down to it.

### A-004 — An account is a buyer or a seller, never both, and the role is fixed

- **Status:** open
- **Raised by:** frontend · 2026-09-19
- **Owner:** po
- **Because:** BRD 0.1 §2 lists them as separate actors but never says whether one
  person can be both, or change.
- **Depends:** US-004, US-005, US-006, US-010
- **If wrong:** role becomes a set rather than a value, and every authorization check
  and every navigation decision changes shape.

### A-005 — A new listing is live immediately; there is no approval step

- **Status:** open
- **Raised by:** backend · 2026-09-19
- **Owner:** po
- **Because:** BRD 0.1 §5 explicitly marks approval as TBD, and US-010 requires the
  listing to appear "immediately".
- **Depends:** US-010
- **If wrong:** a listing gains a state machine, the catalogue query gains a filter,
  and somebody has to do the approving — which implies an actor that does not exist.

### A-006 — Search is a case-insensitive substring match on the product name only

- **Status:** open
- **Raised by:** frontend · 2026-09-19
- **Owner:** po
- **Because:** US-002 says "matches what I typed" without saying how.
- **Depends:** US-002
- **If wrong:** searching descriptions, or ranking results, changes the contract's
  query parameters and the backend's query.

### A-007 — Deleting a listing removes it outright; there is no archive

- **Status:** open
- **Raised by:** backend · 2026-09-19
- **Owner:** po
- **Because:** US-011 says only that it no longer appears in the catalogue.
- **Depends:** US-011
- **If wrong:** deletion becomes a state change, and everything that reads the
  catalogue has to exclude the archived rows.

### A-008 — Adding to a cart does not reserve stock

- **Status:** open
- **Raised by:** backend · 2026-09-19
- **Owner:** po
- **Because:** BRD 0.1 §6 defers this explicitly, but the cart has to behave somehow.
  Stock is checked at the moment of adding and not held.
- **Depends:** US-006, US-009
- **If wrong:** carts gain expiry, stock gains a reserved column, and two buyers
  racing for the last item becomes a case that has to be handled.

### A-009 — A product belongs to exactly one category

- **Status:** open
- **Raised by:** frontend · 2026-09-19
- **Owner:** po
- **Because:** BRD 0.1 §3 marks multiple categories as TBD.
- **Depends:** US-001, US-002, US-010
- **If wrong:** the filter becomes a many-to-many join and the product form changes
  from a select to a multi-select.

### A-010 — Sessions are stateless bearer tokens and signing out is client-side

- **Status:** open
- **Raised by:** backend · 2026-09-19
- **Owner:** po
- **Because:** US-005 requires that signing out stops protected operations working,
  but nothing states whether a session must be revocable server-side. A stateless
  token cannot be revoked before it expires.
- **Depends:** US-004, US-005
- **If wrong:** the API gains a session store, a logout endpoint and revocation
  checks on every request, and the contract gains an operation it does not have.

### A-011 — The catalogue is returned unpaginated

- **Status:** open
- **Raised by:** frontend · 2026-09-19
- **Owner:** po
- **Because:** the seed catalogue holds roughly two dozen products and nothing in
  BRD 0.1 mentions paging. Non-functional requirements arrive in slice 0.3.
- **Depends:** US-001, US-002
- **If wrong:** `/products` gains paging parameters and a wrapper object, the
  frontend gains paging controls, and every response typed from the array changes.
