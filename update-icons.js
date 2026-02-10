#!/usr/bin/env node

const fetch = require('node-fetch');

const NOTION_TOKEN = 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm';
const ROOT_PAGE_ID = '30004dbe-0785-8027-834a-eec25f5a7ff1';

// Known page/database IDs from exploration
const DASHBOARD_PAGE = '30004dbe-0785-8189-9ac4-fbd9de9d0a0a';
const START_HERE_PAGE = '30004dbe-0785-81ba-a10d-fcbeff17f084';
const INVOICES_DB = '30204dbe-0785-814c-a62e-dc20cb5b2d85';
const CLIENTS_DB = '30004dbe-0785-81bd-89e8-f7d9bc51779d';

const headers = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Icon mapping based on design system
const iconMap = {
  'dashboard': '📊',
  'invoices': '🧾',
  'clients': '👥',
  'settings': '⚙️',
  'start here': '🚀',
  'quick wins': '🚀',
  'resources': '📚',
  'help': '❓',
  'templates': '📋',
  'expenses': '💳',
  'time': '⏱️',
  'projects': '📂',
  'reports': '📈'
};

async function updatePageIcon(pageId, emoji, name) {
  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        icon: {
          type: 'emoji',
          emoji: emoji
        }
      })
    });
    
    const result = await response.json();
    if (result.id) {
      console.log(`  ✅ ${emoji} ${name}`);
      return true;
    } else {
      console.log(`  ❌ ${name} - ${result.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${name} - ${error.message}`);
    return false;
  }
}

async function updateDatabaseIcon(dbId, emoji, name) {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        icon: {
          type: 'emoji',
          emoji: emoji
        }
      })
    });
    
    const result = await response.json();
    if (result.id) {
      console.log(`  ✅ ${emoji} ${name} (Database)`);
      return true;
    } else {
      console.log(`  ❌ ${name} - ${result.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${name} - ${error.message}`);
    return false;
  }
}

async function exploreAndUpdateIcons(blockId, depth = 0, processed = new Set()) {
  if (depth > 3 || processed.has(blockId)) return []; // Avoid infinite loops
  processed.add(blockId);
  
  const indent = '  '.repeat(depth);
  let updates = [];
  
  try {
    const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    await sleep(350);
    
    for (const block of data.results || []) {
      if (block.type === 'child_page') {
        const title = block.child_page?.title?.toLowerCase() || '';
        console.log(`${indent}📄 Found page: ${block.child_page?.title} (${block.id})`);
        
        // Find matching icon
        for (const [keyword, emoji] of Object.entries(iconMap)) {
          if (title.includes(keyword)) {
            updates.push({ id: block.id, emoji, name: block.child_page?.title, type: 'page' });
            break;
          }
        }
        
        // Recurse into page
        const childUpdates = await exploreAndUpdateIcons(block.id, depth + 1, processed);
        updates.push(...childUpdates);
        
      } else if (block.type === 'child_database') {
        const title = block.child_database?.title?.toLowerCase() || '';
        console.log(`${indent}🗄️  Found database: ${block.child_database?.title} (${block.id})`);
        
        // Find matching icon
        for (const [keyword, emoji] of Object.entries(iconMap)) {
          if (title.includes(keyword)) {
            updates.push({ id: block.id, emoji, name: block.child_database?.title, type: 'database' });
            break;
          }
        }
        
      } else if (block.type === 'column_list' || block.type === 'column') {
        // Recurse into columns
        const childUpdates = await exploreAndUpdateIcons(block.id, depth + 1, processed);
        updates.push(...childUpdates);
      }
    }
  } catch (error) {
    console.error(`${indent}Error exploring ${blockId}:`, error.message);
  }
  
  return updates;
}

async function main() {
  console.log('🎨 Phase 2: Icon System Overhaul\n');
  console.log('='.repeat(70));
  
  console.log('\n🔍 Step 1: Discovering all pages and databases...\n');
  
  const updates = await exploreAndUpdateIcons(ROOT_PAGE_ID);
  
  console.log('\n' + '='.repeat(70));
  console.log(`\n📝 Found ${updates.length} items to update\n`);
  
  console.log('='.repeat(70));
  console.log('\n✏️  Step 2: Updating icons...\n');
  
  let successCount = 0;
  
  // Update known pages/databases first
  const knownUpdates = [
    { id: DASHBOARD_PAGE, emoji: '📊', name: 'Dashboard', type: 'page' },
    { id: START_HERE_PAGE, emoji: '🚀', name: 'Start Here', type: 'page' },
    { id: INVOICES_DB, emoji: '🧾', name: 'Invoices', type: 'database' },
    { id: CLIENTS_DB, emoji: '👥', name: 'Clients', type: 'database' }
  ];
  
  for (const item of knownUpdates) {
    if (item.type === 'page') {
      const success = await updatePageIcon(item.id, item.emoji, item.name);
      if (success) successCount++;
    } else {
      const success = await updateDatabaseIcon(item.id, item.emoji, item.name);
      if (success) successCount++;
    }
    await sleep(350);
  }
  
  // Update discovered items
  for (const item of updates) {
    // Skip if already updated
    if ([DASHBOARD_PAGE, START_HERE_PAGE, INVOICES_DB, CLIENTS_DB].includes(item.id)) {
      continue;
    }
    
    if (item.type === 'page') {
      const success = await updatePageIcon(item.id, item.emoji, item.name);
      if (success) successCount++;
    } else {
      const success = await updateDatabaseIcon(item.id, item.emoji, item.name);
      if (success) successCount++;
    }
    await sleep(350);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ Icon update complete! Updated ${successCount} items\n`);
  console.log('Icon mapping applied:');
  console.log('  • Dashboard → 📊');
  console.log('  • Start Here/Quick Wins → 🚀');
  console.log('  • Invoices → 🧾');
  console.log('  • Clients → 👥');
  console.log('  • Settings → ⚙️');
  console.log('  • Resources → 📚');
  console.log('  • Projects → 📂');
  console.log('  • Time Tracking → ⏱️');
  console.log('  • Reports → 📈\n');
}

main().catch(console.error);
