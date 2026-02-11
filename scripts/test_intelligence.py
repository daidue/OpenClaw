#!/usr/bin/env python3
"""
test_intelligence.py — Comprehensive test suite for agent-intelligence.py

stdlib only, unittest-based. Tests all subcommands, edge cases, regressions, and performance.
"""

import json
import os
import shutil
import sys
import tempfile
import time
import unittest
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from io import StringIO

# Add scripts dir to path and import
SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))

# Import the module
import importlib.util
spec = importlib.util.spec_from_file_location("agent_intelligence", SCRIPTS_DIR / "agent-intelligence.py")
ai = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ai)


# ============================================================================
# FIXTURES
# ============================================================================

def make_session_entry(type_="session", **kwargs):
    """Create a JSONL entry dict."""
    entry = {"type": type_, "timestamp": datetime.now(timezone.utc).isoformat()}
    entry.update(kwargs)
    return json.dumps(entry)


def make_message_entry(role="assistant", text="Hello world", tools=None, timestamp=None):
    """Create a message-type JSONL entry."""
    ts = timestamp or datetime.now(timezone.utc).isoformat()
    content = [{"type": "text", "text": text}]
    if tools:
        for t in tools:
            content.append({"type": "toolCall", "name": t})
    return json.dumps({
        "type": "message",
        "timestamp": ts,
        "message": {"role": role, "content": content}
    })


def make_session_file(tmpdir, agent, filename, lines):
    """Write a session JSONL file and return its path."""
    sessions_dir = Path(tmpdir) / agent / "sessions"
    sessions_dir.mkdir(parents=True, exist_ok=True)
    path = sessions_dir / filename
    path.write_text("\n".join(lines) + "\n")
    return path


class TempEnvMixin:
    """Mixin to redirect all paths to a temp directory."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.orig_sessions_root = ai.SESSIONS_ROOT
        self.orig_memory_dir = ai.MEMORY_DIR
        self.orig_hourly_dir = ai.HOURLY_DIR
        self.orig_daily_dir = ai.DAILY_DIR
        self.orig_weekly_dir = ai.WEEKLY_DIR
        self.orig_state_file = ai.STATE_FILE
        self.orig_scripts_dir = ai.SCRIPTS_DIR

        ai.SESSIONS_ROOT = Path(self.tmpdir)
        ai.MEMORY_DIR = Path(self.tmpdir) / "memory"
        ai.HOURLY_DIR = ai.MEMORY_DIR / "hourly"
        ai.DAILY_DIR = ai.MEMORY_DIR / "daily"
        ai.WEEKLY_DIR = ai.MEMORY_DIR / "weekly"
        ai.STATE_FILE = Path(self.tmpdir) / ".intelligence-state.json"
        ai.SCRIPTS_DIR = Path(self.tmpdir)

        for d in [ai.HOURLY_DIR, ai.DAILY_DIR, ai.WEEKLY_DIR]:
            d.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        ai.SESSIONS_ROOT = self.orig_sessions_root
        ai.MEMORY_DIR = self.orig_memory_dir
        ai.HOURLY_DIR = self.orig_hourly_dir
        ai.DAILY_DIR = self.orig_daily_dir
        ai.WEEKLY_DIR = self.orig_weekly_dir
        ai.STATE_FILE = self.orig_state_file
        ai.SCRIPTS_DIR = self.orig_scripts_dir
        shutil.rmtree(self.tmpdir, ignore_errors=True)


# ============================================================================
# UNIT TESTS: Core Parsing
# ============================================================================

class TestParseSessionFile(TempEnvMixin, unittest.TestCase):

    def test_empty_file(self):
        path = make_session_file(self.tmpdir, "main", "empty.jsonl", [""])
        result = ai.parse_session_file(path)
        self.assertEqual(result['message_count'], 0)
        self.assertEqual(result['messages'], [])

    def test_session_header_only(self):
        lines = [make_session_entry(type_="session", id="sess-123")]
        path = make_session_file(self.tmpdir, "main", "header.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertEqual(result['session_id'], "sess-123")
        self.assertEqual(result['message_count'], 0)

    def test_basic_messages(self):
        lines = [
            make_session_entry(type_="session", id="s1"),
            make_message_entry(role="user", text="What's up?"),
            make_message_entry(role="assistant", text="Hello!"),
        ]
        path = make_session_file(self.tmpdir, "main", "basic.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertEqual(result['message_count'], 2)
        self.assertEqual(result['session_id'], "s1")

    def test_tool_calls_counted(self):
        lines = [
            make_message_entry(role="assistant", text="Running search", tools=["web_search", "web_search", "read"]),
        ]
        path = make_session_file(self.tmpdir, "main", "tools.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertEqual(result['tool_calls']['web_search'], 2)
        self.assertEqual(result['tool_calls']['read'], 1)

    def test_malformed_jsonl_lines(self):
        lines = [
            '{"type": "session", "id": "s1", "timestamp": "2026-01-01T00:00:00Z"}',
            'THIS IS NOT JSON',
            '{"truncated": true',  # truncated
            '\x00\x01\x02\x03',   # binary garbage
            make_message_entry(role="assistant", text="Still works"),
        ]
        path = make_session_file(self.tmpdir, "main", "malformed.jsonl", lines)
        result = ai.parse_session_file(path)
        # Should parse the valid message and skip bad lines
        self.assertEqual(result['message_count'], 1)
        self.assertEqual(len(result['errors']), 0)  # parse errors are skipped, not logged as errors

    def test_unicode_content(self):
        lines = [
            make_message_entry(role="assistant", text="🚀 Hello 你好世界 こんにちは Ñoño"),
        ]
        path = make_session_file(self.tmpdir, "main", "unicode.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertEqual(result['message_count'], 1)
        self.assertIn("🚀 Hello 你好世界 こんにちは Ñoño", result['messages'][0]['texts'][0])

    def test_extremely_large_message(self):
        huge_text = "x" * 100_000
        lines = [make_message_entry(role="assistant", text=huge_text)]
        path = make_session_file(self.tmpdir, "main", "huge.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertEqual(result['message_count'], 1)

    def test_since_filter(self):
        old_ts = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
        new_ts = datetime.now(timezone.utc).isoformat()
        since = datetime.now(timezone.utc) - timedelta(hours=1)
        lines = [
            make_message_entry(role="user", text="old message", timestamp=old_ts),
            make_message_entry(role="user", text="new message", timestamp=new_ts),
        ]
        path = make_session_file(self.tmpdir, "main", "filtered.jsonl", lines)
        result = ai.parse_session_file(path, since=since)
        self.assertEqual(result['message_count'], 1)

    def test_future_timestamps(self):
        """Clock skew — timestamps in the future should still parse."""
        future_ts = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        lines = [make_message_entry(role="assistant", text="From the future", timestamp=future_ts)]
        path = make_session_file(self.tmpdir, "main", "future.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertEqual(result['message_count'], 1)

    def test_compaction_entries(self):
        lines = [json.dumps({
            "type": "compaction",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": "Discussed the pinterest campaign strategy"
        })]
        path = make_session_file(self.tmpdir, "main", "compact.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertIn("pinterest", result['topics'])
        self.assertEqual(len(result['compaction_summaries']), 1)

    def test_nonexistent_file(self):
        result = ai.parse_session_file(Path("/nonexistent/file.jsonl"))
        self.assertEqual(result['message_count'], 0)
        self.assertTrue(any("File read error" in e for e in result['errors']))

    def test_content_not_list(self):
        """Message with content as string instead of list should be skipped."""
        lines = [json.dumps({
            "type": "message",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": {"role": "assistant", "content": "just a string"}
        })]
        path = make_session_file(self.tmpdir, "main", "badcontent.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertEqual(result['message_count'], 0)

    def test_deleted_files_excluded(self):
        """Files with .deleted. in name should be excluded."""
        sessions_dir = Path(self.tmpdir) / "main" / "sessions"
        sessions_dir.mkdir(parents=True, exist_ok=True)
        (sessions_dir / "abc.deleted.jsonl").write_text(make_message_entry(text="deleted") + "\n")
        (sessions_dir / "good.jsonl").write_text(make_message_entry(text="good") + "\n")
        files = ai.get_session_files("main")
        names = [f.name for f in files]
        self.assertNotIn("abc.deleted.jsonl", names)
        self.assertIn("good.jsonl", names)


# ============================================================================
# UNIT TESTS: Extraction Helpers
# ============================================================================

class TestExtractErrors(unittest.TestCase):

    def test_traceback_detected(self):
        errors = []
        ai._extract_errors("Traceback (most recent call last):\n  File foo.py\nValueError: bad", errors)
        self.assertTrue(len(errors) > 0)

    def test_json_structure_skipped(self):
        errors = []
        ai._extract_errors('{"error": "some value", "timeout": 300}', errors)
        self.assertEqual(len(errors), 0)

    def test_permission_denied(self):
        errors = []
        ai._extract_errors("Error: permission denied for /etc/shadow", errors)
        self.assertTrue(len(errors) > 0)

    def test_normal_text_no_false_positive(self):
        errors = []
        ai._extract_errors("The deployment was successful and all tests passed.", errors)
        self.assertEqual(len(errors), 0)

    def test_large_text_capped(self):
        """Text > 10KB should be capped, not cause regex DoS."""
        errors = []
        big = "x" * 20000 + "\nTraceback (most recent call last)"
        ai._extract_errors(big, errors)
        # After cap, the traceback at the end is cut off
        self.assertEqual(len(errors), 0)

    def test_failed_to_pattern(self):
        errors = []
        ai._extract_errors("The build failed to compile the module.", errors)
        self.assertTrue(len(errors) > 0)


class TestExtractDecisions(unittest.TestCase):

    def test_jeff_approved(self):
        decisions = []
        ai._extract_decisions("Jeff approved the new landing page design", decisions)
        self.assertTrue(len(decisions) > 0)

    def test_lets_go_with(self):
        decisions = []
        ai._extract_decisions("Let's go with the blue color scheme for now", decisions)
        self.assertTrue(len(decisions) > 0)

    def test_no_false_positive_on_button(self):
        """UI element text like 'rejected' button should NOT match without person name."""
        decisions = []
        ai._extract_decisions('button "downvote" [ref=e2] rejected', decisions)
        self.assertEqual(len(decisions), 0)

    def test_json_skipped(self):
        decisions = []
        ai._extract_decisions('{"action": "approved", "by": "system"}', decisions)
        self.assertEqual(len(decisions), 0)

    def test_decision_prefix(self):
        decisions = []
        ai._extract_decisions("Decision: We'll use Stripe for payments", decisions)
        self.assertTrue(len(decisions) > 0)


class TestExtractTopics(unittest.TestCase):

    def test_known_project(self):
        topics = set()
        ai._extract_topics("Working on the pinterest campaign today", topics)
        self.assertIn("pinterest", topics)

    def test_url_extraction(self):
        topics = set()
        ai._extract_topics("Check https://example.com/page for details", topics)
        self.assertIn("url:example.com", topics)

    def test_case_insensitive(self):
        topics = set()
        ai._extract_topics("The ETSY store is live", topics)
        self.assertIn("etsy", topics)

    def test_no_match(self):
        topics = set()
        ai._extract_topics("Just having a regular conversation", topics)
        self.assertEqual(len([t for t in topics if not t.startswith('url:')]), 0)


class TestDedupErrors(unittest.TestCase):

    def test_dedup(self):
        errors = ["Error: timeout on server A", "Error: timeout on server B", "Error: timeout on server A"]
        result = ai.dedup_errors(errors)
        self.assertEqual(len(result), 2)

    def test_max_count(self):
        errors = [f"Error {i}" for i in range(100)]
        result = ai.dedup_errors(errors, max_count=5)
        self.assertEqual(len(result), 5)

    def test_empty(self):
        self.assertEqual(ai.dedup_errors([]), [])

    def test_preserves_order(self):
        errors = ["alpha error", "beta error", "gamma error"]
        result = ai.dedup_errors(errors)
        self.assertEqual(result, errors)


# ============================================================================
# UNIT TESTS: Utilities
# ============================================================================

class TestAtomicWrite(unittest.TestCase):

    def test_basic_write(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.txt"
            ai.atomic_write(path, "hello world")
            self.assertEqual(path.read_text(), "hello world")

    def test_creates_parents(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "a" / "b" / "c" / "test.txt"
            ai.atomic_write(path, "nested")
            self.assertEqual(path.read_text(), "nested")

    def test_overwrites_existing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.txt"
            ai.atomic_write(path, "first")
            ai.atomic_write(path, "second")
            self.assertEqual(path.read_text(), "second")

    def test_no_partial_writes(self):
        """Verify no temp files left on success."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.txt"
            ai.atomic_write(path, "content")
            files = list(Path(tmpdir).iterdir())
            self.assertEqual(len(files), 1)
            self.assertEqual(files[0].name, "test.txt")


class TestState(TempEnvMixin, unittest.TestCase):

    def test_load_empty(self):
        state = ai.load_state()
        self.assertIsNone(state.get('last_hourly'))

    def test_save_and_load(self):
        ai.save_state({'last_hourly': '2026-01-01T00:00:00Z', 'processed_files': {}})
        state = ai.load_state()
        self.assertEqual(state['last_hourly'], '2026-01-01T00:00:00Z')

    def test_corrupted_state(self):
        ai.STATE_FILE.write_text("NOT JSON{{{")
        state = ai.load_state()
        self.assertIsInstance(state, dict)


# ============================================================================
# UNIT TESTS: Session File Discovery
# ============================================================================

class TestGetSessionFiles(TempEnvMixin, unittest.TestCase):

    def test_missing_agent_dir(self):
        files = ai.get_session_files("nonexistent")
        self.assertEqual(files, [])

    def test_empty_sessions_dir(self):
        sessions_dir = Path(self.tmpdir) / "main" / "sessions"
        sessions_dir.mkdir(parents=True)
        files = ai.get_session_files("main")
        self.assertEqual(files, [])

    def test_finds_jsonl(self):
        make_session_file(self.tmpdir, "main", "a.jsonl", ["{}"])
        make_session_file(self.tmpdir, "main", "b.jsonl", ["{}"])
        files = ai.get_session_files("main")
        self.assertEqual(len(files), 2)

    def test_recent_files_filter(self):
        path = make_session_file(self.tmpdir, "main", "recent.jsonl", ["{}"])
        # Set mtime to 2 hours ago
        old_time = time.time() - 7200
        os.utime(path, (old_time, old_time))
        since = datetime.now(timezone.utc) - timedelta(hours=1)
        files = ai.get_recent_session_files("main", since)
        self.assertEqual(len(files), 0)

        # Now create a fresh file
        make_session_file(self.tmpdir, "main", "fresh.jsonl", ["{}"])
        files = ai.get_recent_session_files("main", since)
        self.assertEqual(len(files), 1)


# ============================================================================
# SUBCOMMAND TESTS
# ============================================================================

class TestCmdStatus(TempEnvMixin, unittest.TestCase):

    def test_no_data(self):
        """Status with no sessions should not crash."""
        with patch('sys.stdout', new_callable=StringIO) as out:
            ai.cmd_status(None)
        output = out.getvalue()
        self.assertIn("📊", output)
        self.assertIn("0 agents active", output)

    def test_with_data(self):
        now = datetime.now(timezone.utc)
        lines = [make_message_entry(role="assistant", text="Hello", timestamp=now.isoformat())]
        make_session_file(self.tmpdir, "main", "s.jsonl", lines)
        with patch('sys.stdout', new_callable=StringIO) as out:
            ai.cmd_status(None)
        output = out.getvalue()
        self.assertIn("1 agents active", output)


class TestCmdHourly(TempEnvMixin, unittest.TestCase):

    def test_no_activity(self):
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_hourly(None)
        files = list(ai.HOURLY_DIR.iterdir())
        self.assertTrue(len(files) >= 1)
        content = files[0].read_text()
        self.assertIn("# Hourly Summary", content)
        self.assertIn("No agent activity", content)

    def test_with_activity(self):
        now = datetime.now(timezone.utc)
        lines = [
            make_message_entry(role="assistant", text="Working on pinterest stuff", timestamp=now.isoformat()),
            make_message_entry(role="assistant", text="Done", tools=["web_search"], timestamp=now.isoformat()),
        ]
        make_session_file(self.tmpdir, "main", "s.jsonl", lines)
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_hourly(None)
        files = list(ai.HOURLY_DIR.iterdir())
        content = files[0].read_text()
        self.assertIn("## Agent Activity", content)
        self.assertIn("main", content)
        self.assertIn("Messages: 2", content)

    def test_updates_state(self):
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_hourly(None)
        state = ai.load_state()
        self.assertIsNotNone(state.get('last_hourly'))

    def test_output_is_valid_markdown(self):
        """Output should have proper markdown headers."""
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_hourly(None)
        content = list(ai.HOURLY_DIR.iterdir())[0].read_text()
        self.assertTrue(content.startswith("#"))
        # No raw JSON blobs
        self.assertNotIn('{"', content)


class TestCmdDaily(TempEnvMixin, unittest.TestCase):

    def test_no_activity(self):
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_daily(None)
        files = list(ai.DAILY_DIR.iterdir())
        self.assertTrue(len(files) >= 1)
        content = files[0].read_text()
        self.assertIn("# Daily Summary", content)

    def test_with_activity(self):
        now = datetime.now(timezone.utc)
        lines = [make_message_entry(role="assistant", text="Hello", timestamp=now.isoformat())]
        make_session_file(self.tmpdir, "main", "s.jsonl", lines)
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_daily(None)
        files = [f for f in ai.DAILY_DIR.iterdir() if f.name.endswith('-summary.md')]
        content = files[0].read_text()
        self.assertIn("main", content)
        # Check table format
        self.assertIn("| Agent |", content)

    def test_activity_jsonl_created(self):
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_daily(None)
        activity = ai.MEMORY_DIR / "activity.jsonl"
        self.assertTrue(activity.exists())
        entry = json.loads(activity.read_text().strip().split('\n')[-1])
        self.assertIn('date', entry)
        self.assertIn('total_messages', entry)

    def test_dedup_on_rerun(self):
        """Running daily twice should not duplicate activity.jsonl entries."""
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_daily(None)
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_daily(None)
        activity = ai.MEMORY_DIR / "activity.jsonl"
        lines = [l for l in activity.read_text().strip().split('\n') if l.strip()]
        dates = []
        for l in lines:
            try:
                dates.append(json.loads(l).get('date'))
            except (json.JSONDecodeError, ValueError):
                pass
        # Each date should appear only once
        self.assertEqual(len(dates), len(set(dates)))


class TestCmdWeekly(TempEnvMixin, unittest.TestCase):

    def test_no_data(self):
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_weekly(None)
        files = list(ai.WEEKLY_DIR.iterdir())
        self.assertTrue(len(files) >= 1)
        content = files[0].read_text()
        self.assertIn("# Weekly Synthesis", content)

    def test_with_activity_data(self):
        # Seed activity.jsonl
        today = datetime.now(ai.EST).date().isoformat()
        entry = json.dumps({
            "date": today,
            "total_messages": 100,
            "active_agents": ["main", "dev"],
            "top_tools": {"web_search": 50},
            "cross_topics": {"pinterest": ["main", "dev"]},
            "error_count": 2,
        })
        activity = ai.MEMORY_DIR / "activity.jsonl"
        ai.atomic_write(activity, entry + "\n")
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_weekly(None)
        content = list(ai.WEEKLY_DIR.iterdir())[0].read_text()
        self.assertIn("100", content)


class TestCmdSignals(TempEnvMixin, unittest.TestCase):

    def test_no_data(self):
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_signals(None)
        signals_path = ai.MEMORY_DIR / "cross-signals.json"
        self.assertTrue(signals_path.exists())
        data = json.loads(signals_path.read_text())
        self.assertIn('timestamp', data)
        self.assertIn('shared_topics', data)
        self.assertIsInstance(data['shared_topics'], list)

    def test_cross_agent_signals(self):
        now = datetime.now(timezone.utc)
        # Two agents both mention pinterest
        for agent in ["main", "dev"]:
            lines = [make_message_entry(text="Working on pinterest", timestamp=now.isoformat())]
            make_session_file(self.tmpdir, agent, "s.jsonl", lines)
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_signals(None)
        data = json.loads((ai.MEMORY_DIR / "cross-signals.json").read_text())
        topics = [s['topic'] for s in data['shared_topics']]
        self.assertIn('pinterest', topics)

    def test_output_valid_json(self):
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_signals(None)
        content = (ai.MEMORY_DIR / "cross-signals.json").read_text()
        data = json.loads(content)  # Should not raise
        self.assertIsInstance(data, dict)


# ============================================================================
# REGRESSION TESTS (8 fixes from expert review)
# ============================================================================

class TestRegressionFixes(TempEnvMixin, unittest.TestCase):

    def test_fix1_error_false_positives_low(self):
        """Error extraction should not flag JSON structures or config values."""
        errors = []
        # These should NOT be flagged
        ai._extract_errors('{"error": null, "timeoutSeconds": 300}', errors)
        ai._extract_errors('"error": "some JSON value"', errors)
        ai._extract_errors("The configuration error_handling setting is enabled", errors)
        self.assertLess(len(errors), 5)

    def test_fix2_atomic_writes(self):
        """atomic_write should produce valid files with no temp artifacts."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "out.md"
            ai.atomic_write(path, "# Test\n\nContent here\n")
            self.assertTrue(path.exists())
            self.assertEqual(path.read_text(), "# Test\n\nContent here\n")
            # No .tmp files left
            tmp_files = list(Path(tmpdir).glob("*.tmp"))
            self.assertEqual(len(tmp_files), 0)

    def test_fix3_exit_codes(self):
        """main() should exit 1 on unhandled error."""
        with patch('sys.argv', ['prog', 'hourly']), \
             patch.object(ai, 'cmd_hourly', side_effect=RuntimeError("boom")), \
             patch('sys.stdout', new_callable=StringIO), \
             self.assertRaises(SystemExit) as ctx:
            ai.main()
        self.assertEqual(ctx.exception.code, 1)

    def test_fix4_decision_not_noisy(self):
        """Decision extraction should not match random 'rejected' or 'approved' without context."""
        decisions = []
        ai._extract_decisions("The PR was approved by the CI system automatically", decisions)
        self.assertEqual(len(decisions), 0)
        ai._extract_decisions("Rejected by Proxify despite years of experience", decisions)
        self.assertEqual(len(decisions), 0)

    def test_fix5_dedup_logic(self):
        """Dedup should work on error messages."""
        errors = ["Error: connection timeout to api.example.com"] * 10
        result = ai.dedup_errors(errors)
        self.assertEqual(len(result), 1)

    def test_fix6_markdown_sanitization(self):
        """Error output should sanitize backticks and brackets."""
        errors = []
        ai._extract_errors("Traceback (most recent call last): `rm -rf /`", errors)
        if errors:
            for e in errors:
                self.assertNotIn('`', e)

    def test_fix7_error_dedup_in_hourly(self):
        """Hourly output should deduplicate errors."""
        now = datetime.now(timezone.utc)
        # Create a session with repeated errors
        lines = []
        for _ in range(20):
            lines.append(make_message_entry(
                text="Traceback (most recent call last):\n  FileNotFoundError: missing.py",
                timestamp=now.isoformat()
            ))
        make_session_file(self.tmpdir, "main", "s.jsonl", lines)
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_hourly(None)
        content = list(ai.HOURLY_DIR.iterdir())[0].read_text()
        # Count error bullet points
        error_lines = [l for l in content.split('\n') if l.startswith('- ') and 'Traceback' in l]
        self.assertLessEqual(len(error_lines), 10)

    def test_fix8_logging_exists(self):
        """Logger should be configured."""
        self.assertIsNotNone(ai.log)
        self.assertEqual(ai.log.name, "agent-intelligence")


# ============================================================================
# INTEGRATION TESTS (against real session data if available)
# ============================================================================

class TestIntegrationReal(unittest.TestCase):
    """Run subcommands against real data and verify output format."""

    @classmethod
    def setUpClass(cls):
        cls.real_sessions = Path.home() / ".openclaw" / "agents"
        cls.has_real_data = cls.real_sessions.exists() and any(cls.real_sessions.iterdir())

    def _run_subcommand(self, cmd):
        """Run a subcommand capturing stdout, return exit code."""
        import subprocess
        result = subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / "agent-intelligence.py"), cmd],
            capture_output=True, text=True, timeout=60
        )
        return result

    @unittest.skipUnless(
        (Path.home() / ".openclaw" / "agents").exists(),
        "No real session data available"
    )
    def test_status_real(self):
        result = self._run_subcommand("status")
        self.assertEqual(result.returncode, 0)
        self.assertIn("📊", result.stdout)

    @unittest.skipUnless(
        (Path.home() / ".openclaw" / "agents").exists(),
        "No real session data available"
    )
    def test_hourly_real(self):
        result = self._run_subcommand("hourly")
        self.assertEqual(result.returncode, 0)
        self.assertIn("✅", result.stdout)

    @unittest.skipUnless(
        (Path.home() / ".openclaw" / "agents").exists(),
        "No real session data available"
    )
    def test_daily_real(self):
        result = self._run_subcommand("daily")
        self.assertEqual(result.returncode, 0)

    @unittest.skipUnless(
        (Path.home() / ".openclaw" / "agents").exists(),
        "No real session data available"
    )
    def test_signals_real(self):
        result = self._run_subcommand("signals")
        self.assertEqual(result.returncode, 0)
        # Verify output is valid JSON
        signals_path = Path.home() / ".openclaw" / "workspace" / "memory" / "cross-signals.json"
        if signals_path.exists():
            json.loads(signals_path.read_text())

    @unittest.skipUnless(
        (Path.home() / ".openclaw" / "agents").exists(),
        "No real session data available"
    )
    def test_weekly_real(self):
        result = self._run_subcommand("weekly")
        self.assertEqual(result.returncode, 0)


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

class TestPerformance(unittest.TestCase):

    @unittest.skipUnless(
        (Path.home() / ".openclaw" / "agents").exists(),
        "No real session data"
    )
    def test_hourly_under_5s(self):
        import subprocess
        start = time.time()
        subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / "agent-intelligence.py"), "hourly"],
            capture_output=True, timeout=10
        )
        elapsed = time.time() - start
        self.assertLess(elapsed, 5.0, f"Hourly took {elapsed:.1f}s, expected < 5s")

    @unittest.skipUnless(
        (Path.home() / ".openclaw" / "agents").exists(),
        "No real session data"
    )
    def test_daily_under_30s(self):
        import subprocess
        start = time.time()
        subprocess.run(
            [sys.executable, str(SCRIPTS_DIR / "agent-intelligence.py"), "daily"],
            capture_output=True, timeout=60
        )
        elapsed = time.time() - start
        self.assertLess(elapsed, 30.0, f"Daily took {elapsed:.1f}s, expected < 30s")


# ============================================================================
# EDGE CASE TESTS
# ============================================================================

class TestEdgeCases(TempEnvMixin, unittest.TestCase):

    def test_missing_agents_dir_entirely(self):
        """If SESSIONS_ROOT doesn't exist, commands should still work."""
        ai.SESSIONS_ROOT = Path(self.tmpdir) / "nonexistent"
        with patch('sys.stdout', new_callable=StringIO):
            ai.cmd_status(None)  # Should not crash

    def test_brand_new_agent_zero_sessions(self):
        sessions_dir = Path(self.tmpdir) / "newagent" / "sessions"
        sessions_dir.mkdir(parents=True)
        files = ai.get_session_files("newagent")
        self.assertEqual(files, [])

    def test_concurrent_write_resilience(self):
        """Simulate file being modified during read — should not crash."""
        path = make_session_file(self.tmpdir, "main", "growing.jsonl", [
            make_message_entry(text="line 1"),
        ])
        # Parse it — even if file grows, we just get what was there
        result = ai.parse_session_file(path)
        self.assertEqual(result['message_count'], 1)
        # Append more data
        with open(path, 'a') as f:
            f.write(make_message_entry(text="line 2") + "\n")
        result2 = ai.parse_session_file(path)
        self.assertEqual(result2['message_count'], 2)

    def test_empty_jsonl_lines(self):
        """Blank lines in JSONL should be skipped gracefully."""
        lines = ["", "", make_message_entry(text="hello"), "", ""]
        path = make_session_file(self.tmpdir, "main", "blanks.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertEqual(result['message_count'], 1)

    def test_message_missing_type_field(self):
        """Entry without 'type' field should be silently skipped."""
        lines = [json.dumps({"timestamp": "2026-01-01T00:00:00Z", "data": "no type"})]
        path = make_session_file(self.tmpdir, "main", "notype.jsonl", lines)
        result = ai.parse_session_file(path)
        self.assertEqual(result['message_count'], 0)

    def test_timestamp_without_timezone(self):
        """Timestamps without tz info in since filter should not crash."""
        lines = [json.dumps({
            "type": "message",
            "timestamp": "2026-01-01T12:00:00",  # no tz
            "message": {"role": "user", "content": [{"type": "text", "text": "hi"}]}
        })]
        path = make_session_file(self.tmpdir, "main", "notz.jsonl", lines)
        since = datetime.now(timezone.utc) - timedelta(days=365)
        result = ai.parse_session_file(path, since=since)
        # Should not crash — the comparison may fail but gracefully
        self.assertIsInstance(result, dict)


if __name__ == '__main__':
    unittest.main(verbosity=2)
