# Verify Before Marking Done

**Date:** 2026-02-06
**Source:** Eric Siu's OpenClaw business patterns
**Confidence:** High

## Learning

Never mark a task "done" based on intent or assumption. Verify the actual outcome.

Examples:
- "Sent email" → Check sent folder, confirm it went through
- "Created file" → ls the file, confirm it exists with content
- "Posted to Reddit" → Navigate to the post, confirm it's visible
- "Ran script" → Check output/logs for success indicators

## Application

After every EXECUTE step:
1. Run a verification check appropriate to the task
2. If verification fails → retry or escalate
3. If verification passes → extract the lesson, log completion

This prevents phantom completions where we think we did something but didn't.
