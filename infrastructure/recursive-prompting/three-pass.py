#!/usr/bin/env python3
"""
Recursive Prompting (3-Pass)
Pass 1: Agent generates draft
Pass 2: Agent self-critiques (identifies weaknesses)
Pass 3: Agent refines based on critique

This is a middleware wrapper for improving agent output quality
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Callable, Any

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
THREE_PASS_DIR = WORKSPACE / "infrastructure" / "recursive-prompting"
HISTORY_DIR = THREE_PASS_DIR / "history"

class ThreePassProcessor:
    """Three-pass recursive prompting system"""
    
    def __init__(self, agent_name: str = "unknown"):
        self.agent_name = agent_name
        HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    
    def pass_1_generate(self, prompt: str, context: Dict = None) -> Dict:
        """
        Pass 1: Generate initial draft
        
        Args:
            prompt: The original request/prompt
            context: Additional context for the agent
        
        Returns:
            Dict with 'output', 'metadata'
        """
        print("Pass 1: Generating draft...")
        
        # In production, this would call the actual agent/LLM
        # For now, this is a placeholder structure
        
        draft = {
            'output': "[PLACEHOLDER: Draft output from agent]",
            'prompt': prompt,
            'context': context or {},
            'timestamp': datetime.now().isoformat(),
            'pass': 1,
            'agent': self.agent_name
        }
        
        print(f"  Draft generated ({len(draft['output'])} chars)")
        
        return draft
    
    def pass_2_critique(self, draft: Dict) -> Dict:
        """
        Pass 2: Self-critique
        
        Analyzes the draft for weaknesses, gaps, and improvements
        
        Returns:
            Dict with 'critique', 'weaknesses', 'suggestions'
        """
        print("Pass 2: Critiquing draft...")
        
        # Critique prompt
        critique_prompt = f"""
Review this draft and identify weaknesses, gaps, and areas for improvement:

ORIGINAL PROMPT: {draft['prompt']}

DRAFT OUTPUT:
{draft['output']}

Analyze for:
1. Completeness - Are all aspects addressed?
2. Accuracy - Is the information correct?
3. Clarity - Is it easy to understand?
4. Actionability - Can someone act on this?
5. Edge cases - What could go wrong?

Provide specific, actionable critique.
"""
        
        # In production, this would call the agent/LLM with the critique prompt
        critique = {
            'critique_prompt': critique_prompt,
            'weaknesses': [
                "[PLACEHOLDER: Identified weakness 1]",
                "[PLACEHOLDER: Identified weakness 2]",
                "[PLACEHOLDER: Identified weakness 3]"
            ],
            'suggestions': [
                "[PLACEHOLDER: Improvement suggestion 1]",
                "[PLACEHOLDER: Improvement suggestion 2]",
                "[PLACEHOLDER: Improvement suggestion 3]"
            ],
            'strengths': [
                "[PLACEHOLDER: What the draft does well]"
            ],
            'completeness_score': 0.7,  # 0-1 scale
            'clarity_score': 0.8,
            'timestamp': datetime.now().isoformat(),
            'pass': 2
        }
        
        print(f"  Critique generated:")
        print(f"    Weaknesses: {len(critique['weaknesses'])}")
        print(f"    Suggestions: {len(critique['suggestions'])}")
        
        return critique
    
    def pass_3_refine(self, draft: Dict, critique: Dict) -> Dict:
        """
        Pass 3: Refine based on critique
        
        Args:
            draft: The original draft from Pass 1
            critique: The critique from Pass 2
        
        Returns:
            Dict with refined 'output'
        """
        print("Pass 3: Refining based on critique...")
        
        # Refinement prompt
        refinement_prompt = f"""
Improve this draft based on the following critique:

ORIGINAL PROMPT: {draft['prompt']}

ORIGINAL DRAFT:
{draft['output']}

WEAKNESSES IDENTIFIED:
{chr(10).join(f"- {w}" for w in critique['weaknesses'])}

SUGGESTIONS:
{chr(10).join(f"- {s}" for s in critique['suggestions'])}

STRENGTHS TO MAINTAIN:
{chr(10).join(f"- {s}" for s in critique['strengths'])}

Produce an improved version that addresses the weaknesses while maintaining the strengths.
"""
        
        # In production, this would call the agent/LLM with the refinement prompt
        refined = {
            'output': "[PLACEHOLDER: Refined output addressing critique]",
            'refinement_prompt': refinement_prompt,
            'improvements_made': [
                "[PLACEHOLDER: Improvement 1]",
                "[PLACEHOLDER: Improvement 2]"
            ],
            'timestamp': datetime.now().isoformat(),
            'pass': 3,
            'original_draft': draft['output'],
            'critique_applied': critique
        }
        
        print(f"  Refinement complete ({len(refined['output'])} chars)")
        
        return refined
    
    def process(self, prompt: str, context: Dict = None) -> Dict:
        """
        Full 3-pass process
        
        Args:
            prompt: The original request
            context: Additional context
        
        Returns:
            Dict with all passes and final output
        """
        print(f"\n{'='*60}")
        print(f"Three-Pass Processing: {self.agent_name}")
        print(f"{'='*60}\n")
        
        start_time = datetime.now()
        
        # Pass 1: Generate
        draft = self.pass_1_generate(prompt, context)
        
        # Pass 2: Critique
        critique = self.pass_2_critique(draft)
        
        # Pass 3: Refine
        refined = self.pass_3_refine(draft, critique)
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Compile full result
        result = {
            'prompt': prompt,
            'context': context,
            'agent': self.agent_name,
            'pass_1_draft': draft,
            'pass_2_critique': critique,
            'pass_3_refined': refined,
            'final_output': refined['output'],
            'processing_time_seconds': duration,
            'started_at': start_time.isoformat(),
            'completed_at': end_time.isoformat()
        }
        
        # Save to history
        self.save_history(result)
        
        print(f"\n{'='*60}")
        print(f"Three-Pass Complete ({duration:.1f}s)")
        print(f"{'='*60}\n")
        
        return result
    
    def save_history(self, result: Dict):
        """Save processing history"""
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        history_file = HISTORY_DIR / f"{self.agent_name}-{timestamp}.json"
        
        with open(history_file, 'w') as f:
            json.dump(result, f, indent=2)
        
        print(f"✓ History saved to {history_file}")
    
    def compare_output(self, original: str, refined: str) -> Dict:
        """Compare original vs refined output"""
        return {
            'original_length': len(original),
            'refined_length': len(refined),
            'length_change': len(refined) - len(original),
            'length_change_percent': ((len(refined) - len(original)) / len(original) * 100) if original else 0
        }

def create_integration_example():
    """
    Create an example showing how to integrate with agent workflows
    """
    example = '''
# Three-Pass Integration Example

## Basic Usage

```python
from three_pass import ThreePassProcessor

# Create processor for your agent
processor = ThreePassProcessor(agent_name='bolt')

# Process a request
result = processor.process(
    prompt="Build a deployment script for the new feature",
    context={'environment': 'production', 'priority': 'high'}
)

# Get final output
final_output = result['final_output']

# Review critique if needed
critique = result['pass_2_critique']
```

## Integration with OpenClaw Agents

### Option 1: Wrapper Function

```python
def agent_task_with_three_pass(task_description):
    """Wrap any agent task with three-pass processing"""
    processor = ThreePassProcessor(agent_name='current_agent')
    result = processor.process(task_description)
    return result['final_output']
```

### Option 2: Middleware

```python
class AgentWithThreePass:
    def __init__(self, agent):
        self.agent = agent
        self.processor = ThreePassProcessor(agent_name=agent.name)
    
    def execute(self, task):
        # Use three-pass for complex tasks
        if task.complexity == 'high':
            result = self.processor.process(task.description)
            return result['final_output']
        else:
            # Skip for simple tasks
            return self.agent.execute(task)
```

## When to Use Three-Pass

Use for:
- Complex technical implementations
- Important communications
- High-stakes decisions
- Novel problem-solving
- Content creation

Skip for:
- Simple queries
- Routine tasks
- Time-sensitive operations
- Already-proven patterns

## Configuration

Create a config file to enable/disable per agent:

```json
{
  "bolt": {"enabled": true, "threshold": "high"},
  "nova": {"enabled": true, "threshold": "medium"},
  "fury": {"enabled": false}
}
```
'''
    
    integration_file = THREE_PASS_DIR / "INTEGRATION.md"
    with open(integration_file, 'w') as f:
        f.write(example)
    
    print(f"✓ Integration guide created: {integration_file}")

def main():
    """Test the three-pass system"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--create-integration':
        create_integration_example()
        return
    
    # Demo
    processor = ThreePassProcessor(agent_name='bolt')
    
    result = processor.process(
        prompt="Write a function to validate email addresses",
        context={'language': 'python', 'include_tests': True}
    )
    
    print("\nFINAL OUTPUT:")
    print(result['final_output'])
    
    # Create integration guide
    create_integration_example()

if __name__ == "__main__":
    main()
