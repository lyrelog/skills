---
name: lyrelog-investigate
description: Investigates errors, crashes and odd behaviour in an app that sends events to Lyrelog, using the lyrelog command-line tool (read only, JSON output). Use when the user asks why something fails in production, to look into a Lyrelog error or event, to see what a person did before an error, to compare app versions, or to query their Lyrelog logs, events, sessions or releases.
metadata:
  version: "1.0.0"
  docs: https://docs.lyrelog.com/ai-agents
---

# Investigate with the Lyrelog CLI

`lyrelog` is Lyrelog's dashboard in a terminal. Under a coding agent it writes JSON on stdout and
nothing else. Use it to go from an error to its cause: how often, who, which versions, what
happened before it, and the code that logs it.

## Rules

- **Read only.** Don't create, change, revoke or delete anything (keys, tokens, projects, a
  person's data) unless the user asked for that exact change.
- **Don't guess flags.** Run `lyrelog --help` and `lyrelog <command> --help` first; every command
  has examples.
- **You can't sign in.** `lyrelog login` refuses to run under an agent. A person signs in once
  and you use that sign-in.
- Separate what the events prove from what you infer.

## 0. Check the setup

```bash
lyrelog whoami            # exit 0: signed in; prints the account and the default project
lyrelog projects          # the projects you can see
```

- Not installed: ask the user to install it (`brew install lyrelog/tap/lyrelog`, or a download
  from https://github.com/lyrelog/lyrelog-cli/releases) and stop.
- Exit code 3 (`not_signed_in`): ask the user to run `lyrelog login` in their terminal, then
  carry on. In CI the CLI uses `LYRELOG_TOKEN` instead (see the `lyrelog-keys` skill).
- No default project: pass `-p <project>` (its id, slug or name) to each command, or ask the user
  to run `lyrelog use <project>`.

## 1. The investigation

Copy this checklist and work through it:

```
- [ ] 1. Find the error: count, people, versions, when it started, sample ids
- [ ] 2. Read one occurrence in full
- [ ] 3. Read what happened before it in that session
- [ ] 4. Compare versions, devices, platforms; measure the failure rate
- [ ] 5. Look at one or two more people it reached
- [ ] 6. Find the code that logs it, explain the cause, propose a fix
```

```bash
# 1. Problems grouped by area and event name, worst first (default: last 7 days)
lyrelog errors --since 7d
#    each has count, players, versions, first/last seen, sample_event and sample_session

# 2. One event: who, where, the app, the device, attributes and payload
lyrelog events get <sample_event>

# 3. The session that led to it, in order
lyrelog events --session <sample_session> --oldest-first

# 4. Where it happens, and how often it fails
lyrelog events values version --message <event_name>
lyrelog events values device --message <event_name>
lyrelog events values attr.<path> --message <event_name>   # an attribute, e.g. attr.status
lyrelog insights rate --hits <failure_event> --of <attempt_event>

# 5. Other people it reached
lyrelog person <user_id>

# 6. The code
grep -rn "<event_name>" .
```

Event names are stable (`payment_failed`), so `grep` for the name usually lands on the line that
logs it.

## 2. Filters

Most commands take the same filters as the dashboard's explorer:

| Flag | Filters by |
|---|---|
| `--since 1h` / `--from`, `--to` | Time window: `15m`, `1h`, `24h`, `7d`, `30d`; or RFC 3339, a date, Unix ms |
| `--level` | `error`, `error,critical`, or `warning+` |
| `--message` | The event name, exactly |
| `-q`, `--query` | Text in the message, area and attributes |
| `--category` | The area: `checkout`, `"a\|b"`, `"!a"` |
| `--attr path:value` | An attribute (`path!:value` for not); repeat for more |
| `--user`, `--session`, `--install` | One person, session or install |
| `--version`, `--platform`, `--device`, `--os`, `--country`, `--locale` | Where it ran |
| `--env` | Environment: default is the project's; `all` for every one |
| `--verified '!none'` | Only events from a proven sender |
| `-n`, `--limit` | How many (default 100); `--cursor` carries on |

Quote values with `|` or `!`: the shell reads them otherwise.

Other commands worth knowing: `lyrelog sessions --errors`, `lyrelog sessions --with-event <name>`,
`lyrelog releases` (each version's people, sessions and share without errors),
`lyrelog insights trend <event> --by version`, `lyrelog insights funnel <a> <b> <c>`,
`lyrelog events summary`, `lyrelog events attributes`. `lyrelog events -f` follows events as they
arrive (NDJSON, one object a line; stop it after a few seconds).

## 3. The JSON contract

- stdout carries only the data. Field names are the dashboard API's: a count of people is
  `players` whatever the project calls its people.
- A failure writes one JSON line to stderr, `{"code": "...", "error": "...", "hint": "..."}`,
  and exits with a stable code:

| Exit | `code` | Meaning, and what to do |
|---|---|---|
| 0 | | Done |
| 1 | `error` | Something else failed: report it |
| 2 | `usage` | Wrong command, flag or value: read `--help` |
| 3 | `not_signed_in` | Ask the user to run `lyrelog login` |
| 4 | `reauth_required` | Needs a sign-in from the last 10 minutes: ask the user to run `lyrelog login` |
| 5 | `forbidden` / `browser_only` | Not allowed, or only the dashboard does it: tell the user |
| 6 | `not_found` | No such project, event, key or person (or not theirs) |
| 7 | `refused` | The server refused the request as it is |
| 8 | `rate_limited` | Wait `retry_after` seconds, then retry |
| 9 | `network` | The server couldn't be reached |
| 130 | `interrupted` | Ctrl-C |

## 4. Anything else

- `lyrelog open <page> --print` gives the user a dashboard link (`errors`, `releases`,
  `person <id>`, `event <id>`...) instead of opening a browser.
- `lyrelog api GET <path>` calls any dashboard API route signed in, like `gh api`; `{project}`
  becomes the current project's id: `lyrelog api GET projects/{project}/alerts`.
- On a server with no person to sign in, a **read key** (`lyr_read_...`) queries events over HTTP:
  `https://docs.lyrelog.com/read-api.md`.

Full reference: `https://docs.lyrelog.com/cli/agents.md` and `https://docs.lyrelog.com/cli/reference.md`.

## Finish with

What happened (counts, people, versions, since when), the most likely cause with the evidence,
what is proven and what is a guess, the fix you propose, and dashboard links from `lyrelog open
... --print`.
