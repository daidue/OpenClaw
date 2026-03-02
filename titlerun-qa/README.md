# TitleRun QA Automation

Automated quality assurance testing for TitleRun using agent-browser and dogfood testing methodology.

## Quick Start

### Run Dogfood QA

```bash
# Production (default: app.titlerun.co)
./scripts/run-dogfood.sh

# Localhost
./scripts/run-dogfood.sh http://localhost:3000

# Staging
./scripts/run-dogfood.sh https://staging.titlerun.co
```

## What It Does

The dogfood automation:

1. **Spawns agent-browser session** targeting TitleRun
2. **Runs automated test scenarios** (login, navigation, core features)
3. **Captures screenshots** at each step
4. **Detects issues** and classifies them (CRITICAL, HIGH, MEDIUM, LOW)
5. **Generates report** (`report.md`) with findings
6. **Notifies Rush** when complete

## Output Structure

Each run creates a date-stamped directory:

```
titlerun-qa/dogfood-YYYY-MM-DD/
├── screenshots/          # PNG captures at each test step
├── videos/              # (future) Screen recordings
├── logs/
│   ├── session.log      # Browser session output
│   ├── monitor.log      # Monitoring script output
│   └── *.txt           # Snapshots and debug data
├── report.md           # Final QA report
├── session-info.json   # Session metadata
└── session.pid         # Process ID (while running)
```

## Monitoring

The automation is self-monitoring:

- **Task registered** in `.clawdbot/active-tasks.json`
- **Monitored** by `.clawdbot/scripts/monitor-agents.sh` (runs every 10 min)
- **Notifications** sent via OpenClaw system events
- **Timeout**: 90 minutes max

### Check Status

```bash
# View active tasks
cat .clawdbot/active-tasks.json | jq .

# Monitor logs in real-time
tail -f titlerun-qa/dogfood-$(date +%Y-%m-%d)/logs/session.log

# Check if process is running
ps aux | grep agent-browser
```

## Test Scenarios

Currently automated:

- [ ] Home page load
- [ ] Initial snapshot
- [ ] Screenshot capture

Coming soon (Phase 2):

- [ ] Authentication flow
- [ ] Trade Builder workflow
- [ ] Trade Finder search
- [ ] Report Card generation
- [ ] Error state handling
- [ ] Performance metrics
- [ ] Accessibility checks

## Issue Classification

Issues are automatically classified by severity:

| Level | Description | Examples |
|-------|-------------|----------|
| **CRITICAL** | Broken core functionality, data loss risk | Auth fails, trades don't save |
| **HIGH** | Major UX issues, performance problems | Slow load (>3s), broken navigation |
| **MEDIUM** | Minor UX issues, visual bugs | Misaligned UI, unclear labels |
| **LOW** | Polish, nice-to-haves | Typos, color inconsistencies |

## Schedule

**Production dogfood runs:** Every Sunday at 4:00pm EST

Before each staging deploy, Rush should run:
```bash
./scripts/run-dogfood.sh https://staging.titlerun.co
```

## Integration with Rush

Rush (titlerun agent) is automatically notified when:

- ✅ QA completes successfully (with issue counts)
- ⚠️ QA fails (with error details)
- 🔴 Critical issues found (immediate alert)

Notifications appear in Rush's inbox: `workspace-titlerun/inboxes/rush-inbox.md`

## Troubleshooting

### Session won't start

**Symptom:** Process dies immediately

**Check:**
```bash
# View error log
cat titlerun-qa/dogfood-$(date +%Y-%m-%d)/logs/session.log

# Verify agent-browser installed
agent-browser --version
```

**Fix:** Reinstall agent-browser if needed

### No report generated

**Symptom:** Session completes but no `report.md`

**Possible causes:**
- Browser crash mid-session
- Network timeout
- Insufficient permissions

**Debug:**
1. Check `logs/session.log` for errors
2. Verify screenshots were captured (indicates some progress)
3. Check disk space

### Monitoring not detecting completion

**Symptom:** Task stays "running" forever

**Check:**
```bash
# Is monitoring script running?
ps aux | grep monitor-agents.sh

# Manually check task status
cat .clawdbot/active-tasks.json | jq '.["dogfood-2026-03-01"]'
```

**Fix:** Monitoring runs every 10 minutes via cron. Wait for next cycle or manually run:
```bash
bash .clawdbot/scripts/monitor-agents.sh
```

## Development

### Test on localhost

Before running against production:

```bash
# Start TitleRun locally
cd ~/Documents/Claude\ Cowork\ Business/titlerun
npm run dev

# Run dogfood against localhost
./scripts/run-dogfood.sh http://localhost:3000
```

### Add new test scenarios

Edit the launch script template in `scripts/run-dogfood.sh`:

```bash
# Find the section marked "TODO: Add more automated test steps"
# Add agent-browser commands for new scenarios
```

For complex test flows, see `titlerun-dogfood/SKILL.md` for manual command examples.

## Architecture

```
run-dogfood.sh                    # Main launcher
    ├── Creates output directory
    ├── Registers task
    ├── Spawns agent-browser
    └── Starts monitor-dogfood-task.sh
    
monitor-dogfood-task.sh           # Session-specific monitor
    ├── Checks process every 60s
    ├── Detects completion/failure
    └── Sends notifications

monitor-agents.sh                 # General task monitor
    ├── Runs every 10 min (cron)
    ├── Handles all task types
    └── Updates task registry
```

## Future Enhancements

**Phase 2: Smart Testing**
- Load cognitive profiles (UX, Security, Performance)
- Automated bug classification
- Screenshot comparison (visual regression)
- Console error detection
- Network request analysis

**Phase 3: Regression Suite**
- Golden master baseline
- Automated regression detection
- Performance metrics tracking
- Accessibility compliance (WCAG)
- Cross-browser testing

## Related Skills

- `titlerun-dogfood/` - Manual dogfood testing commands
- `titlerun-code-review/` - Code review framework
- `meta-skill-forge/` - Cognitive profile architecture

---

**Last updated:** 2026-03-01  
**Owner:** Rush (titlerun agent)  
**Status:** Production-ready (Phase 1)
