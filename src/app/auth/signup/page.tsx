"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "../../../lib/api";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await signup({
        email: email.trim(),
        password,
      });
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
      setMessage(`Account created as ${result.user.role}. Redirecting...`);
      setTimeout(() => { window.location.href = (result.user.role === "admin" || result.user.role === "question_creator") ? "/admin" : "/feed"; }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6">
        <h1 className="mb-2 text-2xl font-semibold text-white">Create Account</h1>
        <p className="mb-6 text-sm text-slate-400">Create a user account.</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            className="w-full rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-2 text-white"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative">
            <input
              className="w-full rounded-lg border border-[var(--stroke)] bg-[#0b1528] px-3 py-2 pr-12 text-white"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.09A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8-.53 1.5-1.31 2.87-2.28 4.04" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.1 6.1C4.18 7.46 2.67 9.49 2 12c1.73 4.89 6 8 10 8 1.61 0 3.14-.31 4.53-.88" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12c1.73-4.89 6-8 10-8s8.27 3.11 10 8c-1.73 4.89-6 8-10 8S3.73 16.89 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <button
            className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}

        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <Link href="/auth/login" className="hover:text-white">Already have an account</Link>
          <Link href="/" className="hover:text-white">Back to home</Link>
        </div>
        <div className="mt-4 border-t border-[var(--stroke)] pt-3 text-xs text-slate-500">
          <p>
            By creating an account, you agree to our <Link href="/terms" className="text-slate-300 hover:text-white">Terms & Conditions</Link> and acknowledge the <Link href="/disclaimer" className="text-slate-300 hover:text-white">Disclaimer</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
