# Worked Example: Building a Dynasty Data Scraper End-to-End

This walkthrough builds the DTC (Dynasty Trade Calculator) scraper from scratch. Follow this pattern for all new scrapers.

## Step 1: Research the Source

Before writing code, understand the data source:
```bash
# Check what endpoints exist
curl -s "https://dynastytradecalculator.com/wp-json/dtc/v1/picks" | head -100

# Check robots.txt
curl -s "https://dynastytradecalculator.com/robots.txt"

# Check for Cloudflare or bot protection
curl -sI "https://dynastytradecalculator.com" | grep -i "server\|cf-ray\|cloudflare"
```

**Document findings:**
- Endpoint: `/wp-json/dtc/v1/picks` — returns player values (may require auth)
- Protection: WordPress site, no Cloudflare
- Rate limit: Unknown, start conservative (1 req/3 sec)
- Data format: JSON with player names, values, positions

## Step 2: Create the Service File

```javascript
// services/scrapers/dtcScraperService.js
const SourceScraper = require('./baseScraper');  // From scraper-template.md
const { validateSchema } = require('../utils/schemaValidator');

const DTC_SCHEMA = {
  type: 'array',
  items: {
    required: ['name', 'value', 'position'],
    properties: {
      name: { type: 'string' },
      value: { type: 'number', min: 0 },
      position: { type: 'string', enum: ['QB', 'RB', 'WR', 'TE'] },
    }
  }
};

class DTCScraper extends SourceScraper {
  constructor() {
    super({
      name: 'dtc',
      baseUrl: 'https://dynastytradecalculator.com',
    });
  }

  async scrape(format = 'sf_ppr') {
    return this.limiter.schedule(() =>
      this.withCircuitBreaker(async () => {
        await this.humanDelay();

        // Try API endpoint first (faster, less detectable)
        try {
          const apiData = await this.tryApiEndpoint(format);
          if (apiData) return apiData;
        } catch (e) {
          console.log(`[dtc] API endpoint failed, falling back to browser: ${e.message}`);
        }

        // Fallback: browser automation
        return this.browserScrape(format);
      })
    );
  }

  async tryApiEndpoint(format) {
    const response = await fetch(`${this.baseUrl}/wp-json/dtc/v1/picks`, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const validation = validateSchema(data, DTC_SCHEMA);
    if (!validation.valid) {
      console.warn(`[dtc] Schema validation failed: ${validation.errors.join(', ')}`);
      return null;  // Don't use invalid data — fall back to browser
    }

    return this.normalize(data, format);
  }

  async browserScrape(format) {
    const browser = await this.launchStealthBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(`${this.baseUrl}/calculator/`, { waitUntil: 'networkidle2' });
      await this.humanDelay();

      // Select format (SF/1QB, PPR/Half/STD)
      await this.selectFormat(page, format);
      await this.humanDelay();

      // Extract player values from the calculator UI
      const rawData = await page.evaluate(() => {
        const rows = document.querySelectorAll('.player-row');
        return Array.from(rows).map(row => ({
          name: row.querySelector('.player-name')?.textContent?.trim(),
          value: parseInt(row.querySelector('.player-value')?.textContent?.trim()),
          position: row.querySelector('.player-position')?.textContent?.trim(),
        }));
      });

      return this.normalize(rawData, format);
    } finally {
      await browser.close();
    }
  }

  normalize(rawData, format) {
    // Map to unified format
    return rawData
      .filter(p => p.name && p.value > 0)
      .map(p => ({
        source: 'dtc',
        playerName: p.name,
        position: p.position,
        format: format,
        rawValue: p.value,
        normalizedValue: this.normalizeValue(p.value, 10000),  // DTC uses 0-10000 scale
        scrapedAt: new Date().toISOString(),
      }));
  }
}

module.exports = new DTCScraper();
```

## Step 3: Write Tests

```javascript
// tests/scrapers/dtcScraper.test.js
const dtcScraper = require('../../services/scrapers/dtcScraperService');

// Mock the HTTP layer
jest.mock('node-fetch');
const fetch = require('node-fetch');

const MOCK_DTC_RESPONSE = [
  { name: "Ja'Marr Chase", value: 9500, position: 'WR' },
  { name: 'CeeDee Lamb', value: 9200, position: 'WR' },
  { name: 'Bijan Robinson', value: 8800, position: 'RB' },
];

describe('DTC Scraper', () => {
  beforeEach(() => {
    dtcScraper.enabled = true;
    dtcScraper.circuitOpen = false;
    dtcScraper.consecutiveFailures = 0;
  });

  test('normalizes values to 0-10000 scale', () => {
    const result = dtcScraper.normalize(MOCK_DTC_RESPONSE, 'sf_ppr');
    expect(result).toHaveLength(3);
    expect(result[0].normalizedValue).toBe(9500);
    expect(result[0].source).toBe('dtc');
    expect(result[0].format).toBe('sf_ppr');
  });

  test('filters out zero-value players', () => {
    const withZero = [...MOCK_DTC_RESPONSE, { name: 'Nobody', value: 0, position: 'WR' }];
    const result = dtcScraper.normalize(withZero, 'sf_ppr');
    expect(result).toHaveLength(3);  // Zero filtered out
  });

  test('circuit breaker trips after 3 failures', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    for (let i = 0; i < 3; i++) {
      await expect(dtcScraper.scrape('sf_ppr')).rejects.toThrow();
    }

    expect(dtcScraper.circuitOpen).toBe(true);
    await expect(dtcScraper.scrape('sf_ppr')).rejects.toThrow('circuit is open');
  });

  test('kill switch prevents scraping', async () => {
    dtcScraper.disable('Legal concern');
    await expect(dtcScraper.scrape('sf_ppr')).rejects.toThrow('disabled');
  });

  test('schema validation rejects malformed data', () => {
    const badData = [{ name: 'Chase', value: 'not a number', position: 'WR' }];
    const result = dtcScraper.normalize(badData, 'sf_ppr');
    expect(result).toHaveLength(0);  // Filtered out
  });
});
```

## Step 4: Integrate with Value Engine

```javascript
// In valueEngineService.js — add the new source
const sources = {
  ktc: require('./scrapers/ktcScraperService'),
  fantasycalc: require('./scrapers/fantasyCalcService'),
  dynastyprocess: require('./scrapers/dynastyProcessService'),
  dynastydaddy: require('./scrapers/dynastyDaddyService'),
  fantasypros: require('./scrapers/fantasyProsService'),
  dtc: require('./scrapers/dtcScraperService'),     // NEW
  ftc: require('./scrapers/ftcScraperService'),     // NEW
  // ... stretch sources
};

// Add to correlation matrix
const CORRELATIONS = {
  'dtc-ftc': 0.78,    // Same owner
  'dp-fp': 0.94,      // DP derived from FP
  'dd-ktc': 0.72,     // DD aggregates KTC
};
```

## Step 5: Deploy

Follow `references/deployment-checklist.md` — every item checked before pushing to main.

## Step 6: Monitor

After deployment, verify the scraper runs successfully:
```javascript
// Quick health check
const result = await dtcScraper.scrape('sf_ppr');
console.log(`[dtc] Scraped ${result.length} players`);
console.log(`[dtc] Top player: ${result[0].playerName} = ${result[0].normalizedValue}`);
```

Check circuit breaker status, rate limit compliance, and data freshness daily.
