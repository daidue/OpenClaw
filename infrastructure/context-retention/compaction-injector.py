#!/usr/bin/env python3
"""
Post-Compaction Context Injector
Detects when conversation context gets compacted
Injects: last 24h of hourly summaries, recent messages, system messages
"""

import os
import json
import datetime
from pathlib import Path
from typing import List, Dict

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
MEMORY_DIR = WORKSPACE / "memory" / "hourly"
CONTEXT_MARKER = Path.home() / ".openclaw" / "context" / "last-compaction.json"

def get_last_24h_summaries() -> str:
    """Read hourly summaries from the last 24 hours"""
    now = datetime.datetime.now()
    summaries = []
    
    # Check today and yesterday
    for days_ago in [0, 1]:
        date = now - datetime.timedelta(days=days_ago)
        date_str = date.strftime("%Y-%m-%d")
        summary_file = MEMORY_DIR / f"{date_str}.md"
        
        if summary_file.exists():
            with open(summary_file, 'r') as f:
                content = f.read()
                summaries.append(content)
    
    if summaries:
        return "\n\n".join(summaries)
    return "No recent summaries available."

def detect_compaction() -> bool:
    """
    Detect if context compaction has occurred
    This is a placeholder - integrate with OpenClaw's session system
    """
    # Check if marker file exists and when it was last updated
    if CONTEXT_MARKER.exists():
        with open(CONTEXT_MARKER, 'r') as f:
            data = json.load(f)
            last_compaction = datetime.datetime.fromisoformat(data['timestamp'])
            
            # If more than 5 minutes have passed, check for compaction
            # FIX: Use total_seconds() instead of seconds property
            if (datetime.datetime.now() - last_compaction).total_seconds() > 300:
                return True
    
    return False

def build_injection_context() -> Dict[str, str]:
    """Build the context to inject after compaction"""
    context = {
        'summaries': get_last_24h_summaries(),
        'timestamp': datetime.datetime.now().isoformat(),
        'type': 'post-compaction-injection'
    }
    
    return context

def inject_context(context: Dict[str, str]) -> None:
    """
    Inject context into the current session
    This needs to integrate with OpenClaw's session management
    """
    # Create injection payload
    injection_file = Path.home() / ".openclaw" / "context" / "injection.json"
    injection_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(injection_file, 'w') as f:
        json.dump(context, f, indent=2)
    
    print(f"✓ Context injection prepared at {injection_file}")
    print(f"  - Summaries: {len(context['summaries'])} chars")
    
    # Update compaction marker
    CONTEXT_MARKER.parent.mkdir(parents=True, exist_ok=True)
    with open(CONTEXT_MARKER, 'w') as f:
        json.dump({
            'timestamp': context['timestamp'],
            'last_injection': context['timestamp']
        }, f, indent=2)

def main():
    """Main entry point"""
    print(f"Checking for context compaction at {datetime.datetime.now()}")
    
    if detect_compaction():
        print("Compaction detected - injecting context")
        context = build_injection_context()
        inject_context(context)
    else:
        print("No compaction detected")

if __name__ == "__main__":
    main()
