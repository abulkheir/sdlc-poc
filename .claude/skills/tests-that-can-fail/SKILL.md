---
name: tests-that-can-fail
description: Write tests that could actually fail. Use whenever adding or changing a test, deciding how a rule will be proven, writing the "How it will be proven" section of a spec, or reviewing someone else's tests.
---

# Tests that can fail

A test that cannot fail is worse than no test: it costs the same to run and it buys
false confidence. Before writing one, answer this — **what implementation would make
this test fail?** If the answer is "none I can think of", do not write it.

## Test the rule, not its shadow

The rule is what the story asked for. The shadow is something that happens to be
true when the rule holds.

| Shadow | Rule |
|---|---|
| The response has a `passwordHash` field | Two accounts with the **same** password store **different** values |
| The refusal returns `401` | A wrong password and an unknown email return **byte-identical** responses |
| The cart total is a number | An empty cart totals exactly zero and is accepted by the schema |
| The endpoint returns `404` | A listing belonging to **another** seller is indistinguishable from one that does not exist |

The shadow passes against implementations the rule forbids. That is the whole
difference.

## Add the assertions that close the loophole

Most rules can be satisfied by an implementation that is obviously wrong. Find that
implementation and rule it out explicitly.

The salted-hash test is the model: asserting two hashes differ also passes against
an implementation that stores random bytes and can never authenticate anyone. So it
needs two more assertions — that the password verifies against **both** stored
values, and that neither contains the password as a substring. Those are not
padding; they are what makes the first assertion mean anything.

## Prove refusals, not just successes

For every rule in a spec's Behaviour section there should be a test that the refusal
happens. And where the refusal must not reveal anything, assert the *sameness* of
the two refusals directly rather than eyeballing them, because that is the rule most
likely to be quietly "improved" later.

## Server rules are proven against the server

Where a spec says the API enforces something, the test calls the API with no client
involved. A component test that never reaches the server proves the button is
hidden, which is a different and much weaker claim.

## Bug fixes start with a failing test

Reproduce the bug as a test. Run it. Confirm it fails **for the reason you expect**
— a test that fails for the wrong reason will pass for the wrong reason too. Commit
it, then fix the code without touching the test. A test that existed before the fix,
and that was not edited during it, is the proof the bug is gone.

## Never weaken a test to make it pass

If a test fails, fix the code. Deleting an assertion, loosening a matcher, or
skipping a case converts a real signal into a green tick. If a test is genuinely
wrong, say so in the pull request and change it as its own reviewed decision.

## Run headless, and make failure the exit code

Tests run in CI with no watcher and no browser window, and a failure exits non-zero.
A suite that needs a human to read the output is not a gate.
