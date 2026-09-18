# Intent: Marketplace storefront — browse, cart, and seller listings

Author: aabouelkheir (2P). Status: draft. Date: 2026-09-18.
Purpose: the rehearsal change for the AI-native SDLC proof of concept.

## Problem

We want to prove that the AI-native SDLC works in practice, end to end, before
committing a team to it. That needs a change small enough to walk through all six
stages in about a week, but real enough that the process is genuinely exercised:
distinct user roles, forms and validation, and at least one business rule the server
has to enforce rather than the UI merely suggesting.

A small online marketplace is the vehicle. It does not exist today.

## Proposed outcome

A web application with an API behind it, where:

**Anyone, signed in or not**

- browses a product catalogue, filters it by category, searches it by name, and opens
  a product's detail page.

**A person registering**

- chooses at registration whether they are a **buyer** or a **seller**. The choice is
  fixed for that account.

**A signed-in buyer**

- adds products to a cart, changes quantities, removes items, and sees the total.
- cannot add more of a product than the seller has in stock.
- finds the cart as they left it after signing out and back in, because it belongs to
  their account rather than to the browser.

**A signed-in seller**

- sees the products they have listed.
- creates, edits and removes their own listings — each with a name, description,
  price, category and stock count.
- cannot see or modify another seller's listings. The API enforces this, not the UI.

## Affected users and systems

Buyers and sellers are the only two roles. There is no administrator, no payment
provider and no fulfilment.

Nothing existing is affected. This is a new standalone repository built as the PoC
vehicle, and it is not deployed anywhere.

## Constraints

- **Angular 20 with Tailwind** for the web client, **NestJS with Prisma** for the API,
  **SQLite** for storage. TypeScript on both sides. One repository with `web/` and
  `api/` folders, so the whole artifact chain lives in a single git history.
- **Authentication is real, not simulated.** Passwords are hashed, sessions are
  token-based, and every rule about who may do what is enforced by the API. The UI
  hides what a role cannot do; the server refuses it. A demo that fakes this is not
  worth showing.
- **English only.** No localization and no right-to-left support.
- The seed catalogue holds roughly 24 products across 5 categories.
- Every stage commits its artifact here — `intent.md`, `spec.md`, `plan.md`, the diff
  and its tests, and the pull request with its review findings. The chain of commits
  is the deliverable, as much as the running application is.

## Out of scope

Checkout, payment, orders and order history, shipping, real product images beyond a
placeholder, password reset, email verification, an administrator role, seller
approval workflows, and deployment to any environment.

## Open questions

1. **Does stock earn its place?** The "cannot add more than the seller has in stock"
   rule is in because it is a genuine business rule the server must enforce, which
   gives the review and governance stages something real to check. It costs little.
   Say so if you would rather drop it.
2. **What does "done" look like for the demo?** Proposed: a reviewer registers as a
   seller, lists a product, registers separately as a buyer, finds that product, adds
   it to a cart, and is refused when asking for more than exists — with every stage's
   artifact visible in the git history.
