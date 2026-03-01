# TitleRun Tech Stack Reference

**Technology-specific patterns and best practices for TitleRun.**

---

## TypeScript

**Version:** 5.x  
**Config:** `tsconfig.json` with strict mode enabled

### Best Practices

**1. Type Safety**

✅ **Good:**
```typescript
interface Player {
  id: number;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE';
}

function getPlayer(id: number): Player {
  // Implementation
}
```

❌ **Bad:**
```typescript
function getPlayer(id: any): any {  // Avoid any!
  // Implementation
}
```

**Check for:**
- `any` types (should be specific)
- Missing return types on functions
- Untyped parameters

---

**2. Null Safety**

✅ **Good:**
```typescript
const name = player?.name ?? 'Unknown';
const score = response.data?.score ?? 0;
```

❌ **Bad:**
```typescript
const name = response.data.player.name;  // Could crash if player undefined!
```

**Check for:**
- Optional chaining `?.` when accessing nested properties
- Nullish coalescing `??` for defaults
- Explicit null checks before access

---

**3. Type Imports**

✅ **Good:**
```typescript
import type { Player } from './types';
```

❌ **Bad:**
```typescript
import { Player } from './types';  // Runtime import for type-only usage
```

---

## React

**Version:** 18.x  
**Framework:** Vite (bundler)

### Hooks Best Practices

**1. useMemo / useCallback**

✅ **When to use:**
```typescript
// Expensive calculation
const sortedPlayers = useMemo(
  () => players.sort((a, b) => b.value - a.value),
  [players]
);

// Object/array in render
const config = useMemo(() => ({ theme: 'dark' }), []);

// .find/.filter/.map result
const selected = useMemo(
  () => players.find(p => p.id === selectedId),
  [players, selectedId]
);

// Callback passed to child
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

❌ **When NOT to use:**
```typescript
// Primitive values (no object identity)
const count = players.length;  // Don't useMemo this

// Simple, cheap calculations
const doubled = x * 2;  // Don't useMemo this
```

**Rule of thumb:**
- If result is used in `useEffect` deps → use `useMemo`/`useCallback`
- If passed as prop to memoized child → use `useMemo`/`useCallback`
- If calculation is expensive (>5ms) → use `useMemo`

---

**2. useEffect Dependencies**

✅ **Good:**
```typescript
useEffect(() => {
  fetchData(playerId);
}, [playerId, fetchData]);  // All dependencies listed
```

❌ **Bad:**
```typescript
useEffect(() => {
  fetchData(playerId);
}, []);  // Missing playerId dependency!
```

**Check for:**
- Missing dependencies (eslint plugin will warn)
- Infinite loops (effect updates its own dependency)

---

**3. Keys in Lists**

✅ **Good:**
```typescript
{players.map(player => (
  <PlayerCard key={player.id} player={player} />
))}
```

❌ **Bad:**
```typescript
{players.map((player, index) => (
  <PlayerCard key={index} player={player} />  // Index as key!
))}
```

**Rule:** Use stable, unique ID, never array index.

---

## TanStack Query

**Version:** 5.x (formerly React Query)

### Best Practices

**1. Query Keys**

✅ **Good:**
```typescript
const { data } = useQuery({
  queryKey: ['players', { leagueId, position }],
  queryFn: () => fetchPlayers(leagueId, position)
});
```

**Structure:** `[resource, ...params]`

---

**2. staleTime Configuration**

✅ **Good:**
```typescript
useQuery({
  queryKey: ['players', leagueId],
  queryFn: fetchPlayers,
  staleTime: 5 * 60 * 1000  // 5 minutes
});
```

❌ **Bad:**
```typescript
useQuery({
  queryKey: ['players', leagueId],
  queryFn: fetchPlayers
  // staleTime defaults to 0 → refetches constantly!
});
```

**Rule:** Set explicit `staleTime` for data that doesn't change frequently.

---

**3. Mutation Invalidation**

✅ **Good:**
```typescript
const mutation = useMutation({
  mutationFn: updatePlayer,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['players'] });
  }
});
```

❌ **Bad:**
```typescript
const mutation = useMutation({
  mutationFn: updatePlayer
  // No invalidation → stale data!
});
```

---

**4. Request Deduplication**

✅ **Built-in:**
TanStack Query automatically deduplicates identical requests.

**But check for:**
- Direct `fetch()` calls (bypass TQ deduplication)
- Manual deduplication code (TQ handles it)

---

## Prisma ORM

**Version:** 5.x  
**Database:** PostgreSQL (production), SQLite (dev)

### Best Practices

**1. Relations & Includes**

✅ **Good:**
```prisma
model Trade {
  id Int @id @default(autoincrement())
  userId Int
  user User @relation(fields: [userId], references: [id])
  players TradePlayer[]
  
  @@index([userId])  // Index on foreign key
}
```

```typescript
// Include related data in single query
const trades = await prisma.trade.findMany({
  include: {
    user: true,
    players: true
  }
});
```

❌ **Bad:**
```typescript
// N+1 pattern
const trades = await prisma.trade.findMany();
for (const trade of trades) {
  trade.user = await prisma.user.findUnique({ where: { id: trade.userId } });
}
```

---

**2. Indexes**

✅ **Good:**
```prisma
model Player {
  id Int @id
  leagueId Int
  position String
  
  @@index([leagueId])  // Foreign key index
  @@index([position])  // Frequently queried
  @@index([leagueId, position])  // Composite for common query
}
```

**Rule:** Index all foreign keys + frequently queried fields.

---

**3. Data Types**

✅ **Good:**
```prisma
model Trade {
  value Decimal @db.Decimal(10, 2)  // Money = Decimal, not Float!
  createdAt DateTime @default(now())
  status String  // Or enum
}
```

❌ **Bad:**
```prisma
model Trade {
  value Float  // Precision loss for money!
  createdAt String  // Should be DateTime
}
```

---

**4. Migrations**

✅ **Good:**
- Descriptive names: `add_player_position_index`
- Reversible when possible
- Tested on staging with production snapshot

❌ **Bad:**
- Auto-generated names: `migration_20260301`
- Destructive without backup plan
- Applied directly to production

---

## Express.js

**Version:** 4.x

### Best Practices

**1. Error Handling**

✅ **Good:**
```typescript
export async function getPlayer(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    const player = await prisma.player.findUnique({ where: { id } });
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    return res.json({ data: player });
  } catch (error) {
    console.error('Error fetching player:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

❌ **Bad:**
```typescript
export async function getPlayer(req: Request, res: Response) {
  const player = await prisma.player.findUnique({
    where: { id: req.params.id }  // No try/catch! Will crash on error
  });
  res.json(player);
}
```

---

**2. Input Validation**

✅ **Good:**
```typescript
import { normalizeId, validateEmail } from '@titlerun/validation';

const id = normalizeId(req.params.id);  // Throws if invalid
const email = validateEmail(req.body.email);  // Throws if invalid
```

❌ **Bad:**
```typescript
const id = req.params.id;  // Could be anything!
const email = req.body.email;  // Could be SQL injection
```

**Rule:** Use `@titlerun/validation` library (as of 2026-03-01).

---

**3. Status Codes**

✅ **Semantic:**
- `200` — Success
- `201` — Created
- `400` — Bad request (client error)
- `404` — Not found
- `500` — Server error (our bug)

❌ **Bad:**
```typescript
return res.status(200).json({ error: 'Player not found' });  // Should be 404!
```

---

## Cloudflare Pages (Frontend Hosting)

**Deployment:** Auto-deploy from `main` branch

### Configuration

```toml
# wrangler.toml
[build]
command = "npm run build"
publish = "dist"
```

**Check for:**
- Build command correct
- Output directory correct (`dist` for Vite)
- Environment variables configured in Cloudflare dashboard

---

## Railway (Backend Hosting)

**Deployment:** Auto-deploy from `main` branch (titlerun-api)

### Configuration

```json
// railway.json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/health"
  }
}
```

**Check for:**
- Start command correct
- Health check endpoint exists
- Database migrations run before app start

---

## Environment Variables

### Backend (Railway)

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Auth token secret
- `NODE_ENV` — `production`

### Frontend (Cloudflare Pages)

Required:
- `VITE_API_URL` — Backend API URL (https://api.titlerun.co)

**Security check:**
- No secrets in `.env.example`
- No hardcoded secrets in code
- All secrets in Railway/Cloudflare dashboard

---

## Summary: Common Tech Stack Issues

| Issue | Severity | Check For |
|-------|----------|-----------|
| `any` types in TypeScript | MEDIUM | Search for `any` keyword |
| `.find()` without useMemo | HIGH | See production-incidents.md |
| Missing Prisma indexes | HIGH | Every `@relation` needs `@@index` |
| N+1 query pattern | HIGH | Query inside loop |
| Missing error handling | HIGH | Async functions without try/catch |
| Wrong data type (Float for money) | HIGH | Should be Decimal |
| Missing input validation | HIGH | Use @titlerun/validation |
| Hardcoded API URLs | MEDIUM | Should use env vars |

---

**Last updated:** 2026-03-01  
**Version:** 1.0.0
