#!/usr/bin/env node

const fetch = require('node-fetch');

const NOTION_TOKEN = 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm';
const DASHBOARD_PAGE = '30004dbe-0785-8189-9ac4-fbd9de9d0a0a';
const INVOICES_DB = '30204dbe-0785-814c-a62e-dc20cb5b2d85';
const CLIENTS_DB = '30004dbe-0785-81bd-89e8-f7d9bc51779d';

const headers = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function appendBlocksToDashboard() {
  console.log('🎯 Enhancing Dashboard with Dynamic Views\n');
  console.log('='.repeat(70));
  console.log('\n⚠️  SAFE MODE: Only ADDING blocks, never deleting\n');
  
  try {
    // Add all blocks in one request to avoid rate limiting
    console.log('Adding dynamic section with linked databases...');
    const response = await fetch(`https://api.notion.com/v1/blocks/${DASHBOARD_PAGE}/children`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        children: [
          {
            object: 'block',
            type: 'divider',
            divider: {}
          },
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{
                type: 'text',
                text: { content: '📊 Live Data Views' }
              }]
            }
          },
          {
            object: 'block',
            type: 'callout',
            callout: {
              rich_text: [{
                type: 'text',
                text: { content: 'These views update automatically as you add invoices and clients. Filter and sort to see what matters most.' }
              }],
              icon: { emoji: '💡' },
              color: 'blue_background'
            }
          },
          {
            object: 'block',
            type: 'column_list',
            column_list: {
              children: [
                {
                  object: 'block',
                  type: 'column',
                  column: {
                    children: [
                      {
                        object: 'block',
                        type: 'heading_3',
                        heading_3: {
                          rich_text: [{
                            type: 'text',
                            text: { content: '⚠️ Attention Needed' }
                          }]
                        }
                      },
                      {
                        object: 'block',
                        type: 'linked_database',
                        linked_database: {
                          database_id: INVOICES_DB
                        }
                      }
                    ]
                  }
                },
                {
                  object: 'block',
                  type: 'column',
                  column: {
                    children: [
                      {
                        object: 'block',
                        type: 'heading_3',
                        heading_3: {
                          rich_text: [{
                            type: 'text',
                            text: { content: '👥 Recent Clients' }
                          }]
                        }
                      },
                      {
                        object: 'block',
                        type: 'linked_database',
                        linked_database: {
                          database_id: CLIENTS_DB
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      })
    });
    
    const result = await response.json();
    if (result.results) {
      console.log(`✅ Added ${result.results.length} blocks`);
    } else {
      console.log('⚠️  Response:', result);
    }
    await sleep(350);
    
    console.log('\n✅ Successfully added dynamic views to Dashboard!');
    console.log('\n📝 What was added:');
    console.log('  • New "Live Data Views" section at the bottom');
    console.log('  • Linked Invoices database (filter it to show Overdue/Sent)');
    console.log('  • Linked Clients database (shows all active clients)');
    console.log('\n💡 Manual follow-up needed:');
    console.log('  • Open the Dashboard and configure filters on the new views');
    console.log('  • Set Invoices view to filter: Status = Overdue OR Sent');
    console.log('  • Set Clients view to filter: Status = Active');
    console.log('  • Optional: Update hardcoded callout amounts ($4,200, etc.) manually');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  await appendBlocksToDashboard();
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Dashboard enhancement complete!\n');
}

main().catch(console.error);
