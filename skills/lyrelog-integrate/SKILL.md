---
name: lyrelog-integrate
description: Adds Lyrelog structured logging to an app or service, on iOS and macOS (Swift), Android (Kotlin or Java), React Native, Flutter, the browser or Node (JavaScript/TypeScript), Python, Go, the JVM, or anything else over HTTP. Use when the user asks to add or set up Lyrelog, send events or errors to Lyrelog, instrument an app with Lyrelog, or connect existing logging (slog, Python logging, Logback) to Lyrelog.
metadata:
  version: "1.0.0"
  docs: https://docs.lyrelog.com/ai-agents
---

# Add Lyrelog to a project

Lyrelog collects events (a stable name, a level, an area and small fields) from apps, websites and
servers, groups the errors and plays back what each person did. This skill adds its SDK to the
project in front of you.

Lyrelog is new: don't rely on what you remember about it. The docs are the source of truth and
every page is plain Markdown at `https://docs.lyrelog.com/<page>.md`. Read the SDK's page before
writing code.

## 1. Pick the SDK

Find what the project is (look at its manifest: `Package.swift`, `build.gradle(.kts)`,
`package.json`, `pubspec.yaml`, `pyproject.toml`, `go.mod`, `pom.xml`), then read its page.

| Project | Package | Install | Docs |
|---|---|---|---|
| iOS, iPadOS, macOS, tvOS, watchOS, visionOS | Swift package | `.package(url: "https://github.com/lyrelog/lyrelog-swift", from: "1.0.0")` | `https://docs.lyrelog.com/sdks/swift.md` |
| Android (Kotlin or Java) | `com.lyrelog:lyrelog-android` | `implementation("com.lyrelog:lyrelog-android:1.0.0")` | `https://docs.lyrelog.com/sdks/android.md` |
| React Native, Expo with a dev build | `@lyrelog/react-native` | add the package, then `cd ios && pod install` | `https://docs.lyrelog.com/sdks/react-native.md` |
| Flutter | `lyrelog` | `flutter pub add lyrelog` | `https://docs.lyrelog.com/sdks/flutter.md` |
| Browser or Node (JS, TS) | `@lyrelog/js` | add `@lyrelog/js` | `https://docs.lyrelog.com/sdks/javascript.md` |
| Python | `lyrelog` | `uv add lyrelog` or `pip install lyrelog` | `https://docs.lyrelog.com/sdks/python.md` |
| Go | `go.lyrelog.com/lyrelog` | `go get go.lyrelog.com/lyrelog` | `https://docs.lyrelog.com/sdks/go.md` |
| JVM server (Kotlin, Java) | `com.lyrelog:lyrelog-jvm` (+ `lyrelog-jvm-logback`) | `implementation("com.lyrelog:lyrelog-jvm:1.0.0")` | `https://docs.lyrelog.com/sdks/jvm.md` |
| Anything else | none | send NDJSON over HTTPS | `https://docs.lyrelog.com/http-api.md` |

Install with the project's own package manager (pnpm, npm, yarn, bun, uv, pip, poetry: whichever
its lockfile shows). The index of every page is `https://docs.lyrelog.com/llms.txt`.

## 2. Get the right key

A key belongs to one project. Its prefix says what it is:

- **Apps and web pages: an ingest key, `lyr_ing_...`.** It can only append events, so it's
  fine to ship inside the app or the page.
- **Servers: a server key, `lyr_srv_...`.** Also write-only, but secret: its events are marked
  verified. Read it from the environment (for example `LYRELOG_KEY`), never commit it, and never
  put it in an app or a web page.

Ask the user for the key, or for the name of the environment variable that holds it. Never invent
one. If they don't have it yet, see the `lyrelog-keys` skill: a project owner makes it, on the
dashboard's **API keys** page or with `lyrelog keys create --type ingest --name "iOS app"`.

## 3. Start it once

Start the SDK once, where the app or service starts (the app's entry point, `main`, the server's
startup), with the key and the default endpoint (`https://ingest.lyrelog.com`; don't set one).
Copy the start code from the SDK's page; the calls differ per language:

| | Start | Log | User | Capture an error |
|---|---|---|---|---|
| Swift | `Lyrelog.start(Lyrelog.Configuration(...))` | `Lyrelog.info("checkout_done", attrs:)` | `Lyrelog.setUser("u_123")` | `Lyrelog.captureError(error)` |
| Android | `Lyrelog.start(context, Configuration(...))` | `Lyrelog.info("checkout_done", attrs = ...)` | `Lyrelog.setUser("u_123")` | `Lyrelog.captureError(e)` |
| React Native | `Lyrelog.init({...})` | `Lyrelog.info("checkout_done", { attrs })` | `Lyrelog.setUser("u_123")` | `Lyrelog.captureError(error)` |
| Flutter | `Lyrelog.start(LyrelogConfiguration(...))` | `Lyrelog.info('checkout_done', attrs: {...})` | `Lyrelog.setUser('u_123')` | `Lyrelog.captureError(e, stackTrace: s)` |
| JavaScript | `Lyrelog.init({...})` | `client.info("checkout_done", { attrs })` | `client.setUser("u_123")` | `client.captureError(err)` |
| Python | `lyrelog.init(...)` | `lyrelog.info("checkout_done", attrs=)` | `lyrelog.set_user("u_123")` | `lyrelog.capture_error(exc)` |
| Go | `lyrelog.New(lyrelog.Config{...})` | `client.Info("checkout_done", lyrelog.Attrs{})` | `client.SetUser("u_123")` | `client.CaptureError(err)` |
| JVM | `Lyrelog.start(Configuration(...))` | `Lyrelog.info("checkout_done", attrs = ...)` | `Lyrelog.setUser("u_123")` | `Lyrelog.captureError(e)` |

## 4. Make sure events leave before the process ends

Logging never blocks: the SDK queues events and sends them in batches. A long-running app or
server needs nothing more. A CLI, a script, a job or a serverless function must **flush or close**
the client before it exits, as the SDK's page shows (`await client.flush()`, `lyrelog.flush()`,
`client.Flush(ctx)`, `client.Close()`...), or the last events are lost.

## 5. Capture errors

- Uncaught errors: the app SDKs catch crashes on their own (iOS through MetricKit, Android's
  uncaught exceptions, React Native's and Flutter's errors plus the native crashes), and the
  JavaScript SDK catches `window` and Node errors. Python needs a few lines of `sys.excepthook`,
  Go its own `recover`, the JVM `captureUncaught = true`: copy them from the SDK's page.
- Caught errors: find the places that catch an error and carry on (a failed request, a
  failed save) and log them there, at `error` level, with what failed in the attributes.

## 6. Log a few good events

One event per thing that happened to a person: sign in, a purchase, a sync, a failed request.
Not one per function call.

- **`message` is a stable snake_case name**, never prose: `payment_declined`, not
  `"Payment declined with code 51 for user-1"`. What varies goes in the attributes.
- **Level**: `trace`, `debug`, `info` (default), `notice`, `warning`, `error`, `critical`.
  `error` and `critical` are grouped on the Errors page and can alert.
- **Area (`category`)**: the part of the app, like `checkout` or `sync`. Use the SDK's logger
  per area (`Lyrelog.logger("checkout")`) instead of repeating it.
- **Attributes**: small fields to filter and chart by: ids, durations, status codes. Numbers as
  numbers (`latency_ms: 412`, not `"412"`). Names without dots (nest an object instead), not
  starting with `_`. Up to 200 leaves, strings up to 1,024 bytes.
- **Payload**: a bigger blob read only when the event is opened (a response, a stack trace),
  up to 64 KiB. Not filterable.

Details: `https://docs.lyrelog.com/concepts/events.md`.

## 7. Identify people, carefully

Call `setUser` (or its equivalent) with the app's own user id after sign-in, and clear it on
sign-out as the SDK's page shows. Never an email address, a name or a phone number.

**Never** put passwords, tokens, API keys, cookies, card numbers, full request bodies or personal
data in messages, attributes or payloads. The SDKs hide fields named like a password, token,
cookie or key before sending, but don't rely on that: leave them out.

## 8. Keep the logging the project already has

If the project logs with Go's `log/slog`, Python's `logging` or Logback on the JVM, connect it
instead of rewriting calls: `lyrelog.NewSlogHandler(client, nil)`, `lyrelog.LoggingHandler()`, or
the `LyrelogAppender` in `logback.xml`. Their message, level and fields arrive like any other
event. See `https://docs.lyrelog.com/sdks/go.md`, `python.md` or `jvm.md`.

## 9. Check that events arrive

Log one event when the app starts, run it, then check:

- With the CLI signed in (`lyrelog whoami` exits 0): `lyrelog events -f --env all` follows
  events as they arrive. See the `lyrelog-investigate` skill. If it isn't signed in, a person runs
  `lyrelog login`; you can't.
- Or in the dashboard: the project's explorer, `https://app.lyrelog.com`.

Tell the user which **environment** the events arrive under: each SDK names it (Swift
development, testflight or production; Android by whether the build is debuggable; JavaScript by
the host or `NODE_ENV`; Python, Go and JVM from `LYRELOG_ENVIRONMENT`, else production). The
dashboard shows one environment at a time, so a debug build's events don't show under production.

Nothing arriving? A wrong key answers `401` and the SDK stops sending until restart; a wrong
endpoint is reported as a warning in the SDK's own log. Check the key's prefix and the project.

## Finish with

A short summary for the user: the SDK and where it starts, where the key comes from, which events
and errors are now logged, the environment, and how to see them.
