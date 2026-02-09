#!/usr/bin/env python3
"""
Daily Context Sync
Cron at 9pm EST: all agents share what they learned
Summarized and distributed to shared-learnings/daily-sync/
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
SYNC_DIR = WORKSPACE / "shared-learnings" / "daily-sync"
MEMORY_DIR = WORKSPACE / "memory" / "hourly"
PRIORITIES_FILE = WORKSPACE / "PRIORITIES.md"

AGENTS = ['main', 'fury', 'nova', 'bolt', 'scout', 'edge', 'atlas']

class DailySync:
    """Daily context synchronization across agents"""
    
    def __init__(self):
        self.today = datetime.now().strftime("%Y-%m-%d")
        self.sync_dir = SYNC_DIR
        self.sync_dir.mkdir(parents=True, exist_ok=True)
    
    def collect_daily_activities(self) -> Dict[str, List[str]]:
        """Collect today's activities from hourly summaries"""
        activities = {
            'topics': set(),
            'decisions': [],
            'tools_used': set(),
            'learnings': []
        }
        
        today_summary = MEMORY_DIR / f"{self.today}.md"
        
        if today_summary.exists():
            with open(today_summary, 'r') as f:
                content = f.read()
                
                # Parse topics
                if "Topics Discussed:" in content:
                    topic_section = content.split("Topics Discussed:")[1].split("\n\n")[0]
                    topics = [line.strip('- ').strip() for line in topic_section.split('\n') if line.strip().startswith('-')]
                    activities['topics'].update(topics)
                
                # Parse tools
                if "Tools Used:" in content:
                    tools_section = content.split("Tools Used:")[1].split("\n\n")[0]
                    tools = [line.split(':')[0].strip('- ').strip() for line in tools_section.split('\n') if line.strip().startswith('-')]
                    activities['tools_used'].update(tools)
        
        return {
            'topics': sorted(activities['topics']),
            'decisions': activities['decisions'],
            'tools_used': sorted(activities['tools_used']),
            'learnings': activities['learnings']
        }
    
    def read_priorities(self) -> List[str]:
        """Read current priorities"""
        priorities = []
        
        if PRIORITIES_FILE.exists():
            with open(PRIORITIES_FILE, 'r') as f:
                content = f.read()
                
                # Extract active priorities
                if "## Active Priorities" in content:
                    section = content.split("## Active Priorities")[1]
                    if "##" in section:
                        section = section.split("##")[0]
                    
                    # Extract priority titles
                    lines = section.split('\n')
                    for line in lines:
                        if line.startswith('###'):
                            priority = line.strip('#').strip()
                            priorities.append(priority)
        
        return priorities
    
    def generate_sync_summary(self, activities: Dict) -> str:
        """Generate daily sync summary"""
        summary = f"""# Daily Sync - {self.today}

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M EST")}  
**Agents:** {', '.join(AGENTS)}

---

## What We Worked On Today

"""
        
        if activities['topics']:
            summary += "**Topics:**\n"
            for topic in activities['topics']:
                summary += f"- {topic}\n"
            summary += "\n"
        
        if activities['decisions']:
            summary += "**Key Decisions:**\n"
            for decision in activities['decisions']:
                summary += f"- {decision}\n"
            summary += "\n"
        
        if activities['tools_used']:
            summary += "**Tools Used:**\n"
            for tool in activities['tools_used']:
                summary += f"- {tool}\n"
            summary += "\n"
        
        summary += "## Key Learnings\n\n"
        
        if activities['learnings']:
            for learning in activities['learnings']:
                summary += f"- {learning}\n"
        else:
            summary += "- (Learnings to be extracted from context)\n"
        
        summary += "\n## Current Priorities\n\n"
        
        priorities = self.read_priorities()
        if priorities:
            for i, priority in enumerate(priorities, 1):
                summary += f"{i}. {priority}\n"
        else:
            summary += "- No priorities defined\n"
        
        summary += "\n## Cross-Agent Signals\n\n"
        
        # Load cross-signals if available
        signals_file = WORKSPACE / "infrastructure" / "cross-agent" / "cross-signals.json"
        if signals_file.exists():
            with open(signals_file, 'r') as f:
                signals_data = json.load(f)
                active_signals = signals_data.get('active_signals', [])
                
                if active_signals:
                    summary += "**Active Cross-Signals:**\n"
                    for signal in active_signals[:10]:  # Top 10
                        summary += f"- **{signal['entity']}** "
                        summary += f"(mentioned by {', '.join(signal['agents'])}, "
                        summary += f"priority: {signal['priority']:.1f})\n"
                else:
                    summary += "- No active cross-signals detected\n"
        else:
            summary += "- Cross-signal detection not yet run\n"
        
        summary += "\n---\n"
        summary += "\n*This summary is automatically distributed to all agents.*\n"
        
        return summary
    
    def save_sync(self, summary: str):
        """Save daily sync summary"""
        sync_file = self.sync_dir / f"{self.today}.md"
        
        with open(sync_file, 'w') as f:
            f.write(summary)
        
        print(f"✓ Daily sync saved to {sync_file}")
    
    def run(self):
        """Run daily sync"""
        print(f"Running daily sync for {self.today}...")
        
        activities = self.collect_daily_activities()
        print(f"  Collected {len(activities['topics'])} topics, {len(activities['tools_used'])} tools")
        
        summary = self.generate_sync_summary(activities)
        self.save_sync(summary)
        
        print(f"✓ Daily sync complete")
        
        return summary

def main():
    """Main entry point"""
    sync = DailySync()
    summary = sync.run()
    
    # Print preview
    print("\n" + "="*60)
    print(summary[:500] + "...")
    print("="*60)

if __name__ == "__main__":
    main()
