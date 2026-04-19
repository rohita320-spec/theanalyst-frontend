import Link from "next/link";

export default function RulesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-3 text-3xl font-semibold text-white">Rules & Guidelines</h1>
      <p className="mb-6 text-sm text-slate-400">Last updated: April 19, 2026</p>

      <div className="space-y-4 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-6 text-sm leading-relaxed text-slate-300">
        <p>Participation is points-based only. Points are platform units and do not represent money, cash equivalents, or redeemable assets.</p>
        <p>Each question has a defined close time and resolution logic. New submissions stop when a question is closed by time or admin action.</p>
        <p>Open questions can be closed for new participation without final outcome. Closed questions remain pending until an admin resolves YES/NO or cancels with full point refunds.</p>
        <p>Resolution is determined using publicly verifiable information according to the stated rules for each question. Admin decisions are final for platform outcomes.</p>
        <p>Users should submit independent views and avoid manipulation, abuse, automation misuse, or any attempt to interfere with fair participation.</p>
        <p>The platform is provided for informational and educational use. Review the Terms and Disclaimer before participating.</p>
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
