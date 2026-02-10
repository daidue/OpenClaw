#!/usr/bin/env node

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm' });
const ROOT_PAGE_ID = '30004dbe-0785-8027-834a-eec25f5a7ff1';

// Helper to pause between API calls (Notion rate limit: 3 req/sec)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getRootPageStructure() {
  console.log('🔍 Getting root page structure...\n');
  
  try {
    const blocks = await notion.blocks.children.list({
      block_id: ROOT_PAGE_ID,
      page_size: 100
    });

    console.log(`Found ${blocks.results.length} blocks on root page\n`);
    
    for (const block of blocks.results) {
      if (block.type === 'child_page') {
        console.log(`📄 Page: ${block.child_page.title} (${block.id})`);
      } else if (block.type === 'child_database') {
        console.log(`🗄️  Database: ${block.child_database.title} (${block.id})`);
      } else {
        console.log(`📦 ${block.type} (${block.id})`);
      }
    }
    
    return blocks.results;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function getDatabaseInfo(databaseId) {
  try {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    console.log(`\n📊 Database: ${db.title[0]?.plain_text || 'Untitled'}`);
    console.log(`Properties:`);
    for (const [name, prop] of Object.entries(db.properties)) {
      console.log(`  - ${name} (${prop.type})`);
    }
    return db;
  } catch (error) {
    console.error('Error getting database:', error.message);
    throw error;
  }
}

async function updatePageIcon(pageId, emoji) {
  try {
    await notion.pages.update({
      page_id: pageId,
      icon: { type: 'emoji', emoji }
    });
    console.log(`✅ Updated icon for ${pageId} to ${emoji}`);
    await sleep(350);
  } catch (error) {
    console.error(`❌ Error updating icon for ${pageId}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Phase 2 Implementation: Template Overhaul\n');
  console.log('=' .repeat(60));
  
  const blocks = await getRootPageStructure();
  
  console.log('\n' + '='.repeat(60));
  console.log('Next: Finding database IDs for Clients and Invoices...\n');
}

main().catch(console.error);
