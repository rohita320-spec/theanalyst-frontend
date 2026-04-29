"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../../components/AppHeader";
import { clearStoredAuthSession, fetchActiveLogoAssets, fetchMeProfileSummary, updateMeProfilePreferences, type ProfilePayload, type UserPrediction } from "../../lib/api";
import { buildLogoLibraryLookup, type LogoLibraryLookup } from "../../lib/marketPreview";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type QuestionGroup = {
  question_id: string;
  question_title: string;
  question_status?: string;
  question_logo_keys?: string[];
  predictions: UserPrediction[];
};

function groupByQuestion(predictions: UserPrediction[]): QuestionGroup[] {
  const map = new Map<string, QuestionGroup>();
  for (const p of predictions) {
    const key = p.question_id || p._id;
    if (!map.has(key)) {
      map.set(key, {
        question_id: key,
        question_title: p.question_title || key,
        question_status: p.question_status,
        question_logo_keys: p.question_logo_keys || [],
        predictions: [],
      });
    }
    map.get(key)!.predictions.push(p);
  }
  return Array.from(map.values());
}

function QuestionLogoStack({ logoKeys, lookup }: { logoKeys?: string[]; lookup: LogoLibraryLookup | null }) {
  if (!logoKeys?.length || !lookup) return null;
  const urls = logoKeys.map((k) => lookup[k]?.url).filter(Boolean).slice(0, 2) as string[];
  if (!urls.length) return null;
  return (
    <div className="flex shrink-0 gap-1">
      {urls.map((url, i) => (
        <img key={i} src={url} alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" loading="lazy" referrerPolicy="no-referrer" />
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [openPredictions, setOpenPredictions] = useState<UserPrediction[]>([]);
  const [closedPredictions, setClosedPredictions] = useState<UserPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState("");
  const [username, setUsername] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [theme, setTheme] = useState<"dark" | "bright">("dark");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("app_theme");
      const normalized = savedTheme === "bright" ? "bright" : "dark";
      setTheme(normalized);
      document.documentElement.setAttribute("data-theme", normalized);
    } catch {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      let token = "";
      try {
        token = localStorage.getItem("auth_token") || "";
      } catch {
        token = "";
      }

      if (!token) {
        sessionStorage.setItem("auth_notice", JSON.stringify({ tone: "warning", message: "Please login to view your profile." }));
        window.location.href = "/";
        return;
      }

      if (token) {
        try {
          setAuthToken(token);
          const meData = await fetchMeProfileSummary(token);
          setProfile(meData.profile);
          setUsername(meData.profile.username || "");
          const nextTheme = meData.profile.theme_preference === "bright" ? "bright" : "dark";
          setTheme(nextTheme);
          document.documentElement.setAttribute("data-theme", nextTheme);
          localStorage.setItem("app_theme", nextTheme);
          setOpenPredictions(meData.predictions.open || []);
          setClosedPredictions(meData.predictions.closed || []);
          setLoading(false);
          return;
        } catch {
          clearStoredAuthSession("Your session expired. Please login again.");
          window.location.href = "/";
          return;
        }
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }
    setUsername(profile.username || "");
  }, [profile]);

  const saveProfilePreferences = async (nextTheme?: "dark" | "bright") => {
    const normalizedUsername = username.trim();
    const finalTheme = nextTheme || theme;
    if (!authToken) {
      setProfileMsg({ type: "error", text: "Please log in again to update your profile." });
      return;
    }
    if (!normalizedUsername) {
      setProfileMsg({ type: "error", text: "Username cannot be empty." });
      return;
    }

    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const result = await updateMeProfilePreferences(authToken, {
        username: normalizedUsername,
        theme_preference: finalTheme,
      });
      setProfile(result.profile);
      setTheme((result.user.theme_preference === "bright" ? "bright" : "dark"));
      document.documentElement.setAttribute("data-theme", result.user.theme_preference || "dark");
      localStorage.setItem("app_theme", result.user.theme_preference || "dark");
      localStorage.setItem("auth_user", JSON.stringify(result.user));
      setProfileMsg({ type: "success", text: result.message || "Profile updated." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setProfileMsg({ type: "error", text: msg });
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "bright" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("app_theme", nextTheme);
    await saveProfilePreferences(nextTheme);
  };

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("profile_avatar");
      if (saved) setAvatarDataUrl(saved);
    } catch { /* ignore */ }
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarDataUrl(result);
      try { localStorage.setItem("profile_avatar", result); } catch { /* ignore */ }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const [predictionTab, setPredictionTab] = useState<"open" | "closed">("open");
  const [logoLookup, setLogoLookup] = useState<LogoLibraryLookup | null>(null);
  // Track which question cards are expanded (by question_id)
  const [expandedLive, setExpandedLive] = useState<Set<string>>(new Set());
  const [expandedOpen, setExpandedOpen] = useState<Set<string>>(new Set());
  const [expandedClosed, setExpandedClosed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchActiveLogoAssets().then((assets) => setLogoLookup(buildLogoLibraryLookup(assets))).catch(() => {});
  }, []);

  function toggleSet(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }

  const openGroups = useMemo(() => groupByQuestion(openPredictions), [openPredictions]);
  const closedGroups = useMemo(() => groupByQuestion(closedPredictions), [closedPredictions]);

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="profile" pointsBalance={profile?.points_balance || 0} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {loading ? (
          <p className="text-sm text-slate-400">Loading profile...</p>
        ) : (
          <>
            {/* Hero */}
            <section className="mb-6 rounded-[2rem] border border-[var(--stroke)] bg-[var(--surface)] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="mb-4 inline-flex rounded-full bg-[var(--brand)]/15 px-4 py-2 text-sm font-semibold text-[var(--brand)]">
                    Analyst Profile
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--brand)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                        title="Change profile photo"
                      >
                        {avatarDataUrl ? (
                          <>
                            <img src={avatarDataUrl} alt="Avatar" className="h-full w-full object-cover" />
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 text-[10px] text-white font-medium">Change</span>
                          </>
                        ) : (
                          <>
                            <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-[var(--brand)]">
                              {(username || profile?.username || "?").charAt(0).toUpperCase()}
                            </span>
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 text-[10px] text-white font-medium">Add photo</span>
                          </>
                        )}
                      </button>
                      {!avatarDataUrl && (
                        <p className="text-[10px] text-slate-500">Tap to add</p>
                      )}
                      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-semibold text-white">@{username || profile?.username || "analyst"}</h2>
                      <p className="text-sm text-slate-400">
                        Answered {formatNumber(profile?.answered_questions_count || 0)} unique questions · net {formatNumber(profile?.net_points || 0)} pts
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Username</label>
                        <input
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setProfileMsg(null); }}
                          placeholder="Choose a username"
                          className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[var(--brand)] focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => saveProfilePreferences()}
                        disabled={savingProfile}
                        className="rounded-xl bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
                      >
                        {savingProfile ? "Saving..." : "Save Profile"}
                      </button>
                      {profileMsg && (
                        <p className={`mt-1 text-xs ${profileMsg.type === "success" ? "text-emerald-300" : "text-red-300"}`}>
                          {profileMsg.text}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Theme</p>
                      <button
                        onClick={toggleTheme}
                        disabled={savingProfile}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-sm text-white hover:border-[var(--brand)] disabled:opacity-60"
                        aria-label="Toggle theme"
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${theme === "dark" ? "bg-slate-300" : "bg-amber-300"}`} />
                        {theme === "dark" ? "Dark Theme" : "Bright Theme"}
                      </button>
                      <p className="mt-1 text-xs text-slate-500">This preference is saved to your account and applied on your next session.</p>
                      <div className="mt-4 rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] p-3 text-xs text-slate-300">
                        <p>Leaderboard eligibility: <span className="font-semibold text-white">{profile?.leaderboard_eligible ? "Eligible" : "Not eligible yet"}</span></p>
                        <p className="mt-1">Prediction count: <span className="font-semibold text-white">{profile?.prediction_count || 0}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="text-sm text-slate-400">Correct / Incorrect</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {profile?.correct_predictions || 0} / {profile?.incorrect_predictions || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="text-sm text-slate-400">Open / Closed</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {profile?.open_analyses_count || 0} / {profile?.closed_analyses_count || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="text-sm text-slate-400">Total Spent</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(profile?.total_points_spent || 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                      <p className="text-sm text-slate-400">Net Result</p>
                      <p className={`mt-2 text-2xl font-semibold ${Number(profile?.net_points || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {Number(profile?.net_points || 0) > 0 ? "+" : ""}{formatNumber(profile?.net_points || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="self-start rounded-3xl border border-[var(--stroke)] bg-[#0b1528] p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Performance Snapshot</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Points Balance</span>
                      <span className="font-semibold text-white">{formatNumber(profile?.points_balance || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Net Earned</span>
                      <span className={`font-semibold ${Number(profile?.points_earned_total || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {Number(profile?.points_earned_total || 0) > 0 ? "+" : ""}{formatNumber(profile?.points_earned_total || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">ROI</span>
                      <span className={`font-semibold ${(() => { const spent = Number(profile?.total_points_spent || 0); const net = Number(profile?.net_points || 0); return spent > 0 ? net / spent * 100 : 0; })() >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {(() => { const spent = Number(profile?.total_points_spent || 0); const net = Number(profile?.net_points || 0); if (!spent) return "—"; const roi = (net / spent) * 100; return `${roi > 0 ? "+" : ""}${roi.toFixed(1)}%`; })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Accuracy</span>
                      <span className="font-semibold text-white">
                        {profile && profile.closed_analyses_count > 0
                          ? `${Math.round((profile.correct_predictions / profile.closed_analyses_count) * 100)}%`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Points Lost</span>
                      <span className="font-semibold text-red-300">{formatNumber(profile?.total_points_lost || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Open / Closed</span>
                      <span className="font-semibold text-white">
                        {profile?.open_analyses_count || 0} / {profile?.closed_analyses_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Summary stats */}
            <section className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
                <p className="text-sm text-slate-400">Questions Answered</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatNumber(profile?.answered_questions_count || 0)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
                <p className="text-sm text-slate-400">Leaderboard Score</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatNumber(profile?.leaderboard_score || 0)}</p>
              </div>
            </section>

            {/* Live Positions — one collapsible card per question */}
            <section className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">Live Positions</h3>
                <span className="rounded-full bg-[var(--brand)]/15 px-3 py-1 text-xs font-medium text-[var(--brand)]">
                  {openGroups.length} {openGroups.length === 1 ? "question" : "questions"}
                </span>
              </div>

              {openGroups.length === 0 ? (
                <p className="text-sm text-slate-400">No active positions yet.</p>
              ) : (
                <div className="space-y-3">
                  {openGroups.map((group) => {
                    const isOpen = expandedLive.has(group.question_id);
                    const totalSpent = group.predictions.reduce((sum, p) => sum + Number(p.points_used || 0), 0);
                    return (
                      <div key={group.question_id} className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] overflow-hidden">
                        {/* Question header — click to toggle */}
                        <button
                          type="button"
                          onClick={() => setExpandedLive((s) => toggleSet(s, group.question_id))}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                        >
                          <QuestionLogoStack logoKeys={group.question_logo_keys} lookup={logoLookup} />
                          <span className="flex-1 text-sm font-semibold text-white leading-snug">{group.question_title}</span>
                          <span className="shrink-0 text-[11px] text-slate-400">{formatNumber(totalSpent)} pts</span>
                          <span className="shrink-0 text-[11px] text-slate-500 mr-1">{group.predictions.length} position{group.predictions.length !== 1 ? "s" : ""}</span>
                          <span className="shrink-0 text-xs text-slate-500">{isOpen ? "▲" : "▼"}</span>
                        </button>

                        {/* Expanded rows */}
                        {isOpen && (
                          <div className="border-t border-[var(--stroke)]/60 px-4 pb-3 pt-2 space-y-2">
                            {group.predictions.map((prediction) => (
                              <div key={prediction._id} className="rounded-xl bg-slate-800/40 px-3 py-2.5">
                                <div className="mb-2 flex items-center gap-2">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prediction.answer === "yes" ? "bg-[var(--brand)]/15 text-[var(--brand)]" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`}>
                                    {prediction.answer.toUpperCase()}
                                  </span>
                                  <span className="ml-auto text-xs text-slate-500">{formatDate(prediction.created_at)}</span>
                                </div>
                                <div className="grid gap-x-4 gap-y-1 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-5">
                                  <span>Points: <span className="font-semibold text-white">{formatNumber(prediction.points_used)}</span></span>
                                  <span>Entry %: <span className="font-semibold text-white">{Number(prediction.entry_probability_percent || 0).toFixed(2)}%</span></span>
                                  <span>Current %: <span className="font-semibold text-white">{Number(prediction.current_side_percent || 0).toFixed(2)}%</span></span>
                                  <span>Shares: <span className="font-semibold text-white">{Number(prediction.shares_bought || 0).toFixed(4)}</span></span>
                                  <span>Current Value: <span className="font-semibold text-white">{formatNumber(prediction.current_position_value || 0)}</span></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Predictions — tabbed: Open / Resolved, collapsible per question */}
            <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {([
                  { key: "open",   label: "Open Questions",     count: openGroups.length,   cls: predictionTab === "open"   ? "bg-[var(--brand)] text-white" : "bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20" },
                  { key: "closed", label: "Resolved Questions", count: closedGroups.length, cls: predictionTab === "closed" ? "bg-purple-500 text-white"      : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setPredictionTab(tab.key)}
                    className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab.cls}`}
                  >
                    {tab.label}
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">{tab.count}</span>
                  </button>
                ))}
              </div>

              {predictionTab === "open" && (
                openGroups.length === 0 ? (
                  <p className="text-sm text-slate-400">No active answers yet.</p>
                ) : (
                  <div className="space-y-3">
                    {openGroups.map((group) => {
                      const isOpen = expandedOpen.has(group.question_id);
                      const totalSpent = group.predictions.reduce((sum, p) => sum + Number(p.points_used || 0), 0);
                      return (
                        <div key={group.question_id} className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedOpen((s) => toggleSet(s, group.question_id))}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                          >
                            <QuestionLogoStack logoKeys={group.question_logo_keys} lookup={logoLookup} />
                            <span className="flex-1 text-sm font-semibold text-white leading-snug">{group.question_title}</span>
                            <span className="shrink-0 text-[11px] text-slate-400">{formatNumber(totalSpent)} pts</span>
                            <span className="shrink-0 text-[11px] text-slate-500 mr-1">{group.predictions.length} position{group.predictions.length !== 1 ? "s" : ""}</span>
                            <span className="shrink-0 text-xs text-slate-500">{isOpen ? "▲" : "▼"}</span>
                          </button>
                          {isOpen && (
                            <div className="border-t border-[var(--stroke)]/60 px-4 pb-3 pt-2 space-y-2">
                              {group.predictions.map((prediction) => (
                                <div key={prediction._id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800/40 px-3 py-2.5 text-sm">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prediction.answer === "yes" ? "bg-[var(--brand)]/15 text-[var(--brand)]" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`}>
                                    {prediction.answer.toUpperCase()}
                                  </span>
                                  <span className="text-slate-300">Spent: <span className="font-semibold text-white">{formatNumber(prediction.points_used)}</span></span>
                                  {prediction.created_at && <span className="ml-auto text-xs text-slate-500">{formatDate(prediction.created_at)}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {predictionTab === "closed" && (
                closedGroups.length === 0 ? (
                  <p className="text-sm text-slate-400">No resolved answers yet.</p>
                ) : (
                  <div className="space-y-3">
                    {closedGroups.map((group) => {
                      const isOpen = expandedClosed.has(group.question_id);
                      const totalSpent = group.predictions.reduce((sum, p) => sum + Number(p.points_used || 0), 0);
                      const totalEarned = group.predictions.reduce((sum, p) => sum + Number(p.points_earned || 0), 0);
                      const netResult = totalEarned - totalSpent;
                      return (
                        <div key={group.question_id} className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedClosed((s) => toggleSet(s, group.question_id))}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                          >
                            <QuestionLogoStack logoKeys={group.question_logo_keys} lookup={logoLookup} />
                            <span className="flex-1 text-sm font-semibold text-white leading-snug">{group.question_title}</span>
                            <span className="shrink-0 text-[11px] text-slate-400">{formatNumber(totalSpent)} pts spent</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${netResult >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{netResult > 0 ? "+" : ""}{formatNumber(netResult)}</span>
                            <span className="shrink-0 text-xs text-slate-500">{isOpen ? "▲" : "▼"}</span>
                          </button>
                          {isOpen && (
                            <div className="border-t border-[var(--stroke)]/60 px-4 pb-3 pt-2 space-y-2">
                              {group.predictions.map((prediction) => {
                                const netResult = Number(prediction.points_earned || 0) - Number(prediction.points_used || 0);
                                return (
                                  <div key={prediction._id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800/40 px-3 py-2.5 text-sm">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prediction.answer === "yes" ? "bg-[var(--brand)]/15 text-[var(--brand)]" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`}>
                                      {prediction.answer.toUpperCase()}
                                    </span>
                                    <span className="text-slate-300">Spent: <span className="font-semibold text-white">{formatNumber(prediction.points_used)}</span></span>
                                    <span className="text-slate-300">Earned: <span className="font-semibold text-white">{formatNumber(prediction.points_earned)}</span></span>
                                    <span className="text-slate-300">Net: <span className={`font-semibold ${netResult >= 0 ? "text-emerald-300" : "text-red-300"}`}>{netResult > 0 ? "+" : ""}{formatNumber(netResult)}</span></span>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prediction.is_correct ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-400"}`}>
                                      {prediction.is_correct ? "Correct" : "Incorrect"}
                                    </span>
                                    {prediction.created_at && <span className="ml-auto text-xs text-slate-500">{formatDate(prediction.created_at)}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

