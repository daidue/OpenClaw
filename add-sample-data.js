#!/usr/bin/env node

const fetch = require('node-fetch');

const NOTION_TOKEN = 'ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm';
const INVOICES_DB = '30204dbe-0785-814c-a62e-dc20cb5b2d85';
const CLIENTS_DB = '30004dbe-0785-81bd-89e8-f7d9bc51779d';

const headers = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Sample client data with diverse industries
const sampleClients = [
  {
    name: 'Acme Tech Solutions',
    company: 'Acme Tech Solutions',
    contact: 'Sarah Chen',
    email: 'sarah.chen@acmetech.com',
    phone: '(555) 234-5678',
    rate: 125,
    rateType: 'Hourly',
    paymentTerms: 'Net 30',
    paymentMethod: 'Bank Transfer',
    paymentReliability: 'Always On Time',
    currency: 'USD',
    status: 'Active'
  },
  {
    name: 'Bright Media Group',
    company: 'Bright Media Group',
    contact: 'Marcus Rodriguez',
    email: 'marcus@brightmedia.co',
    phone: '(555) 345-6789',
    rate: 150,
    rateType: 'Hourly',
    paymentTerms: 'Net 15',
    paymentMethod: 'Credit Card',
    paymentReliability: 'Always On Time',
    currency: 'USD',
    status: 'Active'
  },
  {
    name: 'Creative Spark Studios',
    company: 'Creative Spark Studios',
    contact: 'Emma Thompson',
    email: 'emma@creativespark.design',
    phone: '(555) 456-7890',
    rate: 175,
    rateType: 'Hourly',
    paymentTerms: 'Net 30',
    paymentMethod: 'Check',
    paymentReliability: 'Usually On Time',
    currency: 'USD',
    status: 'Active'
  },
  {
    name: 'Quantum Ventures',
    company: 'Quantum Ventures LLC',
    contact: 'David Park',
    email: 'dpark@quantumventures.io',
    phone: '(555) 567-8901',
    rate: 200,
    rateType: 'Hourly',
    paymentTerms: 'Net 45',
    paymentMethod: 'Bank Transfer',
    paymentReliability: 'Sometimes Late',
    currency: 'USD',
    status: 'Active'
  },
  {
    name: 'Urban Coffee Roasters',
    company: 'Urban Coffee Roasters',
    contact: 'Lisa Martinez',
    email: 'lisa@urbancoffee.com',
    phone: '(555) 678-9012',
    rate: 3500,
    rateType: 'Project',
    paymentTerms: 'Net 30',
    paymentMethod: 'Credit Card',
    paymentReliability: 'Always On Time',
    currency: 'USD',
    status: 'Active'
  },
  {
    name: 'TechStart Innovations',
    company: 'TechStart Innovations Inc.',
    contact: 'James Wilson',
    email: 'jwilson@techstart.com',
    phone: '(555) 789-0123',
    rate: 135,
    rateType: 'Hourly',
    paymentTerms: 'Net 30',
    paymentMethod: 'PayPal',
    paymentReliability: 'Always On Time',
    currency: 'USD',
    status: 'Active'
  },
  {
    name: 'Green Earth Consulting',
    company: 'Green Earth Consulting',
    contact: 'Rachel Green',
    email: 'rachel@greenearth.org',
    phone: '(555) 890-1234',
    rate: 110,
    rateType: 'Hourly',
    paymentTerms: 'Net 60',
    paymentMethod: 'Check',
    paymentReliability: 'Usually On Time',
    currency: 'USD',
    status: 'Active'
  },
  {
    name: 'Phoenix Digital Agency',
    company: 'Phoenix Digital',
    contact: 'Alex Kim',
    email: 'alex@phoenixdigital.agency',
    phone: '(555) 901-2345',
    rate: 165,
    rateType: 'Hourly',
    paymentTerms: 'Net 15',
    paymentMethod: 'Bank Transfer',
    paymentReliability: 'Always On Time',
    currency: 'USD',
    status: 'Active'
  },
  {
    name: 'Stellar Photography',
    company: 'Stellar Photography Studio',
    contact: 'Nina Patel',
    email: 'nina@stellarphotos.com',
    phone: '(555) 012-3456',
    rate: 2500,
    rateType: 'Project',
    paymentTerms: 'Net 30',
    paymentMethod: 'Credit Card',
    paymentReliability: 'Always On Time',
    currency: 'USD',
    status: 'Active'
  },
  {
    name: 'Blue Sky Consulting',
    company: 'Blue Sky Consulting Group',
    contact: 'Tom Anderson',
    email: 'tom@bluesky.consulting',
    phone: '(555) 123-4567',
    rate: 180,
    rateType: 'Hourly',
    paymentTerms: 'Net 30',
    paymentMethod: 'Bank Transfer',
    paymentReliability: 'Sometimes Late',
    currency: 'USD',
    status: 'Inactive'
  }
];

// Generate invoice data across last 3 months
function generateInvoiceDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

const sampleInvoices = [
  {
    invoiceNumber: 'INV-2024-001',
    client: 'Acme Tech Solutions',
    amount: 5000,
    dateIssued: generateInvoiceDate(75),
    dueDate: generateInvoiceDate(45),
    status: 'Paid',
    notes: 'Website redesign project - Phase 1'
  },
  {
    invoiceNumber: 'INV-2024-002',
    client: 'Bright Media Group',
    amount: 3750,
    dateIssued: generateInvoiceDate(68),
    dueDate: generateInvoiceDate(53),
    status: 'Paid',
    notes: 'Content strategy consultation'
  },
  {
    invoiceNumber: 'INV-2024-003',
    client: 'Creative Spark Studios',
    amount: 4200,
    dateIssued: generateInvoiceDate(60),
    dueDate: generateInvoiceDate(30),
    status: 'Paid',
    notes: 'Brand identity development'
  },
  {
    invoiceNumber: 'INV-2024-004',
    client: 'Quantum Ventures',
    amount: 6500,
    dateIssued: generateInvoiceDate(52),
    dueDate: generateInvoiceDate(7),
    status: 'Paid',
    notes: 'Quarterly web development retainer'
  },
  {
    invoiceNumber: 'INV-2024-005',
    client: 'Urban Coffee Roasters',
    amount: 3500,
    dateIssued: generateInvoiceDate(48),
    dueDate: generateInvoiceDate(18),
    status: 'Paid',
    notes: 'E-commerce site setup'
  },
  {
    invoiceNumber: 'INV-2024-006',
    client: 'TechStart Innovations',
    amount: 2700,
    dateIssued: generateInvoiceDate(42),
    dueDate: generateInvoiceDate(12),
    status: 'Paid',
    notes: 'Mobile app UI design - 20 hours'
  },
  {
    invoiceNumber: 'INV-2024-007',
    client: 'Acme Tech Solutions',
    amount: 4500,
    dateIssued: generateInvoiceDate(35),
    dueDate: generateInvoiceDate(5),
    status: 'Paid',
    notes: 'Website redesign project - Phase 2'
  },
  {
    invoiceNumber: 'INV-2024-008',
    client: 'Green Earth Consulting',
    amount: 1980,
    dateIssued: generateInvoiceDate(30),
    dueDate: generateInvoiceDate(-30),
    status: 'Paid',
    notes: 'Marketing materials design - 18 hours'
  },
  {
    invoiceNumber: 'INV-2024-009',
    client: 'Phoenix Digital Agency',
    amount: 4125,
    dateIssued: generateInvoiceDate(25),
    dueDate: generateInvoiceDate(10),
    status: 'Paid',
    notes: 'Client website development - 25 hours'
  },
  {
    invoiceNumber: 'INV-2024-010',
    client: 'Stellar Photography',
    amount: 2500,
    dateIssued: generateInvoiceDate(22),
    dueDate: generateInvoiceDate(8),
    status: 'Paid',
    notes: 'Portfolio website design'
  },
  {
    invoiceNumber: 'INV-2024-011',
    client: 'Bright Media Group',
    amount: 3000,
    dateIssued: generateInvoiceDate(18),
    dueDate: generateInvoiceDate(3),
    status: 'Paid',
    notes: 'Social media graphics package'
  },
  {
    invoiceNumber: 'INV-2024-012',
    client: 'Creative Spark Studios',
    amount: 5250,
    dateIssued: generateInvoiceDate(15),
    dueDate: generateInvoiceDate(15),
    status: 'Sent',
    notes: 'Logo design + brand guidelines - 30 hours'
  },
  {
    invoiceNumber: 'INV-2024-013',
    client: 'TechStart Innovations',
    amount: 4050,
    dateIssued: generateInvoiceDate(12),
    dueDate: generateInvoiceDate(18),
    status: 'Sent',
    notes: 'Dashboard redesign - 30 hours'
  },
  {
    invoiceNumber: 'INV-2024-014',
    client: 'Acme Tech Solutions',
    amount: 3750,
    dateIssued: generateInvoiceDate(10),
    dueDate: generateInvoiceDate(20),
    status: 'Sent',
    notes: 'Website maintenance + updates - 30 hours'
  },
  {
    invoiceNumber: 'INV-2024-015',
    client: 'Phoenix Digital Agency',
    amount: 2475,
    dateIssued: generateInvoiceDate(8),
    dueDate: generateInvoiceDate(7),
    status: 'Sent',
    notes: 'Landing page design - 15 hours'
  },
  {
    invoiceNumber: 'INV-2024-016',
    client: 'Quantum Ventures',
    amount: 8000,
    dateIssued: generateInvoiceDate(5),
    dueDate: generateInvoiceDate(-10),
    status: 'Overdue',
    notes: 'Full stack development - Custom dashboard'
  },
  {
    invoiceNumber: 'INV-2024-017',
    client: 'Blue Sky Consulting',
    amount: 2700,
    dateIssued: generateInvoiceDate(35),
    dueDate: generateInvoiceDate(-5),
    status: 'Overdue',
    notes: 'Website consulting - 15 hours'
  },
  {
    invoiceNumber: 'INV-2024-018',
    client: 'Urban Coffee Roasters',
    amount: 1250,
    dateIssued: generateInvoiceDate(3),
    dueDate: generateInvoiceDate(27),
    status: 'Draft',
    notes: 'Product photography edits'
  },
  {
    invoiceNumber: 'INV-2024-019',
    client: 'Green Earth Consulting',
    amount: 990,
    dateIssued: generateInvoiceDate(2),
    dueDate: generateInvoiceDate(28),
    status: 'Draft',
    notes: 'Infographic design - 9 hours'
  },
  {
    invoiceNumber: 'INV-2024-020',
    client: 'Stellar Photography',
    amount: 3200,
    dateIssued: generateInvoiceDate(1),
    dueDate: generateInvoiceDate(29),
    status: 'Draft',
    notes: 'Wedding gallery + blog setup'
  }
];

async function createClient(client) {
  const response = await fetch(`https://api.notion.com/v1/pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { database_id: CLIENTS_DB },
      properties: {
        'Client Name': {
          title: [{ text: { content: client.name } }]
        },
        'Company': {
          rich_text: [{ text: { content: client.company } }]
        },
        'Contact Name': {
          rich_text: [{ text: { content: client.contact } }]
        },
        'Email': {
          email: client.email
        },
        'Phone': {
          phone_number: client.phone
        },
        'Rate': {
          number: client.rate
        },
        'Rate Type': {
          select: { name: client.rateType }
        },
        'Payment Terms': {
          select: { name: client.paymentTerms }
        },
        'Payment Method': {
          select: { name: client.paymentMethod }
        },
        'Payment Reliability': {
          select: { name: client.paymentReliability }
        },
        'Currency': {
          select: { name: client.currency }
        },
        'Status': {
          select: { name: client.status }
        }
      }
    })
  });
  
  return response.json();
}

async function createInvoice(invoice) {
  const response = await fetch(`https://api.notion.com/v1/pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { database_id: INVOICES_DB },
      properties: {
        'Invoice #': {
          title: [{ text: { content: invoice.invoiceNumber } }]
        },
        'Client': {
          rich_text: [{ text: { content: invoice.client } }]
        },
        'Amount': {
          number: invoice.amount
        },
        'Date Issued': {
          date: { start: invoice.dateIssued }
        },
        'Due Date': {
          date: { start: invoice.dueDate }
        },
        'Status': {
          select: { name: invoice.status }
        },
        'Notes': {
          rich_text: [{ text: { content: invoice.notes } }]
        }
      }
    })
  });
  
  return response.json();
}

async function main() {
  console.log('🚀 Adding Sample Data to Professional Freelancer\'s Toolkit\n');
  console.log('='.repeat(70));
  
  // Add clients
  console.log('\n📋 Step 1: Adding 10 Sample Clients...\n');
  let successCount = 0;
  
  for (const client of sampleClients) {
    try {
      const result = await createClient(client);
      if (result.id) {
        console.log(`  ✅ ${client.name}`);
        successCount++;
      } else {
        console.log(`  ❌ ${client.name} - ${result.message || 'Unknown error'}`);
      }
      await sleep(350); // Respect rate limit
    } catch (error) {
      console.log(`  ❌ ${client.name} - ${error.message}`);
    }
  }
  
  console.log(`\n  📊 Added ${successCount}/${sampleClients.length} clients`);
  
  // Add invoices
  console.log('\n='.repeat(70));
  console.log('\n💰 Step 2: Adding 20 Sample Invoices...\n');
  successCount = 0;
  
  for (const invoice of sampleInvoices) {
    try {
      const result = await createInvoice(invoice);
      if (result.id) {
        const statusEmoji = {
          'Paid': '✅',
          'Sent': '📤',
          'Overdue': '🔴',
          'Draft': '📝'
        }[invoice.status] || '📄';
        console.log(`  ${statusEmoji} ${invoice.invoiceNumber} - $${invoice.amount.toLocaleString()} (${invoice.status})`);
        successCount++;
      } else {
        console.log(`  ❌ ${invoice.invoiceNumber} - ${result.message || 'Unknown error'}`);
      }
      await sleep(350); // Respect rate limit
    } catch (error) {
      console.log(`  ❌ ${invoice.invoiceNumber} - ${error.message}`);
    }
  }
  
  console.log(`\n  📊 Added ${successCount}/${sampleInvoices.length} invoices`);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Sample data creation complete!\n');
  console.log('Summary:');
  console.log(`  • 10 diverse clients across different industries`);
  console.log(`  • 20 invoices with varied statuses:`);
  console.log(`    - 11 Paid (historical revenue)`);
  console.log(`    - 4 Sent (awaiting payment)`);
  console.log(`    - 2 Overdue (attention needed)`);
  console.log(`    - 3 Draft (ready to send)`);
  console.log(`  • Date range: Last 3 months`);
  console.log(`  • Amount range: $990 - $8,000`);
  console.log(`\n🎯 Ready for Phase 2 next steps: Icon overhaul and dashboard!\n`);
}

main().catch(console.error);
