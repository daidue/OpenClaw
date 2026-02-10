#!/usr/bin/env node

const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm' });

const INVOICES_DB = '30204dbe-0785-814c-a62e-dc20cb5b2d85';
const CLIENTS_DB = '30004dbe-0785-81bd-89e8-f7d9bc51779d';

async function queryDatabase(dbId, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${name} Database - Entries`);
  console.log('='.repeat(60));
  
  try {
    const response = await notion.databases.query({
      database_id: dbId,
      page_size: 10
    });
    
    console.log(`\nTotal entries: ${response.results.length}`);
    
    if (response.results.length > 0) {
      console.log(`\nFirst entry structure:`);
      console.log(JSON.stringify(response.results[0], null, 2));
    } else {
      console.log(`\n⚠️ Database is empty!`);
    }
    
    return response;
  } catch (error) {
    console.error(`Error:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🔍 Querying databases...\n');
  
  const invoices = await queryDatabase(INVOICES_DB, 'Invoices');
  await new Promise(resolve => setTimeout(resolve, 350));
  
  const clients = await queryDatabase(CLIENTS_DB, 'Clients');
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Query complete!\n');
}

main().catch(console.error);
