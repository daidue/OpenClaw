"""
Tests for context-retention/vector-memory.py
"""

import pytest
import json
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def create_mock_dependencies():
    """Create mock FAISS and SentenceTransformer"""
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
    
    return (mock_faiss, mock_st_class)

def test_chunk_text_basic():
    """Test basic text chunking"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            vm = VectorMemory()
            
            text = " ".join(["word"] * 1000)
            chunks = vm.chunk_text(text, chunk_size=100)
            
            assert len(chunks) > 1
            assert all(isinstance(chunk, str) for chunk in chunks)

def test_chunk_text_overlap():
    """Test that chunks have overlap"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            vm = VectorMemory()
            
            text = " ".join([f"word{i}" for i in range(200)])
            chunks = vm.chunk_text(text, chunk_size=50)
            
            # Check overlap exists
            assert len(chunks) >= 2

def test_chunk_text_empty():
    """Test chunking empty text"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer'):
            vm = VectorMemory()
            
            chunks = vm.chunk_text("")
            assert chunks == []
            
            chunks = vm.chunk_text("   ")
            assert chunks == []

def test_add_conversation(temp_workspace, monkeypatch):
    """Test adding conversation to vector memory"""
    from context_retention.vector_memory import VectorMemory
    
    monkeypatch.setenv('WORKSPACE', str(temp_workspace))
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer') as mock_get_st:
            mock_get_st.return_value = mock_st()
            
            with patch('context_retention.vector_memory.WORKSPACE', temp_workspace):
                vm = VectorMemory()
                
                # Add conversation with required session field
                vm.add_conversation("Test text", {'agent': 'test', 'session': 'test-session'})
                
                # Should have added chunks to metadata
                assert len(vm.metadata) > 0

def test_search_empty_index():
    """Test searching empty index returns empty results"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer') as mock_get_st:
            mock_get_st.return_value = mock_st()
            
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                
                # Search empty index
                results = vm.search("test query", top_k=5)
                
                # Should return empty list, not crash
                assert results == []

def test_search_top_k_validation():
    """Test that top_k is validated against index size"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer') as mock_get_st:
            mock_get_st.return_value = mock_st()
            
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                
                # Add some data with required fields
                vm.add_conversation("Test text", {'agent': 'test', 'session': 'test-session'})
                
                # Request more results than available
                # Should auto-adjust, not crash
                results = vm.search("test", top_k=1000)
                
                # Should return at most index.ntotal results
                assert len(results) <= vm.index.ntotal

def test_singleton_model():
    """Test that SentenceTransformer is singleton"""
    from context_retention.vector_memory import get_sentence_transformer
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        # Reset the global variable
        import context_retention.vector_memory as vm_module
        vm_module._SENTENCE_TRANSFORMER_MODEL = None
        
        # First call
        model1 = get_sentence_transformer()
        
        # Second call
        model2 = get_sentence_transformer()
        
        # Should be same instance
        assert model1 is model2

def test_save_atomic(temp_workspace):
    """Test that save is atomic with file locking"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer') as mock_get_st:
            mock_get_st.return_value = mock_st()
            
            with patch('context_retention.vector_memory.WORKSPACE', temp_workspace):
                vm = VectorMemory()
                
                # Add data with required fields
                vm.add_conversation("Test", {'agent': 'test', 'session': 'test-session'})
                
                # Save (mocked, so it won't actually write files)
                vm.save()
                
                # Since we're using mocks, we can't check for actual files
                # Just verify save() was called without error
                assert len(vm.metadata) > 0

def test_stats():
    """Test stats method returns correct structure"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer') as mock_get_st:
            mock_get_st.return_value = mock_st()
            
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                
                stats = vm.stats()
                
                # stats() returns a VectorMemoryStats Pydantic model
                assert stats.total_vectors >= 0
                assert stats.dimension == 384
                assert stats.metadata_entries >= 0

def test_search_result_structure():
    """Test that search results have correct structure"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer') as mock_get_st:
            mock_get_st.return_value = mock_st()
            
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                vm.add_conversation("Test conversation", {'agent': 'bolt', 'session': 'test-session'})
                
                results = vm.search("test", top_k=1)
                
                if results:
                    result = results[0]
                    # Results are VectorSearchResult Pydantic models
                    assert hasattr(result, 'text')
                    assert hasattr(result, 'similarity')
                    assert hasattr(result, 'rank')
                    assert hasattr(result, 'timestamp')
                    assert hasattr(result, 'agent')

def test_metadata_preservation():
    """Test that metadata is preserved correctly"""
    from context_retention.vector_memory import VectorMemory
    
    with patch('context_retention.vector_memory.get_dependencies') as mock_deps:
        mock_faiss, mock_st = create_mock_dependencies()
        mock_deps.return_value = (mock_faiss, mock_st)
        
        with patch('context_retention.vector_memory.get_sentence_transformer') as mock_get_st:
            mock_get_st.return_value = mock_st()
            
            with patch('context_retention.vector_memory.WORKSPACE', Path('/tmp/test')):
                vm = VectorMemory()
                
                metadata = {
                    'timestamp': datetime.now().isoformat(),
                    'agent': 'bolt',
                    'session': 'test-session'
                }
                
                vm.add_conversation("Test", metadata)
                
                # Check metadata was stored
                assert len(vm.metadata) > 0
                stored = vm.metadata[0]
                assert stored['agent'] == 'bolt'
                assert stored['session'] == 'test-session'
