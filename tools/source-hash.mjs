#!/usr/bin/env node
/**
 * Prints the source_hash for an artifact, to paste into the front-matter of anything
 * derived from it.
 *
 *   node tools/source-hash.mjs backlog/US-006.md
 *
 * The hash covers the body only, not the front-matter, so touching `updated` on the
 * source does not falsely mark every derived artifact stale. Line endings are
 * normalised first, so the value is the same on Windows and CI.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/source-hash.mjs <path-to-artifact.md>');
  process.exit(1);
}

const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const end = text.startsWith('---\n') ? text.indexOf('\n---', 3) : -1;
const body = end === -1 ? text : text.slice(end + 4).replace(/^\n/, '');

console.log(createHash('sha256').update(body.trim()).digest('hex').slice(0, 7));
