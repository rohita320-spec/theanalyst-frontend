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

type StorageStatus = {
  success: boolean;
  storage_mode: string;
  database_connected: boolean;
  postgres_enabled?: boolean;
  postgres_status?: string;
  hosting_provider?: string;
  hosting_active?: boolean;
  backend_api_status?: string;
  backend_base_url?: string;
  frontend_url?: string;
  api_docs_url?: string;
  table_counts?: Record<string, number>;
  data_files?: Record<string, string>;
  error?: string;
};

type SmokeTestSummary = {
  steps_total: number;
  steps_passed: number;
  steps_failed: number;
  elapsed_seconds: number;
  correct_answer: string;
};

type SmokeTestResult = {
  success: boolean;
  smoke_test_passed: boolean;
  summary: SmokeTestSummary;
};

type PendingQuestion = {
  _id: string;
  title: string;
  category: string;
  entry_cost: number;
  closing_time?: string;
  created_by_email?: string;
  created_at?: string;
  resolution_rules?: string | null;
};

type MyQuestion = {
  _id: string;
  title: string;
  category: string;
  entry_cost: number;
  closing_time?: string;
  status: string;
  created_at?: string;
  resolution_rules?: string | null;
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

function formatDateTimeLocal(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminPage() {
  const [state, setState] = useState<"checking" | "allowed" | "forbidden">("checking");
  const [adminToken, setAdminToken] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [authUsers, setAuthUsers] = useState<AuthUserRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [error, setError] = useState("");
  const [smokeLoading, setSmokeLoading] = useState(false);
  const [smokeResult, setSmokeResult] = useState<SmokeTestResult | null>(null);
  const [smokeMsg, setSmokeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Questions state
  const [allQuestions, setAllQuestions] = useState<FeedQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<FeedQuestion | null>(null);
  const [resolving, setResolving] = useState<string>(""); // "yes"|"no"|"close"|"cancel"|"delete"|""
  const [resolveMsg, setResolveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Confirm resolve/close
  const [confirmResolve, setConfirmResolve] = useState<{ answer: "yes" | "no" | "close" | "cancel" } | null>(null);

  // Create question modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"form" | "confirm">("form");
  const [createQuestion, setCreateQuestion] = useState("");
  const [createCategory, setCreateCategory] = useState("General");
  const [createEntryCost, setCreateEntryCost] = useState("500");
  const [createInitialProbability, setCreateInitialProbability] = useState("50");
  const [createClosingTime, setCreateClosingTime] = useState("");
  const [createResolutionRules, setCreateResolutionRules] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Full edit for open questions
  const [editQuestionMode, setEditQuestionMode] = useState(false);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionCategory, setEditQuestionCategory] = useState("");
  const [editQuestionEntryCost, setEditQuestionEntryCost] = useState("");
  const [editQuestionClosingTime, setEditQuestionClosingTime] = useState("");
  const [editQuestionRules, setEditQuestionRules] = useState("");
  const [editQuestionMetadata, setEditQuestionMetadata] = useState("");
  const [editQuestionSubmitting, setEditQuestionSubmitting] = useState(false);
  const [editQuestionMsg, setEditQuestionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role change state
  const [roleModal, setRoleModal] = useState<{ userId: string; email: string; currentRole: string } | null>(null);
  const [targetRole, setTargetRole] = useState("admin");
  const [changingRole, setChangingRole] = useState(false);
  const [roleMsg, setRoleMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Legacy alias (used by refreshUsers below)
  const [adminMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role & creator/pending state
  const [userRole, setUserRole] = useState<"admin" | "question_creator">("admin");
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approveMsg, setApproveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);
  const [myQuestions, setMyQuestions] = useState<MyQuestion[]>([]);
  const [myQuestionsLoading, setMyQuestionsLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("auth_token") || "";
      try {
        const result = await me(token || undefined);
        if (result.user.role !== "admin" && result.user.role !== "question_creator") {
          setState("forbidden");
          setError("Your account does not have admin access. Login with an admin or creator account.");
          return;
        }
        setAdminEmail(result.user.email || "");
        setAdminToken(token);
        setUserRole(result.user.role as "admin" | "question_creator");
        setState("allowed");

        if (result.user.role === "question_creator") {
          // Creators only see their own submitted questions
          const myQRes = await fetch(`${API_BASE}/creator/my_questions`, {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (myQRes.ok) {
            const body = await myQRes.json();
            setMyQuestions(body.results || []);
          }
          return;
        }

        // Fetch admin data + questions in parallel
        const [usersRes, summaryRes, questionsRes, storageRes, pendingRes] = await Promise.allSettled([
          fetch(`${API_BASE}/admin/users`, {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          fetch(`${API_BASE}/admin/summary`, {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          fetch(`${API_BASE}/feed_questions?limit=100&status=all`, { credentials: "include" }),
          fetch(`${API_BASE}/admin/storage_status`, {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          fetch(`${API_BASE}/admin/pending_questions`, {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
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
        if (storageRes.status === "fulfilled" && storageRes.value.ok) {
          const body = await storageRes.value.json();
          setStorageStatus(body);
        }
        if (pendingRes.status === "fulfilled" && pendingRes.value.ok) {
          const body = await pendingRes.value.json();
          setPendingQuestions(body.results || []);
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
      const res = await fetch(`${API_BASE}/feed_questions?limit=100&status=all`, { credentials: "include" });
      if (res.ok) {
        const body = await res.json();
        setAllQuestions(body.results || []);
      }
    } finally {
      setQuestionsLoading(false);
    }
  };

  const refreshPendingQuestions = async () => {
    setPendingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/pending_questions`, {
        credentials: "include",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
      });
      if (res.ok) {
        const body = await res.json();
        setPendingQuestions(body.results || []);
      }
    } finally {
      setPendingLoading(false);
    }
  };

  const refreshMyQuestions = async () => {
    setMyQuestionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/creator/my_questions`, {
        credentials: "include",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
      });
      if (res.ok) {
        const body = await res.json();
        setMyQuestions(body.results || []);
      }
    } finally {
      setMyQuestionsLoading(false);
    }
  };

  const handleApproveQuestion = async (questionId: string) => {
    setApproveMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/approve_question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ question_id: questionId }),
      });
      const body = await res.json();
      if (body.success) {
        setApproveMsg({ type: "success", text: "Question approved and is now live!" });
        await Promise.all([refreshPendingQuestions(), refreshQuestions()]);
      } else {
        setApproveMsg({ type: "error", text: body.detail || "Failed to approve question." });
      }
    } catch {
      setApproveMsg({ type: "error", text: "Network error. Please try again." });
    }
  };

  const handleRejectQuestion = async (questionId: string) => {
    setApproveMsg(null);
    setRejectConfirm(null);
    try {
      const res = await fetch(`${API_BASE}/admin/reject_question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ question_id: questionId }),
      });
      const body = await res.json();
      if (body.success) {
        setApproveMsg({ type: "success", text: "Question rejected and removed." });
        await refreshPendingQuestions();
      } else {
        setApproveMsg({ type: "error", text: body.detail || "Failed to reject question." });
      }
    } catch {
      setApproveMsg({ type: "error", text: "Network error. Please try again." });
    }
  };

  // Reset edit‑rules panel whenever the selected question changes
  useEffect(() => {
    setEditQuestionMode(false);
    setEditQuestionMsg(null);
  }, [selectedQuestion?._id]);

  const handleResolve = async (questionId: string, answer: "yes" | "no" | "close" | "cancel") => {
    setConfirmResolve(null);
    setResolving(answer);
    setResolveMsg(null);
    try {
      if (answer === "close") {
        const res = await fetch(`${API_BASE}/admin/close_question`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ question_id: questionId }),
        });
        const body = await res.json();
        if (body.success) {
          setResolveMsg({ type: "success", text: "Question closed. Resolve as YES/NO or cancel with point refunds when ready." });
          await refreshQuestions();
          setSelectedQuestion(null);
        } else {
          setResolveMsg({ type: "error", text: body.detail || "Failed to close question." });
        }
      } else if (answer === "cancel") {
        const res = await fetch(`${API_BASE}/admin/cancel_question`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ question_id: questionId }),
        });
        const body = await res.json();
        if (body.success) {
          const refundInfo = (body.participants_refunded ?? 0) > 0
            ? ` ${body.participants_refunded} participant(s) refunded ${body.total_refunded} pts.`
            : " No active predictions to refund.";
          setResolveMsg({ type: "success", text: `Cancelled with point refunds.${refundInfo}` });
          await refreshQuestions();
          setSelectedQuestion(null);
        } else {
          setResolveMsg({ type: "error", text: body.detail || "Failed to cancel question." });
        }
      } else {
        const res = await fetch(`${API_BASE}/resolve_question`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
          credentials: "include",
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
    const probability = parseFloat(createInitialProbability);
    if (isNaN(probability) || probability < 1 || probability > 99) {
      setCreateMsg({ type: "error", text: "Initial YES probability must be between 1 and 99." });
      return;
    }
    // Move to confirm step
    setCreateMsg(null);
    setCreateStep("confirm");
  };

  const handleCreateSubmit = async () => {
    const cost = parseFloat(createEntryCost);
    const probability = parseFloat(createInitialProbability);
    setCreateSubmitting(true);
    setCreateMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/create_question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          question_text: createQuestion.trim(),
          category: createCategory,
          entry_cost: cost,
          closing_time: createClosingTime,
          initial_probability: probability,
          ...(createResolutionRules.trim() ? { resolution_rules: createResolutionRules.trim() } : {}),
        }),
      });
      const body = await res.json();
      if (body.success) {
        const yesPercent = Number(body.yes_percent ?? probability).toFixed(2);
        const noPercent = Number(body.no_percent ?? (100 - probability)).toFixed(2);
        const successText = body.pending_approval
          ? "Question submitted for review! An admin will approve it shortly."
          : `Question created. Initial split: YES ${yesPercent}% / NO ${noPercent}%`;
        setCreateMsg({ type: "success", text: successText });
        setCreateQuestion(""); setCreateClosingTime(""); setCreateEntryCost("500"); setCreateCategory("General"); setCreateInitialProbability("50"); setCreateResolutionRules(""); setCreateStep("form");
        setTimeout(() => {
          setCreateModalOpen(false);
          setCreateMsg(null);
          if (body.pending_approval) {
            refreshMyQuestions();
          } else {
            refreshQuestions();
          }
        }, 1500);
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

  const runSmokeTest = async () => {
    setSmokeLoading(true);
    setSmokeMsg(null);
    setSmokeResult(null);
    try {
      const res = await fetch(`${API_BASE}/admin/run_smoke_test?correct_answer=yes`, {
        method: "POST",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
        credentials: "include",
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setSmokeResult(body);
        setSmokeMsg({
          type: body.smoke_test_passed ? "success" : "error",
          text: body.smoke_test_passed
            ? "System smoke test passed. Major flows are working."
            : "Smoke test ran but reported failures.",
        });
      } else {
        setSmokeMsg({ type: "error", text: body.detail || body.message || "Failed to run smoke test." });
      }
    } catch {
      setSmokeMsg({ type: "error", text: "Network error running smoke test." });
    } finally {
      setSmokeLoading(false);
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
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ user_id: roleModal.userId, target_role: targetRole }),
      });
      const body = await res.json();
      if (body.success) {
        setRoleMsg({ type: "success", text: `✓ ${roleModal.email} is now ${body.user.role}.` });
        const usersRes = await fetch(`${API_BASE}/admin/users`, {
          credentials: "include",
          headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
        });
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

  const openLifecycleQuestions = allQuestions.filter((q) =>
    q.status === "open" ||
    (q.status === "closed" && q.closed_reason !== "cancelled")
  );
  const resolvedQuestions = allQuestions.filter((q) => q.status === "resolved");
  const finalizedQuestions = allQuestions.filter((q) =>
    q.status === "resolved" || q.closed_reason === "cancelled"
  );
  const now = new Date();

  const roleBadge = (role: string) => {
    if (role === "admin") return "bg-[var(--brand)]/15 text-[var(--brand)]";
    if (role === "question_creator") return "bg-purple-500/15 text-purple-300";
    return "bg-slate-700/50 text-slate-300";
  };

  // ── Creator Dashboard ──────────────────────────────────────────────────────
  if (userRole === "question_creator") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-xs uppercase tracking-widest text-slate-500">The Analyst</p>
          <h1 className="text-3xl font-semibold text-white">Contributor Dashboard</h1>
          <p className="text-sm text-slate-400">Signed in as <span className="text-[var(--brand)]">{adminEmail}</span></p>
        </div>

        {/* Submit a Question */}
        <section className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Submit a Question</h2>
              <p className="text-sm text-slate-400">Questions go to admin review before going live in the feed.</p>
            </div>
            <button
              onClick={() => { setCreateModalOpen(true); setCreateStep("form"); setCreateMsg(null); }}
              className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
            >
              + New Question
            </button>
          </div>
        </section>

        {/* My Submitted Questions */}
        <section className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">My Submitted Questions</h2>
            <button onClick={refreshMyQuestions} className="text-xs text-slate-500 hover:text-slate-300">
              {myQuestionsLoading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>
          {myQuestions.length === 0 ? (
            <p className="text-sm text-slate-400">No questions yet. Submit your first question above.</p>
          ) : (
            <div className="space-y-3">
              {myQuestions.map((q) => (
                <div key={q._id} className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-white">{q.title}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      q.status === "pending_approval" ? "bg-amber-500/15 text-amber-300" :
                      q.status === "open" ? "bg-emerald-500/15 text-emerald-300" :
                      q.status === "closed" ? "bg-slate-700/50 text-slate-300" :
                      q.status === "resolved" ? "bg-blue-500/15 text-blue-300" :
                      "bg-slate-700/50 text-slate-300"
                    }`}>
                      {q.status === "pending_approval" ? "Pending Review" : q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
                    <span>Category: {q.category}</span>
                    <span>Entry: {q.entry_cost} pts</span>
                    {q.closing_time && <span>Closes: {new Date(q.closing_time).toLocaleDateString()}</span>}
                    {q.created_at && <span>Submitted: {new Date(q.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
          <h2 className="mb-4 text-base font-semibold text-white">Quick Links</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Landing Page</Link>
            <Link href="/feed" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Feed</Link>
            <Link href="/leaderboard" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Leaderboard</Link>
            <Link href="/profile" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Profile</Link>
          </div>
        </section>

        {/* Create Question Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => { setCreateModalOpen(false); setCreateStep("form"); }}>
            <div className="w-full max-w-lg rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6" onClick={(e) => e.stopPropagation()}>
              {createStep === "form" ? (
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Submit New Question</h3>
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
                      <textarea value={createQuestion} onChange={(e) => setCreateQuestion(e.target.value)} placeholder="e.g., Will Bitcoin reach $50k by end of Q2?" className="h-20 w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-300">Category</label>
                      <select value={createCategory} onChange={(e) => setCreateCategory(e.target.value)} className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none">
                        <option>Crypto</option><option>Economy</option><option>Entertainment</option><option>General</option><option>Global events</option><option>Markets</option><option>Sports</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-300">Entry Cost (points)</label>
                      <select value={createEntryCost} onChange={(e) => setCreateEntryCost(e.target.value)} className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none">
                        <optgroup label="Tier 1"><option value="50">50 pts</option><option value="100">100 pts</option><option value="200">200 pts</option></optgroup>
                        <optgroup label="Tier 2"><option value="300">300 pts</option><option value="400">400 pts</option><option value="500">500 pts</option></optgroup>
                        <optgroup label="Tier 3"><option value="600">600 pts</option><option value="700">700 pts</option><option value="800">800 pts</option></optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-300">Initial YES %</label>
                      <input type="number" min={1} max={99} step={0.1} value={createInitialProbability} onChange={(e) => setCreateInitialProbability(e.target.value)} placeholder="e.g. 65" className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none" />
                      <p className="mt-1 text-xs text-slate-500">NO will auto-set to {(100 - Number(createInitialProbability || 50)).toFixed(2)}%</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-300">Closing Date & Time</label>
                      <input type="datetime-local" value={createClosingTime} onChange={(e) => setCreateClosingTime(e.target.value)} className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-300">Resolution Rules <span className="text-slate-500 font-normal text-xs">(optional)</span></label>
                      <textarea value={createResolutionRules} onChange={(e) => setCreateResolutionRules(e.target.value)} rows={3} placeholder="e.g. YES if BTC closing price ≥ $50,000 on Binance on 31 Dec 2025." className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setCreateModalOpen(false); setCreateMsg(null); }} className="flex-1 rounded-lg border border-[var(--stroke)] py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white">Cancel</button>
                      <button onClick={handleCreateQuestion} className="flex-1 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110">Review →</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Confirm Submission</h3>
                    <button onClick={() => setCreateStep("form")} className="text-slate-500 hover:text-slate-300">← Back</button>
                  </div>
                  <div className="mb-5 space-y-3 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4 text-sm">
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Question</p><p className="mt-1 font-medium text-white">{createQuestion}</p></div>
                    <div className="flex flex-wrap gap-6">
                      <div><p className="text-xs uppercase tracking-wide text-slate-500">Category</p><p className="mt-1 text-white">{createCategory}</p></div>
                      <div><p className="text-xs uppercase tracking-wide text-slate-500">Entry Cost</p><p className="mt-1 text-white">{createEntryCost} pts</p></div>
                      <div><p className="text-xs uppercase tracking-wide text-slate-500">Closes</p><p className="mt-1 text-white">{createClosingTime ? new Date(createClosingTime).toLocaleString() : "—"}</p></div>
                      <div><p className="text-xs uppercase tracking-wide text-slate-500">Initial Split</p><p className="mt-1 text-white">YES {Number(createInitialProbability || 50).toFixed(2)}% / NO {(100 - Number(createInitialProbability || 50)).toFixed(2)}%</p></div>
                    </div>
                    {createResolutionRules.trim() && <div><p className="text-xs uppercase tracking-wide text-slate-500">Resolution Rules</p><p className="mt-1 whitespace-pre-line text-slate-200">{createResolutionRules.trim()}</p></div>}
                  </div>
                  {createMsg && (
                    <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${createMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                      {createMsg.text}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setCreateStep("form")} className="flex-1 rounded-lg border border-[var(--stroke)] py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white">← Edit</button>
                    <button onClick={handleCreateSubmit} disabled={createSubmitting} className="flex-1 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50">{createSubmitting ? "Submitting..." : "✓ Submit for Review"}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

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
          <StatCard label="Open Questions" value={openLifecycleQuestions.length} />
          <StatCard label="Resolved Questions" value={resolvedQuestions.length} />
          <StatCard label="Auth Accounts" value={summary?.auth_users_count ?? authUsers.length} />
        </div>
      </section>

      {/* Pending Approvals */}
      {(pendingQuestions.length > 0 || pendingLoading) && (
        <section className="mb-8 rounded-2xl border border-amber-500/30 bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                Pending Approvals
                <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                  {pendingQuestions.length}
                </span>
              </h2>
              <p className="text-sm text-slate-400">Review and approve or reject questions submitted by contributors.</p>
            </div>
            <button onClick={refreshPendingQuestions} className="text-xs text-slate-500 hover:text-slate-300">
              {pendingLoading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>
          {approveMsg && (
            <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${approveMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
              {approveMsg.text}
            </div>
          )}
          <div className="space-y-3">
            {pendingQuestions.map((q) => (
              <div key={q._id} className="rounded-xl border border-amber-500/20 bg-[#0b1528] p-4">
                <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-white">{q.title}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
                      <span>Category: {q.category}</span>
                      <span>Entry: {q.entry_cost} pts</span>
                      {q.closing_time && <span>Closes: {new Date(q.closing_time).toLocaleDateString()}</span>}
                      {q.created_by_email && <span>By: <span className="text-purple-300">{q.created_by_email}</span></span>}
                      {q.created_at && <span>Submitted: {formatDate(q.created_at)}</span>}
                    </div>
                    {q.resolution_rules && (
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{q.resolution_rules}</p>
                    )}
                  </div>
                  <div className="mt-3 flex shrink-0 gap-2 sm:ml-4 sm:mt-0">
                    {rejectConfirm === q._id ? (
                      <>
                        <span className="self-center text-xs text-red-400">Confirm reject?</span>
                        <button
                          onClick={() => handleRejectQuestion(q._id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                        >
                          Yes, Reject
                        </button>
                        <button
                          onClick={() => setRejectConfirm(null)}
                          className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApproveQuestion(q._id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => setRejectConfirm(q._id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">System Test</h2>
            <p className="text-sm text-slate-400">Visible admin controls for system validation and storage status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/test" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-sm text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">
              Open UI Test Page
            </Link>
            <button
              onClick={runSmokeTest}
              disabled={smokeLoading}
              className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
            >
              {smokeLoading ? "Running..." : "Run Backend Smoke Test"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Storage Status</p>
            {storageStatus ? (
              <div className="space-y-1 text-sm text-slate-300">
                <p>Mode: <span className="text-white">{storageStatus.storage_mode}</span></p>
                <p>Hosting: <span className={storageStatus.hosting_active ? "text-emerald-400" : "text-amber-400"}>{storageStatus.hosting_provider === "railway" ? "Railway online" : "Online"}</span></p>
                <p>Backend API: <span className={storageStatus.backend_api_status === "online" ? "text-emerald-400" : "text-amber-400"}>{storageStatus.backend_api_status || "unknown"}</span></p>
                <p>PostgreSQL: <span className={storageStatus.postgres_status === "connected" ? "text-emerald-400" : storageStatus.postgres_status === "inactive" ? "text-slate-300" : "text-amber-400"}>{storageStatus.postgres_status || "unknown"}</span></p>
                {storageStatus.error && <p className="text-red-400">{storageStatus.error}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Storage details unavailable.</p>
            )}
            <div className="mt-3 space-y-2 border-t border-[var(--stroke)] pt-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Services</p>
              <a href={`${storageStatus?.backend_base_url || API_BASE}/health`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-[var(--stroke)] bg-[#091228] px-3 py-2 text-xs hover:border-slate-500">
                <span className="text-slate-300">Backend API (Railway)</span>
                <span className="text-emerald-400">↗ /health</span>
              </a>
              <a href={storageStatus?.api_docs_url || `${API_BASE}/docs`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-[var(--stroke)] bg-[#091228] px-3 py-2 text-xs hover:border-slate-500">
                <span className="text-slate-300">API Docs (Swagger)</span>
                <span className="text-slate-400">↗ /docs</span>
              </a>
              <a href={storageStatus?.frontend_url || "/"} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-[var(--stroke)] bg-[#091228] px-3 py-2 text-xs hover:border-slate-500">
                <span className="text-slate-300">Frontend (Railway)</span>
                <span className="text-slate-400">↗ live site</span>
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Last Smoke Test</p>
            {smokeMsg && (
              <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${smokeMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                {smokeMsg.text}
              </div>
            )}
            {smokeResult ? (
              <div className="space-y-1 text-sm text-slate-300">
                <p>Passed: <span className={smokeResult.smoke_test_passed ? "text-emerald-400" : "text-red-400"}>{smokeResult.smoke_test_passed ? "yes" : "no"}</span></p>
                <p>Steps: <span className="text-white">{smokeResult.summary.steps_passed}/{smokeResult.summary.steps_total}</span></p>
                <p>Failures: <span className="text-white">{smokeResult.summary.steps_failed}</span></p>
                <p>Elapsed: <span className="text-white">{smokeResult.summary.elapsed_seconds}s</span></p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Run the backend smoke test to verify signup, trading, resolution, payout, cleanup, and storage connectivity.</p>
            )}
          </div>
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
              <p className="text-sm font-medium text-slate-300">Open ({openLifecycleQuestions.length})</p>
              <button onClick={refreshQuestions} className="ml-auto text-xs text-slate-500 hover:text-slate-300">
                {questionsLoading ? "..." : "↻ Refresh"}
              </button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {openLifecycleQuestions.length === 0 && <p className="text-xs text-slate-500">No open questions.</p>}
              {openLifecycleQuestions.map((q) => {
                const yesPct = Number(q.yes_percent ?? 50).toFixed(2);
                const noPct = Number(q.no_percent ?? (100 - Number(q.yes_percent ?? 50))).toFixed(2);
                const initialYesPct = Number(q.initial_yes_percent ?? q.yes_percent ?? 50).toFixed(2);
                const initialNoPct = Number(q.initial_no_percent ?? q.no_percent ?? (100 - Number(q.yes_percent ?? 50))).toFixed(2);
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
                    <p className="mt-1 text-xs text-slate-500">Initial: YES {initialYesPct}% · NO {initialNoPct}%</p>
                    <p className="mt-1 text-xs text-slate-400">YES {yesPct}% · NO {noPct}%</p>
                    {q.status === "closed" && q.closed_reason !== "cancelled" && (
                      <p className="mt-1 text-xs font-medium text-amber-400">
                        {q.closed_reason === "time_closed" ? "Closed by time — pending resolution" : "Closed — pending resolution"}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resolved (includes final cancelled outcomes) */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <p className="text-sm font-medium text-slate-300">Resolved ({finalizedQuestions.length})</p>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {finalizedQuestions.length === 0 && <p className="text-xs text-slate-500">None yet.</p>}
              {finalizedQuestions.map((q) => (
                <button
                  key={q._id}
                  onClick={() => { setSelectedQuestion(q); setResolveMsg(null); setConfirmResolve(null); }}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${selectedQuestion?._id === q._id ? "border-[var(--brand)] bg-[var(--brand)]/10 text-white" : "border-[var(--stroke)] bg-[#0b1528] text-slate-300 hover:border-slate-500"}`}
                >
                  <p className="line-clamp-2">{q.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    <span className={q.status === "closed" ? "text-amber-400" : "text-slate-400"}>
                      {q.status === "closed" ? "closed (cancelled)" : q.status}
                    </span> · {formatDate(q.closing_time ?? "")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Initial YES {Number(q.initial_yes_percent ?? q.yes_percent ?? 50).toFixed(2)}% · NO {Number(q.initial_no_percent ?? q.no_percent ?? (100 - Number(q.yes_percent ?? 50))).toFixed(2)}%</p>
                  <p className="mt-1 text-xs text-slate-400">YES {Number(q.yes_percent ?? 50).toFixed(2)}% · NO {Number(q.no_percent ?? (100 - Number(q.yes_percent ?? 50))).toFixed(2)}%</p>
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
              {selectedQuestion.status === "closed" && (
                <p className="mb-3 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                  {selectedQuestion.closed_reason === "time_closed"
                    ? "Closed by time — pending resolution"
                    : selectedQuestion.closed_reason === "cancelled"
                    ? "Cancelled — points refunded"
                    : "Closed by admin — pending resolution"}
                </p>
              )}
              <div className="mb-4 space-y-1 text-xs text-slate-400">
                <p>Entry cost: <span className="text-white">{selectedQuestion.entry_cost} pts</span></p>
                <p>Closing: <span className="text-white">{formatDate(selectedQuestion.closing_time ?? "")}</span></p>
                <p>Category: <span className="text-white">{selectedQuestion.category || "—"}</span></p>
                <p>YES pool: <span className="text-white">{selectedQuestion.yes_pool} pts</span> · NO pool: <span className="text-white">{selectedQuestion.no_pool} pts</span></p>
                <p>Initial split: <span className="text-slate-200">YES {Number(selectedQuestion.initial_yes_percent ?? selectedQuestion.yes_percent ?? 50).toFixed(2)}%</span> · <span className="text-slate-200">NO {Number(selectedQuestion.initial_no_percent ?? selectedQuestion.no_percent ?? (100 - Number(selectedQuestion.yes_percent ?? 50))).toFixed(2)}%</span></p>
                <p>Market split: <span className="text-emerald-300">YES {Number(selectedQuestion.yes_percent ?? 50).toFixed(2)}%</span> · <span className="text-orange-300">NO {Number(selectedQuestion.no_percent ?? (100 - Number(selectedQuestion.yes_percent ?? 50))).toFixed(2)}%</span></p>
                <p>Status: <span className={selectedQuestion.status === "open" ? "text-emerald-400" : selectedQuestion.status === "closed" ? "text-amber-400" : "text-slate-400"}>{selectedQuestion.status}</span></p>
                {selectedQuestion.closing_time && new Date(selectedQuestion.closing_time) < now && selectedQuestion.status === "open" && (
                  <p className="rounded bg-amber-500/10 px-2 py-1 text-amber-400">⚠ Past closing time</p>
                )}
              </div>

              {/* Actions — available for all non-resolved, non-cancelled questions */}
              {(selectedQuestion.status !== "resolved" && selectedQuestion.closed_reason !== "cancelled") && !confirmResolve && (
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
                  {/* Close Question — only available for open questions (stops predictions, remains pending) */}
                  {selectedQuestion.status === "open" && (
                    <button onClick={() => setConfirmResolve({ answer: "close" })} disabled={!!resolving}
                      className="w-full rounded-lg border border-yellow-600/50 px-3 py-2 text-sm font-medium text-yellow-300 hover:border-yellow-400 hover:text-yellow-200 disabled:opacity-50">
                      ⊘ Close Question (stop predictions)
                    </button>
                  )}
                  {/* Cancel + Refund — available for both open and closed pending questions */}
                  <button onClick={() => setConfirmResolve({ answer: "cancel" })} disabled={!!resolving}
                    className="w-full rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white disabled:opacity-50">
                    ↩ Cancel (Refund All Points)
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete this question and related records? This cannot be undone.")) return;
                      setResolving("delete");
                      setResolveMsg(null);
                      try {
                        const res = await fetch(`${API_BASE}/admin/delete_question`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
                          },
                          credentials: "include",
                          body: JSON.stringify({ question_id: selectedQuestion._id }),
                        });
                        const body = await res.json();
                        if (body.success) {
                          setResolveMsg({ type: "success", text: "Question deleted." });
                          await refreshQuestions();
                          setSelectedQuestion(null);
                        } else {
                          setResolveMsg({ type: "error", text: body.detail || "Failed to delete question." });
                        }
                      } catch {
                        setResolveMsg({ type: "error", text: "Network error." });
                      } finally {
                        setResolving("");
                      }
                    }}
                    disabled={!!resolving}
                    className="w-full rounded-lg border border-red-500/50 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    🗑 Delete Question
                  </button>
                </div>
              )}

              {/* Confirm resolve/close inline */}
              {confirmResolve && (selectedQuestion.status !== "resolved" && selectedQuestion.closed_reason !== "cancelled") && (
                <div className="rounded-xl border border-[var(--stroke)] bg-slate-800/60 p-3">
                  <p className="mb-3 text-sm text-slate-200">
                    {confirmResolve.answer === "close"
                      ? "Close this question for new predictions? It will remain pending until you resolve it."
                      : confirmResolve.answer === "cancel"
                      ? "Cancel this question? All participants will receive point refunds. No winner or loser declared."
                      : `Resolve as ${confirmResolve.answer.toUpperCase()}? This finalizes outcomes for participants.`}
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
                        confirmResolve.answer === "close" ? "bg-yellow-700 hover:bg-yellow-600" :
                        "bg-slate-600 hover:bg-slate-500"
                      }`}>
                      {resolving ? "Working..." : "✓ Confirm"}
                    </button>
                  </div>
                </div>
              )}

              {selectedQuestion.status === "resolved" && (
                <p className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-center text-xs text-slate-500">
                  This question has been resolved.
                </p>
              )}

              {(selectedQuestion.closed_reason === "cancelled") && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-300">
                  Final state: cancelled with full point refunds for participants.
                </p>
              )}

              {/* Full question edit — available for open and pending-closed questions */}
              {(selectedQuestion.status === "open" || (selectedQuestion.status === "closed" && selectedQuestion.closed_reason !== "cancelled")) && (
                <div className="mt-4 border-t border-[var(--stroke)] pt-4">
                  {!editQuestionMode ? (
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-300">Category: <span className="font-normal text-slate-400">{selectedQuestion.category}</span></p>
                      <button
                        onClick={() => {
                          setEditQuestionMode(true);
                          setEditQuestionText(selectedQuestion.title);
                          setEditQuestionCategory(selectedQuestion.category);
                          setEditQuestionEntryCost(String(selectedQuestion.entry_cost ?? ""));
                          setEditQuestionClosingTime(formatDateTimeLocal(selectedQuestion.closing_time));
                          setEditQuestionRules(selectedQuestion.resolution_rules || "");
                          setEditQuestionMetadata(selectedQuestion.metadata ? JSON.stringify(selectedQuestion.metadata, null, 2) : "");
                          setEditQuestionMsg(null);
                        }}
                        className="text-xs text-[var(--brand)] hover:underline"
                      >
                        ✏ Full Edit Question
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-300">Question Text</label>
                      <textarea
                        value={editQuestionText}
                        onChange={(e) => setEditQuestionText(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none"
                        placeholder="Enter question text..."
                      />
                      <label className="text-xs font-medium text-slate-300">Category</label>
                      <select
                        value={editQuestionCategory}
                        onChange={(e) => setEditQuestionCategory(e.target.value)}
                        className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                      >
                        <option>Crypto</option>
                        <option>Economy</option>
                        <option>Entertainment</option>
                        <option>General</option>
                        <option>Global events</option>
                        <option>Markets</option>
                        <option>Sports</option>
                      </select>
                      <label className="text-xs font-medium text-slate-300">Entry Cost (points)</label>
                      <input
                        type="number"
                        min={50}
                        step={1}
                        value={editQuestionEntryCost}
                        onChange={(e) => setEditQuestionEntryCost(e.target.value)}
                        className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                      />
                      <label className="text-xs font-medium text-slate-300">Closing Date & Time</label>
                      <input
                        type="datetime-local"
                        value={editQuestionClosingTime}
                        onChange={(e) => setEditQuestionClosingTime(e.target.value)}
                        className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                      />
                      <label className="text-xs font-medium text-slate-300">Resolution Rules</label>
                      <textarea
                        value={editQuestionRules}
                        onChange={(e) => setEditQuestionRules(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none"
                        placeholder="Describe YES and NO conditions..."
                      />
                      <label className="text-xs font-medium text-slate-300">Metadata (JSON, optional)</label>
                      <textarea
                        value={editQuestionMetadata}
                        onChange={(e) => setEditQuestionMetadata(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none"
                        placeholder='{"source": "...", "notes": "..."}'
                      />
                      {editQuestionMsg && (
                        <p className={`text-xs ${editQuestionMsg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>{editQuestionMsg.text}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditQuestionMode(false); setEditQuestionMsg(null); }}
                          className="flex-1 rounded-lg border border-[var(--stroke)] py-1.5 text-xs text-slate-300 hover:border-slate-500"
                        >Cancel</button>
                        <button
                          disabled={editQuestionSubmitting}
                          onClick={async () => {
                            if (!editQuestionText.trim()) {
                              setEditQuestionMsg({ type: "error", text: "Question text required" });
                              return;
                            }
                            const entryCost = Number(editQuestionEntryCost);
                            if (!Number.isFinite(entryCost) || entryCost < 50) {
                              setEditQuestionMsg({ type: "error", text: "Entry cost must be at least 50" });
                              return;
                            }
                            if (!editQuestionClosingTime) {
                              setEditQuestionMsg({ type: "error", text: "Closing time is required" });
                              return;
                            }

                            let parsedMetadata: Record<string, unknown> | undefined;
                            if (editQuestionMetadata.trim()) {
                              try {
                                const parsed = JSON.parse(editQuestionMetadata);
                                if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                                  setEditQuestionMsg({ type: "error", text: "Metadata must be a JSON object" });
                                  return;
                                }
                                parsedMetadata = parsed as Record<string, unknown>;
                              } catch {
                                setEditQuestionMsg({ type: "error", text: "Metadata must be valid JSON" });
                                return;
                              }
                            }

                            setEditQuestionSubmitting(true);
                            setEditQuestionMsg(null);
                            try {
                              const res = await fetch(`${API_BASE}/admin/edit_question`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
                                },
                                credentials: "include",
                                body: JSON.stringify({
                                  question_id: selectedQuestion._id,
                                  question_text: editQuestionText.trim(),
                                  category: editQuestionCategory.trim(),
                                  entry_cost: entryCost,
                                  closing_time: new Date(editQuestionClosingTime).toISOString(),
                                  resolution_rules: editQuestionRules.trim(),
                                  ...(parsedMetadata ? { metadata: parsedMetadata } : {}),
                                }),
                              });
                              const body = await res.json();
                              if (body.success) {
                                setEditQuestionMsg({ type: "success", text: "Question updated." });
                                await refreshQuestions();
                                if (body.question) {
                                  setSelectedQuestion(body.question);
                                } else {
                                  setSelectedQuestion((prev) => prev ? {
                                    ...prev,
                                    title: editQuestionText.trim(),
                                    category: editQuestionCategory.trim(),
                                    entry_cost: entryCost,
                                    closing_time: new Date(editQuestionClosingTime).toISOString(),
                                    resolution_rules: editQuestionRules.trim() || null,
                                    ...(parsedMetadata ? { metadata: parsedMetadata } : {}),
                                  } : prev);
                                }
                                setTimeout(() => { setEditQuestionMode(false); setEditQuestionMsg(null); }, 800);
                              } else {
                                setEditQuestionMsg({ type: "error", text: body.detail || "Failed to update." });
                              }
                            } catch {
                              setEditQuestionMsg({ type: "error", text: "Network error." });
                            } finally {
                              setEditQuestionSubmitting(false);
                            }
                          }}
                          className="flex-1 rounded-lg bg-[var(--brand)] py-1.5 text-xs font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
                        >{editQuestionSubmitting ? "Saving..." : "Save"}</button>
                      </div>
                    </div>
                  )}
                </div>
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
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Initial Percentage (YES %) <span className="text-rose-300">*</span></label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      step={0.1}
                      value={createInitialProbability}
                      onChange={(e) => setCreateInitialProbability(e.target.value)}
                      placeholder="e.g. 65"
                      className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      NO will auto-set to {(100 - Number(createInitialProbability || 50)).toFixed(2)}%
                    </p>
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
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Resolution Rules <span className="text-slate-500 font-normal text-xs">(optional — shown to users below the chart)</span>
                    </label>
                    <textarea
                      value={createResolutionRules}
                      onChange={(e) => setCreateResolutionRules(e.target.value)}
                      rows={3}
                      placeholder={"e.g. YES if BTC closing price ≥ $50,000 on Binance on 31 Dec 2025.\nNO otherwise. Source: Binance BTCUSDT daily close."}
                      className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none"
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
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Initial Split</p>
                      <p className="mt-1 text-white">YES {Number(createInitialProbability || 50).toFixed(2)}% / NO {(100 - Number(createInitialProbability || 50)).toFixed(2)}%</p>
                    </div>
                  </div>
                  {createResolutionRules.trim() && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Resolution Rules</p>
                      <p className="mt-1 whitespace-pre-line text-slate-200">{createResolutionRules.trim()}</p>
                    </div>
                  )}
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

      {/* ─── System architecture info ─────────────────────── */}
      <section className="mb-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-base font-semibold text-white">How This System Works</h2>
        <div className="space-y-3 text-sm">
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="font-semibold text-[var(--brand)]">Frontend (Next.js)</p>
            <p className="text-slate-400">Admin, Feed, Profile and Leaderboard are rendered by the Next.js app and call backend APIs with auth tokens.</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="font-semibold text-[var(--brand)]">Backend API (FastAPI)</p>
            <p className="text-slate-400">Question creation, edit, close, resolve, delete, prediction settlement, and auth are handled by backend endpoints.</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="font-semibold text-[var(--brand)]">Git + Deploy</p>
            <p className="text-slate-400">Code changes are committed to GitHub and deployed to Railway services. This admin uses API base URL: <span className="text-slate-300">{API_BASE}</span>.</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="font-semibold text-[var(--brand)]">PostgreSQL (Data Layer)</p>
            <p className="text-slate-400">PostgreSQL is the persistent database for all platform data — users, questions, predictions, balances, outcomes, and audit logs. It stores every event and acts as the authoritative data store outside Bubble. Used for auth, leaderboard scores, and complete audit trails.</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="font-semibold text-[var(--brand)]">Question Lifecycle</p>
            <p className="text-slate-400">Open → (optional time-close) → Resolve YES/NO with rule-based outcome points; or Open/Closed → Cancel (Refund) which returns all participants&apos; points; or Delete for full cleanup.</p>
          </div>
        </div>
      </section>

      {/* Quick nav */}
      <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Quick Links</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/" className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-4 py-2 text-[var(--brand)] hover:bg-[var(--brand)]/20">
            🌐 Landing Page (Guest View)
          </Link>
          <Link href="/test" className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-4 py-2 text-[var(--brand)] hover:bg-[var(--brand)]/20">
            🧪 System Test Page
          </Link>
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
