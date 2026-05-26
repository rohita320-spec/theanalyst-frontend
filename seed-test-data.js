#!/usr/bin/env node
/**
 * seed-test-data.js
 *
 * Creates 10 test users + 7 test questions + realistic predictions.
 * Questions are tagged with "[TEST]" prefix so they are hidden from
 * the public feed but visible to admin in the Test Sandbox panel.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpass node seed-test-data.js
 *
 * Optional env vars:
 *   API_URL  — defaults to https://lpbackend-production.up.railway.app
 *   DRY_RUN  — set to "true" to print plan without making API calls
 */

const API_BASE = (process.env.API_URL || "https://lpbackend-production.up.railway.app").replace(/\/$/, "");
const DRY_RUN = process.env.DRY_RUN === "true";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("\n[ERROR] Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running.\n");
  console.error("  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpass node seed-test-data.js\n");
  process.exit(1);
}

// ─── Test questions (7 total) ────────────────────────────────────────────────
const TEST_QUESTIONS = [
  {
    question_text: "[TEST] Will the S&P 500 close above 5,500 by end of this quarter?",
    category: "Markets",
    entry_cost: 300,
    initial_probability: 0.62,
    resolution_rules: "TEST DATA ONLY. YES if S&P 500 closing price ≥ 5,500 on the last trading day of the quarter.",
  },
  {
    question_text: "[TEST] Will Bitcoin exceed $100,000 before end of June?",
    category: "Crypto",
    entry_cost: 500,
    initial_probability: 0.45,
    resolution_rules: "TEST DATA ONLY. YES if BTC/USD closing price on Binance exceeds $100,000 before 30 June.",
  },
  {
    question_text: "[TEST] Will the Federal Reserve cut rates in their next meeting?",
    category: "Economy",
    entry_cost: 200,
    initial_probability: 0.38,
    resolution_rules: "TEST DATA ONLY. YES if the FOMC announces a rate cut of ≥ 0.25% at their next scheduled meeting.",
  },
  {
    question_text: "[TEST] Will Apple report earnings above analyst consensus this quarter?",
    category: "Markets",
    entry_cost: 400,
    initial_probability: 0.71,
    resolution_rules: "TEST DATA ONLY. YES if Apple EPS beats Bloomberg consensus estimate on earnings day.",
  },
  {
    question_text: "[TEST] Will global EV sales surpass 5 million units this quarter?",
    category: "General",
    entry_cost: 300,
    initial_probability: 0.55,
    resolution_rules: "TEST DATA ONLY. YES if combined global EV unit sales exceed 5M for the calendar quarter.",
  },
  {
    question_text: "[TEST] Will the G7 summit produce a joint statement on AI regulation?",
    category: "Global events",
    entry_cost: 200,
    initial_probability: 0.48,
    resolution_rules: "TEST DATA ONLY. YES if the official G7 summit communiqué includes agreed AI regulation language.",
  },
  {
    question_text: "[TEST] Will annual CPI inflation print below 3.0% this month?",
    category: "Economy",
    entry_cost: 300,
    initial_probability: 0.57,
    resolution_rules: "TEST DATA ONLY. YES if the official CPI YoY figure for the current month is below 3.0%.",
  },
];

// ─── Test users (10 total) ───────────────────────────────────────────────────
const TEST_USERS = Array.from({ length: 10 }, (_, i) => ({
  email: `testuser${String(i + 1).padStart(2, "0")}@sandbox.test`,
  password: "TestPass123!",
  username: `sandbox_user${String(i + 1).padStart(2, "0")}`,
}));

const PATCH_HEADERS = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// ─── Prediction patterns per user ───────────────────────────────────────────
// Each entry: [questionIndex, answer, pointsToSpend, analysisType]
const ANALYSIS_TYPES = {
  Markets: ["Technical Analysis", "Fundamental Analysis"],
  Crypto: ["Technical Analysis", "On-Chain Analysis", "Fundamental Analysis"],
  Economy: ["Macro Analysis", "Policy Analysis", "Historical Trends"],
  General: ["Logical Reasoning", "News/Event-Driven", "Public Opinion"],
  "Global events": ["Geopolitical Analysis", "Historical Patterns"],
};

function pickAnalysisType(category) {
  const types = ANALYSIS_TYPES[category] || ["Logical Reasoning"];
  return types[Math.floor(Math.random() * types.length)];
}

// Each user gets 3-5 predictions spread across the 7 questions
const USER_PREDICTIONS = [
  [[0, "yes", 400, null], [2, "no", 200, null], [4, "yes", 300, null], [6, "yes", 300, null]],
  [[0, "no",  300, null], [1, "yes", 500, null], [3, "yes", 400, null], [5, "no",  200, null]],
  [[1, "no",  500, null], [2, "yes", 200, null], [4, "no",  300, null], [6, "no",  300, null]],
  [[0, "yes", 400, null], [3, "no",  400, null], [5, "yes", 200, null]],
  [[1, "yes", 500, null], [2, "no",  200, null], [4, "yes", 300, null], [6, "yes", 300, null]],
  [[0, "no",  300, null], [1, "no",  500, null], [3, "yes", 400, null]],
  [[2, "yes", 200, null], [4, "no",  300, null], [5, "no",  200, null], [6, "no",  300, null]],
  [[0, "yes", 400, null], [1, "yes", 500, null], [2, "no",  200, null], [3, "no",  400, null]],
  [[4, "yes", 300, null], [5, "yes", 200, null], [6, "yes", 300, null]],
  [[0, "no",  300, null], [3, "yes", 400, null], [1, "no",  500, null], [2, "yes", 200, null], [5, "no", 200, null]],
];

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { detail: text }; }
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${json.detail || json.message || text}`);
  return json;
}

// ─── Steps ────────────────────────────────────────────────────────────────────
async function loginAdmin() {
  console.log(`\n[1/4] Logging in as admin (${ADMIN_EMAIL})…`);
  if (DRY_RUN) return "DRY_RUN_TOKEN";
  const data = await post("/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!data.token) throw new Error("No token in login response");
  console.log(`      ✓ Logged in. Role: ${data.user?.role}`);
  if (!["admin", "question_creator", "question_creator_resolver"].includes(data.user?.role)) {
    throw new Error(`User role '${data.user?.role}' cannot create questions. Need admin or question_creator.`);
  }
  return data.token;
}

async function createTestQuestions(adminToken) {
  const closingTime = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days out
  console.log(`\n[2/4] Creating ${TEST_QUESTIONS.length} test questions…`);
  const createdIds = [];
  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const q = TEST_QUESTIONS[i];
    if (DRY_RUN) {
      console.log(`      [DRY] Would create: ${q.question_text}`);
      createdIds.push(`dry-id-${i}`);
      continue;
    }
    try {
      const data = await post(
        "/admin/create_question",
        { ...q, closing_time: closingTime },
        adminToken,
      );
      const id = data.question_id || data._id || data.id;
      createdIds.push(id);
      console.log(`      ✓ [${i + 1}/${TEST_QUESTIONS.length}] ${q.question_text.slice(0, 70)}… (id: ${id})`);
    } catch (err) {
      console.error(`      ✗ Failed to create question ${i + 1}: ${err.message}`);
      createdIds.push(null);
    }
  }
  return createdIds;
}

async function setUsername(token, username) {
  try {
    const res = await fetch(`${API_BASE}/me/profile_preferences`, {
      method: "PATCH",
      headers: PATCH_HEADERS(token),
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (process.env.VERBOSE) console.warn(`      ⚠ Could not set username ${username}: ${t}`);
    }
  } catch {
    // non-fatal — username just won't be set
  }
}

async function createTestUsers() {
  console.log(`\n[3/4] Creating ${TEST_USERS.length} test users…`);
  const createdUsers = [];
  for (let i = 0; i < TEST_USERS.length; i++) {
    const u = TEST_USERS[i];
    if (DRY_RUN) {
      console.log(`      [DRY] Would create: ${u.email} (username: ${u.username})`);
      createdUsers.push({ token: `dry-token-${i}`, id: `dry-uid-${i}`, email: u.email, username: u.username });
      continue;
    }
    try {
      const data = await post("/auth/signup", { email: u.email, password: u.password });
      await setUsername(data.token, u.username);
      createdUsers.push({ token: data.token, id: data.user?.id, email: u.email, username: u.username });
      console.log(`      ✓ [${i + 1}/${TEST_USERS.length}] ${u.email} → @${u.username} (id: ${data.user?.id})`);
    } catch (err) {
      if (err.message.includes("already") || err.message.includes("exists") || err.message.includes("409")) {
        // User exists — log in and re-apply username
        try {
          const data = await post("/auth/login", { email: u.email, password: u.password });
          await setUsername(data.token, u.username);
          createdUsers.push({ token: data.token, id: data.user?.id, email: u.email, username: u.username });
          console.log(`      ↻ [${i + 1}/${TEST_USERS.length}] ${u.email} already exists — logged in, username re-applied`);
        } catch (loginErr) {
          console.error(`      ✗ Could not create or login ${u.email}: ${loginErr.message}`);
          createdUsers.push(null);
        }
      } else {
        console.error(`      ✗ Failed to create ${u.email}: ${err.message}`);
        createdUsers.push(null);
      }
    }
  }
  return createdUsers;
}

async function placePredictions(users, questionIds) {
  console.log(`\n[4/4] Placing predictions…`);
  let total = 0;
  let failed = 0;

  for (let ui = 0; ui < users.length; ui++) {
    const user = users[ui];
    if (!user) continue;
    const preds = USER_PREDICTIONS[ui] || [];

    for (const [qIdx, answer, pts] of preds) {
      const questionId = questionIds[qIdx];
      if (!questionId) continue;
      const category = TEST_QUESTIONS[qIdx]?.category || "General";
      const analysisType = pickAnalysisType(category);

      if (DRY_RUN) {
        console.log(`      [DRY] ${user.email} → Q${qIdx + 1} ${answer.toUpperCase()} ${pts}pts (${analysisType})`);
        total++;
        continue;
      }
      try {
        await post(
          "/place_prediction",
          { question_id: questionId, answer, points_to_spend: pts, analysis_type: analysisType },
          user.token,
        );
        process.stdout.write(".");
        total++;
      } catch (err) {
        process.stdout.write("✗");
        failed++;
        if (process.env.VERBOSE) console.error(`\n      ✗ ${user.email} Q${qIdx + 1}: ${err.message}`);
      }
    }
  }
  console.log(`\n      Done. ${total} predictions placed, ${failed} failed.`);
  return { total, failed };
}

function printSummary(questionIds, users, predResult) {
  console.log("\n" + "═".repeat(62));
  console.log("  TEST SANDBOX SUMMARY");
  console.log("═".repeat(62));
  console.log(`  API:         ${API_BASE}`);
  console.log(`  Questions:   ${questionIds.filter(Boolean).length}/${TEST_QUESTIONS.length} created`);
  console.log(`  Users:       ${users.filter(Boolean).length}/${TEST_USERS.length} created`);
  console.log(`  Predictions: ${predResult.total} placed, ${predResult.failed} failed`);
  console.log("─".repeat(62));
  console.log("  Test question titles (all prefixed [TEST]):");
  TEST_QUESTIONS.forEach((q, i) => {
    const id = questionIds[i];
    console.log(`  [${i + 1}] ${q.question_text.slice(7, 65)}… ${id ? `✓` : "✗ FAILED"}`);
  });
  console.log("─".repeat(62));
  console.log("  Test user emails (testuser01–10@sandbox.test):");
  users.forEach((u, i) => {
    if (u) console.log(`  [${i + 1}] ${u.email}  @${u.username || "(username not set)"}  ${u.id ? `(${u.id.slice(0, 8)}…)` : ""}`);
    else console.log(`  [${i + 1}] ✗ FAILED`);
  });
  console.log("─".repeat(62));
  console.log("  View in admin → Test Sandbox panel");
  console.log("  [TEST] questions are hidden from the public feed.");
  console.log("═".repeat(62) + "\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log("═".repeat(62));
  console.log("  ANALYST TEST SANDBOX SEEDER");
  if (DRY_RUN) console.log("  ⚠  DRY RUN — no API calls will be made");
  console.log("═".repeat(62));

  try {
    const adminToken = await loginAdmin();
    const questionIds = await createTestQuestions(adminToken);
    const users = await createTestUsers();
    const predResult = await placePredictions(users, questionIds);
    printSummary(questionIds, users, predResult);
  } catch (err) {
    console.error(`\n[FATAL] ${err.message}\n`);
    process.exit(1);
  }
})();
