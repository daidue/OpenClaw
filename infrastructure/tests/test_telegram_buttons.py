"""
Tests for feedback-router/telegram-buttons.py
"""

import pytest
import json
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from feedback_router.telegram_buttons import TelegramFeedbackRouter

def test_create_recommendation_message(temp_workspace):
    """Test creating recommendation message structure"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        message = router.create_recommendation_message(
            title="Test Recommendation",
            description="This is a test",
            agent="bolt",
            category="test"
        )
        
        # Check structure
        assert 'text' in message
        assert 'reply_markup' in message
        assert 'recommendation_id' in message
        
        # Check inline keyboard
        keyboard = message['reply_markup']
        assert 'inline_keyboard' in keyboard
        assert len(keyboard['inline_keyboard']) == 2  # Two rows
        
        # Check buttons
        first_row = keyboard['inline_keyboard'][0]
        assert len(first_row) == 2  # Approve and Reject
        assert first_row[0]['text'] == '✅ Approve'
        assert first_row[1]['text'] == '❌ Reject'

def test_create_recommendation_saves_pending(temp_workspace):
    """Test that recommendation is saved to pending directory"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        message = router.create_recommendation_message(
            title="Test",
            description="Test description",
            agent="bolt"
        )
        
        rec_id = message['recommendation_id']
        pending_file = temp_workspace / "feedback" / "pending" / f"{rec_id}.json"
        
        assert pending_file.exists()
        
        # Check content
        with open(pending_file, 'r') as f:
            recommendation = json.load(f)
        
        assert recommendation['id'] == rec_id
        assert recommendation['title'] == "Test"
        assert recommendation['agent'] == "bolt"
        assert recommendation['status'] == 'pending'

def test_send_recommendation(temp_workspace):
    """Test sending recommendation"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        rec_id = router.send_recommendation(
            title="Deploy feature",
            description="Ready to deploy",
            agent="atlas",
            category="deployment"
        )
        
        assert rec_id is not None
        assert 'atlas' in rec_id
        
        # Check files created
        pending_dir = temp_workspace / "feedback" / "pending"
        assert (pending_dir / f"{rec_id}.json").exists()
        assert (pending_dir / f"{rec_id}-message.json").exists()

def test_handle_callback_approve(temp_workspace):
    """Test handling approve callback"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        # Create recommendation
        rec_id = router.send_recommendation(
            title="Test",
            description="Test description",
            agent="bolt"
        )
        
        # Approve it
        result = router.handle_callback(f"approve:{rec_id}", user_id="test_user")
        
        assert result['success'] is True
        assert result['action'] == 'approved'
        assert '✅' in result['message']
        
        # Check it's archived
        archive_file = temp_workspace / "feedback" / "archive" / f"{rec_id}.json"
        assert archive_file.exists()
        
        # Check it's removed from pending
        pending_file = temp_workspace / "feedback" / "pending" / f"{rec_id}.json"
        assert not pending_file.exists()

def test_handle_callback_reject(temp_workspace):
    """Test handling reject callback"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        rec_id = router.send_recommendation(
            title="Test",
            description="Test description",
            agent="bolt"
        )
        
        result = router.handle_callback(f"reject:{rec_id}", user_id="test_user")
        
        assert result['success'] is True
        assert result['action'] == 'rejected'
        assert result['needs_reason'] is True
        assert '❌' in result['message']

def test_handle_callback_edit(temp_workspace):
    """Test handling edit callback"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        rec_id = router.send_recommendation(
            title="Test",
            description="Test description",
            agent="bolt"
        )
        
        result = router.handle_callback(f"edit:{rec_id}", user_id="test_user")
        
        assert result['success'] is True
        assert result['action'] == 'edit_requested'
        assert result['needs_edits'] is True
        assert '✏️' in result['message']

def test_handle_callback_skip(temp_workspace):
    """Test handling skip callback"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        rec_id = router.send_recommendation(
            title="Test",
            description="Test description",
            agent="bolt"
        )
        
        result = router.handle_callback(f"skip:{rec_id}", user_id="test_user")
        
        assert result['success'] is True
        assert result['action'] == 'skipped'
        assert '⏭️' in result['message']

def test_handle_callback_invalid_format(temp_workspace):
    """Test handling invalid callback data format"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        result = router.handle_callback("invalid_format", user_id="test_user")
        
        assert result['success'] is False
        assert 'Invalid callback data' in result['message']

def test_handle_callback_nonexistent_recommendation(temp_workspace):
    """Test handling callback for non-existent recommendation"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        result = router.handle_callback("approve:nonexistent-id", user_id="test_user")
        
        assert result['success'] is False
        assert 'not found' in result['message'].lower()

def test_handle_callback_unknown_action(temp_workspace):
    """Test handling unknown action"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        rec_id = router.send_recommendation(
            title="Test",
            description="Test description",
            agent="bolt"
        )
        
        result = router.handle_callback(f"unknown_action:{rec_id}", user_id="test_user")
        
        assert result['success'] is False
        assert 'Unknown action' in result['message']

def test_recommendation_metadata_preserved(temp_workspace):
    """Test that metadata is preserved through approval flow"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        metadata = {'priority': 'high', 'component': 'database'}
        
        rec_id = router.send_recommendation(
            title="Test",
            description="Test description",
            agent="bolt",
            metadata=metadata
        )
        
        result = router.handle_callback(f"approve:{rec_id}", user_id="test_user")
        
        # Check metadata in recommendation
        recommendation = result['recommendation']
        assert recommendation['metadata']['priority'] == 'high'
        assert recommendation['metadata']['component'] == 'database'

def test_callback_updates_recommendation_status(temp_workspace):
    """Test that callbacks properly update recommendation status"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        rec_id = router.send_recommendation(
            title="Test",
            description="Test description",
            agent="bolt"
        )
        
        result = router.handle_callback(f"approve:{rec_id}", user_id="test_user")
        
        recommendation = result['recommendation']
        assert recommendation['status'] == 'approved'
        assert 'approved_at' in recommendation
        assert 'approved_by' in recommendation
        assert recommendation['approved_by'] == 'test_user'

def test_multiple_recommendations(temp_workspace):
    """Test handling multiple recommendations"""
    with patch('feedback_router.telegram_buttons.WORKSPACE', temp_workspace):
        router = TelegramFeedbackRouter()
        
        # Create multiple recommendations
        rec_ids = []
        for i in range(3):
            rec_id = router.send_recommendation(
                title=f"Test {i}",
                description=f"Description {i}",
                agent="bolt"
            )
            rec_ids.append(rec_id)
        
        # Approve first, reject second, skip third
        result1 = router.handle_callback(f"approve:{rec_ids[0]}")
        result2 = router.handle_callback(f"reject:{rec_ids[1]}")
        result3 = router.handle_callback(f"skip:{rec_ids[2]}")
        
        assert result1['action'] == 'approved'
        assert result2['action'] == 'rejected'
        assert result3['action'] == 'skipped'
