# Reddit Sales Log

## 2026-02-11

| Time | Subreddit | Post URL | Comment Type | Notes |
|------|-----------|----------|-------------|-------|
| 9:10 AM | r/Notion | /r/Notion/comments/1r1a794/ | Helpful (no promo) | Excel→Notion migration advice. 4-step database approach. Karma building. |

### Technical Notes
- **old.reddit.com works perfectly** for comment automation
- Method: `textarea[name="text"]` → set `.value` → dispatch `input` event → click `button.save`
- New Reddit shadow DOM is unreliable — always use old.reddit.com
