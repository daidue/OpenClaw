# Safety Rules — Notion API

**Read this before every production operation.**

## 🔴 RULE #1: NEVER DELETE BLOCKS ON PRODUCTION PAGES

### The Incident (2026-02-09)

A sub-agent attempted to clean up a column wrapper on the live Full Toolkit page. Deleting the parent block **cascaded recursively** — all child blocks (pages, databases, content) were destroyed. Data had to be restored from Notion's trash via `PATCH archived: false`.

### Why It's Dangerous

- Notion block deletion is **cascading** — deleting a parent deletes ALL children
- A `column_list` contains `column` blocks which contain your actual content
- Deleting what looks like a "wrapper" can wipe entire pages and databases
- There is **no undo via API** — you must manually restore from trash

### The Rule

- **Only ADD or UPDATE blocks. Never delete.**
- If you need to "remove" something, archive it or leave it
- If a block must truly be deleted, do it manually in the Notion UI where you can see the children

## 🟡 RULE #2: ALWAYS TEST ON A SCRATCH PAGE

- Create a throwaway page for testing API calls
- Verify block structure, formulas, and relations work before touching production
- Copy the production page structure to scratch if needed

## 🟡 RULE #3: SUB-AGENTS NEED EXPLICIT GUARDRAILS

- Always include "DO NOT DELETE any blocks" in sub-agent instructions
- Provide read-only access where possible
- List specific block IDs that are safe to modify

## 🟡 RULE #4: SIDEBAR NAV MUST BE SYNCED BLOCK AT TOP

- The Notion API **cannot move blocks between parent pages**
- Sidebar navigation must be a synced block placed at the TOP of each page
- Deploy by appending the synced block reference to each target page
- Original synced block ID must be preserved — if deleted, all references break

## 🟡 RULE #5: VERIFY PARENT-CHILD RELATIONSHIPS

Before any structural change:

```bash
# Get children of a block to see what's inside
GET /v1/blocks/{block_id}/children
```

Always check what's nested inside before modifying or archiving any block.

## Restoration Procedure

If blocks are accidentally deleted, they go to Notion's trash:

```bash
# Restore a block from trash
PATCH /v1/blocks/{block_id}
{ "archived": false }
```

This works for pages and blocks but you must know the block IDs. Check trash in the Notion UI to find them.
