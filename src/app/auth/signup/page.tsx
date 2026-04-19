"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "../../../lib/api";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setMessage(`Account created as ${result.user.role}. Redirecting...`);
      setTimeout(() => { window.location.href = result.user.role === "admin" ? "/admin" : "/feed"; }, 1000);
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
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}

        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <Link href="/auth/login" className="hover:text-white">Already have an account</Link>
          <Link href="/feed" className="hover:text-white">Go to feed</Link>
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
