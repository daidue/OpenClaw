#!/usr/bin/env python3
"""
Feedback Loop Logger
Log every approve/reject/edit decision
Pattern extraction weekly
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Literal

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
FEEDBACK_DIR = WORKSPACE / "feedback"

FeedbackType = Literal['approved', 'rejected', 'edited', 'skipped']

class FeedbackLogger:
    """Log and track all user feedback on agent recommendations"""
    
    def __init__(self):
        FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
        self.current_week = self._get_week_id()
        self.feedback_file = FEEDBACK_DIR / f"feedback-{self.current_week}.json"
        self.feedback = self.load_feedback()
    
    def _get_week_id(self) -> str:
        """Get current week ID (YYYY-WXX)"""
        today = datetime.now()
        week_num = today.isocalendar()[1]
        return f"{today.year}-W{week_num:02d}"
    
    def load_feedback(self) -> Dict:
        """Load feedback for current week"""
        if self.feedback_file.exists():
            with open(self.feedback_file, 'r') as f:
                return json.load(f)
        
        return {
            'week': self.current_week,
            'approved': [],
            'rejected': [],
            'edited': [],
            'skipped': [],
            'total': 0,
            'created': datetime.now().isoformat(),
            'last_updated': None
        }
    
    def save_feedback(self):
        """Save feedback to disk"""
        self.feedback['last_updated'] = datetime.now().isoformat()
        self.feedback['total'] = sum([
            len(self.feedback['approved']),
            len(self.feedback['rejected']),
            len(self.feedback['edited']),
            len(self.feedback['skipped'])
        ])
        
        with open(self.feedback_file, 'w') as f:
            json.dump(self.feedback, f, indent=2)
        
        print(f"✓ Feedback saved to {self.feedback_file}")
    
    def log(
        self, 
        feedback_type: FeedbackType,
        description: str,
        agent: str = 'unknown',
        category: str = 'general',
        reason: str = None,
        metadata: Dict = None
    ) -> Dict:
        """
        Log a feedback event
        
        Args:
            feedback_type: approved/rejected/edited/skipped
            description: What was being recommended
            agent: Which agent made the recommendation
            category: Category of recommendation
            reason: Why it was rejected/edited (if applicable)
            metadata: Additional context
        
        Returns:
            The logged feedback entry
        """
        entry = {
            'description': description,
            'agent': agent,
            'category': category,
            'timestamp': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        if reason:
            entry['reason'] = reason
        
        # Add to appropriate list
        self.feedback[feedback_type].append(entry)
        
        # Save immediately
        self.save_feedback()
        
        print(f"✓ Logged {feedback_type}: {description[:50]}...")
        
        return entry
    
    def approve(self, description: str, agent: str = 'unknown', **kwargs) -> Dict:
        """Log an approval"""
        return self.log('approved', description, agent, **kwargs)
    
    def reject(self, description: str, reason: str, agent: str = 'unknown', **kwargs) -> Dict:
        """Log a rejection"""
        return self.log('rejected', description, agent, reason=reason, **kwargs)
    
    def edit(self, description: str, reason: str, agent: str = 'unknown', **kwargs) -> Dict:
        """Log an edit"""
        return self.log('edited', description, agent, reason=reason, **kwargs)
    
    def skip(self, description: str, agent: str = 'unknown', **kwargs) -> Dict:
        """Log a skip"""
        return self.log('skipped', description, agent, **kwargs)
    
    def get_stats(self) -> Dict:
        """Get feedback statistics"""
        total = self.feedback['total']
        
        if total == 0:
            return {
                'total': 0,
                'approval_rate': 0,
                'rejection_rate': 0,
                'edit_rate': 0,
                'skip_rate': 0
            }
        
        return {
            'total': total,
            'approved': len(self.feedback['approved']),
            'rejected': len(self.feedback['rejected']),
            'edited': len(self.feedback['edited']),
            'skipped': len(self.feedback['skipped']),
            'approval_rate': len(self.feedback['approved']) / total * 100,
            'rejection_rate': len(self.feedback['rejected']) / total * 100,
            'edit_rate': len(self.feedback['edited']) / total * 100,
            'skip_rate': len(self.feedback['skipped']) / total * 100
        }
    
    def get_by_agent(self) -> Dict[str, Dict]:
        """Get feedback breakdown by agent"""
        by_agent = {}
        
        for feedback_type in ['approved', 'rejected', 'edited', 'skipped']:
            for entry in self.feedback[feedback_type]:
                agent = entry['agent']
                
                if agent not in by_agent:
                    by_agent[agent] = {
                        'approved': 0,
                        'rejected': 0,
                        'edited': 0,
                        'skipped': 0
                    }
                
                by_agent[agent][feedback_type] += 1
        
        return by_agent
    
    def get_by_category(self) -> Dict[str, Dict]:
        """Get feedback breakdown by category"""
        by_category = {}
        
        for feedback_type in ['approved', 'rejected', 'edited', 'skipped']:
            for entry in self.feedback[feedback_type]:
                category = entry['category']
                
                if category not in by_category:
                    by_category[category] = {
                        'approved': 0,
                        'rejected': 0,
                        'edited': 0,
                        'skipped': 0
                    }
                
                by_category[category][feedback_type] += 1
        
        return by_category
    
    def print_report(self):
        """Print a feedback report"""
        stats = self.get_stats()
        
        print("\n" + "="*60)
        print(f"FEEDBACK REPORT - Week {self.current_week}")
        print("="*60)
        
        print(f"\nOverall Stats:")
        print(f"  Total Decisions: {stats['total']}")
        print(f"  Approved: {stats['approved']} ({stats['approval_rate']:.1f}%)")
        print(f"  Rejected: {stats['rejected']} ({stats['rejection_rate']:.1f}%)")
        print(f"  Edited: {stats['edited']} ({stats['edit_rate']:.1f}%)")
        print(f"  Skipped: {stats['skipped']} ({stats['skip_rate']:.1f}%)")
        
        print(f"\nBy Agent:")
        by_agent = self.get_by_agent()
        for agent, counts in sorted(by_agent.items()):
            total = sum(counts.values())
            print(f"  {agent}: {total} decisions")
            print(f"    Approved: {counts['approved']}, "
                  f"Rejected: {counts['rejected']}, "
                  f"Edited: {counts['edited']}, "
                  f"Skipped: {counts['skipped']}")
        
        print(f"\nBy Category:")
        by_category = self.get_by_category()
        for category, counts in sorted(by_category.items()):
            total = sum(counts.values())
            print(f"  {category}: {total} decisions")
        
        print("\n" + "="*60)

def main():
    """Test the feedback logger"""
    import sys
    
    logger = FeedbackLogger()
    
    if len(sys.argv) > 1:
        action = sys.argv[1]
        
        if action == 'approve' and len(sys.argv) > 2:
            description = ' '.join(sys.argv[2:])
            logger.approve(description, agent='bolt')
        
        elif action == 'reject' and len(sys.argv) > 3:
            description = ' '.join(sys.argv[2:-1])
            reason = sys.argv[-1]
            logger.reject(description, reason, agent='bolt')
        
        elif action == 'stats':
            logger.print_report()
        
        else:
            print("Usage:")
            print("  feedback-logger.py approve <description>")
            print("  feedback-logger.py reject <description> <reason>")
            print("  feedback-logger.py stats")
    else:
        # Demo
        print("Feedback Logger Demo\n")
        
        logger.approve("Implement context retention system", agent='bolt', category='infrastructure')
        logger.reject("Deploy to production immediately", "Not tested yet", agent='atlas', category='deployment')
        logger.edit("Write blog post about AI", "Tone was too technical", agent='nova', category='content')
        
        logger.print_report()

if __name__ == "__main__":
    main()
