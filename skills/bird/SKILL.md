---
name: bird
description: X/Twitter CLI for reading, searching, and posting via cookies or Sweetistics.
homepage: https://bird.fast
metadata: {"clawdbot":{"emoji":"🐦","requires":{"bins":["bird"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/bird","bins":["bird"],"label":"Install bird (brew)"}]}}
---

# bird

Use `bird` to read/search X and post tweets/replies.

## When NOT to Use
- **Posting tweets/replies** — bird CLI is blocked by error 226 ("looks automated"). Use browser-based CDP posting instead (DataTransfer + ClipboardEvent on `[data-testid="tweetTextarea_0"]`).
- Reading tweets when you need full thread context — use `web_fetch` on the tweet URL instead.
- bird uses **Chrome cookies** (not Safari). If Chrome isn't logged in, auth will fail.
- Use bird ONLY for: `bird read`, `bird search`, `bird whoami`, `bird thread` (read operations).

Quick start
- `bird whoami`
- `bird read <url-or-id>`
- `bird thread <url-or-id>`
- `bird search "query" -n 5`

Posting (confirm with user first)
- `bird tweet "text"`
- `bird reply <id-or-url> "text"`

Auth sources
- Browser cookies (default: Firefox/Chrome)
- Sweetistics API: set `SWEETISTICS_API_KEY` or use `--engine sweetistics`
- Check sources: `bird check`
