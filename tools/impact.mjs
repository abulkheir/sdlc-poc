/**
 * Can a change to an intent, a spec or an assumption reach the contract?
 *
 * Pure functions over file text, no network and no disk, so the rule is testable. The
 * answer comes from links the repository already records, not from judgement:
 *
 *   spec        -> reaches the contract if its `touches` names a `contract:` path
 *   intent      -> if a spec that touches the contract derives from it
 *   assumption  -> if a contract operation lists it in `x-assumptions`, or a spec
 *                  that touches the contract (or an intent behind one) depends on it
 *
 * A change that cannot reach the contract does not need the other teams to look at
 * it. One that can gets the same approval rule as the contract itself.
 *
 * One exception that does not depend on reach: a change to an assumption's STATUS.
 * Moving an assumption between open, confirmed, contradicted and retired is a
 * decision about what the teams may rely on, so it is never a typo fix, and it gets
 * the rule whether or not anything links to that assumption yet.
 *
 * Why the head graph is enough, and the base version is checked as well. Someone
 * could try to slip past by deleting the link in the same change, for example
 * removing `touches` from a spec while editing it. So the changed file's own base
 * version counts too. Severing a link in any OTHER file is itself a change to a
 * file that is gated: the contract's `x-assumptions` is under `contract/`, and a
 * spec's `touches` is under `spec/`, which this rule covers.
 */
import { parse, list } from './frontmatter.mjs';

const norm = (s) => String(s ?? '').replace(/\r\n/g, '\n');
const touchesContract = (fm) => list(fm?.touches).some((t) => String(t).startsWith('contract:'));

/** Everything that can reach the contract, from a set of files {path -> text}. */
export function contractGraph(files) {
  const specs = new Set();
  const intents = new Set();
  const assumptions = new Set();

  const intentDeps = new Map();
  for (const [path, raw] of files) {
    if (!path.endsWith('.md')) continue;
    const { fm } = parse(raw);
    if (!fm?.id) continue;
    if (path.startsWith('spec/') && touchesContract(fm)) {
      specs.add(fm.id);
      for (const i of list(fm.derives_from)) if (i.startsWith('INT-')) intents.add(i);
      for (const a of list(fm.depends_on)) assumptions.add(a);
    }
    if (path.startsWith('intent/')) intentDeps.set(fm.id, list(fm.depends_on));
  }
  for (const i of intents) for (const a of intentDeps.get(i) ?? []) assumptions.add(a);

  const yaml = norm(files.get('contract/openapi.yaml'));
  for (const m of yaml.matchAll(/^\s*x-assumptions:\s*\[?([^\]\n]*)\]?/gm)) {
    for (const a of m[1].split(',').map((s) => s.trim()).filter(Boolean)) assumptions.add(a);
  }

  return { specs, intents, assumptions };
}

/** The register's entries by id, so a change can be pinned to the assumptions it touched. */
export function registerEntries(text) {
  const entries = new Map();
  const parts = norm(text).split(/^(?=### A-\d+)/m);
  for (const part of parts) {
    const m = part.match(/^### (A-\d+)/);
    if (m) entries.set(m[1], part.trim());
  }
  return entries;
}

const statusOf = (block) => block?.match(/^\s*-\s*\*\*Status:\*\*\s*(\S+)/m)?.[1] ?? null;

/**
 * Status changes between two versions of the register, as [{ id, from, to }].
 *
 * Counts: an existing entry whose status differs; an entry that disappears (its
 * status goes with it); a new entry that is born in any status but `open`, because
 * writing "confirmed" straight into a new entry is a status decision with no review;
 * and a change to the register's own front-matter status.
 */
export function statusChanges(baseText, headText) {
  const before = registerEntries(baseText);
  const after = registerEntries(headText);
  const out = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const from = statusOf(before.get(id));
    const to = statusOf(after.get(id));
    if (from === to) continue;
    if (from === null && to === 'open') continue; // a new, undecided assumption
    out.push({ id, from: from ?? '(new)', to: to ?? '(removed)' });
  }
  const fmFrom = baseText ? parse(baseText).fm?.status : null;
  const fmTo = headText ? parse(headText).fm?.status : null;
  if (fmFrom && fmTo && fmFrom !== fmTo) out.push({ id: 'the register itself', from: fmFrom, to: fmTo });
  return out;
}

/** Ids of assumptions added, removed or edited between two versions of the register. */
export function changedAssumptions(baseText, headText) {
  const before = registerEntries(baseText);
  const after = registerEntries(headText);
  const changed = new Set();
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    if (before.get(id) !== after.get(id)) changed.add(id);
  }
  return changed;
}

/**
 * Does this one changed file reach the contract? Returns a reason when it does and
 * null when it cannot. `baseText` / `headText` are null when the file did not exist
 * on that side, which is how an added or deleted file looks.
 *
 * A file this does not understand is treated as reaching the contract: failing
 * closed costs an extra review, guessing wrong costs an unreviewed contract change.
 */
export function reachesContract({ path, baseText, headText, graph }) {
  const sides = [baseText, headText].filter((t) => t !== null && t !== undefined);
  const fms = sides.map((t) => parse(t).fm);

  if (path === 'assumptions/register.md') {
    const moves = statusChanges(baseText, headText);
    if (moves.length) {
      return `changes status: ${moves.map((m) => `${m.id} ${m.from} -> ${m.to}`).join(', ')}`;
    }
    const hit = [...changedAssumptions(baseText, headText)].filter((id) => graph.assumptions.has(id));
    return hit.length ? `changes ${hit.join(', ')}, which the contract rests on` : null;
  }

  if (!path.endsWith('.md') || fms.some((fm) => !fm?.id)) {
    return 'is not an artifact this rule understands, so it is assumed to matter';
  }

  if (path.startsWith('spec/')) {
    const id = fms[0].id;
    return fms.some(touchesContract) || graph.specs.has(id) ? `${id} touches the contract` : null;
  }

  if (path.startsWith('intent/')) {
    const id = fms[0].id;
    return graph.intents.has(id) ? `${id} is behind a spec that touches the contract` : null;
  }

  return 'is not an artifact this rule understands, so it is assumed to matter';
}

/** Run the check over every changed file under the impact paths. */
export function affectingFiles({ changed, headFiles, baseOf }) {
  const graph = contractGraph(headFiles);
  const affecting = [];
  const unaffected = [];
  for (const path of changed) {
    const reason = reachesContract({
      path,
      baseText: baseOf(path),
      headText: headFiles.has(path) ? headFiles.get(path) : null,
      graph,
    });
    (reason ? affecting : unaffected).push(reason ? { path, reason } : { path });
  }
  return { affecting, unaffected };
}
