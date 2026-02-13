<!-- Summary: Machine-readable JSON schema for code review output for CI/CD integration and automation.
     Read when: Building automated processing of review results or integrating with dashboards. -->

# JSON Output Specification for Code Reviews

## Purpose
Provide machine-readable output for automated processing, dashboards, and CI/CD integration.

## Output Format

```json
{
  "date": "2026-02-13T10:00:00Z",
  "commits_reviewed": 4,
  "files_changed": 12,
  "score": 88,
  "health": "needs_attention",
  "critical_count": 0,
  "major_count": 2,
  "minor_count": 3,
  "security_count": 0,
  "top_issues": [
    {
      "severity": "major",
      "expert": "Database Engineer",
      "file": "path.js",
      "title": "N+1 query in loop",
      "fix": "Use batch query"
    }
  ]
}
```

## Field Definitions

### Root Fields
- **date** (ISO 8601): Timestamp of review generation
- **commits_reviewed** (int): Number of commits analyzed
- **files_changed** (int): Total files modified in review period
- **score** (int, 0-100): Overall code health score
- **health** (enum): One of: `excellent`, `good`, `needs_attention`, `critical`
- **critical_count** (int): Number of critical issues
- **major_count** (int): Number of major issues
- **minor_count** (int): Number of minor issues
- **security_count** (int): Number of security-related issues (any severity)

### top_issues Array
Up to 5 most important issues, sorted by severity then impact.

**Fields:**
- **severity** (enum): `critical`, `major`, `minor`
- **expert** (string): Which expert panel member flagged this
- **file** (string): Relative path to affected file
- **title** (string): Short issue description (max 100 chars)
- **fix** (string): Recommended fix (max 200 chars)

## Health Mapping

```
score >= 95:  excellent
score >= 85:  good
score >= 70:  needs_attention
score < 70:   critical
```

## Output Path

Standard location:
```
/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/YYYY-MM-DD-HHmm.json
```

Example:
```
/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/2026-02-13-1025.json
```

## Usage

### Generating JSON Output

When running a review, pass `--json` flag:
```bash
./run-review.sh --json
```

Or set in cron-config.json:
```json
{
  "outputFormat": "json",
  "jsonPath": "/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews"
}
```

### Dual Output

To generate both markdown AND JSON:
```bash
./run-review.sh --format=both
```

This creates:
- `YYYY-MM-DD-HHmm-review.md` (human-readable)
- `YYYY-MM-DD-HHmm.json` (machine-readable)

## Integration Examples

### Dashboard Query
```bash
# Get last 7 days of scores
find reviews/ -name "*.json" -mtime -7 | \
  xargs jq -r '[.date, .score, .health] | @tsv'
```

### CI/CD Blocker
```bash
# Block merge if score < 80
SCORE=$(jq .score reviews/latest.json)
if [ "$SCORE" -lt 80 ]; then
  echo "Code review score too low: $SCORE"
  exit 1
fi
```

### Alert on Critical Issues
```bash
# Notify if any critical issues found
CRITICAL=$(jq .critical_count reviews/latest.json)
if [ "$CRITICAL" -gt 0 ]; then
  # Send alert to Slack/Discord/etc
  echo "CRITICAL: $CRITICAL critical issues found"
fi
```

## Implementation Notes

1. **Backward compatibility**: Markdown output remains default format
2. **Atomic writes**: Write to temp file, then move to final location
3. **Schema version**: Add `"schema_version": "1.0"` to root for future changes
4. **Error handling**: On error, write partial JSON with `"error": "message"` field

## Future Extensions

Potential additions (not in v1):
- `performance_metrics`: Build time, test coverage changes
- `dependencies_changed`: List of new/updated packages
- `breaking_changes`: Boolean flag + description
- `technical_debt_delta`: Change in debt score
