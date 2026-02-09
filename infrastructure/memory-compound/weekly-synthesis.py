#!/usr/bin/env python3
"""
Weekly Synthesis
Cron every Sunday: review what was recommended → approved/rejected → outcomes
Write to memory/weekly/YYYY-WXX.md
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from common.distributed_lock import DistributedLock

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
WEEKLY_DIR = WORKSPACE / "memory" / "weekly"
FEEDBACK_DIR = WORKSPACE / "feedback"
DAILY_SYNC_DIR = WORKSPACE / "shared-learnings" / "daily-sync"

class WeeklySynthesis:
    """Generate weekly synthesis of activities and outcomes"""
    
    def __init__(self):
        self.today = datetime.now()
        self.week_num = self.today.isocalendar()[1]
        self.year = self.today.year
        self.week_id = f"{self.year}-W{self.week_num:02d}"
        
        WEEKLY_DIR.mkdir(parents=True, exist_ok=True)
    
    def get_week_dates(self) -> tuple:
        """Get start and end dates for current week"""
        # Find Monday of current week
        days_since_monday = self.today.weekday()
        monday = self.today - timedelta(days=days_since_monday)
        sunday = monday + timedelta(days=6)
        
        return monday, sunday
    
    def collect_daily_syncs(self) -> List[Dict]:
        """Collect all daily syncs from this week"""
        monday, sunday = self.get_week_dates()
        syncs = []
        
        current = monday
        while current <= sunday:
            date_str = current.strftime("%Y-%m-%d")
            sync_file = DAILY_SYNC_DIR / f"{date_str}.md"
            
            if sync_file.exists():
                with open(sync_file, 'r') as f:
                    syncs.append({
                        'date': date_str,
                        'content': f.read()
                    })
            
            current += timedelta(days=1)
        
        return syncs
    
    def collect_feedback(self) -> Dict:
        """Collect feedback from this week"""
        feedback_file = FEEDBACK_DIR / f"feedback-{self.week_id}.json"
        
        if feedback_file.exists():
            with open(feedback_file, 'r') as f:
                return json.load(f)
        
        return {
            'approved': [],
            'rejected': [],
            'edited': [],
            'total': 0
        }
    
    def extract_outcomes(self, syncs: List[Dict]) -> Dict:
        """Extract outcomes and patterns from daily syncs"""
        outcomes = {
            'completed': [],
            'in_progress': [],
            'blocked': [],
            'recurring_topics': {},
            'tool_usage': {}
        }
        
        for sync in syncs:
            content = sync['content']
            
            # Extract topics (simple frequency count)
            if "**Topics:**" in content:
                topic_section = content.split("**Topics:**")[1].split("\n\n")[0]
                topics = [line.strip('- ').strip() for line in topic_section.split('\n') if line.strip().startswith('-')]
                
                for topic in topics:
                    outcomes['recurring_topics'][topic] = outcomes['recurring_topics'].get(topic, 0) + 1
            
            # Extract tools
            if "**Tools Used:**" in content:
                tools_section = content.split("**Tools Used:**")[1].split("\n\n")[0]
                tools = [line.strip('- ').strip() for line in tools_section.split('\n') if line.strip().startswith('-')]
                
                for tool in tools:
                    outcomes['tool_usage'][tool] = outcomes['tool_usage'].get(tool, 0) + 1
        
        return outcomes
    
    def generate_weekly_report(self, syncs: List[Dict], feedback: Dict, outcomes: Dict) -> str:
        """Generate weekly synthesis report"""
        monday, sunday = self.get_week_dates()
        
        report = f"""# Weekly Synthesis - {self.week_id}

**Week:** {monday.strftime("%b %d")} - {sunday.strftime("%b %d, %Y")}  
**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M EST")}

---

## Executive Summary

This week we had {len(syncs)} active days with {feedback['total']} decisions logged.

**Approval Rate:** {self._calc_approval_rate(feedback)}%  
**Most Active Day:** {self._find_most_active_day(syncs)}

---

## Key Themes

"""
        
        # Top recurring topics
        if outcomes['recurring_topics']:
            sorted_topics = sorted(outcomes['recurring_topics'].items(), key=lambda x: x[1], reverse=True)
            report += "**Recurring Topics:**\n"
            for topic, count in sorted_topics[:10]:
                report += f"- {topic} ({count} days)\n"
            report += "\n"
        
        report += "## Recommendations → Outcomes\n\n"
        
        # Approved items
        if feedback['approved']:
            report += "### ✓ Approved\n"
            for item in feedback['approved'][:10]:
                report += f"- {item.get('description', 'No description')}\n"
            report += "\n"
        
        # Rejected items with reasons
        if feedback['rejected']:
            report += "### ✗ Rejected\n"
            for item in feedback['rejected'][:10]:
                reason = item.get('reason', 'No reason provided')
                report += f"- {item.get('description', 'No description')}\n"
                report += f"  *Reason:* {reason}\n"
            report += "\n"
        
        # Edited items (patterns of adjustment)
        if feedback['edited']:
            report += "### ✎ Edited\n"
            report += f"- {len(feedback['edited'])} recommendations required editing\n"
            report += "- *Pattern:* Analyze common adjustments for future improvement\n\n"
        
        report += "## Tool Usage Patterns\n\n"
        
        if outcomes['tool_usage']:
            sorted_tools = sorted(outcomes['tool_usage'].items(), key=lambda x: x[1], reverse=True)
            report += "**Most Used Tools:**\n"
            for tool, count in sorted_tools[:10]:
                report += f"- {tool}: {count}x\n"
            report += "\n"
        
        report += "## Learnings & Insights\n\n"
        report += "### What Worked\n"
        report += "- (To be extracted from approved recommendations)\n\n"
        
        report += "### What Didn't Work\n"
        report += "- (To be extracted from rejected recommendations)\n\n"
        
        report += "### Adjustments for Next Week\n"
        report += "- (Based on patterns and feedback)\n\n"
        
        report += "---\n\n"
        report += "*This synthesis feeds back into agent decision-making.*\n"
        
        return report
    
    def _calc_approval_rate(self, feedback: Dict) -> int:
        """Calculate approval rate"""
        if feedback['total'] == 0:
            return 0
        return int((len(feedback['approved']) / feedback['total']) * 100)
    
    def _find_most_active_day(self, syncs: List[Dict]) -> str:
        """Find the most active day"""
        if not syncs:
            return "N/A"
        
        # Simple heuristic: longest sync = most active
        most_active = max(syncs, key=lambda x: len(x['content']))
        return most_active['date']
    
    def save_report(self, report: str):
        """Save weekly synthesis report"""
        report_file = WEEKLY_DIR / f"{self.week_id}.md"
        
        with open(report_file, 'w') as f:
            f.write(report)
        
        print(f"✓ Weekly synthesis saved to {report_file}")
    
    def run(self):
        """Run weekly synthesis"""
        print(f"Running weekly synthesis for {self.week_id}...")
        
        syncs = self.collect_daily_syncs()
        print(f"  Collected {len(syncs)} daily syncs")
        
        feedback = self.collect_feedback()
        print(f"  Collected {feedback['total']} feedback entries")
        
        outcomes = self.extract_outcomes(syncs)
        print(f"  Extracted {len(outcomes['recurring_topics'])} recurring topics")
        
        report = self.generate_weekly_report(syncs, feedback, outcomes)
        self.save_report(report)
        
        print(f"✓ Weekly synthesis complete")
        
        return report

def main():
    """Main entry point"""
    # FIX: Use distributed lock to prevent concurrent runs
    with DistributedLock('weekly-synthesis', timeout_seconds=3600):
        synthesis = WeeklySynthesis()
        report = synthesis.run()
        
        # Print preview
        print("\n" + "="*60)
        print(report[:500] + "...")
        print("="*60)

if __name__ == "__main__":
    main()
