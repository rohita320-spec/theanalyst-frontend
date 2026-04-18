# 🚀 Start Testing in 30 Seconds

## Option A: Web UI (Easiest) 🎨

```bash
# Step 1: Open in browser (already running)
http://localhost:3000/test

# Step 2: Click the blue button
"Run Full Test Suite"

# Step 3: Watch the tests! ✨
(You'll see live output with checkmarks)
```

## Option B: Terminal (CLI) 💻

```bash
cd ~/Documents/GitHub/theanalyst-frontend
node test-runner.js
```

Expected output:
```
✅ Signup - Create test user (125.43ms)
✅ Signup - Create question creator (98.21ms)
✅ Question - Create test question (245.67ms)
✅ Prediction - Place YES prediction (156.89ms)
✅ Profile - Fetch positions endpoint (89.34ms)
✅ Profile - Fetch intelligence endpoint (76.45ms)
✅ Profile - Fetch overview endpoint (94.22ms)

Results: 7/7 passed, 0 failed
Total time: 890.21ms
```

## What Gets Tested

```
┌─────────────────────────────────────┐
│  TEST SUITE (NO BUBBLE)              │
├─────────────────────────────────────┤
│ 1. User Signup (Local Auth)          │
│    → Creates JWT token               │
│    → Stores in auth_users.json       │
│                                     │
│ 2. Question Creation                │
│    → Sets market state (55% YES)     │
│    → Returns question_id             │
│                                     │
│ 3. Prediction Placement              │
│    → Updates YES/NO pools            │
│    → Calculates shares               │
│                                     │
│ 4. Profile Positions                 │
│    → Shows open positions            │
│    → Calculates unrealized P&L       │
│                                     │
│ 5. Profile Intelligence              │
│    → Average conviction %            │
│    → Edge calculations               │
│                                     │
│ 6. Profile Overview                  │
│    → Combined metrics                │
│    → All user stats                  │
└─────────────────────────────────────┘
```

## Verify Setup

```bash
# Check backend is running
curl http://localhost:8000/health
# Expected: {"status":"ok"}

# Check frontend is running
curl http://localhost:3000/test
# Expected: HTML response with test page
```

## Files Used

```
Frontend Setup:
  .env.local                       ← Points to local backend
  src/lib/test-setup.ts            ← Test helper functions
  src/app/test/page.tsx            ← Web UI component
  test-runner.js                   ← CLI test script

Backend (Already Running):
  http://localhost:8000
  - /auth/signup                   (local users only)
  - /admin/create_question         
  - /place_prediction
  - /profile_positions/*
  - /profile_intelligence/*
  - /profile_overview/*
```

## Success Indicators

✅ Test page loads → http://localhost:3000/test accessible  
✅ Blue button appears → "Run Full Test Suite"  
✅ Green checkmarks in output → All tests passing  
✅ No "Bubble" in log → No external API calls  
✅ JSON results display → Endpoints working  

## Next Steps

1. **Run tests multiple times** to ensure consistency
2. **Modify test data** in code to test edge cases
3. **Build UI components** that use these endpoints
4. **When ready**: Implement Bubble→PostgreSQL migration

## Troubleshooting

```bash
# Backend not running?
ps aux | grep uvicorn

# Frontend not running?
ps aux | grep "next dev"

# Port 3000 already in use?
lsof -i :3000 | grep node | awk '{print $2}' | xargs kill -9

# Port 8000 already in use?
lsof -i :8000 | grep python | awk '{print $2}' | xargs kill -9
```

---

**You're all set! Go test! 🎯**
