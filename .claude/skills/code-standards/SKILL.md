---
name: code-standards
description: The code standards both teams write to. Use whenever writing or reviewing any TypeScript in this repository — a component, a service, a controller, a DTO, a test, a script — or when setting up a project's compiler and linter configuration.
---

# Code standards

These apply to both stacks. Stack-specific idioms live in each team's `CLAUDE.md`;
what is here holds on either side of the wall.

## The compiler is the first reviewer

Every project turns these on. A rule the compiler enforces never needs a human to
remember it.

```jsonc
{
  "strict": true,
  "noUncheckedIndexedAccess": true,   // arr[0] is T | undefined, because it is
  "exactOptionalPropertyTypes": true, // "absent" and "present but undefined" differ
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "forceConsistentCasingInFileNames": true
}
```

`strict` alone is not enough. The four below it are the ones that catch the bugs
people actually write, and `noUncheckedIndexedAccess` is the one most projects turn
off the first time it complains — do not.

## Types

- **`unknown`, never `any`.** If a value's shape is genuinely unknown, narrow it.
  `any` does not describe the value; it switches off the question.
- **No type assertions without a reason on the line above.** `as` is a claim the
  compiler cannot check, so the comment says who checked it and how.
- **No non-null assertions (`!`).** If it cannot be null, type it so. If it can,
  handle it. `!` is `as` with fewer characters.
- **Types crossing the boundary are generated, never written.** See the
  `contract-first` skill.
- **Prefer a union of literals to an enum, and a discriminated union to a bag of
  optional fields.** If two fields are always present together and absent together,
  they are one variant, not two optionals.

## Naming

- Files are `kebab-case`. One exported thing per file, and the file is named after
  it: `register-page.ts`, `password.service.ts`, `apply-field-errors.ts`.
- Types and classes are `PascalCase`; everything else is `camelCase`; only true
  compile-time constants are `SCREAMING_SNAKE`.
- **Names say what a thing is, not what it is made of.** `AuthStore`, not
  `AuthStateManagerService`. No `Helper`, `Util`, `Manager`, `Handler` or `Data` in
  a name — each of those means the author had not decided what the thing was.
- Booleans read as a claim: `isSignedIn`, `hasStock`, `canEdit`. Never `flag`,
  never a negative name like `notReady` — negatives double up at the call site.
- A name that needs a comment to explain it is the wrong name.

## Errors

- **Never swallow one.** An empty `catch`, or one that only logs and continues, is
  a decision to carry on with a broken assumption. Catch to *handle*, to *translate*
  into this layer's error type, or to *add context* and rethrow — otherwise do not
  catch.
- **Catch narrowly.** Wrap the one call that can fail, not the whole function.
- **Never put internal detail in a message a person will see.** No stack, no query,
  no identifier the caller should not already hold. The detail goes to the log.
- **An error crossing the API boundary has a `code` from the contract.** Client code
  branches on `code`, never on the text of `message` — the text is written for a
  person and will be reworded.

## Shape of the code

- **A function does one thing and its name says which.** If the name needs "and",
  it is two functions.
- **Guard clauses over nesting.** Return early on the cases that do not apply, so
  the body reads as the case that does. Past three levels of indentation, extract.
- **No logic in templates or in controllers.** A template renders prepared state; a
  controller validates, delegates and maps a result. Decisions live where they can
  be tested without a framework.
- **No magic values.** A number or string that means something gets a name, in the
  file that owns the rule — and if the contract already states it, it comes from the
  generated types instead.
- **Dead code is deleted, not commented out.** Git remembers; a commented block only
  makes the next reader wonder whether it matters.

## Comments

Comment the **why**, never the what. The code already says what it does; if it does
not, rename things until it does.

Worth a comment: a decision that looks wrong and is not, a workaround with the
reason and the condition for removing it, a `// SAFETY:` line above every `as`, and
a reference to the assumption or contract rule a piece of logic implements
(`// A-019: normalised on write and on lookup`).

Not worth a comment: anything a reader could get from the line itself.

## Async

- `await` what you start, or say in a comment why you are not. A floating promise
  is an error nobody will see.
- No `async` on a function that never awaits.
- Sequential `await`s in a loop are sequential on purpose or they are a bug — if the
  calls are independent, say so with `Promise.all`.

## Commits

One logical change per commit. The subject says what changed in the imperative
("Reject a zero price", not "Fixed bug"), and the body says **why** — the reason is
the part a reader cannot reconstruct from the diff.

A commit that says "fix lint" or "address review comments" has thrown away the only
information it had to offer.

## Formatting is not a discussion

Prettier decides, the linter enforces, CI fails on a difference. Nobody reviews a
space. If a formatting choice is being argued about in a pull request, the
configuration is missing and that is the thing to fix.
