#!/usr/bin/env node
/**
 * PreToolUse hook. Blocks a Bash command that reaches into the other team's code.
 *
 * Permission rules cover the file tools — Read, Edit, Write, Glob, Grep — but they
 * do not cover a shell command, and `cat ../api/src/main.ts` would sail straight
 * through them. This is the deterministic layer behind the advisory one, exactly as
 * the playbook prescribes.
 *
 * Usage, from .claude/settings.local.json:
 *   node .claude/hooks/no-cross-team.mjs api
 *
 * Honest about its limits: this reads the command text. It stops the accident and
 * the casual shortcut, which is what it is for. It is not a sandbox, and a session
 * determined to get around it could. A real boundary is an OS-level sandbox with the
 * other directory genuinely unreadable.
 */

const forbidden = process.argv[2];
if (!forbidden) process.exit(0);

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let command = '';
try {
  command = JSON.parse(raw)?.tool_input?.command ?? '';
} catch {
  process.exit(0); // not something we understand; not our business to block it
}

// Matches the directory as a path segment: api/, ./api/, ../api/, "api/x", /api/x.
// Does not match words that merely contain it, such as `rapid` or `apiKey`.
const pattern = new RegExp('(^|[\\s"\'=(/])[.]{0,2}/?' + forbidden + '/', 'i');

if (pattern.test(command)) {
  console.error(
    `Blocked: this session may not read or touch ${forbidden}/.\n\n` +
      'You are one team in a two-team simulation and the other side is not yours to\n' +
      'look at. The only channel between you is contract/openapi.yaml.\n\n' +
      'If you need something the contract does not give you, that is not a reason to\n' +
      'go and read their code — it is a sign the contract is wrong. Open a pull\n' +
      'request against it. Both the backend lead and the PO must approve.'
  );
  process.exit(2); // exit 2 blocks the action and sends the message to Claude
}
