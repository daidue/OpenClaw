#!/usr/bin/env python3
"""
Vector Memory Pipeline
FAISS index with sentence-transformers (all-MiniLM-L6-v2, 384-dim embeddings)
Embed every conversation chunk and index them for sub-300ms retrieval
"""

import os
import json
import time
import pickle
import numpy as np
import fcntl
import tempfile
import sys
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from common.models import ConversationMetadata, VectorSearchResult, VectorMemoryStats
from common.logging_config import setup_logging

# Setup logging
logger = setup_logging("vector-memory")

# Lazy imports to avoid startup penalty
def get_dependencies():
    """Import heavy dependencies only when needed"""
    try:
        import faiss
        from sentence_transformers import SentenceTransformer
        return faiss, SentenceTransformer
    except ImportError as e:
        print(f"Missing dependency: {e}")
        print("Install with: pip3 install faiss-cpu sentence-transformers")
        raise

# Paths
WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
VECTOR_DIR = WORKSPACE / "memory" / "vector"
INDEX_FILE = VECTOR_DIR / "faiss.index"
METADATA_FILE = VECTOR_DIR / "metadata.pkl"
MODEL_NAME = "all-MiniLM-L6-v2"

# FIX: Singleton pattern for SentenceTransformer to avoid loading multiple times
_SENTENCE_TRANSFORMER_MODEL = None

def get_sentence_transformer():
    """Get or create singleton SentenceTransformer model"""
    global _SENTENCE_TRANSFORMER_MODEL
    if _SENTENCE_TRANSFORMER_MODEL is None:
        _, SentenceTransformer = get_dependencies()
        logger.info(f"Loading model {MODEL_NAME} (singleton)...")
        _SENTENCE_TRANSFORMER_MODEL = SentenceTransformer(MODEL_NAME)
        logger.info("✓ Model loaded and cached")
    return _SENTENCE_TRANSFORMER_MODEL

class VectorMemory:
    """Vector memory with FAISS indexing"""
    
    def __init__(self):
        try:
            faiss, _ = get_dependencies()
            self.faiss = faiss
            
            VECTOR_DIR.mkdir(parents=True, exist_ok=True)
            
            # FIX: Use singleton model instead of loading each time
            self.model = get_sentence_transformer()
            self.dimension = 384  # all-MiniLM-L6-v2 output dimension
            
            # Load or create index
            if INDEX_FILE.exists() and METADATA_FILE.exists():
                logger.info("Loading existing FAISS index...")
                self.index = self.faiss.read_index(str(INDEX_FILE))
                with open(METADATA_FILE, 'rb') as f:
                    self.metadata = pickle.load(f)
                logger.info(f"Loaded index with {self.index.ntotal} vectors")
            else:
                logger.info("Creating new FAISS index...")
                self.index = self.faiss.IndexFlatIP(self.dimension)  # Inner product for cosine similarity
                self.metadata = []
        except Exception as e:
            logger.error(f"Failed to initialize VectorMemory: {e}", exc_info=True)
            raise
    
    def chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size // 2):  # 50% overlap
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
        
        return chunks
    
    def add_conversation(self, text: str, metadata: Dict) -> None:
        """Add a conversation to the vector index with validation"""
        try:
            # Validate metadata using Pydantic
            validated_metadata = ConversationMetadata(**metadata)
            
            chunks = self.chunk_text(text)
            
            if not chunks:
                logger.warning("No chunks generated from text")
                return
            
            # Generate embeddings
            embeddings = self.model.encode(chunks, normalize_embeddings=True)
            
            # Add to index
            self.index.add(embeddings.astype('float32'))
            
            # Store metadata for each chunk (convert Pydantic to dict)
            for i, chunk in enumerate(chunks):
                chunk_metadata = validated_metadata.model_dump()
                chunk_metadata.update({
                    'text': chunk,
                    'chunk_index': i,
                    'total_chunks': len(chunks)
                })
                self.metadata.append(chunk_metadata)
            
            logger.info(f"✓ Added {len(chunks)} chunks to vector memory (agent={validated_metadata.agent})")
            
        except Exception as e:
            logger.error(f"Failed to add conversation: {e}", exc_info=True)
            raise
    
    def search(self, query: str, top_k: int = 5) -> List[VectorSearchResult]:
        """Search for relevant memories with validation"""
        try:
            start_time = time.time()
            
            # Validate input
            if not query or not query.strip():
                logger.warning("Empty query provided")
                return []
            
            # FIX: Validate index is not empty and top_k is valid
            if self.index.ntotal == 0:
                logger.warning("Vector index is empty, returning no results")
                return []
            
            # FIX: Ensure top_k doesn't exceed index size
            actual_top_k = min(top_k, self.index.ntotal)
            if actual_top_k < top_k:
                logger.warning(f"Requested top_k={top_k} but index only has {self.index.ntotal} vectors, using {actual_top_k}")
            
            # Generate query embedding
            query_embedding = self.model.encode([query], normalize_embeddings=True)
            
            # Search index
            distances, indices = self.index.search(query_embedding.astype('float32'), actual_top_k)
            
            # Retrieve and validate metadata
            results = []
            for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
                if idx < len(self.metadata) and idx >= 0:  # Also check for -1 (not found)
                    result_data = self.metadata[idx].copy()
                    result_data['similarity'] = float(dist)
                    result_data['rank'] = i + 1
                    
                    # Validate with Pydantic
                    try:
                        validated_result = VectorSearchResult(**result_data)
                        results.append(validated_result)
                    except Exception as e:
                        logger.warning(f"Invalid metadata at index {idx}: {e}")
                        continue
            
            elapsed_ms = (time.time() - start_time) * 1000
            logger.info(f"✓ Search completed in {elapsed_ms:.1f}ms, found {len(results)} results")
            
            return results
            
        except Exception as e:
            logger.error(f"Search failed: {e}", exc_info=True)
            return []
    
    def save(self) -> None:
        """Save index and metadata to disk atomically with file locking"""
        # FIX: Implement atomic save with locking to prevent corruption
        lockfile = VECTOR_DIR / ".vector_memory.lock"
        
        with open(lockfile, 'w') as lock:
            # Acquire exclusive lock
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
            
            try:
                # Write to temporary files first
                temp_index = tempfile.NamedTemporaryFile(mode='wb', delete=False, dir=VECTOR_DIR, suffix='.index.tmp')
                temp_metadata = tempfile.NamedTemporaryFile(mode='wb', delete=False, dir=VECTOR_DIR, suffix='.pkl.tmp')
                
                try:
                    # Write index
                    self.faiss.write_index(self.index, temp_index.name)
                    
                    # Write metadata
                    with open(temp_metadata.name, 'wb') as f:
                        pickle.dump(self.metadata, f)
                    
                    temp_index.close()
                    temp_metadata.close()
                    
                    # Atomic rename (POSIX guarantees atomicity)
                    os.rename(temp_index.name, str(INDEX_FILE))
                    os.rename(temp_metadata.name, str(METADATA_FILE))
                    
                    print(f"✓ Saved vector memory ({len(self.metadata)} chunks)")
                    
                except Exception as e:
                    # Clean up temp files on error
                    for tmpfile in [temp_index.name, temp_metadata.name]:
                        if os.path.exists(tmpfile):
                            os.unlink(tmpfile)
                    raise e
                    
            finally:
                # Release lock
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
    
    def stats(self) -> VectorMemoryStats:
        """Get index statistics with validation"""
        try:
            stats_data = {
                'total_vectors': self.index.ntotal,
                'dimension': self.dimension,
                'metadata_entries': len(self.metadata),
                'index_file': str(INDEX_FILE),
                'size_mb': INDEX_FILE.stat().st_size / (1024*1024) if INDEX_FILE.exists() else 0
            }
            return VectorMemoryStats(**stats_data)
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            raise

def main():
    """Test the vector memory system"""
    print("Initializing Vector Memory...")
    memory = VectorMemory()
    
    # Show stats
    stats = memory.stats()
    print(f"\nVector Memory Stats:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # Example: Add a test conversation
    test_text = """
    We are building a production AI agent infrastructure with 6 systems:
    context retention, cross-agent intelligence, memory compounding,
    voice pipeline, recursive prompting, and feedback routing.
    """
    
    memory.add_conversation(test_text, {
        'timestamp': datetime.now().isoformat(),
        'agent': 'bolt',
        'session': 'test-session'
    })
    
    # Example: Search
    results = memory.search("agent infrastructure", top_k=3)
    print(f"\nSearch Results:")
    for result in results:
        print(f"  [{result['rank']}] {result['similarity']:.3f} - {result['text'][:100]}...")
    
    # Save
    memory.save()

if __name__ == "__main__":
    main()
