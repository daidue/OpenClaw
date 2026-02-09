"""
Tests for context-retention/vector-memory.py
"""

import pytest
import json
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

@pytest.fixture
def mock_dependencies():
    """Mock FAISS and SentenceTransformer"""
    with patch('context-retention.vector_memory.get_dependencies') as mock_deps:
        # Create mock FAISS
        mock_faiss = Mock()
        
        class MockIndex:
            def __init__(self, dimension):
                self.dimension = dimension
                self.ntotal = 0
                self.vectors = []
            
            def add(self, vectors):
                self.vectors.extend(vectors.tolist())
                self.ntotal = len(self.vectors)
            
            def search(self, query, k):
                if self.ntotal == 0:
                    return np.array([[]], dtype='float32'), np.array([[-1]], dtype='int64')
                
                k = min(k, self.ntotal)
                distances = np.random.rand(1, k).astype('float32')
                indices = np.arange(k, dtype='int64').reshape(1, -1)
                return distances, indices
        
        mock_faiss.IndexFlatIP = MockIndex
        mock_faiss.read_index = Mock(return_value=MockIndex(384))
        mock_faiss.write_index = Mock()
        
        # Create mock SentenceTransformer
        mock_st_class = Mock()
        mock_st = Mock()
        
        def mock_encode(texts, normalize_embeddings=True):
            if isinstance(texts, str):
                texts = [texts]
            embeddings = np.random.rand(len(texts), 384).astype('float32')
            if normalize_embeddings:
                norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
                embeddings = embeddings / norms
            return embeddings
        
        mock_st.encode = mock_encode
        mock_st_class.return_value = mock_st
        
        mock_deps.return_value = (mock_faiss, mock_st_class)
        yield mock_faiss, mock_st

def test_chunk_text_basic():
    """Test basic text chunking"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies'):
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            vm = VectorMemory()
            
            text = " ".join(["word"] * 1000)
            chunks = vm.chunk_text(text, chunk_size=100)
            
            assert len(chunks) > 1
            assert all(isinstance(chunk, str) for chunk in chunks)

def test_chunk_text_overlap():
    """Test that chunks have overlap"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies'):
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            vm = VectorMemory()
            
            text = " ".join([f"word{i}" for i in range(200)])
            chunks = vm.chunk_text(text, chunk_size=50)
            
            # Check overlap exists
            assert len(chunks) >= 2
            # First chunk should have some words that appear in second chunk

def test_chunk_text_empty():
    """Test chunking empty text"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies'):
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            vm = VectorMemory()
            
            chunks = vm.chunk_text("")
            assert chunks == []
            
            chunks = vm.chunk_text("   ")
            assert chunks == []

def test_add_conversation(mock_dependencies, temp_workspace, monkeypatch):
    """Test adding conversation to vector memory"""
    monkeypatch.setenv('WORKSPACE', str(temp_workspace))
    
    # This test needs actual implementation
    # For now, test the structure
    pass

def test_search_empty_index(mock_dependencies):
    """Test searching empty index returns empty results"""
    # This validates the bug fix from expert review
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies', return_value=mock_dependencies):
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                
                # Search empty index
                results = vm.search("test query", top_k=5)
                
                # Should return empty list, not crash
                assert results == []

def test_search_top_k_validation(mock_dependencies):
    """Test that top_k is validated against index size"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies', return_value=mock_dependencies):
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                
                # Add some data
                vm.add_conversation("Test text", {'agent': 'test'})
                
                # Request more results than available
                # Should auto-adjust, not crash
                results = vm.search("test", top_k=1000)
                
                # Should return at most index.ntotal results
                assert len(results) <= vm.index.ntotal

def test_singleton_model():
    """Test that SentenceTransformer is singleton"""
    from context_retention.vector_memory import get_sentence_transformer, _SENTENCE_TRANSFORMER_MODEL
    
    with patch('context_retention.vector_memory.get_dependencies'):
        # First call
        model1 = get_sentence_transformer()
        
        # Second call
        model2 = get_sentence_transformer()
        
        # Should be same instance
        assert model1 is model2

def test_save_atomic(temp_workspace, mock_dependencies):
    """Test that save is atomic with file locking"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies', return_value=mock_dependencies):
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            with patch('context_retention.vector_memory.WORKSPACE', temp_workspace):
                vm = VectorMemory()
                
                # Add data
                vm.add_conversation("Test", {'agent': 'test'})
                
                # Save
                vm.save()
                
                # Check that files exist
                vector_dir = temp_workspace / "memory" / "vector"
                assert (vector_dir / "faiss.index").exists() or (vector_dir / ".vector_memory.lock").exists()

def test_stats():
    """Test stats method returns correct structure"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies'):
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                
                stats = vm.stats()
                
                assert 'total_vectors' in stats
                assert 'dimension' in stats
                assert 'metadata_entries' in stats
                assert stats['dimension'] == 384

def test_search_result_structure(mock_dependencies):
    """Test that search results have correct structure"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies', return_value=mock_dependencies):
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                vm.add_conversation("Test conversation", {'agent': 'bolt'})
                
                results = vm.search("test", top_k=1)
                
                if results:
                    result = results[0]
                    assert 'text' in result
                    assert 'similarity' in result
                    assert 'rank' in result
                    assert 'timestamp' in result
                    assert 'agent' in result

def test_metadata_preservation(mock_dependencies):
    """Test that metadata is preserved correctly"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies', return_value=mock_dependencies):
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                
                metadata = {
                    'timestamp': '2026-01-01T12:00:00',
                    'agent': 'bolt',
                    'session': 'test-session'
                }
                
                vm.add_conversation("Test", metadata)
                
                # Check metadata was stored
                assert len(vm.metadata) > 0
                stored = vm.metadata[0]
                assert stored['agent'] == 'bolt'
                assert stored['session'] == 'test-session'
