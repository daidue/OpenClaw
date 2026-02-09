"""
Pytest configuration and shared fixtures for infrastructure tests
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, MagicMock
import numpy as np

@pytest.fixture
def temp_workspace(tmp_path):
    """Create temporary workspace directory"""
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    
    # Create subdirectories
    (workspace / "memory" / "vector").mkdir(parents=True)
    (workspace / "memory" / "hourly").mkdir(parents=True)
    (workspace / "feedback" / "pending").mkdir(parents=True)
    (workspace / "feedback" / "archive").mkdir(parents=True)
    (workspace / "logs").mkdir(parents=True)
    
    return workspace

@pytest.fixture
def mock_sentence_transformer():
    """Mock SentenceTransformer model"""
    mock_model = Mock()
    
    # Mock encode method to return fake embeddings
    def mock_encode(texts, normalize_embeddings=True):
        if isinstance(texts, str):
            texts = [texts]
        # Return random 384-dim embeddings
        embeddings = np.random.rand(len(texts), 384).astype('float32')
        if normalize_embeddings:
            # Normalize to unit vectors
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            embeddings = embeddings / norms
        return embeddings
    
    mock_model.encode = mock_encode
    return mock_model

@pytest.fixture
def mock_faiss():
    """Mock FAISS library"""
    mock_faiss = Mock()
    
    # Mock IndexFlatIP
    class MockIndex:
        def __init__(self, dimension):
            self.dimension = dimension
            self.ntotal = 0
            self.vectors = []
        
        def add(self, vectors):
            self.vectors.extend(vectors)
            self.ntotal = len(self.vectors)
        
        def search(self, query, k):
            if self.ntotal == 0:
                return np.array([[]], dtype='float32'), np.array([[-1]], dtype='int64')
            
            k = min(k, self.ntotal)
            # Return mock results
            distances = np.random.rand(1, k).astype('float32')
            indices = np.arange(k, dtype='int64').reshape(1, -1)
            return distances, indices
    
    mock_faiss.IndexFlatIP = MockIndex
    
    def mock_read_index(path):
        return MockIndex(384)
    
    def mock_write_index(index, path):
        pass
    
    mock_faiss.read_index = mock_read_index
    mock_faiss.write_index = mock_write_index
    
    return mock_faiss

@pytest.fixture
def mock_whisper():
    """Mock Whisper model"""
    mock_model = Mock()
    
    def mock_transcribe(audio_path):
        return {
            'text': 'This is a test transcription',
            'segments': [
                {'start': 0.0, 'end': 2.5, 'text': 'This is a test'},
                {'start': 2.5, 'end': 4.0, 'text': 'transcription'}
            ]
        }
    
    mock_model.transcribe = mock_transcribe
    return mock_model

@pytest.fixture
def sample_conversation():
    """Sample conversation text for testing"""
    return """
    User: I need to deploy the new feature to production.
    Agent: Let me check the deployment checklist first.
    User: The tests are all passing and code review is complete.
    Agent: Great! I'll prepare the deployment script.
    """

@pytest.fixture
def sample_recommendation():
    """Sample recommendation data"""
    return {
        'title': 'Deploy new feature',
        'description': 'All tests passing, ready for production deployment',
        'agent': 'bolt',
        'category': 'deployment',
        'metadata': {'priority': 'high'}
    }

@pytest.fixture
def mock_openclaw_message():
    """Mock OpenClaw message tool"""
    mock_tool = Mock()
    mock_tool.send = Mock(return_value={'success': True, 'message_id': 'msg_123'})
    return mock_tool

@pytest.fixture
def sample_session_log(temp_workspace):
    """Create sample session log"""
    import json
    from datetime import datetime, timedelta
    
    log_file = temp_workspace / "logs" / "sessions.log"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    
    now = datetime.now()
    entries = [
        {
            'timestamp': (now - timedelta(minutes=45)).isoformat(),
            'level': 'info',
            'message': 'User requested to build new feature',
            'tool': 'exec'
        },
        {
            'timestamp': (now - timedelta(minutes=30)).isoformat(),
            'level': 'info',
            'message': 'Running tests for the build',
            'tool': 'exec'
        },
        {
            'timestamp': (now - timedelta(minutes=15)).isoformat(),
            'level': 'info',
            'message': 'Deployment script created',
            'tool': 'write'
        },
        {
            'timestamp': (now - timedelta(minutes=5)).isoformat(),
            'level': 'error',
            'message': 'Test failed on edge case',
            'tool': 'exec'
        }
    ]
    
    with open(log_file, 'w') as f:
        for entry in entries:
            f.write(json.dumps(entry) + '\n')
    
    return log_file

@pytest.fixture
def mock_llm_response():
    """Mock LLM API response"""
    return {
        'choices': [
            {
                'message': {
                    'role': 'assistant',
                    'content': 'This is a mock LLM response for testing purposes.'
                }
            }
        ]
    }
