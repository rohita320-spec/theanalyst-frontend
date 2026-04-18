# Testing Guide: Next.js Integration Tests

This guide walks you through testing the new backend endpoints and functionality using Next.js, with **zero Bubble dependency** for test data.

## Architecture

```
┌─────────────────────────────────────────┐
│ Next.js Frontend (this repo)             │
│ ├─ Web UI Test Page (/test)              │
│ ├─ CLI Test Script (test-runner.js)      │
│ └─ Test Helpers (src/lib/test-setup.ts) │
└─────────────────────────────────────────┘
            ↓ HTTP ↓
┌─────────────────────────────────────────┐
│ FastAPI Backend (lpbackend)              │
│ ├─ Auth (local auth_users.json only)     │
│ ├─ Question Creation (local storage)     │
│ ├─ Predictions (local logic)             │
│ └─ New Profile Endpoints                 │
└─────────────────────────────────────────┘
            ↓ (NOT USED IN TESTS)
        Bubble.io
```

## Quick Start

### Prerequisites

1. **Backend running** on `http://localhost:8000`:
   ```bash
   cd lpbackend
   source venv/bin/activate
   ADMIN_SIGNUP_CODE=analyst-admin-2026 uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Frontend running** on `http://localhost:3000`:
   ```bash
   cd theanalyst-frontend
   npm run dev
   ```

### Option 1: Web UI (Browser)

1. Open [http://localhost:3000/test](http://localhost:3000/test)
2. Click **"Run Full Test Suite"**
3. Watch live test output in green
4. See results with detailed metrics

### Option 2: CLI Script

```bash
cd theanalyst-frontend

# Run all tests
node test-runner.js

# Or with custom API URL
API_URL=http://localhost:8000 node test-runner.js
```

## Test Scenarios

### Scenario 1: User Signup (No Bubble)
- ✅ Creates local user via JWT auth
- ✅ Returns token immediately
- ✅ No external API calls
- `Call: POST /auth/signup`

### Scenario 2: Question Creation
- ✅ Create question with test data
- ✅ Market state initialized (55% yes, 45% no)
- ✅ Returns question_id and market prices
- `Call: POST /admin/create_question`

### Scenario 3: Predictions
- ✅ User places YES prediction (user1)
- ✅ Market shifts (more YES)
- ✅ Different user places NO prediction (user2)
- ✅ Market shifts again (rebalances)
- `Call: POST /place_prediction`

### Scenario 4: New Profile Endpoints
All three new endpoints return real data:

#### `/profile_positions/{user_id}` - Hybrid Positions
```json
{
  "open_positions_count": 1,
  "total_points_at_risk": 50,
  "total_current_value": 52.5,
  "total_unrealized_pnl": 2.5,
  "positions": [
    {
      "question_id": "q-1",
      "answer": "yes",
      "shares": 5.0,
      "entry_price": 10.0,
      "current_price": 10.5,
      "position_value": 52.5,
      "unrealized_pnl": 2.5
    }
  ]
}
```

#### `/profile_intelligence/{user_id}` - Conviction Metrics
```json
{
  "average_conviction_percent": 55.0,
  "average_edge_percent": 5.0,
  "weighted_edge_percent": 3.2,
  "best_edge_percent": 8.5,
  "worst_edge_percent": -2.1
}
```

#### `/profile_overview/{user_id}` - Combined
Returns all three: profile + positions + intelligence

## Test Files

| File | Purpose |
|------|---------|
| `.env.local` | Points frontend to local backend (no Bubble) |
| `src/lib/test-setup.ts` | Helper functions (TypeScript) |
| `src/app/test/page.tsx` | Web UI test page (React component) |
| `test-runner.js` | CLI test script (Node.js) |

## Validations

### ✅ Test Pass Criteria
1. User signup succeeds (local auth only)
2. Question creation returns market state (init probability set)
3. Prediction placement returns real market prices (no zeros)
4. Profile endpoints return correct field structure
5. All endpoints return `success: true`

### ❌ Test Fail Triggers
- Bubble API calls in test data (shouldn't happen)
- Prediction response with deprecated keys
- Profile endpoints with missing fields
- Market state shows zero values

## Data Flow (Test Only)

```
1. User Signup
   ↓ (creates auth_users.json entry)
   
2. Question Creation
   ↓ (creates questions table entry if using local DB)
   
3. Place Prediction
   ↓ (updates pools, shares, market prices)
   
4. Profile Queries
   ↓ (fetches positions, calculates intelligence metrics)
```

## Environment Variables

```bash
# Frontend: Use real backend (not mock)
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend: Enable admin features
ADMIN_SIGNUP_CODE=analyst-admin-2026
USE_POSTGRES_AUTH=false  # Uses local auth_users.json

# Optional: Force backend to use Postgres
USE_POSTGRES_DATA=false  # Still uses Bubble (we're not testing this)
```

## Troubleshooting

### 🔴 Error: "Failed to create user: 409 - User already exists"
- User email already in `auth_users.json`
- Solution: Use unique email each run (tests use timestamp: `test-{Date.now()}@example.com`)

### 🔴 Error: "Failed to create question: 403 - Admin access required"
- Need to promote user to `question_creator` first
- Solution: Use promoter user with admin token

### 🔴 Error: "Failed to fetch positions: Cannot GET /profile_positions"
- Backend not running or updated
- Solution: Restart backend with latest code: `git pull && uvicorn main:app`

### 🔴 Error: "Connection refused on localhost:8000"
- Backend not running
- Solution: Start backend first (see Quick Start)

## Extending Tests

Add new test in `test-setup.ts`:

```typescript
export async function testNewFeature(userToken: string): Promise<Result> {
  const res = await fetch(`${API_BASE_URL}/new_endpoint`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
  return (await res.json()) as Result;
}
```

Then add to test page (`src/app/test/page.tsx`) or CLI script.

## Next Steps

- ✅ All tests passing → ready to integrate into production
- ✅ Profile endpoints working → ready for frontend UI components
- ✅ No Bubble in test data → safe to remove Bubble from data layer when ready

## References

- [Test Setup Helpers](./src/lib/test-setup.ts)
- [Web UI Test Page](./src/app/test/page.tsx)
- [CLI Test Script](./test-runner.js)
- Backend: [main.py](../lpbackend/main.py) (see `/admin/create_question`, `/place_prediction`, `/profile_*`)
