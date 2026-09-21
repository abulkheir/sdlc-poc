---
name: register-assumptions
description: Register a decision taken in the absence of a requirement. Use whenever you are about to choose something the BRD, the story, the spec or the contract does not state — a format, a limit, a default, a storage choice, a behaviour on an edge case — or when you catch yourself writing "presumably", "for now", or "we can change this later".
---

# Register the assumption

Everyone builds on unknowns. The problem is not that we assume — it is that the
assumption becomes code, and the code forgets it was ever an assumption. Six months
later a requirement lands and nobody can say what it breaks.

## When this applies

You are about to decide something nobody asked for. Signals:

- The requirement is silent and you need *an* answer to continue.
- You are choosing a default, a limit, a format or a precision.
- You are deciding what happens in a case nobody described.
- You wrote "for now", "presumably", or "we can revisit".

If a requirement **does** state it, you are not assuming — you are implementing.
Do not register that; it is noise.

## Write it in `assumptions/register.md`

```
### A-0NN — One sentence, in the present tense, that could be true or false

- **Status:** open
- **Raised by:** <team or artifact> · <date>
- **Owner:** po
- **Because:** the gap that forced the decision — which section is silent, and why
  you could not wait for it.
- **Depends:** the work items, contract paths and files that rest on this
- **If wrong:** what has to change, concretely, if the answer comes back different
```

Take the next free number. **Do not renumber an existing one** — other artifacts
reference them, and numbers have already collided once when two sessions worked in
parallel.

## The two fields everyone skips

`Depends` and `If wrong` are the whole point. Without them this is a diary.

- **Depends** is what makes impact analysis a query instead of a meeting. When a
  requirement finally arrives, this field answers "what do I have to revisit".
- **If wrong** is the cost of reversal, written while it is still cheap to think
  about. Be concrete: name the schema, the column, the screen.

## Then reference it

Add the id to `depends_on` in the front-matter of any artifact that rests on it, and
to `x-assumptions` on any contract operation whose shape it decides. The linter
fails if a `depends_on` names an assumption that is not in the register — you cannot
depend on something unwritten.

## Status

`open` — nobody has confirmed it. The normal state.
`confirmed` — a BRD slice or the PO agreed. Record *what* confirmed it; a merged
pull request is evidence, an opinion is not.
`contradicted` — a later requirement disagrees. Everything in `Depends` must be
revisited, and that is now a visible piece of work rather than a surprise.
`retired` — no longer relevant.

## What this is not

Not a risk register: a risk might happen, an assumption has already been built on.

Not a decision log: a decision log says "we chose X". This says "we chose X **in the
absence of a requirement**, and here is what falls over if that was wrong."
