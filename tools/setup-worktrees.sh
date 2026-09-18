#!/usr/bin/env bash
#
# Creates one git worktree per team and installs that team's boundary into it.
#
# A worktree on its own isolates nothing — every worktree holds the whole tree. The
# isolation comes from what this script copies in: permission rules that deny the
# other team's directory to the file tools, and a hook that blocks a shell command
# reaching across.
#
# The boundaries live in teams/ and are committed, so they are reviewable like any
# other rule. What lands in each worktree's .claude/ is a generated copy and is
# ignored by git, so the team branches do not diverge on their own configuration.
#
#   bash tools/setup-worktrees.sh
#
# Safe to re-run: it refreshes the boundary files in worktrees that already exist.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

base="$(git symbolic-ref --quiet --short HEAD || echo main)"

setup() {
  local team="$1" other="$2"
  local dir=".worktrees/${team}"
  local branch="team/${team}"

  if [ ! -d "${dir}" ]; then
    if ! git show-ref --verify --quiet "refs/heads/${branch}"; then
      git branch "${branch}" "${base}"
    fi
    git worktree add --quiet "${dir}" "${branch}"
    echo "  created  ${dir}  on ${branch}"
  else
    echo "  exists   ${dir}"
    # Keep the team branch level with the base, so a boundary or contract change
    # committed on main reaches the teams without anyone re-cloning. Fast-forward
    # only: if the team has work of its own, this is left alone deliberately.
    if git -C "${dir}" merge --ff-only --quiet "${base}" 2>/dev/null; then
      echo "           fast-forwarded to ${base}"
    else
      echo "           left as is — ${branch} has diverged from ${base}"
    fi
  fi

  mkdir -p "${dir}/.claude/hooks"
  cp "teams/${team}/settings.json" "${dir}/.claude/settings.local.json"
  cp "teams/${team}/CLAUDE.md" "${dir}/.claude/CLAUDE.md"
  cp "teams/hooks/no-cross-team.mjs" "${dir}/.claude/hooks/no-cross-team.mjs"
  echo "           boundary installed — ${other}/ is denied"
}

echo "Setting up team worktrees from ${base}:"
setup frontend api
setup backend web

echo
git worktree list
echo
cat <<'NOTE'
Start each team in its own terminal, from its own directory:

  claude --add-dir .worktrees/frontend
  claude --add-dir .worktrees/backend

or simply open a session with that folder as the working directory. Each session
reads its own CLAUDE.md, cannot read the other team's code, and shares nothing with
the other except contract/openapi.yaml.
NOTE
