#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage:
  ./scripts/new-entry.sh solution "title"
  ./scripts/new-entry.sh algo-pattern "title"
  ./scripts/new-entry.sh ui-pattern "title"
USAGE
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

type="$1"
shift
title="$*"

slug="$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"
if [[ -z "$slug" ]]; then
  echo "Error: title must include alphanumeric characters."
  exit 1
fi

date_stamp="$(date +%Y-%m-%d)"

case "$type" in
  solution)
    path="knowledge/solutions/${slug}.md"
    template_type="solution"
    ;;
  algo-pattern)
    path="knowledge/patterns/algorithms/${slug}.md"
    template_type="algo-pattern"
    ;;
  ui-pattern)
    path="knowledge/patterns/aesthetics/${slug}.md"
    template_type="ui-pattern"
    ;;
  *)
    echo "Error: unknown type '$type'."
    usage
    exit 1
    ;;
esac

if [[ -e "$path" ]]; then
  echo "Error: file already exists at $path"
  exit 1
fi

mkdir -p "$(dirname "$path")"

case "$template_type" in
  solution)
    cat > "$path" <<EOF2
# Solution: ${title}

- Date: ${date_stamp}
- Domain: <frontend | backend | fullstack | data | algo>
- Tags: <tag1>, <tag2>

## Problem

Describe the exact problem and constraints.

## Final Approach

Describe the selected approach and why it was chosen.

## Complexity

- Time: <...>
- Space: <...>

## Edge Cases Covered

- <case 1>
- <case 2>

## Implementation Notes

- <key detail 1>

## Reuse Pattern

What reusable pattern from this solution should be reused later?

## Validation

- Tests/manual checks performed.
- Result and confidence.
EOF2
    ;;
  algo-pattern)
    cat > "$path" <<EOF2
# Pattern: ${title}

- Type: Algorithm
- Status: Proven
- Tags: <tag1>, <tag2>

## Use When

- <condition 1>

## Avoid When

- <condition 1>

## Core Idea

Explain the principle in 3-6 lines.

## Complexity/Cost

- Time: <...>
- Space: <...>
- Implementation complexity: <low | medium | high>

## Skeleton

\`\`\`txt
<high-level pseudocode>
\`\`\`

## Pitfalls

- <pitfall 1>
EOF2
    ;;
  ui-pattern)
    cat > "$path" <<EOF2
# Pattern: ${title}

- Type: Aesthetic/UI
- Status: Proven
- Tags: <tag1>, <tag2>

## Use When

- <condition 1>

## Visual Intent

State what the layout/style should make users feel and understand first.

## Structure

- Hierarchy: <headline -> support -> action>
- Spacing rhythm: <rule>
- Alignment system: <grid/flow>

## Color/Typography Rules

- Primary color role: <...>
- Contrast target: <...>

## Interaction/Motion Rules

- <rule 1>

## Anti-Patterns

- <what to avoid>
EOF2
    ;;
esac

echo "Created: $path"
echo "Next: add a link in knowledge/INDEX.md"
