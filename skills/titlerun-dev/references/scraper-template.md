<!-- Summary: Code template for anti-detection scrapers with fingerprinting, timing, and circuit breakers.
     Read when: Starting a new scraper implementation for a dynasty data source. -->

# Scraper Template — Anti-Detection Pattern

Use this template for all new dynasty data source scrapers.

```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const Bottleneck = require('bottleneck');

puppeteer.use(StealthPlugin());

class SourceScraper {
  constructor(config) {
    this.name = config.name;           // e.g., 'dtc'
    this.baseUrl = config.baseUrl;
    this.enabled = true;               // Kill switch
    this.circuitOpen = false;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;              // Trip circuit breaker
    this.cooldownMs = 60000;           // 1 min cooldown

    // Rate limiter: 1 req / 2-8 sec (randomized)
    this.limiter = new Bottleneck({
      minTime: 2000,
      maxConcurrent: 1,
    });
  }

  // Kill switch
  disable(reason) {
    this.enabled = false;
    console.log(`[${this.name}] DISABLED: ${reason}`);
  }

  // Circuit breaker
  async withCircuitBreaker(fn) {
    if (!this.enabled) throw new Error(`${this.name} is disabled`);
    if (this.circuitOpen) throw new Error(`${this.name} circuit is open`);

    try {
      const result = await fn();
      this.consecutiveFailures = 0;
      return result;
    } catch (err) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.maxFailures) {
        this.circuitOpen = true;
        setTimeout(() => { this.circuitOpen = false; }, this.cooldownMs);
        console.log(`[${this.name}] Circuit OPENED after ${this.maxFailures} failures`);
      }
      throw err;
    }
  }

  // Randomized delay (normal distribution around 4s, range 2-8s)
  async humanDelay() {
    const mean = 4000;
    const stddev = 1500;
    const delay = Math.max(2000, Math.min(8000,
      mean + stddev * (Math.random() + Math.random() + Math.random() - 1.5) * 0.8
    ));
    await new Promise(r => setTimeout(r, delay));
  }

  // Schema validation
  validateResponse(data, schema) {
    // Validate shape before normalizing
    // Return { valid: boolean, errors: string[] }
  }

  // Normalize to 0-10,000 scale
  normalizeValue(rawValue, sourceScale) {
    return Math.round((rawValue / sourceScale) * 10000);
  }

  // Main scrape method (override per source)
  async scrape(format, options = {}) {
    return this.limiter.schedule(() =>
      this.withCircuitBreaker(async () => {
        await this.humanDelay();
        // Source-specific scraping logic here
      })
    );
  }
}

module.exports = SourceScraper;
```

## Puppeteer Launch Options (Anti-Detection)
```javascript
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1920,1080',
  ],
});

// Set realistic viewport + user agent
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...');
```

## Testing Pattern
```javascript
// Mock HTTP responses, don't hit live APIs
jest.mock('../utils/httpClient');
const { mockResponse } = require('../testUtils');

test('DTC scraper normalizes values correctly', async () => {
  mockResponse('dtc', { players: [{ name: 'Ja\'Marr Chase', value: 9500 }] });
  const result = await dtcScraper.scrape('sf_ppr');
  expect(result[0].normalizedValue).toBeGreaterThan(0);
  expect(result[0].normalizedValue).toBeLessThanOrEqual(10000);
});
```
