"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, clearStoredAuthSession, me, resolveLogoImageUrl, type FeedQuestion, type LogoAsset } from "../../lib/api";
import { getQuestionViewStatus } from "../../lib/questionStatus";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MARKET_CATS = new Set(["Crypto", "Economy", "Markets"]);
type RefLink = { label: string; url: string };


type AuthUserRow = {
  id: string;
  email: string;
  role: string;
  username?: string;
  theme_preference?: string;
  leaderboard_eligible?: boolean;
  prediction_count?: number;
  created_at?: string;
};
type Summary = {
  bubble_users_count: number;
  bubble_questions_count: number;
  logo_assets_count?: number;
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
  yes_percent?: number;
  no_percent?: number;
  initial_yes_percent?: number;
  initial_no_percent?: number;
  closing_time?: string;
  created_by_email?: string;
  created_at?: string;
  resolution_rules?: string | null;
  logo_keys?: string[];
  pending_logo_ids?: string[];
  metadata?: Record<string, unknown> | null;
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
  logo_keys?: string[];
  pending_logo_ids?: string[];
  metadata?: Record<string, unknown> | null;
};

type DraftQuestion = {
  _id: string;
  title: string;
  category: string;
  entry_cost: number;
  closing_time?: string;
  status: "draft";
  resolution_rules?: string | null;
  yes_percent?: number;
  no_percent?: number;
  initial_yes_percent?: number;
  metadata?: Record<string, unknown> | null;
};

type LogoLibraryPickerProps = {
  title: string;
  category: string;
  activeAssets: LogoAsset[];
  pendingAssets: LogoAsset[];
  selectedLogoKeys: string[];
  selectedPendingLogoIds: string[];
  onSelectedLogoKeysChange: (next: string[]) => void;
  onSelectedPendingLogoIdsChange: (next: string[]) => void;
  onUploadLogo: (payload: { displayName: string; category: string; file?: File; logoUrl?: string; logoKey?: string }) => Promise<void>;
  uploading: boolean;
  role: "admin" | "question_creator" | "question_creator_resolver";
};

function LogoLibraryPicker({
  title,
  category,
  activeAssets,
  pendingAssets,
  selectedLogoKeys,
  selectedPendingLogoIds,
  onSelectedLogoKeysChange,
  onSelectedPendingLogoIdsChange,
  onUploadLogo,
  uploading,
  role,
}: LogoLibraryPickerProps) {
  const [uploadDisplayName, setUploadDisplayName] = useState("");
  const [uploadLogoKey, setUploadLogoKey] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLogoUrl, setUploadLogoUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [logoSearch, setLogoSearch] = useState("");

  const searchLower = logoSearch.trim().toLowerCase();
  const uploadNameLower = uploadDisplayName.trim().toLowerCase();
  const existingUploadMatches = uploadNameLower
    ? activeAssets.filter((asset) => {
        const displayName = asset.display_name.toLowerCase();
        const logoKey = asset.logo_key.toLowerCase();
        return displayName.includes(uploadNameLower) || logoKey.includes(uploadNameLower);
      }).slice(0, 6)
    : [];
  const hasExactUploadMatch = existingUploadMatches.some((asset) => asset.display_name.toLowerCase() === uploadNameLower || asset.logo_key.toLowerCase() === uploadNameLower);

  // Always include selected assets so they're never silently hidden; also filter by search or category
  const visibleActiveAssets = activeAssets.filter((asset) => {
    const selected = selectedLogoKeys.includes(asset.logo_key);
    if (selected) return true;
    if (searchLower) return asset.display_name.toLowerCase().includes(searchLower) || asset.logo_key.toLowerCase().includes(searchLower);
    return !category || asset.category === category || asset.category === "General";
  });
  const visiblePendingAssets = pendingAssets.filter((asset) => {
    const selected = selectedPendingLogoIds.includes(asset.id);
    if (selected) return true;
    if (searchLower) return asset.display_name.toLowerCase().includes(searchLower) || asset.logo_key.toLowerCase().includes(searchLower);
    return !category || asset.category === category || asset.category === "General";
  });

  const toggleLogoKey = (logoKey: string) => {
    onSelectedLogoKeysChange(
      selectedLogoKeys.includes(logoKey)
        ? selectedLogoKeys.filter((item) => item !== logoKey)
        : [...selectedLogoKeys, logoKey],
    );
  };

  const togglePendingLogoId = (logoId: string) => {
    onSelectedPendingLogoIdsChange(
      selectedPendingLogoIds.includes(logoId)
        ? selectedPendingLogoIds.filter((item) => item !== logoId)
        : [...selectedPendingLogoIds, logoId],
    );
  };

  const handleUpload = async () => {
    if (!uploadDisplayName.trim()) {
      setUploadError("Display name is required.");
      return;
    }
    if (!uploadFile && !uploadLogoUrl.trim()) {
      setUploadError("Choose a logo file or provide a logo URL.");
      return;
    }
    setUploadError("");
    try {
      await onUploadLogo({
        displayName: uploadDisplayName.trim(),
        category,
        ...(uploadFile ? { file: uploadFile } : {}),
        ...(uploadLogoUrl.trim() ? { logoUrl: uploadLogoUrl.trim() } : {}),
        ...(uploadLogoKey.trim() ? { logoKey: uploadLogoKey.trim() } : {}),
      });
      setUploadDisplayName("");
      setUploadLogoKey("");
      setUploadFile(null);
      setUploadLogoUrl("");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
      <input
        type="text"
        value={logoSearch}
        onChange={(e) => setLogoSearch(e.target.value)}
        placeholder="Search logos by name…"
        className="mb-2 w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--stroke)]">
        {visibleActiveAssets.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-slate-500">{searchLower ? "No logos match your search." : "No logos in library yet. Add them via Logo Library above."}</p>
        ) : (
          <div className="grid grid-cols-4 gap-px bg-[var(--stroke)]">
            {visibleActiveAssets.map((asset) => {
              const active = selectedLogoKeys.includes(asset.logo_key);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => toggleLogoKey(asset.logo_key)}
                  className={`flex flex-col items-center gap-1 px-1 py-2 text-center transition-colors ${active ? "bg-[var(--brand)]/10 ring-1 ring-inset ring-[var(--brand)]" : "bg-[#0b1528] hover:bg-white/5"}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1">
                    <img src={resolveLogoImageUrl(asset.image_url)} alt={asset.display_name} className="h-full w-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }} />
                  </div>
                  <span className={`line-clamp-1 w-full text-[9px] leading-tight ${active ? "text-[var(--brand)]" : "text-slate-400"}`}>{asset.display_name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {visiblePendingAssets.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Pending approval</p>
          <div className="flex flex-wrap gap-1.5">
            {visiblePendingAssets.map((asset) => {
              const active = selectedPendingLogoIds.includes(asset.id);
              return (
                <button key={asset.id} type="button" onClick={() => togglePendingLogoId(asset.id)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] ${active ? "border-amber-400 bg-amber-500/15 text-amber-300" : "border-[var(--stroke)] text-slate-400 hover:border-slate-500"}`}>
                  {asset.display_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add new logo */}
      <div className="mt-3 border-t border-[var(--stroke)] pt-3">
        <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">Add new logo</p>
        <div className="space-y-2">
          <input
            type="text"
            value={uploadDisplayName}
            onChange={(e) => setUploadDisplayName(e.target.value)}
            placeholder="Display name (e.g. Apple)"
            className="w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {existingUploadMatches.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              <p>
                {hasExactUploadMatch
                  ? "This logo already exists in the library. Select the existing logo below instead of uploading another copy."
                  : "Similar logos already exist in the library. You can select one below to avoid duplicate uploads."}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {existingUploadMatches.map((asset) => {
                  const selected = selectedLogoKeys.includes(asset.logo_key);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        toggleLogoKey(asset.logo_key);
                        setLogoSearch(asset.display_name);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[10px] ${selected ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)]" : "border-amber-400/40 text-amber-100 hover:border-amber-300"}`}
                    >
                      {selected ? "Selected" : "Use existing"} · {asset.display_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <input
            type="url"
            value={uploadLogoUrl}
            onChange={(e) => { setUploadLogoUrl(e.target.value); if (uploadFile) setUploadFile(null); }}
            placeholder="Direct image URL (https://example.com/logo.png)"
            className="w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="text-[10px] text-amber-400/80">⚠ URL must be a direct image address, e.g. https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/BSE_logo.svg/250px-BSE_logo.svg.png — not a webpage link.</p>
          <p className="text-center text-[10px] text-slate-500">— or upload a file —</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => { setUploadFile(e.target.files?.[0] ?? null); setUploadLogoUrl(""); }}
            className="w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2 py-1 text-xs text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-indigo-600 file:px-2 file:py-0.5 file:text-xs file:text-white"
          />
          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !uploadDisplayName.trim() || (!uploadFile && !uploadLogoUrl.trim())}
            className="w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {uploading ? "Uploading…" : "Upload Logo"}
          </button>
        </div>
      </div>
    </div>
  );
}

type ApiTimingRow = {
  endpoint: string;
  ms: number;
  source: "server" | "client";
  status: number | null;
  updatedAt: number;
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

function parseCommaList(raw: string) {
  const source = String(raw || "").trim();
  if (!source) return [];

  const base = source
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  // Support space-separated ticker input like: "NVDA NASDAQ BSE AAPL"
  // when user forgets commas.
  if (base.length === 1) {
    const only = base[0];
    if (!only.startsWith("http://") && !only.startsWith("https://") && /\s/.test(only)) {
      const tokens = only.split(/\s+/).map((item) => item.trim()).filter(Boolean);
      if (tokens.length > 1 && tokens.every((token) => /^[a-z0-9.-]+$/i.test(token))) {
        return tokens;
      }
    }
  }

  return base;
}

function parseLogoEntries(raw: string) {
  return parseCommaList(raw).map((url) => ({ url }));
}

type SymbolResult = { symbol: string; description: string; exchange: string };

export default function AdminPage() {
  const [state, setState] = useState<"checking" | "allowed" | "forbidden">("checking");
  const [adminToken, setAdminToken] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [authUsers, setAuthUsers] = useState<AuthUserRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [activeLogoAssets, setActiveLogoAssets] = useState<LogoAsset[]>([]);
  const [pendingLogoAssets, setPendingLogoAssets] = useState<LogoAsset[]>([]);
  const [error, setError] = useState("");
  const [smokeLoading, setSmokeLoading] = useState(false);
  const [smokeResult, setSmokeResult] = useState<SmokeTestResult | null>(null);
  const [smokeMsg, setSmokeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Questions state
  const [allQuestions, setAllQuestions] = useState<FeedQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionViewTab, setQuestionViewTab] = useState<"draft" | "open" | "closed" | "resolved" | "all">("all");
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftMsg, setDraftMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // AI Draft Import state
  const [aiDraftJson, setAiDraftJson] = useState("");
  const [aiDraftValidated, setAiDraftValidated] = useState<Record<string, unknown>[] | null>(null);
  const [aiDraftValidationError, setAiDraftValidationError] = useState<string | null>(null);
  const [aiDraftSaving, setAiDraftSaving] = useState(false);
  const [aiDraftMsg, setAiDraftMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [creatorResolverTab, setCreatorResolverTab] = useState<"open" | "closed" | "resolved" | "all" | "pending">("all");
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
  const [createSelectedLogoKeys, setCreateSelectedLogoKeys] = useState<string[]>([]);
  const [createSelectedPendingLogoIds, setCreateSelectedPendingLogoIds] = useState<string[]>([]);
  const [createChartSymbol, setCreateChartSymbol] = useState("");
  const [createChartResults, setCreateChartResults] = useState<SymbolResult[]>([]);
  const [createReferenceLinks, setCreateReferenceLinks] = useState<RefLink[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createLogoUploading, setCreateLogoUploading] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [createVsMode, setCreateVsMode] = useState(false);
  const [createVsTeamA, setCreateVsTeamA] = useState("");
  const [createVsTeamB, setCreateVsTeamB] = useState("");

  // Full edit for open questions
  const [editQuestionMode, setEditQuestionMode] = useState(false);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionCategory, setEditQuestionCategory] = useState("");
  const [editQuestionEntryCost, setEditQuestionEntryCost] = useState("");
  const [editQuestionClosingTime, setEditQuestionClosingTime] = useState("");
  const [editQuestionClosingTimeSeed, setEditQuestionClosingTimeSeed] = useState("");
  const [editQuestionRules, setEditQuestionRules] = useState("");
  const [editQuestionInitialYes, setEditQuestionInitialYes] = useState("");
  const [editQuestionMetadata, setEditQuestionMetadata] = useState("");
  const [editQuestionMetadataSeed, setEditQuestionMetadataSeed] = useState("");
  const [editSelectedLogoKeys, setEditSelectedLogoKeys] = useState<string[]>([]);
  const [editSelectedPendingLogoIds, setEditSelectedPendingLogoIds] = useState<string[]>([]);
  const [editChartSymbol, setEditChartSymbol] = useState("");
  const [editChartResults, setEditChartResults] = useState<SymbolResult[]>([]);
  const [editReferenceLinks, setEditReferenceLinks] = useState<RefLink[]>([]);
  const [editQuestionSubmitting, setEditQuestionSubmitting] = useState(false);
  const [editLogoUploading, setEditLogoUploading] = useState(false);
  const [editQuestionMsg, setEditQuestionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role change state
  const [roleModal, setRoleModal] = useState<{ userId: string; email: string; currentRole: string } | null>(null);
  const [targetRole, setTargetRole] = useState("admin");
  const [changingRole, setChangingRole] = useState(false);
  const [roleMsg, setRoleMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string>("");
  // Legacy alias (used by refreshUsers below)
  const [adminMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role & creator/pending state
  const [userRole, setUserRole] = useState<"admin" | "question_creator" | "question_creator_resolver">("admin");
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [pendingInitialYes, setPendingInitialYes] = useState<Record<string, string>>({});
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [pendingEditQuestionText, setPendingEditQuestionText] = useState("");
  const [pendingEditCategory, setPendingEditCategory] = useState("General");
  const [pendingEditEntryCost, setPendingEditEntryCost] = useState("");
  const [pendingEditClosingTime, setPendingEditClosingTime] = useState("");
  const [pendingEditRules, setPendingEditRules] = useState("");
  const [pendingEditSelectedLogoKeys, setPendingEditSelectedLogoKeys] = useState<string[]>([]);
  const [pendingEditSelectedPendingLogoIds, setPendingEditSelectedPendingLogoIds] = useState<string[]>([]);
  const [pendingEditSubmitting, setPendingEditSubmitting] = useState(false);
  const [pendingLogoUploading, setPendingLogoUploading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approveMsg, setApproveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);
  const [myQuestions, setMyQuestions] = useState<MyQuestion[]>([]);
  const [myQuestionsLoading, setMyQuestionsLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState<{ tone: "success" | "warning"; message: string } | null>(null);
  const [copyMsg, setCopyMsg] = useState("");
  const [logoLibraryLoading, setLogoLibraryLoading] = useState(false);
  const [logoLibraryMsg, setLogoLibraryMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [addLogoOpen, setAddLogoOpen] = useState(false);
  const [addLogoName, setAddLogoName] = useState("");
  const [addLogoCategory, setAddLogoCategory] = useState("General");
  const [addLogoUrl, setAddLogoUrl] = useState("");
  const [addLogoFile, setAddLogoFile] = useState<File | null>(null);
  const [addLogoKey, setAddLogoKey] = useState("");
  const [addLogoSubmitting, setAddLogoSubmitting] = useState(false);
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [editingLogoUrl, setEditingLogoUrl] = useState("");
  const [editingLogoFile, setEditingLogoFile] = useState<File | null>(null);
  const [logoLibrarySearch, setLogoLibrarySearch] = useState("");
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [apiTimings, setApiTimings] = useState<Record<string, ApiTimingRow>>({});

  const recordApiTiming = (
    endpoint: string,
    ms: number,
    source: "server" | "client",
    status: number | null,
  ) => {
    setApiTimings((prev) => ({
      ...prev,
      [endpoint]: {
        endpoint,
        ms: Math.max(0, Math.round(ms * 100) / 100),
        source,
        status,
        updatedAt: Date.now(),
      },
    }));
  };

  const timedFetch = async (
    endpoint: string,
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const started = performance.now();
    const res = await fetch(input, init);
    const clientMs = performance.now() - started;
    const serverHeader = res.headers.get("X-Response-Time-Ms");
    const parsedServerMs = serverHeader == null ? Number.NaN : Number(serverHeader);

    if (Number.isFinite(parsedServerMs)) {
      recordApiTiming(endpoint, parsedServerMs, "server", res.status);
    } else {
      recordApiTiming(endpoint, clientMs, "client", res.status);
    }

    return res;
  };

  // Safely parse JSON — if Railway returns an HTML gateway error (502/504),
  // res.json() throws, which would land in the outer catch as "Network error."
  // This returns a synthetic error object instead so the normal error path handles it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeJson = async (res: Response): Promise<Record<string, any>> => {
    try {
      return await res.json();
    } catch {
      return { success: false, detail: `Backend temporarily unavailable (HTTP ${res.status}). Please retry in a moment.` };
    }
  };

  const applyLogoAssetState = (assets: LogoAsset[]) => {
    setActiveLogoAssets(assets.filter((asset) => asset.status === "active"));
    setPendingLogoAssets(assets.filter((asset) => asset.status === "pending_approval"));
  };

  const refreshLogoAssets = async (
    roleOverride: "admin" | "question_creator" | "question_creator_resolver" = userRole,
    tokenOverride: string = adminToken,
  ) => {
    setLogoLibraryLoading(true);
    try {
      if (roleOverride === "admin") {
        const res = await timedFetch("admin/logo_assets", `${API_BASE}/admin/logo_assets?status=all`, {
          credentials: "include",
          headers: tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : undefined,
        });
        if (res.ok) {
          const body = await res.json();
          applyLogoAssetState(body.results || []);
        }
        return;
      }

      const [activeRes, creatorRes] = await Promise.all([
        timedFetch("logos/active", `${API_BASE}/logos/active`, {
          credentials: "include",
          headers: tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : undefined,
        }),
        timedFetch("creator/logo_assets", `${API_BASE}/creator/logo_assets?status=all`, {
          credentials: "include",
          headers: tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : undefined,
        }),
      ]);

      const activeBody = activeRes.ok ? await activeRes.json() : { results: [] };
      const creatorBody = creatorRes.ok ? await creatorRes.json() : { results: [] };
      const creatorAssets: LogoAsset[] = creatorBody.results || [];
      applyLogoAssetState([...(activeBody.results || []), ...creatorAssets.filter((asset: LogoAsset) => asset.status !== "active")]);
    } finally {
      setLogoLibraryLoading(false);
    }
  };

  const uploadLogoAsset = async (
    payload: { displayName: string; category: string; file?: File; logoUrl?: string; logoKey?: string },
    scope: "create" | "pending" | "edit",
  ) => {
    const setUploading = scope === "create" ? setCreateLogoUploading : scope === "pending" ? setPendingLogoUploading : setEditLogoUploading;
    setUploading(true);
    setLogoLibraryMsg(null);
    try {
      const form = new FormData();
      form.set("display_name", payload.displayName);
      form.set("category", payload.category);
      if (payload.file) {
        form.set("logo_file", payload.file);
      }
      if (payload.logoUrl?.trim()) {
        form.set("logo_url", payload.logoUrl.trim());
      }
      if (!payload.file && !payload.logoUrl?.trim()) {
        throw new Error("Choose a logo file or provide a logo URL.");
      }
      if (payload.logoKey) form.set("logo_key", payload.logoKey);

      const res = await timedFetch("admin/logo_assets/upload", `${API_BASE}/admin/logo_assets/upload`, {
        method: "POST",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
        credentials: "include",
        body: form,
      });
      const body = await res.json();
      if (!body.success || !body.logo_asset) {
        throw new Error(body.detail || "Logo upload failed.");
      }

      const asset = body.logo_asset as LogoAsset;
      const updatedExisting = Boolean(body.updated_existing);
      if (asset.status === "active") {
        setActiveLogoAssets((prev) => {
          const next = [...prev.filter((item) => item.id !== asset.id), asset];
          return next.sort((a, b) => a.display_name.localeCompare(b.display_name));
        });
        if (scope === "create") setCreateSelectedLogoKeys((prev) => Array.from(new Set([...prev, asset.logo_key])));
        if (scope === "pending") setPendingEditSelectedLogoKeys((prev) => Array.from(new Set([...prev, asset.logo_key])));
        if (scope === "edit") setEditSelectedLogoKeys((prev) => Array.from(new Set([...prev, asset.logo_key])));
      } else {
        setPendingLogoAssets((prev) => {
          const next = [...prev.filter((item) => item.id !== asset.id), asset];
          return next.sort((a, b) => a.display_name.localeCompare(b.display_name));
        });
        if (scope === "create") setCreateSelectedPendingLogoIds((prev) => Array.from(new Set([...prev, asset.id])));
        if (scope === "pending") setPendingEditSelectedPendingLogoIds((prev) => Array.from(new Set([...prev, asset.id])));
        if (scope === "edit") setEditSelectedPendingLogoIds((prev) => Array.from(new Set([...prev, asset.id])));
      }
      setLogoLibraryMsg({
        type: "success",
        text: asset.status === "active"
          ? (updatedExisting ? "Logo key updated in the approved library." : "Logo uploaded to the approved library.")
          : "Logo uploaded and attached as pending approval.",
      });
    } finally {
      setUploading(false);
    }
  };

  const moderateLogoAsset = async (action: "approve" | "reject" | "deactivate", logoId: string) => {
    setLogoLibraryMsg(null);
    try {
      const res = await timedFetch(`admin/logo_assets/${action}`, `${API_BASE}/admin/logo_assets/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ logo_id: logoId }),
      });
      const body = await safeJson(res);
      if (!body.success) {
        setLogoLibraryMsg({ type: "error", text: body.detail || `Failed to ${action} logo.` });
        return;
      }
      await Promise.all([refreshLogoAssets(), refreshQuestions(), refreshPendingQuestions()]);
      setLogoLibraryMsg({ type: "success", text: `Logo ${action === "deactivate" ? "deactivated" : action + "d"} successfully.` });
    } catch {
      setLogoLibraryMsg({ type: "error", text: `Network error — could not ${action} logo.` });
    }
  };


  const handleAddLogoToLibrary = async () => {
    if (!addLogoName.trim() || (!addLogoFile && !addLogoUrl.trim())) {
      setLogoLibraryMsg({ type: "error", text: "Display name and a logo file or URL are required." });
      return;
    }
    setAddLogoSubmitting(true);
    setLogoLibraryMsg(null);
    try {
      const form = new FormData();
      form.set("display_name", addLogoName.trim());
      form.set("category", addLogoCategory);
      if (addLogoFile) {
        form.set("logo_file", addLogoFile);
      } else {
        form.set("logo_url", addLogoUrl.trim());
      }
      if (addLogoKey.trim()) form.set("logo_key", addLogoKey.trim());

      const res = await timedFetch("admin/logo_assets/upload", `${API_BASE}/admin/logo_assets/upload`, {
        method: "POST",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
        credentials: "include",
        body: form,
      });
      const body = await res.json();
      if (!body.success || !body.logo_asset) {
        throw new Error(body.detail || "Logo upload failed.");
      }
      const asset = body.logo_asset as LogoAsset;
      if (asset.status === "active") {
        setActiveLogoAssets((prev) => {
          const next = [...prev.filter((item) => item.id !== asset.id), asset];
          return next.sort((a, b) => a.display_name.localeCompare(b.display_name));
        });
      } else {
        setPendingLogoAssets((prev) => {
          const next = [...prev.filter((item) => item.id !== asset.id), asset];
          return next.sort((a, b) => a.display_name.localeCompare(b.display_name));
        });
      }
      setLogoLibraryMsg({ type: "success", text: asset.status === "active" ? "Logo added to library." : "Logo added as pending approval." });
      setAddLogoName(""); setAddLogoCategory("General"); setAddLogoUrl(""); setAddLogoFile(null); setAddLogoKey("");
      setAddLogoOpen(false);
    } catch (err) {
      setLogoLibraryMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to add logo." });
    } finally {
      setAddLogoSubmitting(false);
    }
  };

  const handleEditLogo = async (logoId: string) => {
    if (!editingLogoFile && !editingLogoUrl.trim()) return;
    setLogoLibraryMsg(null);
    try {
      let res: Response;
      if (editingLogoFile) {
        const form = new FormData();
        form.set("logo_id", logoId);
        form.set("logo_file", editingLogoFile);
        res = await timedFetch("admin/logo_assets/edit_file", `${API_BASE}/admin/logo_assets/edit_file`, {
          method: "POST",
          headers: { ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) },
          credentials: "include",
          body: form,
        });
      } else {
        res = await timedFetch("admin/logo_assets/edit", `${API_BASE}/admin/logo_assets/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) },
          credentials: "include",
          body: JSON.stringify({ logo_id: logoId, logo_url: editingLogoUrl.trim() }),
        });
      }
      const body = await res.json();
      if (!body.success) throw new Error(body.detail || "Edit failed.");
      const updated = body.logo_asset as LogoAsset;
      setActiveLogoAssets((prev) => prev.map((a) => (a.id === logoId ? updated : a)));
      setLogoLibraryMsg({ type: "success", text: "Logo updated." });
      setEditingLogoId(null);
      setEditingLogoUrl("");
      setEditingLogoFile(null);
    } catch (err) {
      setLogoLibraryMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update logo." });
    }
  };

  const runLegacyLogoBackfill = async () => {
    setBackfillRunning(true);
    setLogoLibraryMsg(null);
    try {
      const res = await timedFetch("admin/logo_assets/backfill_questions", `${API_BASE}/admin/logo_assets/backfill_questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const body = await safeJson(res);
      if (!body.success) {
        throw new Error(body.detail || "Legacy logo backfill failed.");
      }
      await Promise.all([refreshLogoAssets(), refreshQuestions()]);
      setLogoLibraryMsg({ type: "success", text: `Backfill complete: ${body.migrated || 0} question(s) migrated, ${body.failed || 0} failed.` });
    } finally {
      setBackfillRunning(false);
    }
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("auth_notice");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { tone?: "success" | "warning"; message?: string };
      if (parsed?.message) {
        setAuthNotice({
          tone: parsed.tone === "warning" ? "warning" : "success",
          message: parsed.message,
        });
      }
      sessionStorage.removeItem("auth_notice");
    } catch {
      sessionStorage.removeItem("auth_notice");
    }
  }, []);

  useEffect(() => {
    if (!authNotice) return;
    const id = window.setTimeout(() => setAuthNotice(null), 3200);
    return () => window.clearTimeout(id);
  }, [authNotice]);

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("auth_token") || "";
      try {
        const result = await me(token || undefined);
        if (result.user.role !== "admin" && result.user.role !== "question_creator" && result.user.role !== "question_creator_resolver") {
          setState("forbidden");
          setError("Your account does not have admin access. Login with an admin or creator account.");
          return;
        }
        setAdminEmail(result.user.email || "");
        setAdminToken(token);
        setUserRole(result.user.role as "admin" | "question_creator" | "question_creator_resolver");
        setState("allowed");
        // Sync live role into localStorage so AppHeader nav updates without re-login
        try {
          const stored = JSON.parse(localStorage.getItem("auth_user") || "{}");
          if (stored.role !== result.user.role) {
            localStorage.setItem("auth_user", JSON.stringify({ ...stored, role: result.user.role }));
            window.dispatchEvent(new Event("auth-changed"));
          }
        } catch { /* ignore */ }

        if (result.user.role === "question_creator" || result.user.role === "question_creator_resolver") {
          const myQRes = await timedFetch("creator/my_questions", `${API_BASE}/creator/my_questions`, {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (myQRes.ok) {
            const body = await myQRes.json();
            setMyQuestions(body.results || []);
          }
          if (result.user.role === "question_creator_resolver") {
            // Resolvers also need the full question list to resolve questions
            await refreshQuestions();
          }
          await refreshLogoAssets(result.user.role as "question_creator" | "question_creator_resolver", token);
          return;
        }

        const bootstrapRes = await timedFetch("admin/bootstrap", `${API_BASE}/admin/bootstrap?limit=200`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (bootstrapRes.status === 404) {
          // Backend is running an old version without the bootstrap endpoint.
          // Fall back to individual legacy endpoints.
          const [usersRes, qRes] = await Promise.all([
            timedFetch("admin/users", `${API_BASE}/admin/users`, {
              credentials: "include",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }),
            timedFetch("feed_questions", `${API_BASE}/feed_questions?limit=200&status=all`, {
              credentials: "include",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }),
          ]);
          if (usersRes.ok) {
            const b = await usersRes.json();
            setAuthUsers(b.results || b.users || []);
          }
          if (qRes.ok) {
            const b = await qRes.json();
            setAllQuestions(b.results || []);
          }
          setError("Backend is running an old version — go to Railway dashboard and trigger a manual redeploy to restore full admin features.");
        } else if (!bootstrapRes.ok) {
          setError(`Failed to load admin data (HTTP ${bootstrapRes.status}). ${bootstrapRes.status === 403 ? "Check your admin role." : "Check FRONTEND_ORIGINS on the backend."}`);
        }
        if (bootstrapRes.ok) {
          const body = await bootstrapRes.json();
          setAuthUsers(body.users || []);
          setSummary(body.summary || null);
          if (body.logo_assets) {
            setActiveLogoAssets(body.logo_assets.active || []);
            setPendingLogoAssets(body.logo_assets.pending || []);
          }
          const pendingRows = body.pending?.results || [];
          setPendingQuestions(pendingRows);
          setAllQuestions(body.questions?.results || []);
          setPendingInitialYes((prev) => {
            const next = { ...prev };
            for (const row of pendingRows) {
              const seed = Number(row.initial_yes_percent ?? row.yes_percent ?? 50);
              if (next[row._id] == null) next[row._id] = String(seed);
            }
            return next;
          });
        }
        await Promise.all([refreshLogoAssets("admin", token), refreshDraftQuestions()]);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearStoredAuthSession("Your session expired. Please login again.");
          window.location.href = "/";
          return;
        }
        setState("forbidden");
        setError("Session check failed. Please login again.");
      }
    };

    run();
  }, []);

  const refreshQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const res = await timedFetch("feed_questions", `${API_BASE}/feed_questions?limit=40&status=all`, {
        credentials: "include",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
      });
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
      const res = await timedFetch("admin/pending_questions", `${API_BASE}/admin/pending_questions`, {
        credentials: "include",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
      });
      if (res.ok) {
        const body = await res.json();
        const rows = body.results || [];
        setPendingQuestions(rows);
        setPendingInitialYes((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            const seed = Number(row.initial_yes_percent ?? row.yes_percent ?? 50);
            if (next[row._id] == null) next[row._id] = String(seed);
          }
          return next;
        });
      }
    } finally {
      setPendingLoading(false);
    }
  };

  const refreshDraftQuestions = async () => {
    setDraftsLoading(true);
    try {
      const res = await timedFetch("admin/draft_questions", `${API_BASE}/admin/draft_questions`, {
        credentials: "include",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
      });
      if (res.ok) {
        const body = await res.json();
        setDraftQuestions(body.results || []);
      }
    } finally {
      setDraftsLoading(false);
    }
  };

  const refreshMyQuestions = async () => {
    setMyQuestionsLoading(true);
    try {
      const res = await timedFetch("creator/my_questions", `${API_BASE}/creator/my_questions`, {
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

  const handleApproveQuestion = async (
    questionId: string,
    edits?: {
      question_text?: string;
      category?: string;
      entry_cost?: number;
      closing_time?: string;
      resolution_rules?: string;
      logo_keys?: string[];
      pending_logo_ids?: string[];
    },
  ) => {
    setApproveMsg(null);
    const rawInitialYes = (pendingInitialYes[questionId] ?? "").trim();
    const parsedInitialYes = rawInitialYes === "" ? null : Number(rawInitialYes);
    if (parsedInitialYes !== null && (Number.isNaN(parsedInitialYes) || parsedInitialYes < 1 || parsedInitialYes > 99)) {
      setApproveMsg({ type: "error", text: "Initial YES % must be between 1 and 99." });
      return;
    }

    try {
      const res = await timedFetch("admin/approve_question", `${API_BASE}/admin/approve_question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          question_id: questionId,
          ...(edits || {}),
          ...(parsedInitialYes !== null ? { initial_yes_percent: parsedInitialYes } : {}),
        }),
      });
      const body = await safeJson(res);
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
      const res = await timedFetch("admin/reject_question", `${API_BASE}/admin/reject_question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ question_id: questionId }),
      });
      const body = await safeJson(res);
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

  const handleStartPendingEdit = (q: PendingQuestion) => {
    setPendingEditId(q._id);
    setPendingEditQuestionText(q.title || "");
    setPendingEditCategory(q.category || "General");
    setPendingEditEntryCost(String(q.entry_cost ?? ""));
    setPendingEditClosingTime(formatDateTimeLocal(q.closing_time));
    setPendingEditRules(q.resolution_rules || "");
    setPendingEditSelectedLogoKeys(Array.isArray(q.logo_keys) ? q.logo_keys : []);
    setPendingEditSelectedPendingLogoIds(Array.isArray(q.pending_logo_ids) ? q.pending_logo_ids : []);
    
    setApproveMsg(null);
  };

  const handleSavePendingEdit = async (q: PendingQuestion) => {
    if (!pendingEditQuestionText.trim()) {
      setApproveMsg({ type: "error", text: "Pending question text cannot be empty." });
      return;
    }
    const cost = Number(pendingEditEntryCost);
    if (!Number.isFinite(cost) || cost < 50) {
      setApproveMsg({ type: "error", text: "Entry cost must be at least 50." });
      return;
    }
    if (!pendingEditClosingTime) {
      setApproveMsg({ type: "error", text: "Closing time is required." });
      return;
    }

    const rawInitialYes = (pendingInitialYes[q._id] ?? "").trim();
    const parsedInitialYes = rawInitialYes === "" ? null : Number(rawInitialYes);
    if (parsedInitialYes !== null && (Number.isNaN(parsedInitialYes) || parsedInitialYes < 1 || parsedInitialYes > 99)) {
      setApproveMsg({ type: "error", text: "Initial YES % must be between 1 and 99." });
      return;
    }

    setPendingEditSubmitting(true);
    setApproveMsg(null);
    try {
      const editPayload: any = {
        question_id: q._id,
        question_text: pendingEditQuestionText.trim(),
        category: pendingEditCategory,
        entry_cost: cost,
        closing_time: new Date(pendingEditClosingTime).toISOString(),
        resolution_rules: pendingEditRules.trim(),
        logo_keys: pendingEditSelectedLogoKeys,
        pending_logo_ids: pendingEditSelectedPendingLogoIds,
      };

      if (parsedInitialYes !== null) {
        editPayload.initial_yes_percent = parsedInitialYes;
      }
      
      const res = await timedFetch("admin/edit_question", `${API_BASE}/admin/edit_question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(editPayload),
      });
      const body = await safeJson(res);
      if (body.success) {
        setApproveMsg({ type: "success", text: "Pending question updated. You can now approve." });
        setPendingEditId(null);
        await refreshPendingQuestions();
      } else {
        setApproveMsg({ type: "error", text: body.detail || "Failed to update pending question." });
      }
    } catch {
      setApproveMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setPendingEditSubmitting(false);
    }
  };

  // Reset edit‑rules panel whenever the selected question changes
  useEffect(() => {
    setEditQuestionMode(false);
    setEditQuestionMsg(null);
  }, [selectedQuestion?._id]);

  // Debounced symbol search for create form
  useEffect(() => {
    if (!createChartSymbol || createChartSymbol.includes(":")) { setCreateChartResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/symbol_search?q=${encodeURIComponent(createChartSymbol)}`, { headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}, credentials: "include" });
        const data = await res.json();
        setCreateChartResults(data.symbols || []);
      } catch { setCreateChartResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [createChartSymbol, adminToken]);

  // Debounced symbol search for edit form
  useEffect(() => {
    if (!editChartSymbol || editChartSymbol.includes(":")) { setEditChartResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/symbol_search?q=${encodeURIComponent(editChartSymbol)}`, { headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}, credentials: "include" });
        const data = await res.json();
        setEditChartResults(data.symbols || []);
      } catch { setEditChartResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [editChartSymbol, adminToken]);

  const handleResolve = async (questionId: string, answer: "yes" | "no" | "close" | "cancel") => {
    setConfirmResolve(null);
    setResolving(answer);
    setResolveMsg(null);
    try {
      if (answer === "close") {
        const res = await timedFetch("admin/close_question", `${API_BASE}/admin/close_question`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ question_id: questionId }),
        });
        const body = await safeJson(res);
        if (body.success) {
          setResolveMsg({ type: "success", text: "Question closed. Resolve as YES/NO or cancel with point refunds when ready." });
          await refreshQuestions();
          setSelectedQuestion(null);
        } else {
          setResolveMsg({ type: "error", text: body.detail || "Failed to close question." });
        }
      } else if (answer === "cancel") {
        const res = await timedFetch("admin/cancel_question", `${API_BASE}/admin/cancel_question`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ question_id: questionId }),
        });
        const body = await safeJson(res);
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
        const res = await timedFetch("resolve_question", `${API_BASE}/resolve_question`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ question_id: questionId, correct_answer: answer }),
        });
        const body = await safeJson(res);
        if (body.success) {
          setResolveMsg({ type: "success", text: `Resolved as ${answer.toUpperCase()}. ${body.message || ""}` });
          await refreshQuestions();
          setSelectedQuestion(null);
        } else {
          setResolveMsg({ type: "error", text: body.detail || body.message || "Failed to resolve question." });
        }
      }
    } catch {
      setResolveMsg({ type: "error", text: "Network error." });
    } finally {
      setResolving("");
    }
  };

  const handleCreateQuestion = async () => {
    if (createVsMode && createCategory === "Sports" && (!createVsTeamA.trim() || !createVsTeamB.trim())) {
      setCreateMsg({ type: "error", text: "Enter both team names for a VS match question." }); return;
    }
    if (!createQuestion.trim()) { setCreateMsg({ type: "error", text: "Question text is required." }); return; }
    if (!createClosingTime) { setCreateMsg({ type: "error", text: "Closing time is required." }); return; }
    if (userRole === "admin") {
      const cost = parseFloat(createEntryCost);
      if (isNaN(cost) || cost < 50) { setCreateMsg({ type: "error", text: "Entry cost must be at least 50." }); return; }
      const probability = parseFloat(createInitialProbability);
      if (isNaN(probability) || probability < 1 || probability > 99) {
        setCreateMsg({ type: "error", text: "Initial YES probability must be between 1 and 99." }); return;
      }
    }
    setCreateMsg(null);
    setCreateStep("confirm");
  };

  const handleCreateSubmit = async () => {
    const cost = parseFloat(createEntryCost);
    const probability = parseFloat(createInitialProbability);
    setCreateSubmitting(true);
    setCreateMsg(null);
    try {
      const res = await timedFetch("admin/create_question", `${API_BASE}/admin/create_question`, {
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
          closing_time: new Date(createClosingTime).toISOString(),
          initial_probability: probability,
          logo_keys: createSelectedLogoKeys,
          pending_logo_ids: createSelectedPendingLogoIds,
          ...(createResolutionRules.trim() ? { resolution_rules: createResolutionRules.trim() } : {}),
          metadata: {
            ...(createChartSymbol.trim() ? { chart_symbol: createChartSymbol.trim() } : {}),
            ...(createReferenceLinks.filter((l) => l.url.trim()).length > 0 ? { reference_links: createReferenceLinks.filter((l) => l.url.trim()) } : {}),
          },
        }),
      });
      const body = await safeJson(res);
      if (body.success) {
        const yesPercent = Number(body.yes_percent ?? probability).toFixed(2);
        const noPercent = Number(body.no_percent ?? (100 - probability)).toFixed(2);
        const successText = body.pending_approval
          ? "Question submitted for review! An admin will approve it shortly."
          : `Question created. Initial split: YES ${yesPercent}% / NO ${noPercent}%`;
        setCreateMsg({ type: "success", text: successText });
        setCreateQuestion(""); setCreateClosingTime(""); setCreateEntryCost("500"); setCreateCategory("General"); setCreateInitialProbability("50"); setCreateResolutionRules(""); setCreateSelectedLogoKeys([]); setCreateSelectedPendingLogoIds([]); setCreateChartSymbol(""); setCreateReferenceLinks([]); setCreateStep("form"); setCreateVsMode(false); setCreateVsTeamA(""); setCreateVsTeamB("");
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
      const res = await timedFetch("admin/run_smoke_test", `${API_BASE}/admin/run_smoke_test?correct_answer=yes`, {
        method: "POST",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
        credentials: "include",
      });
      const body = await safeJson(res);
      if (res.ok && body.success) {
        setSmokeResult(body as SmokeTestResult);
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

  const refreshUsers = async () => {
    const usersRes = await timedFetch("admin/users", `${API_BASE}/admin/users`, {
      credentials: "include",
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
    });
    if (usersRes.ok) {
      const body = await usersRes.json();
      setAuthUsers(body.users || []);
    }
  };

  const refreshStorageStatus = async (includeCounts = false) => {
    const res = await timedFetch(
      "admin/storage_status",
      `${API_BASE}/admin/storage_status${includeCounts ? "?include_counts=true" : ""}`,
      {
        credentials: "include",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
      },
    );
    if (res.ok) {
      const body = await res.json();
      setStorageStatus(body);
    }
  };

  const handleRoleChange = async () => {
    if (!roleModal) return;
    setChangingRole(true);
    setRoleMsg(null);
    try {
      const res = await timedFetch("admin/promote_user", `${API_BASE}/admin/promote_user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ user_id: roleModal.userId, target_role: targetRole }),
      });
      const body = await safeJson(res);
      if (body.success) {
        setRoleMsg({ type: "success", text: `✓ ${roleModal.email} is now ${body.user.role}.` });
        await refreshUsers();
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

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    setRoleMsg(null);
    try {
      const res = await timedFetch("admin/delete_user", `${API_BASE}/admin/delete_user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ user_id: userId }),
      });
      const body = await safeJson(res);
      if (body.success) {
        const deletedPredictions = Number(body?.deleted?.predictions_deleted || 0);
        const deletedPositions = Number(body?.deleted?.positions_deleted || 0);
        setRoleMsg({
          type: "success",
          text: `User deleted successfully. Purged ${deletedPredictions} prediction(s) and ${deletedPositions} position(s).`,
        });
        setDeleteConfirmUserId(null);
        await refreshUsers();
      } else {
        setRoleMsg({ type: "error", text: body.detail || "Failed to delete user." });
      }
    } catch {
      setRoleMsg({ type: "error", text: "Network error." });
    } finally {
      setDeletingUserId("");
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

  const openQuestions = allQuestions.filter((q) => getQuestionViewStatus(q) === "open");
  const closedQuestions = allQuestions.filter((q) => getQuestionViewStatus(q) === "closed");
  const finalizedQuestions = allQuestions.filter((q) => getQuestionViewStatus(q) === "resolved");
  const filteredQuestions: FeedQuestion[] = questionViewTab === "draft"
    ? (draftQuestions as unknown as FeedQuestion[])
    : questionViewTab === "open"
    ? openQuestions
    : questionViewTab === "closed"
    ? closedQuestions
    : questionViewTab === "resolved"
    ? finalizedQuestions
    : allQuestions;
  const now = new Date();
  const canTransitionSelectedQuestion = !!selectedQuestion && selectedQuestion.status !== "resolved" && selectedQuestion.closed_reason !== "cancelled";
  const publicAppUrl = "https://theanalyst-nine.vercel.app";
  const publicLandingUrl = `${publicAppUrl.replace(/\/$/, "")}/?public=1`;
  const apiTimingRows = Object.values(apiTimings)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);

  const copyLandingLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLandingUrl);
      setCopyMsg("Landing page link copied.");
      window.setTimeout(() => setCopyMsg(""), 2200);
    } catch {
      setCopyMsg("Copy failed. Please copy the link manually.");
      window.setTimeout(() => setCopyMsg(""), 2500);
    }
  };

  const roleBadge = (role: string) => {
    if (role === "admin") return "bg-[var(--brand)]/15 text-[var(--brand)]";
    if (role === "question_creator") return "bg-purple-500/15 text-purple-300";
    if (role === "question_creator_resolver") return "bg-teal-500/15 text-teal-300";
    return "bg-slate-700/50 text-slate-300";
  };

  // ── Creator / Creator-Resolver Dashboard ───────────────────────────────────
  if (userRole === "question_creator" || userRole === "question_creator_resolver") {
    const isResolver = userRole === "question_creator_resolver";

    // Derived counts for stats
    const myPendingQs   = myQuestions.filter((q) => q.status === "pending_approval");
    const crOpen        = allQuestions.filter((q) => getQuestionViewStatus(q) === "open");
    const crClosed      = allQuestions.filter((q) => getQuestionViewStatus(q) === "closed");
    const crResolved    = allQuestions.filter((q) => getQuestionViewStatus(q) === "resolved");

    // Resolver question list based on tab
    const crFilteredQs =
      creatorResolverTab === "open"    ? crOpen    :
      creatorResolverTab === "closed"  ? crClosed  :
      creatorResolverTab === "resolved"? crResolved:
      creatorResolverTab === "pending" ? myPendingQs.map((q) => ({ ...q, yes_percent: 50, no_percent: 50, yes_pool: 0, no_pool: 0, entry_cost: q.entry_cost, status: q.status as FeedQuestion["status"], closed_reason: undefined } as FeedQuestion)):
      allQuestions;

    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {authNotice && (
          <div className={`mb-5 rounded-xl border px-4 py-2 text-sm ${
            authNotice.tone === "success"
              ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
              : "border-amber-400/35 bg-amber-500/10 text-amber-200"
          }`}>
            {authNotice.message}
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">The Analyst</p>
            <h1 className="text-3xl font-semibold text-white">Contributor Dashboard</h1>
            <p className="text-sm text-slate-400">Signed in as <span className="text-[var(--brand)]">{adminEmail}</span></p>
          </div>
          <button
            onClick={() => { setCreateModalOpen(true); setCreateStep("form"); setCreateMsg(null); }}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            + New Question
          </button>
        </div>

        {/* Stats */}
        <section className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {isResolver ? (
            <>
              <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
                <p className="text-xs text-slate-400">Open Questions</p>
                <p className="mt-1.5 text-2xl font-semibold text-emerald-400">{crOpen.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
                <p className="text-xs text-slate-400">Closed Questions</p>
                <p className="mt-1.5 text-2xl font-semibold text-amber-400">{crClosed.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
                <p className="text-xs text-slate-400">Resolved Questions</p>
                <p className="mt-1.5 text-2xl font-semibold text-blue-400">{crResolved.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
                <p className="text-xs text-slate-400">My Pending Approvals</p>
                <p className="mt-1.5 text-2xl font-semibold text-amber-300">{myPendingQs.length}</p>
              </div>
            </>
          ) : (
            <div className="col-span-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
              <p className="text-xs text-slate-400">Pending Approvals</p>
              <p className="mt-1.5 text-2xl font-semibold text-amber-300">{myPendingQs.length}</p>
              <p className="mt-1 text-xs text-slate-500">Questions awaiting admin review before going live.</p>
            </div>
          )}
        </section>

        {/* Question Management */}
        <section className="mb-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">Question Management</h2>
            <button
              onClick={isResolver ? refreshQuestions : refreshMyQuestions}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              {(isResolver ? questionsLoading : myQuestionsLoading) ? "Loading…" : "↻ Refresh"}
            </button>
          </div>

          {resolveMsg && (
            <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${resolveMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
              {resolveMsg.text}
            </div>
          )}

          {/* Resolver: full tabs; Creator: pending only */}
          {isResolver ? (
            <>
              <div className="mb-4 grid gap-2 sm:grid-cols-5">
                {(["open","closed","resolved","all","pending"] as const).map((tab) => {
                  const counts: Record<string, number> = { open: crOpen.length, closed: crClosed.length, resolved: crResolved.length, all: allQuestions.length, pending: myPendingQs.length };
                  const labels: Record<string, string> = { open: "Open", closed: "Closed", resolved: "Resolved", all: "All", pending: "My Pending" };
                  const colors: Record<string, string> = { open: "text-emerald-400", closed: "text-amber-400", resolved: "text-blue-400", all: "text-[var(--brand)]", pending: "text-amber-300" };
                  const isActive = creatorResolverTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => { setCreatorResolverTab(tab); setSelectedQuestion(null); setConfirmResolve(null); }}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${isActive ? "admin-status-tab-active" : "admin-status-tab"}`}
                    >
                      <span className={colors[tab]}>{labels[tab]}</span>
                      <span className="admin-status-count">{counts[tab]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                {/* Question list */}
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${creatorResolverTab === "open" ? "bg-emerald-400" : creatorResolverTab === "closed" ? "bg-amber-400" : creatorResolverTab === "resolved" ? "bg-blue-400" : creatorResolverTab === "pending" ? "bg-amber-300" : "bg-[var(--brand)]"}`} />
                    <p className="text-sm font-medium text-slate-300">
                      {creatorResolverTab === "open" ? `Open (${crOpen.length})` : creatorResolverTab === "closed" ? `Closed (${crClosed.length})` : creatorResolverTab === "resolved" ? `Resolved (${crResolved.length})` : creatorResolverTab === "pending" ? `My Pending (${myPendingQs.length})` : `All (${allQuestions.length})`}
                    </p>
                  </div>
                  <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                    {crFilteredQs.length === 0 && <p className="text-xs text-slate-500">No questions in this view.</p>}
                    {crFilteredQs.map((q) => (
                      <button
                        key={q._id}
                        onClick={() => { setSelectedQuestion(q); setResolveMsg(null); setConfirmResolve(null); }}
                        className={`admin-question-item w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${selectedQuestion?._id === q._id ? "admin-question-item-active" : "border-[var(--stroke)] bg-[#0b1528] text-slate-200 hover:border-slate-500"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 font-medium">{q.title}</p>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${q.status === "open" ? "bg-emerald-500/15 text-emerald-400" : q.status === "closed" ? "bg-amber-500/15 text-amber-400" : q.status === "pending_approval" ? "bg-amber-500/15 text-amber-300" : "bg-blue-500/15 text-blue-400"}`}>
                            {q.status === "pending_approval" ? "Pending" : q.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {q.category} · {formatDate(q.closing_time ?? "")} · {q.entry_cost} pts · YES {Number(q.yes_percent ?? 50).toFixed(2)}%
                        </p>
                        {q.status === "closed" && q.closed_reason !== "cancelled" && (
                          <p className="mt-0.5 text-[11px] font-medium text-amber-400">Pending resolution</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail panel — no edit/approve/reject, only resolve */}
                {selectedQuestion && (
                  <div className="admin-detail-panel w-full rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4 lg:sticky lg:top-24 lg:w-72 lg:flex-none">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">Question Detail</h3>
                      <button onClick={() => { setSelectedQuestion(null); setConfirmResolve(null); }} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
                    </div>
                    <p className="mb-3 text-sm font-medium text-slate-200">{selectedQuestion.title}</p>
                    <div className="mb-4 space-y-1 text-xs text-slate-400">
                      <p>Category: <span className="text-slate-200">{selectedQuestion.category}</span></p>
                      <p>Entry: <span className="text-slate-200">{selectedQuestion.entry_cost} pts</span></p>
                      <p>YES pool: <span className="text-emerald-300">{selectedQuestion.yes_pool} pts</span> · NO pool: <span className="text-orange-300">{selectedQuestion.no_pool} pts</span></p>
                      <p>Split: YES {Number(selectedQuestion.yes_percent ?? 50).toFixed(2)}% / NO {Number(selectedQuestion.no_percent ?? 50).toFixed(2)}%</p>
                      <p>Status: <span className={selectedQuestion.status === "open" ? "text-emerald-400" : selectedQuestion.status === "closed" ? "text-amber-400" : "text-blue-400"}>{selectedQuestion.status}</span></p>
                      {selectedQuestion.closing_time && <p>Closes: <span className="text-slate-200">{formatDate(selectedQuestion.closing_time)}</span></p>}
                    </div>
                    {selectedQuestion.status !== "resolved" && selectedQuestion.status !== "pending_approval" && selectedQuestion.closed_reason !== "cancelled" && !confirmResolve && (
                      <div className="space-y-2">
                        <button onClick={() => setConfirmResolve({ answer: "yes" })} disabled={!!resolving} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">✓ Resolve YES</button>
                        <button onClick={() => setConfirmResolve({ answer: "no" })} disabled={!!resolving} className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50">✗ Resolve NO</button>
                      </div>
                    )}
                    {confirmResolve && (
                      <div className="rounded-xl border border-[var(--stroke)] bg-slate-800/60 p-3">
                        <p className="mb-3 text-sm text-slate-200">Resolve as <strong>{confirmResolve.answer.toUpperCase()}</strong>? This finalizes outcomes for all participants.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmResolve(null)} className="flex-1 rounded-lg border border-[var(--stroke)] py-2 text-xs text-slate-300 hover:border-slate-500">Cancel</button>
                          <button onClick={() => handleResolve(selectedQuestion._id, confirmResolve.answer)} disabled={!!resolving} className={`flex-1 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-50 ${confirmResolve.answer === "yes" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-orange-600 hover:bg-orange-500"}`}>{resolving ? "Resolving…" : "Confirm"}</button>
                        </div>
                      </div>
                    )}
                    {(selectedQuestion.status === "resolved" || selectedQuestion.status === "pending_approval") && (
                      <p className="text-xs text-slate-500">{selectedQuestion.status === "resolved" ? "This question has already been resolved." : "This question is awaiting admin approval."}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Creator: pending approvals only */
            <div className="space-y-3">
              {myPendingQs.length === 0 ? (
                <p className="text-sm text-slate-400">No questions pending review. Submit a new question to get started.</p>
              ) : myPendingQs.map((q) => (
                <div key={q._id} className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-white">{q.title}</p>
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">Pending Review</span>
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
          <div className="mb-4 rounded-xl border border-[var(--brand)]/25 bg-[var(--brand)]/10 p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--brand)]">Public Landing Page</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <a href={publicLandingUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--brand)]/40 px-3 py-1.5 text-[var(--brand)] hover:bg-[var(--brand)]/10">
                Open Public Link ↗
              </a>
              <button onClick={copyLandingLink} className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">
                Copy Link
              </button>
              {copyMsg && <span className="text-xs text-slate-400">{copyMsg}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a href={publicLandingUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Landing Page ↗</a>
            <Link href="/feed" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Feed</Link>
            <Link href="/leaderboard" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Leaderboard</Link>
            <Link href="/profile" className="rounded-lg border border-[var(--stroke)] px-4 py-2 text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">Profile</Link>
          </div>
        </section>

        {/* Create Question Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => { setCreateModalOpen(false); setCreateStep("form"); }}>
            <div className="flex w-full max-w-lg flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--surface)]" style={{maxHeight: "90vh"}} onClick={(e) => e.stopPropagation()}>
              {createStep === "form" ? (
                <>
                  <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">Submit New Question</h3>
                      <p className="mt-0.5 text-xs text-amber-400">{isResolver ? "Creator & Resolver" : "Question Creator"} — pending admin review</p>
                    </div>
                    <button onClick={() => { setCreateModalOpen(false); setCreateStep("form"); }} className="text-slate-500 hover:text-slate-300">✕</button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
                    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-300">
                      Your question goes to admin review before going live. Entry cost and starting odds are set by admin on approval.
                    </div>
                    {createMsg && (
                      <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${createMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                        {createMsg.text}
                      </div>
                    )}
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-300">Category</label>
                        <select value={createCategory} onChange={(e) => { setCreateCategory(e.target.value); setCreateVsMode(false); setCreateVsTeamA(""); setCreateVsTeamB(""); }} className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none">
                          <option>Crypto</option><option>Economy</option><option>Entertainment</option><option>General</option><option>Global events</option><option>Markets</option><option>Sports</option>
                        </select>
                      </div>
                      {createCategory === "Sports" && (
                        <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
                          <div className="mb-2.5 flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-300">Question Type</p>
                            <div className="flex rounded-lg border border-[var(--stroke)] p-0.5 text-xs">
                              <button type="button" onClick={() => { setCreateVsMode(false); setCreateVsTeamA(""); setCreateVsTeamB(""); }} className={`rounded px-3 py-1 transition-colors ${!createVsMode ? "bg-[var(--brand)]/20 text-[var(--brand)]" : "text-slate-400 hover:text-white"}`}>YES / NO</button>
                              <button type="button" onClick={() => setCreateVsMode(true)} className={`rounded px-3 py-1 transition-colors ${createVsMode ? "bg-[var(--brand)]/20 text-[var(--brand)]" : "text-slate-400 hover:text-white"}`}>VS Match</button>
                            </div>
                          </div>
                          {createVsMode ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input type="text" value={createVsTeamA} onChange={(e) => { const v = e.target.value; setCreateVsTeamA(v); setCreateQuestion(v && createVsTeamB ? `Who will win: ${v} vs ${createVsTeamB}?` : ""); }} placeholder="Team A (e.g. RCB)" className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                                <span className="text-xs font-bold text-slate-500">vs</span>
                                <input type="text" value={createVsTeamB} onChange={(e) => { const v = e.target.value; setCreateVsTeamB(v); setCreateQuestion(createVsTeamA && v ? `Who will win: ${createVsTeamA} vs ${v}?` : ""); }} placeholder="Team B (e.g. GT)" className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                              </div>
                              {createQuestion && <p className="text-[11px] text-slate-500">Title: <span className="text-slate-300">{createQuestion}</span></p>}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500">For regular sports outcomes — e.g. "Will India win the World Cup?"</p>
                          )}
                        </div>
                      )}
                      {(!createVsMode || createCategory !== "Sports") && (
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-300">Question Text</label>
                          <textarea value={createQuestion} onChange={(e) => setCreateQuestion(e.target.value)} placeholder={createCategory === "Sports" ? "e.g. Will India win the T20 World Cup?" : "e.g., Will Bitcoin reach $50k by end of Q2?"} className="h-20 w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                        </div>
                      )}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-300">Closing Date & Time</label>
                        <input type="datetime-local" value={createClosingTime} onChange={(e) => setCreateClosingTime(e.target.value)} className="date-time-input w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none" />
                      </div>
                      <LogoLibraryPicker
                        title="Question logos"
                        category={createCategory}
                        activeAssets={activeLogoAssets}
                        pendingAssets={pendingLogoAssets}
                        selectedLogoKeys={createSelectedLogoKeys}
                        selectedPendingLogoIds={createSelectedPendingLogoIds}
                        onSelectedLogoKeysChange={setCreateSelectedLogoKeys}
                        onSelectedPendingLogoIdsChange={setCreateSelectedPendingLogoIds}
                        onUploadLogo={(payload) => uploadLogoAsset(payload, "create")}
                        uploading={createLogoUploading}
                        role={userRole}
                      />
                      <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Research Data <span className="ml-1 font-normal normal-case text-slate-500">— saved and shown to users inside this question</span></p>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-300">Chart <span className="font-normal text-slate-500">(optional)</span></label>
                          <p className="mb-2 text-[11px] text-slate-500">Search by company name or ticker — results show the exact exchange. Select from the list.</p>
                          <div className="relative">
                            <div className="flex gap-2">
                              <input type="text" value={createChartSymbol} onChange={(e) => { setCreateChartSymbol(e.target.value.toUpperCase()); }} placeholder="e.g. Apple, Reliance, Bitcoin, Nifty 50…" className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                              {createChartSymbol && <button type="button" onClick={() => { setCreateChartSymbol(""); setCreateChartResults([]); }} className="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-400/60">Clear</button>}
                            </div>
                            {createChartResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-[var(--stroke)] bg-[#0b1528] shadow-xl">
                                {createChartResults.map((r) => (
                                  <button key={r.symbol} type="button" onClick={() => { setCreateChartSymbol(r.symbol); setCreateChartResults([]); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-[var(--brand)]/10">
                                    <span className="font-semibold text-[var(--brand)]">{r.symbol}</span>
                                    <span className="truncate text-slate-400">{r.description}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {createChartSymbol && createChartSymbol.includes(":") && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <p className="text-[10px] text-emerald-400">✓ Chart: {createChartSymbol}</p>
                              <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(createChartSymbol)}`} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--brand)] hover:underline">Verify on TradingView ↗</a>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-300">Research Links <span className="font-normal text-slate-500">(optional)</span></label>
                          <p className="mb-2 text-[11px] text-slate-500">Add source links users can open when researching this question.</p>
                          <div className="space-y-2">
                            {createReferenceLinks.map((link, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input type="text" value={link.label} onChange={(e) => setCreateReferenceLinks((ls) => ls.map((l, i) => i === idx ? { ...l, label: e.target.value } : l))} placeholder="Label (e.g. NSE India)" className="w-32 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                                <input type="text" value={link.url} onChange={(e) => setCreateReferenceLinks((ls) => ls.map((l, i) => i === idx ? { ...l, url: e.target.value } : l))} placeholder="https://..." className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                                <button type="button" onClick={() => setCreateReferenceLinks((ls) => ls.filter((_, i) => i !== idx))} className="shrink-0 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-400/60">Remove</button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setCreateReferenceLinks((ls) => [...ls, { label: "", url: "" }])} className="rounded-lg border border-[var(--brand)]/30 px-3 py-1.5 text-xs font-medium text-[var(--brand)] hover:border-[var(--brand)]/60 hover:bg-[var(--brand)]/5">+ Add Research Link</button>
                          </div>
                        </div>
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
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-5 flex items-center justify-between px-5 pt-5">
                    <h3 className="text-lg font-semibold text-white">Review & Submit</h3>
                    <button onClick={() => setCreateStep("form")} className="text-slate-500 hover:text-slate-300">← Back</button>
                  </div>
                  <div className="mx-5 mb-4 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-amber-300">
                    Admin will review this question and set entry cost + starting odds before it goes live.
                  </div>
                  <div className="mx-5 mb-5 space-y-3 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4 text-sm">
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Question</p><p className="mt-1 font-medium text-white">{createQuestion}</p></div>
                    <div className="flex flex-wrap gap-6">
                      <div><p className="text-xs uppercase tracking-wide text-slate-500">Category</p><p className="mt-1 text-white">{createCategory}</p></div>
                      {createVsMode && createCategory === "Sports" && <div><p className="text-xs uppercase tracking-wide text-slate-500">Type</p><p className="mt-1 text-white">{createVsTeamA} vs {createVsTeamB}</p></div>}
                      <div><p className="text-xs uppercase tracking-wide text-slate-500">Closes</p><p className="mt-1 text-white">{createClosingTime ? new Date(createClosingTime).toLocaleString() : "—"}</p></div>
                      <div><p className="text-xs uppercase tracking-wide text-slate-500">Entry Cost</p><p className="mt-1 text-slate-500 italic">Set by admin</p></div>
                    </div>
                    {createResolutionRules.trim() && <div><p className="text-xs uppercase tracking-wide text-slate-500">Resolution Rules</p><p className="mt-1 whitespace-pre-line text-slate-200">{createResolutionRules.trim()}</p></div>}
                  </div>
                  {createMsg && (
                    <div className={`mx-5 mb-4 rounded-lg border px-4 py-2.5 text-sm ${createMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                      {createMsg.text}
                    </div>
                  )}
                  <div className="flex gap-3 px-5 pb-5">
                    <button onClick={() => setCreateStep("form")} className="flex-1 rounded-lg border border-[var(--stroke)] py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white">← Edit</button>
                    <button onClick={handleCreateSubmit} disabled={createSubmitting} className="flex-1 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50">{createSubmitting ? "Submitting..." : "Submit for Review"}</button>
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
      {authNotice && (
        <div className={`mb-5 rounded-xl border px-4 py-2 text-sm ${
          authNotice.tone === "success"
            ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
            : "border-amber-400/35 bg-amber-500/10 text-amber-200"
        }`}>
          {authNotice.message}
        </div>
      )}
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs uppercase tracking-widest text-slate-500">The Analyst</p>
        <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-400">Signed in as <span className="text-[var(--brand)]">{adminEmail}</span></p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Data Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Users" value={summary?.auth_users_count ?? authUsers.length} />
          <StatCard label="Open Questions" value={openQuestions.length} />
          <StatCard label="Closed Questions" value={closedQuestions.length} />
          <StatCard label="Resolved Questions" value={finalizedQuestions.length} />
          <StatCard label="Pending Approvals" value={pendingQuestions.length} />
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

        <div className="mb-4 grid gap-2 sm:grid-cols-5">
          <button onClick={() => { setQuestionViewTab("draft"); setSelectedQuestion(null); setDraftMsg(null); }} className={`${questionViewTab === "draft" ? "admin-status-tab-active" : "admin-status-tab"} flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium`}>
            <span className="text-purple-400">Drafts</span>
            <span className="admin-status-count">{draftQuestions.length}</span>
          </button>
          <button onClick={() => setQuestionViewTab("open")} className={`${questionViewTab === "open" ? "admin-status-tab-active" : "admin-status-tab"} flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium`}>
            <span className="status-open-text">Open</span>
            <span className="admin-status-count">{openQuestions.length}</span>
          </button>
          <button onClick={() => setQuestionViewTab("closed")} className={`${questionViewTab === "closed" ? "admin-status-tab-active" : "admin-status-tab"} flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium`}>
            <span className="text-amber-500">Closed</span>
            <span className="admin-status-count">{closedQuestions.length}</span>
          </button>
          <button onClick={() => setQuestionViewTab("resolved")} className={`${questionViewTab === "resolved" ? "admin-status-tab-active" : "admin-status-tab"} flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium`}>
            <span className="text-blue-500">Resolved</span>
            <span className="admin-status-count">{finalizedQuestions.length}</span>
          </button>
          <button onClick={() => setQuestionViewTab("all")} className={`${questionViewTab === "all" ? "admin-status-tab-active" : "admin-status-tab"} flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium`}>
            <span className="admin-section-label">All</span>
            <span className="admin-status-count">{allQuestions.length}</span>
          </button>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${questionViewTab === "draft" ? "bg-purple-400" : questionViewTab === "open" ? "bg-emerald-400" : questionViewTab === "closed" ? "bg-amber-400" : questionViewTab === "resolved" ? "bg-blue-400" : "bg-[var(--brand)]"}`} />
              <p className="admin-section-label text-sm font-medium">
                {questionViewTab === "draft"
                  ? `Drafts (${draftQuestions.length})`
                  : questionViewTab === "open"
                  ? `Open (${openQuestions.length})`
                  : questionViewTab === "closed"
                  ? `Closed (${closedQuestions.length})`
                  : questionViewTab === "resolved"
                  ? `Resolved (${finalizedQuestions.length})`
                  : `All (${allQuestions.length})`}
              </p>
              <button onClick={questionViewTab === "draft" ? refreshDraftQuestions : refreshQuestions} className="admin-section-muted ml-auto text-xs hover:text-slate-300">
                {(questionViewTab === "draft" ? draftsLoading : questionsLoading) ? "..." : "↻ Refresh"}
              </button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {filteredQuestions.length === 0 && <p className="text-xs text-slate-500">No questions in this view.</p>}
              {filteredQuestions.map((q) => {
                const yesPct = Number(q.yes_percent ?? 50).toFixed(2);
                return (
                  <button
                    key={q._id}
                    onClick={() => { setSelectedQuestion(q); setResolveMsg(null); setConfirmResolve(null); }}
                    className={`admin-question-item w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${selectedQuestion?._id === q._id ? "admin-question-item-active" : "border-[var(--stroke)] bg-[#0b1528] text-slate-200 hover:border-slate-500"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 font-medium">{q.title}</p>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${q.status === "open" ? "bg-emerald-500/15 text-emerald-400" : q.status === "closed" ? "bg-amber-500/15 text-amber-400" : (q.status as string) === "draft" ? "bg-purple-500/15 text-purple-400" : "bg-blue-500/15 text-blue-400"}`}>
                        {q.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {q.category} · {formatDate(q.closing_time ?? "")} · {q.entry_cost} pts · YES {yesPct}%
                    </p>
                    {q.status === "closed" && q.closed_reason !== "cancelled" && (
                      <p className="mt-0.5 text-[11px] font-medium text-amber-400">Pending resolution</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail / action panel */}
          {selectedQuestion && (
            <div className="admin-detail-panel w-full rounded-2xl border border-[var(--stroke)] bg-[#0b1528] p-4 lg:sticky lg:top-24 lg:w-72 lg:flex-none lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">Question Detail</h3>
                <button onClick={() => { setSelectedQuestion(null); setConfirmResolve(null); }} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
              </div>
              <p className="admin-detail-strong mb-3 text-sm">{selectedQuestion.title}</p>
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
                <p>Entry cost: <span className="admin-detail-strong">{selectedQuestion.entry_cost} pts</span></p>
                <p>Closing: <span className="admin-detail-strong">{formatDate(selectedQuestion.closing_time ?? "")}</span></p>
                <p>Category: <span className="admin-detail-strong">{selectedQuestion.category || "—"}</span></p>
                <p>YES pool: <span className="admin-detail-strong">{selectedQuestion.yes_pool} pts</span> · NO pool: <span className="admin-detail-strong">{selectedQuestion.no_pool} pts</span></p>
                <p>Initial Percentage (YES %): <span className="admin-detail-strong">{Number(selectedQuestion.initial_yes_percent ?? selectedQuestion.yes_percent ?? 50).toFixed(2)}%</span> · <span className="admin-detail-strong">NO {Number(selectedQuestion.initial_no_percent ?? selectedQuestion.no_percent ?? (100 - Number(selectedQuestion.yes_percent ?? 50))).toFixed(2)}%</span></p>
                <p>Market split: <span className="text-emerald-300">YES {Number(selectedQuestion.yes_percent ?? 50).toFixed(2)}%</span> · <span className="text-orange-300">NO {Number(selectedQuestion.no_percent ?? (100 - Number(selectedQuestion.yes_percent ?? 50))).toFixed(2)}%</span></p>
                <p>Status: <span className={selectedQuestion.status === "open" ? "status-open-text" : selectedQuestion.status === "closed" ? "text-amber-400" : "text-slate-400"}>{selectedQuestion.status}</span></p>
                {selectedQuestion.closing_time && new Date(selectedQuestion.closing_time) < now && selectedQuestion.status === "open" && (
                  <p className="rounded bg-amber-500/10 px-2 py-1 text-amber-400">⚠ Past closing time</p>
                )}
              </div>

              {/* Draft actions — approve or delete */}
              {(selectedQuestion.status as string) === "draft" && (
                <div className="space-y-2">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Draft Actions</p>
                  {draftMsg && (
                    <div className={`rounded-lg border px-3 py-2 text-xs ${draftMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                      {draftMsg.text}
                    </div>
                  )}
                  <button
                    disabled={!!resolving}
                    onClick={async () => {
                      setResolving("approve_draft");
                      setDraftMsg(null);
                      try {
                        const res = await timedFetch("admin/approve_draft", `${API_BASE}/admin/approve_draft/${selectedQuestion._id}`, {
                          method: "POST",
                          credentials: "include",
                          headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
                        });
                        const body = await safeJson(res);
                        if (body.success) {
                          setDraftMsg({ type: "success", text: "Draft approved and published as Open." });
                          setSelectedQuestion(null);
                          await Promise.all([refreshDraftQuestions(), refreshQuestions()]);
                        } else {
                          setDraftMsg({ type: "error", text: String(body.detail || "Failed to approve draft.") });
                        }
                      } catch { setDraftMsg({ type: "error", text: "Network error." }); }
                      finally { setResolving(""); }
                    }}
                    className="w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                  >
                    {resolving === "approve_draft" ? "Approving…" : "✓ Approve → Publish"}
                  </button>
                  <button
                    disabled={!!resolving}
                    onClick={async () => {
                      if (!window.confirm("Delete this draft permanently?")) return;
                      setResolving("delete_draft");
                      setDraftMsg(null);
                      try {
                        const res = await timedFetch("admin/delete_question", `${API_BASE}/admin/delete_question`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) },
                          credentials: "include",
                          body: JSON.stringify({ question_id: selectedQuestion._id }),
                        });
                        const body = await safeJson(res);
                        if (body.success) {
                          setSelectedQuestion(null);
                          await refreshDraftQuestions();
                        } else {
                          setDraftMsg({ type: "error", text: String(body.detail || "Failed to delete draft.") });
                        }
                      } catch { setDraftMsg({ type: "error", text: "Network error." }); }
                      finally { setResolving(""); }
                    }}
                    className="w-full rounded-lg border border-red-500/40 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {resolving === "delete_draft" ? "Deleting…" : "Delete Draft"}
                  </button>
                </div>
              )}

              {/* Actions — delete is always available, lifecycle changes only for active questions */}
              {(selectedQuestion.status as string) !== "draft" && !confirmResolve && (
                <div className="space-y-2">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Actions</p>
                  {canTransitionSelectedQuestion && (
                    <>
                      <button onClick={() => setConfirmResolve({ answer: "yes" })} disabled={!!resolving}
                        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                        ✓ Resolve YES
                      </button>
                      <button onClick={() => setConfirmResolve({ answer: "no" })} disabled={!!resolving}
                        className="w-full rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50">
                        ✗ Resolve NO
                      </button>
                      {selectedQuestion.status === "open" && (
                        <button onClick={() => setConfirmResolve({ answer: "close" })} disabled={!!resolving}
                          className="w-full rounded-lg border border-yellow-600/50 px-3 py-2 text-sm font-medium text-yellow-300 hover:border-yellow-400 hover:text-yellow-200 disabled:opacity-50">
                          ⊘ Close Question (stop predictions)
                        </button>
                      )}
                      <button onClick={() => setConfirmResolve({ answer: "cancel" })} disabled={!!resolving}
                        className="w-full rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white disabled:opacity-50">
                        ↩ Cancel (Refund All Points)
                      </button>
                    </>
                  )}
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete this question and related records? This cannot be undone.")) return;
                      setResolving("delete");
                      setResolveMsg(null);
                      try {
                        const res = await timedFetch("admin/delete_question", `${API_BASE}/admin/delete_question`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
                          },
                          credentials: "include",
                          body: JSON.stringify({ question_id: selectedQuestion._id }),
                        });
                        const body = await safeJson(res);
                        if (body.success) {
                          const deletedPredictions = Number(body?.deleted?.predictions_deleted || 0);
                          const deletedPositions = Number(body?.deleted?.positions_deleted || 0);
                          setResolveMsg({ type: "success", text: `Question deleted. Removed ${deletedPredictions} prediction(s) and ${deletedPositions} position(s).` });
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
              {confirmResolve && canTransitionSelectedQuestion && (
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
                          const closingTimeFormatted = formatDateTimeLocal(selectedQuestion.closing_time);
                          setEditQuestionClosingTime(closingTimeFormatted);
                          setEditQuestionClosingTimeSeed(closingTimeFormatted);
                          setEditQuestionRules(selectedQuestion.resolution_rules || "");
                          setEditQuestionInitialYes(String(Number(selectedQuestion.initial_yes_percent ?? selectedQuestion.yes_percent ?? 50)));
                          const metadataText = selectedQuestion.metadata ? JSON.stringify(selectedQuestion.metadata, null, 2) : "";
                          setEditQuestionMetadata(metadataText);
                          setEditQuestionMetadataSeed(metadataText);
                          const meta = (selectedQuestion.metadata || {}) as Record<string, unknown>;
                          setEditChartSymbol(typeof meta.chart_symbol === "string" ? meta.chart_symbol : "");
                          setEditReferenceLinks(Array.isArray(meta.reference_links) ? (meta.reference_links as RefLink[]) : []);
                          setEditSelectedLogoKeys(Array.isArray(selectedQuestion.logo_keys) ? selectedQuestion.logo_keys : []);
                          setEditSelectedPendingLogoIds(Array.isArray(selectedQuestion.pending_logo_ids) ? selectedQuestion.pending_logo_ids : []);
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
                      <label className="text-xs font-medium text-slate-300">Initial Percentage (YES %) <span className="text-slate-500 font-normal">(baseline split)</span></label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        step={0.1}
                        value={editQuestionInitialYes}
                        onChange={(e) => setEditQuestionInitialYes(e.target.value)}
                        className="w-full rounded-xl border border-[var(--brand)]/50 bg-[#0d1b2e] px-3 py-2 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-500">Initial NO %: {(100 - Number(editQuestionInitialYes || 50)).toFixed(2)}% · This updates the starting baseline</p>
                      <label className="text-xs font-medium text-slate-300">Closing Date & Time</label>
                      <input
                        type="datetime-local"
                        value={editQuestionClosingTime}
                        onChange={(e) => setEditQuestionClosingTime(e.target.value)}
                        className="date-time-input w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                      />
                      <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Research Data <span className="ml-1 font-normal normal-case text-slate-500">— saved and shown to users inside this question</span></p>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-300">Chart <span className="font-normal text-slate-500">(optional)</span></label>
                          <p className="mb-2 text-[11px] text-slate-500">Search by company name or ticker — results show the exact exchange. Select from the list.</p>
                          <div className="relative">
                            <div className="flex gap-2">
                              <input type="text" value={editChartSymbol} onChange={(e) => setEditChartSymbol(e.target.value.toUpperCase())} placeholder="e.g. Apple, Reliance, Bitcoin, Nifty 50…" className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                              {editChartSymbol && <button type="button" onClick={() => { setEditChartSymbol(""); setEditChartResults([]); }} className="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-400/60">Clear</button>}
                            </div>
                            {editChartResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-[var(--stroke)] bg-[#0b1528] shadow-xl">
                                {editChartResults.map((r) => (
                                  <button key={r.symbol} type="button" onClick={() => { setEditChartSymbol(r.symbol); setEditChartResults([]); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-[var(--brand)]/10">
                                    <span className="font-semibold text-[var(--brand)]">{r.symbol}</span>
                                    <span className="truncate text-slate-400">{r.description}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {editChartSymbol && editChartSymbol.includes(":") && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <p className="text-[10px] text-emerald-400">✓ Chart: {editChartSymbol}</p>
                              <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(editChartSymbol)}`} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--brand)] hover:underline">Verify on TradingView ↗</a>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-300">Research Links <span className="font-normal text-slate-500">(optional)</span></label>
                          <p className="mb-2 text-[11px] text-slate-500">Add source links users can open when researching this question.</p>
                          <div className="space-y-2">
                            {editReferenceLinks.map((link, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input type="text" value={link.label} onChange={(e) => setEditReferenceLinks((ls) => ls.map((l, i) => i === idx ? { ...l, label: e.target.value } : l))} placeholder="Label (e.g. NSE India)" className="w-32 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                                <input type="text" value={link.url} onChange={(e) => setEditReferenceLinks((ls) => ls.map((l, i) => i === idx ? { ...l, url: e.target.value } : l))} placeholder="https://..." className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                                <button type="button" onClick={() => setEditReferenceLinks((ls) => ls.filter((_, i) => i !== idx))} className="shrink-0 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-400/60">Remove</button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setEditReferenceLinks((ls) => [...ls, { label: "", url: "" }])} className="rounded-lg border border-[var(--brand)]/30 px-3 py-1.5 text-xs font-medium text-[var(--brand)] hover:border-[var(--brand)]/60 hover:bg-[var(--brand)]/5">+ Add Research Link</button>
                          </div>
                        </div>
                      </div>
                      <label className="text-xs font-medium text-slate-300">Resolution Rules</label>
                      <textarea
                        value={editQuestionRules}
                        onChange={(e) => setEditQuestionRules(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none"
                        placeholder="Describe YES and NO conditions..."
                      />
                      <LogoLibraryPicker
                        title="Question logos"
                        category={editQuestionCategory}
                        activeAssets={activeLogoAssets}
                        pendingAssets={pendingLogoAssets}
                        selectedLogoKeys={editSelectedLogoKeys}
                        selectedPendingLogoIds={editSelectedPendingLogoIds}
                        onSelectedLogoKeysChange={setEditSelectedLogoKeys}
                        onSelectedPendingLogoIdsChange={setEditSelectedPendingLogoIds}
                        onUploadLogo={(payload) => uploadLogoAsset(payload, "edit")}
                        uploading={editLogoUploading}
                        role={userRole}
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
                            const closingTimeChanged = editQuestionClosingTime !== editQuestionClosingTimeSeed;
                            if (closingTimeChanged && !editQuestionClosingTime) {
                              setEditQuestionMsg({ type: "error", text: "Closing time is required" });
                              return;
                            }
                            const initialYes = Number(editQuestionInitialYes);
                            if (!Number.isFinite(initialYes) || initialYes < 1 || initialYes > 99) {
                              setEditQuestionMsg({ type: "error", text: "Initial YES % must be between 1 and 99" });
                              return;
                            }

                            const builtMetadata: Record<string, unknown> = {};
                            if (editChartSymbol.trim()) builtMetadata.chart_symbol = editChartSymbol.trim();
                            const validLinks = editReferenceLinks.filter((l) => l.url.trim());
                            if (validLinks.length > 0) builtMetadata.reference_links = validLinks;
                            const parsedMetadata = Object.keys(builtMetadata).length > 0 ? builtMetadata : {};
                            const metadataChanged = true;

                            setEditQuestionSubmitting(true);
                            setEditQuestionMsg(null);
                            try {
                              const res = await timedFetch("admin/edit_question", `${API_BASE}/admin/edit_question`, {
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
                                  ...(closingTimeChanged ? { closing_time: new Date(editQuestionClosingTime).toISOString() } : {}),
                                  resolution_rules: editQuestionRules.trim(),
                                  initial_yes_percent: initialYes,
                                  logo_keys: editSelectedLogoKeys,
                                  pending_logo_ids: editSelectedPendingLogoIds,
                                  ...(metadataChanged ? { metadata: parsedMetadata || {} } : {}),
                                }),
                              });
                              const body = await safeJson(res);
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
                                    initial_yes_percent: initialYes,
                                    initial_no_percent: Math.round((100 - initialYes) * 100) / 100,
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


      {/* ─── AI Draft Import ──────────────────────────────── */}
      <section className="mb-8 rounded-2xl border border-purple-500/30 bg-[var(--surface)] p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white">AI Draft Import</h2>
          <p className="mt-1 text-xs text-slate-400">
            Paste JSON generated by ChatGPT / Claude chat. Accepts one question object <code className="text-purple-300">{"{...}"}</code> or an array <code className="text-purple-300">{"[{...}]"}</code>.
            Questions are saved as <span className="text-purple-300">Drafts</span> — not published until you approve them.
          </p>
        </div>

        <div className="mb-3 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3 text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-300">Required fields per question:</p>
          <p><code className="text-purple-300">question_text</code> · <code className="text-purple-300">category</code> (Crypto / Markets / Economy / Sports / Entertainment / Global Events / General) · <code className="text-purple-300">closing_time</code> (ISO 8601)</p>
          <p className="text-slate-500">Optional: <code>entry_cost</code> (100 / 200 / 500 / 800, default 500) · <code>initial_probability</code> (0–1, default 0.5) · <code>resolution_rules</code> · <code>chart_symbol</code> (e.g. <code>"BTCUSDT"</code>) · <code>logo_url</code> (direct image URL) · <code>reference_links</code> (array of <code>{"{label, url}"}</code>)</p>
          <p className="mt-1 text-slate-500 italic">Prompt for ChatGPT / Claude: "Generate 5 prediction market questions as a JSON array. Fields: question_text, category, closing_time (ISO 8601), entry_cost, initial_probability (0–1), resolution_rules, chart_symbol (optional ticker), logo_url (optional image URL), reference_links (optional array of {"{label, url}"})."</p>
        </div>

        <textarea
          value={aiDraftJson}
          onChange={(e) => { setAiDraftJson(e.target.value); setAiDraftValidated(null); setAiDraftValidationError(null); setAiDraftMsg(null); }}
          rows={10}
          placeholder={'[\n  {\n    "question_text": "Will Bitcoin close above $100,000 by Dec 31, 2026?",\n    "category": "Crypto",\n    "closing_time": "2026-12-31T00:00:00Z",\n    "entry_cost": 500,\n    "initial_probability": 0.55,\n    "resolution_rules": "YES if BTC/USD closing price >= $100,000 on Binance on Dec 31, 2026.",\n    "chart_symbol": "BTCUSDT",\n    "logo_url": "https://example.com/btc-logo.png",\n    "reference_links": [\n      { "label": "CoinGecko BTC", "url": "https://www.coingecko.com/en/coins/bitcoin" }\n    ]\n  }\n]'}
          className="mb-3 w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none"
        />

        {aiDraftValidationError && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {aiDraftValidationError}
          </div>
        )}

        {aiDraftValidated && (
          <div className="mb-3 rounded-xl border border-purple-500/30 bg-purple-500/5 px-3 py-2 text-xs text-slate-300">
            <p className="mb-1 font-medium text-purple-300">{aiDraftValidated.length} question(s) validated — ready to save as drafts:</p>
            <ul className="space-y-1 text-slate-400">
              {aiDraftValidated.map((q, i) => {
                const qr = q as Record<string, unknown>;
                const extras: string[] = [];
                if (qr.chart_symbol) extras.push(`chart: ${String(qr.chart_symbol)}`);
                if (qr.logo_url) extras.push("logo ✓");
                const links = Array.isArray(qr.reference_links) ? qr.reference_links.length : 0;
                if (links > 0) extras.push(`${links} link${links > 1 ? "s" : ""}`);
                return (
                  <li key={i}>
                    <span className="truncate">{i + 1}. [{String(qr.category ?? "—")}] {String(qr.question_text ?? "").slice(0, 80)}</span>
                    {extras.length > 0 && <span className="ml-2 text-purple-400/70">[{extras.join(", ")}]</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {aiDraftMsg && (
          <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${aiDraftMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
            {aiDraftMsg.text}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setAiDraftValidated(null);
              setAiDraftValidationError(null);
              setAiDraftMsg(null);
              if (!aiDraftJson.trim()) { setAiDraftValidationError("Paste some JSON first."); return; }
              try {
                let parsed = JSON.parse(aiDraftJson.trim());
                if (!Array.isArray(parsed)) parsed = [parsed];
                if (parsed.length === 0) { setAiDraftValidationError("No questions found in JSON."); return; }
                if (parsed.length > 50) { setAiDraftValidationError("Maximum 50 questions per import."); return; }
                const errors: string[] = [];
                for (let i = 0; i < parsed.length; i++) {
                  const q = parsed[i] as Record<string, unknown>;
                  if (!q.question_text) errors.push(`Item ${i + 1}: missing question_text`);
                  if (!q.category) errors.push(`Item ${i + 1}: missing category`);
                  if (!q.closing_time) errors.push(`Item ${i + 1}: missing closing_time`);
                }
                if (errors.length > 0) { setAiDraftValidationError(errors.join(" · ")); return; }
                setAiDraftValidated(parsed as Record<string, unknown>[]);
              } catch (e) {
                setAiDraftValidationError(`Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`);
              }
            }}
            className="rounded-lg border border-purple-500/40 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-500/10"
          >
            Validate JSON
          </button>
          <button
            disabled={!aiDraftValidated || aiDraftSaving}
            onClick={async () => {
              if (!aiDraftValidated) return;
              setAiDraftSaving(true);
              setAiDraftMsg(null);
              try {
                const res = await timedFetch("admin/import_drafts", `${API_BASE}/admin/import_drafts`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) },
                  credentials: "include",
                  body: JSON.stringify({ questions: aiDraftValidated, source: "manual_ai_import" }),
                });
                const body = await safeJson(res);
                if (body.success) {
                  const created = Number(body.created_count ?? 0);
                  const errCount = Number(body.error_count ?? 0);
                  setAiDraftMsg({ type: errCount === 0 ? "success" : "error", text: `Saved ${created} draft(s) successfully.${errCount > 0 ? ` ${errCount} failed — check JSON.` : ""}` });
                  setAiDraftJson("");
                  setAiDraftValidated(null);
                  setQuestionViewTab("draft");
                  await refreshDraftQuestions();
                } else {
                  setAiDraftMsg({ type: "error", text: String(body.detail || "Import failed.") });
                }
              } catch { setAiDraftMsg({ type: "error", text: "Network error." }); }
              finally { setAiDraftSaving(false); }
            }}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-40"
          >
            {aiDraftSaving ? "Saving…" : "Save as Drafts"}
          </button>
          {(aiDraftJson || aiDraftValidated) && (
            <button
              onClick={() => { setAiDraftJson(""); setAiDraftValidated(null); setAiDraftValidationError(null); setAiDraftMsg(null); }}
              className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">API Timings</h2>
          <span className="text-[11px] text-slate-500">Latest admin calls</span>
        </div>
        {apiTimingRows.length === 0 ? (
          <p className="text-xs text-slate-500">No timing samples yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--stroke)] text-left text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Endpoint</th>
                  <th className="pb-2 pr-4 font-medium">Latency</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {apiTimingRows.map((row) => (
                  <tr key={row.endpoint} className="border-b border-[var(--stroke)]/60 text-slate-300">
                    <td className="py-2 pr-4 text-slate-200">{row.endpoint}</td>
                    <td className="py-2 pr-4">
                      <span className={row.ms >= 500 ? "text-amber-300" : "text-emerald-300"}>{row.ms.toFixed(2)} ms</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-400">{row.source}</td>
                    <td className="py-2 pr-4 text-slate-400">{row.status ?? "-"}</td>
                    <td className="py-2 text-slate-500">{new Date(row.updatedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending Approvals */}
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
            {pendingLoading ? (
              <p className="text-sm text-slate-500">Loading pending questions...</p>
            ) : pendingQuestions.length === 0 ? (
              <p className="text-sm text-slate-500">No pending questions from contributors right now.</p>
            ) : pendingQuestions.map((q) => (
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
                    <div className="mt-2 flex flex-wrap items-end gap-3">
                      <label className="text-[11px] text-slate-400">
                        Initial YES %
                        <input
                          type="number"
                          min={1}
                          max={99}
                          step={0.1}
                          value={pendingInitialYes[q._id] ?? String(Number(q.initial_yes_percent ?? q.yes_percent ?? 50))}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPendingInitialYes((prev) => ({ ...prev, [q._id]: value }));
                          }}
                          className="mt-1 block w-28 rounded-md border border-[var(--stroke)] bg-[#091224] px-2 py-1 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                        />
                      </label>
                      <div className="text-[11px] text-slate-500">
                        Initial NO %: {(
                          100 - Number(pendingInitialYes[q._id] ?? q.initial_yes_percent ?? q.yes_percent ?? 50)
                        ).toFixed(2)}%
                      </div>
                    </div>
                    {pendingEditId === q._id && (
                      <div className="mt-3 grid gap-2 rounded-lg border border-[var(--stroke)] bg-[#091224] p-3">
                        <input
                          value={pendingEditQuestionText}
                          onChange={(e) => setPendingEditQuestionText(e.target.value)}
                          className="w-full rounded-md border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                          placeholder="Question text"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={pendingEditCategory}
                            onChange={(e) => setPendingEditCategory(e.target.value)}
                            className="w-full rounded-md border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                          >
                            <option>Crypto</option>
                            <option>Economy</option>
                            <option>Entertainment</option>
                            <option>General</option>
                            <option>Global events</option>
                            <option>Markets</option>
                            <option>Sports</option>
                          </select>
                          <input
                            type="number"
                            min={50}
                            value={pendingEditEntryCost}
                            onChange={(e) => setPendingEditEntryCost(e.target.value)}
                            className="w-full rounded-md border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                            placeholder="Entry cost"
                          />
                        </div>
                        <input
                          type="datetime-local"
                          value={pendingEditClosingTime}
                          onChange={(e) => setPendingEditClosingTime(e.target.value)}
                          className="date-time-input w-full rounded-md border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                        />
                        <textarea
                          value={pendingEditRules}
                          onChange={(e) => setPendingEditRules(e.target.value)}
                          rows={2}
                          className="w-full rounded-md border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white focus:border-[var(--brand)] focus:outline-none"
                          placeholder="Resolution rules"
                        />
                        <LogoLibraryPicker
                          title="Question logos"
                          category={pendingEditCategory}
                          activeAssets={activeLogoAssets}
                          pendingAssets={pendingLogoAssets}
                          selectedLogoKeys={pendingEditSelectedLogoKeys}
                          selectedPendingLogoIds={pendingEditSelectedPendingLogoIds}
                          onSelectedLogoKeysChange={setPendingEditSelectedLogoKeys}
                          onSelectedPendingLogoIdsChange={setPendingEditSelectedPendingLogoIds}
                          onUploadLogo={(payload) => uploadLogoAsset(payload, "pending")}
                          uploading={pendingLogoUploading}
                          role={userRole}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPendingEditId(null)}
                            className="flex-1 rounded-md border border-[var(--stroke)] px-2 py-1.5 text-xs text-slate-300 hover:text-white"
                          >
                            Cancel Edit
                          </button>
                          <button
                            onClick={() => handleSavePendingEdit(q)}
                            disabled={pendingEditSubmitting}
                            className="flex-1 rounded-md bg-[var(--brand)] px-2 py-1.5 text-xs font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
                          >
                            {pendingEditSubmitting ? "Saving..." : "Save Pending Edit"}
                          </button>
                        </div>
                      </div>
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
                          onClick={() => handleStartPendingEdit(q)}
                          className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => handleApproveQuestion(
                            q._id,
                            pendingEditId === q._id
                              ? {
                                  question_text: pendingEditQuestionText.trim() || undefined,
                                  category: pendingEditCategory || undefined,
                                  entry_cost: Number.isFinite(Number(pendingEditEntryCost)) ? Number(pendingEditEntryCost) : undefined,
                                  closing_time: pendingEditClosingTime ? new Date(pendingEditClosingTime).toISOString() : undefined,
                                  resolution_rules: pendingEditRules.trim() || undefined,
                                  logo_keys: pendingEditSelectedLogoKeys,
                                  pending_logo_ids: pendingEditSelectedPendingLogoIds,
                                }
                              : undefined,
                          )}
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="admin-section-muted text-xs font-semibold uppercase tracking-wide">Storage Status</p>
              <div className="flex gap-2">
                <button
                  onClick={() => refreshStorageStatus(false)}
                  className="rounded border border-[var(--stroke)] px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
                >
                  Load
                </button>
                <button
                  onClick={() => refreshStorageStatus(true)}
                  className="rounded border border-[var(--stroke)] px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
                >
                  Load + Counts
                </button>
              </div>
            </div>
            {storageStatus ? (
              <div className="space-y-1 text-sm text-slate-300">
                <p>Mode: <span className="text-white">{storageStatus.storage_mode}</span></p>
                <p>Hosting: <span className={storageStatus.hosting_active ? "text-emerald-400" : "text-amber-400"}>{storageStatus.hosting_provider === "railway" ? "Railway online" : "Online"}</span></p>
                <p>Backend API: <span className={storageStatus.backend_api_status === "online" ? "text-emerald-400" : "text-amber-400"}>{storageStatus.backend_api_status || "unknown"}</span></p>
                <p>PostgreSQL: <span className={storageStatus.postgres_status === "connected" ? "text-emerald-400" : storageStatus.postgres_status === "inactive" ? "text-slate-300" : "text-amber-400"}>{storageStatus.postgres_status || "unknown"}</span></p>
                {storageStatus.error && <p className="text-red-400">{storageStatus.error}</p>}
              </div>
            ) : (
              <p className="admin-section-muted text-sm">Storage details unavailable.</p>
            )}
            <div className="mt-3 space-y-2 border-t border-[var(--stroke)] pt-3 text-sm">
              <p className="admin-section-muted text-xs font-semibold uppercase tracking-wide">Live Services</p>
              <a href={`${storageStatus?.backend_base_url || API_BASE}/health`} target="_blank" rel="noreferrer" className="admin-quick-link flex items-center justify-between rounded-lg border px-3 py-2 text-xs hover:border-slate-500">
                <span className="admin-quick-link-title">Backend API</span>
                <span className="text-emerald-500">↗ /health</span>
              </a>
              <a href={storageStatus?.api_docs_url || `${API_BASE}/docs`} target="_blank" rel="noreferrer" className="admin-quick-link flex items-center justify-between rounded-lg border px-3 py-2 text-xs hover:border-slate-500">
                <span className="admin-quick-link-title">API Docs (Swagger)</span>
                <span className="admin-quick-link-meta">↗ /docs</span>
              </a>
              <a href={publicLandingUrl} target="_blank" rel="noreferrer" className="admin-quick-link flex items-center justify-between rounded-lg border px-3 py-2 text-xs hover:border-slate-500">
                <span className="admin-quick-link-title">Public Landing Page (Vercel)</span>
                <span className="admin-quick-link-meta">↗ live site</span>
              </a>
              <div className="admin-quick-link rounded-lg border px-3 py-3 text-xs">
                <p className="admin-quick-link-title font-semibold">Final Public App Link</p>
                <a href={publicLandingUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[var(--brand)] hover:underline">
                  {publicLandingUrl}
                </a>
                <p className="admin-quick-link-meta mt-1">Use this same live link for browsing, signup, and login.</p>
              </div>
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

      {/* ─── Logo Library Management ─────────────────────── */}
      <section className="mb-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Logo Library</h2>
            <p className="text-sm text-slate-400">Manage active logos. Deactivate removes a logo from all question cards immediately.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refreshLogoAssets()} className="text-xs text-slate-500 hover:text-slate-300">↻ Refresh</button>
            <button
              onClick={() => { setAddLogoOpen((v) => !v); setLogoLibraryMsg(null); }}
              className="rounded border border-indigo-500/40 px-3 py-1 text-xs text-indigo-400 hover:bg-indigo-500/10"
            >
              {addLogoOpen ? "Cancel" : "+ Add Logo"}
            </button>
          </div>
        </div>
        {addLogoOpen && (
          <div className="mb-4 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Add Logo to Library</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Display Name *</label>
                <input
                  type="text"
                  value={addLogoName}
                  onChange={(e) => setAddLogoName(e.target.value)}
                  placeholder="e.g. Apple"
                  className="w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Category</label>
                <select
                  value={addLogoCategory}
                  onChange={(e) => setAddLogoCategory(e.target.value)}
                  className="w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option>Crypto</option><option>Economy</option><option>Entertainment</option><option>General</option><option>Global events</option><option>Markets</option><option>Sports</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Upload File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { setAddLogoFile(e.target.files?.[0] ?? null); setAddLogoUrl(""); }}
                  className="w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-indigo-600 file:px-2 file:py-1 file:text-xs file:text-white"
                />
                <p className="mt-1 text-center text-[11px] text-slate-500">— or —</p>
                <input
                  type="url"
                  value={addLogoUrl}
                  onChange={(e) => { setAddLogoUrl(e.target.value); setAddLogoFile(null); }}
                  placeholder="Paste image URL (https://...)"
                  className="mt-1 w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Logo Key (optional)</label>
                <input
                  type="text"
                  value={addLogoKey}
                  onChange={(e) => setAddLogoKey(e.target.value)}
                  placeholder="e.g. nasdaq (auto-generated if blank)"
                  className="w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddLogoToLibrary}
                  disabled={addLogoSubmitting || !addLogoName.trim() || (!addLogoFile && !addLogoUrl.trim())}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  {addLogoSubmitting ? "Adding…" : "Add to Library"}
                </button>
              </div>
            </div>
          </div>
        )}
        {logoLibraryMsg && (
          <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${logoLibraryMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
            {logoLibraryMsg.text}
          </div>
        )}
        <input
          type="text"
          value={logoLibrarySearch}
          onChange={(e) => setLogoLibrarySearch(e.target.value)}
          placeholder="Search by name or key…"
          className="mb-3 w-full rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {activeLogoAssets.length === 0 ? (
          <p className="text-sm text-slate-400">No active logos in the library.</p>
        ) : (
          <div className="max-h-[260px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--surface)]">
                <tr className="border-b border-[var(--stroke)] text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Logo</th>
                  <th className="pb-2 pr-4">Key</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--stroke)]">
                {activeLogoAssets
                  .filter((a) => {
                    const q = logoLibrarySearch.trim().toLowerCase();
                    return !q || a.display_name.toLowerCase().includes(q) || a.logo_key.toLowerCase().includes(q);
                  })
                  .map((asset) => (
                  <tr key={asset.id} className="text-slate-300">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <img src={resolveLogoImageUrl(asset.image_url)} alt={asset.display_name} className="h-8 w-8 rounded bg-white object-contain p-0.5" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
                        <span className="text-white">{asset.display_name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-400">{asset.logo_key}</td>
                    <td className="py-2 pr-4 text-slate-400">{asset.category}</td>
                    <td className="py-2">
                      {editingLogoId === asset.id ? (
                        <div className="space-y-1.5">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => { setEditingLogoFile(e.target.files?.[0] ?? null); setEditingLogoUrl(""); }}
                            className="w-full rounded border border-[var(--stroke)] bg-[var(--surface)] px-2 py-1 text-xs text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-indigo-600 file:px-2 file:py-0.5 file:text-xs file:text-white"
                          />
                          <p className="text-center text-[10px] text-slate-500">— or paste URL —</p>
                          <input
                            type="url"
                            value={editingLogoUrl}
                            onChange={(e) => { setEditingLogoUrl(e.target.value); setEditingLogoFile(null); }}
                            placeholder="https://..."
                            className="w-full rounded border border-[var(--stroke)] bg-[var(--surface)] px-2 py-1 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditLogo(asset.id)}
                              disabled={!editingLogoFile && !editingLogoUrl.trim()}
                              className="flex-1 rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
                            >Save</button>
                            <button
                              onClick={() => { setEditingLogoId(null); setEditingLogoUrl(""); setEditingLogoFile(null); }}
                              className="rounded border border-[var(--stroke)] px-2 py-1 text-xs text-slate-400 hover:text-white"
                            >✕</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditingLogoId(asset.id); setEditingLogoUrl(""); setEditingLogoFile(null); }}
                            className="rounded border border-indigo-500/30 px-2 py-1 text-xs text-indigo-400 hover:bg-indigo-500/10"
                          >Edit</button>
                          <button
                            onClick={() => moderateLogoAsset("deactivate", asset.id)}
                            className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                          >Deactivate</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pendingLogoAssets.length > 0 && (
          <div className="mt-5 border-t border-[var(--stroke)] pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Approval ({pendingLogoAssets.length})</p>
            <div className="space-y-2">
              {pendingLogoAssets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-3 rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-2">
                  <img src={resolveLogoImageUrl(asset.image_url)} alt={asset.display_name} className="h-8 w-8 rounded bg-white object-contain p-0.5" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{asset.display_name}</p>
                    <p className="text-[11px] text-slate-400">{asset.logo_key} · {asset.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => moderateLogoAsset("approve", asset.id)} className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10">Approve</button>
                    <button onClick={() => moderateLogoAsset("reject", asset.id)} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── Auth users table ──────────────────────────────── */}
      <section className="mb-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Registered Auth Accounts ({authUsers.length})</h2>

        {(adminMsg || roleMsg) && (
          <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${(roleMsg || adminMsg)?.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
            {(roleMsg || adminMsg)?.text}
          </div>
        )}

        {authUsers.length === 0 ? (
          <p className="text-sm text-slate-400">No auth accounts found.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--surface)]">
                <tr className="border-b border-[var(--stroke)] text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Participation</th>
                  <th className="pb-2 pr-4">Theme</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--stroke)]">
                {authUsers.map((u) => (
                  <tr key={u.id} className="text-slate-300">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-white">@{u.username || "user"}</p>
                      <p className="text-xs text-slate-400">@{u.username || "user"} · {u.email}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-400">
                      <p>{u.prediction_count || 0} predictions</p>
                      <p>{u.leaderboard_eligible ? "Eligible" : "Not on leaderboard"}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-400">{u.theme_preference || "dark"}</td>
                    <td className="py-2.5 pr-4 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => openRoleModal(u)}
                          className="text-xs text-[var(--brand)] hover:text-white"
                        >
                          Change Role
                        </button>
                        {deleteConfirmUserId === u.id ? (
                          <>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={deletingUserId === u.id}
                              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60"
                            >
                              {deletingUserId === u.id ? "Deleting..." : "Confirm Delete"}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmUserId(null)}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmUserId(u.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete User
                          </button>
                        )}
                      </div>
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
                <option value="question_creator">Question Creator — can create questions (pending review)</option>
                <option value="question_creator_resolver">Creator & Resolver — can create (pending review) and resolve questions</option>
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
            <p className="text-slate-400">Code changes are committed to GitHub and deployed via Vercel (frontend) and Railway (backend API). Frontend: <a href="https://theanalyst-nine.vercel.app" target="_blank" rel="noreferrer" className="text-[var(--brand)] hover:underline">theanalyst-nine.vercel.app</a> · API: <span className="text-slate-300">{API_BASE}</span></p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4">
            <p className="font-semibold text-[var(--brand)]">PostgreSQL (Data Layer)</p>
            <p className="text-slate-400">PostgreSQL is the persistent database for all platform data — users, questions, predictions, balances, outcomes, and audit logs. It stores every event and acts as the authoritative data store for the platform. Used for auth, leaderboard scores, and complete audit trails.</p>
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
          <a href={publicLandingUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-4 py-2 text-[var(--brand)] hover:bg-[var(--brand)]/20">
            🌐 Public Landing Page ↗
          </a>
          <Link href="/test" className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 px-4 py-2 text-[var(--brand)] hover:bg-[var(--brand)]/20">
            🧪 System Test Page
          </Link>
          <Link href="/feed" className="admin-nav-link rounded-lg border border-[var(--stroke)] px-4 py-2 hover:border-[var(--brand)] hover:text-[var(--brand)]">Feed</Link>
          <Link href="/leaderboard" className="admin-nav-link rounded-lg border border-[var(--stroke)] px-4 py-2 hover:border-[var(--brand)] hover:text-[var(--brand)]">Leaderboard</Link>
          <Link href="/profile" className="admin-nav-link rounded-lg border border-[var(--stroke)] px-4 py-2 hover:border-[var(--brand)] hover:text-[var(--brand)]">Profile</Link>
          <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" className="admin-nav-link rounded-lg border border-[var(--stroke)] px-4 py-2 hover:border-[var(--brand)] hover:text-[var(--brand)]">
            API Docs ↗
          </a>
        </div>
      </section>

      {/* Create Question Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => { setCreateModalOpen(false); setCreateStep("form"); }}>
          <div className="flex w-full max-w-lg flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--surface)]" style={{maxHeight: "90vh"}} onClick={(e) => e.stopPropagation()}>
            {createStep === "form" ? (
              <>
                <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-4">
                  <h3 className="text-base font-semibold text-white">Publish New Question</h3>
                  <button onClick={() => { setCreateModalOpen(false); setCreateStep("form"); }} className="text-slate-500 hover:text-slate-300">✕</button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
                {createMsg && (
                  <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${createMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                    {createMsg.text}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Category</label>
                    <select value={createCategory} onChange={(e) => { setCreateCategory(e.target.value); setCreateVsMode(false); setCreateVsTeamA(""); setCreateVsTeamB(""); }} className="w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none">
                      <option>Crypto</option><option>Economy</option><option>Entertainment</option><option>General</option><option>Global events</option><option>Markets</option><option>Sports</option>
                    </select>
                  </div>
                  {createCategory === "Sports" && (
                    <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-3">
                      <div className="mb-2.5 flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-300">Question Type</p>
                        <div className="flex rounded-lg border border-[var(--stroke)] p-0.5 text-xs">
                          <button type="button" onClick={() => { setCreateVsMode(false); setCreateVsTeamA(""); setCreateVsTeamB(""); }} className={`rounded px-3 py-1 transition-colors ${!createVsMode ? "bg-[var(--brand)]/20 text-[var(--brand)]" : "text-slate-400 hover:text-white"}`}>YES / NO</button>
                          <button type="button" onClick={() => setCreateVsMode(true)} className={`rounded px-3 py-1 transition-colors ${createVsMode ? "bg-[var(--brand)]/20 text-[var(--brand)]" : "text-slate-400 hover:text-white"}`}>VS Match</button>
                        </div>
                      </div>
                      {createVsMode ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input type="text" value={createVsTeamA} onChange={(e) => { const v = e.target.value; setCreateVsTeamA(v); setCreateQuestion(v && createVsTeamB ? `Who will win: ${v} vs ${createVsTeamB}?` : ""); }} placeholder="Team A (e.g. RCB)" className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                            <span className="text-xs font-bold text-slate-500">vs</span>
                            <input type="text" value={createVsTeamB} onChange={(e) => { const v = e.target.value; setCreateVsTeamB(v); setCreateQuestion(createVsTeamA && v ? `Who will win: ${createVsTeamA} vs ${v}?` : ""); }} placeholder="Team B (e.g. GT)" className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                          </div>
                          {createQuestion && <p className="text-[11px] text-slate-500">Title: <span className="text-slate-300">{createQuestion}</span></p>}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">For regular sports outcomes — e.g. "Will India win the World Cup?"</p>
                      )}
                    </div>
                  )}
                  {(!createVsMode || createCategory !== "Sports") && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-300">Question Text</label>
                      <textarea value={createQuestion} onChange={(e) => setCreateQuestion(e.target.value)} placeholder={createCategory === "Sports" ? "e.g. Will India win the T20 World Cup?" : "e.g., Will Bitcoin reach $50k by end of Q2?"} className="h-20 w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                    </div>
                  )}
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
                    <input type="datetime-local" value={createClosingTime} onChange={(e) => setCreateClosingTime(e.target.value)} className="date-time-input w-full rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-white focus:border-[var(--brand)] focus:outline-none" />
                  </div>
                  <LogoLibraryPicker
                    title="Question logos"
                    category={createCategory}
                    activeAssets={activeLogoAssets}
                    pendingAssets={pendingLogoAssets}
                    selectedLogoKeys={createSelectedLogoKeys}
                    selectedPendingLogoIds={createSelectedPendingLogoIds}
                    onSelectedLogoKeysChange={setCreateSelectedLogoKeys}
                    onSelectedPendingLogoIdsChange={setCreateSelectedPendingLogoIds}
                    onUploadLogo={(payload) => uploadLogoAsset(payload, "create")}
                    uploading={createLogoUploading}
                    role={userRole}
                  />
                  <div className="rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Research Data <span className="ml-1 font-normal normal-case text-slate-500">— saved and shown to users inside this question</span></p>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">Chart <span className="font-normal text-slate-500">(optional)</span></label>
                      <p className="mb-2 text-[11px] text-slate-500">Search by company name or ticker — results show the exact exchange. Select from the list.</p>
                      <div className="relative">
                        <div className="flex gap-2">
                          <input type="text" value={createChartSymbol} onChange={(e) => setCreateChartSymbol(e.target.value.toUpperCase())} placeholder="e.g. Apple, Reliance, Bitcoin, Nifty 50…" className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                          {createChartSymbol && <button type="button" onClick={() => { setCreateChartSymbol(""); setCreateChartResults([]); }} className="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-400/60">Clear</button>}
                        </div>
                        {createChartResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-[var(--stroke)] bg-[#0b1528] shadow-xl">
                            {createChartResults.map((r) => (
                              <button key={r.symbol} type="button" onClick={() => { setCreateChartSymbol(r.symbol); setCreateChartResults([]); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-[var(--brand)]/10">
                                <span className="font-semibold text-[var(--brand)]">{r.symbol}</span>
                                <span className="truncate text-slate-400">{r.description}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {createChartSymbol && createChartSymbol.includes(":") && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <p className="text-[10px] text-emerald-400">✓ Chart: {createChartSymbol}</p>
                          <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(createChartSymbol)}`} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--brand)] hover:underline">Verify on TradingView ↗</a>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-300">Research Links <span className="font-normal text-slate-500">(optional)</span></label>
                      <p className="mb-2 text-[11px] text-slate-500">Add source links users can open when researching this question.</p>
                      <div className="space-y-2">
                        {createReferenceLinks.map((link, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input type="text" value={link.label} onChange={(e) => setCreateReferenceLinks((ls) => ls.map((l, i) => i === idx ? { ...l, label: e.target.value } : l))} placeholder="Label (e.g. NSE India)" className="w-32 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                            <input type="text" value={link.url} onChange={(e) => setCreateReferenceLinks((ls) => ls.map((l, i) => i === idx ? { ...l, url: e.target.value } : l))} placeholder="https://..." className="flex-1 rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-[var(--brand)] focus:outline-none" />
                            <button type="button" onClick={() => setCreateReferenceLinks((ls) => ls.filter((_, i) => i !== idx))} className="shrink-0 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-400/60">Remove</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setCreateReferenceLinks((ls) => [...ls, { label: "", url: "" }])} className="rounded-lg border border-[var(--brand)]/30 px-3 py-1.5 text-xs font-medium text-[var(--brand)] hover:border-[var(--brand)]/60 hover:bg-[var(--brand)]/5">+ Add Research Link</button>
                      </div>
                    </div>
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
                </div>
              </>
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Confirm & Publish</h3>
                  <button onClick={() => setCreateStep("form")} className="text-slate-500 hover:text-slate-300">← Back</button>
                </div>
                <div className="mb-5 space-y-3 rounded-xl border border-[var(--stroke)] bg-[#0b1528] p-4 text-sm">
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Question</p><p className="mt-1 font-medium text-white">{createQuestion}</p></div>
                  <div className="flex flex-wrap gap-6">
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Category</p><p className="mt-1 text-white">{createCategory}</p></div>
                    {createVsMode && createCategory === "Sports" && <div><p className="text-xs uppercase tracking-wide text-slate-500">Type</p><p className="mt-1 text-white">{createVsTeamA} vs {createVsTeamB}</p></div>}
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Entry Cost</p><p className="mt-1 text-white">{createEntryCost} pts</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Closes</p><p className="mt-1 text-white">{createClosingTime ? new Date(createClosingTime).toLocaleString() : "—"}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Initial Split</p><p className="mt-1 text-white">YES {Number(createInitialProbability || 50).toFixed(2)}% / NO {(100 - Number(createInitialProbability || 50)).toFixed(2)}%</p></div>
                  </div>
                  {(createSelectedLogoKeys.length > 0 || createSelectedPendingLogoIds.length > 0) && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Logos</p>
                      <p className="mt-1 text-slate-200">
                        {createSelectedLogoKeys.length > 0 ? `Approved: ${createSelectedLogoKeys.join(", ")}` : ""}
                        {createSelectedLogoKeys.length > 0 && createSelectedPendingLogoIds.length > 0 ? " · " : ""}
                        {createSelectedPendingLogoIds.length > 0 ? `Pending uploads: ${createSelectedPendingLogoIds.length}` : ""}
                      </p>
                    </div>
                  )}
                  {createResolutionRules.trim() && <div><p className="text-xs uppercase tracking-wide text-slate-500">Resolution Rules</p><p className="mt-1 whitespace-pre-line text-slate-200">{createResolutionRules.trim()}</p></div>}
                </div>
                {createMsg && (
                  <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${createMsg.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
                    {createMsg.text}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setCreateStep("form")} className="flex-1 rounded-lg border border-[var(--stroke)] py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white">← Edit</button>
                  <button onClick={handleCreateSubmit} disabled={createSubmitting} className="flex-1 rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50">{createSubmitting ? "Publishing..." : "Publish Question"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
