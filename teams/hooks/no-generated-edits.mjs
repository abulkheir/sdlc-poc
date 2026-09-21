#!/usr/bin/env node
/**
 * PreToolUse hook. Refuses to hand-edit a file that is generated from the contract.
 *
 * Generated types and the role map exist so that the client and the contract cannot
 * disagree. Edit one by hand and they can — and nothing notices, because the file
 * still type-checks, still compiles, and still looks generated. The next `npm run
 * gen:types` silently throws the edit away, or worse, nobody runs it and the edit
 * becomes the de facto contract for that one field.
 *
 * This is the same failure as writing mock data by hand: a second source of truth
 * that agrees on the day it is written.
 */

// Paths under here are produced by a generator and are never authored.
const GENERATED = [
  'web/src/app/core/api/contract.d.ts',
  'web/src/app/core/api/operation-roles.ts',
  'api/src/openapi/generated',
  'api/prisma/generated',
];

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
const normalised = subject.split('\\').join('/');

const hit = GENERATED.find((p) => normalised.includes(p));
if (!hit) process.exit(0);

// Regenerating is the whole point; only hand-editing is blocked.
const command = ti.command ?? '';
if (command && /\b(gen:types|openapi-typescript|prisma generate|npm run gen|cat|head|tail|grep|rg|git diff|git show)\b/.test(command)) {
  process.exit(0);
}

console.error(
  `Blocked: ${hit} is generated from the contract and is never edited by hand.\n\n` +
    'Whatever you were about to change there belongs in one of two places:\n\n' +
    '  If the shape is wrong, the contract is wrong. Open a pull request against\n' +
    '  contract/openapi.yaml — on a contract/* branch — and regenerate afterwards.\n\n' +
    '  If the shape is right and you wanted to add behaviour, write it in a file of\n' +
    '  your own that imports from this one. Generated output stays untouched.\n\n' +
    'Editing it here would create a second source of truth that agrees with the\n' +
    'contract only until the next regeneration, and nothing would report the drift.'
);
process.exit(2);
