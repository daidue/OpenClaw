#!/usr/bin/env python3
"""
Distributed Lock Utility
Prevents multiple instances of cron jobs from running simultaneously
Uses file-based locking with PID tracking
"""

import os
import sys
import fcntl
import time
from pathlib import Path
from datetime import datetime
from typing import Optional

WORKSPACE = Path("/Users/jeffdaniels/.openclaw/workspace")
LOCK_DIR = WORKSPACE / ".locks"

class DistributedLock:
    """
    File-based distributed lock with automatic stale lock cleanup
    
    Usage:
        with DistributedLock('my-cron-job'):
            # Critical section - only one process can be here
            do_work()
    """
    
    def __init__(self, name: str, timeout_seconds: int = 3600):
        """
        Args:
            name: Unique name for this lock
            timeout_seconds: How long before considering lock stale (default: 1 hour)
        """
        LOCK_DIR.mkdir(parents=True, exist_ok=True)
        
        self.name = name
        self.timeout_seconds = timeout_seconds
        self.lock_file = LOCK_DIR / f"{name}.lock"
        self.lock_fd = None
    
    def acquire(self, blocking: bool = False) -> bool:
        """
        Acquire the lock
        
        Args:
            blocking: If True, wait until lock is available. If False, fail immediately.
        
        Returns:
            True if lock acquired, False otherwise
        """
        # Check for stale lock
        self._cleanup_stale_lock()
        
        try:
            # Open lock file
            self.lock_fd = open(self.lock_file, 'w')
            
            # Try to acquire exclusive lock
            flag = fcntl.LOCK_EX
            if not blocking:
                flag |= fcntl.LOCK_NB
            
            fcntl.flock(self.lock_fd.fileno(), flag)
            
            # Write PID and timestamp
            self.lock_fd.write(f"{os.getpid()}\n")
            self.lock_fd.write(f"{datetime.now().isoformat()}\n")
            self.lock_fd.flush()
            
            return True
            
        except BlockingIOError:
            # Lock is held by another process
            if self.lock_fd:
                self.lock_fd.close()
                self.lock_fd = None
            return False
        
        except Exception as e:
            # Other error
            if self.lock_fd:
                self.lock_fd.close()
                self.lock_fd = None
            raise e
    
    def release(self):
        """Release the lock"""
        if self.lock_fd:
            try:
                fcntl.flock(self.lock_fd.fileno(), fcntl.LOCK_UN)
                self.lock_fd.close()
            except:
                pass
            finally:
                self.lock_fd = None
    
    def _cleanup_stale_lock(self):
        """Clean up stale lock if it exists"""
        if not self.lock_file.exists():
            return
        
        try:
            # Check file age
            file_age = time.time() - self.lock_file.stat().st_mtime
            
            if file_age > self.timeout_seconds:
                # Lock is stale, try to read PID
                try:
                    with open(self.lock_file, 'r') as f:
                        lines = f.readlines()
                        if lines:
                            pid = int(lines[0].strip())
                            
                            # Check if process is still running
                            try:
                                os.kill(pid, 0)  # Signal 0 just checks if process exists
                                # Process exists, lock is not stale
                                return
                            except ProcessLookupError:
                                # Process doesn't exist, lock is stale
                                pass
                except:
                    pass
                
                # Remove stale lock
                print(f"⚠️  Removing stale lock: {self.lock_file} (age: {file_age:.0f}s)")
                try:
                    self.lock_file.unlink()
                except:
                    pass
        
        except Exception as e:
            # If we can't check, be conservative and don't remove
            pass
    
    def __enter__(self):
        """Context manager entry"""
        if not self.acquire(blocking=False):
            print(f"❌ Failed to acquire lock '{self.name}' - another instance is running")
            sys.exit(1)  # Exit with error code
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.release()
        return False


def main():
    """Test the distributed lock"""
    import time
    
    print("Testing distributed lock...")
    
    # Test 1: Acquire lock
    print("\nTest 1: Acquire lock")
    with DistributedLock('test-lock'):
        print("✓ Lock acquired")
        time.sleep(1)
        print("✓ Critical section executed")
    print("✓ Lock released")
    
    # Test 2: Try to acquire twice (should fail)
    print("\nTest 2: Try to acquire same lock twice")
    lock1 = DistributedLock('test-lock-2')
    lock2 = DistributedLock('test-lock-2')
    
    if lock1.acquire():
        print("✓ First acquire succeeded")
        
        if not lock2.acquire():
            print("✓ Second acquire failed (as expected)")
        else:
            print("❌ ERROR: Second acquire succeeded (should have failed)")
        
        lock1.release()
        print("✓ First lock released")
    
    # Test 3: Stale lock cleanup
    print("\nTest 3: Stale lock cleanup")
    lock3 = DistributedLock('test-lock-3', timeout_seconds=1)
    lock3.acquire()
    print("✓ Acquired lock")
    
    # Simulate stale lock by modifying mtime
    lock_path = LOCK_DIR / "test-lock-3.lock"
    os.utime(lock_path, (time.time() - 3600, time.time() - 3600))
    
    lock3.release()
    
    # Try to acquire again - should clean up stale lock
    lock4 = DistributedLock('test-lock-3', timeout_seconds=1)
    if lock4.acquire():
        print("✓ Stale lock cleaned up and reacquired")
        lock4.release()
    else:
        print("❌ ERROR: Failed to acquire after stale lock")


if __name__ == "__main__":
    main()
