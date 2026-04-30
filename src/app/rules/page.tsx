import Link from "next/link";

export default function RulesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-3 text-3xl font-semibold text-white">Rules & Guidelines</h1>
      <p className="mb-6 text-sm text-slate-400">Last updated: April 30, 2026</p>

      <div className="space-y-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6 text-sm leading-relaxed text-slate-300">
        <p>Participation is analysis-based and points-based only. Points are platform units for engagement and performance tracking; they are not wagers, deposits, cash equivalents, or redeemable assets.</p>
        <p>Each question includes a defined closing time and resolution standard. New submissions stop when the question closes by time or by authorized administrative action.</p>
        <p>For binary questions, users select the outcome they support, such as YES or NO. For team or event matchups, users select the outcome option presented for that specific question.</p>
        <p>Where available, users should classify their participation using the relevant analysis type so the platform can organize viewpoints in a more structured and educational way.</p>
        <p>Open questions may be closed to further participation before a final result is recorded. Closed questions remain pending until an authorized resolution or cancellation is applied.</p>
        <p>Resolution is determined according to the published rules for each question using publicly verifiable information or designated source criteria. Administrative resolution decisions are final for platform purposes.</p>
        <p>Users should participate independently and professionally, and must avoid manipulation, harassment, automation abuse, coordinated distortion, or attempts to interfere with fair participation.</p>
        <p>The platform is intended for informational and educational use. Review the Terms of Use and Disclaimer before participating.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/terms" className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-slate-300 hover:border-slate-400 hover:text-white">
          Terms & Conditions
        </Link>
        <Link href="/disclaimer" className="rounded-lg border border-[var(--stroke)] px-3 py-2 text-slate-300 hover:border-slate-400 hover:text-white">
          Disclaimer
        </Link>
        <Link href="/feed" className="rounded-lg bg-[var(--brand)] px-3 py-2 font-medium text-slate-950 hover:brightness-110">
          Go to Feed
        </Link>
      </div>
    </main>
  );
}
