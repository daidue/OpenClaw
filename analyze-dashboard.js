#!/usr/bin/env node

const fetch = require('node-fetch');

const NOTION_TOKEN = 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm';
const DASHBOARD_PAGE = '30004dbe-0785-8189-9ac4-fbd9de9d0a0a';

const headers = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getPageContent(pageId) {
  const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    method: 'GET',
    headers
  });
  return response.json();
}

function analyzeBlock(block, depth = 0) {
  const indent = '  '.repeat(depth);
  
  if (block.type === 'heading_1') {
    const text = block.heading_1?.rich_text?.[0]?.plain_text || '';
    console.log(`${indent}# ${text}`);
  } else if (block.type === 'heading_2') {
    const text = block.heading_2?.rich_text?.[0]?.plain_text || '';
    console.log(`${indent}## ${text}`);
  } else if (block.type === 'heading_3') {
    const text = block.heading_3?.rich_text?.[0]?.plain_text || '';
    console.log(`${indent}### ${text}`);
  } else if (block.type === 'paragraph') {
    const text = block.paragraph?.rich_text?.[0]?.plain_text || '';
    if (text) console.log(`${indent}P: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`);
  } else if (block.type === 'callout') {
    const text = block.callout?.rich_text?.[0]?.plain_text || '';
    const emoji = block.callout?.icon?.emoji || '📝';
    console.log(`${indent}${emoji} CALLOUT: ${text.substring(0, 60)}${text.length > 60 ? '...' : ''}`);
  } else if (block.type === 'linked_database') {
    console.log(`${indent}🔗 Linked Database (${block.id})`);
  } else if (block.type === 'column_list') {
    console.log(`${indent}📦 Column List`);
  } else if (block.type === 'column') {
    console.log(`${indent}  📦 Column`);
  } else if (block.type === 'divider') {
    console.log(`${indent}---`);
  } else {
    console.log(`${indent}[${block.type}]`);
  }
}

async function analyzePageRecursive(pageId, depth = 0) {
  if (depth > 2) return;
  
  const indent = '  '.repeat(depth);
  const data = await getPageContent(pageId);
  
  for (const block of data.results || []) {
    analyzeBlock(block, depth);
    
    // Recurse into columns and column_lists
    if (block.type === 'column_list' || block.type === 'column') {
      await sleep(350);
      await analyzePageRecursive(block.id, depth + 1);
    }
  }
}

async function main() {
  console.log('🔍 Analyzing Dashboard Structure\n');
  console.log('='.repeat(70));
  console.log('\nCurrent Dashboard Layout:\n');
  
  await analyzePageRecursive(DASHBOARD_PAGE);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Analysis complete!\n');
  console.log('📝 Recommendations:');
  console.log('  • Add linked database views for dynamic stats');
  console.log('  • Replace hardcoded numbers with live database views');
  console.log('  • Add filtered views: Overdue Invoices, Recent Activity, etc.');
  console.log('  • Consider adding callouts with key metrics\n');
}

main().catch(console.error);
