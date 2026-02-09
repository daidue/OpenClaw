#!/usr/bin/env python3
"""
Backup utilities for infrastructure components
"""

import shutil
import gzip
from pathlib import Path
from datetime import datetime
from typing import Optional

WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
BACKUP_DIR = WORKSPACE / "backups" / "infrastructure"
VECTOR_DIR = WORKSPACE / "memory" / "vector"
FEEDBACK_DIR = WORKSPACE / "feedback"

def backup_vector_memory(compress: bool = True) -> Optional[Path]:
    """
    Backup FAISS index and metadata
    
    Args:
        compress: Whether to gzip the backups
    
    Returns:
        Path to backup directory or None on failure
    """
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = BACKUP_DIR / "vector-memory" / timestamp
    backup_path.mkdir(parents=True, exist_ok=True)
    
    try:
        index_file = VECTOR_DIR / "faiss.index"
        metadata_file = VECTOR_DIR / "metadata.pkl"
        
        if not index_file.exists():
            print("No vector index to backup")
            return None
        
        # Copy files
        if compress:
            # Gzip compressed backups
            with open(index_file, 'rb') as f_in:
                with gzip.open(backup_path / "faiss.index.gz", 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            if metadata_file.exists():
                with open(metadata_file, 'rb') as f_in:
                    with gzip.open(backup_path / "metadata.pkl.gz", 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
        else:
            # Regular copy
            shutil.copy2(index_file, backup_path / "faiss.index")
            if metadata_file.exists():
                shutil.copy2(metadata_file, backup_path / "metadata.pkl")
        
        print(f"✓ Vector memory backed up to {backup_path}")
        
        # Clean up old backups (keep last 7 days)
        cleanup_old_backups(BACKUP_DIR / "vector-memory", days=7)
        
        return backup_path
        
    except Exception as e:
        print(f"Error during backup: {e}")
        return None

def backup_feedback_logs(compress: bool = True) -> Optional[Path]:
    """
    Backup feedback logs
    
    Args:
        compress: Whether to gzip the backups
    
    Returns:
        Path to backup directory or None on failure
    """
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = BACKUP_DIR / "feedback" / timestamp
    backup_path.mkdir(parents=True, exist_ok=True)
    
    try:
        # Copy all feedback files
        if FEEDBACK_DIR.exists():
            for feedback_file in FEEDBACK_DIR.glob("*.json"):
                if compress:
                    with open(feedback_file, 'rb') as f_in:
                        with gzip.open(backup_path / f"{feedback_file.name}.gz", 'wb') as f_out:
                            shutil.copyfileobj(f_in, f_out)
                else:
                    shutil.copy2(feedback_file, backup_path)
            
            print(f"✓ Feedback logs backed up to {backup_path}")
            
            # Clean up old backups (keep last 30 days)
            cleanup_old_backups(BACKUP_DIR / "feedback", days=30)
            
            return backup_path
        else:
            print("No feedback logs to backup")
            return None
            
    except Exception as e:
        print(f"Error during feedback backup: {e}")
        return None

def cleanup_old_backups(backup_dir: Path, days: int = 7):
    """
    Remove backups older than specified days
    
    Args:
        backup_dir: Directory containing backups
        days: Number of days to keep
    """
    if not backup_dir.exists():
        return
    
    cutoff_time = datetime.now().timestamp() - (days * 24 * 60 * 60)
    
    for backup_path in backup_dir.iterdir():
        if backup_path.is_dir():
            if backup_path.stat().st_mtime < cutoff_time:
                shutil.rmtree(backup_path)
                print(f"  Removed old backup: {backup_path.name}")

def restore_vector_memory(backup_path: Path) -> bool:
    """
    Restore vector memory from backup
    
    Args:
        backup_path: Path to backup directory
    
    Returns:
        True if successful
    """
    try:
        # Check for compressed or uncompressed files
        index_file = backup_path / "faiss.index"
        index_file_gz = backup_path / "faiss.index.gz"
        metadata_file = backup_path / "metadata.pkl"
        metadata_file_gz = backup_path / "metadata.pkl.gz"
        
        VECTOR_DIR.mkdir(parents=True, exist_ok=True)
        
        # Restore index
        if index_file_gz.exists():
            with gzip.open(index_file_gz, 'rb') as f_in:
                with open(VECTOR_DIR / "faiss.index", 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        elif index_file.exists():
            shutil.copy2(index_file, VECTOR_DIR / "faiss.index")
        else:
            print("Error: No index file in backup")
            return False
        
        # Restore metadata
        if metadata_file_gz.exists():
            with gzip.open(metadata_file_gz, 'rb') as f_in:
                with open(VECTOR_DIR / "metadata.pkl", 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        elif metadata_file.exists():
            shutil.copy2(metadata_file, VECTOR_DIR / "metadata.pkl")
        
        print(f"✓ Vector memory restored from {backup_path}")
        return True
        
    except Exception as e:
        print(f"Error during restore: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "vector":
            backup_vector_memory()
        elif command == "feedback":
            backup_feedback_logs()
        elif command == "all":
            backup_vector_memory()
            backup_feedback_logs()
        elif command == "restore" and len(sys.argv) > 2:
            restore_path = Path(sys.argv[2])
            restore_vector_memory(restore_path)
        else:
            print("Usage:")
            print("  backup.py vector    - Backup vector memory")
            print("  backup.py feedback  - Backup feedback logs")
            print("  backup.py all       - Backup everything")
            print("  backup.py restore <path> - Restore from backup")
    else:
        # Default: backup everything
        backup_vector_memory()
        backup_feedback_logs()
