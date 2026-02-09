#!/bin/bash
# Infrastructure Deployment Script
# Sets up all components and dependencies

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="/Users/jeffdaniels/.openclaw/workspace"

echo "=========================================="
echo "Infrastructure Deployment"
echo "=========================================="
echo

# Check Python version
echo "Checking Python version..."
python3 --version || { echo "Error: Python 3 not found"; exit 1; }

# Create directory structure
echo "Creating directory structure..."
mkdir -p "$WORKSPACE/memory/hourly"
mkdir -p "$WORKSPACE/memory/weekly"
mkdir -p "$WORKSPACE/memory/vector"
mkdir -p "$WORKSPACE/feedback"
mkdir -p "$WORKSPACE/feedback/decisions"
mkdir -p "$WORKSPACE/feedback/archive"
mkdir -p "$WORKSPACE/shared-learnings/daily-sync"
mkdir -p "$WORKSPACE/voice/incoming"
mkdir -p "$WORKSPACE/voice/transcripts"
mkdir -p "$WORKSPACE/voice/extractions"
mkdir -p "$WORKSPACE/voice/processed"
mkdir -p "$WORKSPACE/logs/cron"
mkdir -p "$WORKSPACE/logs/infrastructure"
mkdir -p "$WORKSPACE/logs/health"
mkdir -p "$WORKSPACE/backups/infrastructure"
mkdir -p "$WORKSPACE/notifications"

# Set permissions
echo "Setting permissions..."
chmod 700 "$WORKSPACE/feedback"
chmod 700 "$WORKSPACE/memory"
chmod 700 "$WORKSPACE/voice"

# Install Python dependencies
echo "Installing Python dependencies..."
if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    pip3 install -r "$SCRIPT_DIR/requirements.txt"
else
    echo "Warning: requirements.txt not found"
fi

# Make scripts executable
echo "Making scripts executable..."
find "$SCRIPT_DIR" -name "*.py" -exec chmod +x {} \;
chmod +x "$SCRIPT_DIR/common/backup.py"
chmod +x "$SCRIPT_DIR/common/health_check.py"

# Run health check
echo "Running initial health check..."
python3 "$SCRIPT_DIR/common/health_check.py" || echo "Some health checks failed (expected on first run)"

# Setup cron jobs
echo
echo "=========================================="
echo "Cron Setup"
echo "=========================================="
echo
echo "To install cron jobs, run:"
echo "  crontab $SCRIPT_DIR/cron/infrastructure.cron"
echo
echo "Or to append to existing crontab:"
echo "  (crontab -l 2>/dev/null; cat $SCRIPT_DIR/cron/infrastructure.cron) | crontab -"
echo

# Initial backup
echo "Creating initial backup..."
python3 "$SCRIPT_DIR/common/backup.py" all || echo "Backup skipped (no data yet)"

# Test vector memory
echo
echo "Testing vector memory..."
python3 - << 'EOF'
import sys
sys.path.insert(0, '/Users/jeffdaniels/.openclaw/workspace/infrastructure')
from pathlib import Path
try:
    # Try to import and test
    import context_retention.vector_memory as vm
    print("✓ Vector memory module loads successfully")
except Exception as e:
    print(f"✗ Vector memory test failed: {e}")
EOF

echo
echo "=========================================="
echo "Deployment Complete"
echo "=========================================="
echo
echo "Next steps:"
echo "1. Install cron jobs (see above)"
echo "2. Run health check: python3 common/health_check.py"
echo "3. Test voice pipeline: place audio file in voice/incoming/"
echo "4. Monitor logs: tail -f logs/cron/*.log"
echo
echo "Documentation:"
echo "- README: $SCRIPT_DIR/README.md"
echo "- Health checks: python3 common/health_check.py"
echo "- Backups: python3 common/backup.py all"
echo
