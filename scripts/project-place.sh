#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: scripts/project-place.sh <ddo-tools|ddo-data> <issue number> <ddo-tools|ddo-data> <issue number to place it after>" >&2
  exit 2
fi

repository_name="$1"
issue_number="$2"
preceding_repository_name="$3"
preceding_issue_number="$4"
owner="WestonChan"
project_number=2

project_item_id() {
  gh api graphql \
    -f query='query($owner: String!, $repository: String!, $number: Int!) { repository(owner: $owner, name: $repository) { issue(number: $number) { projectItems(first: 20) { nodes { id project { number } } } } } }' \
    -f owner="$owner" -f repository="$1" -F number="$2" \
    --jq ".data.repository.issue.projectItems.nodes[] | select(.project.number == $project_number) | .id"
}

project_id=$(gh project view "$project_number" --owner "$owner" --format json --jq .id)

item_id=$(project_item_id "$repository_name" "$issue_number")
if [ -z "$item_id" ]; then
  item_id=$(gh project item-add "$project_number" --owner "$owner" --url "https://github.com/$owner/$repository_name/issues/$issue_number" --format json --jq .id)
fi

preceding_item_id=$(project_item_id "$preceding_repository_name" "$preceding_issue_number")
if [ -z "$preceding_item_id" ]; then
  echo "$preceding_repository_name#$preceding_issue_number is not on the project" >&2
  exit 1
fi

gh api graphql \
  -f query='mutation($project: ID!, $item: ID!, $after: ID!) { updateProjectV2ItemPosition(input: {projectId: $project, itemId: $item, afterId: $after}) { clientMutationId } }' \
  -f project="$project_id" -f item="$item_id" -f after="$preceding_item_id" >/dev/null
echo "$repository_name#$issue_number now follows $preceding_repository_name#$preceding_issue_number"
