"use client";

import { useState } from "react";
import { login, me } from "@/lib/api";
import {
  createTestUser,
  createTestQuestion,
  placePrediction,
  fetchProfilePositions,
  fetchProfileIntelligence,
  fetchProfileOverview,
  type TestUser,
  type TestQuestion,
} from "@/lib/test-setup";

export default function TestPage() {
  const testAdminEmail = process.env.NEXT_PUBLIC_TEST_ADMIN_EMAIL || "admin@test.local";
  const testAdminPassword = process.env.NEXT_PUBLIC_TEST_ADMIN_PASSWORD || "AdminTestPass123!";
  const [status, setStatus] = useState<string>("");
  const [testUser, setTestUser] = useState<TestUser | null>(null);
  const [creatorUser, setCreatorUser] = useState<TestUser | null>(null);
  const [testQuestion, setTestQuestion] = useState<TestQuestion | null>(null);
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  const log = (msg: string) => {
    console.log(msg);
    setStatus((prev) => `${prev}\n${msg}`);
  };

  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    log(`❌ Error: ${message}`);
    console.error(error);
  };

  const runFullTest = async () => {
    try {
      setLoading(true);
      setStatus("");
      setResults({});

      let adminToken = localStorage.getItem("auth_token") || "";
      if (adminToken) {
        try {
          const current = await me(adminToken);
          if (current.user.role !== "admin") {
            adminToken = "";
          }
        } catch {
          adminToken = "";
        }
      }

      if (!adminToken) {
        log("📝 Step 0: Logging in as local admin...");
        const auth = await login({ email: testAdminEmail, password: testAdminPassword });
        adminToken = auth.token;
        localStorage.setItem("auth_token", adminToken);
        log(`✅ Admin session ready: ${auth.user.email}`);
      }

      // Step 1: Create test users
      log("📝 Step 1: Creating test users...");
      const user1 = await createTestUser(`testuser-${Date.now()}@example.com`);
      setTestUser(user1);
      log(`✅ Test user created: ${user1.id} (${user1.email})`);

      const user2 = await createTestUser(`creator-${Date.now()}@example.com`);
      setCreatorUser(user2);
      log(`✅ Second test user created: ${user2.id} (${user2.email})`);

      // Step 2: Create test question through admin flow
      log("\n📝 Step 2: Creating test question from admin...");
      const question = await createTestQuestion(adminToken, {
        question_text: "Will the test market reach 60% confidence?",
        category: "Test",
        initial_probability: 0.55,
      });
      setTestQuestion(question);
      log(`✅ Question created: ${question.question_id}`);
      log(`   - Text: "${question.question_text}"`);
      log(`   - Initial probability: ${(question.initial_probability * 100).toFixed(2)}%`);

      // Step 3: Place predictions
      log("\n📝 Step 3: Placing predictions...");
      const pred1 = await placePrediction(user1.token, question.question_id, "yes", 50);
      log(`✅ User 1 placed YES prediction (50 points)`);
      log(`   - Shares received: ${pred1.shares_received}`);
      log(`   - Avg entry price: ${pred1.avg_entry_price}`);
      log(`   - Market state - YES: ${Number(pred1.yes_percent).toFixed(2)}%, NO: ${Number(pred1.no_percent).toFixed(2)}%`);

      const pred2 = await placePrediction(user2.token, question.question_id, "no", 30);
      log(`✅ User 2 placed NO prediction (30 points)`);
      log(`   - Shares received: ${pred2.shares_received}`);
      log(`   - Market state - YES: ${Number(pred2.yes_percent).toFixed(2)}%, NO: ${Number(pred2.no_percent).toFixed(2)}%`);

      // Step 4: Test new profile endpoints
      log("\n📝 Step 4: Testing new profile endpoints...");

      const positions = await fetchProfilePositions(user1.id);
      setResults((prev) => ({ ...prev, positions }));
      log(`✅ Profile positions fetched:`);
      log(`   - Open positions: ${positions.open_positions_count}`);
      log(`   - Total at risk: ${positions.total_points_at_risk} points`);
      log(`   - Total value: ${positions.total_current_value} points`);
      log(`   - Unrealized P&L: ${positions.total_unrealized_pnl} points`);

      const intelligence = await fetchProfileIntelligence(user1.id);
      setResults((prev) => ({ ...prev, intelligence }));
      log(`✅ Profile intelligence fetched:`);
      log(`   - Average conviction: ${Number(intelligence.average_conviction_percent).toFixed(2)}%`);
      log(`   - Average edge: ${Number(intelligence.average_edge_percent).toFixed(2)}%`);
      log(`   - Weighted edge: ${Number(intelligence.weighted_edge_percent).toFixed(2)}%`);

      const overview = await fetchProfileOverview(user1.id);
      setResults((prev) => ({ ...prev, overview }));
      log(`✅ Profile overview fetched (combined metrics)`);

      log("\n✨ All tests completed successfully!");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">TEST SUITE</h1>
        <p className="text-gray-400 mb-8">Local Next.js + Backend Integration Tests</p>

        {/* Control Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <button
            onClick={runFullTest}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded"
          >
            {loading ? "Running..." : "Run Full Test Suite"}
          </button>
        </div>

        {/* Status Log */}
        {status && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Test Output</h2>
            <pre className="bg-gray-900 p-4 rounded text-sm whitespace-pre-wrap font-mono text-green-400 overflow-auto max-h-96">
              {status}
            </pre>
          </div>
        )}

        {/* Test Data Summary */}
        {testUser && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Test User</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-400">ID:</dt>
                  <dd className="font-mono">{testUser.id.slice(0, 12)}...</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Email:</dt>
                  <dd>{testUser.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Role:</dt>
                  <dd>{testUser.role}</dd>
                </div>
              </dl>
            </div>

            {testQuestion && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4">Test Question</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-400">ID:</dt>
                    <dd className="font-mono">{testQuestion.question_id.slice(0, 12)}...</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Category:</dt>
                    <dd>{testQuestion.category}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Entry Cost:</dt>
                    <dd>{testQuestion.entry_cost} points</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {Object.keys(results).length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Test Results</h2>
            <details className="bg-gray-900 p-4 rounded">
              <summary className="cursor-pointer font-mono text-sm text-green-400">
                Raw JSON Response
              </summary>
              <pre className="mt-4 text-xs whitespace-pre-wrap overflow-auto max-h-64">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
