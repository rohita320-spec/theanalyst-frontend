# ✅ Pre-Test Checklist

## System Status

- [ ] Backend running on port 8000
  ```bash
  curl http://localhost:8000/health
  # Expected: {"status":"ok"}
  ```

- [ ] Frontend running on port 3000
  ```bash
  curl http://localhost:3000/test
  # Expected: HTTP 200 with HTML
  ```

- [ ] Backend has required env vars
  ```bash
  ps aux | grep uvicorn | grep "FRONTEND_ORIGINS\|AUTH_TOKEN_SECRET"
  # Should show environment variables
  ```

## Frontend Files

- [ ] `.env.local` exists
  ```bash
  cat theanalyst-frontend/.env.local
  # Should show: NEXT_PUBLIC_API_URL=http://localhost:8000
  ```

- [ ] Test page loads
  ```bash
  open http://localhost:3000/test
  # Should see: "TEST SUITE" page with blue button
  ```

- [ ] Test helpers exist
  ```bash
  ls -la theanalyst-frontend/src/lib/test-setup.ts
  ls -la theanalyst-frontend/src/app/test/page.tsx
  ls -la theanalyst-frontend/test-runner.js
  # All should exist
  ```

## Quick Test

- [ ] User signup works
  ```bash
  curl -X POST http://localhost:8000/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test-'$(date +%s)'@test.local","password":"test123"}'
  # Should return token
  ```

- [ ] Web UI test works
  ```bash
  open http://localhost:3000/test
  # Click blue "Run Full Test Suite" button
  # Wait 15 seconds
  # Should see ✅ checkmarks and green output
  ```

- [ ] CLI test works
  ```bash
  cd theanalyst-frontend && node test-runner.js
  # Should show: "Results: 7/7 passed"
  ```

## Documentation

- [ ] README files exist
  ```bash
  ls -la theanalyst-frontend/TESTING.md
  ls -la theanalyst-frontend/TEST_READY.md
  ls -la theanalyst-frontend/START_HERE.md
  ls -la theanalyst-frontend/SETUP_COMPLETE.md
  # All should exist
  ```

## Ready to Test!

Once all checks above pass:

```bash
# Option 1: Web UI (Easiest)
open http://localhost:3000/test
# Click blue button, watch tests run

# Option 2: CLI
cd theanalyst-frontend && node test-runner.js
# Wait for results

# Option 3: Manual with helpers
# Use functions from src/lib/test-setup.ts
```

## Troubleshooting

If any check fails:

```bash
# Kill old processes
pkill -f "uvicorn main:app"
pkill -f "next dev"

# Restart backend
cd lpbackend && source venv/bin/activate && \
  bash start-backend.sh &

# Restart frontend
cd theanalyst-frontend && npm run dev &

# Wait 5 seconds and try checks again
```

---

✨ **When all checks pass, you're ready to run tests!**
