#!/usr/bin/env node
/**
 * Deterministic artifact linter.
 *
 * Runs in under a second, costs nothing, and catches the rot that does not need
 * judgement: missing front-matter, broken links, unregistered assumptions, and
 * derived artifacts whose source has changed since they were written.
 *
 * It deliberately does NOT look for contradictions in meaning. That needs an agent,
 * and an agent is too slow and too expensive to run on every push. This is the cheap
 * gate that runs always; the expensive one runs on artifact pull requests.
 *
 *   node tools/lint-artifacts.mjs
 *
 * Exits non-zero if anything is wrong.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';

const SCAN = ['brd', 'backlog', 'intent', 'spec', 'plan', 'assumptions'];
const TYPES = new Set(['brd', 'epic', 'story', 'intent', 'spec', 'plan', 'register']);
const DERIVED = new Set(['intent', 'spec', 'plan']);
const STATUSES = new Set(['draft', 'ready', 'approved', 'blocked', 'superseded']);
const REQUIRED = ['id', 'type', 'title', 'status', 'owner', 'created', 'updated'];
const REF_FIELDS = ['source', 'parent', 'derives_from'];

const errors = [];
const warnings = [];
const err = (f, m) => errors.push([f, m]);
const warn = (f, m) => warnings.push([f, m]);

/** Front-matter parser for the restricted subset this schema uses:
 *  `key: scalar` and `key: [a, b, c]`. No nesting, by design. */
function parse(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) return { fm: null, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { fm: null, body: text };
  const fm = {};
  for (const line of text.slice(4, end).split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    } else {
      v = v.replace(/^['"]|['"]$/g, '');
    }
    fm[k] = v;
  }
  return { fm, body: text.slice(end + 4).replace(/^\n/, '') };
}

const digest = (s) => createHash('sha256').update(s.replace(/\r\n/g, '\n').trim()).digest('hex').slice(0, 7);
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// ---- collect -------------------------------------------------------------
const docs = [];
for (const dir of SCAN) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md') || name === 'README.md') continue;
    const file = `${dir}/${name}`;
    const { fm, body } = parse(readFileSync(file, 'utf8'));
    docs.push({ file, name, fm, body });
  }
}

if (docs.length === 0) {
  console.error('No artifacts found. Are you in the repository root?');
  process.exit(1);
}

// ---- index ---------------------------------------------------------------
const byId = new Map();
const assumptionIds = new Set();

for (const d of docs) {
  if (!d.fm) { err(d.file, 'no front-matter block'); continue; }
  for (const f of REQUIRED) if (!d.fm[f]) err(d.file, `missing required field '${f}'`);
  if (d.fm.type && !TYPES.has(d.fm.type)) err(d.file, `unknown type '${d.fm.type}'`);
  if (d.fm.status && !STATUSES.has(d.fm.status)) err(d.file, `unknown status '${d.fm.status}'`);
  if (!d.fm.id) continue;
  if (byId.has(d.fm.id)) err(d.file, `duplicate id '${d.fm.id}', also in ${byId.get(d.fm.id).file}`);
  else byId.set(d.fm.id, d);

  // the register publishes the assumption ids it holds
  if (d.fm.type === 'register') {
    for (const m of d.body.matchAll(/^### (A-\d+)\b/gm)) assumptionIds.add(m[1]);
  }
}

// ---- checks --------------------------------------------------------------
const referenced = new Set();

for (const d of docs) {
  if (!d.fm || !d.fm.id) continue;

  // filename must match id, so a file is findable from a reference
  if (d.fm.type !== 'register' && basename(d.name, '.md') !== d.fm.id) {
    err(d.file, `filename does not match id '${d.fm.id}'`);
  }

  // structural references resolve
  for (const field of REF_FIELDS) {
    for (const ref of list(d.fm[field])) {
      referenced.add(ref);
      if (!byId.has(ref)) err(d.file, `${field} points at '${ref}', which does not exist`);
    }
  }

  // every assumption depended on is registered
  for (const a of list(d.fm.depends_on)) {
    referenced.add(a);
    if (!assumptionIds.has(a)) err(d.file, `depends_on '${a}' is not in the assumptions register`);
  }

  // derived artifacts declare where they came from, and whether it has moved
  if (DERIVED.has(d.fm.type)) {
    if (!d.fm.source) err(d.file, `type '${d.fm.type}' must declare a source work item`);
    if (!d.fm.source_hash) err(d.file, `type '${d.fm.type}' must declare source_hash`);
    const src = byId.get(d.fm.source);
    if (src && d.fm.source_hash) {
      const actual = digest(src.body);
      if (actual !== d.fm.source_hash) {
        err(d.file, `STALE — ${d.fm.source} has changed since this was written (${d.fm.source_hash} -> ${actual})`);
      }
    }
  }

  // a story without acceptance criteria cannot be built against or tested
  if (d.fm.type === 'story' && !/^##\s+Acceptance criteria/m.test(d.body)) {
    err(d.file, 'a story must have an "## Acceptance criteria" section');
  }

  // inline [[links]] resolve too
  for (const m of d.body.matchAll(/\[\[([A-Z]+-[\w.]+)\]\]/g)) {
    referenced.add(m[1]);
    if (!byId.has(m[1]) && !assumptionIds.has(m[1])) {
      err(d.file, `[[${m[1]}]] does not resolve to any artifact`);
    }
  }
}

// ---- contract cross-check ------------------------------------------------
// The contract is YAML, not markdown, so it carries its links as x- extensions
// rather than front-matter. A regex is enough: we only need the ids, not the tree.
const CONTRACT = 'contract/openapi.yaml';
if (existsSync(CONTRACT)) {
  const yaml = readFileSync(CONTRACT, 'utf8').replace(/\r\n/g, '\n');
  const ids = (s) => s.trim().replace(/^\[|\]$/g, '').split(',').map((x) => x.trim()).filter(Boolean);
  const covered = new Set();

  for (const m of yaml.matchAll(/^\s*x-story:\s*(.+)$/gm)) {
    for (const id of ids(m[1])) {
      covered.add(id);
      referenced.add(id);
      if (!byId.has(id)) err(CONTRACT, `x-story '${id}' is not a work item`);
    }
  }

  for (const m of yaml.matchAll(/^\s*x-assumptions:\s*(.+)$/gm)) {
    for (const id of ids(m[1])) {
      referenced.add(id);
      if (!assumptionIds.has(id)) err(CONTRACT, `x-assumptions '${id}' is not in the register`);
    }
  }

  // a story no operation claims is either frontend-only or an oversight
  for (const [id, d] of byId) {
    if (d.fm.type === 'story' && !covered.has(id)) warn(CONTRACT, `no operation carries x-story: ${id}`);
  }
}

// Disconnected from the chain in both directions. Being the newest artifact is not
// a defect — the tip always has nothing downstream yet — so only warn when it also
// came from nowhere.
for (const [id, d] of byId) {
  if (['brd', 'epic', 'register'].includes(d.fm.type)) continue;
  const upstream = ['source', 'parent', 'derives_from'].some((f) => list(d.fm[f]).length > 0);
  if (!referenced.has(id) && !upstream) {
    warn(d.file, `'${id}' is connected to nothing: it derives from nothing and nothing references it`);
  }
}

// ---- report --------------------------------------------------------------
const pad = Math.max(...docs.map((d) => d.file.length)) + 2;
for (const [f, m] of warnings) console.log(`  warn  ${f.padEnd(pad)}${m}`);
for (const [f, m] of errors) console.log(`  FAIL  ${f.padEnd(pad)}${m}`);

console.log(
  `\n${docs.length} artifacts, ${assumptionIds.size} assumptions, ` +
    `${errors.length} error${errors.length === 1 ? '' : 's'}, ` +
    `${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`
);
process.exit(errors.length ? 1 : 0);
