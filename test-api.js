#!/usr/bin/env node

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm' });

console.log('Available methods on notion.databases:');
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(notion.databases)));

console.log('\nTrying to query Invoices database...');

const INVOICES_DB = '30204dbe-0785-814c-a62e-dc20cb5b2d85';

// Try the actual query
(async () => {
  try {
    // Method might be different in v5.9.0
    const result = await notion.databases.list();
    console.log('\nDatabases list result:', result);
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
