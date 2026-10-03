/** Front-matter parser for the restricted subset this schema uses:
 *  `key: scalar` and `key: [a, b, c]`. No nesting, by design. */
export function parse(raw) {
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

export const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
