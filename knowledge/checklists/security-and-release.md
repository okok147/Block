# Security And Release Checklist

- No secrets in tracked files (`firebase-config.js` remains local).
- Placeholder config only in `firebase-config.example.js`.
- Quick secret scan passes: `./scripts/secret-scan.sh`.
- New files are linked in `knowledge/INDEX.md`.
- Commit message describes meaningful change.
- Push succeeded and remote status verified.
