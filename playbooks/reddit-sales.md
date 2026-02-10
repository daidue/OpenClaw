# Reddit Sales Playbook — Freelance Invoice Tracker

## Account
- **Username:** u/JeffOnNotion
- **Status:** New account, low karma — will get auto-removed by automod in most subreddits for standalone posts
- **Strategy:** Comment-first (comments have lower karma thresholds), build karma organically, graduate to posts

## Products
- **Free Lite:** `jeffthenotionguy.gumroad.com/l/ujrthk`
- **Full Toolkit ($27):** `jeffthenotionguy.gumroad.com/l/freelance-toolkit`

## ⚠️ Critical Rules
1. **NEVER post Gumroad links in comments** — Reddit auto-removes them
2. Use "link in profile" or "DM me" approach (proven by other sellers in r/Notion)
3. **Use old.reddit.com** for all browser automation — simpler DOM, regular textareas
4. Don't post more than 2-3 comments per subreddit per day (spam detection)
5. Mix promotional comments with genuinely helpful non-promo comments (3:1 ratio helpful:promo)
6. Never copy-paste the same comment text — vary each one

## Browser Technique (old.reddit.com)

### Commenting on a post:
```javascript
// Navigate to: https://old.reddit.com/r/{subreddit}/comments/{post_id}/...
// Fill the comment textarea:
(() => {
  var ta = document.querySelector('textarea[name="text"][data-event-action="comment"]');
  ta.focus();
  ta.value = 'YOUR COMMENT TEXT HERE';
  ta.dispatchEvent(new Event('input', {bubbles: true}));
  return ta.value.length;
})()

// Submit:
(() => {
  var form = document.querySelector('textarea[name="text"][data-event-action="comment"]').closest('form');
  var btn = form.querySelector('.save');
  btn.click();
  return 'submitted';
})()
```

### Creating a new post:
```javascript
// Navigate to: https://old.reddit.com/r/{subreddit}/submit?selftext=true
// Fill title and body, then submit
```

## Target Subreddits (Priority Order)

### Tier 1 — Direct audience (comment first, post when karma allows)
| Subreddit | Members | Strategy |
|-----------|---------|----------|
| r/Notion | 178K | Self-promo thread (biweekly) + helpful comments on relevant posts |
| r/Notiontemplates | 22K | Post template showcase (needs karma) |
| r/notioncreations | 13K | Post template showcase (needs karma) |

### Tier 2 — Freelancer audience
| Subreddit | Members | Strategy |
|-----------|---------|----------|
| r/freelance | 300K+ | Helpful comments on invoicing/payment questions |
| r/Entrepreneur | 2M+ | Comments on "tools I use" or organization threads |
| r/smallbusiness | 500K+ | Comments on invoicing pain points |
| r/SideProject | 100K+ | "I built this" post (when karma allows) |

### Tier 3 — Broader reach
| Subreddit | Members | Strategy |
|-----------|---------|----------|
| r/productivity | 1M+ | Comments about Notion workflows |
| r/digital_nomad | 500K+ | Comments about freelance tooling |

## Comment Templates (Vary These — Never Copy Exact)

### Template A: Problem-Solution (for invoicing pain posts)
> I had the same problem — was tracking everything in spreadsheets and constantly missing follow-ups. Ended up building an invoice tracking system in Notion with a client database, status pipeline (draft → sent → paid), and overdue alerts. There's a free version if you want to try it — link on my profile. Happy to DM it too.

### Template B: Helpful + Mention (for "what tools do you use" posts)
> For invoicing specifically, I use a Notion template I built — tracks clients, invoices, payment status, even handles multiple currencies. The nice thing vs dedicated invoicing software is it lives right next to all my other project management stuff. Free version on my profile if curious.

### Template C: Empathy + Offer (for stress/overwhelm posts)
> This hits home. The admin side of freelancing is what burns people out — not the actual work. I built a Notion system specifically to handle the invoicing chaos (client database, payment tracking, overdue alerts). Made a free version available — check my profile or DM me.

### Template D: Pure Value (karma building — NO promo)
> [Just answer the question helpfully. Build karma. Be a good community member.]

## Karma Building Activities
1. Answer Notion questions (formulas, databases, API)
2. Upvote posts and comments in joined subreddits
3. Comment on non-template discussions with genuine opinions
4. Share Notion tips without linking to products
5. Target: 50+ comment karma before attempting standalone posts

## Daily Routine
1. Check r/Notion/new for relevant posts (invoicing, freelance, business, templates)
2. Check r/freelance for invoicing/payment threads
3. Post 1-2 helpful comments (no promo) for karma
4. Post 1 promotional comment where relevant
5. Check for DMs and respond with Gumroad links
6. Update karma tracking in `memory/reddit-sales-log.md`

## Profile Setup (TODO)
- Bio should mention: "Notion template creator | Free freelance tools"
- Pin/highlight any well-received comments
- Profile link should point to Gumroad store

## Metrics to Track
- Comments posted (promo vs helpful)
- Karma gained
- DMs received asking for links
- Gumroad referral traffic from Reddit
- Actual downloads/sales attributed to Reddit
