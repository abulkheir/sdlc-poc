---
id: BRD-0.1
type: brd
title: Marketplace — business requirements, slice 1
status: approved
owner: po
created: 2026-09-19
updated: 2026-09-19
---

# Marketplace — business requirements, slice 1

> **Incomplete by design.** Sections marked TBD have not been written yet and will
> arrive in a later slice. Teams start now. Decisions taken in the meantime belong in
> [`assumptions/register.md`](../assumptions/register.md), not in a comment.

## 1. Context

Small independent sellers have no cheap way to put a handful of products in front of
buyers. They want a shared storefront where they keep control of their own listings
and cannot interfere with anyone else's.

## 2. Actors

| Actor | Description |
|---|---|
| **Visitor** | Not signed in. May look, may not act. |
| **Buyer** | Signed in. Browses and fills a cart. |
| **Seller** | Signed in. Manages their own listings only. |

There is no administrator in this release. Whether one is needed is TBD.

## 3. Catalogue

- Every product has a name, a description, a price, a category, and a stock count.
- Products are grouped into a small fixed set of categories.
- Visitors and signed-in users see the same catalogue.
- Buyers can search products by name and filter by category.

**TBD:** whether a product may belong to more than one category. Whether a product
can be hidden by its seller without being deleted.

## 4. Cart

- A buyer collects products in a cart, sets a quantity for each, and removes them.
- The cart shows a total.
- The cart belongs to the buyer's account, not to the browser, and is still there on
  the next sign-in.
- A buyer cannot put more of a product in the cart than the seller holds in stock.

**TBD:** what happens to a cart when a product in it is deleted by its seller, or its
price changes, or its stock drops below the quantity already in the cart. This matters
and has not been decided.

## 5. Seller listings

- A seller creates a listing with a name, description, price, category and stock.
- A seller sees, edits and deletes their own listings.
- A seller has no visibility of, and no ability to affect, another seller's listings.
  This is a hard rule, not a UI convenience.

**TBD:** whether a new listing is visible immediately or requires approval. No
approval workflow is described anywhere in this slice.

## 6. Stock

- Stock is a whole number held against a product.
- A buyer cannot request more than is in stock.

**TBD:** whether stock is reserved when added to a cart, or only checked at the point
of purchase. Since there is no purchase in this release, the question is deferred —
but the answer changes the cart's behaviour.

## 7. Pricing and currency

**Entirely TBD. Arrives in slice 0.2.**

Nothing has been stated about currency, decimal precision, tax, or how a price is
displayed. The teams cannot wait for this, so they will assume — and those
assumptions are registered.

## 8. Purchase and fulfilment

Out of scope for this product. There is no checkout, no payment and no delivery.

## 9. Non-functional requirements

**TBD. Arrives in slice 0.3.** Nothing has been stated about performance,
accessibility, browser support, audit logging or data retention.
