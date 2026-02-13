#!/usr/bin/env python3
"""Analyze skill usage across OpenClaw sessions."""

import json
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime

SESSIONS_DIR = Path.home() / ".openclaw" / "sessions"
SKILL_NAMES = [
    "expert-panel", "autonomous-governance", "bird", "notion-api-builder",
    "gtm-playbook", "titlerun-code-review", "titlerun-dev",
    "polymarket-trading", "x-reply-strategy"
]

def analyze_sessions():
    """Scan all session JSONL files for skill usage."""
    skill_counts = defaultdict(int)
    agent_skill_map = defaultdict(lambda: defaultdict(int))
    sessions_scanned = 0
    
    if not SESSIONS_DIR.exists():
        print(f"Sessions directory not found: {SESSIONS_DIR}")
        return
    
    for session_file in SESSIONS_DIR.glob("*.jsonl"):
        sessions_scanned += 1
        agent = extract_agent_from_filename(session_file.name)
        
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        data = json.loads(line.strip())
                        content = json.dumps(data).lower()
                        
                        # Check for skill references
                        for skill in SKILL_NAMES:
                            if skill in content or skill.replace('-', ' ') in content:
                                skill_counts[skill] += 1
                                agent_skill_map[agent][skill] += 1
                            
                            # Also check for SKILL.md references
                            if f"{skill}/skill.md" in content or f"{skill}/SKILL.md" in content:
                                skill_counts[skill] += 1
                                agent_skill_map[agent][skill] += 1
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"Error reading {session_file}: {e}")
    
    # Generate report
    print("=" * 60)
    print(f"SKILL USAGE ANALYTICS — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    print(f"\nSessions scanned: {sessions_scanned}")
    
    print("\n## Overall Skill Usage (mentions across all sessions)")
    print("-" * 60)
    sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
    for skill, count in sorted_skills:
        print(f"  {skill:25s} {count:6d} mentions")
    
    # Skills never loaded
    unused_skills = [s for s in SKILL_NAMES if skill_counts.get(s, 0) == 0]
    if unused_skills:
        print(f"\n## Unused Skills ({len(unused_skills)})")
        print("-" * 60)
        for skill in unused_skills:
            print(f"  - {skill}")
    
    # Per-agent breakdown
    print("\n## Agent → Skill Mapping")
    print("-" * 60)
    for agent in sorted(agent_skill_map.keys()):
        skills = agent_skill_map[agent]
        total = sum(skills.values())
        print(f"\n{agent} ({total} total mentions):")
        for skill, count in sorted(skills.items(), key=lambda x: x[1], reverse=True):
            print(f"  {skill:25s} {count:6d}")
    
    print("\n" + "=" * 60)

def extract_agent_from_filename(filename):
    """Extract agent name from session filename."""
    # Patterns: agent_main_*, agent_commerce_*, etc.
    parts = filename.replace('.jsonl', '').split('_')
    if len(parts) >= 2 and parts[0] == 'agent':
        return parts[1]
    return 'unknown'

if __name__ == "__main__":
    analyze_sessions()
