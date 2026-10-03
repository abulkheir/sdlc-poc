/**
 * Who must approve a change to a protected path. Pure functions, no network, so the
 * rule can be tested without GitHub.
 *
 * The rule: the author's own team never approves its own change. Every OTHER team
 * must. With frontend, backend and po configured that gives exactly:
 *
 *   frontend writes  ->  backend lead and PO approve
 *   backend writes   ->  frontend lead and PO approve
 *   po writes        ->  frontend lead and backend lead approve
 *
 * An author who belongs to no configured team is refused outright. Guessing a team
 * for them would mean guessing who may approve them, and failing closed is cheaper
 * than a contract change nobody was entitled to wave through.
 */

const lower = (s) => String(s).toLowerCase();

/** Reject a configuration that cannot give an unambiguous answer. */
export function validateTeams(teams) {
  const names = Object.keys(teams ?? {});
  if (names.length < 2) return 'at least two teams must be configured';

  const owner = new Map();
  for (const name of names) {
    const { users, team } = teams[name];
    if (!team && !(Array.isArray(users) && users.length)) {
      return `team "${name}" names neither a GitHub team nor a list of users`;
    }
    for (const u of users ?? []) {
      const key = lower(u);
      if (owner.has(key)) {
        return `"${u}" is listed under both "${owner.get(key)}" and "${name}"; ` +
          'an account must belong to exactly one team or its own approval could ' +
          'never be told apart from the other team\'s';
      }
      owner.set(key, name);
    }
  }
  return null;
}

/**
 * Which configured team does this author belong to? Matches named users only;
 * a GitHub-team entry is resolved by the caller, which has the network.
 */
export function teamOfAuthor(teams, author) {
  const a = lower(author);
  for (const [name, t] of Object.entries(teams)) {
    if ((t.users ?? []).some((u) => lower(u) === a)) return name;
  }
  return null;
}

/** The teams whose approval is required: everyone except the author's own. */
export function requiredTeams(teams, authorTeam) {
  return Object.keys(teams).filter((name) => name !== authorTeam);
}

/**
 * Decide. `isMember(login, teamName)` is async so a GitHub-team lookup can plug in.
 * Returns { ok, authorTeam, results: [{team, label, approvedBy}], reason? }.
 */
export async function evaluate({ teams, author, approvers, isMember, resolveAuthorTeam }) {
  const problem = validateTeams(teams);
  if (problem) return { ok: false, reason: `Invalid configuration: ${problem}.`, results: [] };

  const authorTeam = (await resolveAuthorTeam?.(author)) ?? teamOfAuthor(teams, author);
  if (!authorTeam) {
    return {
      ok: false,
      authorTeam: null,
      results: [],
      reason:
        `The author @${author} belongs to none of the configured teams ` +
        `(${Object.keys(teams).join(', ')}), so there is no way to know whose approval ` +
        'is needed. Failing closed.',
    };
  }

  const results = [];
  for (const name of requiredTeams(teams, authorTeam)) {
    const approvedBy = [];
    for (const login of approvers) {
      if (lower(login) === lower(author)) continue; // never counts, whatever team it is
      if (await isMember(login, name)) approvedBy.push(login);
    }
    results.push({ team: name, label: teams[name].label ?? name, approvedBy });
  }

  return { ok: results.every((r) => r.approvedBy.length > 0), authorTeam, results };
}

/** The changed files that fall under a protected path. */
export function protectedFiles(filenames, watch) {
  return filenames.filter((name) => watch.some((p) => name.startsWith(p)));
}
