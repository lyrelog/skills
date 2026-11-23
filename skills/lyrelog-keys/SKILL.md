---
name: lyrelog-keys
description: Explains which Lyrelog key or token goes where (ingest keys in apps, server keys on backends, read keys for scripts, access tokens for CI) and gets the user the right one safely, with the lyrelog CLI or the dashboard. Use when setting up Lyrelog in an app, a server or CI, when a Lyrelog key or LYRELOG_TOKEN is missing, invalid (401/403) or leaked, or when rotating or revoking one.
metadata:
  version: "1.0.0"
  docs: https://docs.lyrelog.com/ai-agents
---

# Lyrelog keys and tokens

Two kinds of credentials: **keys** belong to one project and send or read its events; **access
tokens** act as a person, for the CLI and the API in CI and scripts.

## Which one

| Need | Credential | Prefix | Where it lives |
|---|---|---|---|
| An app or a web page sends events | Ingest key | `lyr_ing_` | In the app or page. Public by design: it can only append events |
| A backend sends events (verified) | Server key | `lyr_srv_` | The server's environment or secret store. **Secret** |
| A script or server reads events | Read key | `lyr_read_` | A server or script. **Secret**: it reads every event of the project |
| An admin job sends and reads | Admin key | `lyr_adm_` | A server. **Secret** |
| CI or a script runs the CLI or the API | Access token | `lyr_tok_` | `LYRELOG_TOKEN` in the CI's secrets. **Secret** |

Never put a server, read or admin key or an access token in an app, a web page, a repository or a
log. An app or a page always gets the ingest key.

## Who can make them

- Keys: project **owners**, on the project's **API keys** page in the dashboard, or with the CLI.
  A project has at most 20 active keys. Keys don't expire.
- Server, read and admin keys, and access tokens, need a **sign-in from the last 10 minutes**.
  Ingest keys don't.
- A secret is shown **once**, when it's made. Lyrelog keeps only its hash.
- A coding agent can't sign in. A person runs `lyrelog login` first; for the 10-minute rule,
  right before.

## Getting one

Prefer that the person runs the command and the secret goes straight where it's needed, so it
never shows in the chat or a log. Give them the exact command:

```bash
# An ingest key for an app (safe to show; it ships in the app anyway)
lyrelog keys create --type ingest --name "iOS app"

# A server key, straight into GitHub Actions' secrets
lyrelog login            # within 10 minutes of the next line
lyrelog keys create --type server --name "api server" --json | jq -r .secret | gh secret set LYRELOG_KEY

# An access token for CI (90 days by default; --expires 30d, 90d, 1y or never)
lyrelog login
lyrelog tokens create --name "GitHub Actions, deploy" --json | jq -r .token | gh secret set LYRELOG_TOKEN
```

Add `-p <project>` if the default project (`lyrelog use`) isn't the right one. Adapt the last step
to the user's secret store (`fly secrets set`, `vercel env add`, a `.env` that is git-ignored...).
Without the CLI: the dashboard's **API keys** page (keys) and the account page (tokens).

`--expires never` asks for confirmation; in JSON mode it needs `--yes`. A token can't make or
change tokens.

## Using them

- SDK in an app: the ingest key in its configuration (see the `lyrelog-integrate` skill).
- SDK on a server: the server key from the environment, e.g. `LYRELOG_KEY`.
- CLI in CI: set `LYRELOG_TOKEN`; no `lyrelog login` needed. `lyrelog whoami` checks it.
- Read API: the read key as `Authorization: Bearer lyr_read_...`
  (`https://docs.lyrelog.com/read-api.md`).

## When something's wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| Ingest answers `401` | Wrong, revoked or mistyped key; or a key of another project | Check the prefix and project in `lyrelog keys` (it lists names, types and last use, never secrets) |
| Ingest answers `403` "this key cannot write events" | A read key used to send | Use an ingest key (apps) or a server key (servers) |
| Ingest answers `429` | Over the plan's month, the project's rate or one address's daily share | `lyrelog usage` shows the month against the plan |
| CLI exits 3 in CI | `LYRELOG_TOKEN` missing or expired | Make a new token |
| CLI exits 4 | The action needs a fresh sign-in | The person runs `lyrelog login`, then retries within 10 minutes |
| A secret leaked | | Revoke it at once (`lyrelog keys revoke <id>` or `lyrelog tokens revoke <id>`), make a new one, update where it's used. Revoking takes effect within a minute |

An SDK that gets `401` or `403` stops sending until the app restarts, and keeps its queued events.

Ask before revoking anything: whatever uses that key stops working.

Details: `https://docs.lyrelog.com/concepts/keys.md`, `https://docs.lyrelog.com/cli/setup.md`.
