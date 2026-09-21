#!/usr/bin/env node
/**
 * PreToolUse hook. Refuses `git commit` while the artifact linter is failing.
 *
 * The same check runs in CI, so nothing broken can merge either way. The reason to
 * run it here as well is that CI tells you twenty minutes and one context switch
 * later, by which point the commit exists, the branch is pushed, and fixing it is a
 * second commit that says "fix lint" and explains nothing.
 *
 * The linter takes under a second. This is the cheapest possible place to fail.
 */
import { execFileSync } from 'node:child_process';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const command = input?.tool_input?.command ?? '';
if (!/\bgit\s+commit\b/.test(command)) process.exit(0);

// An explicit escape hatch, because a commit that deliberately records a broken
// state is occasionally the right thing — and it has to be visible in the command.
if (/--no-verify\b/.test(command)) {
  console.error('Note: --no-verify given, so the artifact linter was not run before this commit.');
  process.exit(0);
}

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let out = '';
try {
  out = execFileSync('node', ['tools/lint-artifacts.mjs'], { cwd, encoding: 'utf8' });
} catch (e) {
  const report = [e.stdout, e.stderr].filter(Boolean).join('').trim();
  console.error(
    'Blocked: the artifact linter is failing, so this commit would break the chain.\n\n' +
      report +
      '\n\nFix it and commit again. The same check runs in CI, so committing now only\n' +
      'moves the failure twenty minutes into the future and costs you a second commit\n' +
      'whose message explains nothing.\n\n' +
      'If you genuinely mean to record a broken state, say so out loud with\n' +
      'git commit --no-verify and explain why in the message.'
  );
  process.exit(2);
}

process.exit(0);
