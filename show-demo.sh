#!/usr/bin/env bash
#
# Show the investor demo (mock mode) — one command.
#   ./show-demo.sh
# Then open http://localhost:3001
#
# Mock mode = all data is built into the page (questions, logos, charts, links,
# leaderboard, profile). No backend, no database, no internet needed except the
# logo/chart images. Does NOT touch the live site or real users.
#
set -uo pipefail
cd "$(dirname "$0")"
PORT=3001

# free the demo port if something's on it
lsof -ti tcp:$PORT 2>/dev/null | xargs kill -9 >/dev/null 2>&1 || true
sleep 1

echo "Building the demo (mock mode)..."
NEXT_PUBLIC_USE_MOCK=true npm run build > /tmp/show-demo-build.log 2>&1
if [ $? -ne 0 ]; then
  echo "Build failed. Last lines:"; tail -8 /tmp/show-demo-build.log; exit 1
fi

echo ""
echo "=================================================="
echo "  Demo starting at:  http://localhost:$PORT"
echo "  (Press Ctrl+C here to stop it.)"
echo "=================================================="
echo ""
NEXT_PUBLIC_USE_MOCK=true npm run start -- -p $PORT
