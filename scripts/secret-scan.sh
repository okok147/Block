#!/usr/bin/env bash
set -euo pipefail

root="${1:-.}"

patterns=(
  'AKIA[0-9A-Z]{16}'
  'AIza[0-9A-Za-z_-]{35}'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  '(?i)(api[_-]?key|secret|token|password)[[:space:]]*[:=][[:space:]]*[A-Za-z0-9_\-]{16,}'
)

exclude=(
  '--glob' '!.git/**'
  '--glob' '!firebase-config.example.js'
)

found=0
echo "Running quick secret scan in ${root} ..."
for pattern in "${patterns[@]}"; do
  if rg -n --hidden "${exclude[@]}" -- "$pattern" "$root"; then
    found=1
  fi
done

if [[ "$found" -eq 1 ]]; then
  echo "Potential secrets detected. Stop and review before push."
  exit 1
fi

echo "No obvious secrets detected."
