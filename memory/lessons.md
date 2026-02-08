# Lessons Memory

_Mistakes, failures, corrections. Confidence: Low → Medium → High → Confirmed._

---

### 2026-02-07 LESSON — Notion API can't create database views or buttons

**Confidence:** Confirmed
**Source:** Direct experience building Invoice Tracker
**Agent:** Jeff

**Content:** Notion API limitations: can't create database views, button properties, or linked database blocks. These require manual UI work by Taylor. Plan around this.

**Status:** Active

---

### 2026-02-07 LESSON — Gumroad file uploads can't be automated

**Confidence:** Confirmed
**Source:** Multiple attempts with Playwright + CDP
**Agent:** Jeff

**Content:** Gumroad cover image and thumbnail uploads require manual click — Playwright can't trigger the dropzone's React file handler. Taylor must do these manually.

**Status:** Active

---

### 2026-02-07 LESSON — Notion single_property relations are NOT bidirectional via API

**Confidence:** Confirmed
**Source:** Direct experience, wasted debugging time
**Agent:** Jeff

**Content:** Setting Invoice→Client via API does NOT auto-populate Client→Invoices. Must set relations from the Client side for rollups to work.

**Status:** Active
