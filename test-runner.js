const API_BASE_URL = process.env.API_URL || "http://localhost:8000";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@test.local";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "AdminTestPass123!";

const results = [];

async function test(name, fn) {
  const start = performance.now();
  try {
    await fn();
    const duration = performance.now() - start;
    results.push({ name, status: "pass", duration });
    console.log(`PASS ${name} (${duration.toFixed(2)}ms)`);
  } catch (error) {
    const duration = performance.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, status: "fail", duration, error: message });
    console.error(`FAIL ${name} - ${message}`);
  }
}

async function runTests() {
  console.log("Backend Integration Tests");
  console.log(`API: ${API_BASE_URL}`);
  console.log("---\n");

  let testUserId = "";
  let testUserToken = "";
  let secondUserToken = "";
  let adminToken = "";
  let questionId = "";

  await test("Admin login", async () => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const data = await res.json();
    adminToken = data.token;
  });

  await test("Signup - Create test user", async () => {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `test-${Date.now()}@test.local`,
        password: "testpass123",
      }),
    });

    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);

    const data = await res.json();
    testUserId = data.user.id;
    testUserToken = data.token;
  });

  await test("Signup - Create second test user", async () => {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `second-${Date.now()}@test.local`,
        password: "testpass123",
      }),
    });

    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);

    const data = await res.json();
    secondUserToken = data.token;
  });

  await test("Question - Admin create test question", async () => {
    const closingTime = new Date();
    closingTime.setDate(closingTime.getDate() + 30);

    const res = await fetch(`${API_BASE_URL}/admin/create_question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        question_text: "Test: Will the market reach 60%?",
        category: "Test",
        entry_cost: 100,
        closing_time: closingTime.toISOString(),
        initial_probability: 0.55,
      }),
    });

    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

    const data = await res.json();
    questionId = data.question_id;
  });

  await test("Prediction - Place YES prediction", async () => {
    const res = await fetch(`${API_BASE_URL}/place_prediction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserToken}`,
      },
      body: JSON.stringify({
        question_id: questionId,
        answer: "yes",
        points_to_spend: 100,
      }),
    });

    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

    const data = await res.json();
    if (!data.success) throw new Error("Prediction not successful");
  });

  await test("Prediction - Place NO prediction", async () => {
    const res = await fetch(`${API_BASE_URL}/place_prediction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secondUserToken}`,
      },
      body: JSON.stringify({
        question_id: questionId,
        answer: "no",
        points_to_spend: 100,
      }),
    });

    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

    const data = await res.json();
    if (!data.success) throw new Error("Second prediction not successful");
  });

  await test("Profile - Fetch positions endpoint", async () => {
    const res = await fetch(`${API_BASE_URL}/profile_positions/${testUserId}`);
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.success) throw new Error("Profile positions failed");
    if (data.open_positions_count < 1) throw new Error("Expected at least 1 open position");
  });

  await test("Profile - Fetch intelligence endpoint", async () => {
    const res = await fetch(`${API_BASE_URL}/profile_intelligence/${testUserId}`);
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.success) throw new Error("Profile intelligence failed");
  });

  await test("Profile - Fetch overview endpoint", async () => {
    const res = await fetch(`${API_BASE_URL}/profile_overview/${testUserId}`);
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.success) throw new Error("Profile overview failed");
  });

  console.log("\n---");
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nResults: ${passed}/${results.length} passed, ${failed} failed`);
  console.log(`Total time: ${totalTime.toFixed(2)}ms`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    results
      .filter((r) => r.status === "fail")
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
