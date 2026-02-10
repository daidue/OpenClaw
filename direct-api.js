#!/usr/bin/env node

// Try using direct fetch instead of SDK
const fetch = require('node-fetch');

const NOTION_TOKEN = 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm';
const INVOICES_DB = '30204dbe-0785-814c-a62e-dc20cb5b2d85';
const CLIENTS_DB = '30004dbe-0785-81bd-89e8-f7d9bc51779d';

const headers = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

async function getDatabase(dbId) {
  const response = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
    method: 'GET',
    headers
  });
  return response.json();
}

async function queryDatabase(dbId) {
  const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page_size: 10 })
  });
  return response.json();
}

async function main() {
  console.log('🔍 Using direct Notion API calls...\n');
  
  console.log('='.repeat(60));
  console.log('Getting Invoices database structure...');
  const invoicesDb = await getDatabase(INVOICES_DB);
  console.log(`\nInvoices Database:`);
  console.log(`Title: ${invoicesDb.title?.[0]?.plain_text || 'N/A'}`);
  if (invoicesDb.properties) {
    console.log(`Properties:`);
    for (const [name, prop] of Object.entries(invoicesDb.properties)) {
      console.log(`  • ${name}: ${prop.type}`);
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 350));
  
  console.log('\n' + '='.repeat(60));
  console.log('Querying Invoices database entries...');
  const invoicesEntries = await queryDatabase(INVOICES_DB);
  console.log(`\nFound ${invoicesEntries.results?.length || 0} entries`);
  if (invoicesEntries.results?.length > 0) {
    console.log(`\nFirst entry:`);
    const entry = invoicesEntries.results[0];
    console.log(`  Title: ${entry.properties?.Name?.title?.[0]?.plain_text || 'N/A'}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 350));
  
  console.log('\n' + '='.repeat(60));
  console.log('Getting Clients database structure...');
  const clientsDb = await getDatabase(CLIENTS_DB);
  console.log(`\nClients Database:`);
  console.log(`Title: ${clientsDb.title?.[0]?.plain_text || 'N/A'}`);
  if (clientsDb.properties) {
    console.log(`Properties:`);
    for (const [name, prop] of Object.entries(clientsDb.properties)) {
      console.log(`  • ${name}: ${prop.type}`);
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 350));
  
  console.log('\n' + '='.repeat(60));
  console.log('Querying Clients database entries...');
  const clientsEntries = await queryDatabase(CLIENTS_DB);
  console.log(`\nFound ${clientsEntries.results?.length || 0} entries`);
  if (clientsEntries.results?.length > 0) {
    console.log(`\nFirst 3 clients:`);
    clientsEntries.results.slice(0, 3).forEach((entry, i) => {
      const title = entry.properties?.Name?.title?.[0]?.plain_text || 'N/A';
      console.log(`  ${i + 1}. ${title}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis complete!\n');
}

main().catch(error => {
  console.error('Error:', error.message);
  console.error(error);
});
