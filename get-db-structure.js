#!/usr/bin/env node

const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm' });

const INVOICES_DB = '30204dbe-0785-814c-a62e-dc20cb5b2d85';
const CLIENTS_DB = '30004dbe-0785-81bd-89e8-f7d9bc51779d';

async function getDatabaseStructure(dbId, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${name} Database`);
  console.log('='.repeat(60));
  
  try {
    const db = await notion.databases.retrieve({ database_id: dbId });
    
    console.log(`\nRaw response:`, JSON.stringify(db, null, 2));
    
    return db;
  } catch (error) {
    console.error(`Error:`, error.message);
    console.error(`Full error:`, error);
    throw error;
  }
}

async function main() {
  console.log('🔍 Analyzing database structures...\n');
  
  const invoices = await getDatabaseStructure(INVOICES_DB, 'Invoices');
  await new Promise(resolve => setTimeout(resolve, 350));
  
  const clients = await getDatabaseStructure(CLIENTS_DB, 'Clients');
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis complete!\n');
  
  // Save IDs to a file for next script
  fs.writeFileSync('/Users/jeffdaniels/.openclaw/workspace/db-ids.json', JSON.stringify({
    invoices: INVOICES_DB,
    clients: CLIENTS_DB
  }, null, 2));
  
  console.log('📝 Database IDs saved to db-ids.json');
}

main().catch(console.error);
