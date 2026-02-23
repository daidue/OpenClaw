# Sleeper League IDs for Market Intelligence Testing

## Source
Found from Reddit (r/FindALeague, 2026-02-22)

## Invite Links (can be converted to league IDs via API)

1. `http://sleeper.com/i/0NQD6Nn3JLEXb` - 12 team SF, 2TE premium, $150 buy-in
2. `http://sleeper.com/i/LVOQwezDd1j78` - 12T SF TEP, $25/year, mid-draft orphan

## How to Convert Invite Links to League IDs

The Sleeper API doesn't have a direct "invite code to league ID" endpoint, but we can:

1. Extract usernames from the invite link flow (if we had a browser session)
2. OR use existing public league IDs from other sources

## Alternative: Use Public Sleeper Leagues

**Better approach:** Instead of relying on invite links, we should:

1. **Find active users via Sleeper's public API:**
   - Pick popular Sleeper users (can find via Twitter/Reddit who share their usernames)
   - Get their league IDs via `/user/<user_id>/leagues/nfl/2025`

2. **Bootstrap from known users:**
   - Many dynasty content creators share their Sleeper usernames publicly
   - Example: @JoeNFL, @MattKelleyFF, @HaydenWinks (all share their Sleeper handles)

3. **Use the orphan spreadsheet (if accessible):**
   - Check if it contains actual league IDs or just team descriptions

## Next Steps

1. Try accessing the orphan spreadsheet
2. If no league IDs there, find 5 public Sleeper users via Twitter/Reddit
3. Pull their league IDs via API
4. Select 10 active dynasty leagues with 15+ trades

## Manual Seed Strategy (if automated fails)

Post to r/DynastyFF asking: "Looking for dynasty league IDs to test our new market intelligence tool - we'll analyze your league's trade patterns anonymously and share insights back. Drop your league ID below!"

This would get us:
- Actual active leagues
- User permission (implicit)
- Diverse league settings
- Engaged user base for feedback

**Status:** Invite links found, but need actual 18-digit league IDs. Checking orphan spreadsheet next.
