#!/usr/bin/env python3
"""
Telegram Inline Buttons
Recommendations arrive with: Approve / Reject / Edit / Skip buttons
One tap = decision logged

Integration with OpenClaw's Telegram system
"""

import os
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "memory-compound"))
from feedback_logger import FeedbackLogger

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
PENDING_DIR = WORKSPACE / "feedback" / "pending"

class TelegramFeedbackRouter:
    """
    Route recommendations through Telegram with inline buttons
    
    Integrates with OpenClaw's message system
    """
    
    def __init__(self):
        PENDING_DIR.mkdir(parents=True, exist_ok=True)
        self.logger = FeedbackLogger()
    
    def create_recommendation_message(
        self, 
        title: str,
        description: str,
        agent: str,
        category: str = 'general',
        metadata: Dict = None
    ) -> Dict:
        """
        Create a recommendation message with inline buttons
        
        Returns message data structure for OpenClaw's message system
        """
        # Create unique ID for this recommendation
        rec_id = f"{agent}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        # Store recommendation details
        recommendation = {
            'id': rec_id,
            'title': title,
            'description': description,
            'agent': agent,
            'category': category,
            'metadata': metadata or {},
            'created_at': datetime.now().isoformat(),
            'status': 'pending'
        }
        
        # Save to pending
        pending_file = PENDING_DIR / f"{rec_id}.json"
        with open(pending_file, 'w') as f:
            json.dump(recommendation, f, indent=2)
        
        # Format message text
        message_text = f"""
🤖 **Recommendation from {agent}**

**{title}**

{description}

Category: {category}
"""
        
        # Create inline keyboard with buttons
        # This follows Telegram Bot API format
        inline_keyboard = {
            'inline_keyboard': [
                [
                    {'text': '✅ Approve', 'callback_data': f'approve:{rec_id}'},
                    {'text': '❌ Reject', 'callback_data': f'reject:{rec_id}'}
                ],
                [
                    {'text': '✏️ Edit', 'callback_data': f'edit:{rec_id}'},
                    {'text': '⏭️ Skip', 'callback_data': f'skip:{rec_id}'}
                ]
            ]
        }
        
        return {
            'text': message_text,
            'reply_markup': inline_keyboard,
            'recommendation_id': rec_id,
            'recommendation_file': str(pending_file)
        }
    
    def send_recommendation(
        self,
        title: str,
        description: str,
        agent: str,
        category: str = 'general',
        target_channel: str = None,
        metadata: Dict = None
    ) -> str:
        """
        Send a recommendation to Telegram
        
        Args:
            title: Recommendation title
            description: Full description
            agent: Which agent is making the recommendation
            category: Category (infrastructure, content, etc.)
            target_channel: Telegram channel/chat (None = default)
            metadata: Additional context
        
        Returns:
            Recommendation ID
        """
        # Create message
        message_data = self.create_recommendation_message(
            title, description, agent, category, metadata
        )
        
        print(f"📤 Recommendation ready: {message_data['recommendation_id']}")
        print(f"   Title: {title}")
        print(f"   Agent: {agent}")
        
        # In production, this would call OpenClaw's message tool
        # For now, save the message data for integration
        
        message_file = PENDING_DIR / f"{message_data['recommendation_id']}-message.json"
        with open(message_file, 'w') as f:
            json.dump(message_data, f, indent=2)
        
        print(f"   Message file: {message_file}")
        print(f"   Use OpenClaw's message tool to send this")
        
        return message_data['recommendation_id']
    
    def handle_callback(self, callback_data: str, user_id: str = None) -> Dict:
        """
        Handle button callback from Telegram
        
        Args:
            callback_data: Format is "action:rec_id"
            user_id: Telegram user ID who clicked
        
        Returns:
            Response dict with success status and message
        """
        try:
            action, rec_id = callback_data.split(':', 1)
        except ValueError:
            return {'success': False, 'message': 'Invalid callback data'}
        
        # Load recommendation
        pending_file = PENDING_DIR / f"{rec_id}.json"
        
        if not pending_file.exists():
            return {'success': False, 'message': 'Recommendation not found'}
        
        with open(pending_file, 'r') as f:
            recommendation = json.load(f)
        
        # Handle action
        if action == 'approve':
            return self._handle_approve(recommendation, user_id)
        elif action == 'reject':
            return self._handle_reject(recommendation, user_id)
        elif action == 'edit':
            return self._handle_edit(recommendation, user_id)
        elif action == 'skip':
            return self._handle_skip(recommendation, user_id)
        else:
            return {'success': False, 'message': f'Unknown action: {action}'}
    
    def _handle_approve(self, recommendation: Dict, user_id: str = None) -> Dict:
        """Handle approval"""
        # Log feedback
        self.logger.approve(
            description=recommendation['description'],
            agent=recommendation['agent'],
            category=recommendation['category'],
            metadata={
                **recommendation.get('metadata', {}),
                'user_id': user_id,
                'recommendation_id': recommendation['id']
            }
        )
        
        # Update recommendation status
        recommendation['status'] = 'approved'
        recommendation['approved_at'] = datetime.now().isoformat()
        recommendation['approved_by'] = user_id
        
        self._archive_recommendation(recommendation)
        
        return {
            'success': True,
            'message': '✅ Approved! The agent will proceed.',
            'action': 'approved',
            'recommendation': recommendation
        }
    
    def _handle_reject(self, recommendation: Dict, user_id: str = None) -> Dict:
        """Handle rejection"""
        # This should prompt for a reason
        # For now, use a placeholder
        reason = "User rejected via Telegram"
        
        # Log feedback
        self.logger.reject(
            description=recommendation['description'],
            reason=reason,
            agent=recommendation['agent'],
            category=recommendation['category'],
            metadata={
                **recommendation.get('metadata', {}),
                'user_id': user_id,
                'recommendation_id': recommendation['id']
            }
        )
        
        # Update recommendation status
        recommendation['status'] = 'rejected'
        recommendation['rejected_at'] = datetime.now().isoformat()
        recommendation['rejected_by'] = user_id
        recommendation['rejection_reason'] = reason
        
        self._archive_recommendation(recommendation)
        
        return {
            'success': True,
            'message': '❌ Rejected. Please reply with the reason.',
            'action': 'rejected',
            'recommendation': recommendation,
            'needs_reason': True
        }
    
    def _handle_edit(self, recommendation: Dict, user_id: str = None) -> Dict:
        """Handle edit request"""
        # This should prompt for edits
        edit_reason = "User requested edits via Telegram"
        
        # Log feedback
        self.logger.edit(
            description=recommendation['description'],
            reason=edit_reason,
            agent=recommendation['agent'],
            category=recommendation['category'],
            metadata={
                **recommendation.get('metadata', {}),
                'user_id': user_id,
                'recommendation_id': recommendation['id']
            }
        )
        
        # Update recommendation status
        recommendation['status'] = 'edit_requested'
        recommendation['edit_requested_at'] = datetime.now().isoformat()
        recommendation['edit_requested_by'] = user_id
        
        self._archive_recommendation(recommendation)
        
        return {
            'success': True,
            'message': '✏️ Edit requested. Please provide your changes.',
            'action': 'edit_requested',
            'recommendation': recommendation,
            'needs_edits': True
        }
    
    def _handle_skip(self, recommendation: Dict, user_id: str = None) -> Dict:
        """Handle skip"""
        # Log feedback
        self.logger.skip(
            description=recommendation['description'],
            agent=recommendation['agent'],
            category=recommendation['category'],
            metadata={
                **recommendation.get('metadata', {}),
                'user_id': user_id,
                'recommendation_id': recommendation['id']
            }
        )
        
        # Update recommendation status
        recommendation['status'] = 'skipped'
        recommendation['skipped_at'] = datetime.now().isoformat()
        recommendation['skipped_by'] = user_id
        
        self._archive_recommendation(recommendation)
        
        return {
            'success': True,
            'message': '⏭️ Skipped for now.',
            'action': 'skipped',
            'recommendation': recommendation
        }
    
    def _archive_recommendation(self, recommendation: Dict):
        """Move recommendation from pending to archive"""
        # Archive
        archive_dir = WORKSPACE / "feedback" / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        
        archive_file = archive_dir / f"{recommendation['id']}.json"
        with open(archive_file, 'w') as f:
            json.dump(recommendation, f, indent=2)
        
        # Remove from pending
        pending_file = PENDING_DIR / f"{recommendation['id']}.json"
        if pending_file.exists():
            pending_file.unlink()

def create_openclaw_integration_guide():
    """Create integration guide for OpenClaw"""
    guide = '''
# Telegram Inline Buttons - OpenClaw Integration

## Setup

### 1. Install Telegram Bot (if not already)
OpenClaw should have Telegram integration. Ensure it's configured.

### 2. Enable Inline Button Support
Check if OpenClaw's message tool supports `reply_markup` parameter for inline keyboards.

## Usage in Agents

### Send Recommendation with Buttons

```python
from feedback_router.telegram_buttons import TelegramFeedbackRouter

router = TelegramFeedbackRouter()

# Create and send recommendation
rec_id = router.send_recommendation(
    title="Deploy new feature to production",
    description="All tests passing. Ready for deployment.",
    agent="atlas",
    category="deployment",
    metadata={"feature": "user-dashboard", "tests": "95% coverage"}
)
```

### Handle Button Callbacks

When a user clicks a button, Telegram sends a callback query.
OpenClaw should route these to the feedback router:

```python
# In OpenClaw's Telegram callback handler
from feedback_router.telegram_buttons import TelegramFeedbackRouter

router = TelegramFeedbackRouter()

# Handle callback
result = router.handle_callback(
    callback_data="approve:bolt-20260209-120000",
    user_id="telegram_user_123"
)

if result['success']:
    # Send confirmation to user
    send_message(result['message'])
    
    # Execute action if approved
    if result['action'] == 'approved':
        execute_recommendation(result['recommendation'])
```

## OpenClaw Message Tool Integration

### Sending with Inline Buttons

```python
# Use OpenClaw's message tool
message(
    action="send",
    target="telegram_chat_id",
    message=recommendation_text,
    # This is the key part - inline keyboard
    reply_markup=json.dumps({
        'inline_keyboard': [
            [
                {'text': '✅ Approve', 'callback_data': 'approve:rec_id'},
                {'text': '❌ Reject', 'callback_data': 'reject:rec_id'}
            ]
        ]
    })
)
```

## Callback Handler Setup

OpenClaw needs to register a callback handler:

```python
# In OpenClaw's Telegram integration
@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    router = TelegramFeedbackRouter()
    result = router.handle_callback(call.data, call.from_user.id)
    
    # Send response
    bot.answer_callback_query(call.id, result['message'])
    
    # Update message if needed
    if result['success']:
        bot.edit_message_text(
            f"Decision: {result['action'].upper()}\\n\\n{result['message']}",
            chat_id=call.message.chat.id,
            message_id=call.message.message_id
        )
```

## Example Flow

1. **Agent makes recommendation**
   ```python
   rec_id = router.send_recommendation(
       title="Write blog post about AI agents",
       description="Draft ready for review",
       agent="nova"
   )
   ```

2. **User receives Telegram message** with 4 buttons

3. **User clicks "Approve"**

4. **Callback handled**, feedback logged, agent notified

5. **Agent proceeds** with approved action
'''
    
    guide_file = WORKSPACE / "infrastructure" / "feedback-router" / "OPENCLAW_INTEGRATION.md"
    with open(guide_file, 'w') as f:
        f.write(guide)
    
    print(f"✓ Integration guide created: {guide_file}")

def main():
    """Test the Telegram feedback router"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--create-guide':
        create_openclaw_integration_guide()
        return
    
    # Demo
    router = TelegramFeedbackRouter()
    
    print("Demo: Creating recommendation with inline buttons\n")
    
    rec_id = router.send_recommendation(
        title="Implement context retention system",
        description="All 4 components of the context retention system are ready to deploy. This includes hourly summarizer, compaction injector, vector memory, and semantic recall.",
        agent="bolt",
        category="infrastructure",
        metadata={"priority": "high", "estimated_time": "2 hours"}
    )
    
    print(f"\n✓ Recommendation created: {rec_id}")
    print("\nSimulating button clicks...\n")
    
    # Simulate approval
    result = router.handle_callback(f"approve:{rec_id}", user_id="test_user")
    print(f"Approval result: {result['message']}")
    
    # Create integration guide
    create_openclaw_integration_guide()

if __name__ == "__main__":
    main()
