#!/usr/bin/env bash
set -euo pipefail
repository=ghcr.io/bedrosique/personal-crm
current=$(docker image inspect "$1" --format '{{.Id}}')
previous=''
if [[ -n "${2:-}" ]]; then previous=$(docker image inspect "$2" --format '{{.Id}}'); fi
mapfile -t candidates < <(docker image ls "$repository" --no-trunc --quiet | sort -u)
for id in "${candidates[@]}"; do
  [[ "$id" == "$current" || "$id" == "$previous" ]] && continue
  refs=$(docker image inspect "$id" --format '{{range .RepoTags}}{{println .}}{{end}}{{range .RepoDigests}}{{println .}}{{end}}')
  owned=true
  while IFS= read -r ref; do
    [[ -z "$ref" || "$ref" == "$repository:"* || "$ref" == "$repository@"* ]] || owned=false
  done <<< "$refs"
  [[ "$owned" == true ]] || continue
  # Include stopped containers; never remove containers or volumes.
  [[ -z "$(docker ps -aq --filter ancestor="$id")" ]] || continue
  docker image rm "$id" || echo 'Unused application image retained because removal was refused'
done
