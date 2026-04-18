#!/bin/bash
# Quick Setup Script for Testing

set -e

echo "🚀 Test Environment Setup"
echo "========================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Backend
echo -e "\n${YELLOW}1. Checking Backend...${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Backend not found on http://localhost:8000${NC}"
    echo -e "   Start backend: cd lpbackend && source venv/bin/activate && uvicorn main:app"
    exit 1
fi

# Step 2: Check Frontend
echo -e "\n${YELLOW}2. Checking Frontend...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on http://localhost:3000${NC}"
else
    echo -e "${RED}⚠️  Frontend not found on http://localhost:3000${NC}"
    echo -e "   Start frontend: cd theanalyst-frontend && npm run dev"
    echo -e "   Continuing anyway (CLI tests don't need frontend)${NC}"
fi

# Step 3: Create Admin User
echo -e "\n${YELLOW}3. Creating test admin user...${NC}"
ADMIN_EMAIL="admin-test-$(date +%s)@test.local"
ADMIN_PASSWORD="adminpass123"

SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

echo "$SIGNUP_RESPONSE" | jq . 2>/dev/null || echo "$SIGNUP_RESPONSE"

ADMIN_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.user.id // empty' 2>/dev/null)
ADMIN_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.token // empty' 2>/dev/null)

if [ -z "$ADMIN_ID" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}❌ Failed to create admin user${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Admin user created${NC}"
echo -e "   Email: $ADMIN_EMAIL"
echo -e "   ID: $ADMIN_ID"
echo -e "   Token: ${ADMIN_TOKEN:0:20}...${NC}"

# Step 4: Show next steps
echo -e "\n${YELLOW}4. Next Steps${NC}"
echo -e "${GREEN}Option A: Web UI${NC} (browser)"
echo -e "   1. Open http://localhost:3000/test"
echo -e "   2. Click 'Run Full Test Suite'"
echo ""
echo -e "${GREEN}Option B: CLI${NC} (terminal)"
echo -e "   cd theanalyst-frontend && node test-runner.js"
echo ""
echo -e "${GREEN}Option C: Manual API Testing${NC}"
echo -e "   Dashboard: curl http://localhost:8000/health"
echo -e "   Questions: curl http://localhost:8000/feed_questions"
echo -e "   AdminKey: $ADMIN_TOKEN"

echo -e "\n${GREEN}✅ Setup complete!${NC}"
