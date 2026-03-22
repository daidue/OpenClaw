#!/usr/bin/env node
/**
 * WORKQUEUE.md Auto-Updater
 * 
 * Updates WORKQUEUE.md when tasks complete or commits are made.
 * 
 * Usage:
 *   # Task completion mode (called from complete-task.sh)
 *   node workqueue-updater.js --id "task-id" --description "task desc" --result "done" --commit "abc1234" --date "2026-03-22"
 * 
 *   # Commit message mode (called from post-commit hook)
 *   node workqueue-updater.js --commit-msg "feat: Trade Engine frontend" --commit "abc1234" --date "2026-03-22"
 */

const fs = require('fs');
const path = require('path');

// WORKQUEUE.md location - workspace-titlerun
const WORKQUEUE_PATH = path.join(
  process.env.HOME,
  '.openclaw/workspace-titlerun/WORKQUEUE.md'
);

// Parse CLI arguments
function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      args[key] = val;
      if (val !== true) i++;
    }
  }
  return args;
}

/**
 * Extract keywords from a string, filtering out stop words
 */
function extractKeywords(text) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'feat',
    'fix', 'test', 'chore', 'docs', 'style', 'refactor', 'perf', 'ci',
    'add', 'update', 'remove', 'delete', 'create', 'implement', 'all',
    'not', 'no', 'this', 'that', 'it', 'its'
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Calculate keyword overlap between two strings
 * Returns a score 0-1
 */
function keywordOverlap(text1, text2) {
  const kw1 = extractKeywords(text1);
  const kw2 = extractKeywords(text2);

  if (kw1.length === 0 || kw2.length === 0) return 0;

  const set2 = new Set(kw2);
  const matches = kw1.filter(k => set2.has(k));

  // Score: matched keywords / min(kw1, kw2) — biased toward shorter query
  return matches.length / Math.min(kw1.length, kw2.length);
}

/**
 * Find unchecked items in WORKQUEUE.md that match the given search terms
 * Returns { lineIndex, line, score } or null
 */
function findMatchingTask(content, searchTerms) {
  const lines = content.split('\n');
  let bestMatch = null;
  let bestScore = 0;

  // Minimum overlap threshold
  const THRESHOLD = 0.4;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Only match unchecked items: - [ ] or N. [ ]
    if (!line.match(/[-\d.]+\s*\[\s\]/)) continue;

    for (const term of searchTerms) {
      if (!term || typeof term !== 'string') continue;

      // Exact substring match (highest priority)
      if (line.toLowerCase().includes(term.toLowerCase()) && term.length > 5) {
        const score = 1.0;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { lineIndex: i, line, score };
        }
        continue;
      }

      // Keyword overlap match
      const score = keywordOverlap(term, line);
      if (score >= THRESHOLD && score > bestScore) {
        bestScore = score;
        bestMatch = { lineIndex: i, line, score };
      }
    }
  }

  return bestMatch;
}

/**
 * Update WORKQUEUE.md - check off a matching task
 */
function updateWorkqueue(task) {
  if (!fs.existsSync(WORKQUEUE_PATH)) {
    console.error(`❌ WORKQUEUE.md not found at ${WORKQUEUE_PATH}`);
    process.exit(1);
  }

  let content = fs.readFileSync(WORKQUEUE_PATH, 'utf8');

  // Build search terms
  const searchTerms = [];
  if (task.id) searchTerms.push(task.id);
  if (task.description) searchTerms.push(task.description);
  if (task.commitMsg) {
    // Strip conventional commit prefix
    const stripped = task.commitMsg.replace(/^(feat|fix|test|chore|docs|refactor|perf|ci)(\(.*?\))?:\s*/, '');
    searchTerms.push(stripped);
  }

  if (searchTerms.length === 0) {
    console.error('❌ No search terms provided. Use --id, --description, or --commit-msg');
    process.exit(1);
  }

  const match = findMatchingTask(content, searchTerms);

  if (match) {
    // Check off the matched item
    const lines = content.split('\n');
    const oldLine = lines[match.lineIndex];

    // Build metadata suffix
    const metaParts = [];
    if (task.commit) metaParts.push(`commit ${task.commit}`);
    if (task.date) metaParts.push(task.date);
    const metadata = metaParts.length > 0
      ? ` ✅ AUTO (${metaParts.join(', ')})`
      : ' ✅ AUTO';

    // Replace [ ] with [x] and append metadata (if not already checked)
    const newLine = oldLine.replace(/\[\s\]/, '[x]') + metadata;
    lines[match.lineIndex] = newLine;
    content = lines.join('\n');

    console.log(`✅ WORKQUEUE updated: checked off item (score: ${match.score.toFixed(2)})`);
    console.log(`   Old: ${oldLine.trim()}`);
    console.log(`   New: ${newLine.trim()}`);
  } else {
    // No match — add to auto-tracked section
    const recentHeader = '### Recently Completed (Auto-tracked)';

    if (!content.includes(recentHeader)) {
      // Insert before the last "---" separator, or append
      const lastSepIdx = content.lastIndexOf('\n---\n');
      if (lastSepIdx > 0) {
        content = content.slice(0, lastSepIdx) +
          `\n\n${recentHeader}\n\n` +
          content.slice(lastSepIdx);
      } else {
        content += `\n\n---\n\n${recentHeader}\n`;
      }
    }

    const desc = task.description || task.commitMsg || task.id || 'Unknown task';
    const metaParts = [];
    if (task.commit) metaParts.push(`commit ${task.commit}`);
    if (task.date) metaParts.push(task.date);
    const metadata = metaParts.length > 0 ? ` (${metaParts.join(', ')})` : '';

    const newItem = `- [x] ${desc} ✅ AUTO${metadata}`;

    // Insert after the header
    content = content.replace(
      recentHeader,
      `${recentHeader}\n${newItem}`
    );

    console.log(`ℹ️  No match found in WORKQUEUE.md. Added to auto-tracked section:`);
    console.log(`   ${newItem}`);
  }

  // Write back
  fs.writeFileSync(WORKQUEUE_PATH, content);
  console.log(`📝 WORKQUEUE.md written to ${WORKQUEUE_PATH}`);

  return { matched: !!match, content };
}

// Main
const args = parseArgs();

const task = {
  id: args.id || null,
  description: args.description || null,
  result: args.result || null,
  commitMsg: args['commit-msg'] || null,
  commit: args.commit || null,
  date: args.date || new Date().toISOString().split('T')[0]
};

updateWorkqueue(task);
