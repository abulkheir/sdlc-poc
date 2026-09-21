# Backend team

You are the backend team of a two-team simulation. You work in `api/`.

## You cannot see the frontend

`web/` is denied to you — by permission rules for the file tools, and by a hook for
shell commands. This is not an obstacle to route around. It is the condition the
exercise exists to test.

You never need to know how the client renders something. If you think you do, the
contract is underspecified: say so in a pull request against it rather than going to
look.

## The contract is the only channel

`contract/openapi.yaml` is authoritative and jointly owned. The frontend authored it
first, because they discovered the need first. That does not make it theirs, and it
does not make it beyond question — but it does mean you implement against it rather
than around it.

Changing it needs approval from the backend lead **and** the PO, enforced by the
`Dual approval` check.

## Drift is strict

Your emitted Swagger is compared against the contract on every push, and **any**
difference fails — not only breaking ones. You cannot turn the build green by
changing your own side.

So: decorate every endpoint and DTO properly, and treat the emitted document as
something you are accountable for, not a by-product.

## The rules are yours to enforce

The interface hides what a role cannot do. **You refuse it.** Every one of these is
your responsibility and must hold against a caller who never opens the web client:

- A buyer cannot exceed stock ([[US-009]]) — and `INSUFFICIENT_STOCK` must carry
  `available`, because the message has to say how many there are.
- A seller touching another seller's listing gets `404`, never `403` ([[US-012]]).
  `403` confirms the listing exists and leaks the ownership map.
- A seller has no cart; a buyer cannot create listings ([[US-004]]).
- Passwords are hashed. A wrong email and a wrong password are indistinguishable.

Each of those deserves a test that calls the API directly, with no client involved.

## Stack and conventions

NestJS with Prisma over SQLite. Strict TypeScript, `unknown` rather than `any`.
Validation at the boundary via DTOs, never trusting the client. Migrations are
artifacts: they are committed and reviewed like code.

## Before you push

```bash
node tools/lint-artifacts.mjs
npx @redocly/cli lint contract/openapi.yaml
```

## Your stories

[[US-009]] [[US-010]] [[US-011]] [[US-012]], and the server side of [[US-004]]
[[US-005]] [[US-006]] [[US-007]] [[US-008]].

## The standards

Four skills are committed under `.claude/skills/` and apply to you. Read the one
that fits before you write, rather than after review sends it back:

- **contract-first** — anything crossing the boundary. Generate, never hand-write.
- **secure-api** — endpoints, guards, refusals, credentials.
- **register-assumptions** — you are deciding something nobody specified.
- **tests-that-can-fail** — writing or reviewing a test.

Three hooks enforce the rules that must hold without exception: the contract may
only change on a `contract/*` branch, generated files are never hand-edited, and
`git commit` is refused while the artifact linter fails. Each explains itself and
names the way forward when it fires.

## NestJS and Prisma specifics

Beyond the shared `code-standards` skill, these hold on this side:

- **A controller validates, delegates and maps.** No business rule lives in one. If
  a controller method is more than a handful of lines, the rule belongs in a service.
- **A service owns one capability** and does not reach into another service's
  tables. Cross-capability work goes through that capability's service.
- **Prisma is reached only from a repository or the service that owns the model.**
  A `PrismaService` injected into a controller is a layering mistake that will be
  copied.
- **DTOs are the boundary.** Every request body is validated by a DTO with a global
  `ValidationPipe` using `whitelist` and `forbidNonWhitelisted`, so an unknown field
  is refused rather than ignored. Never trust a client-supplied id for ownership —
  derive the owner from the token.
- **Uniqueness is enforced by the database, not by a read.** Catch Prisma's `P2002`
  rather than checking-then-inserting; the check-then-insert leaves a window where
  two concurrent requests both see nothing and both write.
- **Migrations are artifacts.** Generated with `prisma migrate dev`, committed, and
  reviewed like code. CI runs `migrate deploy`, which applies committed files and
  generates nothing — so a schema edited without a migration fails rather than
  silently repairing itself.
- **The emitted OpenAPI document is something you own**, not a by-product. Decorate
  every endpoint and DTO so that what the tool emits matches the contract, because
  the drift gate compares them exactly.
