# Agent Intelligence Pipeline

Single-file replacement for the 18 fragmented Python scripts in `infrastructure/`.

## What It Does

Reads real OpenClaw session transcripts (`~/.openclaw/agents/{agent}/sessions/*.jsonl`) and generates structured intelligence: hourly summaries, daily rollups, weekly synthesis, and cross-agent signal detection.

## Usage

```bash
python3 agent-intelligence.py status    # Quick one-line status
python3 agent-intelligence.py hourly    # Hourly summary → memory/hourly/
python3 agent-intelligence.py daily     # Daily summary → memory/daily/
python3 agent-intelligence.py weekly    # Weekly synthesis → memory/weekly/
python3 agent-intelligence.py signals   # Cross-agent signals → memory/cross-signals.json
```

## Requirements

- Python 3.8+ (stdlib only, no pip packages)
- Access to `~/.openclaw/agents/` session files

## Output Structure

```
workspace/memory/
├── hourly/          # YYYY-MM-DD-HH.md
├── daily/           # YYYY-MM-DD-summary.md
├── weekly/          # YYYY-WXX.md
├── activity.jsonl   # Append-only daily insights log
└── cross-signals.json
```

## Cron Schedule

See `cron-definitions.json`. Summary:
- **hourly** → every hour 8am–10pm EST
- **daily** → 9pm EST
- **weekly** → Sunday 11pm EST
- **signals** → every 6 hours

## Performance

All commands complete in under 1 second against ~93MB of session data. Uses file modification times to only process recent files.

## Configuration

Edit constants at the top of `agent-intelligence.py`:
- `AGENTS` — list of agent IDs
- `KNOWN_PROJECTS` — topics to detect
- Paths are auto-derived from `~/.openclaw/`

## Future Enhancement: Cost Tracking (Gap 15)
The intelligence pipeline needs a `cost` subcommand to calculate token costs from session JSONL data.
- Anthropic pricing: Sonnet input $3/MTok, output $15/MTok; Opus input $15/MTok, output $75/MTok
- Parse token counts from session JSONL `usage` fields
- Calculate per-agent daily/weekly/monthly costs
- Compare to budget targets in PORTFOLIO.md
- Priority: Add when budget tracking becomes critical (post-revenue)
