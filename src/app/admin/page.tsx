"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { me, type FeedQuestion } from "../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AuthUserRow = { id: string; email: string; role: string; created_at?: string };
type Summary = {
  bubble_users_count: number;
  bubble_questions_count: number;
  auth_users_count: number;
  bubble_env: string;
  bubble_app_name: string;
  bubble_base_url: string;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminPage() {
  const [state, setState] = useState<"checking" | "allowed" | "forbidden">("checking");
  const [adminToken, setAdminToken] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [authUsers, setAuthUsers] = useState<AuthUserRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  // Questions state
  const [allQuestions, setAllQuestions] = useState<FeedQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<FeedQuestion | null>(null);
  const [resolving, setResolving] = useState<string>(""); // "yes"|"no"|"close"|""  
  const [resolveMsg, setResolveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Confirm resolve/close
  const [confirmResolve, setConfirmResolve] = useState<{ answer: "yes" | "no" | "close" } | null>(null);

  // Create question modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"form" | "confirm">("form");
  const [createQuestion, setCreateQuestion] = useState("");
  const [createCategory, setCreateCategory] = useState("General");
  const [createEntryCost, setCreateEntryCost] = useState("500");
  const [createClosingTime, setCreateClosingTime] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role change state
  const [roleModal, setRoleModal] = useState<{ userId: string; email: string; currentRole: string } | null>(null);
  const [targetRole, setTargetRole] = useState("admin");
  const [changingRole, setChangingRole] = useState(false);
  const [roleMsg, setRoleMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Legacy alias (used by refreshUsers below)
  const [adminMsg, setAdminMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) {
        setState("forbidden");
        setError("No session. Please login first.");
        return;
      }

      try {
        const result = await me(token);
        if (result.user.role !== "admin") {
          setState("forbidden");
          setError("Your account is not an admin. Login with an admin account.");
          return;
        }
        setAdminEmail(result.user.email || "");
        setAdminToken(token);
        setState("allowed");

        // Fetch admin data + questions in parallel
        const [usersRes, summaryRes, questionsRes] = await Promise.allSettled([
          fetch(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/admin/summary`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/feed_questions?limit=100&status=all`),
        ]);

        if (usersRes.status === "fulfilled" && usersRes.value.ok) {
          const body = await usersRes.value.json();
          setAuthUsers(body.users || []);
        }
        if (summaryRes.status === "fulfilled" && summaryRes.value.ok) {
          const body = await summaryRes.value.json();
          setSummary(body);
        }
        if (questionsRes.status === "fulfilled" && questionsRes.value.ok) {
          const body = await questionsRes.value.json();
          setAllQuestions(body.results || []);
        }
      } catch {
        setState("forbidden");
        setError("Session check failed. Please login again.");
      }
    };

    run();
  }, []);

  const refreshQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/feed_questions?limit=100&status=all`);
      if (res.ok) {
        const body = await res.json();
        setAllQuestions(body.results || []);
      }
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleResolve = async (questionId: string, answer: "yes" | "no" | "close") => {
    setConfirmResolve(null);
    setResolving(answer);
    setResolveMsg(null);
    try {
      if (answer === "close") {
        const res = await fetch(`${API_BASE}/admin/close_question`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ question_id: questionId }),
        });
        const body = await res.json();
        if (body.success) {
          setResolveMsg({ type: "success", text: "Question closed (no payout)." });
          await refreshQuestions();
          setSelectedQuestion(null);
        } else {
          setResolveMsg({ type: "error", text: body.detail || "Failed to close question." });
        }
      } else {
        const res = await fetch(`${API_BASE}/resolve_question`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ question_id: questionId, correct_answer: answer }),
        });
        const body = await res.json();
        if (body.success) {
          setResolveMsg({ type: "success", text: `Resolved as ${answer.toUpperCase()}. ${body.message || ""}` });
          await refreshQuestions();
          setSelectedQuestion(null);
        } else {
          setResolveMsg({ type: "error", text: body.message || "Failed to resolve question." });
        }
      }
    } catch {
      setResolveMsg({ type: "error", text: "Network error." });
    } finally {
      setResolving("");
    }
  };

  const handleCreateQuestion = async () => {
    if (!createQuestion.trim()) { setCreateMsg({ type: "error", text: "Question text is required." }); return; }
    if (!createClosingTime) { setCreateMsg({ type: "error", text: "Closing time is required." }); return; }
    const cost = parseFloat(createEntryCost);
    if (isNaN(cost) || cost < 50) { setCreateMsg({ type: "error", text: "Entry cost must be at least 50." }); return; }
    // Move to confirm step
    setCreateMsg(null);
    setCreateStep("confirm");
  };

  const handleCreateSubmit = async () => {
    const cost = parseFloat(createEntryCost);
    setCreateSubmitting(true);
    setCreateMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/create_question`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ question_text: createQuestion.trim(), category: createCategory, entry_cost: cost, closing_time: createClosingTime }),
      });
      const body = await res.json();
      if (body.success) {
        setCreateMsg({ type: "success", text: "Question created successfully!" });
        setCreateQuestion(""); setCreateClosingTime(""); setCreateEntryCost("500"); setCreateCategory("General"); setCreateStep("form");
        setTimeout(() => { setCreateModalOpen(false); setCreateMsg(null); refreshQuestions(); }, 1500);
      } else {
        setCreateMsg({ type: "error", text: body.detail || "Failed to create question." });
        setCreateStep("form");
      }
    } catch {
      setCreateMsg({ type: "error", text: "Network error creating question." });
      setCreateStep("form");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openRoleModal = (u: AuthUserRow) => {
    setRoleModal({ userId: u.id, email: u.email, currentRole: u.role });
    setTargetRole(u.role === "admin" ? "user" : "admin");
    setRoleMsg(null);
  };

  const handleRoleChange = async () => {
    if (!roleModal) return;
    setChangingRole(true);
    setRoleMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/promote_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ user_id: roleModal.userId, target_role: targetRole }),
      });
      const body = await res.json();
      if (body.success) {
        setRoleMsg({ type: "success", text: `✓ ${roleModal.email} is now ${body.user.role}.` });
        const usersRes = await fetch(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${adminToken}` } });
        if (usersRes.ok) { const ub = await usersRes.json(); setAuthUsers(ub.users || []); }
        setTimeout(() => { setRoleModal(null); setRoleMsg(null); }, 1500);
      } else {
        setRoleMsg({ type: "error", text: body.detail || "Failed to change role." });
      }
    } catch {
      setRoleMsg({ type: "error", text: "Network error." });
    } finally {
      setChangingRole(false);
    }
  };

  if (state === "checking") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4">
        <p className="text-sm text-slate-400">Checking access...</p>
      </main>
    );
  }

  if (state === "forbidden") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-red-500/30 bg-[var(--surface)] p-6">
          <h1 className="mb-2 text-xl font-semibold text-red-400">Access Denied</h1>
          <p className="text-sm text-slate-300">{error}</p>
          <Link href="/auth/login" className="mt-4 inline-block text-sm text-[var(--brand)] hover:underline">
            Go to Login →
          </Link>
        </div>
      </main>
    );
  }

  const openQuestions = allQuestions.filter((q) => q.status === "open");
  const closedQuestions = allQuestions.filter((q) => q.status === "closed");
  const resolvedQuestions = allQuestions.filter((q) => q.status === "resolved" || (q.status !== "open" && q.status !== "closed"));
  const now = new Date();

  const tierOptions = [
    { label: "Tier 1 — Starter", values: [50, 100, 200] },
    { label: "Tier 2 — Standard", values: [300, 400, 500] },
    { label: "Tier 3 — Premium", values: [600, 700, 800] },
  ];

  const roleBadge = (role: string) => {
    if (role === "admin") return "bg-[var(--brand)]/15 text-[var(--brand)]";
    if (role === "question_creator") return "bg-purple-500/15 text-purple-300";
    return "bg-slate-700/50 text-slate-300";
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs uppercase tracking-widest text-slate-500">The Analyst</p>
        <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-400">Signed in as <span className="text-[var(--brand)]">{adminEmail}</span></p>
      </div>

      {/* Summary cards */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Data Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Bubble Users" value={summary?.bubble_users_count ?? "—"} />
          <StatCard label="Open Questions" value={openQuestions.length} />
          <StatCard label="Resolved Questions" value={resolvedQuestions.length} />
          <StatCard label="Auth Accounts (local)" value={summary?.auth_users_count ?? authUsers.length} />
        </div>
      </section>

      {/* ─── Question Management ──────────────────────────── */}
      <section className="mb-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Question Management</h2>
          <button
            onClick={() => { setCreateModalOpen(true); setCreateStep("form"); setCreateMsg(null); }}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            + New Question
          </button>
        </div>

        {resolveMsg && (
          <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${resolveMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
            {resolveMsg.text}
          </div>
        )}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Open */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-sm font-medium text-slate-300">Open ({openQuestions.length})</p>
              <button onClick={refreshQuestions} className="ml-auto text-xs text-slate-500 hover:text-slate-300">
                {questionsLoading ? "..." : "↻ Refresh"}
              </button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {openQuestions.length === 0 && <p className="text-xs text-slate-500">No open questions.</p>}
              {openQuestions.map((q) => {
                const isPastClose = q.closing_time && new Date(q.closing_time) < now;
                return (
                  <button
                    key={q._id}
                    onClick={() => { setSelectedQuestion(q); setResolveMsg(null); setConfirmResolve(null); }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${selectedQuestion?._id === q._id ? "border-[var(--brand)] bg-[var(--brand)]/10 text-white" : "border-[var(--stroke)] bg-[#0b1528] text-slate-200 hover:border-slate-500"}`}
                  >
                    <p className="line-clamp-2 font-medium">{q.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Entry: {q.entry_cost} pts · Closes: {formatDate(q.closing_time ?? "")} · {q.category}
                    </p>
                    {isPastClose && (
                      <p className="mt-1 text-xs font-medium text-amber-400">⚠ Past closing time — analysis still possible</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Closed / Resolved */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <p className="text-sm font-medium text-slate-300">Closed / Resolved ({closedQuestions.length + resolvedQuestions.length})</p>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(closedQuestions.length + resolvedQuestions.length) === 0 && <p className="text-xs text-slate-500">None yet.</p>}
              {[...closedQuestions, ...resolvedQuestions].map((q) => (
                <button
                  key={q._id}
                  onClick={() => { setSelectedQuestion(q); setResolveMsg(null); setConfirmResolve(null); }}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${selectedQuestion?._id === q._id ? "border-[var(--brand)] bg-[var(--brand)]/10 text-white" : "border-[var(--stroke)] bg-[#0b1528] text-slate-300 hover:border-slate-500"}`}
                >
                  <p className="line-clamp-2">{q.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    <span className={q.status === "closed" ? "text-amber-400" : "text-slate-400"}>{q.status}</span> · {formatDate(q.closing_time ?? "")}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail / action panel */}
          {selectedQuestion && (
            <div className="w-full rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4 lg:sticky lg:top-24 lg:w-72 lg:flex-none">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">Question Detail</h3>
                <button onClick={() => { setSelectedQuestion(null); setConfirmResolve(null); }} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
              </div>
              <p className="mb-3 text-sm text-slate-200">{selectedQuestion.title}</p>
              <div className="mb-4 space-y-1 text-xs text-slate-400">
                <p>Entry cost: <span className="text-white">{selectedQuestion.entry_cost} pts</span></p>
                <p>Closing: <span className="text-white">{formatDate(selectedQuestion.closing_time ?? "")}</span></p>
                <p>Category: <span className="text-white">{selectedQuestion.category || "—"}</span></p>
                <p>YES pool: <span className="text-white">{selectedQuestion.yes_pool} pts</span> · NO pool: <span className="text-white">{selectedQuestion.no_pool} pts</span></p>
                <p>Status: <span className={selectedQuestion.status === "open" ? "text-emerald-400" : selectedQuestion.status === "closed" ? "text-amber-400" : "text-slate-400"}>{selectedQuestion.status}</span></p>
                {selectedQuestion.closing_time && new Date(selectedQuestion.closing_time) < now && selectedQuestion.status === "open" && (
                  <p className="rounded bg-amber-500/10 px-2 py-1 text-amber-400">⚠ Past closing time — analysis still possible until admin closes</p>
                )}
              </div>

              {selectedQuestion.status === "open" && !confirmResolve && (
                <div className="space-y-2">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Actions</p>
                  <button onClick={() => setConfirmResolve({ answer: "yes" })} disabled={!!resolving}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                    ✓ Resolve YES
                  </button>
                  <button onClick={() => setConfirmResolve({ answer: "no" })} disabled={!!resolving}
                    className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50">
                    ✗ Resolve NO
                  </button>
                  <button onClick={() => setConfirmResolve({ answer: "close" })} disabled={!!resolving}
                    className="w-full rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white disabled:opacity-50">
                    ⊘ Close (no payout)
                  </button>
                </div>
              )}

              {/* Confirm resolve/close inline */}
              {confirmResolve && selectedQuestion.status === "open" && (
                <div className="rounded-xl border border-[var(--stroke)] bg-slate-800/60 p-3">
                  <p className="mb-3 text-sm text-slate-200">
                    {confirmResolve.answer === "close"
                      ? "Close this question with no payout?"
                      : `Resolve as ${confirmResolve.answer.toUpperCase()}? This pays out winners.`}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmResolve(null)}
                      className="flex-1 rounded-lg border border-[var(--stroke)] py-2 text-xs text-slate-300 hover:border-slate-500">
                      Cancel
                    </button>
                    <button
                      onClick={() => handleResolve(selectedQuestion._id, confirmResolve.answer)}
                      disabled={!!resolving}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                        confirmResolve.answer === "yes" ? "bg-emerald-600 hover:bg-emerald-500" :
                        confirmResolve.answer === "no" ? "bg-orange-600 hover:bg-orange-500" :
                        "bg-slate-600 hover:bg-slate-500"
                      }`}>
                      {resolving ? "Working..." : "✓ Confirm"}
                    </button>
                  </div>
                </div>
              )}

              {selectedQuestion.status !== "open" && (
                <p className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-center text-xs text-slate-500">
                  This question is {selectedQuestion.status}.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── Auth users table ──────────────────────────────── */}
      <section className="mb-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Registered Auth Accounts ({authUsers.length})</h2>

        {adminMsg && (
          <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${adminMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
            {adminMsg.text}
          </div>
        )}

        {authUsers.length === 0 ? (
          <p className="text-sm text-slate-400">No auth accounts found.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--surface)]">
                <tr className="border-b border-[var(--stroke)] text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--stroke)]">
                {authUsers.map((u) => (
                  <tr key={u.id} className="text-slate-300">
                    <td className="py-2.5 pr-4 font-medium text-white">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => openRoleModal(u)}
                        className="text-xs text-[var(--brand)] hover:text-white"
                      >
                        Change Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <Link href="/auth/signup" className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-xs text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">
            + Create new account
          </Link>
        </div>
      </section>

      {/* ─── Create Question Pop Modal ─────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => { setCreateModalOpen(false); setCreateStep("form"); }}>
          <div className="w-full max-w-lg rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6" onClick={(e) => e.stopPropagation()}>
            {createStep === "form" ? (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Create New Question</h3>
                  <button onClick={() => { setCreateModalOpen(false); setCreateStep("form"); }} className="text-slate-500 hover:text-slate-300">✕</button>
                </div>
                {createMsg && (
                  <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${createMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                    {createMsg.text}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Question Text</label>
                    <textarea
                      value={createQuestion}
                      onChange={(e) => setCreateQuestion(e.target.value)}
                      placeholder="e.g., Will Bitcoin reach $50k by end of Q2?"
                      className="h-20 w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Category</label>
                    <select
                      value={createCategory}
                      onChange={(e) => setCreateCategory(e.target.value)}
                      className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none"
                    >
                      <option>Crypto</option>
                      <option>Economy</option>
                      <option>Entertainment</option>
                      <option>General</option>
                      <option>Global events</option>
                      <option>Markets</option>
                      <option>Sports</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Entry Cost (points)</label>
                    <select
                      value={createEntryCost}
                      onChange={(e) => setCreateEntryCost(e.target.value)}
                      className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none"
                    >
                      <optgroup label="Tier 1 — Starter">
                        <option value="50">50 pts</option>
                        <option value="100">100 pts</option>
                        <option value="200">200 pts</option>
                      </optgroup>
                      <optgroup label="Tier 2 — Standard">
                        <option value="300">300 pts</option>
                        <option value="400">400 pts</option>
                        <option value="500">500 pts</option>
                      </optgroup>
                      <optgroup label="Tier 3 — Premium">
                        <option value="600">600 pts</option>
                        <option value="700">700 pts</option>
                        <option value="800">800 pts</option>
                      </optgroup>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">Choose the participation cost tier for this question</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Closing Date & Time</label>
                    <input
                      type="datetime-local"
                      value={createClosingTime}
                      onChange={(e) => setCreateClosingTime(e.target.value)}
                      className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setCreateModalOpen(false); setCreateMsg(null); }}
                      className="flex-1 rounded-lg border border-[var(--stroke)] py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateQuestion}
                      className="flex-1 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
                    >
                      Review →
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Confirm Question</h3>
                  <button onClick={() => setCreateStep("form")} className="text-slate-500 hover:text-slate-300">← Back</button>
                </div>
                <div className="mb-5 space-y-3 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Question</p>
                    <p className="mt-1 font-medium text-white">{createQuestion}</p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Category</p>
                      <p className="mt-1 text-white">{createCategory}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Entry Cost</p>
                      <p className="mt-1 text-white">{createEntryCost} pts</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Closes</p>
                      <p className="mt-1 text-white">{createClosingTime ? new Date(createClosingTime).toLocaleString() : "—"}</p>
                    </div>
                  </div>
                </div>
                {createMsg && (
                  <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${createMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                    {createMsg.text}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setCreateStep("form")}
                    className="flex-1 rounded-lg border border-[var(--stroke)] py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
                  >
                    ← Edit
                  </button>
                  <button
                    onClick={handleCreateSubmit}
                    disabled={createSubmitting}
                    className="flex-1 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
                  >
                    {createSubmitting ? "Creating..." : "✓ Create Question"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Role Change Modal ───────────────────────────── */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setRoleModal(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-semibold text-white">Change Role</h3>
            <p className="mb-5 text-sm text-slate-400">Update role for <span className="font-medium text-white">{roleModal.email}</span></p>
            {roleMsg && (
              <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${roleMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                {roleMsg.text}
              </div>
            )}
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-300">New Role</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none"
              >
                <option value="admin">Admin — full access (create, resolve, manage users)</option>
                <option value="question_creator">Question Creator — can create questions only</option>
                <option value="user">User — analyses only (default)</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">Current: <span className="font-medium text-slate-300">{roleModal.currentRole}</span></p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setRoleModal(null); setRoleMsg(null); }}
                className="flex-1 rounded-lg border border-[var(--stroke)] py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={changingRole}
                className="flex-1 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
              >
                {changingRole ? "Saving..." : "✓ Save Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Data source info ────────────────────────────── */}
      <section className="mb-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Where Is Data Stored?</h2>
        <div className="space-y-3 text-sm">
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="font-semibold text-[var(--brand)]">Users, Questions, Predictions, Analysis History</p>
            <p className="text-slate-400">Stored in <span className="text-white">Bubble.io</span> — app <code className="text-slate-300">{summary?.bubble_app_name || "rohita320"}</code> ({summary?.bubble_env || "live"} env)</p>
            <p className="mt-1 break-all text-slate-500">{summary?.bubble_base_url || "https://rohita320.bubbleapps.io/api/1.1/obj"}</p>
            <p className="mt-1 text-slate-400">Tables: <span className="text-slate-300">user · question · prediction · userprofile · questionhistory</span></p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="font-semibold text-[var(--brand)]">Login / Signup Accounts</p>
            <p className="text-slate-400">Stored locally in <code className="text-slate-300">lpbackend/auth_users.json</code> on the server. HMAC-hashed passwords, token-based sessions.</p>
            <p className="mt-1 text-slate-400">⚠ These local accounts are <span className="text-yellow-400">not yet linked</span> to Bubble user IDs. Profile and predictions use the demo Bubble user until linked.</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="font-semibold text-[var(--brand)]">10,000 Starting Points</p>
            <p className="text-slate-400">Points live in the Bubble <code className="text-slate-300">user.Points_balance</code> field. The backend does not auto-create Bubble users on signup — set <code className="text-white">Points_balance = 10000</code> manually when creating a user in Bubble.</p>
          </div>
        </div>
      </section>

      {/* Quick nav */}
      <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Quick Links</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/feed" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Feed</Link>
          <Link href="/leaderboard" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Leaderboard</Link>
          <Link href="/profile" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Profile</Link>
          <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">
            API Docs ↗
          </a>
        </div>
      </section>
    </main>
  );
}
