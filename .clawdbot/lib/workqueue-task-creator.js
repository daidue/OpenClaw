#!/usr/bin/env node
/**
 * WORKQUEUE.md Task Creator
 * 
 * Add new tasks to WORKQUEUE.md programmatically.
 * 
 * Usage:
 *   node workqueue-task-creator.js --section "P0.8" --title "Fix pagination bug" --priority "P0" --assignee "bolt" --deadline "2026-04-01"
 */

const fs = require('fs');
const path = require('path');

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
 * Find a section in WORKQUEUE.md by searching for heading patterns
 * Searches for ### headers containing the section text
 */
function findSection(content, sectionName) {
  const lines = content.split('\n');

  // Try exact heading match first
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#{1,4}\s/) && lines[i].includes(sectionName)) {
      return i;
    }
  }

  // Fuzzy: try keyword match in headers
  const keywords = sectionName.toLowerCase().split(/[\s-_]+/).filter(k => k.length > 2);
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].match(/^#{1,4}\s/)) continue;
    const headerLower = lines[i].toLowerCase();
    const matches = keywords.filter(k => headerLower.includes(k));
    if (matches.length >= Math.ceil(keywords.length * 0.5)) {
      return i;
    }
  }

  return -1;
}

/**
 * Find the insertion point after a section header
 * (after the header and any immediately following non-task lines)
 */
function findInsertionPoint(lines, sectionLineIndex) {
  let i = sectionLineIndex + 1;

  // Skip blank lines and non-task content after the header
  while (i < lines.length) {
    const line = lines[i].trim();

    // Stop at next section header
    if (line.match(/^#{1,4}\s/) && i > sectionLineIndex + 1) break;

    // Stop at first task item (we'll insert before existing tasks)
    if (line.match(/^[-\d].*\[[ x]\]/)) break;

    // Skip blank lines, description text, tables, etc.
    i++;
  }

  return i;
}

/**
 * Add a new task to WORKQUEUE.md
 */
function createTask(task) {
  if (!fs.existsSync(WORKQUEUE_PATH)) {
    console.error(`❌ WORKQUEUE.md not found at ${WORKQUEUE_PATH}`);
    process.exit(1);
  }

  if (!task.title) {
    console.error('❌ --title is required');
    process.exit(1);
  }

  if (!task.section) {
    console.error('❌ --section is required (e.g., "P0.8", "P1", "BACKLOG")');
    process.exit(1);
  }

  let content = fs.readFileSync(WORKQUEUE_PATH, 'utf8');
  const lines = content.split('\n');

  // Find target section
  const sectionIdx = findSection(content, task.section);
  if (sectionIdx === -1) {
    console.error(`❌ Section "${task.section}" not found in WORKQUEUE.md`);
    console.error('   Available sections:');
    lines.forEach((line, i) => {
      if (line.match(/^#{1,4}\s/)) {
        console.error(`   - ${line.replace(/^#+\s*/, '').trim()}`);
      }
    });
    process.exit(1);
  }

  // Build task line
  const parts = [`- [ ] ${task.title}`];
  if (task.description) parts[0] += ` — ${task.description}`;
  if (task.assignee) parts[0] += ` [@${task.assignee}]`;
  if (task.deadline) parts[0] += ` (Deadline: ${task.deadline})`;
  if (task.priority && task.priority !== task.section) {
    parts[0] += ` [${task.priority}]`;
  }

  const taskLine = parts[0];

  // Check for duplicate
  const titleLower = task.title.toLowerCase();
  const duplicate = lines.some(line =>
    line.match(/\[[ x]\]/) && line.toLowerCase().includes(titleLower)
  );
  if (duplicate) {
    console.error(`⚠️  Task "${task.title}" appears to already exist in WORKQUEUE.md`);
    console.error('   Skipping to avoid duplicates.');
    process.exit(0);
  }

  // Find insertion point
  const insertIdx = findInsertionPoint(lines, sectionIdx);

  // Insert
  lines.splice(insertIdx, 0, taskLine);
  content = lines.join('\n');

  // Write
  fs.writeFileSync(WORKQUEUE_PATH, content);

  console.log(`✅ Task added to WORKQUEUE.md`);
  console.log(`   Section: ${lines[sectionIdx].trim()}`);
  console.log(`   Task: ${taskLine}`);
  console.log(`   Line: ${insertIdx + 1}`);

  return { line: insertIdx, taskLine };
}

// Main
const args = parseArgs();

createTask({
  section: args.section,
  title: args.title,
  description: args.description || null,
  priority: args.priority || null,
  assignee: args.assignee || null,
  deadline: args.deadline || null
});
