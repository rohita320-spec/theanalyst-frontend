"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import AppHeader from "../../components/AppHeader";
import { clearStoredAuthSession, fetchActiveLogoAssets, fetchMeProfileSummary, updateMeProfilePreferences, type ProfilePayload, type UserPrediction } from "../../lib/api";
import { buildLogoLibraryLookup, type LogoLibraryLookup } from "../../lib/marketPreview";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
  const [editOpen, setEditOpen] = useState(false);

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [predictionTab, setPredictionTab] = useState<"open" | "closed">("open");
  const [logoLookup, setLogoLookup] = useState<LogoLibraryLookup | null>(null);
  const [expandedOpen, setExpandedOpen] = useState<Set<string>>(new Set());
  const [expandedClosed, setExpandedClosed] = useState<Set<string>>(new Set());

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
      try {
        setAuthToken(token);
        const meData = await fetchMeProfileSummary(token);
        setProfile(meData.profile);
        setUsername(meData.profile.username || "");
        // Theme is owned by the header now; just sync the saved preference so it persists.
        const nextTheme = meData.profile.theme_preference === "bright" ? "bright" : "dark";
        document.documentElement.setAttribute("data-theme", nextTheme);
        try { localStorage.setItem("app_theme", nextTheme); } catch { /* ignore */ }
        setOpenPredictions(meData.predictions.open || []);
        setClosedPredictions(meData.predictions.closed || []);
        setLoading(false);
      } catch {
        clearStoredAuthSession("Your session expired. Please login again.");
        window.location.href = "/";
      }
    };
    load();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("profile_avatar");
      if (saved) setAvatarDataUrl(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchActiveLogoAssets().then((assets) => setLogoLookup(buildLogoLibraryLookup(assets))).catch(() => {});
  }, []);

  const saveProfilePreferences = async () => {
    const normalizedUsername = username.trim();
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
      let currentTheme: "dark" | "bright" = "dark";
      try { currentTheme = localStorage.getItem("app_theme") === "bright" ? "bright" : "dark"; } catch { /* ignore */ }
      const result = await updateMeProfilePreferences(authToken, { username: normalizedUsername, theme_preference: currentTheme });
      setProfile(result.profile);
      try { localStorage.setItem("auth_user", JSON.stringify(result.user)); } catch { /* ignore */ }
      setProfileMsg({ type: "success", text: result.message || "Profile updated." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  function toggleSet(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }

  function handleCursorGlowMove(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    button.style.setProperty("--cursor-x", `${event.clientX - rect.left}px`);
    button.style.setProperty("--cursor-y", `${event.clientY - rect.top}px`);
  }

  const openGroups = useMemo(() => groupByQuestion(openPredictions), [openPredictions]);
  const closedGroups = useMemo(() => groupByQuestion(closedPredictions), [closedPredictions]);

  const correct = Number(profile?.correct_predictions || 0);
  const incorrect = Number(profile?.incorrect_predictions || 0);
  const resolvedCount = correct + incorrect;
  const accuracy = resolvedCount > 0 ? Math.round((correct / resolvedCount) * 100) : null;
  const net = Number(profile?.net_points || 0);
  const spent = Number(profile?.total_points_spent || 0);
  const roi = spent > 0 ? (net / spent) * 100 : 0;
  const roiW = (Math.min(Math.abs(roi), 100) / 100) * 50;
  const roiOver = roi > 100;

  const detailStats: { l: string; v: string; c?: string }[] = [
    { l: "Net", v: `${net > 0 ? "+" : ""}${formatNumber(net)}`, c: net >= 0 ? "text-emerald-300" : "text-red-300" },
    { l: "Points balance", v: formatNumber(profile?.points_balance || 0) },
    { l: "Correct / Incorrect", v: `${correct} / ${incorrect}` },
    { l: "Points used", v: formatNumber(spent) },
    { l: "All-time earned", v: formatNumber(profile?.points_earned_total || 0) },
    { l: "Points lost", v: formatNumber(profile?.total_points_lost || 0) },
    { l: "Leaderboard score", v: formatNumber(profile?.leaderboard_score || 0) },
    { l: "Questions answered", v: formatNumber(profile?.answered_questions_count || 0) },
    { l: "Eligibility", v: profile?.leaderboard_eligible ? "Eligible" : "Not yet", c: profile?.leaderboard_eligible ? "text-emerald-300" : "text-slate-300" },
  ];

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader active="profile" pointsBalance={profile?.points_balance || 0} />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl border border-[var(--stroke)] bg-[var(--surface)]" />
            <div className="h-64 animate-pulse rounded-2xl border border-[var(--stroke)] bg-[var(--surface)]" />
            <div className="h-48 animate-pulse rounded-2xl border border-[var(--stroke)] bg-[var(--surface)]" />
          </div>
        ) : (
          <>
            {/* Identity + collapsible Edit profile */}
            <section className="mb-5 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--brand)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                  title="Change profile photo"
                >
                  {avatarDataUrl ? (
                    <>
                      <img src={avatarDataUrl} alt="Avatar" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">Change</span>
                    </>
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--brand)]">
                      {(username || profile?.username || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-2xl font-bold text-white sm:text-3xl">@{username || profile?.username || "analyst"}</h2>
                  <p className="mt-1 text-sm text-slate-400">Analyst · {formatNumber(profile?.answered_questions_count || 0)} questions answered</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditOpen((v) => !v)}
                  className="shrink-0 rounded-lg border border-[var(--brand)]/50 bg-[var(--brand)]/10 px-3.5 py-2 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--brand)]/20"
                >
                  Edit profile {editOpen ? "▴" : "▾"}
                </button>
              </div>

              {editOpen && (
                <div className="mt-5 border-t border-[var(--stroke)] pt-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Username</label>
                      <input
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); setProfileMsg(null); }}
                        placeholder="Choose a username"
                        className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[var(--brand)] focus:outline-none"
                      />
                      <button
                        onClick={saveProfilePreferences}
                        disabled={savingProfile}
                        className="mt-3 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
                      >
                        {savingProfile ? "Saving..." : "Save"}
                      </button>
                      {profileMsg && (
                        <p className={`mt-2 text-xs ${profileMsg.type === "success" ? "text-emerald-300" : "text-red-300"}`}>{profileMsg.text}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Profile photo</label>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-4 py-2 text-sm text-white hover:border-[var(--brand)]"
                      >
                        Upload a photo
                      </button>
                      <p className="mt-2 text-xs text-slate-500">Saved on this device for now. Theme lives in the top bar.</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Performance — single consolidated panel */}
            <section className="mb-5 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 sm:p-6">
              <h3 className="mb-4 flex items-center gap-2.5 text-xl font-semibold text-white">
                <span className="inline-block h-5 w-1 rounded-full bg-[var(--brand)]" />
                Performance
              </h3>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Accuracy{resolvedCount > 0 ? ` · ${resolvedCount} resolved` : ""}</p>
                  <p className="mt-1 text-3xl font-bold text-white">{accuracy === null ? "—" : `${accuracy}%`}</p>
                  <span className="mt-3 block h-2 overflow-hidden rounded-full bg-slate-600/20">
                    <span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${accuracy ?? 0}%` }} />
                  </span>
                </div>
                <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">ROI</p>
                  <p className={`mt-1 text-3xl font-bold ${roi >= 0 ? "text-[var(--brand)]" : "text-orange-300"}`}>{spent > 0 ? `${roi > 0 ? "+" : ""}${roi.toFixed(0)}%` : "—"}</p>
                  <span className="relative mt-3 block h-2 rounded-full bg-slate-600/20">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-slate-500/50" />
                    {roi >= 0 ? (
                      <span className="absolute inset-y-0 rounded-full bg-[var(--brand)]" style={{ left: "50%", width: `${roiW}%` }} />
                    ) : (
                      <span className="absolute inset-y-0 rounded-full bg-[var(--no)]" style={{ right: "50%", width: `${roiW}%` }} />
                    )}
                    {roiOver && <span className="absolute inset-y-0 right-0 w-1 rounded bg-[#9fd0ff]" />}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {detailStats.map((s) => (
                  <div key={s.l} className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3.5">
                    <p className="text-xs text-slate-500">{s.l}</p>
                    <p className={`mt-1 text-lg font-semibold ${s.c || "text-white"}`}>{s.v}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Positions — one area, Open / Resolved tabs */}
            <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 sm:p-6">
              <h3 className="mb-4 flex items-center gap-2.5 text-xl font-semibold text-white">
                <span className="inline-block h-5 w-1 rounded-full bg-[var(--brand)]" />
                Positions
              </h3>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {([
                  { key: "open", label: "Open", count: openGroups.length },
                  { key: "closed", label: "Resolved", count: closedGroups.length },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setPredictionTab(tab.key)}
                    onMouseMove={handleCursorGlowMove}
                    className={`cursor-glow-button flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      predictionTab === tab.key
                        ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)]"
                        : "border-[var(--stroke)] bg-[#0b1528] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span className="cursor-glow-layer" />
                    <span className="cursor-shimmer-layer" />
                    <span className="cursor-glow-content flex items-center gap-2">
                      {tab.label}
                      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-xs font-semibold">{tab.count}</span>
                    </span>
                  </button>
                ))}
              </div>

              {predictionTab === "open" && (
                openGroups.length === 0 ? (
                  <p className="text-sm text-slate-400">No active positions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {openGroups.map((group) => {
                      const isOpen = expandedOpen.has(group.question_id);
                      const totalUsed = group.predictions.reduce((sum, p) => sum + Number(p.points_used || 0), 0);
                      const totalValue = group.predictions.reduce((sum, p) => sum + Number(p.current_position_value || 0), 0);
                      const pnl = totalValue - totalUsed;
                      const mixed = new Set(group.predictions.map((p) => p.answer)).size > 1;
                      return (
                        <div key={group.question_id} className="overflow-hidden rounded-xl border border-[var(--stroke)] bg-[#0b1528]">
                          <button
                            type="button"
                            onClick={() => setExpandedOpen((s) => toggleSet(s, group.question_id))}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                          >
                            <QuestionLogoStack logoKeys={group.question_logo_keys} lookup={logoLookup} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-white">{group.question_title}</span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                                <span>Used <span className="font-semibold text-white">{formatNumber(totalUsed)}</span></span>
                                <span>Value <span className="font-semibold text-white">{formatNumber(totalValue)}</span></span>
                                <span>P&amp;L <span className={`font-semibold ${pnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>{pnl > 0 ? "+" : ""}{formatNumber(pnl)}</span></span>
                                {mixed && <span className="rounded-full bg-slate-600/40 px-1.5 py-0.5 text-[10px] text-slate-300">mixed YES/NO</span>}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-500">{group.predictions.length} trade{group.predictions.length !== 1 ? "s" : ""}</span>
                            <span className="shrink-0 text-xs text-[var(--brand)]">{isOpen ? "▲" : "▼"}</span>
                          </button>
                          {isOpen && (
                            <div className="space-y-2 border-t border-[var(--stroke)]/60 px-4 pb-3 pt-2">
                              {group.predictions.map((prediction) => {
                                const tPnl = prediction.unrealized_pnl != null
                                  ? Number(prediction.unrealized_pnl)
                                  : Number(prediction.current_position_value || 0) - Number(prediction.points_used || 0);
                                return (
                                  <div key={prediction._id} className="rounded-xl border border-[var(--stroke)]/60 bg-slate-800/40 px-3 py-2.5">
                                    <div className="mb-2 flex items-center gap-2">
                                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prediction.answer === "yes" ? "bg-[var(--yes)]/15 text-[var(--yes)]" : "bg-[var(--no)]/15 text-[var(--no)]"}`}>
                                        {prediction.answer.toUpperCase()}
                                      </span>
                                      <span className="text-[11px] text-slate-500">placed</span>
                                      <span className="ml-auto text-[11px] text-slate-500">{formatDateTime(prediction.created_at)}</span>
                                    </div>
                                    <div className="grid gap-x-4 gap-y-1.5 text-[11px] text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                                      <span>Amount <span className="block font-semibold text-white">{formatNumber(prediction.points_used)}</span></span>
                                      <span>Entry rate <span className="block font-semibold text-white">{Number(prediction.entry_probability_percent || 0).toFixed(2)}%</span></span>
                                      <span>Now · shares <span className="block font-semibold text-white">{Number(prediction.current_side_percent || 0).toFixed(1)}% · {Number(prediction.shares_bought || 0).toFixed(2)}</span></span>
                                      <span>Value · P&amp;L <span className={`block font-semibold ${tPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatNumber(prediction.current_position_value || 0)} · {tPnl > 0 ? "+" : ""}{formatNumber(tPnl)}</span></span>
                                    </div>
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

              {predictionTab === "closed" && (
                closedGroups.length === 0 ? (
                  <p className="text-sm text-slate-400">No resolved positions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {closedGroups.map((group) => {
                      const isOpen = expandedClosed.has(group.question_id);
                      const totalUsed = group.predictions.reduce((sum, p) => sum + Number(p.points_used || 0), 0);
                      const totalEarned = group.predictions.reduce((sum, p) => sum + Number(p.points_earned || 0), 0);
                      const netResult = totalEarned - totalUsed;
                      return (
                        <div key={group.question_id} className="overflow-hidden rounded-xl border border-[var(--stroke)] bg-[#0b1528]">
                          <button
                            type="button"
                            onClick={() => setExpandedClosed((s) => toggleSet(s, group.question_id))}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                          >
                            <QuestionLogoStack logoKeys={group.question_logo_keys} lookup={logoLookup} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-white">{group.question_title}</span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                                <span>Used <span className="font-semibold text-white">{formatNumber(totalUsed)}</span></span>
                                <span>Earned <span className="font-semibold text-white">{formatNumber(totalEarned)}</span></span>
                                <span>Net <span className={`font-semibold ${netResult >= 0 ? "text-emerald-300" : "text-red-300"}`}>{netResult > 0 ? "+" : ""}{formatNumber(netResult)}</span></span>
                              </span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${netResult >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{netResult >= 0 ? "Won" : "Lost"}</span>
                            <span className="shrink-0 text-[11px] text-slate-500">{group.predictions.length} trade{group.predictions.length !== 1 ? "s" : ""}</span>
                            <span className="shrink-0 text-xs text-[var(--brand)]">{isOpen ? "▲" : "▼"}</span>
                          </button>
                          {isOpen && (
                            <div className="space-y-2 border-t border-[var(--stroke)]/60 px-4 pb-3 pt-2">
                              {group.predictions.map((prediction) => {
                                const pn = Number(prediction.points_earned || 0) - Number(prediction.points_used || 0);
                                return (
                                  <div key={prediction._id} className="rounded-xl border border-[var(--stroke)]/60 bg-slate-800/40 px-3 py-2.5">
                                    <div className="mb-2 flex items-center gap-2">
                                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${prediction.answer === "yes" ? "bg-[var(--yes)]/15 text-[var(--yes)]" : "bg-[var(--no)]/15 text-[var(--no)]"}`}>
                                        {prediction.answer.toUpperCase()}
                                      </span>
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${prediction.is_correct ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-400"}`}>
                                        {prediction.is_correct ? "Correct" : "Incorrect"}
                                      </span>
                                      <span className="ml-auto text-[11px] text-slate-500">{formatDateTime(prediction.created_at)}</span>
                                    </div>
                                    <div className="grid gap-x-4 gap-y-1.5 text-[11px] text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                                      <span>Amount <span className="block font-semibold text-white">{formatNumber(prediction.points_used)}</span></span>
                                      <span>Entry rate <span className="block font-semibold text-white">{Number(prediction.entry_probability_percent || 0).toFixed(2)}%</span></span>
                                      <span>Earned <span className="block font-semibold text-white">{formatNumber(prediction.points_earned)}</span></span>
                                      <span>Net <span className={`block font-semibold ${pn >= 0 ? "text-emerald-300" : "text-red-300"}`}>{pn > 0 ? "+" : ""}{formatNumber(pn)}</span></span>
                                    </div>
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
