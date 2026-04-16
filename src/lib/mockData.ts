import type { FeedQuestion, HistoryPoint, LeaderboardRow, ProfilePayload } from "./api";

export const DEMO_USER_ID = "1775927339196x936402878588595800";

export const MOCK_QUESTIONS: FeedQuestion[] = [
  {
    _id: "q-1",
    title: "Will QQQ close below 600 by 30 April?",
    category: "Markets",
    yes_percent: 51.71,
    no_percent: 48.29,
    yes_pool: 1500,
    no_pool: 1400,
    entry_cost: 500,
    status: "open",
    closes_label: "Closes 4/30/26",
  },
  {
    _id: "q-2",
    title: "Will gold close above $5000/oz by 30 April?",
    category: "Markets",
    yes_percent: 49.45,
    no_percent: 50.55,
    yes_pool: 1200,
    no_pool: 1300,
    entry_cost: 300,
    status: "open",
    closes_label: "Closes 4/30/26",
  },
  {
    _id: "q-3",
    title: "Will BTC reach $100k before year-end?",
    category: "Crypto",
    yes_percent: 54.2,
    no_percent: 45.8,
    yes_pool: 2200,
    no_pool: 1600,
    entry_cost: 500,
    status: "open",
    closes_label: "Closes 12/31/26",
  },
  {
    _id: "q-4",
    title: "Will inflation trend lower in Q3 2026?",
    category: "Economy",
    yes_percent: 61.1,
    no_percent: 38.9,
    yes_pool: 1700,
    no_pool: 1000,
    entry_cost: 400,
    status: "open",
    closes_label: "Closes 8/30/26",
  },
  {
    _id: "q-5",
    title: "Will India CPI print below 4.5 in May release?",
    category: "Economy",
    yes_percent: 44.7,
    no_percent: 55.3,
    yes_pool: 980,
    no_pool: 1210,
    entry_cost: 250,
    status: "open",
    closes_label: "Closes 5/31/26",
  },
];

export const MOCK_LEADERBOARD: LeaderboardRow[] = [
  {
    _id: "u-1",
    username: "macrolens",
    points_balance: 14550,
    points_earned_total: 4280,
    leaderboard_score: 4280,
    rank: 1,
  },
  {
    _id: "u-2",
    username: "chart_alpha",
    points_balance: 12620,
    points_earned_total: 3910,
    leaderboard_score: 3910,
    rank: 2,
  },
  {
    _id: "u-3",
    username: "signalroom",
    points_balance: 11890,
    points_earned_total: 3420,
    leaderboard_score: 3420,
    rank: 3,
  },
  {
    _id: DEMO_USER_ID,
    username: "test11",
    points_balance: 10794.86,
    points_earned_total: 1250,
    leaderboard_score: 1250,
    rank: 7,
  },
];

export const MOCK_PROFILE: ProfilePayload = {
  success: true,
  _id: DEMO_USER_ID,
  username: "test11",
  points_balance: 10794.86,
  points_earned_total: 1250,
  leaderboard_score: 1250,
  analyses_count: 27,
  open_analyses_count: 11,
};

export const MOCK_HISTORY: Record<string, HistoryPoint[]> = {
  "q-1": [
    { timestamp: "2026-04-14T10:00:00Z", yes_percent: 47, no_percent: 53, yes_pool: 900, no_pool: 1000, event_type: "initial" },
    { timestamp: "2026-04-15T10:00:00Z", yes_percent: 49.2, no_percent: 50.8, yes_pool: 1180, no_pool: 1220, event_type: "trade" },
    { timestamp: "2026-04-16T10:00:00Z", yes_percent: 51.71, no_percent: 48.29, yes_pool: 1500, no_pool: 1400, event_type: "trade" },
  ],
  "q-2": [
    { timestamp: "2026-04-12T10:00:00Z", yes_percent: 50, no_percent: 50, yes_pool: 600, no_pool: 600, event_type: "initial" },
    { timestamp: "2026-04-14T10:00:00Z", yes_percent: 48.7, no_percent: 51.3, yes_pool: 900, no_pool: 1000, event_type: "trade" },
    { timestamp: "2026-04-16T10:00:00Z", yes_percent: 49.45, no_percent: 50.55, yes_pool: 1200, no_pool: 1300, event_type: "trade" },
  ],
  "q-3": [
    { timestamp: "2026-04-10T10:00:00Z", yes_percent: 46.2, no_percent: 53.8, yes_pool: 1100, no_pool: 1400, event_type: "initial" },
    { timestamp: "2026-04-13T10:00:00Z", yes_percent: 50.4, no_percent: 49.6, yes_pool: 1650, no_pool: 1630, event_type: "trade" },
    { timestamp: "2026-04-16T10:00:00Z", yes_percent: 54.2, no_percent: 45.8, yes_pool: 2200, no_pool: 1600, event_type: "trade" },
  ],
  "q-4": [
    { timestamp: "2026-04-09T10:00:00Z", yes_percent: 52.4, no_percent: 47.6, yes_pool: 900, no_pool: 820, event_type: "initial" },
    { timestamp: "2026-04-12T10:00:00Z", yes_percent: 57.8, no_percent: 42.2, yes_pool: 1320, no_pool: 960, event_type: "trade" },
    { timestamp: "2026-04-16T10:00:00Z", yes_percent: 61.1, no_percent: 38.9, yes_pool: 1700, no_pool: 1000, event_type: "trade" },
  ],
  "q-5": [
    { timestamp: "2026-04-11T10:00:00Z", yes_percent: 49.8, no_percent: 50.2, yes_pool: 700, no_pool: 705, event_type: "initial" },
    { timestamp: "2026-04-14T10:00:00Z", yes_percent: 46.1, no_percent: 53.9, yes_pool: 860, no_pool: 1010, event_type: "trade" },
    { timestamp: "2026-04-16T10:00:00Z", yes_percent: 44.7, no_percent: 55.3, yes_pool: 980, no_pool: 1210, event_type: "trade" },
  ],
};
