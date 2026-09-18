# Business requirements — release plan

The BRD is **not finished**, and that is deliberate. Teams are expected to start
while sections are still missing, exactly as they do in real projects. What is
different here is that every decision taken in the absence of a requirement is
recorded in `assumptions/register.md` rather than lost in someone's head.

| Version | Lands | Contains |
|---|---|---|
| `BRD-0.1.md` | Sprint 1 (now) | Context, actors, catalogue, cart, seller listings, stock — some sections partial. |
| `BRD-0.2.md` | Sprint 2 | Pricing and currency. Currently **entirely absent**, and several assumptions already depend on guesses about it. |
| `BRD-0.3.md` | Sprint 3 | Non-functional requirements: performance, accessibility, audit. |

Change requests from the client arrive as new work items in `backlog/` that supersede
or amend existing ones. They are not edits to a BRD slice already released.
