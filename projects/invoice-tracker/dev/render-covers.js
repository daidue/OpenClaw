const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const COVERS_DIR = path.join(__dirname, 'covers');

const COVERS = [
    ["cover-dashboard.png", "🏠", "Dashboard", "Your Financial Command Center"],
    ["cover-invoices.png", "💰", "Invoices", "Track Every Dollar Owed"],
    ["cover-clients.png", "💼", "Clients", "Your Client Directory"],
    ["cover-time-entries.png", "⏱️", "Time Entries", "Log Every Billable Hour"],
    ["cover-expenses.png", "💳", "Expenses", "Track Business Costs"],
    ["cover-projects.png", "📊", "Projects", "Manage Your Work"],
    ["cover-meeting-notes.png", "📝", "Meeting Notes", "Capture Key Details"],
    ["cover-start-here.png", "🚀", "Start Here", "Get Set Up in 5 Minutes"],
    ["cover-resources.png", "📚", "Resources & Guides", "Templates, Tips & Scripts"],
    ["cover-follow-up-scripts.png", "📨", "Follow-Up Scripts", "Get Paid Faster"],
    ["cover-pricing-services.png", "💡", "Pricing Your Services", "Charge What You're Worth"],
    ["cover-settings.png", "⚙️", "Settings", "Customize Your Toolkit"],
    ["cover-quick-wins.png", "⚡", "Quick Wins", "Instant Improvements"],
    ["cover-getting-paid.png", "💰", "Getting Paid on Time", "Strategies That Work"],
    ["cover-tax-prep.png", "📋", "Tax Season Prep", "Stay Organized Year-Round"],
    ["cover-invoice-pdf.png", "🖨️", "Invoice PDF Template", "Professional Invoice Layout"],
    ["cover-contract-template.png", "📄", "Contract Template", "Protect Your Work"],
];

function makeHTML(emoji, title, subtitle) {
    return `<!DOCTYPE html>
<html><head><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    width: 1500px; height: 600px;
    background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #2563EB 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden; position: relative;
}
.pattern {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%);
}
.accent-line {
    position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B);
}
.content { text-align: center; z-index: 1; position: relative; }
.emoji { font-size: 64px; margin-bottom: 16px; }
.title { font-size: 48px; font-weight: 700; color: #FFF; letter-spacing: -0.5px; margin-bottom: 8px; text-shadow: 0 2px 12px rgba(0,0,0,0.2); }
.subtitle { font-size: 20px; font-weight: 400; color: rgba(255,255,255,0.75); letter-spacing: 0.5px; }
</style></head><body>
<div class="pattern"></div>
<div class="accent-line"></div>
<div class="content">
    <div class="emoji">${emoji}</div>
    <div class="title">${title}</div>
    <div class="subtitle">${subtitle}</div>
</div>
</body></html>`;
}

(async () => {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1500, height: 600 });

    for (const [filename, emoji, title, subtitle] of COVERS) {
        const html = makeHTML(emoji, title, subtitle);
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.screenshot({ path: path.join(COVERS_DIR, filename), type: 'png' });
        console.log(`✅ ${filename}`);
    }

    await browser.close();
    console.log(`\nDone: ${COVERS.length} covers generated in ${COVERS_DIR}`);
})();
