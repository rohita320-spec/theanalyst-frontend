import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-3 text-3xl font-semibold text-white">Terms & Conditions</h1>
      <p className="mb-6 text-sm text-slate-400">Last updated: April 19, 2026</p>

      <div className="space-y-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6 text-sm leading-relaxed text-slate-300">
        <p>
          By using The Analyst, you agree to participate in a points-based analysis experience designed for educational and informational use.
        </p>
        <p>
          You are responsible for your account credentials and for all activity under your account.
        </p>
        <p>
          You agree not to use the platform for unlawful activity, abuse, manipulation, or attempts to disrupt service integrity.
        </p>
        <p>
          Questions are resolved according to predefined rules published on the platform. Resolution decisions follow those rules and platform governance.
        </p>
        <p>
          Points are platform-only participation units with no monetary value and no cash redemption.
        </p>
        <p>
          User-generated views are not verified financial advice. The platform does not guarantee accuracy, reliability, or suitability of any user content.
        </p>
        <p>
          The platform may update features, rules, and these terms over time. Continued use after updates constitutes acceptance of revised terms.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/disclaimer" className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-slate-300 hover:border-slate-400 hover:text-white">
          View Disclaimer
        </Link>
        <Link href="/feed" className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-slate-300 hover:border-slate-400 hover:text-white">
          Go to Feed
        </Link>
      </div>
    </main>
  );
}
