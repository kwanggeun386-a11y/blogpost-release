# Security Notes

## Local App Boundary

Blog Factory is designed to run on localhost. Keep the default host as `127.0.0.1`.

The server issues an in-memory local session token at `/api/session`. All app API calls must send that token in the `X-BlogFactory-Session` header. Do not expose this server on a public network without adding real user authentication.

## Secrets

- Do not commit `.env`, `data/`, `server/database/`, `dist/`, or generated binaries.
- AI provider API keys are saved through the app settings screen and encrypted locally.
- GitHub release publishing should use a fine-grained `RELEASE_TOKEN` stored in the protected `release` environment.
- Rotate any token that has appeared in terminal output, release logs, screenshots, or committed history.

## GitHub Actions

- Keep workflow permissions minimal.
- Keep third-party actions pinned to full commit SHAs.
- Let Dependabot open update PRs for npm packages and GitHub Actions.
- Require review for changes under `.github/workflows/` before merging.

## Reporting

If you find a vulnerability, open a private security advisory or contact the repository owner directly before public disclosure.
