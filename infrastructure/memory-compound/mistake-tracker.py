#!/usr/bin/env python3
"""
Mistake Tracker
Track patterns of rejections with WHY
Agents read this before acting to avoid repeating mistakes
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List
from collections import defaultdict

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
MISTAKES_FILE = WORKSPACE / "feedback" / "mistakes.json"
FEEDBACK_DIR = WORKSPACE / "feedback"

class MistakeTracker:
    """Track and analyze patterns in rejected recommendations"""
    
    def __init__(self):
        MISTAKES_FILE.parent.mkdir(parents=True, exist_ok=True)
        self.mistakes = self.load_mistakes()
    
    def load_mistakes(self) -> Dict:
        """Load existing mistake patterns"""
        if MISTAKES_FILE.exists():
            with open(MISTAKES_FILE, 'r') as f:
                return json.load(f)
        
        return {
            'patterns': [],
            'categories': {},
            'total_mistakes': 0,
            'last_updated': None
        }
    
    def save_mistakes(self):
        """Save mistakes to disk"""
        self.mistakes['last_updated'] = datetime.now().isoformat()
        
        with open(MISTAKES_FILE, 'w') as f:
            json.dump(self.mistakes, f, indent=2)
        
        print(f"✓ Mistakes saved to {MISTAKES_FILE}")
    
    def collect_rejections(self) -> List[Dict]:
        """Collect all rejections from feedback files"""
        rejections = []
        
        # Scan all feedback files
        if FEEDBACK_DIR.exists():
            for feedback_file in FEEDBACK_DIR.glob("feedback-*.json"):
                try:
                    with open(feedback_file, 'r') as f:
                        data = json.load(f)
                        
                        for rejection in data.get('rejected', []):
                            rejections.append({
                                'description': rejection.get('description', ''),
                                'reason': rejection.get('reason', ''),
                                'timestamp': rejection.get('timestamp', ''),
                                'agent': rejection.get('agent', 'unknown'),
                                'category': rejection.get('category', 'uncategorized')
                            })
                except (json.JSONDecodeError, Exception) as e:
                    print(f"Warning: Could not read {feedback_file}: {e}")
        
        return rejections
    
    def categorize_mistake(self, rejection: Dict) -> str:
        """Categorize a mistake based on reason"""
        reason = rejection['reason'].lower()
        
        # Simple keyword-based categorization
        categories = {
            'timing': ['too early', 'too late', 'wrong time', 'not ready'],
            'accuracy': ['incorrect', 'wrong', 'inaccurate', 'error', 'mistake'],
            'relevance': ['irrelevant', 'off-topic', 'not needed', 'unnecessary'],
            'tone': ['too formal', 'too casual', 'unprofessional', 'tone'],
            'completeness': ['incomplete', 'missing', 'not enough', 'partial'],
            'format': ['wrong format', 'formatting', 'structure', 'layout'],
            'context': ['context', 'misunderstood', 'misinterpreted', 'assumption']
        }
        
        for category, keywords in categories.items():
            if any(keyword in reason for keyword in keywords):
                return category
        
        return 'other'
    
    def extract_patterns(self, rejections: List[Dict]) -> List[Dict]:
        """Extract patterns from rejections"""
        patterns = []
        
        # Group by category
        by_category = defaultdict(list)
        
        for rejection in rejections:
            category = self.categorize_mistake(rejection)
            by_category[category].append(rejection)
        
        # Create patterns
        for category, items in by_category.items():
            if len(items) >= 2:  # Only create pattern if repeated 2+ times
                pattern = {
                    'category': category,
                    'count': len(items),
                    'examples': [
                        {
                            'description': item['description'],
                            'reason': item['reason'],
                            'agent': item['agent']
                        }
                        for item in items[:3]  # Keep top 3 examples
                    ],
                    'lesson': self._generate_lesson(category, items),
                    'first_seen': min(item['timestamp'] for item in items if item['timestamp']),
                    'last_seen': max(item['timestamp'] for item in items if item['timestamp'])
                }
                patterns.append(pattern)
        
        # Sort by count (most frequent first)
        patterns.sort(key=lambda x: x['count'], reverse=True)
        
        return patterns
    
    def _generate_lesson(self, category: str, items: List[Dict]) -> str:
        """Generate lesson learned from pattern"""
        lessons = {
            'timing': "Verify timing and readiness before making recommendations. Check if prerequisites are met.",
            'accuracy': "Double-check facts and data before presenting. Validate information from multiple sources.",
            'relevance': "Ensure recommendations align with current priorities and context. Ask if unclear.",
            'tone': "Match communication style to context and audience. Adjust formality as needed.",
            'completeness': "Provide complete information. Include all necessary details and context.",
            'format': "Follow established formats and structures. Check formatting guidelines first.",
            'context': "Verify understanding of context before acting. Ask clarifying questions when uncertain.",
            'other': "Review feedback carefully. Look for specific reasons and adjust accordingly."
        }
        
        return lessons.get(category, "Learn from feedback and adjust approach.")
    
    def update_patterns(self, new_patterns: List[Dict]):
        """Update mistake patterns"""
        # Merge with existing patterns (dedupe by category)
        existing_categories = {p['category'] for p in self.mistakes['patterns']}
        
        updated_patterns = []
        
        # Update existing patterns
        for pattern in self.mistakes['patterns']:
            # Find matching new pattern
            new_pattern = next((p for p in new_patterns if p['category'] == pattern['category']), None)
            
            if new_pattern:
                # Update count and examples
                pattern['count'] = new_pattern['count']
                pattern['examples'] = new_pattern['examples']
                pattern['last_seen'] = new_pattern['last_seen']
            
            updated_patterns.append(pattern)
        
        # Add new patterns
        for pattern in new_patterns:
            if pattern['category'] not in existing_categories:
                updated_patterns.append(pattern)
        
        self.mistakes['patterns'] = updated_patterns
        self.mistakes['total_mistakes'] = sum(p['count'] for p in updated_patterns)
        
        # Update categories summary
        self.mistakes['categories'] = {
            p['category']: p['count'] 
            for p in updated_patterns
        }
    
    def get_lessons(self) -> List[str]:
        """Get all lessons learned"""
        return [p['lesson'] for p in self.mistakes['patterns']]
    
    def run(self):
        """Run mistake tracking and analysis"""
        print("Collecting rejections from feedback...")
        rejections = self.collect_rejections()
        
        print(f"  Found {len(rejections)} rejections")
        
        if rejections:
            print("Extracting patterns...")
            patterns = self.extract_patterns(rejections)
            
            print(f"  Identified {len(patterns)} patterns")
            
            if patterns:
                print("\nTop Mistake Patterns:")
                for pattern in patterns[:5]:
                    print(f"  • {pattern['category'].title()}: {pattern['count']} occurrences")
                    print(f"    Lesson: {pattern['lesson']}")
            
            self.update_patterns(patterns)
            self.save_mistakes()
        else:
            print("  No rejections found (this is good!)")
        
        print(f"\n✓ Mistake tracking complete")

def main():
    """Main entry point"""
    tracker = MistakeTracker()
    tracker.run()
    
    # Display lessons
    lessons = tracker.get_lessons()
    if lessons:
        print("\n" + "="*60)
        print("LESSONS LEARNED (for agents to read before acting):")
        print("="*60)
        for i, lesson in enumerate(lessons, 1):
            print(f"\n{i}. {lesson}")
        print("\n" + "="*60)

if __name__ == "__main__":
    main()
