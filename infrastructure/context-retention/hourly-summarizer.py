#!/usr/bin/env python3
"""
Hourly Memory Summarizer
Runs every hour during active hours (8am-10pm EST)
Reads current session activity and writes structured summary
"""

import os
import json
import datetime
from pathlib import Path
from collections import defaultdict

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
MEMORY_DIR = WORKSPACE / "memory" / "hourly"
SESSION_LOG = Path.home() / ".openclaw" / "logs" / "sessions.log"

def get_hour_range():
    """Get start and end timestamps for the last hour"""
    now = datetime.datetime.now()
    end_time = now
    start_time = now - datetime.timedelta(hours=1)
    return start_time, end_time

def parse_session_activity(start_time, end_time):
    """Parse recent session activity from logs"""
    topics = set()
    decisions = []
    action_items = []
    tools_used = defaultdict(int)
    stats = {
        'messages': 0,
        'tool_calls': 0,
        'errors': 0
    }
    
    # Read session logs if available
    if SESSION_LOG.exists():
        try:
            with open(SESSION_LOG, 'r') as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        timestamp = datetime.datetime.fromisoformat(entry.get('timestamp', ''))
                        
                        if start_time <= timestamp <= end_time:
                            stats['messages'] += 1
                            
                            # Extract tool usage
                            if 'tool' in entry:
                                tool = entry['tool']
                                tools_used[tool] += 1
                                stats['tool_calls'] += 1
                            
                            # Extract errors
                            if entry.get('level') == 'error':
                                stats['errors'] += 1
                            
                            # Extract topics (simple keyword extraction)
                            if 'message' in entry:
                                msg = entry['message'].lower()
                                # Add keywords that appear to be topics
                                for keyword in ['build', 'create', 'fix', 'update', 'deploy', 
                                              'test', 'debug', 'implement', 'research']:
                                    if keyword in msg:
                                        topics.add(keyword)
                    except (json.JSONDecodeError, ValueError):
                        continue
        except Exception as e:
            print(f"Warning: Could not read session log: {e}")
    
    return {
        'topics': sorted(topics),
        'decisions': decisions,
        'action_items': action_items,
        'tools': dict(tools_used),
        'stats': stats
    }

def write_hourly_summary(activity):
    """Write structured summary to memory file"""
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")
    
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    
    summary_file = MEMORY_DIR / f"{date_str}.md"
    
    # Build summary content
    summary = f"\n## {time_str} EST Summary\n\n"
    
    if activity['topics']:
        summary += "**Topics Discussed:**\n"
        for topic in activity['topics']:
            summary += f"- {topic}\n"
        summary += "\n"
    
    if activity['decisions']:
        summary += "**Decisions Made:**\n"
        for decision in activity['decisions']:
            summary += f"- {decision}\n"
        summary += "\n"
    
    if activity['action_items']:
        summary += "**Action Items:**\n"
        for item in activity['action_items']:
            summary += f"- {item}\n"
        summary += "\n"
    
    if activity['tools']:
        summary += "**Tools Used:**\n"
        for tool, count in sorted(activity['tools'].items(), key=lambda x: x[1], reverse=True):
            summary += f"- {tool}: {count}x\n"
        summary += "\n"
    
    summary += "**Stats:**\n"
    summary += f"- Messages: {activity['stats']['messages']}\n"
    summary += f"- Tool Calls: {activity['stats']['tool_calls']}\n"
    summary += f"- Errors: {activity['stats']['errors']}\n"
    
    # Append to daily file
    mode = 'a' if summary_file.exists() else 'w'
    with open(summary_file, mode) as f:
        if mode == 'w':
            f.write(f"# Hourly Summaries - {date_str}\n")
        f.write(summary)
    
    print(f"✓ Hourly summary written to {summary_file}")

def main():
    """Main entry point"""
    print(f"Running hourly summarizer at {datetime.datetime.now()}")
    
    start_time, end_time = get_hour_range()
    activity = parse_session_activity(start_time, end_time)
    write_hourly_summary(activity)
    
    print("Hourly summarizer complete")

if __name__ == "__main__":
    main()
