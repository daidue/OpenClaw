#!/bin/bash
# Nate Calloway Reply System — Monitor Target Accounts
# Run via cron every 10 minutes during active hours
# Requires: bird CLI with Nate's cookies

set -euo pipefail

DB="/Users/jeffdaniels/.openclaw/workspace/projects/audience-building/reply-system/nate.db"
LOG="/Users/jeffdaniels/.openclaw/workspace/projects/audience-building/reply-system/monitor.log"

# Check bird is authenticated
if ! bird whoami &>/dev/null; then
    echo "$(date -Iseconds) ERROR: bird not authenticated" >> "$LOG"
    exit 1
fi

# Get top priority accounts
ACCOUNTS=$(sqlite3 "$DB" "SELECT handle FROM target_accounts WHERE priority <= 5 ORDER BY priority ASC, RANDOM() LIMIT 8;")

for handle in $ACCOUNTS; do
    echo "$(date -Iseconds) Checking @$handle" >> "$LOG"
    
    # Get recent posts (last 3 hours)
    POSTS=$(bird timeline "$handle" -n 3 --json 2>/dev/null || echo "[]")
    
    if [ "$POSTS" = "[]" ] || [ -z "$POSTS" ]; then
        continue
    fi
    
    # Parse and store new posts
    echo "$POSTS" | python3 -c "
import json, sys, sqlite3

db = sqlite3.connect('$DB')
posts = json.load(sys.stdin)

for p in posts:
    post_id = p.get('id', '')
    if not post_id:
        continue
    
    # Check if already tracked
    exists = db.execute('SELECT 1 FROM monitored_posts WHERE post_id=?', (post_id,)).fetchone()
    if exists:
        continue
    
    content = p.get('text', '')
    author = p.get('author', {}).get('handle', '$handle')
    likes = p.get('likes', 0)
    replies = p.get('replies', 0)
    reposts = p.get('reposts', 0)
    posted_at = p.get('created_at', '')
    
    # Simple opportunity scoring
    score = min(100, likes * 0.5 + replies * 2 + reposts * 1)
    
    db.execute('''INSERT INTO monitored_posts 
        (post_id, author_handle, content, posted_at, reply_count, repost_count, like_count, opportunity_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (post_id, author, content, posted_at, replies, reposts, likes, score))
    
    print(f'NEW: @{author} (score: {score:.0f}): {content[:80]}...')

db.commit()
db.close()
" 2>/dev/null || true
    
    # Rate limit: 2 second delay between account checks
    sleep 2
done

# Update last_checked timestamps
sqlite3 "$DB" "UPDATE target_accounts SET last_checked = datetime('now') WHERE handle IN ($(echo $ACCOUNTS | sed "s/\([^ ]*\)/'\1'/g" | tr ' ' ','));" 2>/dev/null || true

echo "$(date -Iseconds) Monitor cycle complete" >> "$LOG"
