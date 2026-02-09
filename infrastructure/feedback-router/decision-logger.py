#!/usr/bin/env python3
"""
Decision Logger
Every button tap logs to feedback system
Pattern reinforcement feeds back to agents

This bridges Telegram button interactions with the feedback system
"""

import os
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List
from collections import defaultdict

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
DECISIONS_DIR = WORKSPACE / "feedback" / "decisions"
PATTERNS_FILE = WORKSPACE / "feedback" / "decision-patterns.json"

class DecisionLogger:
    """Log and analyze decision patterns from feedback"""
    
    def __init__(self):
        DECISIONS_DIR.mkdir(parents=True, exist_ok=True)
        self.patterns = self.load_patterns()
    
    def load_patterns(self) -> Dict:
        """Load decision patterns"""
        if PATTERNS_FILE.exists():
            with open(PATTERNS_FILE, 'r') as f:
                return json.load(f)
        
        return {
            'by_agent': {},
            'by_category': {},
            'by_time_of_day': {},
            'response_times': [],
            'last_analyzed': None
        }
    
    def save_patterns(self):
        """Save decision patterns"""
        self.patterns['last_analyzed'] = datetime.now().isoformat()
        
        with open(PATTERNS_FILE, 'w') as f:
            json.dump(self.patterns, f, indent=2)
    
    def log_decision(
        self,
        recommendation_id: str,
        action: str,
        agent: str,
        category: str,
        response_time_seconds: float = None,
        metadata: Dict = None
    ) -> Dict:
        """
        Log a decision
        
        Args:
            recommendation_id: ID of the recommendation
            action: approved/rejected/edited/skipped
            agent: Which agent made the recommendation
            category: Category of recommendation
            response_time_seconds: How long until user responded
            metadata: Additional context
        
        Returns:
            The logged decision entry
        """
        decision = {
            'recommendation_id': recommendation_id,
            'action': action,
            'agent': agent,
            'category': category,
            'timestamp': datetime.now().isoformat(),
            'response_time_seconds': response_time_seconds,
            'metadata': metadata or {},
            'hour_of_day': datetime.now().hour,
            'day_of_week': datetime.now().strftime('%A')
        }
        
        # Save individual decision
        date_str = datetime.now().strftime("%Y-%m-%d")
        daily_file = DECISIONS_DIR / f"{date_str}.jsonl"
        
        with open(daily_file, 'a') as f:
            f.write(json.dumps(decision) + '\n')
        
        print(f"✓ Decision logged: {action} for {agent}/{category}")
        
        return decision
    
    def analyze_patterns(self, days: int = 7) -> Dict:
        """
        Analyze decision patterns from recent history
        
        Args:
            days: Number of days to analyze
        
        Returns:
            Dict with pattern analysis
        """
        print(f"Analyzing decisions from last {days} days...")
        
        # Collect decisions
        decisions = []
        
        for day_offset in range(days):
            date = datetime.now() - timedelta(days=day_offset)
            date_str = date.strftime("%Y-%m-%d")
            daily_file = DECISIONS_DIR / f"{date_str}.jsonl"
            
            if daily_file.exists():
                with open(daily_file, 'r') as f:
                    for line in f:
                        try:
                            decision = json.loads(line.strip())
                            decisions.append(decision)
                        except json.JSONDecodeError:
                            continue
        
        if not decisions:
            print("No decisions found")
            return {}
        
        print(f"  Analyzing {len(decisions)} decisions...")
        
        # Analyze by agent
        by_agent = defaultdict(lambda: {
            'approved': 0, 'rejected': 0, 'edited': 0, 'skipped': 0, 'total': 0
        })
        
        for decision in decisions:
            agent = decision['agent']
            action = decision['action']
            by_agent[agent][action] += 1
            by_agent[agent]['total'] += 1
        
        # Calculate approval rates
        for agent, stats in by_agent.items():
            if stats['total'] > 0:
                stats['approval_rate'] = stats['approved'] / stats['total'] * 100
                stats['rejection_rate'] = stats['rejected'] / stats['total'] * 100
        
        # Analyze by category
        by_category = defaultdict(lambda: {
            'approved': 0, 'rejected': 0, 'edited': 0, 'skipped': 0, 'total': 0
        })
        
        for decision in decisions:
            category = decision['category']
            action = decision['action']
            by_category[category][action] += 1
            by_category[category]['total'] += 1
        
        # Analyze by time of day
        by_hour = defaultdict(int)
        for decision in decisions:
            hour = decision['hour_of_day']
            by_hour[hour] += 1
        
        # Find peak hours
        peak_hours = sorted(by_hour.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Analyze response times
        response_times = [
            d['response_time_seconds'] 
            for d in decisions 
            if d.get('response_time_seconds') is not None
        ]
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Update patterns
        self.patterns['by_agent'] = dict(by_agent)
        self.patterns['by_category'] = dict(by_category)
        self.patterns['by_time_of_day'] = dict(by_hour)
        self.patterns['peak_hours'] = [h for h, _ in peak_hours]
        self.patterns['avg_response_time_seconds'] = avg_response_time
        self.patterns['total_decisions_analyzed'] = len(decisions)
        
        self.save_patterns()
        
        return self.patterns
    
    def get_agent_feedback(self, agent: str) -> Dict:
        """
        Get feedback summary for a specific agent
        
        Returns actionable insights for the agent
        """
        if agent not in self.patterns.get('by_agent', {}):
            return {
                'agent': agent,
                'message': 'No decisions recorded yet',
                'suggestions': []
            }
        
        stats = self.patterns['by_agent'][agent]
        
        feedback = {
            'agent': agent,
            'stats': stats,
            'approval_rate': stats.get('approval_rate', 0),
            'rejection_rate': stats.get('rejection_rate', 0),
            'suggestions': []
        }
        
        # Generate suggestions based on patterns
        if stats.get('approval_rate', 0) < 50:
            feedback['suggestions'].append(
                "⚠️ Low approval rate. Review recent rejections to understand why."
            )
        
        if stats.get('rejected', 0) > stats.get('approved', 0):
            feedback['suggestions'].append(
                "⚠️ More rejections than approvals. Consider adjusting your recommendations."
            )
        
        if stats.get('edited', 0) > stats.get('total', 1) * 0.3:
            feedback['suggestions'].append(
                "📝 High edit rate. Recommendations may need more detail or different framing."
            )
        
        if stats.get('approval_rate', 0) > 80:
            feedback['suggestions'].append(
                "✅ Excellent approval rate! Current approach is working well."
            )
        
        return feedback
    
    def print_report(self):
        """Print decision patterns report"""
        patterns = self.patterns
        
        print("\n" + "="*60)
        print("DECISION PATTERNS REPORT")
        print("="*60)
        
        print(f"\nTotal Decisions: {patterns.get('total_decisions_analyzed', 0)}")
        print(f"Last Analyzed: {patterns.get('last_analyzed', 'Never')}")
        
        if patterns.get('avg_response_time_seconds'):
            print(f"Avg Response Time: {patterns['avg_response_time_seconds']:.1f} seconds")
        
        if patterns.get('peak_hours'):
            print(f"Peak Decision Hours: {', '.join(f'{h}:00' for h in patterns['peak_hours'])}")
        
        print("\nBy Agent:")
        by_agent = patterns.get('by_agent', {})
        for agent, stats in sorted(by_agent.items()):
            print(f"\n  {agent}:")
            print(f"    Total: {stats['total']}")
            print(f"    Approved: {stats['approved']} ({stats.get('approval_rate', 0):.1f}%)")
            print(f"    Rejected: {stats['rejected']} ({stats.get('rejection_rate', 0):.1f}%)")
            print(f"    Edited: {stats['edited']}")
            print(f"    Skipped: {stats['skipped']}")
            
            # Get feedback
            feedback = self.get_agent_feedback(agent)
            if feedback['suggestions']:
                print(f"    Suggestions:")
                for suggestion in feedback['suggestions']:
                    print(f"      {suggestion}")
        
        print("\nBy Category:")
        by_category = patterns.get('by_category', {})
        for category, stats in sorted(by_category.items()):
            approval_rate = stats['approved'] / stats['total'] * 100 if stats['total'] > 0 else 0
            print(f"  {category}: {stats['total']} decisions ({approval_rate:.1f}% approved)")
        
        print("\n" + "="*60)

def main():
    """Test the decision logger"""
    import sys
    
    logger = DecisionLogger()
    
    if len(sys.argv) > 1:
        action = sys.argv[1]
        
        if action == 'analyze':
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
            logger.analyze_patterns(days=days)
            logger.print_report()
        
        elif action == 'feedback' and len(sys.argv) > 2:
            agent = sys.argv[2]
            feedback = logger.get_agent_feedback(agent)
            
            print(f"\nFeedback for {agent}:")
            print(f"Approval Rate: {feedback['approval_rate']:.1f}%")
            print("\nSuggestions:")
            for suggestion in feedback['suggestions']:
                print(f"  {suggestion}")
        
        elif action == 'log' and len(sys.argv) > 4:
            # Log a test decision
            rec_id = sys.argv[2]
            decision_action = sys.argv[3]
            agent = sys.argv[4]
            category = sys.argv[5] if len(sys.argv) > 5 else 'general'
            
            logger.log_decision(rec_id, decision_action, agent, category)
        
        else:
            print("Usage:")
            print("  decision-logger.py analyze [days]")
            print("  decision-logger.py feedback <agent>")
            print("  decision-logger.py log <rec_id> <action> <agent> [category]")
    else:
        # Demo
        print("Decision Logger Demo\n")
        
        # Log some test decisions
        logger.log_decision("test-001", "approved", "bolt", "infrastructure", 30.5)
        logger.log_decision("test-002", "rejected", "nova", "content", 45.2)
        logger.log_decision("test-003", "approved", "bolt", "infrastructure", 25.0)
        logger.log_decision("test-004", "edited", "fury", "research", 60.8)
        
        # Analyze
        logger.analyze_patterns(days=1)
        logger.print_report()

if __name__ == "__main__":
    main()
