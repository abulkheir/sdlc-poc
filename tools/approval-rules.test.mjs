import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate, validateTeams, protectedFiles } from './approval-rules.mjs';

// The real configuration, so a test fails if the file is edited into a different rule.
const { teams, watch } = JSON.parse(readFileSync('.github/dual-approval.json', 'utf8'));

const FE = 'abulkheir';
const BE = 'abyulkheir';
const PO = 'abulkheirPO';

const isMember = async (login, name) =>
  teams[name].users.some((u) => u.toLowerCase() === login.toLowerCase());

const run = (author, approvers) => evaluate({ teams, author, approvers, isMember });
const waiting = (r) => r.results.filter((x) => x.approvedBy.length === 0).map((x) => x.team).sort();

test('frontend change: needs backend and PO', async () => {
  const r = await run(FE, []);
  assert.equal(r.ok, false);
  assert.deepEqual(waiting(r), ['backend', 'po']);
});

test('frontend change: backend alone is not enough', async () => {
  const r = await run(FE, [BE]);
  assert.equal(r.ok, false);
  assert.deepEqual(waiting(r), ['po']);
});

test('frontend change: backend and PO pass', async () => {
  assert.equal((await run(FE, [BE, PO])).ok, true);
});

test('frontend change: the PO and the author do not satisfy backend', async () => {
  const r = await run(FE, [FE, PO]);
  assert.equal(r.ok, false);
  assert.deepEqual(waiting(r), ['backend']);
});

test('backend change: needs frontend and PO', async () => {
  const r = await run(BE, []);
  assert.deepEqual(waiting(r), ['frontend', 'po']);
});

test('backend change: its own lead is not enough, which is the old rule', async () => {
  const r = await run(BE, [BE, PO]);
  assert.equal(r.ok, false);
  assert.deepEqual(waiting(r), ['frontend']);
});

test('backend change: frontend and PO pass', async () => {
  assert.equal((await run(BE, [FE, PO])).ok, true);
});

test('PO change: needs both leads', async () => {
  const r = await run(PO, [FE]);
  assert.equal(r.ok, false);
  assert.deepEqual(waiting(r), ['backend']);
  assert.equal((await run(PO, [FE, BE])).ok, true);
});

test('an unclassified author is refused, whoever approves', async () => {
  const r = await run('stranger', [FE, BE, PO]);
  assert.equal(r.ok, false);
  assert.match(r.reason, /none of the configured teams/);
});

test('account names are matched without regard to case', async () => {
  assert.equal((await run('ABULKHEIR', ['ABYULKHEIR', 'abulkheirpo'])).ok, true);
});

test('an account listed under two teams makes the configuration invalid', async () => {
  const bad = { a: { users: ['x'] }, b: { users: ['X'] } };
  assert.match(validateTeams(bad), /both/);
  const r = await evaluate({ teams: bad, author: 'x', approvers: [], isMember });
  assert.equal(r.ok, false);
});

test('a team that names nobody makes the configuration invalid', () => {
  assert.match(validateTeams({ a: { users: ['x'] }, b: {} }), /neither/);
});

test('a configuration with one team cannot demand a second opinion', () => {
  assert.match(validateTeams({ a: { users: ['x'] } }), /two teams/);
});

test('an author who sits in two GitHub teams cannot approve their own change', async () => {
  // Only reachable with organization teams, where membership may overlap.
  const overlapping = async (login, name) => login === 'dual' || (name === 'po' && login === 'p');
  const r = await evaluate({
    teams: { frontend: { team: 'fe' }, backend: { team: 'be' }, po: { team: 'po' } },
    author: 'dual',
    approvers: ['dual', 'p'],
    isMember: overlapping,
    resolveAuthorTeam: async () => 'frontend',
  });
  assert.equal(r.ok, false);
  assert.deepEqual(waiting(r), ['backend']);
});

test('the real configuration protects the contract and the files that hold the rule', () => {
  for (const f of [
    'contract/openapi.yaml',
    'tools/approval-rules.mjs',
    'tools/check-dual-approval.mjs',
    '.github/dual-approval.json',
    '.github/workflows/dual-approval.yml',
    'teams/hooks/no-cross-team.mjs',
  ]) {
    assert.deepEqual(protectedFiles([f], watch), [f], `${f} should be protected`);
  }
});

test('ordinary artifacts are not caught by the rule', () => {
  assert.deepEqual(protectedFiles(['backlog/US-001.md', 'spec/SPEC-006.md', 'README.md'], watch), []);
});
