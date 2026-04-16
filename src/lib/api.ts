import { DEMO_USER_ID, MOCK_HISTORY, MOCK_LEADERBOARD, MOCK_PROFILE, MOCK_QUESTIONS } from "./mockData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export type FeedQuestion = {
  _id: string;
  title: string;
  category: string;
  yes_percent: number;
  no_percent: number;
  yes_pool: number;
  no_pool: number;
  entry_cost: number;
  status: "open" | "closed";
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
};

export type HistoryPoint = {
  timestamp: string;
  yes_percent: number;
  no_percent: number;
  yes_pool: number;
  no_pool: number;
  event_type: string;
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

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  if (USE_MOCK_DATA) {
    return MOCK_LEADERBOARD;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/leaderboard?limit=25`);
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

export async function fetchQuestionHistory(questionId: string): Promise<HistoryPoint[]> {
  if (USE_MOCK_DATA) {
    return MOCK_HISTORY[questionId] || buildFallbackHistory(questionId);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/question_history/${questionId}`);
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
) {
  if (USE_MOCK_DATA) {
    return {
      success: true,
      message: "Analysis submitted successfully",
      question_id: questionId,
      answer,
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

  return parseJson<Record<string, unknown>>(res);
}
