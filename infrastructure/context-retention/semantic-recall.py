#!/usr/bin/env python3
"""
Semantic Recall Hook
Before every prompt, auto-trigger semantic search
Inject relevant past conversations into context
"""

import os
import json
import sys
from pathlib import Path
from typing import List, Dict
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from vector_memory import VectorMemory

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
RECALL_CONFIG = WORKSPACE / "infrastructure" / "context-retention" / "recall-config.json"

class SemanticRecall:
    """Semantic recall system for automatic context injection"""
    
    def __init__(self, config_path=None):
        self.config = self.load_config(config_path or RECALL_CONFIG)
        self.memory = VectorMemory()
    
    def load_config(self, config_path: Path) -> Dict:
        """Load recall configuration"""
        default_config = {
            'enabled': True,
            'top_k': 5,
            'min_similarity': 0.3,
            'max_context_chars': 2000,
            'exclude_sessions': [],
            'priority_agents': ['main', 'bolt', 'fury']
        }
        
        if config_path.exists():
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                default_config.update(user_config)
        else:
            # Create default config
            config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
        
        return default_config
    
    def recall(self, query: str, session_id: str = None) -> Dict:
        """
        Perform semantic recall for a query
        Returns relevant context to inject
        """
        if not self.config['enabled']:
            return {'enabled': False, 'context': ''}
        
        # Search vector memory
        results = self.memory.search(query, top_k=self.config['top_k'])
        
        # Filter by similarity threshold
        filtered = [
            r for r in results 
            if r['similarity'] >= self.config['min_similarity']
        ]
        
        # Filter out current session if specified
        if session_id:
            # FIX: Results are VectorSearchResult Pydantic models, use attribute access
            filtered = [
                r for r in filtered 
                if r.session != session_id
            ]
        
        # Build context string
        context_parts = []
        total_chars = 0
        
        for result in filtered:
            snippet = f"[{result['agent']}@{result['timestamp'][:10]}] {result['text']}"
            
            if total_chars + len(snippet) > self.config['max_context_chars']:
                break
            
            context_parts.append(snippet)
            total_chars += len(snippet)
        
        context = "\n\n".join(context_parts)
        
        return {
            'enabled': True,
            'query': query,
            'results_found': len(filtered),
            'results_included': len(context_parts),
            'context': context,
            'timestamp': datetime.now().isoformat()
        }
    
    def format_for_injection(self, recall_result: Dict) -> str:
        """Format recall results for context injection"""
        if not recall_result['enabled'] or not recall_result['context']:
            return ''
        
        injection = f"""
## Semantic Recall Context
Retrieved {recall_result['results_included']} relevant memories for: "{recall_result['query']}"

{recall_result['context']}

---
"""
        return injection

def main():
    """Test semantic recall"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: semantic-recall.py <query>")
        print("Example: semantic-recall.py 'agent infrastructure'")
        sys.exit(1)
    
    query = ' '.join(sys.argv[1:])
    
    print(f"Performing semantic recall for: '{query}'")
    print()
    
    recall = SemanticRecall()
    result = recall.recall(query)
    
    print(f"Results found: {result['results_found']}")
    print(f"Results included: {result['results_included']}")
    print()
    
    if result['context']:
        print("Context to inject:")
        print(recall.format_for_injection(result))
    else:
        print("No relevant context found")

if __name__ == "__main__":
    main()
