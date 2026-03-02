# Large File Handling - Chunking Strategy

**Purpose:** Split files >800 lines into logical chunks for parallel review without losing context.

**Problem:** Files >1000 lines (like `titlerun-api/src/index.js` at 1048 lines) exceed reviewer context windows and cause incomplete analysis.

**Solution:** Deterministic chunking by function/class boundaries with overlap to preserve context.

---

## Detection Threshold

**Trigger chunking when:**
```bash
wc -l < file.js
# If output > 800 → chunk
```

**Why 800?**
- Typical reviewer context: ~15K tokens
- Average LoC → tokens: ~4 tokens/line
- 800 lines × 4 tokens = ~3.2K tokens (safe margin for analysis + output)
- Overlap zone: 50 lines (prevents boundary issues)

---

## Chunking Algorithm (Deterministic)

**Input:** File path, line count
**Output:** Array of chunks with metadata

### Step 1: Parse File Structure

**For JavaScript/TypeScript:**
```javascript
// Detect boundaries using regex patterns (no AST required)
const boundaries = {
  functions: /^(export )?(async )?function\s+\w+/,
  classes: /^(export )?class\s+\w+/,
  methods: /^\s{2,}(async )?\w+\s*\(/,  // Indented methods
  comments: /^\/\*\*.*\*\//m,           // JSDoc blocks
  exports: /^export\s+(default|const|function|class)/
};
```

**For Python:**
```python
import re
boundaries = {
    'functions': r'^def\s+\w+',
    'classes': r'^class\s+\w+',
    'methods': r'^\s{4,}def\s+\w+',  # Indented methods
    'decorators': r'^\s*@\w+',
}
```

**For other languages:** Use similar pattern matching for function/class keywords.

---

### Step 2: Identify Logical Boundaries

**Scan file line-by-line:**
1. Track nesting depth (braces, indentation)
2. Mark function start/end lines
3. Mark class start/end lines
4. Mark module exports

**Example output:**
```json
[
  {"type": "function", "name": "validateUser", "start": 15, "end": 78},
  {"type": "class", "name": "UserController", "start": 80, "end": 450},
  {"type": "function", "name": "handleRequest", "start": 452, "end": 890},
  {"type": "function", "name": "errorHandler", "start": 892, "end": 1048}
]
```

---

### Step 3: Create Chunks

**Target chunk size:** 600-800 lines (with 50-line overlap)

**Algorithm:**
```
chunks = []
current_chunk = []
current_lines = 0

for boundary in sorted_boundaries:
  entity_size = boundary.end - boundary.start
  
  # If adding this entity exceeds chunk size AND we have content
  if current_lines + entity_size > 800 and current_lines > 0:
    # Finalize current chunk
    chunks.append({
      start: current_chunk[0].start,
      end: current_chunk[-1].end,
      entities: current_chunk,
      overlap_start: max(0, current_chunk[-1].end - 50),  # Last 50 lines
      overlap_end: min(file_length, current_chunk[0].start + 50)  # First 50 lines of next
    })
    
    # Start new chunk with overlap from previous
    current_chunk = [boundary]
    current_lines = entity_size
  else:
    current_chunk.append(boundary)
    current_lines += entity_size

# Finalize last chunk
if current_chunk:
  chunks.append({...})
```

**Overlap strategy:**
- Include last 50 lines of previous chunk
- Include first 50 lines of next chunk
- Prevents reviewers from missing cross-boundary issues

---

### Step 4: Generate Chunk Files

**For each chunk:**
```bash
# Create temp chunk file
chunk_file="workspace-titlerun/reviews/temp/chunk-$n.js"

# Extract lines with context markers
{
  echo "// === CHUNK $n of $total ==="
  echo "// Original file: $file_path"
  echo "// Lines: $start - $end"
  echo "// Overlap: ${overlap_lines} lines from adjacent chunks"
  echo ""
  sed -n "${start},${end}p" "$file_path"
} > "$chunk_file"
```

**Metadata file:**
```json
// chunk-manifest.json
{
  "original_file": "titlerun-api/src/index.js",
  "total_lines": 1048,
  "chunks": [
    {
      "id": 1,
      "file": "chunk-1.js",
      "lines": "1-750",
      "entities": ["imports", "validateUser", "UserController"],
      "overlap_next": "701-750"
    },
    {
      "id": 2,
      "file": "chunk-2.js",
      "lines": "701-1048",
      "entities": ["UserController (cont)", "handleRequest", "errorHandler"],
      "overlap_prev": "701-750"
    }
  ]
}
```

---

## Reviewer Instructions (Per Chunk)

**Modified task for reviewers:**
```
Review chunk $n of $total from $file_path.

CONTEXT:
- Original file: $original_path ($total_lines lines)
- This chunk: lines $start-$end
- Overlap zones: 
  * Lines $overlap_prev_start-$overlap_prev_end (from previous chunk)
  * Lines $overlap_next_start-$overlap_next_end (to next chunk)

INSTRUCTIONS:
1. Review ALL code in this chunk
2. Reference line numbers FROM ORIGINAL FILE (not chunk file)
3. Flag issues in overlap zones ONLY if not already flagged in adjacent chunk
4. Note cross-chunk dependencies (e.g., "UserController.method() calls function in chunk 1")

OUTPUT:
- Use original file line numbers in findings
- Mark overlap-zone findings with [OVERLAP] tag
- Include chunk context in every finding

Example finding:
File: titlerun-api/src/index.js (chunk 2/2, lines 701-1048)
Line: 850
[OVERLAP] Issue: ...
```

---

## Synthesis Deduplication (Cross-Chunk)

**Problem:** Multiple reviewers + multiple chunks = potential duplicate findings

**Solution:** Two-pass deduplication

### Pass 1: Within-Chunk Deduplication
For each reviewer's output on each chunk:
1. Extract findings
2. Dedupe by file + line ± 5

### Pass 2: Cross-Chunk Deduplication
After all chunks reviewed:
1. Merge all findings from all chunks (same file)
2. Sort by line number
3. Dedupe overlap zones (marked with [OVERLAP])
4. Remove exact duplicates (same line, same category, same reviewer)

**Overlap deduplication logic:**
```javascript
// If finding in overlap zone (chunk N end ± 50)
if (finding.line >= chunk_N_end - 50 && finding.line <= chunk_N_end + 50) {
  // Check if already reported in adjacent chunk
  const duplicate = findings.find(f => 
    Math.abs(f.line - finding.line) <= 5 &&
    f.category === finding.category &&
    f.reviewer !== finding.reviewer  // Different reviewer reported same issue
  );
  
  if (duplicate) {
    // Keep higher severity, discard lower
    if (finding.severity > duplicate.severity) {
      findings.remove(duplicate);
      findings.add(finding);
    }
    // else discard finding
  }
}
```

---

## Line Number Mapping

**Critical:** All findings must reference original file line numbers.

**Mapping strategy:**
```javascript
// Chunk metadata includes offset
const chunk_offset = chunk.start_line - 1;

// When reviewer reports "line 150 in chunk file"
const original_line = chunk_offset + reported_line;

// Update finding before synthesis
finding.line = original_line;
finding.file = original_file_path;  // Not chunk path
```

**Validation:**
```bash
# After synthesis, verify all line numbers are in range
max_line=$(wc -l < "$original_file")
if [ "$finding_line" -gt "$max_line" ]; then
  echo "ERROR: Finding references line $finding_line but file only has $max_line lines"
fi
```

---

## Performance Considerations

**Chunking overhead:**
- File parsing: ~100ms per file (regex-based)
- Chunk creation: ~50ms per chunk
- Total: <500ms for 1000-line file

**Token savings:**
- Without chunking: 1048 lines × 4 tokens/line = 4,192 tokens per reviewer × 3 = 12,576 tokens
- With chunking: 750 lines × 4 = 3,000 tokens/reviewer/chunk × 2 chunks × 3 reviewers = 18,000 tokens
- **Tradeoff:** +43% tokens BUT 100% coverage (vs incomplete with oversize files)

**When NOT to chunk:**
- Files <800 lines (overhead not worth it)
- Config files (no logical boundaries)
- Files with single massive function (can't chunk logically → warn user)

---

## Error Handling

**If boundaries cannot be detected:**
```
⚠️ File $file_path is $line_count lines but has no detectable function/class boundaries.

Options:
1. Arbitrary chunking (every 600 lines) - may lose context
2. Skip chunking (reviewer may fail on large file)
3. Manual review (split file yourself)

Recommend: Split file into modules (<800 lines each).
```

**If chunk generation fails:**
```
ERROR: Chunking failed for $file_path
Reason: $error_message

Falling back to single-file review (may be incomplete).
```

---

## Testing Strategy

**Test file:** `titlerun-api/src/index.js` (1048 lines)

**Expected behavior:**
1. Detect file >800 lines
2. Parse structure → find ~8-12 functions/classes
3. Create 2 chunks (~750 + ~350 lines, 50-line overlap)
4. Generate chunk files with metadata
5. Spawn 3 reviewers × 2 chunks = 6 parallel reviews
6. Synthesis merges findings, dedupes overlap zones
7. Final report shows findings with original line numbers

**Validation:**
- All findings reference lines 1-1048 (not chunk lines)
- No duplicate findings in overlap zone (lines 700-750)
- All detected issues appear in final report
- Chunk boundaries align with function boundaries

---

**Status:** Production ready for testing ✅
