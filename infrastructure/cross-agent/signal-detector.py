#!/usr/bin/env python3
"""
Cross-Signal Detection
When same company/person/topic appears in 2+ agent contexts, amplify signal
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Set
from datetime import datetime, timedelta
from collections import defaultdict

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
SIGNALS_FILE = WORKSPACE / "infrastructure" / "cross-agent" / "cross-signals.json"
MEMORY_DIR = WORKSPACE / "memory" / "hourly"
AGENT_CONTEXTS = {
    'main': Path.home() / ".openclaw" / "sessions" / "main",
    'fury': Path.home() / ".openclaw" / "sessions" / "fury",
    'nova': Path.home() / ".openclaw" / "sessions" / "nova",
    'bolt': Path.home() / ".openclaw" / "sessions" / "bolt",
    'scout': Path.home() / ".openclaw" / "sessions" / "scout",
    'edge': Path.home() / ".openclaw" / "sessions" / "edge",
    'atlas': Path.home() / ".openclaw" / "sessions" / "atlas",
}

class CrossSignalDetector:
    """Detect when topics appear across multiple agent contexts"""
    
    def __init__(self):
        self.signals_file = SIGNALS_FILE
        self.signals_file.parent.mkdir(parents=True, exist_ok=True)
        self.signals = self.load_signals()
    
    def load_signals(self) -> Dict:
        """Load existing signals"""
        if self.signals_file.exists():
            with open(self.signals_file, 'r') as f:
                return json.load(f)
        return {'active_signals': [], 'history': []}
    
    def save_signals(self):
        """Save signals to disk"""
        with open(self.signals_file, 'w') as f:
            json.dump(self.signals, f, indent=2)
    
    def extract_entities(self, text: str) -> Set[str]:
        """
        Extract potential entities (companies, people, topics)
        Simple extraction - can be enhanced with NER
        """
        entities = set()
        
        # Capitalized words (potential proper nouns)
        words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        entities.update(words)
        
        # Common company patterns
        company_patterns = [
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corp|LLC|Ltd)\b',
            r'\b([A-Z][a-z]+)\s+(?:Technologies|Software|Systems|Solutions)\b',
        ]
        
        for pattern in company_patterns:
            matches = re.findall(pattern, text)
            entities.update(matches)
        
        # Filter out common words
        stopwords = {'The', 'This', 'That', 'These', 'Those', 'What', 'When', 
                    'Where', 'Why', 'How', 'Here', 'There'}
        entities = {e for e in entities if e not in stopwords and len(e) > 2}
        
        return entities
    
    def scan_agent_contexts(self, lookback_hours: int = 24) -> Dict[str, Dict]:
        """Scan all agent contexts for entities"""
        cutoff_time = datetime.now() - timedelta(hours=lookback_hours)
        agent_entities = defaultdict(lambda: defaultdict(int))
        
        # Scan hourly summaries
        for days_ago in range(2):  # Today and yesterday
            date = datetime.now() - timedelta(days=days_ago)
            date_str = date.strftime("%Y-%m-%d")
            summary_file = MEMORY_DIR / f"{date_str}.md"
            
            if summary_file.exists():
                with open(summary_file, 'r') as f:
                    text = f.read()
                    entities = self.extract_entities(text)
                    
                    # Assign to 'general' agent for now
                    # In production, parse agent-specific sections
                    for entity in entities:
                        agent_entities['general'][entity] += 1
        
        return dict(agent_entities)
    
    def detect_cross_signals(self, agent_entities: Dict[str, Dict]) -> List[Dict]:
        """Detect entities that appear across multiple agents"""
        entity_agents = defaultdict(set)
        entity_counts = defaultdict(int)
        
        # Build entity → agents mapping
        for agent, entities in agent_entities.items():
            for entity, count in entities.items():
                entity_agents[entity].add(agent)
                entity_counts[entity] += count
        
        # Find cross-signals (appearing in 2+ agents)
        signals = []
        for entity, agents in entity_agents.items():
            if len(agents) >= 2:
                signal = {
                    'entity': entity,
                    'agents': sorted(agents),
                    'agent_count': len(agents),
                    'total_mentions': entity_counts[entity],
                    'detected_at': datetime.now().isoformat(),
                    'status': 'active',
                    'priority': self.calculate_priority(len(agents), entity_counts[entity])
                }
                signals.append(signal)
        
        # Sort by priority
        signals.sort(key=lambda x: x['priority'], reverse=True)
        
        return signals
    
    def calculate_priority(self, agent_count: int, mention_count: int) -> float:
        """Calculate signal priority score"""
        # More agents = higher priority
        # More mentions = higher priority
        return (agent_count * 10) + (mention_count * 0.5)
    
    def update_signals(self, new_signals: List[Dict]):
        """Update active signals and archive old ones"""
        # Archive signals older than 7 days
        cutoff = (datetime.now() - timedelta(days=7)).isoformat()
        
        active = []
        archived = 0
        
        for signal in self.signals.get('active_signals', []):
            if signal['detected_at'] > cutoff:
                active.append(signal)
            else:
                self.signals['history'].append(signal)
                archived += 1
        
        # Merge new signals with existing (dedupe by entity)
        existing_entities = {s['entity'] for s in active}
        
        for signal in new_signals:
            if signal['entity'] not in existing_entities:
                active.append(signal)
        
        self.signals['active_signals'] = active
        
        print(f"✓ Updated signals: {len(active)} active, {archived} archived")
    
    def run(self):
        """Run cross-signal detection"""
        print("Scanning agent contexts...")
        agent_entities = self.scan_agent_contexts(lookback_hours=24)
        
        print(f"Found entities across {len(agent_entities)} agent contexts")
        
        print("Detecting cross-signals...")
        signals = self.detect_cross_signals(agent_entities)
        
        print(f"Detected {len(signals)} cross-signals")
        
        if signals:
            print("\nTop Cross-Signals:")
            for signal in signals[:5]:
                print(f"  • {signal['entity']}")
                print(f"    Agents: {', '.join(signal['agents'])}")
                print(f"    Priority: {signal['priority']:.1f}")
        
        self.update_signals(signals)
        self.save_signals()
        
        return signals

def main():
    """Main entry point"""
    detector = CrossSignalDetector()
    signals = detector.run()
    
    print(f"\n✓ Cross-signal detection complete")
    print(f"  Signals file: {detector.signals_file}")

if __name__ == "__main__":
    main()
