#!/usr/bin/env bash
#
# Rebuilds the rules protecting `main`, from nothing.
#
# Applied on 15 August 2026. This is not here to repair something that broke —
# it is here for whoever asks *why* it is arranged this way, and for the day the
# same arrangement has to be made somewhere else.
#
# **Why two rulesets and not a classic branch protection.** The plan said: give
# the CMS account a bypass on the required pull request. It does not work, and
# that was established rather than assumed — on a throwaway branch, with commits
# made through the contents API, which is how Sveltia commits and not a git push:
#
#   PR required + bypass + required status checks ... 409, "Required status
#                                                     check verify is expected"
#   PR required + bypass, no status checks ......... commit accepted
#   Ruleset with PR + checks, with a bypass ........ commit accepted
#   The same ruleset, bypass removed ............... 409 on both rules
#
# `bypass_pull_request_allowances` waives the pull request and nothing else. The
# required status checks of a classic protection have no exception list at all,
# and `verify` cannot pass on a commit that has not been accepted yet — so the
# CMS stays out either way. Inside a ruleset a bypass waives the whole ruleset,
# status checks included. The fourth line exists because "it worked" and "the
# rule was not looking" resemble each other too closely to trust the third alone.
#
# **Why two and not one.** A bypass is granted per ruleset, not per rule. With a
# single one, the team that can save from the CMS could also rewrite the history
# of `main`.
#
# **Why the bypass names a team and not an account.** At PR 20 the CMS signs in
# through OAuth and commits as whoever signed in, so an account "for the
# editors" would be a shared credential to hand out now and withdraw then.
#
# **Why ~DEFAULT_BRANCH and not refs/heads/main.** If the default branch is ever
# renamed the rules follow it, instead of staying on a name that no longer
# exists — which is the quiet way a ruleset stops watching anything.
#
# Usage:  REPO=miniera-culturale/website TEAM=redazione ./rebuild-branch-rules.sh
set -euo pipefail

: "${REPO:=miniera-culturale/website}"
: "${TEAM:=redazione}"
ORG="${REPO%%/*}"

TEAM_ID=$(gh api "orgs/$ORG/teams/$TEAM" --jq .id)
echo "team $TEAM = $TEAM_ID"

# A classic protection and a ruleset ADD UP. Left in place, the classic one goes
# on blocking the CMS with its own required checks, and the configuration looks
# complete while not working.
gh api -X DELETE "repos/$REPO/branches/main/protection" 2>/dev/null \
  && echo "classic protection removed" \
  || echo "classic protection: none"

echo "-> integrita — no bypass, for anybody"
gh api -X POST "repos/$REPO/rulesets" --jq '.name' --input - <<'JSON'
{
  "name": "integrita", "target": "branch", "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" }
  ]
}
JSON

echo "-> revisione — pull request and the two checks, bypassed by the team"
# `guards-complete` and not `guards`: the shards alone pass even when three of
# them never ran. `integration_id` 15368 is GitHub Actions — without it the rule
# would accept a check of that name from any app.
# `allowed_merge_methods` is squash here as well as in the repository settings:
# "the merge is always a squash and merge" is one of the three rules with no
# exceptions, and it stood on a single toggle an administrator can flip without
# leaving a trace in the ruleset.
gh api -X POST "repos/$REPO/rulesets" --jq '.name' --input - <<JSON
{
  "name": "revisione", "target": "branch", "enforcement": "active",
  "bypass_actors": [ { "actor_id": $TEAM_ID, "actor_type": "Team", "bypass_mode": "always" } ],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "verify", "integration_id": 15368 },
          { "context": "guards-complete", "integration_id": 15368 } ] } }
  ]
}
JSON

echo "-> squash and merge as the only way"
gh api -X PATCH "repos/$REPO" \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F allow_auto_merge=false -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY >/dev/null

echo "-> what it came out as"
# Asked of the branch and not of the rulesets: this is the endpoint that answers
# «what actually applies here», which is the only question worth asking once two
# mechanisms can add up.
gh api "repos/$REPO/rules/branches/main" --jq 'map(.type)'
gh api "repos/$REPO" --jq '{squash: .allow_squash_merge, merge_commit: .allow_merge_commit, rebase: .allow_rebase_merge}'
