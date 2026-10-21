#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: scripts/project-status.sh <ddo-tools|ddo-data> <issue number> <Backlog|Ready|In progress|Done>" >&2
  exit 2
fi

repository_name="$1"
issue_number="$2"
status_name="$3"
owner="WestonChan"
project_number=2

project_id=$(gh project view "$project_number" --owner "$owner" --format json --jq .id)
status_field=$(gh project field-list "$project_number" --owner "$owner" --format json --jq '.fields[] | select(.name == "Status")')
status_field_id=$(jq -r .id <<<"$status_field")
status_option_id=$(jq -r --arg name "$status_name" '.options[] | select(.name == $name) | .id' <<<"$status_field")

if [ -z "$status_option_id" ]; then
  echo "The project has no Status named '$status_name'; it has: $(jq -r '[.options[].name] | join(", ")' <<<"$status_field")" >&2
  exit 1
fi

item_id=$(gh api graphql \
  -f query='query($owner: String!, $repository: String!, $number: Int!) { repository(owner: $owner, name: $repository) { issue(number: $number) { projectItems(first: 20) { nodes { id project { number } } } } } }' \
  -f owner="$owner" -f repository="$repository_name" -F number="$issue_number" \
  --jq ".data.repository.issue.projectItems.nodes[] | select(.project.number == $project_number) | .id")

if [ -z "$item_id" ]; then
  echo "$repository_name#$issue_number is not on the project; add it with: gh project item-add $project_number --owner $owner --url https://github.com/$owner/$repository_name/issues/$issue_number" >&2
  exit 1
fi

gh project item-edit --id "$item_id" --project-id "$project_id" --field-id "$status_field_id" --single-select-option-id "$status_option_id" >/dev/null
echo "$repository_name#$issue_number is now $status_name"
