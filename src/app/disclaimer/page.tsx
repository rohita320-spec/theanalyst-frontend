import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-3 text-3xl font-semibold text-white">Disclaimer</h1>
      <p className="mb-6 text-sm text-slate-400">Last updated: April 19, 2026</p>

      <div className="space-y-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6 text-sm leading-relaxed text-slate-300">
        <p>
          The Analyst platform is provided for informational, educational, and analytical purposes only.
        </p>
        <p>
          The platform does not provide financial, investment, legal, tax, or trading advice and should not be treated as a recommendation to buy, sell, or allocate capital to any asset or instrument.
        </p>
        <p>
          Platform outcomes are determined by predefined question rules and internal point calculations. They do not represent real-world financial instruments, market execution, or guaranteed forecasting accuracy.
        </p>
        <p>
          The platform uses a points-based system only. Points have no monetary value, cannot be redeemed for cash, and are intended solely for participation and performance tracking within the platform.
        </p>
        <p>
          Users participate at their own discretion. All views, predictions, and comments are user-generated and may be incomplete, inaccurate, or outdated.
        </p>
        <p>
          Users on this platform are not verified financial analysts. The Analyst does not guarantee the accuracy, reliability, completeness, or fitness of any user-generated analysis.
        </p>
        <p>
          The Analyst is not affiliated with, endorsed by, or acting under authorization of any securities, financial, or investment regulatory authority.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/terms" className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-slate-300 hover:border-slate-400 hover:text-white">
          Terms & Conditions
        </Link>
        <Link href="/auth/signup" className="rounded-lg bg-[var(--brand)] px-3 py-2 font-medium text-slate-950 hover:brightness-110">
          Create account
        </Link>
      </div>
    </main>
  );
}
