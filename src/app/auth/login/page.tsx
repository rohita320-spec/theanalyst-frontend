"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "../../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await login({ email: email.trim(), password });
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("auth_user", JSON.stringify(result.user));
      localStorage.setItem("app_theme", result.user.theme_preference || "dark");
      document.documentElement.setAttribute("data-theme", result.user.theme_preference || "dark");
      sessionStorage.setItem(
        "auth_notice",
        JSON.stringify({
          tone: "success",
          message: `Logged in successfully. Welcome ${result.user.email}.`,
        }),
      );
      window.dispatchEvent(new Event("auth-changed"));
      setMessage(`Logged in as ${result.user.role}. Redirecting...`);
      setTimeout(() => { window.location.href = (result.user.role === "admin" || result.user.role === "question_creator") ? "/admin" : "/feed"; }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
        <h1 className="mb-2 text-2xl font-semibold text-white">Login</h1>
        <p className="mb-6 text-sm text-slate-400">Sign in as user or admin.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            className="w-full rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-2 text-white"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-2 text-white"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}

        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <Link href="/auth/signup" className="hover:text-white">Create account</Link>
          <Link href="/feed" className="hover:text-white">Go to feed</Link>
        </div>
      </div>
    </main>
  );
}
