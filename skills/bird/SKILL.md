---
name: bird
description: Read-only X/Twitter CLI for searching and reading tweets, threads, and profiles via browser cookies. Use for "read timeline", "search tweets", "get thread", "check profile". Do NOT use for posting tweets or replies (bird CLI blocked by error 226 automation detection — use browser CDP instead). Requires bird CLI (brew install steipete/tap/bird) and Chrome browser cookies. Key capabilities: search tweets, read threads, fetch user timelines, whoami auth check.
homepage: https://bird.fast
compatibility: Requires bird CLI (brew install steipete/tap/bird) and Chrome browser cookies
metadata:
  clawdbot:
    emoji: "🐦"
    requires:
      bins: ["bird"]
    install:
      - id: brew
        kind: brew
        formula: steipete/tap/bird
        bins: ["bird"]
        label: Install bird (brew)
  author: Jeff Daniels
  version: 1.0.0
  category: content
  last_verified: 2026-02-13
---

# bird

Use `bird` for **read-only** X/Twitter operations: search, read tweets/threads, check profiles.

## When NOT to Use
- **Posting tweets/replies** — bird CLI is blocked by error 226 ("looks automated"). Use browser-based CDP posting instead (DataTransfer + ClipboardEvent on `[data-testid="tweetTextarea_0"]`).
- Reading tweets when you need full thread context — use `web_fetch` on the tweet URL instead.
- bird uses **Chrome cookies** (not Safari). If Chrome isn't logged in, auth will fail.

## Read-Only Commands

**Check auth:**
```bash
bird whoami
bird check
```

**Read tweets/threads:**
```bash
bird read <url-or-id>
bird thread <url-or-id>
```

**Search:**
```bash
bird search "query" -n 5
```

## Auth Sources
- Browser cookies (default: Chrome — **not Safari**)
- Sweetistics API: set `SWEETISTICS_API_KEY` or use `--engine sweetistics`

## Trigger Phrases

✅ Should trigger:
- "search X for..."
- "read this tweet"
- "get thread"
- "check my timeline"
- "bird whoami"

❌ Should NOT trigger:
- "post tweet"
- "reply to this"
- "tweet this out"
- "publish to X"
