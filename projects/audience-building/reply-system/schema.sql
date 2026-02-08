-- Nate Calloway Reply System - SQLite Schema

-- Target accounts we monitor for reply opportunities
CREATE TABLE IF NOT EXISTS target_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT,
    niche TEXT, -- ai-agents, automation, indie-hackers, freelancing, growth-marketing
    follower_count INTEGER,
    avg_engagement TEXT, -- low, medium, high
    priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    notes TEXT,
    added_at TEXT DEFAULT (datetime('now')),
    last_checked TEXT
);

-- Posts we've seen from target accounts
CREATE TABLE IF NOT EXISTS monitored_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT UNIQUE NOT NULL,
    author_handle TEXT NOT NULL,
    content TEXT,
    posted_at TEXT,
    discovered_at TEXT DEFAULT (datetime('now')),
    reply_count INTEGER,
    repost_count INTEGER,
    like_count INTEGER,
    opportunity_score REAL, -- 0-100, calculated
    status TEXT DEFAULT 'new', -- new, drafting, queued, posted, skipped
    skip_reason TEXT
);

-- Our drafted and posted replies
CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monitored_post_id INTEGER REFERENCES monitored_posts(id),
    target_post_id TEXT NOT NULL, -- X post ID we're replying to
    draft_text TEXT NOT NULL,
    final_text TEXT, -- what actually got posted (may differ from draft)
    reply_framework TEXT, -- insight-add, experience-share, thoughtful-question, devils-advocate, resource-pointer, yes-and
    content_pillar TEXT, -- ai-architecture, automation, indie-building, human-ai-collab, dev-tools
    scheduled_for TEXT,
    posted_at TEXT,
    our_post_id TEXT, -- ID of our reply once posted
    status TEXT DEFAULT 'draft', -- draft, approved, queued, posted, failed
    impressions INTEGER,
    likes INTEGER,
    replies_received INTEGER,
    follows_gained INTEGER, -- estimated from timing
    created_at TEXT DEFAULT (datetime('now'))
);

-- Daily metrics tracking
CREATE TABLE IF NOT EXISTS daily_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    followers_count INTEGER,
    followers_gained INTEGER,
    posts_made INTEGER,
    replies_made INTEGER,
    total_impressions INTEGER,
    total_likes INTEGER,
    total_replies_received INTEGER,
    profile_visits INTEGER,
    top_reply_id INTEGER REFERENCES replies(id),
    notes TEXT
);

-- Reply queue with randomized delays
CREATE TABLE IF NOT EXISTS reply_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reply_id INTEGER REFERENCES replies(id),
    target_post_id TEXT NOT NULL,
    reply_text TEXT NOT NULL,
    scheduled_at TEXT NOT NULL, -- when to actually post (includes random delay)
    status TEXT DEFAULT 'pending', -- pending, posting, posted, failed
    attempts INTEGER DEFAULT 0,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monitored_posts_status ON monitored_posts(status);
CREATE INDEX IF NOT EXISTS idx_monitored_posts_author ON monitored_posts(author_handle);
CREATE INDEX IF NOT EXISTS idx_replies_status ON replies(status);
CREATE INDEX IF NOT EXISTS idx_reply_queue_scheduled ON reply_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reply_queue_status ON reply_queue(status);
