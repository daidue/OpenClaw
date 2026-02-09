import sys
import importlib
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock

# Add infrastructure root to path
infra_root = Path(__file__).parent.parent
sys.path.insert(0, str(infra_root))

import pytest

@pytest.fixture
def tmp_workspace(tmp_path):
    """Create a temporary workspace structure for testing."""
    dirs = ['memory/hourly', 'memory/weekly', 'memory/vector', 'feedback', 'feedback/pending', 'feedback/archive', 'shared-learnings/daily-sync', 'logs', 'voice-inbox']
    for d in dirs:
        (tmp_path / d).mkdir(parents=True, exist_ok=True)
    return tmp_path

@pytest.fixture
def temp_workspace(tmp_workspace):
    """Alias for tmp_workspace (for backward compatibility)"""
    return tmp_workspace

@pytest.fixture
def sample_session_log(tmp_workspace):
    """Create a sample session log file for testing"""
    log_file = tmp_workspace / "logs" / "sessions.log"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    
    now = datetime.now()
    
    # Create some sample log entries
    entries = [
        {
            'timestamp': now.isoformat(),
            'message': 'Starting build process',
            'tool': 'exec',
            'level': 'info'
        },
        {
            'timestamp': now.isoformat(),
            'message': 'Running tests',
            'tool': 'exec',
            'level': 'info'
        },
        {
            'timestamp': now.isoformat(),
            'message': 'Writing file',
            'tool': 'write',
            'level': 'info'
        },
        {
            'timestamp': now.isoformat(),
            'message': 'Error occurred',
            'tool': 'exec',
            'level': 'error'
        }
    ]
    
    with open(log_file, 'w') as f:
        for entry in entries:
            f.write(json.dumps(entry) + '\n')
    
    return log_file
