import { DEMO_USER_ID, MOCK_HISTORY, MOCK_LEADERBOARD, MOCK_PROFILE, MOCK_QUESTIONS, MOCK_USER_PREDICTIONS } from "./mockData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export type FeedQuestion = {
  _id: string;
  title: string;
  category: string;
  yes_percent: number;
  no_percent: number;
  yes_pool: number;
  no_pool: number;
  entry_cost: number;
  status: "open" | "closed" | "resolved";
  closing_time?: string;
  closes_label?: string;
};

export type LeaderboardRow = {
  _id: string;
  username: string;
  points_balance: number;
  points_earned_total: number;
  leaderboard_score: number;
  rank: number;
  period_label?: "weekly" | "monthly" | "quarterly" | "all";
  period_points_spent?: number;
  period_points_earned?: number;
  period_points_lost?: number;
  period_net_points?: number;
  period_correct_predictions?: number;
  period_incorrect_predictions?: number;
};

export type ProfilePayload = {
  success: boolean;
  _id: string;
  username: string;
  points_balance: number;
  points_earned_total: number;
  leaderboard_score: number;
  analyses_count: number;
  open_analyses_count: number;
  closed_analyses_count: number;
  correct_predictions: number;
  incorrect_predictions: number;
  yes_predictions_count: number;
  no_predictions_count: number;
  answered_questions_count: number;
  total_points_spent: number;
  gross_points_earned: number;
  total_points_lost: number;
  net_points: number;
};

export type HistoryPoint = {
  timestamp: string;
  yes_percent: number;
  no_percent: number;
  yes_pool: number;
  no_pool: number;
  event_type: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: "user" | "admin";
};

export type AuthResponse = {
  success: boolean;
  token: string;
  user: AuthUser;
};

export type UserPrediction = {
  _id: string;
  question_id: string;
  question_title?: string;
  question_status?: string;
  answer: "yes" | "no";
  points_used: number;
  points_earned: number;
  is_resolved: boolean;
  is_correct: boolean;
  created_at?: string;
};

export type UserPredictionsPayload = {
  success: boolean;
  total: number;
  open: UserPrediction[];
  closed: UserPrediction[];
};

export type PlacePredictionResult = {
  success: boolean;
  message: string;
  yes_pool: number;
  no_pool: number;
  yes_percent: number;
  no_percent: number;
  new_balance: number;
  points_used?: number;
  closure_reason?: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

function buildFallbackHistory(questionId: string): HistoryPoint[] {
  const question = MOCK_QUESTIONS.find((item) => item._id === questionId);

  if (!question) {
    return [];
  }

  const totalPool = Number(question.yes_pool || 0) + Number(question.no_pool || 0);
  const midYes = Math.max(0, Math.min(100, Number(question.yes_percent || 50) - 2.4));
  const earlyYes = Math.max(0, Math.min(100, midYes - 2.8));

  return [
    {
      timestamp: "2026-04-12T10:00:00Z",
      yes_percent: earlyYes,
      no_percent: 100 - earlyYes,
      yes_pool: Math.round(totalPool * 0.32),
      no_pool: Math.round(totalPool * 0.38),
      event_type: "initial",
    },
    {
      timestamp: "2026-04-14T10:00:00Z",
      yes_percent: midYes,
      no_percent: 100 - midYes,
      yes_pool: Math.round(totalPool * 0.44),
      no_pool: Math.round(totalPool * 0.46),
      event_type: "trade",
    },
    {
      timestamp: "2026-04-16T10:00:00Z",
      yes_percent: Number(question.yes_percent || 50),
      no_percent: Number(question.no_percent || 50),
      yes_pool: Number(question.yes_pool || 0),
      no_pool: Number(question.no_pool || 0),
      event_type: "trade",
    },
  ];
}

export async function fetchFeedQuestions(category?: string): Promise<FeedQuestion[]> {
  if (USE_MOCK_DATA) {
    if (!category || category === "All") {
      return MOCK_QUESTIONS;
    }
    return MOCK_QUESTIONS.filter((q) => q.category === category);
  }

  const params = new URLSearchParams({ limit: "50", status: "open" });
  if (category && category !== "All") {
    params.set("category", category);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/feed_questions?${params.toString()}`);
    const body = await parseJson<{ results: FeedQuestion[] }>(res);
    return body.results || [];
  } catch {
    if (!category || category === "All") {
      return MOCK_QUESTIONS;
    }
    return MOCK_QUESTIONS.filter((q) => q.category === category);
  }
}

export async function fetchLeaderboard(timeframe: "weekly" | "monthly" | "quarterly" | "all" = "weekly"): Promise<LeaderboardRow[]> {
  if (USE_MOCK_DATA) {
    return MOCK_LEADERBOARD;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/leaderboard?limit=25&timeframe=${timeframe}`);
    const body = await parseJson<{ results: LeaderboardRow[] }>(res);
    return body.results || [];
  } catch {
    return MOCK_LEADERBOARD;
  }
}

export async function fetchProfile(userId: string): Promise<ProfilePayload> {
  if (USE_MOCK_DATA || userId === DEMO_USER_ID) {
    return MOCK_PROFILE;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/profile/${userId}`);
    return parseJson<ProfilePayload>(res);
  } catch {
    return MOCK_PROFILE;
  }
}

export async function fetchQuestionHistory(
  questionId: string,
  timeframe: "hourly" | "daily" | "all" = "all",
): Promise<HistoryPoint[]> {
  if (USE_MOCK_DATA) {
    return MOCK_HISTORY[questionId] || buildFallbackHistory(questionId);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/question_history/${questionId}?timeframe=${timeframe}`);
    const body = await parseJson<{ results: HistoryPoint[] }>(res);
    return body.results?.length ? body.results : buildFallbackHistory(questionId);
  } catch {
    return MOCK_HISTORY[questionId] || buildFallbackHistory(questionId);
  }
}

export async function placePrediction(
  userId: string,
  questionId: string,
  answer: "yes" | "no",
  pointsToSpend: number,
): Promise<PlacePredictionResult> {
  if (USE_MOCK_DATA) {
    return {
      success: true,
      message: "Analysis submitted successfully",
      yes_pool: 0,
      no_pool: 0,
      yes_percent: 50,
      no_percent: 50,
      new_balance: 10000,
      points_used: pointsToSpend,
    };
  }

  const res = await fetch(`${API_BASE_URL}/place_prediction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      question_id: questionId,
      answer,
      points_to_spend: pointsToSpend,
    }),
  });

  return parseJson<PlacePredictionResult>(res);
}

export async function fetchUserPredictions(userId: string): Promise<UserPredictionsPayload> {
  if (USE_MOCK_DATA) {
    return MOCK_USER_PREDICTIONS;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/user_predictions/${userId}`);
    return parseJson<UserPredictionsPayload>(res);
  } catch {
    return { success: false, total: 0, open: [], closed: [] };
  }
}

export async function signup(params: {
  email: string;
  password: string;
  role?: "user" | "admin";
  signup_code?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJson<AuthResponse>(res);
}

export async function login(params: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJson<AuthResponse>(res);
}

export async function me(token: string): Promise<{ success: boolean; user: AuthUser }> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseJson<{ success: boolean; user: AuthUser }>(res);
}
