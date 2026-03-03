# Shared Event Log

Agents append events here for coordination.

Format: JSONL (one JSON object per line)

Example:
{"timestamp": "2026-03-02T20:00:00Z", "agent": "jeff", "event": "spawned", "target": "gh-titlerun-api-123"}
{"timestamp": "2026-03-02T20:05:00Z", "agent": "jeff", "event": "completed", "target": "gh-titlerun-api-123"}
