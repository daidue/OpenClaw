#!/usr/bin/env python3
"""
agent-intelligence.py — Unified infrastructure pipeline for OpenClaw agent intelligence.

Replaces 18 fragmented scripts with one clean system that reads real session
transcripts from ~/.openclaw/agents/{agentId}/sessions/*.jsonl

Subcommands: hourly, daily, weekly, signals, status

stdlib only. No pip packages.
"""

import argparse
import json
import logging
import os
import re
import sys
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

log = logging.getLogger("agent-intelligence")

# ============================================================================
# CONFIGURATION
# ============================================================================

AGENTS = ["main", "commerce", "researcher", "content", "dev", "growth", "analytics", "ops"]
OPENCLAW_DIR = Path.home() / ".openclaw"
SESSIONS_ROOT = OPENCLAW_DIR / "agents"
WORKSPACE = OPENCLAW_DIR / "workspace"
MEMORY_DIR = WORKSPACE / "memory"
SCRIPTS_DIR = WORKSPACE / "scripts"
STATE_FILE = SCRIPTS_DIR / ".intelligence-state.json"

# Directories for output
HOURLY_DIR = MEMORY_DIR / "hourly"
DAILY_DIR = MEMORY_DIR / "daily"
WEEKLY_DIR = MEMORY_DIR / "weekly"

# Known project names / topics to detect
KNOWN_PROJECTS = [
    "invoice tracker", "polymarket", "pinterest", "etsy", "reddit",
    "gumroad", "notion", "freelancer toolkit", "landing page",
    "template", "newsletter", "nate calloway", "protonmail",
    "google voice", "netlify", "stripe", "shopify", "tiktok",
    "youtube", "instagram", "twitter", "x account",
]

# Error patterns — applied only to assistant text, NOT raw JSON
ERROR_PATTERNS = [
    re.compile(r'Traceback \(most recent', re.I),
    re.compile(r'permission denied', re.I),
    re.compile(r'\bOSError\b|\bIOError\b|\bFileNotFoundError\b'),
    re.compile(r'\bfailed to\b', re.I),
    re.compile(r'\bcommand failed\b', re.I),
    re.compile(r'\bcould not connect\b', re.I),
]

# Decision patterns — tighter to avoid false positives
DECISION_PATTERNS = [
    re.compile(r'\b(Taylor|Jeff)\s+(approved?|rejected?|decided)\b', re.I),
    re.compile(r'\blet\'s go with\b', re.I),
    re.compile(r'\bdecision:\s', re.I),
    re.compile(r'\bwe\'re going with\b', re.I),
]

# Precompiled topic regex for performance
_TOPIC_REGEX = re.compile(
    r'\b(' + '|'.join(re.escape(p) for p in KNOWN_PROJECTS) + r')\b', re.I
)

# EST timezone offset (UTC-5)
EST = timezone(timedelta(hours=-5))


# ============================================================================
# CORE: Session Reading
# ============================================================================

def get_session_files(agent: str):
    """Get all .jsonl session files for an agent (excluding deleted/sessions.json)."""
    sessions_dir = SESSIONS_ROOT / agent / "sessions"
    if not sessions_dir.exists():
        return []
    return [f for f in sessions_dir.glob("*.jsonl") if ".deleted." not in f.name]


def get_recent_session_files(agent: str, since: datetime):
    """Get session files modified since the given datetime."""
    files = []
    for f in get_session_files(agent):
        try:
            mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
            if mtime >= since:
                files.append(f)
        except OSError:
            continue
    return files


def parse_session_file(path: Path, since: Optional[datetime] = None) -> dict:
    """
    Parse a JSONL session file. Returns:
    {
        'session_id': str,
        'messages': [{'role': str, 'timestamp': str, 'texts': [str], 'tools': [str]}],
        'tool_calls': Counter,
        'topics': set,
        'errors': [str],
        'decisions': [str],
        'message_count': int,
    }
    """
    result = {
        'session_id': None,
        'messages': [],
        'tool_calls': Counter(),
        'topics': set(),
        'errors': [],
        'decisions': [],
        'message_count': 0,
        'compaction_summaries': [],
    }

    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except (json.JSONDecodeError, ValueError):
                    continue

                entry_type = entry.get('type')
                timestamp_str = entry.get('timestamp', '')

                # Filter by time if requested
                if since and timestamp_str:
                    try:
                        entry_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        if entry_time < since:
                            continue
                    except (ValueError, TypeError):
                        pass

                if entry_type == 'session':
                    result['session_id'] = entry.get('id')

                elif entry_type == 'compaction':
                    summary = entry.get('summary', '')
                    if summary:
                        result['compaction_summaries'].append(summary[:500])
                        _extract_topics(summary, result['topics'])

                elif entry_type == 'message':
                    msg = entry.get('message', {})
                    role = msg.get('role', '')
                    content_blocks = msg.get('content', [])
                    if not isinstance(content_blocks, list):
                        continue

                    result['message_count'] += 1
                    texts = []
                    tools = []

                    for block in content_blocks:
                        if not isinstance(block, dict):
                            continue
                        btype = block.get('type')

                        if btype == 'text':
                            text = block.get('text', '')
                            texts.append(text)
                            _extract_topics(text, result['topics'])
                            _extract_errors(text, result['errors'])
                            _extract_decisions(text, result['decisions'])

                        elif btype == 'toolCall':
                            tool_name = block.get('name', 'unknown')
                            tools.append(tool_name)
                            result['tool_calls'][tool_name] += 1

                    result['messages'].append({
                        'role': role,
                        'timestamp': timestamp_str,
                        'texts': texts,
                        'tools': tools,
                    })

    except (OSError, IOError) as e:
        result['errors'].append(f"File read error: {e}")

    return result


def _extract_topics(text: str, topics: set):
    """Extract known project/topic mentions from text."""
    for m in _TOPIC_REGEX.finditer(text):
        topics.add(m.group(1).lower())

    # Also extract URLs
    urls = re.findall(r'https?://[^\s<>"\')\]]+', text)
    for url in urls[:5]:  # cap at 5 per text block
        # Extract domain
        m = re.match(r'https?://([^/]+)', url)
        if m:
            topics.add(f"url:{m.group(1)}")


def _extract_errors(text: str, errors: list):
    """Extract error mentions from text. Skips JSON structure matches."""
    # Skip text that looks like raw JSON (starts with { or ")
    stripped = text.strip()
    if stripped.startswith('{') or stripped.startswith('"'):
        return
    # Cap input size to prevent regex DoS
    text = text[:10000]
    for pattern in ERROR_PATTERNS:
        if pattern.search(text):
            for line in text.split('\n'):
                line = line.strip()
                if pattern.search(line) and len(line) > 10:
                    # Sanitize for markdown output
                    clean = line.replace('`', '').replace('[', '(').replace(']', ')')[:200]
                    errors.append(clean)
                    break
            break


def _extract_decisions(text: str, decisions: list):
    """Extract decision patterns from text. Tighter matching to reduce noise."""
    stripped = text.strip()
    if stripped.startswith('{') or stripped.startswith('"'):
        return
    text = text[:10000]
    for pattern in DECISION_PATTERNS:
        m = pattern.search(text)
        if m:
            start = max(0, m.start() - 30)
            end = min(len(text), m.end() + 80)
            clean = text[start:end].strip().replace('`', '').replace('[', '(').replace(']', ')')[:200]
            decisions.append(clean)
            break


# ============================================================================
# UTILITIES
# ============================================================================

def atomic_write(path: Path, content: str):
    """Write content to file atomically via temp file + rename."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(content)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def dedup_errors(errors: list, max_count: int = 15) -> list:
    """Deduplicate error strings, preserving order."""
    seen = set()
    result = []
    for e in errors:
        key = e[:80]  # dedup on first 80 chars
        if key not in seen:
            seen.add(key)
            result.append(e)
            if len(result) >= max_count:
                break
    return result


# ============================================================================
# STATE MANAGEMENT
# ============================================================================

def load_state() -> dict:
    """Load cached processing state."""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {'last_hourly': None, 'last_daily': None, 'processed_files': {}}


def save_state(state: dict):
    """Save processing state atomically."""
    atomic_write(STATE_FILE, json.dumps(state, indent=2))


# ============================================================================
# SUBCOMMAND: hourly
# ============================================================================

def cmd_hourly(args):
    """Generate hourly summary of agent activity."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=1)
    hour_label = now.astimezone(EST).strftime('%Y-%m-%d-%H')

    HOURLY_DIR.mkdir(parents=True, exist_ok=True)
    output_path = HOURLY_DIR / f"{hour_label}.md"

    agent_data = {}
    total_messages = 0
    all_tools = Counter()
    all_topics = set()
    all_errors = []

    for agent in AGENTS:
        files = get_recent_session_files(agent, since)
        if not files:
            continue

        agent_result = {
            'message_count': 0,
            'tool_calls': Counter(),
            'topics': set(),
            'errors': [],
            'decisions': [],
        }

        for f in files:
            parsed = parse_session_file(f, since=since)
            agent_result['message_count'] += parsed['message_count']
            agent_result['tool_calls'] += parsed['tool_calls']
            agent_result['topics'] |= parsed['topics']
            agent_result['errors'].extend(parsed['errors'][:10])
            agent_result['decisions'].extend(parsed['decisions'][:5])

        if agent_result['message_count'] > 0:
            agent_data[agent] = agent_result
            total_messages += agent_result['message_count']
            all_tools += agent_result['tool_calls']
            all_topics |= agent_result['topics']
            all_errors.extend(agent_result['errors'])

    # Write markdown summary
    lines = [
        f"# Hourly Summary — {now.astimezone(EST).strftime('%Y-%m-%d %H:%M EST')}",
        f"",
        f"**Period:** {since.astimezone(EST).strftime('%H:%M')} → {now.astimezone(EST).strftime('%H:%M')} EST",
        f"**Total messages:** {total_messages}",
        f"**Active agents:** {len(agent_data)}",
        f"",
    ]

    if not agent_data:
        lines.append("_No agent activity in the last hour._")
    else:
        # Per-agent breakdown
        lines.append("## Agent Activity")
        lines.append("")
        for agent, data in sorted(agent_data.items(), key=lambda x: -x[1]['message_count']):
            lines.append(f"### {agent}")
            lines.append(f"- Messages: {data['message_count']}")
            if data['tool_calls']:
                top_tools = data['tool_calls'].most_common(5)
                tools_str = ", ".join(f"`{t}`({n})" for t, n in top_tools)
                lines.append(f"- Tools: {tools_str}")
            if data['topics']:
                clean_topics = [t for t in data['topics'] if not t.startswith('url:')]
                if clean_topics:
                    lines.append(f"- Topics: {', '.join(sorted(clean_topics))}")
            if data['decisions']:
                lines.append(f"- Decisions: {len(data['decisions'])}")
            if data['errors']:
                lines.append(f"- ⚠️ Errors: {len(data['errors'])}")
            lines.append("")

        # Top tools overall
        if all_tools:
            lines.append("## Top Tools")
            for tool, count in all_tools.most_common(10):
                lines.append(f"- `{tool}`: {count}")
            lines.append("")

        # Errors (deduplicated)
        unique_errors = dedup_errors(all_errors, 10)
        if unique_errors:
            lines.append("## Errors")
            for err in unique_errors:
                lines.append(f"- {err[:150]}")
            lines.append("")

    content = "\n".join(lines) + "\n"
    atomic_write(output_path, content)
    print(f"✅ Hourly summary written to {output_path}")
    print(f"   {total_messages} messages from {len(agent_data)} agents")

    # Update state
    state = load_state()
    state['last_hourly'] = now.isoformat()
    save_state(state)


# ============================================================================
# SUBCOMMAND: daily
# ============================================================================

def cmd_daily(args):
    """Generate daily summary by aggregating hourly data + scanning today's sessions."""
    now = datetime.now(timezone.utc)
    today = now.astimezone(EST).date()
    today_str = today.isoformat()
    # Start of today in UTC
    today_start = datetime(today.year, today.month, today.day, tzinfo=EST).astimezone(timezone.utc)

    DAILY_DIR.mkdir(parents=True, exist_ok=True)
    output_path = DAILY_DIR / f"{today_str}-summary.md"

    agent_data = {}
    total_messages = 0
    all_tools = Counter()
    all_topics_by_agent = defaultdict(set)
    all_errors = []
    all_decisions = []

    for agent in AGENTS:
        files = get_recent_session_files(agent, today_start)
        if not files:
            continue

        agent_result = {
            'message_count': 0,
            'tool_calls': Counter(),
            'topics': set(),
            'errors': [],
            'decisions': [],
            'session_count': len(files),
        }

        for f in files:
            parsed = parse_session_file(f, since=today_start)
            agent_result['message_count'] += parsed['message_count']
            agent_result['tool_calls'] += parsed['tool_calls']
            agent_result['topics'] |= parsed['topics']
            agent_result['errors'].extend(parsed['errors'][:20])
            agent_result['decisions'].extend(parsed['decisions'][:10])

        if agent_result['message_count'] > 0 or agent_result['session_count'] > 0:
            agent_data[agent] = agent_result
            total_messages += agent_result['message_count']
            all_tools += agent_result['tool_calls']
            all_topics_by_agent[agent] = agent_result['topics']
            all_errors.extend(agent_result['errors'])
            all_decisions.extend(agent_result['decisions'])

    # Detect cross-agent topics
    topic_agents = defaultdict(set)
    for agent, topics in all_topics_by_agent.items():
        for topic in topics:
            if not topic.startswith('url:'):
                topic_agents[topic].add(agent)
    cross_topics = {t: agents for t, agents in topic_agents.items() if len(agents) >= 2}

    # Write markdown
    lines = [
        f"# Daily Summary — {today_str}",
        f"",
        f"**Total messages:** {total_messages}",
        f"**Active agents:** {len(agent_data)}",
        f"**Total tool calls:** {sum(all_tools.values())}",
        f"",
    ]

    if agent_data:
        lines.append("## Agent Breakdown")
        lines.append("")
        lines.append("| Agent | Messages | Sessions | Top Tools | Topics |")
        lines.append("|-------|----------|----------|-----------|--------|")
        for agent in AGENTS:
            if agent not in agent_data:
                continue
            d = agent_data[agent]
            top3 = ", ".join(t for t, _ in d['tool_calls'].most_common(3))
            clean_topics = sorted(t for t in d['topics'] if not t.startswith('url:'))[:3]
            lines.append(
                f"| {agent} | {d['message_count']} | {d['session_count']} "
                f"| {top3} | {', '.join(clean_topics)} |"
            )
        lines.append("")

        # Tool usage
        if all_tools:
            lines.append("## Tool Usage")
            lines.append("")
            for tool, count in all_tools.most_common(15):
                lines.append(f"- `{tool}`: {count}")
            lines.append("")

        # Cross-agent topics
        if cross_topics:
            lines.append("## Cross-Agent Topics")
            lines.append("")
            for topic, agents in sorted(cross_topics.items()):
                lines.append(f"- **{topic}**: {', '.join(sorted(agents))}")
            lines.append("")

        # Errors (deduplicated)
        unique_errors = dedup_errors(all_errors, 15)
        if unique_errors:
            lines.append("## Errors")
            lines.append("")
            for err in unique_errors:
                lines.append(f"- {err[:150]}")
            lines.append("")

        # Decisions
        if all_decisions:
            lines.append("## Key Decisions")
            lines.append("")
            for dec in all_decisions[:10]:
                lines.append(f"- {dec[:200]}")
            lines.append("")

    content = "\n".join(lines) + "\n"
    atomic_write(output_path, content)
    print(f"✅ Daily summary written to {output_path}")
    print(f"   {total_messages} messages, {len(agent_data)} agents, {sum(all_tools.values())} tool calls")

    # Append to activity.jsonl (with dedup by date)
    activity_path = MEMORY_DIR / "activity.jsonl"
    activity_entry = {
        'date': today_str,
        'timestamp': now.isoformat(),
        'total_messages': total_messages,
        'active_agents': list(agent_data.keys()),
        'top_tools': dict(all_tools.most_common(10)),
        'cross_topics': {t: list(a) for t, a in cross_topics.items()},
        'error_count': len(all_errors),
    }

    # Read existing entries, replace any with same date
    existing = []
    if activity_path.exists():
        with open(activity_path, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if entry.get('date') != today_str:
                        existing.append(line.strip())
                except (json.JSONDecodeError, ValueError):
                    existing.append(line.strip())
    existing.append(json.dumps(activity_entry))
    atomic_write(activity_path, '\n'.join(existing) + '\n')

    # Update state
    state = load_state()
    state['last_daily'] = now.isoformat()
    save_state(state)


# ============================================================================
# SUBCOMMAND: weekly
# ============================================================================

def cmd_weekly(args):
    """Generate weekly synthesis from daily summaries."""
    now = datetime.now(timezone.utc)
    today = now.astimezone(EST).date()
    week_num = today.isocalendar()[1]
    year = today.isocalendar()[0]

    WEEKLY_DIR.mkdir(parents=True, exist_ok=True)
    output_path = WEEKLY_DIR / f"{year}-W{week_num:02d}.md"

    # Read activity.jsonl for the past 7 days
    activity_path = MEMORY_DIR / "activity.jsonl"
    week_start = today - timedelta(days=7)
    daily_entries = []

    if activity_path.exists():
        with open(activity_path, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    entry_date = entry.get('date', '')
                    if entry_date >= week_start.isoformat() and entry_date <= today.isoformat():
                        daily_entries.append(entry)
                except (json.JSONDecodeError, ValueError):
                    continue

    # Also read daily summary files
    daily_summaries = []
    for i in range(7):
        d = today - timedelta(days=i)
        summary_path = DAILY_DIR / f"{d.isoformat()}-summary.md"
        if summary_path.exists():
            daily_summaries.append((d.isoformat(), summary_path.read_text()[:2000]))

    # Aggregate stats
    total_messages = sum(e.get('total_messages', 0) for e in daily_entries)
    all_agents = set()
    tool_totals = Counter()
    all_cross_topics = defaultdict(set)
    total_errors = 0

    for entry in daily_entries:
        all_agents.update(entry.get('active_agents', []))
        for tool, count in entry.get('top_tools', {}).items():
            tool_totals[tool] += count
        for topic, agents in entry.get('cross_topics', {}).items():
            all_cross_topics[topic].update(agents)
        total_errors += entry.get('error_count', 0)

    # Detect trends: topics appearing on multiple days
    topic_days = defaultdict(int)
    for entry in daily_entries:
        for topic in entry.get('cross_topics', {}):
            topic_days[topic] += 1
    recurring = {t: d for t, d in topic_days.items() if d >= 2}

    lines = [
        f"# Weekly Synthesis — {year}-W{week_num:02d}",
        f"",
        f"**Period:** {week_start.isoformat()} → {today.isoformat()}",
        f"**Total messages:** {total_messages}",
        f"**Active agents:** {', '.join(sorted(all_agents)) if all_agents else 'none'}",
        f"**Total errors:** {total_errors}",
        f"",
    ]

    if tool_totals:
        lines.append("## Tool Usage Trends")
        lines.append("")
        for tool, count in tool_totals.most_common(15):
            lines.append(f"- `{tool}`: {count}")
        lines.append("")

    if recurring:
        lines.append("## Recurring Topics")
        lines.append("")
        for topic, days in sorted(recurring.items(), key=lambda x: -x[1]):
            agents = all_cross_topics.get(topic, set())
            lines.append(f"- **{topic}** — {days} days, agents: {', '.join(sorted(agents))}")
        lines.append("")

    if all_cross_topics:
        lines.append("## Cross-Agent Collaboration")
        lines.append("")
        for topic, agents in sorted(all_cross_topics.items()):
            if len(agents) >= 2:
                lines.append(f"- {topic}: {', '.join(sorted(agents))}")
        lines.append("")

    # Include daily highlights
    if daily_summaries:
        lines.append("## Daily Highlights")
        lines.append("")
        for date_str, content in sorted(daily_summaries):
            # Extract first few meaningful lines
            summary_lines = [l for l in content.split('\n') if l.strip() and not l.startswith('#')][:3]
            lines.append(f"### {date_str}")
            for sl in summary_lines:
                lines.append(f"  {sl}")
            lines.append("")

    content = "\n".join(lines) + "\n"
    atomic_write(output_path, content)
    print(f"✅ Weekly synthesis written to {output_path}")
    print(f"   {total_messages} messages over {len(daily_entries)} days, {len(all_agents)} agents")


# ============================================================================
# SUBCOMMAND: signals
# ============================================================================

def cmd_signals(args):
    """Detect cross-agent signals in the last 24 hours."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=24)

    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    output_path = MEMORY_DIR / "cross-signals.json"

    agent_topics = {}
    agent_tools = {}
    agent_errors = {}

    for agent in AGENTS:
        files = get_recent_session_files(agent, since)
        topics = set()
        tools = Counter()
        errors = []

        for f in files:
            parsed = parse_session_file(f, since=since)
            topics |= parsed['topics']
            tools += parsed['tool_calls']
            errors.extend(parsed['errors'][:10])

        if topics or tools or errors:
            agent_topics[agent] = topics
            agent_tools[agent] = tools
            agent_errors[agent] = errors

    # Find topics shared across agents
    topic_agents = defaultdict(list)
    for agent, topics in agent_topics.items():
        for topic in topics:
            if not topic.startswith('url:'):
                topic_agents[topic].append(agent)

    shared_topics = [
        {'topic': t, 'agents': agents, 'signal': 'collaboration' if len(agents) >= 2 else 'single'}
        for t, agents in topic_agents.items()
        if len(agents) >= 2
    ]

    # Find tools used by multiple agents
    tool_agents = defaultdict(list)
    for agent, tools in agent_tools.items():
        for tool in tools:
            tool_agents[tool].append(agent)
    shared_tools = [
        {'tool': t, 'agents': agents}
        for t, agents in tool_agents.items()
        if len(agents) >= 2
    ]

    # Compile signals
    signals = {
        'timestamp': now.isoformat(),
        'period_hours': 24,
        'shared_topics': sorted(shared_topics, key=lambda x: -len(x['agents'])),
        'shared_tools': sorted(shared_tools, key=lambda x: -len(x['agents'])),
        'agent_error_counts': {a: len(e) for a, e in agent_errors.items() if e},
        'active_agents': list(agent_topics.keys()),
    }

    atomic_write(output_path, json.dumps(signals, indent=2) + '\n')
    print(f"✅ Cross-agent signals written to {output_path}")
    print(f"   {len(shared_topics)} shared topics, {len(shared_tools)} shared tools")
    print(f"   Active agents: {', '.join(signals['active_agents'])}")


# ============================================================================
# SUBCOMMAND: status
# ============================================================================

def cmd_status(args):
    """Print quick one-line status."""
    now = datetime.now(timezone.utc)
    today_start = datetime(
        now.astimezone(EST).year, now.astimezone(EST).month, now.astimezone(EST).day,
        tzinfo=EST
    ).astimezone(timezone.utc)

    active = 0
    total_msgs = 0
    tools = Counter()
    error_count = 0

    for agent in AGENTS:
        files = get_recent_session_files(agent, today_start)
        if files:
            active += 1
        for f in files:
            parsed = parse_session_file(f, since=today_start)
            total_msgs += parsed['message_count']
            tools += parsed['tool_calls']
            error_count += len(parsed['errors'])

    top3 = ", ".join(f"{t}({n})" for t, n in tools.most_common(3))
    err_str = f", ⚠️ {error_count} errors" if error_count else ""
    print(f"📊 {active} agents active | {total_msgs} msgs today | top: {top3}{err_str}")


# ============================================================================
# MAIN
# ============================================================================

def main():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )

    parser = argparse.ArgumentParser(
        description="OpenClaw Agent Intelligence Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n  python3 agent-intelligence.py hourly\n  python3 agent-intelligence.py status",
    )
    sub = parser.add_subparsers(dest='command', required=True)

    sub.add_parser('hourly', help='Generate hourly activity summary')
    sub.add_parser('daily', help='Generate daily activity summary')
    sub.add_parser('weekly', help='Generate weekly synthesis')
    sub.add_parser('signals', help='Detect cross-agent signals (24h)')
    sub.add_parser('status', help='Quick one-line status')

    args = parser.parse_args()

    # Ensure output dirs exist
    for d in [HOURLY_DIR, DAILY_DIR, WEEKLY_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    commands = {
        'hourly': cmd_hourly,
        'daily': cmd_daily,
        'weekly': cmd_weekly,
        'signals': cmd_signals,
        'status': cmd_status,
    }
    try:
        commands[args.command](args)
    except Exception as e:
        log.error(f"Command '{args.command}' failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
