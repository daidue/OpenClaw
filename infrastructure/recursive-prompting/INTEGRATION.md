
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
