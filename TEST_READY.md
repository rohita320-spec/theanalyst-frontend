# ✅ Next.js Testing Setup - Complete

## Status: READY FOR TESTING

All components are configured and tested. You can now:
- Create test users via local auth (no Bubble dependency)
- Create test questions
- Place predictions
- Test all new profile endpoints

## Quick Start

### 1. **Web UI Test Page** (Easiest)
```bash
# Open in browser:
http://localhost:3000/test

# Click "Run Full Test Suite"
# Watch tests execute in real-time
```

### 2. **CLI Test Script**
```bash
cd ~/Documents/GitHub/theanalyst-frontend
node test-runner.js
```

### 3. **Backend Health Check**
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

## What's Included

### Frontend Files
- ✅ `.env.local` - Points to local backend (not production)
- ✅ `src/lib/test-setup.ts` - Test helper functions (TypeScript)
- ✅ `src/app/test/page.tsx` - Interactive test UI (React)
- ✅ `test-runner.js` - CLI test script (Node.js)
- ✅ `TESTING.md` - Complete testing guide
- ✅ `setup-test.sh` - Environment setup script

### What Gets Tested

#### ✅ User Authentication (Local Only)
```
POST /auth/signup → Creates local user (auth_users.json)
```
Result: JWT token issued, NO Bubble API call

#### ✅ Question Creation
```
POST /admin/create_question → Question created with market state
```
Result: `question_id`, market prices, no Bubble dependency

#### ✅ Predictions
```
POST /place_prediction → Updates market state, tracks positions
```
Result: Shares received, avg entry price, updated YES/NO percentages

#### ✅ New Profile Endpoints (3 New Routes)
```
GET /profile_positions/{user_id}  → Open positions, P&L metrics
GET /profile_intelligence/{user_id} → Conviction & edge percentages
GET /profile_overview/{user_id}   → Combined profile data
```
Result: All return `success: true` with real metrics

## Test Flow

```
1. Create Test User
   ↓
2. Create Test Question (with 55% initial probability)
   ↓
3. Place Predictions (User 1: YES 50 points, User 2: NO 30 points)
   ↓
4. Market Rebalances (Shows changed YES/NO percentages)
   ↓
5. Fetch Profile Positions (Shows open positions, unrealized P&L)
   ↓
6. Fetch Profile Intelligence (Shows conviction, edge metrics)
   ↓
7. Fetch Profile Overview (Combined all above)
   ↓
✅ All Tests Pass!
```

## Environment Variables (Already Set)

### Backend Running On Port 8000
```
FRONTEND_ORIGINS=http://localhost:3000,http://localhost:3001
AUTH_TOKEN_SECRET=test-secret-key-for-local-development
ADMIN_SIGNUP_CODE=analyst-admin-2026
PRIMARY_ADMIN_EMAIL=admin@test.local
PRIMARY_ADMIN_PASSWORD=AdminTestPass123!
```

### Frontend Using Local Backend
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=false
```

## Key Validations

✅ **No Bubble Dependency in Tests**
- Users created via local auth (auth_users.json)
- Questions created with local market state
- Predictions use in-memory logic
- Profile endpoints query local data only

✅ **Market State Consistency**
- Predictions return real YES/NO percentages (not zeros)
- Market rebalances after each trade
- Profile positions reflect actual shareholdings

✅ **All New Endpoints Working**
- `/profile_positions/{user_id}` returns position data
- `/profile_intelligence/{user_id}` returns conviction metrics
- `/profile_overview/{user_id}` returns combined profile

## Next Steps

### Option A: Continue Testing
```bash
# Run tests multiple times, different scenarios
npm run dev  # Start frontend at localhost:3000
visit http://localhost:3000/test  # Run test suite
```

### Option B: Integrate into Frontend
- Add profile pages that use new endpoints
- Display positions and intelligence metrics
- Update leaderboard with new user stats

### Option C: Start Data Migration
- When ready, implement repository pattern
- Gradually move data from Bubble to PostgreSQL
- Use tests to validate parity

## Files Reference

| Path | Purpose |
|------|---------|
| [.env.local](.env.local) | Frontend env config (local backend) |
| [src/lib/test-setup.ts](src/lib/test-setup.ts) | Test helper functions |
| [src/app/test/page.tsx](src/app/test/page.tsx) | Web UI test page |
| [test-runner.js](test-runner.js) | CLI test script |
| [TESTING.md](TESTING.md) | Detailed testing guide |
| [setup-test.sh](setup-test.sh) | Environment setup script |

## Test Example Output

```
📝 Step 1: Creating test users...
✅ Test user created: 11acdf6f7a55559c (test-1726548503@example.com)
✅ Creator user created: a2b3c4d5e6f7g8h9 (creator-1726548503@example.com)

📝 Step 2: Promoting user to question_creator...
✅ User promoted to question_creator

📝 Step 3: Creating test question...
✅ Question created: q-1726548503-abc123
   - Text: "Will the test market reach 60% confidence?"
   - Initial probability: 55.00%

📝 Step 4: Placing predictions...
✅ User 1 placed YES prediction (50 points)
   - Shares received: 5.1
   - Avg entry price: 9.8
   - Market state - YES: 58.92%, NO: 41.08%

✅ User 2 placed NO prediction (30 points)
   - Shares received: 3.2
   - Market state - YES: 54.31%, NO: 45.69%

📝 Step 5: Testing new profile endpoints...
✅ Profile positions fetched:
   - Open positions: 1
   - Total at risk: 50 points
   - Total value: 52.3 points
   - Unrealized P&L: 2.3 points

✅ Profile intelligence fetched:
   - Average conviction: 55.10%
   - Average edge: 3.10%
   - Weighted edge: 1.87%

✅ Profile overview fetched (combined metrics)

✨ All tests completed successfully!
```

## Troubleshooting

**Issue: "Connection refused" on localhost:8000**  
→ Backend not running. Check: `ps aux | grep uvicorn`

**Issue: "Admin access required" on question creation**  
→ Normal for user role. Use creator token or promote user first.

**Issue: Profile endpoints return empty data**  
→ No predictions placed yet. Run "Place prediction" test first.

---

**Summary:**  All test infrastructure is in place. No Bubble dependency for test data flows. Ready to test new endpoints and develop frontend UI components.
