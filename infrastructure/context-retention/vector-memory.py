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
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime

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

class VectorMemory:
    """Vector memory with FAISS indexing"""
    
    def __init__(self):
        faiss, SentenceTransformer = get_dependencies()
        self.faiss = faiss
        
        VECTOR_DIR.mkdir(parents=True, exist_ok=True)
        
        # Load or create model
        print(f"Loading model {MODEL_NAME}...")
        self.model = SentenceTransformer(MODEL_NAME)
        self.dimension = 384  # all-MiniLM-L6-v2 output dimension
        
        # Load or create index
        if INDEX_FILE.exists() and METADATA_FILE.exists():
            print("Loading existing FAISS index...")
            self.index = self.faiss.read_index(str(INDEX_FILE))
            with open(METADATA_FILE, 'rb') as f:
                self.metadata = pickle.load(f)
        else:
            print("Creating new FAISS index...")
            self.index = self.faiss.IndexFlatIP(self.dimension)  # Inner product for cosine similarity
            self.metadata = []
    
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
        """Add a conversation to the vector index"""
        chunks = self.chunk_text(text)
        
        if not chunks:
            return
        
        # Generate embeddings
        embeddings = self.model.encode(chunks, normalize_embeddings=True)
        
        # Add to index
        self.index.add(embeddings.astype('float32'))
        
        # Store metadata for each chunk
        for i, chunk in enumerate(chunks):
            self.metadata.append({
                'text': chunk,
                'timestamp': metadata.get('timestamp', datetime.now().isoformat()),
                'agent': metadata.get('agent', 'unknown'),
                'session': metadata.get('session', 'unknown'),
                'chunk_index': i,
                'total_chunks': len(chunks)
            })
        
        print(f"✓ Added {len(chunks)} chunks to vector memory")
    
    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search for relevant memories"""
        start_time = time.time()
        
        # Generate query embedding
        query_embedding = self.model.encode([query], normalize_embeddings=True)
        
        # Search index
        distances, indices = self.index.search(query_embedding.astype('float32'), top_k)
        
        # Retrieve metadata
        results = []
        for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
            if idx < len(self.metadata):
                result = self.metadata[idx].copy()
                result['similarity'] = float(dist)
                result['rank'] = i + 1
                results.append(result)
        
        elapsed_ms = (time.time() - start_time) * 1000
        print(f"✓ Search completed in {elapsed_ms:.1f}ms")
        
        return results
    
    def save(self) -> None:
        """Save index and metadata to disk"""
        self.faiss.write_index(self.index, str(INDEX_FILE))
        with open(METADATA_FILE, 'wb') as f:
            pickle.dump(self.metadata, f)
        print(f"✓ Saved vector memory ({len(self.metadata)} chunks)")
    
    def stats(self) -> Dict:
        """Get index statistics"""
        return {
            'total_vectors': self.index.ntotal,
            'dimension': self.dimension,
            'metadata_entries': len(self.metadata),
            'index_file': str(INDEX_FILE),
            'size_mb': INDEX_FILE.stat().st_size / (1024*1024) if INDEX_FILE.exists() else 0
        }

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
