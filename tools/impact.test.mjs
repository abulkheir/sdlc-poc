import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { contractGraph, changedAssumptions, reachesContract, affectingFiles } from './impact.mjs';

// The real repository, so these fail if the links the rule reads are ever removed.
const real = new Map();
for (const dir of ['spec', 'intent']) {
  for (const f of readdirSync(dir)) if (f.endsWith('.md')) real.set(`${dir}/${f}`, readFileSync(`${dir}/${f}`, 'utf8'));
}
real.set('contract/openapi.yaml', readFileSync('contract/openapi.yaml', 'utf8'));
real.set('assumptions/register.md', readFileSync('assumptions/register.md', 'utf8'));
const graph = contractGraph(real);

const spec = (id, touches, extra = '') =>
  `---\nid: ${id}\ntype: spec\ntitle: t\nstatus: draft\nowner: po\nsource: US-1\nsource_hash: x\n${touches}${extra}created: 2026-01-01\nupdated: 2026-01-01\n---\n\nbody\n`;
const intent = (id) =>
  `---\nid: ${id}\ntype: intent\ntitle: t\nstatus: draft\nowner: po\nsource: US-1\nsource_hash: x\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\nbody\n`;
const reg = (...blocks) => `---\nid: REG-001\ntype: register\ntitle: t\n---\n\n${blocks.join('\n')}\n`;
const entry = (id, text = 'because') => `### ${id} — a thing\n\n- **Because:** ${text}\n`;

test('the real graph reaches the specs, intents and assumptions the contract depends on', () => {
  assert.ok(graph.specs.has('SPEC-006'));
  assert.ok(graph.intents.has('INT-006'));
  // x-assumptions on the contract itself
  assert.ok(graph.assumptions.has('A-009'));
  // reached only through a spec that touches the contract
  for (const a of ['A-012', 'A-013', 'A-014', 'A-015']) assert.ok(graph.assumptions.has(a), a);
});

test('every assumption in the real register can reach the contract today', () => {
  const ids = [...readFileSync('assumptions/register.md', 'utf8').matchAll(/^### (A-\d+)/gm)].map((m) => m[1]);
  assert.equal(ids.length, 15);
  for (const id of ids) assert.ok(graph.assumptions.has(id), `${id} is not linked to the contract`);
});

test('a spec that touches the contract reaches it; one that does not, does not', () => {
  const g = contractGraph(new Map());
  assert.ok(reachesContract({ path: 'spec/SPEC-9.md', baseText: null, headText: spec('SPEC-9', 'touches: [contract:/x]\n'), graph: g }));
  assert.equal(reachesContract({ path: 'spec/SPEC-9.md', baseText: null, headText: spec('SPEC-9', 'touches: [code:web/x]\n'), graph: g }), null);
  assert.equal(reachesContract({ path: 'spec/SPEC-9.md', baseText: null, headText: spec('SPEC-9', ''), graph: g }), null);
});

test('cutting the touches line while editing the spec does not slip past', () => {
  const g = contractGraph(new Map());
  const base = spec('SPEC-9', 'touches: [contract:/x]\n');
  const head = spec('SPEC-9', '');
  assert.ok(reachesContract({ path: 'spec/SPEC-9.md', baseText: base, headText: head, graph: g }));
});

test('deleting a spec that touched the contract is caught from its base version', () => {
  const g = contractGraph(new Map());
  const base = spec('SPEC-9', 'touches: [contract:/x]\n');
  assert.ok(reachesContract({ path: 'spec/SPEC-9.md', baseText: base, headText: null, graph: g }));
});

test('an intent is caught only when a contract-touching spec derives from it', () => {
  const files = new Map([
    ['spec/SPEC-1.md', spec('SPEC-1', 'touches: [contract:/x]\n', 'derives_from: [INT-1]\n')],
    ['spec/SPEC-2.md', spec('SPEC-2', '', 'derives_from: [INT-2]\n')],
  ]);
  const g = contractGraph(files);
  assert.ok(reachesContract({ path: 'intent/INT-1.md', baseText: intent('INT-1'), headText: intent('INT-1'), graph: g }));
  assert.equal(reachesContract({ path: 'intent/INT-2.md', baseText: intent('INT-2'), headText: intent('INT-2'), graph: g }), null);
});

test('an assumption reached only through an intent behind a contract spec still counts', () => {
  const files = new Map([
    ['spec/SPEC-1.md', spec('SPEC-1', 'touches: [contract:/x]\n', 'derives_from: [INT-1]\n')],
    ['intent/INT-1.md', intent('INT-1').replace('created:', 'depends_on: [A-050]\ncreated:')],
  ]);
  assert.ok(contractGraph(files).assumptions.has('A-050'));
});

test('register: editing an assumption the contract rests on is caught', () => {
  const base = reg(entry('A-001'), entry('A-099'));
  const head = reg(entry('A-001', 'changed'), entry('A-099'));
  const g = { specs: new Set(), intents: new Set(), assumptions: new Set(['A-001']) };
  const reason = reachesContract({ path: 'assumptions/register.md', baseText: base, headText: head, graph: g });
  assert.match(reason, /A-001/);
});

test('register: editing an assumption nothing rests on is not caught', () => {
  const base = reg(entry('A-001'), entry('A-099'));
  const head = reg(entry('A-001'), entry('A-099', 'changed'));
  const g = { specs: new Set(), intents: new Set(), assumptions: new Set(['A-001']) };
  assert.equal(reachesContract({ path: 'assumptions/register.md', baseText: base, headText: head, graph: g }), null);
});

test('register: a front-matter-only change is not caught', () => {
  const base = reg(entry('A-001'));
  const head = base.replace('title: t', 'title: renamed');
  const g = { specs: new Set(), intents: new Set(), assumptions: new Set(['A-001']) };
  assert.equal(reachesContract({ path: 'assumptions/register.md', baseText: base, headText: head, graph: g }), null);
});

test('register: adding a new assumption is caught once a spec in the same change depends on it', () => {
  const files = new Map([['spec/SPEC-1.md', spec('SPEC-1', 'touches: [contract:/x]\n', 'depends_on: [A-016]\n')]]);
  const g = contractGraph(files);
  const base = reg(entry('A-001'));
  const head = reg(entry('A-001'), entry('A-016'));
  assert.ok(reachesContract({ path: 'assumptions/register.md', baseText: base, headText: head, graph: g }));
});

test('register: removing an assumption the contract rests on is caught', () => {
  const g = { specs: new Set(), intents: new Set(), assumptions: new Set(['A-001']) };
  assert.ok(reachesContract({ path: 'assumptions/register.md', baseText: reg(entry('A-001')), headText: reg(), graph: g }));
});

test('changedAssumptions names exactly the entries that differ', () => {
  const base = reg(entry('A-001'), entry('A-002'), entry('A-003'));
  const head = reg(entry('A-001'), entry('A-002', 'edited'), entry('A-004'));
  assert.deepEqual([...changedAssumptions(base, head)].sort(), ['A-002', 'A-003', 'A-004']);
});

test('line endings do not make an untouched assumption look changed', () => {
  const base = reg(entry('A-001'), entry('A-002'));
  assert.equal(changedAssumptions(base, base.replace(/\n/g, '\r\n')).size, 0);
});

test('a file the rule does not understand fails closed', () => {
  const g = contractGraph(new Map());
  assert.ok(reachesContract({ path: 'spec/notes.txt', baseText: null, headText: 'hello', graph: g }));
  assert.ok(reachesContract({ path: 'spec/SPEC-9.md', baseText: null, headText: 'no front-matter', graph: g }));
  assert.ok(reachesContract({ path: 'assumptions/other.md', baseText: null, headText: reg(), graph: g }));
});

test('affectingFiles splits a change set and reports a reason for each hit', () => {
  const headFiles = new Map([
    ['spec/SPEC-1.md', spec('SPEC-1', 'touches: [contract:/x]\n')],
    ['spec/SPEC-2.md', spec('SPEC-2', '')],
  ]);
  const { affecting, unaffected } = affectingFiles({
    changed: ['spec/SPEC-1.md', 'spec/SPEC-2.md'],
    headFiles,
    baseOf: (p) => headFiles.get(p) ?? null,
  });
  assert.deepEqual(affecting.map((f) => f.path), ['spec/SPEC-1.md']);
  assert.deepEqual(unaffected.map((f) => f.path), ['spec/SPEC-2.md']);
  assert.match(affecting[0].reason, /SPEC-1/);
});
