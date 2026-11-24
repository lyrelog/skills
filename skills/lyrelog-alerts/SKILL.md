---
name: lyrelog-alerts
description: Sets up Lyrelog alerts for a project (a new kind of error, an error spike, a version that starts failing) by email, Slack or a signed webhook, and verifies webhook signatures in the receiving code. Use when the user wants to be told when their app breaks, asks to turn Lyrelog alerts on or tune them, connect Slack or a webhook to Lyrelog, or handle Lyrelog's alert webhook in their backend.
metadata:
  version: "1.0.1"
  docs: https://docs.lyrelog.com/skills
---

# Lyrelog alerts

A project can alert on three things, checked every five minutes in the project's default
environment (so development builds don't wake anyone):

| Kind | When (defaults) |
|---|---|
| `new_error` | An error (`error` or `critical` level) the project hasn't had in 30 days. Once per error |
| `spike` | In the last hour an error happened at least 20 times and 3 times its usual hourly rate. At most every six hours per error |
| `release` | The newest version with 50+ sessions has 5 points fewer error-free sessions than the one before. Once per version |

**Plans:** Free has no alerts. Pro: email and Slack. Business: email, Slack and webhooks. A
`403` with `"plan_limit": "alerts"` means the plan doesn't include it: tell the user, don't retry.

The CLI has no `alerts` command yet: use `lyrelog api` (signed in as the person, see the
`lyrelog-investigate` skill for checking the sign-in). `{project}` becomes the default project's
id; add `-p <project>` for another.

## 1. Look first

```bash
lyrelog api GET projects/{project}/alerts
```

It answers `settings` (what the project sends and its thresholds), `mine` (what this person gets
by email), `allowed` (whether the plan has alerts), `available` (the channels the plan allows)
and `channels` (Slack and webhook, with `id`, `kinds` and only a `url_hint`).

## 2. Email for this person

Anyone in the project chooses their own. Emails go to the account's confirmed address.

```bash
lyrelog api PUT projects/{project}/alerts/me --data '{"kinds":["new_error","spike","release"]}'
```

`{"kinds":[]}` stops them.

## 3. What the project sends (owners)

Send the **whole** settings object: start from the `settings` that step 1 returned and change
only what the user asked for.

```bash
lyrelog api PUT projects/{project}/alerts --data '{
  "new_error": true, "spike": true, "release": true,
  "spike_factor": 3, "spike_min": 20,
  "release_drop": 5, "release_min_sessions": 50
}'
```

| Field | Means | Range |
|---|---|---|
| `spike_factor` | A spike is this many times the usual rate | 1.5 to 20 |
| `spike_min` | With at least this many events in the hour | 1 to 100,000 |
| `release_drop` | A version fails at this many points fewer error-free sessions | 1 to 50 |
| `release_min_sessions` | Once it has this many sessions | 10 to 100,000 |

An alert turned off here stops for everyone, whatever each person chose.

## 4. Slack (owners, Pro and up)

The user makes a Slack incoming webhook for the channel (an app with **Incoming Webhooks** on,
then **Add New Webhook**; the address starts with `https://hooks.slack.com/services/`). The
address is a secret: let the user paste it into the command themselves, or read it from an
environment variable, rather than writing it in the chat.

```bash
lyrelog api POST projects/{project}/alerts/channels \
  --data "{\"kind\":\"slack\",\"url\":\"$SLACK_WEBHOOK_URL\",\"kinds\":[\"new_error\",\"spike\",\"release\"]}"
```

One Slack channel per project: `409` means there's one already; remove it first.

## 5. A webhook (owners, Business)

Any `https://` address on port 443 that the internet can reach.

```bash
lyrelog api POST projects/{project}/alerts/channels \
  --data '{"kind":"webhook","url":"https://example.com/hooks/lyrelog","kinds":["new_error","spike","release"]}'
```

The answer carries the **signing secret** (`"secret": "whsec_..."`) **once**. Have the user
store it in the receiving service's secrets (e.g. `LYRELOG_WEBHOOK_SECRET`) straight away.

Each alert is a `POST` with JSON: `type` (`"alert"`), `kind` (`new_error`, `spike`, `release` or
`test`), `project` (`id`, `name`), `title`, `detail`, `url`, `issue` (`area`, `name`, `events`,
`people`) or `release` (`version`, `previous`, `error_free`, `previous_error_free`, `sessions`),
and `sent_at`.

### Verify the signature in the receiver

Header: `X-Lyrelog-Signature: t=<unix seconds>,v1=<hex>`, where `v1` is HMAC-SHA256 of
`<t>.<raw body>` with the secret. Compute it over the **raw** body (before any JSON parsing),
compare in constant time, and refuse a `t` more than five minutes old. In Node:

```js
import { createHmac, timingSafeEqual } from "node:crypto"

function fromLyrelog(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(",").map((part) => part.split("=")))
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex")
  return v1.length === expected.length && timingSafeEqual(Buffer.from(v1), Buffer.from(expected))
}
```

Port it to the receiver's language with the same steps. Answer any `2xx` within 10 seconds and
do slow work afterwards: a `5xx`, `408`, `429` or no answer is retried (30 s, doubling, up to 8
tries); other `4xx` are given up. Redirects aren't followed.

## 6. Test, and remove

```bash
lyrelog api POST projects/{project}/alerts/channels/<id>/test     # posts a "test" alert
lyrelog api DELETE projects/{project}/alerts/channels/<id>        # ask the user first
```

The channel `id` is in step 1's `channels`. After a test, check `last_status` there.

Details: `https://docs.lyrelog.com/projects/alerts.md`.
