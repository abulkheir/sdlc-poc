# Intent: Marketplace storefront — browse, cart, and seller listings

Author: aabouelkheir (2P). Status: draft. Date: 2026-09-19.
Purpose: the rehearsal change for the AI-native SDLC proof of concept.

## Problem

We want to prove that the AI-native SDLC works in practice, end to end, before
committing a team to it. That needs a change small enough to walk through all six
stages in about a week, but real enough that the process is genuinely exercised.

The part we most need to prove is not that an agent can write code. It is that the
process can hold an agreement between **two teams who cannot see each other's work**.
A frontend team and a backend team start in parallel. The frontend discovers what it
needs before the backend exists. The backend then builds to that. Today the two
drift apart quietly and meet at an integration stage that hurts.

A small online marketplace is the vehicle. It does not exist today.

## Proposed outcome

### The product

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

### The agreement between the teams

- A single file, `contract/openapi.yaml`, is the authoritative description of every
  endpoint, request, response and error shape. It is a schema, not a set of examples.
- The frontend team authors it first, because they are the ones discovering what they
  need. They develop against a mock server driven by that same file, and their
  TypeScript types are generated from it. No mock JSON is written by hand anywhere.
- The backend team implements against the same file.
- Neither team can change the contract alone. A change is a pull request that both
  teams must approve.
- The API's emitted Swagger is compared against the contract on **every push**. Any
  difference fails the build. The only way to make it pass is a contract pull request
  that both teams have approved.

## Affected users and systems

Buyers and sellers are the only two product roles. There is no administrator, no
payment provider and no fulfilment.

Two simulated delivery teams, frontend and backend, are the process actors.

Nothing existing is affected. This is a new standalone repository built as the PoC
vehicle, and it is not deployed anywhere.

## Constraints

- **Angular 20 with Tailwind** for the web client, **NestJS with Prisma** for the API,
  **SQLite** for storage. TypeScript on both sides. One repository with `web/`, `api/`
  and `contract/` folders, so the whole artifact chain lives in a single git history.
- **The contract is OpenAPI, and it comes first.** Hand-written mock data is not
  permitted: examples cannot express nullability, numeric precision, error shapes or
  pagination, and those ambiguities are exactly what the two teams would resolve
  differently in good faith.
- **Drift is detected continuously, not at an integration stage.** A sync stage at the
  end is a big-bang integration and is the failure this whole exercise exists to
  remove.
- **Authentication is real, not simulated.** Passwords are hashed, sessions are
  token-based, and every rule about who may do what is enforced by the API. The UI
  hides what a role cannot do; the server refuses it.
- **English only.** No localization and no right-to-left support.
- The seed catalogue holds roughly 24 products across 5 categories.
- Every stage commits its artifact here — `intent.md`, `spec.md`, `contract/openapi.yaml`,
  `plan.md`, the diff and its tests, and the pull request with its review findings.
  The chain of commits is the deliverable, as much as the running application is.

## Out of scope

Checkout, payment, orders and order history, shipping, real product images beyond a
placeholder, password reset, email verification, an administrator role, seller
approval workflows, and deployment to any environment.

## Definition of done

A reviewer can, unaided:

1. Register as a seller, list a product, then register separately as a buyer, find
   that product, and add it to a cart.
2. Be refused by the API when asking for more of it than the seller holds in stock.
3. Be refused by the API when attempting to edit another seller's listing.
4. Open a pull request that changes `contract/openapi.yaml` and watch it blocked until
   both teams have approved it.
5. Watch a deliberately introduced backend change fail the build because the emitted
   Swagger no longer matches the contract.
6. Read the whole history — intent, spec, contract, plan, diff, review findings — in
   the git log of this repository.

## Open questions

1. **Which host, and who plays the second team?** Dual approval needs two real
   identities; a single author cannot satisfy a required-reviewer policy, and
   self-approval would defeat the point of the demonstration.
2. **How strict is the drift gate?** This assumes any difference at all fails the
   build. The alternative is to fail only on breaking changes and report the rest,
   which is friendlier but lets documentation quietly rot.
