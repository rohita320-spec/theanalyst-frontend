import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-3 text-3xl font-semibold text-white">Terms of Use</h1>
      <p className="mb-6 text-sm text-slate-400">Last updated: April 30, 2026</p>

      <div className="space-y-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6 text-sm leading-relaxed text-slate-300">
        <p>
          By using The Analyst, you agree to participate in a points-based analysis platform intended for educational, informational, and comparative insight purposes.
        </p>
        <p>
          The platform allows users to review questions across markets, sports, and global events, submit a view on the available outcome options, and classify that participation using an analysis type where supported.
        </p>
        <p>
          Points are internal participation units only. They are not money, do not represent wagers, cannot be redeemed for cash, and do not create any right to payment, prize, or financial return.
        </p>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for activity that occurs under your account.
        </p>
        <p>
          You agree not to use the platform for unlawful conduct, manipulation, automated abuse, misrepresentation, interference with platform integrity, or attempts to circumvent controls, limits, or moderation.
        </p>
        <p>
          Questions are governed by the published resolution rules and platform administration. Final outcomes are determined according to those rules, available source information, and platform governance.
        </p>
        <p>
          User-generated views, classifications, and comments are provided by participants and are not verified professional advice. The Analyst does not guarantee accuracy, completeness, reliability, or suitability of any user-submitted content.
        </p>
        <p>
          The platform may update features, controls, rules, and these terms from time to time. Continued use after updates constitutes acceptance of the revised terms.
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
