# Block Pattern Library

A repo-specific system to store solved problems and reusable patterns that speed up coding while improving quality.

## Scope

- Solved problem writeups with implementation decisions and complexity notes.
- Reusable algorithm patterns (for faster design and cleaner code).
- Reusable UI aesthetic patterns (for stronger visual quality and consistency).
- Lightweight quality and security checklists for shipping safely.

## Cross-Project Capture Default

- Any solved problem, reusable pattern, or design/system insight found in other projects must be captured in this Block repo by default.
- This capture is proactive and does not require an explicit user request.
- When source projects are private/sensitive, store only sanitized and generalized patterns (no secrets, private identifiers, or confidential business data).

## Quick Start

```bash
# Create a solved problem entry
./scripts/new-entry.sh solution "two sum with hash map"

# Create an algorithm pattern entry
./scripts/new-entry.sh algo-pattern "binary search on answer"

# Create a UI aesthetic pattern entry
./scripts/new-entry.sh ui-pattern "hero layout rhythm"
```

## Website (Field Block Checker)

```bash
# Build website data from all markdown knowledge files
node scripts/build-site-data.mjs

# Run local website
python3 -m http.server 4173 --directory site
```

Then open `http://localhost:4173` to check blocks by field, tags, and search.

## GitHub Hosting

- Repository URL: `https://github.com/okok147/Block`
- Expected Pages URL: `https://okok147.github.io/Block/`
- Auto deployment workflow: `.github/workflows/deploy-pages.yml`

## Structure

- `knowledge/INDEX.md`: central index for all entries.
- `knowledge/solutions/`: solved problem solutions.
- `knowledge/patterns/algorithms/`: coding algorithm patterns.
- `knowledge/patterns/aesthetics/`: UI and visual design patterns.
- `knowledge/templates/`: reusable templates.
- `knowledge/checklists/`: quality/security checks.
- `scripts/new-entry.sh`: entry generator.
- `scripts/secret-scan.sh`: quick secret scan before push.
- `scripts/build-site-data.mjs`: builds website data index from markdown.
- `site/`: static website for browsing knowledge blocks by field.

## Standard Workflow

1. Add/update a solution or pattern.
2. Add links in `knowledge/INDEX.md`.
3. Run `./scripts/secret-scan.sh`.
4. Commit and push.

## Cross-Project Intake Workflow

1. Extract the reusable part from the source project.
2. Generalize it into `knowledge/solutions/` or `knowledge/patterns/`.
3. Remove sensitive details and keep only transferable logic/design.
4. Index it in `knowledge/INDEX.md` and commit.
