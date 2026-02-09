# Production AI Agent Infrastructure

**Complete implementation of Eric Osiu's 6-system architecture for production AI agents**

Built for OpenClaw multi-agent system (main Jeff, Fury researcher, Nova content, Bolt dev, Scout growth, Edge analytics, Atlas ops).

---

## Overview

This infrastructure transforms AI agents from stateless assistants into learning, coordinated systems with memory, feedback loops, and cross-agent intelligence.

### The 6 Systems

1. **Context Retention** - Never forget what matters
2. **Cross-Agent Shared Intelligence** - Agents learn from each other
3. **Memory Compounding** - Learn from past decisions
4. **Voice → Priority → Action Pipeline** - Voice input drives agent behavior
5. **Recursive Prompting** - Three-pass quality improvement
6. **Feedback Router** - One-tap decisions with pattern learning

---

## System 1: Context Retention

**Purpose:** Maintain continuity across sessions and context windows

### Components

#### 1a. Hourly Memory Summarizer
- **Location:** `context-retention/hourly-summarizer.py`
- **Schedule:** Every hour, 8am-10pm EST
- **Output:** `memory/hourly/YYYY-MM-DD.md`
- **Function:** Summarizes topics, decisions, tools used, stats

```bash
python3 infrastructure/context-retention/hourly-summarizer.py
```

#### 1b. Post-Compaction Context Injector
- **Location:** `context-retention/compaction-injector.py`
- **Trigger:** When context window compacts
- **Function:** Injects last 24h of summaries into fresh context

```bash
python3 infrastructure/context-retention/compaction-injector.py
```

#### 1c. Vector Memory Pipeline
- **Location:** `context-retention/vector-memory.py`
- **Tech:** FAISS + sentence-transformers (all-MiniLM-L6-v2)
- **Performance:** Sub-300ms retrieval
- **Function:** Semantic search across all past conversations

```python
from vector_memory import VectorMemory
memory = VectorMemory()
results = memory.search("agent infrastructure", top_k=5)
```

#### 1d. Semantic Recall Hook
- **Location:** `context-retention/semantic-recall.py`
- **Trigger:** Before every agent prompt
- **Function:** Auto-retrieves relevant past context

```bash
python3 infrastructure/context-retention/semantic-recall.py "query here"
```

---

## System 2: Cross-Agent Shared Intelligence

**Purpose:** Amplify signals across agents, shared learning

### Components

#### 2a. Living Priority Stack
- **Location:** `PRIORITIES.md` (workspace root)
- **Format:** Numbered priorities with themes, owners, action items
- **Access:** All agents read before acting

#### 2b. Cross-Signal Detection
- **Location:** `cross-agent/signal-detector.py`
- **Schedule:** Every 6 hours
- **Output:** `infrastructure/cross-agent/cross-signals.json`
- **Function:** Detect entities appearing in 2+ agent contexts

```bash
python3 infrastructure/cross-agent/signal-detector.py
```

#### 2c. Daily Context Sync
- **Location:** `cross-agent/daily-sync.py`
- **Schedule:** 9pm EST daily
- **Output:** `shared-learnings/daily-sync/YYYY-MM-DD.md`
- **Function:** Share what each agent learned today

```bash
python3 infrastructure/cross-agent/daily-sync.py
```

---

## System 3: Memory Compounding Engine

**Purpose:** Learn from feedback patterns, avoid repeated mistakes

### Components

#### 3a. Weekly Synthesis
- **Location:** `memory-compound/weekly-synthesis.py`
- **Schedule:** Every Sunday at 11pm EST
- **Output:** `memory/weekly/YYYY-WXX.md`
- **Function:** Review recommendations → outcomes → learnings

```bash
python3 infrastructure/memory-compound/weekly-synthesis.py
```

#### 3b. Mistake Tracker
- **Location:** `memory-compound/mistake-tracker.py`
- **Schedule:** Weekly (after synthesis)
- **Output:** `feedback/mistakes.json`
- **Function:** Extract patterns from rejections

```bash
python3 infrastructure/memory-compound/mistake-tracker.py
```

#### 3c. Feedback Loop Logger
- **Location:** `memory-compound/feedback-logger.py`
- **Access:** Used by all systems
- **Function:** Log every approve/reject/edit/skip decision

```python
from feedback_logger import FeedbackLogger
logger = FeedbackLogger()
logger.approve("Task description", agent="bolt")
logger.reject("Task description", "Reason here", agent="nova")
```

---

## System 4: Voice → Priority → Action Pipeline

**Purpose:** Voice notes directly update agent priorities

### Components

#### 4a. Voice Transcription
- **Location:** `voice-pipeline/transcribe.py`
- **Tech:** Whisper (local) or WisprFlow
- **Input:** `voice/incoming/*.{mp3,m4a,ogg,wav}`
- **Output:** `voice/transcripts/*.json`

```bash
python3 infrastructure/voice-pipeline/transcribe.py [audio_file]
```

#### 4b. Structured Extraction
- **Location:** `voice-pipeline/extract-priorities.py`
- **Function:** Extract priorities, decisions, action items
- **Output:** `voice/extractions/*-extraction.json`

```bash
python3 infrastructure/voice-pipeline/extract-priorities.py [transcript_file]
```

#### 4c. Auto Priority Update
- **Location:** `voice-pipeline/update-priorities.py`
- **Function:** Update PRIORITIES.md from extractions
- **Notification:** Alerts all agents of changes

```bash
python3 infrastructure/voice-pipeline/update-priorities.py
```

---

## System 5: Recursive Prompting (3-Pass)

**Purpose:** Improve output quality through self-critique

### How It Works

1. **Pass 1:** Agent generates draft
2. **Pass 2:** Agent critiques own draft (weaknesses, gaps)
3. **Pass 3:** Agent refines based on critique

### Usage

```python
from three_pass import ThreePassProcessor

processor = ThreePassProcessor(agent_name='bolt')
result = processor.process(
    prompt="Build a deployment script",
    context={'environment': 'production'}
)

final_output = result['final_output']
```

**When to use:**
- Complex technical implementations
- Important communications
- High-stakes decisions
- Novel problem-solving

**When to skip:**
- Simple queries
- Routine tasks
- Time-sensitive operations

See `recursive-prompting/INTEGRATION.md` for full details.

---

## System 6: Feedback Router + Inline Decision Interface

**Purpose:** One-tap decisions with pattern reinforcement

### Components

#### 6a. Telegram Inline Buttons
- **Location:** `feedback-router/telegram-buttons.py`
- **Integration:** OpenClaw message system
- **Buttons:** Approve / Reject / Edit / Skip

```python
from telegram_buttons import TelegramFeedbackRouter

router = TelegramFeedbackRouter()
rec_id = router.send_recommendation(
    title="Deploy to production",
    description="All tests passing",
    agent="atlas",
    category="deployment"
)
```

#### 6b. Decision Logger
- **Location:** `feedback-router/decision-logger.py`
- **Function:** Analyze decision patterns, provide agent feedback
- **Output:** `feedback/decision-patterns.json`

```bash
# Analyze patterns
python3 infrastructure/feedback-router/decision-logger.py analyze 7

# Get agent feedback
python3 infrastructure/feedback-router/decision-logger.py feedback bolt
```

See `feedback-router/OPENCLAW_INTEGRATION.md` for Telegram setup.

---

## Directory Structure

```
workspace/
├── infrastructure/
│   ├── context-retention/
│   │   ├── hourly-summarizer.py
│   │   ├── compaction-injector.py
│   │   ├── vector-memory.py
│   │   └── semantic-recall.py
│   ├── cross-agent/
│   │   ├── signal-detector.py
│   │   ├── daily-sync.py
│   │   └── cross-signals.json
│   ├── memory-compound/
│   │   ├── weekly-synthesis.py
│   │   ├── mistake-tracker.py
│   │   └── feedback-logger.py
│   ├── voice-pipeline/
│   │   ├── transcribe.py
│   │   ├── extract-priorities.py
│   │   └── update-priorities.py
│   ├── recursive-prompting/
│   │   ├── three-pass.py
│   │   └── INTEGRATION.md
│   └── feedback-router/
│       ├── telegram-buttons.py
│       ├── decision-logger.py
│       └── OPENCLAW_INTEGRATION.md
├── memory/
│   ├── hourly/           # Hourly summaries
│   ├── weekly/           # Weekly synthesis
│   └── vector/           # FAISS index
├── shared-learnings/
│   └── daily-sync/       # Daily agent sync
├── feedback/
│   ├── pending/          # Pending decisions
│   ├── archive/          # Completed decisions
│   ├── decisions/        # Decision logs
│   ├── mistakes.json     # Mistake patterns
│   └── feedback-*.json   # Weekly feedback
├── voice/
│   ├── incoming/         # Voice notes to process
│   ├── processed/        # Processed voice notes
│   ├── transcripts/      # Transcriptions
│   └── extractions/      # Extracted priorities
└── PRIORITIES.md         # Living priority stack
```

---

## Key Features

### 🧠 Never Forget
- Hourly summaries maintain continuity
- Vector search retrieves relevant past context
- Compaction injection prevents amnesia

### 🤝 Cross-Agent Learning
- Signals amplified when seen by multiple agents
- Daily sync shares learnings
- Shared priority stack keeps everyone aligned

### 📈 Continuous Improvement
- Weekly synthesis tracks what works
- Mistake tracker prevents repeated errors
- Decision patterns inform future behavior

### 🎤 Voice-First
- Voice notes → transcription → priorities → action
- No manual priority management
- Agents respond to natural input

### ✨ Quality Assurance
- Three-pass prompting for complex tasks
- Self-critique before delivery
- Iterative refinement

### 👍 Frictionless Feedback
- One-tap decisions via Telegram
- Instant pattern learning
- Agent-specific feedback loops

---

## Integration with OpenClaw

### Agent Startup Sequence

1. **Read PRIORITIES.md** - Know what matters today
2. **Load mistakes.json** - Don't repeat errors
3. **Check cross-signals.json** - Amplify important topics
4. **Semantic recall hook** - Retrieve relevant context

### Before Each Action

1. **Semantic recall** - Pull relevant past context
2. **Check priorities** - Align with current goals
3. **Review mistakes** - Avoid known pitfalls
4. **Three-pass** (if complex) - Ensure quality

### After Each Action

1. **Log to hourly summary** - Record activity
2. **Update vector memory** - Index conversation
3. **Send for feedback** (if recommendation) - Get approval

---

## Performance

- **Vector search:** <300ms
- **Hourly summary:** ~5s
- **Cross-signal detection:** ~10s
- **Voice transcription:** ~2s per minute of audio
- **Three-pass processing:** 3x normal generation time

---

## Dependencies

See `SETUP.md` for installation instructions.

Key packages:
- `faiss-cpu` - Vector similarity search
- `sentence-transformers` - Text embeddings
- `openai-whisper` - Voice transcription (optional)
- Standard library for everything else

---

## Maintenance

### Daily (Automated)
- Hourly summaries (8am-10pm EST)
- Daily sync (9pm EST)
- Cross-signal detection (4x daily)

### Weekly (Automated)
- Weekly synthesis (Sunday 11pm EST)
- Mistake pattern extraction
- Decision pattern analysis

### Manual
- Review `PRIORITIES.md` regularly
- Check `feedback/mistakes.json` for patterns
- Monitor `memory/weekly/` for learnings

---

## Credits

**Architecture:** Eric Osiu's production AI agent article  
**Implementation:** Bolt (dev agent) for OpenClaw  
**Built:** 2026-02-09  

---

## Next Steps

See `SETUP.md` for installation and configuration.

For questions or issues, check individual component documentation or integration guides.
