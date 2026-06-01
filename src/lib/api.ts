import { DEMO_USER_ID, MOCK_HISTORY, MOCK_LEADERBOARD, MOCK_LOGOS, MOCK_PROFILE, MOCK_QUESTIONS, MOCK_USER_PREDICTIONS } from "./mockData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function resolveLogoImageUrl(imageUrl: string | null | undefined): string {
  const raw = String(imageUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${API_BASE_URL}${raw}`;
  return raw;
}

export type FeedQuestion = {
  _id: string;
  title: string;
  category: string;
  yes_percent: number;
  no_percent: number;
  initial_yes_percent?: number;
  initial_no_percent?: number;
  yes_pool: number;
  no_pool: number;
  total_yes_shares?: number;
  total_no_shares?: number;
  entry_cost: number;
  status: "open" | "closed" | "resolved" | "pending_approval";
  closed_reason?: "time_closed" | "admin_closed" | "cancelled" | string | null;
  closing_time?: string;
  closes_label?: string;
  resolution_rules?: string | null;
  created_by_email?: string;
  logo_keys?: string[];
  pending_logo_ids?: string[];
  metadata?: Record<string, unknown> | null;
  analysis_counts?: Record<string, number> | null;
};

export type LogoAsset = {
  _id: string;
  id: string;
  logo_key: string;
  display_name: string;
  category: string;
  image_url: string;
  source_type?: "upload" | "url" | "manual";
  source_url?: string | null;
  mime_type?: string | null;
  byte_size?: number | null;
  uploaded_by_user_id?: string | null;
  approved_by_admin_id?: string | null;
  linked_question_id?: string | null;
  status: "pending_approval" | "active" | "rejected" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export type LeaderboardRow = {
  _id: string;
  username: string;
  points_balance: number;
  points_earned_total: number;
  leaderboard_score: number;
  rank: number;
  prediction_count?: number;
  period_label?: "weekly" | "monthly" | "quarterly" | "all";
  period_points_spent?: number;
  period_resolved_points_spent?: number;
  period_points_earned?: number;
  period_points_lost?: number;
  period_points_refunded?: number;
  period_net_points?: number;
  period_roi_percent?: number;
  period_correct_predictions?: number;
  period_incorrect_predictions?: number;
  period_refunded_predictions?: number;
};

export type ProfilePayload = {
  success: boolean;
  _id: string;
  username: string;
  theme_preference?: "dark" | "bright";
  leaderboard_eligible?: boolean;
  prediction_count?: number;
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
  role: "user" | "admin" | "question_creator" | "question_creator_resolver";
  username?: string;
  theme_preference?: "dark" | "bright";
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
  question_logo_keys?: string[];
  answer: "yes" | "no";
  points_used: number;
  points_earned: number;
  shares_bought?: number;
  entry_price?: number;
  entry_probability_percent?: number;
  current_yes_percent?: number;
  current_no_percent?: number;
  current_side_percent?: number;
  current_side_price?: number;
  current_position_value?: number;
  unrealized_pnl?: number;
  is_resolved: boolean;
  is_correct: boolean;
  analysis_type?: string | null;
  created_at?: string;
};

export type UserPredictionsPayload = {
  success: boolean;
  total: number;
  open: UserPrediction[];
  closed: UserPrediction[];
};

export type MeProfileSummaryPayload = {
  success: boolean;
  user_id: string;
  profile: ProfilePayload;
  predictions: UserPredictionsPayload;
};

export type UpdateProfilePreferencesResult = {
  success: boolean;
  message: string;
  user: AuthUser;
  profile: ProfilePayload;
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

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function clearStoredAuthSession(noticeMessage?: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  } catch {
    // Ignore storage failures.
  }

  if (noticeMessage) {
    try {
      sessionStorage.setItem(
        "auth_notice",
        JSON.stringify({ tone: "warning", message: noticeMessage }),
      );
    } catch {
      // Ignore notice storage failures.
    }
  }

  try {
    window.dispatchEvent(new Event("auth-changed"));
  } catch {
    // Ignore dispatch failures.
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `API request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as { detail?: string; message?: string };
      if (typeof body?.detail === "string" && body.detail.trim()) {
        message = body.detail;
      } else if (typeof body?.message === "string" && body.message.trim()) {
        message = body.message;
      }
    } catch {
      // ignore JSON parse failures and keep status-based message
    }
    throw new ApiError(res.status, message);
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

export async function fetchFeedQuestions(category?: string, status: string = "open"): Promise<FeedQuestion[]> {
  if (USE_MOCK_DATA) {
    if (!category || category === "All") {
      return MOCK_QUESTIONS;
    }
    return MOCK_QUESTIONS.filter((q) => q.category === category);
  }

  const params = new URLSearchParams({ limit: "100", status });
  if (category && category !== "All") {
    params.set("category", category);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/feed_questions?${params.toString()}`, {
      cache: "no-store",
    });
    const body = await parseJson<{ results: FeedQuestion[] }>(res);
    return body.results || [];
  } catch {
    if (!category || category === "All") {
      return MOCK_QUESTIONS;
    }
    return MOCK_QUESTIONS.filter((q) => q.category === category);
  }
}

export async function fetchActiveLogoAssets(): Promise<LogoAsset[]> {
  if (USE_MOCK_DATA) {
    return MOCK_LOGOS;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/logos/active`, {
      cache: "no-store",
    });
    const body = await parseJson<{ results: LogoAsset[] }>(res);
    return body.results || [];
  } catch {
    return [];
  }
}

export async function fetchLeaderboard(timeframe: "weekly" | "monthly" | "quarterly" | "all" = "weekly"): Promise<LeaderboardRow[]> {
  if (USE_MOCK_DATA) {
    return MOCK_LEADERBOARD;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/leaderboard?limit=25&timeframe=${timeframe}`, {
      cache: "no-store",
    });
    const body = await parseJson<{ results: LeaderboardRow[] }>(res);
    return body.results || [];
  } catch {
    return [];
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
  token: string,
  questionId: string,
  answer: "yes" | "no",
  pointsToSpend: number,
  analysisType?: string | null,
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
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({
      question_id: questionId,
      answer,
      points_to_spend: pointsToSpend,
      ...(analysisType ? { analysis_type: analysisType } : {}),
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
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  return parseJson<AuthResponse>(res);
}

export async function login(params: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  return parseJson<AuthResponse>(res);
}

export async function me(token?: string): Promise<{ success: boolean; user: AuthUser }> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  return parseJson<{ success: boolean; user: AuthUser }>(res);
}

export async function logout(token?: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  return parseJson<{ success: boolean }>(res);
}

export async function fetchMeProfileSummary(token?: string): Promise<MeProfileSummaryPayload> {
  if (USE_MOCK_DATA) {
    return {
      success: true,
      user_id: DEMO_USER_ID,
      profile: MOCK_PROFILE,
      predictions: MOCK_USER_PREDICTIONS,
    };
  }

  const res = await fetch(`${API_BASE_URL}/me/profile_summary`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
    credentials: "include",
  });
  return parseJson<MeProfileSummaryPayload>(res);
}

export async function updateMeProfilePreferences(
  token: string,
  payload: { username?: string; theme_preference?: "dark" | "bright" },
): Promise<UpdateProfilePreferencesResult> {
  const res = await fetch(`${API_BASE_URL}/me/profile_preferences`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseJson<UpdateProfilePreferencesResult>(res);
}
