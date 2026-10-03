#!/usr/bin/env node
/**
 * Requires the right approvals before a protected path may merge: the author's own
 * team never approves its own change, and every other team must.
 *
 *   frontend writes  ->  backend lead and PO approve
 *   backend writes   ->  frontend lead and PO approve
 *   po writes        ->  frontend lead and backend lead approve
 *
 * GitHub's CODEOWNERS cannot express this. When a line lists several owners, an
 * approval from any one of them satisfies the rule, only the last matching rule
 * applies to a file, and nothing depends on who the author is. This check reads who
 * actually approved, works out which team the author is on, and fails unless every
 * other team is represented. The decision itself lives in approval-rules.mjs, where
 * it is tested without GitHub.
 *
 * Configuration lives in .github/dual-approval.json so the rule is reviewable data
 * rather than buried logic.
 *
 * Teams are named either by "users" (a personal account has no GitHub teams) or by
 * "team" (an organization). Only the latter needs a token with read:org.
 */
import { readFileSync } from 'node:fs';
import { evaluate, protectedFiles } from './approval-rules.mjs';

const CONFIG = '.github/dual-approval.json';
const api = 'https://api.github.com';

const repo = process.env.GITHUB_REPOSITORY;
const prNumber = process.env.PR_NUMBER;

function fail(message) {
  console.error(`\n  BLOCKED  ${message}\n`);
  process.exit(1);
}

if (!repo || !prNumber) fail('GITHUB_REPOSITORY and PR_NUMBER must both be set.');

const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
const { org, watch, teams } = config;
if (!teams || typeof teams !== 'object') fail(`${CONFIG} has no "teams" object.`);

// Resolving a GitHub team needs read:org, which the default GITHUB_TOKEN does not
// have. Naming people directly needs nothing extra — so only insist on the stronger
// token when a team is actually involved.
const needsOrgRead = Object.values(teams).some((t) => t.team);
const token = process.env.ORG_READ_TOKEN || (needsOrgRead ? '' : process.env.GITHUB_TOKEN);

if (!token) {
  fail(
    needsOrgRead
      ? 'ORG_READ_TOKEN is not set, and this configuration resolves a GitHub team, ' +
          'which needs a token with read:org — the default GITHUB_TOKEN cannot. On a ' +
          'personal account, name the people directly with "users" instead of ' +
          '"team" and no extra token is needed. Failing closed.'
      : 'No token is available — neither GITHUB_TOKEN nor ORG_READ_TOKEN is set. ' +
          'The workflow passes GITHUB_TOKEN, so this usually means the check is being ' +
          'run outside it. Failing closed rather than waving the change through.'
  );
}

async function gh(path, { allow404 = false } = {}) {
  const res = await fetch(`${api}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'dual-approval-check',
    },
  });
  if (res.status === 404 && allow404) return null;
  if (!res.ok) fail(`GitHub returned ${res.status} for ${path}: ${await res.text()}`);
  return res.json();
}

async function paged(path) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

// --- does this pull request touch anything the rule protects? ---------------
const files = await paged(`/repos/${repo}/pulls/${prNumber}/files`);
const touched = protectedFiles(files.map((f) => f.filename), watch);

if (touched.length === 0) {
  console.log(`No protected paths touched (watching: ${watch.join(', ')}). Nothing to enforce.`);
  process.exit(0);
}

console.log(`Protected paths touched:\n${touched.map((f) => `  ${f}`).join('\n')}\n`);

// --- who wrote it, and who has approved, as of right now? -------------------
const pr = await gh(`/repos/${repo}/pulls/${prNumber}`);
const author = pr.user.login;

// A reviewer may approve, then request changes, then approve again. Only their
// latest non-comment review counts.
const reviews = await paged(`/repos/${repo}/pulls/${prNumber}/reviews`);
const latest = new Map();
for (const r of reviews) {
  if (r.state === 'COMMENTED') continue;
  latest.set(r.user.login.toLowerCase(), r.state);
}

const approvers = [...latest.entries()].filter(([, state]) => state === 'APPROVED').map(([login]) => login);

console.log(`Author: ${author.toLowerCase()}`);
console.log(`Approvers: ${approvers.length ? approvers.join(', ') : '(none)'}\n`);

// --- membership, for both ways of naming a team -----------------------------
const orgMembership = new Map();
async function isMember(login, name) {
  const t = teams[name];
  if (t.users) return t.users.some((u) => u.toLowerCase() === login.toLowerCase());
  const key = `${name}/${login}`;
  if (!orgMembership.has(key)) {
    const m = await gh(`/orgs/${org}/teams/${t.team}/memberships/${login}`, { allow404: true });
    orgMembership.set(key, m !== null && m.state === 'active');
  }
  return orgMembership.get(key);
}

// A team named by a GitHub team slug cannot be matched against the author by name.
async function resolveAuthorTeam(login) {
  for (const name of Object.keys(teams)) if (await isMember(login, name)) return name;
  return null;
}

const outcome = await evaluate({ teams, author, approvers, isMember, resolveAuthorTeam });

if (outcome.reason) fail(outcome.reason);

console.log(`The author is on the ${outcome.authorTeam} team, so every other team must approve:`);
const missing = [];
for (const r of outcome.results) {
  if (r.approvedBy.length) console.log(`  ok       ${r.label} — approved by ${r.approvedBy.join(', ')}`);
  else {
    console.log(`  MISSING  ${r.label}`);
    missing.push(r.label);
  }
}

if (!outcome.ok) {
  fail(
    `This change touches a protected path and still needs approval from: ${missing.join(' and ')}.\n` +
      '           Nobody may change the agreement, or the rules that guard it, for\n' +
      '           their own side alone. The PR\n' +
      "           author's own approval never counts towards this."
  );
}

console.log('\nEvery required team has approved.');
