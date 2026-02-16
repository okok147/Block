# Block Pattern Library

A repo-specific system to store solved problems and reusable patterns that speed up coding while improving quality.

## Scope

- Solved problem writeups with implementation decisions and complexity notes.
- Reusable algorithm patterns (for faster design and cleaner code).
- Reusable UI aesthetic patterns (for stronger visual quality and consistency).
- Lightweight quality and security checklists for shipping safely.

## Quick Start

```bash
# Create a solved problem entry
./scripts/new-entry.sh solution "two sum with hash map"

# Create an algorithm pattern entry
./scripts/new-entry.sh algo-pattern "binary search on answer"

# Create a UI aesthetic pattern entry
./scripts/new-entry.sh ui-pattern "hero layout rhythm"
```

## Structure

- `knowledge/INDEX.md`: central index for all entries.
- `knowledge/solutions/`: solved problem solutions.
- `knowledge/patterns/algorithms/`: coding algorithm patterns.
- `knowledge/patterns/aesthetics/`: UI and visual design patterns.
- `knowledge/templates/`: reusable templates.
- `knowledge/checklists/`: quality/security checks.
- `scripts/new-entry.sh`: entry generator.
- `scripts/secret-scan.sh`: quick secret scan before push.

## Standard Workflow

1. Add/update a solution or pattern.
2. Add links in `knowledge/INDEX.md`.
3. Run `./scripts/secret-scan.sh`.
4. Commit and push.
