"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dark, app-styled date + time picker. Drop-in replacement for
 * <input type="datetime-local">: `value` and `onChange` use the same
 * "YYYY-MM-DDTHH:MM" (local) string format, so existing handlers
 * (e.g. new Date(value).toISOString()) keep working unchanged.
 *
 * Unlike the native control it has a real "Done" button — nothing
 * commits until the user confirms.
 */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type Parsed = { y: number; mo: number; d: number; h: number; mi: number };

function parseValue(v: string): Parsed | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || "");
  if (!m) return null;
  return { y: +m[1], mo: +m[2] - 1, d: +m[3], h: +m[4], mi: +m[5] };
}

function fmtValue(y: number, mo: number, d: number, h: number, mi: number) {
  return `${y}-${pad(mo + 1)}-${pad(d)}T${pad(h)}:${pad(mi)}`;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
};

export default function DateTimePicker({ value, onChange, className, placeholder = "Select date & time" }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const p = parseValue(value);
    return p ? new Date(p.y, p.mo, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const [draftDay, setDraftDay] = useState<Date | null>(null);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const parsed = parseValue(value);

  const openCal = () => {
    const p = parseValue(value);
    setDraftDay(p ? new Date(p.y, p.mo, p.d) : null);
    setHour(p ? p.h : 12);
    setMinute(p ? p.mi : 0);
    setView(p ? new Date(p.y, p.mo, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const done = () => {
    if (draftDay) {
      onChange(fmtValue(draftDay.getFullYear(), draftDay.getMonth(), draftDay.getDate(), hour, minute));
    }
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setOpen(false);
  };

  const label = parsed
    ? `${MONTHS[parsed.mo].slice(0, 3)} ${parsed.d}, ${parsed.y}, ${pad(parsed.h)}:${pad(parsed.mi)}`
    : placeholder;

  const firstDow = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const today = new Date();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSameDay = (a: Date, y: number, mo: number, d: number) =>
    a.getFullYear() === y && a.getMonth() === mo && a.getDate() === d;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openCal())}
        className={className ?? "flex w-full items-center justify-between rounded-xl border border-[var(--stroke)] bg-[#0d1b2e] px-3 py-2 text-left text-sm text-white focus:border-[var(--brand)] focus:outline-none"}
      >
        <span className={parsed ? "text-white" : "text-slate-500"}>{label}</span>
        <span aria-hidden className="ml-2 text-slate-400">📅</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[300px] rounded-2xl border border-[var(--stroke)] bg-[#0c1626] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="h-7 w-7 rounded-lg border border-[var(--stroke)] bg-[#0b1528] text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">‹</button>
            <span className="text-sm font-semibold text-white">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
            <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="h-7 w-7 rounded-lg border border-[var(--stroke)] bg-[#0b1528] text-slate-300 hover:border-[var(--brand)] hover:text-[var(--brand)]">›</button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {DOW.map((d) => (
              <span key={d} className="py-1 text-center text-[10px] text-slate-500">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <span key={`e${i}`} />;
              const selected = draftDay && isSameDay(draftDay, view.getFullYear(), view.getMonth(), d);
              const isToday = isSameDay(today, view.getFullYear(), view.getMonth(), d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDraftDay(new Date(view.getFullYear(), view.getMonth(), d))}
                  className={`aspect-square rounded-lg text-[12.5px] transition-colors ${
                    selected
                      ? "bg-[var(--brand)] font-semibold text-slate-950"
                      : isToday
                      ? "text-slate-200 shadow-[inset_0_0_0_1px_var(--brand)] hover:bg-[var(--brand)]/15"
                      : "text-slate-300 hover:bg-[var(--brand)]/15"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-[var(--stroke)] pt-3">
            <label className="text-xs text-slate-400">Time</label>
            <select value={hour} onChange={(e) => setHour(+e.target.value)} className="rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white focus:border-[var(--brand)] focus:outline-none">
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </select>
            <span className="text-slate-600">:</span>
            <select value={minute} onChange={(e) => setMinute(+e.target.value)} className="rounded-lg border border-[var(--stroke)] bg-[#0d1b2e] px-2 py-1.5 text-xs text-white focus:border-[var(--brand)] focus:outline-none">
              {Array.from({ length: 60 }, (_, m) => (
                <option key={m} value={m}>{pad(m)}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex gap-2">
            <button type="button" onClick={clear} className="flex-1 rounded-lg border border-[var(--stroke)] py-2 text-xs font-medium text-slate-400 hover:border-slate-500 hover:text-slate-200">Clear</button>
            <button type="button" onClick={done} className="flex-1 rounded-lg bg-[var(--brand)] py-2 text-xs font-semibold text-slate-950 hover:brightness-110">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
