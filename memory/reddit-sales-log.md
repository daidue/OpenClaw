# Reddit Sales Log

## 2026-02-11

| Time | Subreddit | Post URL | Comment Type | Notes |
|------|-----------|----------|-------------|-------|
| 9:10 AM | r/Notion | /r/Notion/comments/1r1a794/ | Helpful (no promo) | Excel→Notion migration advice. 4-step database approach. Karma building. |
| 9:15 AM | r/Notion | /r/Notion/comments/1r1d4v6/ | Helpful (no promo) | Google Calendar + Notion sync advice. 4 options. Karma building. |
| 9:18 AM | r/Notion | /r/Notion/comments/1qv0us9/ | PROMO (self-promo thread) | Free invoice tracker showcase. "Link on my profile" approach. Key post for downloads. |

### Technical Notes
- **old.reddit.com works perfectly** for comment automation
- Method: `textarea[name="text"]` → set `.value` → dispatch `input` event → click `button.save`
- New Reddit shadow DOM is unreliable — always use old.reddit.com
