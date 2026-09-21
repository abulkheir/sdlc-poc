#!/usr/bin/env node
/**
 * PreToolUse hook. Refuses to change the contract except on a `contract/*` branch.
 *
 * The contract belongs to both teams, and a change to it needs both approvals. That
 * rule is enforced on the pull request — but only if the change arrives as its own
 * pull request. Slipped into a feature branch alongside twenty other files, it is
 * reviewed by whoever happens to own that branch, and the dual-approval check never
 * sees a reason to run.
 *
 * So: contract changes live on their own branch, which makes them their own pull
 * request, which is what makes the gate reachable at all.
 */
import { execFileSync } from 'node:child_process';

const WATCH = 'contract/openapi.yaml';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const ti = input?.tool_input ?? {};
const subject = [ti.file_path, ti.notebook_path, ti.command].filter(Boolean).join(' ');
if (!subject.includes(WATCH)) process.exit(0);

// A read is fine. Only a change is gated.
const command = ti.command ?? '';
const isRead = command && /^\s*(cat|less|head|tail|grep|rg|wc|git diff|git show|npx)\b/.test(command);
if (!ti.file_path && !ti.notebook_path && isRead) process.exit(0);

let branch = '';
try {
  branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
    encoding: 'utf8',
  }).trim();
} catch {
  process.exit(0); // not a git checkout; nothing to enforce
}

if (branch.startsWith('contract/')) process.exit(0);

console.error(
  `Blocked: ${WATCH} may only be changed on a branch named contract/*.\n\n` +
    `You are on "${branch}".\n\n` +
    'The contract belongs to both teams and a change needs the backend lead AND the\n' +
    'PO to approve. That only happens if the change arrives as its own pull request.\n' +
    'Mixed into a feature branch, it gets reviewed by whoever owns that branch and\n' +
    'the dual-approval gate never has a reason to run.\n\n' +
    'Do this instead:\n' +
    '  git checkout main && git pull\n' +
    '  git checkout -b contract/<what-you-are-changing>\n\n' +
    'Then make the change, run both gates, and open the pull request:\n' +
    '  npx @redocly/cli lint contract/openapi.yaml\n' +
    '  node tools/lint-artifacts.mjs'
);
process.exit(2);
