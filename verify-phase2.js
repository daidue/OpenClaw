#!/usr/bin/env node

const fetch = require('node-fetch');

const NOTION_TOKEN = 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm';
const INVOICES_DB = '30204dbe-0785-814c-a62e-dc20cb5b2d85';
const CLIENTS_DB = '30004dbe-0785-81bd-89e8-f7d9bc51779d';
const DASHBOARD_PAGE = '30004dbe-0785-8189-9ac4-fbd9de9d0a0a';

const headers = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

async function queryDatabase(dbId) {
  const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page_size: 100 })
  });
  return response.json();
}

async function getPage(pageId) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'GET',
    headers
  });
  return response.json();
}

async function main() {
  console.log('🔍 Phase 2 Verification Report\n');
  console.log('='.repeat(70));
  
  // Check clients
  console.log('\n📋 Verifying Clients Database...');
  const clients = await queryDatabase(CLIENTS_DB);
  const clientCount = clients.results?.length || 0;
  console.log(`  ✅ Found ${clientCount} clients`);
  
  if (clientCount >= 10) {
    console.log('  ✅ Target met: 10+ clients');
  } else {
    console.log(`  ⚠️  Expected 10+, found ${clientCount}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 350));
  
  // Check invoices
  console.log('\n💰 Verifying Invoices Database...');
  const invoices = await queryDatabase(INVOICES_DB);
  const invoiceCount = invoices.results?.length || 0;
  console.log(`  ✅ Found ${invoiceCount} invoices`);
  
  if (invoiceCount >= 20) {
    console.log('  ✅ Target met: 20+ invoices');
  } else {
    console.log(`  ⚠️  Expected 20+, found ${invoiceCount}`);
  }
  
  // Count by status
  const statuses = {};
  invoices.results?.forEach(inv => {
    const status = inv.properties?.Status?.select?.name || 'Unknown';
    statuses[status] = (statuses[status] || 0) + 1;
  });
  
  console.log('\n  Invoice Status Breakdown:');
  for (const [status, count] of Object.entries(statuses)) {
    const emoji = {
      'Paid': '✅',
      'Sent': '📤',
      'Overdue': '🔴',
      'Draft': '📝'
    }[status] || '📄';
    console.log(`    ${emoji} ${status}: ${count}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 350));
  
  // Check dashboard icon
  console.log('\n📊 Verifying Dashboard Icon...');
  const dashboard = await getPage(DASHBOARD_PAGE);
  const dashboardIcon = dashboard.icon?.emoji || 'None';
  console.log(`  Icon: ${dashboardIcon}`);
  if (dashboardIcon === '📊') {
    console.log('  ✅ Correct icon applied');
  } else {
    console.log(`  ⚠️  Expected 📊, found ${dashboardIcon}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ PHASE 2 VERIFICATION COMPLETE\n');
  console.log('Summary:');
  console.log(`  • Clients: ${clientCount} (target: 10+) ${clientCount >= 10 ? '✅' : '⚠️'}`);
  console.log(`  • Invoices: ${invoiceCount} (target: 20+) ${invoiceCount >= 20 ? '✅' : '⚠️'}`);
  console.log(`  • Dashboard Icon: ${dashboardIcon} ${dashboardIcon === '📊' ? '✅' : '⚠️'}`);
  
  const allGood = clientCount >= 10 && invoiceCount >= 20 && dashboardIcon === '📊';
  
  if (allGood) {
    console.log('\n🎉 ALL CHECKS PASSED! Phase 2 is complete and verified.\n');
  } else {
    console.log('\n⚠️  Some checks did not pass. Review the issues above.\n');
  }
  
  console.log('Next Steps:');
  console.log('  1. Review PHASE2-SUMMARY.md for executive summary');
  console.log('  2. Follow MANUAL-DASHBOARD-GUIDE.md for 10-min dashboard updates');
  console.log('  3. Take new screenshots of populated template');
  console.log('  4. Proceed to Phase 3 or launch! 🚀\n');
}

main().catch(console.error);
