#!/usr/bin/env python3
"""Generate Notion cover images for the Freelance Invoice Tracker template.

Creates 1500x600 PNG covers with a consistent professional design system:
- Navy gradient background (#1E3A8A → #1E40AF)
- White title text
- Subtle decorative accent line
"""

import subprocess
import os
import json

COVERS_DIR = os.path.join(os.path.dirname(__file__), "covers")
os.makedirs(COVERS_DIR, exist_ok=True)

# Cover definitions: (filename, emoji, title, subtitle)
COVERS = [
    ("cover-dashboard.png", "🏠", "Dashboard", "Your Financial Command Center"),
    ("cover-invoices.png", "💰", "Invoices", "Track Every Dollar Owed"),
    ("cover-clients.png", "💼", "Clients", "Your Client Directory"),
    ("cover-time-entries.png", "⏱️", "Time Entries", "Log Every Billable Hour"),
    ("cover-expenses.png", "💳", "Expenses", "Track Business Costs"),
    ("cover-projects.png", "📊", "Projects", "Manage Your Work"),
    ("cover-meeting-notes.png", "📝", "Meeting Notes", "Capture Key Details"),
    ("cover-start-here.png", "🚀", "Start Here", "Get Set Up in 5 Minutes"),
    ("cover-resources.png", "📚", "Resources & Guides", "Templates, Tips & Scripts"),
    ("cover-follow-up-scripts.png", "📨", "Follow-Up Scripts", "Get Paid Faster"),
    ("cover-pricing-services.png", "💡", "Pricing Your Services", "Charge What You're Worth"),
    ("cover-settings.png", "⚙️", "Settings", "Customize Your Toolkit"),
    ("cover-quick-wins.png", "⚡", "Quick Wins", "Instant Improvements"),
    ("cover-getting-paid.png", "💰", "Getting Paid on Time", "Strategies That Work"),
    ("cover-tax-prep.png", "📋", "Tax Season Prep", "Stay Organized Year-Round"),
    ("cover-invoice-pdf.png", "🖨️", "Invoice PDF Template", "Professional Invoice Layout"),
    ("cover-contract-template.png", "📄", "Contract Template", "Protect Your Work"),
]

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
    width: 1500px;
    height: 600px;
    background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #2563EB 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
    position: relative;
}}
.pattern {{
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%);
}}
.accent-line {{
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B);
}}
.content {{
    text-align: center;
    z-index: 1;
    position: relative;
}}
.emoji {{
    font-size: 64px;
    margin-bottom: 16px;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
}}
.title {{
    font-size: 48px;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
    text-shadow: 0 2px 12px rgba(0,0,0,0.2);
}}
.subtitle {{
    font-size: 20px;
    font-weight: 400;
    color: rgba(255,255,255,0.75);
    letter-spacing: 0.5px;
}}
</style>
</head>
<body>
<div class="pattern"></div>
<div class="accent-line"></div>
<div class="content">
    <div class="emoji">{emoji}</div>
    <div class="title">{title}</div>
    <div class="subtitle">{subtitle}</div>
</div>
</body>
</html>"""


def generate_cover(filename, emoji, title, subtitle):
    html_path = os.path.join(COVERS_DIR, filename.replace(".png", ".html"))
    png_path = os.path.join(COVERS_DIR, filename)
    
    html = HTML_TEMPLATE.format(emoji=emoji, title=title, subtitle=subtitle)
    with open(html_path, "w") as f:
        f.write(html)
    
    # Use wkhtmltoimage if available, otherwise try playwright/puppeteer
    # Try /usr/local/bin/wkhtmltoimage first
    for cmd in [
        ["wkhtmltoimage", "--width", "1500", "--height", "600", "--quality", "95", html_path, png_path],
        ["/opt/homebrew/bin/wkhtmltoimage", "--width", "1500", "--height", "600", "--quality", "95", html_path, png_path],
    ]:
        try:
            result = subprocess.run(cmd, capture_output=True, timeout=10)
            if result.returncode == 0 and os.path.exists(png_path):
                os.unlink(html_path)
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    
    # Fallback: keep HTML, note that we need a renderer
    return False


if __name__ == "__main__":
    success = 0
    failed = []
    
    for filename, emoji, title, subtitle in COVERS:
        ok = generate_cover(filename, emoji, title, subtitle)
        if ok:
            success += 1
            print(f"✅ {filename}")
        else:
            failed.append(filename)
            print(f"⏳ {filename} (HTML generated, needs renderer)")
    
    print(f"\nGenerated: {success}/{len(COVERS)} PNGs")
    if failed:
        print(f"HTML only (need wkhtmltoimage or browser rendering): {len(failed)}")
        print("Run: brew install wkhtmltopdf  OR  use Playwright to render")
