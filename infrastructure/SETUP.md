# Infrastructure Setup Guide

Complete setup instructions for the 6-system production AI agent infrastructure.

---

## Prerequisites

- **Python:** 3.9+ (you have 3.9.6 ✓)
- **OpenClaw:** Running with multi-agent squad
- **Disk Space:** ~2GB for vector embeddings and models
- **RAM:** 4GB+ recommended for vector operations

---

## Step 1: Install Dependencies

### Create requirements.txt

```bash
cd /Users/jeffdaniels/.openclaw/workspace/infrastructure
```

Install required packages:

```bash
pip3 install --upgrade pip

# Core dependencies
pip3 install faiss-cpu sentence-transformers

# Optional: Voice transcription (large download ~1GB)
pip3 install openai-whisper

# Verify installations
python3 -c "import faiss; print('FAISS OK')"
python3 -c "import sentence_transformers; print('Transformers OK')"
```

### What You Already Have

✓ numpy  
✓ pandas  
✓ python-dotenv  
✓ requests  
✓ All standard library packages

---

## Step 2: Make Scripts Executable

```bash
cd /Users/jeffdaniels/.openclaw/workspace/infrastructure

# Context Retention
chmod +x context-retention/*.py

# Cross-Agent
chmod +x cross-agent/*.py

# Memory Compound
chmod +x memory-compound/*.py

# Voice Pipeline
chmod +x voice-pipeline/*.py

# Recursive Prompting
chmod +x recursive-prompting/*.py

# Feedback Router
chmod +x feedback-router/*.py
```

---

## Step 3: Initialize Vector Memory

The first run will download the sentence-transformers model (~80MB):

```bash
cd /Users/jeffdaniels/.openclaw/workspace/infrastructure/context-retention

python3 vector-memory.py
```

Expected output:
```
Loading model all-MiniLM-L6-v2...
Downloading model... (first time only)
✓ Whisper model loaded
Vector Memory Stats:
  total_vectors: 0
  dimension: 384
  ...
```

---

## Step 4: Test Each System

### System 1: Context Retention

```bash
# Test hourly summarizer
python3 context-retention/hourly-summarizer.py

# Test semantic recall
python3 context-retention/semantic-recall.py "test query"

# Check vector memory
python3 context-retention/vector-memory.py
```

### System 2: Cross-Agent Intelligence

```bash
# Test signal detector
python3 cross-agent/signal-detector.py

# Test daily sync
python3 cross-agent/daily-sync.py

# Verify PRIORITIES.md exists
cat ../PRIORITIES.md
```

### System 3: Memory Compounding

```bash
# Test feedback logger
python3 memory-compound/feedback-logger.py

# Test mistake tracker
python3 memory-compound/mistake-tracker.py

# Test weekly synthesis
python3 memory-compound/weekly-synthesis.py
```

### System 4: Voice Pipeline

```bash
# Create test directories
mkdir -p ../voice/{incoming,processed,transcripts,extractions}

# Test transcription (if you have an audio file)
# python3 voice-pipeline/transcribe.py /path/to/audio.mp3

# Test extraction
# python3 voice-pipeline/extract-priorities.py /path/to/transcript.json

# Test priority update
python3 voice-pipeline/update-priorities.py
```

### System 5: Recursive Prompting

```bash
# Test three-pass system
python3 recursive-prompting/three-pass.py

# Create integration guide
python3 recursive-prompting/three-pass.py --create-integration
```

### System 6: Feedback Router

```bash
# Test Telegram buttons
python3 feedback-router/telegram-buttons.py

# Create integration guide
python3 feedback-router/telegram-buttons.py --create-guide

# Test decision logger
python3 feedback-router/decision-logger.py
```

---

## Step 5: Set Up Cron Jobs

### Create Cron Schedule

```bash
# Open crontab editor
crontab -e
```

### Add These Entries

```cron
# Infrastructure cron jobs for OpenClaw agents
WORKSPACE=/Users/jeffdaniels/.openclaw/workspace
PYTHON=/usr/bin/python3

# Hourly Memory Summarizer (8am-10pm EST, every hour)
0 8-22 * * * cd $WORKSPACE && $PYTHON infrastructure/context-retention/hourly-summarizer.py >> logs/hourly-summarizer.log 2>&1

# Cross-Signal Detection (every 6 hours)
0 */6 * * * cd $WORKSPACE && $PYTHON infrastructure/cross-agent/signal-detector.py >> logs/signal-detector.log 2>&1

# Daily Context Sync (9pm EST)
0 21 * * * cd $WORKSPACE && $PYTHON infrastructure/cross-agent/daily-sync.py >> logs/daily-sync.log 2>&1

# Weekly Synthesis (Sunday 11pm EST)
0 23 * * 0 cd $WORKSPACE && $PYTHON infrastructure/memory-compound/weekly-synthesis.py >> logs/weekly-synthesis.log 2>&1

# Mistake Tracker (Sunday 11:15pm EST, after synthesis)
15 23 * * 0 cd $WORKSPACE && $PYTHON infrastructure/memory-compound/mistake-tracker.py >> logs/mistake-tracker.log 2>&1

# Decision Pattern Analysis (Daily at midnight)
0 0 * * * cd $WORKSPACE && $PYTHON infrastructure/feedback-router/decision-logger.py analyze 7 >> logs/decision-patterns.log 2>&1

# Process Voice Notes (every 15 minutes during active hours)
*/15 8-22 * * * cd $WORKSPACE && $PYTHON infrastructure/voice-pipeline/transcribe.py >> logs/voice-transcribe.log 2>&1
*/15 8-22 * * * cd $WORKSPACE && $PYTHON infrastructure/voice-pipeline/extract-priorities.py >> logs/voice-extract.log 2>&1
*/15 8-22 * * * cd $WORKSPACE && $PYTHON infrastructure/voice-pipeline/update-priorities.py >> logs/voice-update.log 2>&1
```

### Create Log Directory

```bash
mkdir -p /Users/jeffdaniels/.openclaw/workspace/logs
```

### Verify Cron Setup

```bash
# List cron jobs
crontab -l

# Check cron is running
sudo launchctl list | grep cron
```

**Note:** On macOS, you may need to give Terminal or cron Full Disk Access in System Preferences > Security & Privacy.

---

## Step 6: OpenClaw Integration

### 6a. Agent Startup Hook

Add to each agent's initialization:

```python
# Read priorities
with open('/Users/jeffdaniels/.openclaw/workspace/PRIORITIES.md') as f:
    priorities = f.read()

# Load mistakes
with open('/Users/jeffdaniels/.openclaw/workspace/feedback/mistakes.json') as f:
    mistakes = json.load(f)

# Initialize semantic recall
from infrastructure.context_retention.semantic_recall import SemanticRecall
recall = SemanticRecall()
```

### 6b. Pre-Prompt Hook

Before each agent prompt:

```python
# Semantic recall
context = recall.recall(user_prompt, session_id=current_session)
injected_context = recall.format_for_injection(context)

# Prepend to prompt
full_prompt = injected_context + user_prompt
```

### 6c. Post-Action Hook

After each agent action:

```python
# Add to vector memory
from infrastructure.context_retention.vector_memory import VectorMemory
memory = VectorMemory()
memory.add_conversation(conversation_text, {
    'agent': agent_name,
    'session': session_id,
    'timestamp': datetime.now().isoformat()
})
memory.save()
```

### 6d. Recommendation Flow

When agent makes a recommendation:

```python
from infrastructure.feedback_router.telegram_buttons import TelegramFeedbackRouter

router = TelegramFeedbackRouter()
rec_id = router.send_recommendation(
    title="Recommendation title",
    description="Full description",
    agent=agent_name,
    category="category"
)

# Then use OpenClaw's message tool to actually send
# (See feedback-router/OPENCLAW_INTEGRATION.md)
```

---

## Step 7: Telegram Setup (Optional but Recommended)

### 7a. Verify OpenClaw Telegram Integration

```bash
# Check if Telegram is configured
openclaw config list | grep telegram
```

### 7b. Test Inline Buttons

See `infrastructure/feedback-router/OPENCLAW_INTEGRATION.md` for full Telegram setup.

Key steps:
1. Ensure OpenClaw's message tool supports `reply_markup`
2. Set up callback handler for button clicks
3. Test with a sample recommendation

---

## Step 8: Configuration Files

### Create Config Files

```bash
cd /Users/jeffdaniels/.openclaw/workspace

# Semantic recall config
cat > infrastructure/context-retention/recall-config.json << 'EOF'
{
  "enabled": true,
  "top_k": 5,
  "min_similarity": 0.3,
  "max_context_chars": 2000,
  "exclude_sessions": [],
  "priority_agents": ["main", "bolt", "fury", "nova"]
}
EOF

# Three-pass config
cat > infrastructure/recursive-prompting/three-pass-config.json << 'EOF'
{
  "bolt": {"enabled": true, "threshold": "high"},
  "nova": {"enabled": true, "threshold": "medium"},
  "fury": {"enabled": false},
  "main": {"enabled": true, "threshold": "high"}
}
EOF
```

---

## Step 9: Verify Installation

### Run Full Test Suite

```bash
cd /Users/jeffdaniels/.openclaw/workspace

# Test script
cat > infrastructure/test-all.sh << 'EOF'
#!/bin/bash
set -e

echo "Testing infrastructure systems..."

echo "1. Context Retention..."
python3 infrastructure/context-retention/hourly-summarizer.py
python3 infrastructure/context-retention/vector-memory.py

echo "2. Cross-Agent Intelligence..."
python3 infrastructure/cross-agent/signal-detector.py
python3 infrastructure/cross-agent/daily-sync.py

echo "3. Memory Compounding..."
python3 infrastructure/memory-compound/feedback-logger.py
python3 infrastructure/memory-compound/mistake-tracker.py
python3 infrastructure/memory-compound/weekly-synthesis.py

echo "4. Voice Pipeline..."
python3 infrastructure/voice-pipeline/update-priorities.py

echo "5. Recursive Prompting..."
python3 infrastructure/recursive-prompting/three-pass.py --create-integration

echo "6. Feedback Router..."
python3 infrastructure/feedback-router/telegram-buttons.py --create-guide
python3 infrastructure/feedback-router/decision-logger.py

echo ""
echo "✅ All systems operational!"
EOF

chmod +x infrastructure/test-all.sh
./infrastructure/test-all.sh
```

---

## Step 10: Monitoring

### Create Monitoring Dashboard

```bash
cat > infrastructure/status.sh << 'EOF'
#!/bin/bash

echo "==================================="
echo "Infrastructure Status Dashboard"
echo "==================================="
echo ""

# Vector Memory
echo "Vector Memory:"
if [ -f "memory/vector/faiss.index" ]; then
    SIZE=$(du -h memory/vector/faiss.index | cut -f1)
    echo "  ✓ Index exists ($SIZE)"
else
    echo "  ✗ No index found"
fi

# Hourly Summaries
COUNT=$(ls memory/hourly/*.md 2>/dev/null | wc -l | xargs)
echo "  Hourly summaries: $COUNT files"

# Weekly Synthesis
COUNT=$(ls memory/weekly/*.md 2>/dev/null | wc -l | xargs)
echo "  Weekly synthesis: $COUNT files"

# Feedback
echo ""
echo "Feedback System:"
if [ -f "feedback/mistakes.json" ]; then
    echo "  ✓ Mistakes tracked"
else
    echo "  ✗ No mistakes file"
fi

COUNT=$(ls feedback/feedback-*.json 2>/dev/null | wc -l | xargs)
echo "  Feedback files: $COUNT"

# Priorities
echo ""
echo "Priorities:"
if [ -f "PRIORITIES.md" ]; then
    UPDATED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" PRIORITIES.md)
    echo "  ✓ PRIORITIES.md (updated: $UPDATED)"
else
    echo "  ✗ No PRIORITIES.md"
fi

# Cross-Signals
echo ""
echo "Cross-Agent Intelligence:"
if [ -f "infrastructure/cross-agent/cross-signals.json" ]; then
    echo "  ✓ Cross-signals active"
else
    echo "  ✗ No cross-signals"
fi

# Voice
echo ""
echo "Voice Pipeline:"
PENDING=$(ls voice/incoming/*.{mp3,m4a,ogg,wav} 2>/dev/null | wc -l | xargs)
TRANSCRIPTS=$(ls voice/transcripts/*.json 2>/dev/null | wc -l | xargs)
echo "  Pending voice notes: $PENDING"
echo "  Transcripts: $TRANSCRIPTS"

# Cron
echo ""
echo "Cron Jobs:"
CRON_COUNT=$(crontab -l 2>/dev/null | grep -v "^#" | grep -c "infrastructure" || echo "0")
echo "  Active jobs: $CRON_COUNT"

echo ""
echo "==================================="
EOF

chmod +x infrastructure/status.sh
./infrastructure/status.sh
```

---

## Troubleshooting

### Vector Memory Issues

**Problem:** `ImportError: No module named 'faiss'`  
**Solution:** `pip3 install faiss-cpu`

**Problem:** Slow vector search  
**Solution:** Index might be large. Consider periodic cleanup of old entries.

### Cron Jobs Not Running

**Problem:** Cron jobs not executing  
**Solution:** 
1. Check cron is enabled: `sudo launchctl list | grep cron`
2. Give Terminal Full Disk Access in System Preferences
3. Check logs: `tail -f /Users/jeffdaniels/.openclaw/workspace/logs/*.log`

### Voice Transcription Issues

**Problem:** Whisper model too large  
**Solution:** Use `tiny` or `base` model instead of `medium`

**Problem:** Audio format not supported  
**Solution:** Convert to wav: `ffmpeg -i input.m4a output.wav`

### Telegram Buttons Not Working

**Problem:** Buttons don't appear  
**Solution:** Verify OpenClaw's message tool supports `reply_markup` parameter

**Problem:** Callbacks not handled  
**Solution:** Set up callback handler per `feedback-router/OPENCLAW_INTEGRATION.md`

---

## Maintenance

### Daily
- Check `infrastructure/status.sh` for system health
- Review `logs/` for errors
- Monitor `feedback/pending/` for stuck decisions

### Weekly
- Review `memory/weekly/` synthesis
- Check `feedback/mistakes.json` for patterns
- Update `PRIORITIES.md` if needed

### Monthly
- Clean up old vector embeddings (optional)
- Archive old feedback files
- Review and update agent configurations

---

## Backup

### Critical Files to Backup

```bash
# Create backup script
cat > infrastructure/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="$HOME/openclaw-backups"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP="$BACKUP_DIR/infrastructure-$DATE.tar.gz"

mkdir -p "$BACKUP_DIR"

cd /Users/jeffdaniels/.openclaw/workspace

tar -czf "$BACKUP" \
    PRIORITIES.md \
    memory/ \
    feedback/ \
    shared-learnings/ \
    infrastructure/cross-agent/cross-signals.json \
    voice/transcripts/ \
    voice/extractions/

echo "✓ Backup created: $BACKUP"

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/infrastructure-*.tar.gz | tail -n +8 | xargs rm -f
EOF

chmod +x infrastructure/backup.sh

# Add to cron (daily at 3am)
# 0 3 * * * /Users/jeffdaniels/.openclaw/workspace/infrastructure/backup.sh
```

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Test all systems
3. ✅ Set up cron jobs
4. ✅ Integrate with OpenClaw agents
5. ✅ Configure Telegram (optional)
6. ✅ Set up monitoring
7. ✅ Create backups

**You're ready to go!** 🚀

See `README.md` for system documentation and usage guides.
