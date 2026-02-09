#!/usr/bin/env python3
"""
Auto Priority Update
Update PRIORITIES.md automatically from extracted priorities
Notify all agents of priority change
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
PRIORITIES_FILE = WORKSPACE / "PRIORITIES.md"
EXTRACTIONS_DIR = WORKSPACE / "voice" / "extractions"
PRIORITY_HISTORY = WORKSPACE / "voice" / "priority-history.json"

class PriorityUpdater:
    """Update priorities from voice extractions"""
    
    def __init__(self):
        self.priorities_file = PRIORITIES_FILE
        self.history = self.load_history()
    
    def load_history(self) -> Dict:
        """Load priority update history"""
        if PRIORITY_HISTORY.exists():
            with open(PRIORITY_HISTORY, 'r') as f:
                return json.load(f)
        
        return {'updates': [], 'last_update': None}
    
    def save_history(self):
        """Save priority update history"""
        with open(PRIORITY_HISTORY, 'w') as f:
            json.dump(self.history, f, indent=2)
    
    def read_current_priorities(self) -> str:
        """Read current PRIORITIES.md"""
        if self.priorities_file.exists():
            with open(self.priorities_file, 'r') as f:
                return f.read()
        return ""
    
    def parse_priorities(self, content: str) -> List[Dict]:
        """Parse existing priorities from PRIORITIES.md"""
        priorities = []
        
        if "## Active Priorities" not in content:
            return priorities
        
        section = content.split("## Active Priorities")[1]
        if "##" in section:
            section = section.split("##")[0]
        
        # Split by ### (priority headers)
        parts = section.split("###")[1:]  # Skip first empty part
        
        for part in parts:
            lines = part.strip().split('\n')
            if not lines:
                continue
            
            # First line is the title
            title = lines[0].strip()
            
            # Parse metadata
            priority = {
                'title': title,
                'theme': '',
                'status': 'Not Started',
                'owner': '',
                'action_items': []
            }
            
            for line in lines[1:]:
                if line.startswith('**Theme:**'):
                    priority['theme'] = line.split('**Theme:**')[1].strip()
                elif line.startswith('**Status:**'):
                    priority['status'] = line.split('**Status:**')[1].strip()
                elif line.startswith('**Owner:**'):
                    priority['owner'] = line.split('**Owner:**')[1].strip()
                elif line.strip().startswith('- [ ]') or line.strip().startswith('- [x]'):
                    action_item = line.strip()[6:].strip()  # Remove checkbox
                    priority['action_items'].append(action_item)
            
            priorities.append(priority)
        
        return priorities
    
    def format_priority(self, priority: Dict, index: int) -> str:
        """Format a priority for PRIORITIES.md"""
        md = f"\n### {index}. {priority['title']}\n"
        md += f"**Theme:** {priority.get('theme', 'General')}\n"
        md += f"**Status:** {priority.get('status', 'Not Started')}\n"
        md += f"**Owner:** {priority.get('owner', 'Unassigned')}\n"
        md += "**Action Items:**\n"
        
        action_items = priority.get('action_items', [])
        if action_items:
            for item in action_items:
                md += f"- [ ] {item}\n"
        else:
            md += "- [ ] (To be defined)\n"
        
        return md
    
    def update_from_extraction(self, extraction: Dict) -> List[Dict]:
        """
        Create priority entries from extraction
        
        Returns list of new priorities
        """
        new_priorities = []
        
        # Convert extracted priorities to priority format
        for extracted in extraction.get('priorities', []):
            priority = {
                'title': extracted['text'][:100],  # Truncate long titles
                'theme': 'From Voice Note',
                'status': 'Not Started',
                'owner': 'Unassigned',
                'action_items': [],
                'source': 'voice_extraction',
                'extracted_at': extraction.get('timestamp')
            }
            new_priorities.append(priority)
        
        # Add action items as priorities if they're significant
        for action in extraction.get('action_items', []):
            if len(action['text']) > 20:  # Only substantial actions
                priority = {
                    'title': action['text'][:100],
                    'theme': 'Action Item',
                    'status': 'Not Started',
                    'owner': action.get('assigned_to', 'Unassigned'),
                    'action_items': [action['text']],
                    'source': 'voice_extraction',
                    'extracted_at': extraction.get('timestamp')
                }
                new_priorities.append(priority)
        
        return new_priorities[:5]  # Limit to top 5
    
    def merge_priorities(self, current: List[Dict], new: List[Dict]) -> List[Dict]:
        """
        Merge new priorities with existing ones
        
        Deduplicates by title similarity
        """
        merged = current.copy()
        
        for new_priority in new:
            # Check if similar priority exists
            similar = False
            new_title_lower = new_priority['title'].lower()
            
            for existing in merged:
                existing_title_lower = existing['title'].lower()
                
                # Simple similarity check
                if new_title_lower in existing_title_lower or existing_title_lower in new_title_lower:
                    similar = True
                    break
            
            if not similar:
                merged.append(new_priority)
        
        return merged
    
    def write_priorities(self, priorities: List[Dict]):
        """Write updated priorities to PRIORITIES.md"""
        content = f"""# Living Priority Stack

**Last Updated:** {datetime.now().strftime("%Y-%m-%d %H:%M EST")}  
**Updated By:** Voice Pipeline (Automated)

---

## Active Priorities
"""
        
        # Add each priority
        for i, priority in enumerate(priorities, 1):
            content += self.format_priority(priority, i)
        
        content += """
---

## Completed This Week
- (Completed priorities will be tracked here)

---

## Notes
- This file is the single source of truth for all agents
- Updated automatically from voice/text input
- All agents read this before taking action
- Priorities are numbered by importance
"""
        
        # Backup old file
        if self.priorities_file.exists():
            backup = self.priorities_file.with_suffix('.md.bak')
            self.priorities_file.rename(backup)
        
        # Write new file
        with open(self.priorities_file, 'w') as f:
            f.write(content)
        
        print(f"✓ Updated {self.priorities_file}")
    
    def notify_agents(self, num_new_priorities: int):
        """
        Notify all agents of priority change
        
        In production, this would integrate with OpenClaw's messaging system
        """
        notification_file = WORKSPACE / "notifications" / f"priority-update-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        notification_file.parent.mkdir(parents=True, exist_ok=True)
        
        notification = {
            'type': 'priority_update',
            'timestamp': datetime.now().isoformat(),
            'message': f'{num_new_priorities} new priorities added from voice note',
            'action': 'read_priorities',
            'priority_file': str(self.priorities_file)
        }
        
        with open(notification_file, 'w') as f:
            json.dump(notification, f, indent=2)
        
        print(f"✓ Notification sent to agents")
    
    def process_extraction(self, extraction_path: Path) -> bool:
        """Process a single extraction and update priorities"""
        print(f"Processing {extraction_path.name}...")
        
        # Load extraction
        with open(extraction_path, 'r') as f:
            extraction = json.load(f)
        
        # Get new priorities from extraction
        new_priorities = self.update_from_extraction(extraction)
        
        if not new_priorities:
            print("  No priorities found in extraction")
            return False
        
        print(f"  Found {len(new_priorities)} new priorities")
        
        # Read and parse current priorities
        current_content = self.read_current_priorities()
        current_priorities = self.parse_priorities(current_content)
        
        print(f"  Current priorities: {len(current_priorities)}")
        
        # Merge
        merged = self.merge_priorities(current_priorities, new_priorities)
        
        print(f"  Merged priorities: {len(merged)}")
        
        # Write updated priorities
        self.write_priorities(merged)
        
        # Notify agents
        self.notify_agents(len(new_priorities))
        
        # Update history
        self.history['updates'].append({
            'timestamp': datetime.now().isoformat(),
            'extraction_file': str(extraction_path),
            'priorities_added': len(new_priorities),
            'total_priorities': len(merged)
        })
        self.history['last_update'] = datetime.now().isoformat()
        self.save_history()
        
        print(f"✓ Priority update complete")
        
        return True
    
    def process_all_extractions(self):
        """Process all new extractions"""
        extraction_files = list(EXTRACTIONS_DIR.glob("*-extraction.json"))
        
        if not extraction_files:
            print("No extractions to process")
            return
        
        print(f"Found {len(extraction_files)} extractions")
        
        processed = 0
        for extraction_file in extraction_files:
            # Check if already processed
            already_processed = any(
                update['extraction_file'] == str(extraction_file)
                for update in self.history.get('updates', [])
            )
            
            if not already_processed:
                if self.process_extraction(extraction_file):
                    processed += 1
            else:
                print(f"Skipping {extraction_file.name} (already processed)")
        
        print(f"\n✓ Processed {processed} new extractions")

def main():
    """Main entry point"""
    import sys
    
    updater = PriorityUpdater()
    
    if len(sys.argv) > 1:
        # Process specific extraction
        extraction_path = Path(sys.argv[1])
        
        if extraction_path.exists():
            updater.process_extraction(extraction_path)
        else:
            print(f"Error: File not found: {extraction_path}")
    else:
        # Process all new extractions
        updater.process_all_extractions()

if __name__ == "__main__":
    main()
