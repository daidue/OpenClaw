#!/usr/bin/env node

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm' });
const ROOT_PAGE_ID = '30004dbe-0785-8027-834a-eec25f5a7ff1';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function exploreBlock(blockId, depth = 0) {
  const indent = '  '.repeat(depth);
  
  try {
    const blocks = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100
    });

    for (const block of blocks.results) {
      if (block.type === 'child_page') {
        console.log(`${indent}📄 Page: ${block.child_page.title} (${block.id})`);
        await sleep(350);
        if (depth < 2) { // Don't go too deep
          await exploreBlock(block.id, depth + 1);
        }
      } else if (block.type === 'child_database') {
        console.log(`${indent}🗄️  Database: ${block.child_database.title} (${block.id})`);
        // Get database info
        await sleep(350);
        const db = await notion.databases.retrieve({ database_id: block.id });
        console.log(`${indent}   Properties: ${Object.keys(db.properties).join(', ')}`);
      } else if (block.type === 'column_list') {
        console.log(`${indent}📦 column_list (${block.id})`);
        await sleep(350);
        await exploreBlock(block.id, depth + 1);
      } else if (block.type === 'column') {
        console.log(`${indent}📦 column (${block.id})`);
        await sleep(350);
        await exploreBlock(block.id, depth + 1);
      } else {
        console.log(`${indent}📦 ${block.type}`);
      }
    }
  } catch (error) {
    console.error(`${indent}❌ Error exploring ${blockId}:`, error.message);
  }
}

async function main() {
  console.log('🔍 Exploring full structure from root page...\n');
  await exploreBlock(ROOT_PAGE_ID);
  console.log('\n✅ Exploration complete!');
}

main().catch(console.error);
