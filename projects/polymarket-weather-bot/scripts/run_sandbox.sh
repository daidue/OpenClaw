#!/bin/bash
# Polymarket Weather Bot - Sandbox Run Script
# Runs a single scan cycle in sandbox mode and outputs summary

set -e

# Navigate to project root
cd "$(dirname "$0")/.."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  Polymarket Weather Bot - Sandbox Mode${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    echo -e "${GREEN}✓ Virtual environment found${NC}"
    source .venv/bin/activate
fi

# Verify config is in sandbox mode
if ! grep -q "simmer_mode: sandbox" config.yaml; then
    echo -e "${YELLOW}⚠️  Warning: config.yaml may not be in sandbox mode${NC}"
fi

echo -e "${BLUE}▶ Running bot (single cycle)...${NC}"
echo ""

# Run bot with --once flag for single cycle
python3 bot.py --once

# Check if dashboard was created
if [ -f "dashboard.json" ]; then
    echo ""
    echo -e "${GREEN}✓ Dashboard generated: dashboard.json${NC}"
    
    # Extract key metrics using jq if available
    if command -v jq &> /dev/null; then
        echo ""
        echo -e "${BLUE}📊 Quick Stats:${NC}"
        jq -r '"  Signals Generated: \(.signals_generated)
  Trades Executed: \(.trades.today.count)
  Active Positions: \(.risk.active_positions)
  Daily Exposure: $\(.risk.current_daily_exposure)"' dashboard.json
    fi
else
    echo -e "${YELLOW}⚠️  Dashboard file not found${NC}"
fi

# Copy results to sandbox-results if requested
if [ "$1" == "--save-results" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    RESULTS_FILE="sandbox-results/run_${TIMESTAMP}.json"
    
    if [ -f "dashboard.json" ]; then
        cp dashboard.json "$RESULTS_FILE"
        echo -e "${GREEN}✓ Results saved to: $RESULTS_FILE${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ Run complete!${NC}"
echo -e "${BLUE}=================================================${NC}"
