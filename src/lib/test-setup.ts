/**
 * Test Setup for Next.js Integration Tests
 * Creates test users, questions, and validates new profile endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TestUser {
  id: string;
  email: string;
  token: string;
  role: "admin" | "question_creator" | "user";
}

export interface TestQuestion {
  question_id: string;
  question_text: string;
  category: string;
  entry_cost: number;
  closing_time: string;
  initial_probability: number;
}

export interface TestPrediction {
  success: boolean;
  message: string;
  shares_received: number;
  avg_entry_price: number;
  yes_pool: number;
  no_pool: number;
  yes_percent: number;
  no_percent: number;
}

/**
 * Create a test user via local auth (no Bubble dependency)
 */
export async function createTestUser(email: string, password: string = "password123"): Promise<TestUser> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create user: ${error}`);
  }

  const data = (await res.json()) as {
    success: boolean;
    token: string;
    user: { id: string; email: string; role: string };
  };

  return {
    id: data.user.id,
    email: data.user.email,
    token: data.token,
    role: data.user.role as "admin" | "question_creator" | "user",
  };
}

/**
 * Promote a user to question_creator role (requires admin token)
 */
export async function promoteUserToCreator(
  adminToken: string,
  userIdToPromote: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/admin/promote_user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ user_id: userIdToPromote, target_role: "question_creator" }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to promote user: ${error}`);
  }

  return (await res.json()) as { success: boolean };
}

/**
 * Create a test question
 */
export async function createTestQuestion(
  creatorToken: string,
  override?: Partial<TestQuestion>,
): Promise<TestQuestion> {
  const now = new Date();
  const closingTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const payload = {
    question_text: "Will this test question outcome be YES?",
    category: "Test",
    entry_cost: 100,
    closing_time: closingTime.toISOString(),
    initial_probability: 0.55,
    ...override,
  };

  const res = await fetch(`${API_BASE_URL}/admin/create_question`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creatorToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create question: ${error}`);
  }

  const data = (await res.json()) as {
    success: boolean;
    question_id: string;
    question_text: string;
    category: string;
    entry_cost: number;
    closing_time: string;
    initial_probability: number;
  };

  return {
    question_id: data.question_id,
    question_text: data.question_text,
    category: data.category,
    entry_cost: data.entry_cost,
    closing_time: data.closing_time,
    initial_probability: data.initial_probability,
  };
}

/**
 * Place a prediction for a user
 */
export async function placePrediction(
  userToken: string,
  questionId: string,
  answer: "yes" | "no",
  pointsToSpend: number,
): Promise<TestPrediction> {
  const res = await fetch(`${API_BASE_URL}/place_prediction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      question_id: questionId,
      answer,
      points_to_spend: pointsToSpend,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to place prediction: ${error}`);
  }

  return (await res.json()) as TestPrediction;
}

/**
 * Fetch user profile positions via new endpoint
 */
export async function fetchProfilePositions(userId: string) {
  const res = await fetch(`${API_BASE_URL}/profile_positions/${userId}`);

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch positions: ${error}`);
  }

  return (await res.json()) as {
    success: boolean;
    open_positions_count: number;
    total_points_at_risk: number;
    total_current_value: number;
    total_unrealized_pnl: number;
    positions: Array<{
      question_id: string;
      answer: string;
      shares: number;
      entry_price: number;
      current_price: number;
      position_value: number;
      unrealized_pnl: number;
    }>;
  };
}

/**
 * Fetch user intelligence metrics via new endpoint
 */
export async function fetchProfileIntelligence(userId: string) {
  const res = await fetch(`${API_BASE_URL}/profile_intelligence/${userId}`);

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch intelligence: ${error}`);
  }

  return (await res.json()) as {
    success: boolean;
    average_conviction_percent: number;
    average_edge_percent: number;
    weighted_edge_percent: number;
    best_edge_percent: number;
    worst_edge_percent: number;
  };
}

/**
 * Fetch complete profile overview
 */
export async function fetchProfileOverview(userId: string) {
  const res = await fetch(`${API_BASE_URL}/profile_overview/${userId}`);

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch overview: ${error}`);
  }

  return (await res.json()) as {
    success: boolean;
    user_id: string;
    profile: Record<string, unknown>;
    positions: Record<string, unknown>;
    intelligence: Record<string, unknown>;
  };
}
