"""
Tests for context-retention/hourly-summarizer.py
"""

import pytest
import json
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from context_retention import hourly_summarizer

def test_get_hour_range():
    """Test hour range calculation"""
    start, end = hourly_summarizer.get_hour_range()
    
    # Check that we got datetime objects
    assert isinstance(start, datetime)
    assert isinstance(end, datetime)
    
    # Check that range is approximately 1 hour
    delta = (end - start).total_seconds()
    assert 3500 < delta < 3700  # ~1 hour with some tolerance

def test_parse_session_activity_empty(temp_workspace):
    """Test parsing with no session log"""
    start = datetime.now() - timedelta(hours=1)
    end = datetime.now()
    
    activity = hourly_summarizer.parse_session_activity(start, end)
    
    assert activity['topics'] == []
    assert activity['decisions'] == []
    assert activity['tools'] == {}
    assert activity['stats']['messages'] == 0

def test_parse_session_activity_with_data(sample_session_log, temp_workspace):
    """Test parsing with actual session data"""
    with patch.object(hourly_summarizer, 'SESSION_LOG', sample_session_log):
        start = datetime.now() - timedelta(hours=1)
        end = datetime.now()
        
        activity = hourly_summarizer.parse_session_activity(start, end)
        
        # Should have found some activity
        assert activity['stats']['messages'] > 0
        assert len(activity['tools']) > 0
        assert activity['stats']['errors'] >= 1  # We logged one error

def test_parse_session_activity_keyword_extraction(sample_session_log, temp_workspace):
    """Test that keywords are extracted correctly"""
    with patch.object(hourly_summarizer, 'SESSION_LOG', sample_session_log):
        start = datetime.now() - timedelta(hours=1)
        end = datetime.now()
        
        activity = hourly_summarizer.parse_session_activity(start, end)
        
        # Should have extracted 'build' and 'test' keywords
        topics = activity['topics']
        assert 'build' in topics or 'test' in topics

def test_parse_session_activity_tool_counting(sample_session_log):
    """Test that tools are counted correctly"""
    with patch.object(hourly_summarizer, 'SESSION_LOG', sample_session_log):
        start = datetime.now() - timedelta(hours=1)
        end = datetime.now()
        
        activity = hourly_summarizer.parse_session_activity(start, end)
        
        tools = activity['tools']
        # 'exec' appeared multiple times, 'write' 1 time
        assert tools.get('exec', 0) >= 1
        assert activity['stats']['tool_calls'] >= 2

def test_parse_session_activity_time_filtering(temp_workspace):
    """Test that only entries within time range are included"""
    log_file = temp_workspace / "logs" / "sessions.log"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    
    now = datetime.now()
    
    # Create entries: one old, one recent
    entries = [
        {
            'timestamp': (now - timedelta(hours=2)).isoformat(),
            'message': 'Old entry',
            'tool': 'old_tool'
        },
        {
            'timestamp': (now - timedelta(minutes=10)).isoformat(),
            'message': 'Recent entry',
            'tool': 'recent_tool'
        }
    ]
    
    with open(log_file, 'w') as f:
        for entry in entries:
            f.write(json.dumps(entry) + '\n')
    
    with patch.object(hourly_summarizer, 'SESSION_LOG', log_file):
        start = now - timedelta(hours=1)
        end = now
        
        activity = hourly_summarizer.parse_session_activity(start, end)
        
        # Should only have recent_tool
        assert 'recent_tool' in activity['tools']
        assert 'old_tool' not in activity['tools']

def test_parse_session_activity_invalid_json(temp_workspace):
    """Test handling of invalid JSON in log file"""
    log_file = temp_workspace / "logs" / "sessions.log"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Mix valid and invalid JSON
    with open(log_file, 'w') as f:
        f.write('{"timestamp": "2026-01-01T12:00:00", "message": "Valid"}\n')
        f.write('This is not JSON\n')
        f.write('{"timestamp": "2026-01-01T12:01:00", "message": "Also valid"}\n')
    
    with patch.object(hourly_summarizer, 'SESSION_LOG', log_file):
        start = datetime.fromisoformat('2026-01-01T11:00:00')
        end = datetime.fromisoformat('2026-01-01T13:00:00')
        
        # Should not crash, should skip invalid line
        activity = hourly_summarizer.parse_session_activity(start, end)
        assert activity['stats']['messages'] == 2

def test_write_hourly_summary(temp_workspace):
    """Test writing summary to file"""
    with patch.object(hourly_summarizer, 'MEMORY_DIR', temp_workspace / "memory" / "hourly"):
        activity = {
            'topics': ['build', 'test', 'deploy'],
            'decisions': ['Deploy to staging first'],
            'action_items': ['Run integration tests', 'Update documentation'],
            'tools': {'exec': 5, 'write': 3, 'read': 2},
            'stats': {'messages': 25, 'tool_calls': 10, 'errors': 1}
        }
        
        hourly_summarizer.write_hourly_summary(activity)
        
        # Check file was created
        date_str = datetime.now().strftime("%Y-%m-%d")
        summary_file = temp_workspace / "memory" / "hourly" / f"{date_str}.md"
        
        assert summary_file.exists()
        
        # Check content
        content = summary_file.read_text()
        assert '## ' in content  # Has time header
        assert 'build' in content
        assert 'test' in content
        assert 'exec: 5x' in content
        assert 'Messages: 25' in content

def test_write_hourly_summary_append(temp_workspace):
    """Test that summaries append to existing file"""
    memory_dir = temp_workspace / "memory" / "hourly"
    memory_dir.mkdir(parents=True, exist_ok=True)
    
    date_str = datetime.now().strftime("%Y-%m-%d")
    summary_file = memory_dir / f"{date_str}.md"
    
    # Write first summary
    with patch.object(hourly_summarizer, 'MEMORY_DIR', memory_dir):
        activity = {
            'topics': ['first'],
            'decisions': [],
            'action_items': [],
            'tools': {},
            'stats': {'messages': 1, 'tool_calls': 0, 'errors': 0}
        }
        hourly_summarizer.write_hourly_summary(activity)
        
        first_content = summary_file.read_text()
        
        # Write second summary
        activity['topics'] = ['second']
        hourly_summarizer.write_hourly_summary(activity)
        
        second_content = summary_file.read_text()
        
        # Second should contain both
        assert 'first' in second_content
        assert 'second' in second_content
        assert len(second_content) > len(first_content)

def test_write_hourly_summary_empty_activity(temp_workspace):
    """Test writing summary with no activity"""
    with patch.object(hourly_summarizer, 'MEMORY_DIR', temp_workspace / "memory" / "hourly"):
        activity = {
            'topics': [],
            'decisions': [],
            'action_items': [],
            'tools': {},
            'stats': {'messages': 0, 'tool_calls': 0, 'errors': 0}
        }
        
        hourly_summarizer.write_hourly_summary(activity)
        
        # Should still create file with stats
        date_str = datetime.now().strftime("%Y-%m-%d")
        summary_file = temp_workspace / "memory" / "hourly" / f"{date_str}.md"
        
        assert summary_file.exists()
        content = summary_file.read_text()
        assert 'Messages: 0' in content

def test_main_integration(sample_session_log, temp_workspace):
    """Test full main function"""
    with patch.object(hourly_summarizer, 'SESSION_LOG', sample_session_log):
        with patch.object(hourly_summarizer, 'MEMORY_DIR', temp_workspace / "memory" / "hourly"):
            # Should not crash
            hourly_summarizer.main()
            
            # Should have created a summary
            date_str = datetime.now().strftime("%Y-%m-%d")
            summary_file = temp_workspace / "memory" / "hourly" / f"{date_str}.md"
            assert summary_file.exists()
