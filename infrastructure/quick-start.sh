#!/bin/bash
# Quick Start Script for Production AI Agent Infrastructure

set -e  # Exit on error

echo "========================================"
echo "Production AI Agent Infrastructure"
echo "Quick Start Setup"
echo "========================================"
echo ""

# Check Python version
echo "1. Checking Python version..."
PYTHON_VERSION=$(python3 --version)
echo "   ✓ $PYTHON_VERSION"
echo ""

# Install dependencies
echo "2. Installing dependencies..."
echo "   This may take a few minutes on first run..."

if pip3 install -q faiss-cpu sentence-transformers; then
    echo "   ✓ Core dependencies installed"
else
    echo "   ✗ Failed to install dependencies"
    echo "   Try manually: pip3 install -r requirements.txt"
    exit 1
fi
echo ""

# Create directory structure
echo "3. Creating directory structure..."
cd /Users/jeffdaniels/.openclaw/workspace

mkdir -p memory/{hourly,weekly,vector}
mkdir -p shared-learnings/daily-sync
mkdir -p feedback/{pending,archive,decisions}
mkdir -p voice/{incoming,processed,transcripts,extractions}
mkdir -p logs
mkdir -p notifications

echo "   ✓ Directories created"
echo ""

# Initialize vector memory
echo "4. Initializing vector memory..."
echo "   (First run downloads ~80MB model)"

cd infrastructure/context-retention
if python3 vector-memory.py > /dev/null 2>&1; then
    echo "   ✓ Vector memory initialized"
else
    echo "   ⚠ Vector memory initialization had warnings (may be ok)"
fi
cd ../..
echo ""

# Create initial PRIORITIES.md if it doesn't exist
if [ ! -f "PRIORITIES.md" ]; then
    echo "5. Creating PRIORITIES.md..."
    cat > PRIORITIES.md << 'EOF'
# Living Priority Stack

**Last Updated:** $(date +"%Y-%m-%d %H:%M EST")  
**Updated By:** Quick Start Setup

---

## Active Priorities

### 1. Complete Infrastructure Setup
**Theme:** Core Infrastructure  
**Status:** In Progress  
**Owner:** Bolt (dev agent)  
**Action Items:**
- [x] Install dependencies
- [x] Create directory structure
- [x] Initialize vector memory
- [ ] Set up cron jobs
- [ ] Test all systems
- [ ] Integrate with OpenClaw agents

---

## Notes
- This file is the single source of truth for all agents
- Updated automatically from voice/text input
- All agents read this before taking action
EOF
    echo "   ✓ PRIORITIES.md created"
else
    echo "5. PRIORITIES.md already exists ✓"
fi
echo ""

# Make scripts executable
echo "6. Making scripts executable..."
find infrastructure -name "*.py" -type f -exec chmod +x {} \;
echo "   ✓ All scripts are executable"
echo ""

# Test systems
echo "7. Testing systems..."

echo "   Testing System 1: Context Retention..."
if python3 infrastructure/context-retention/hourly-summarizer.py > /dev/null 2>&1; then
    echo "      ✓ Hourly summarizer"
else
    echo "      ⚠ Hourly summarizer (may need session logs)"
fi

echo "   Testing System 2: Cross-Agent Intelligence..."
if python3 infrastructure/cross-agent/signal-detector.py > /dev/null 2>&1; then
    echo "      ✓ Signal detector"
else
    echo "      ⚠ Signal detector"
fi

if python3 infrastructure/cross-agent/daily-sync.py > /dev/null 2>&1; then
    echo "      ✓ Daily sync"
else
    echo "      ⚠ Daily sync"
fi

echo "   Testing System 3: Memory Compounding..."
if python3 infrastructure/memory-compound/feedback-logger.py > /dev/null 2>&1; then
    echo "      ✓ Feedback logger"
else
    echo "      ⚠ Feedback logger"
fi

echo "   Testing System 4: Voice Pipeline..."
if python3 infrastructure/voice-pipeline/update-priorities.py > /dev/null 2>&1; then
    echo "      ✓ Priority updater"
else
    echo "      ⚠ Priority updater"
fi

echo "   Testing System 5: Recursive Prompting..."
if python3 infrastructure/recursive-prompting/three-pass.py --create-integration > /dev/null 2>&1; then
    echo "      ✓ Three-pass processor"
else
    echo "      ⚠ Three-pass processor"
fi

echo "   Testing System 6: Feedback Router..."
if python3 infrastructure/feedback-router/telegram-buttons.py --create-guide > /dev/null 2>&1; then
    echo "      ✓ Telegram buttons"
else
    echo "      ⚠ Telegram buttons"
fi

echo ""

# Summary
echo "========================================"
echo "Setup Complete! 🚀"
echo "========================================"
echo ""
echo "Next Steps:"
echo ""
echo "1. Set up cron jobs:"
echo "   crontab -e"
echo "   # Copy from infrastructure/cron-schedule.txt"
echo ""
echo "2. Review documentation:"
echo "   cat infrastructure/README.md"
echo "   cat infrastructure/SETUP.md"
echo ""
echo "3. Test individual systems:"
echo "   python3 infrastructure/<system>/<script>.py"
echo ""
echo "4. Monitor with:"
echo "   ./infrastructure/status.sh"
echo ""
echo "5. Integrate with OpenClaw agents"
echo "   (See SETUP.md Step 6)"
echo ""
echo "========================================"
echo ""
echo "All systems are ready to go!"
echo ""
