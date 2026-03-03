# Resource Locks

Agents create lock directories before using shared resources.

Format: 
- Lock name: `<resource>.lock`
- Lock owner: `<resource>.lock/owner` (contains PID or agent name)
- Lock timestamp: `<resource>.lock/timestamp` (mtime of directory)

Example:
```bash
# Acquire lock
if mkdir shared/locks/browser.lock; then
  echo "jeff:$$" > shared/locks/browser.lock/owner
  # Use browser
  rmdir shared/locks/browser.lock
fi
```

Stale lock detection:
- If lock older than 10 minutes, can be stolen
- Document steal in event log
