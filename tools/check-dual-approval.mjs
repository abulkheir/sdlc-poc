#!/usr/bin/env node
/**
 * Requires an approval from every named team before a protected path may merge.
 *
 * GitHub's CODEOWNERS cannot express this. When a line lists several owners, an
 * approval from any one of them satisfies the rule, and only the last matching rule
 * applies to a file — so a second line for the same path adds nothing. This check
 * closes that gap: it reads who actually approved, resolves each approver's team
 * membership, and fails unless every required team is represented.
 *
 * Configuration lives in .github/dual-approval.json so the rule is reviewable data
 * rather than buried logic.
 *
 * Needs a token with read:org — the default GITHUB_TOKEN cannot read team
 * membership. Store a fine-grained PAT as the ORG_READ_TOKEN secret.
 */
import { readFileSync } from 'node:fs';

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
const { org, watch, require: required } = config;

// Resolving a GitHub team needs read:org, which the default GITHUB_TOKEN does not
// have. Naming people directly needs nothing extra — so only insist on the stronger
// token when a team is actually involved. A personal account has no teams at all.
const needsOrgRead = required.some((r) => r.team);
const token = process.env.ORG_READ_TOKEN || (needsOrgRead ? '' : process.env.GITHUB_TOKEN);

if (!token) {
  fail(
    'ORG_READ_TOKEN is not set, and this configuration resolves a GitHub team, which ' +
      'needs a token with read:org — the default GITHUB_TOKEN cannot. Failing closed ' +
      'rather than waving the change through. On a personal account, name the ' +
      'approvers directly with "users" instead of "team" and no extra token is needed.'
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
const touched = files.map((f) => f.filename).filter((name) => watch.some((p) => name.startsWith(p)));

if (touched.length === 0) {
  console.log(`No protected paths touched (watching: ${watch.join(', ')}). Nothing to enforce.`);
  process.exit(0);
}

console.log(`Protected paths touched:\n${touched.map((f) => `  ${f}`).join('\n')}\n`);

// --- who has approved, as of right now? -------------------------------------
const pr = await gh(`/repos/${repo}/pulls/${prNumber}`);
const author = pr.user.login.toLowerCase();

// A reviewer may approve, then request changes, then approve again. Only their
// latest non-comment review counts.
const reviews = await paged(`/repos/${repo}/pulls/${prNumber}/reviews`);
const latest = new Map();
for (const r of reviews) {
  if (r.state === 'COMMENTED') continue;
  latest.set(r.user.login.toLowerCase(), r.state);
}

const approvers = [...latest.entries()]
  .filter(([login, state]) => state === 'APPROVED' && login !== author)
  .map(([login]) => login);

console.log(`Author: ${author}`);
console.log(`Approvers: ${approvers.length ? approvers.join(', ') : '(none)'}\n`);

// --- is each required team represented? -------------------------------------
const membership = new Map();
async function inTeam(login, team) {
  const key = `${team}/${login}`;
  if (!membership.has(key)) {
    const m = await gh(`/orgs/${org}/teams/${team}/memberships/${login}`, { allow404: true });
    membership.set(key, m !== null && m.state === 'active');
  }
  return membership.get(key);
}

const missing = [];
for (const req of required) {
  const { team, users, label } = req;
  let who = [];
  let target;

  if (team) {
    // Organization account: resolve membership of a GitHub team.
    target = `@${org}/${team}`;
    for (const login of approvers) if (await inTeam(login, team)) who.push(login);
  } else if (Array.isArray(users) && users.length) {
    // Personal account: teams do not exist, so name the people directly.
    const allowed = users.map((u) => u.toLowerCase());
    target = users.map((u) => `@${u}`).join(' or ');
    who = approvers.filter((login) => allowed.includes(login));
  } else {
    fail(`The entry "${label}" in ${CONFIG} names neither a team nor a list of users.`);
  }

  if (who.length) console.log(`  ok       ${label} (${target}) — approved by ${who.join(', ')}`);
  else {
    console.log(`  MISSING  ${label} (${target})`);
    missing.push(`${label} (${target})`);
  }
}

if (missing.length) {
  fail(
    `This change touches the contract and still needs approval from: ${missing.join(' and ')}.\n` +
      '           Neither team may change the agreement alone. The PR author\'s own\n' +
      '           approval never counts towards this.'
  );
}

console.log('\nEvery required team has approved.');
