"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { SOLUTIONS } from "./solutions";
import { FINISH_GOALS } from "./finishGoals";
import { COUNTRIES, WORKING_WEEKS, fmtCurrency, type CountryCode } from "./roi";

/**
 * Focused payback configurator: choose the desired end result → the machine that
 * delivers it → the payback from that machine's NM Ex Work price vs. the manual
 * sanding it replaces. Deliberately simpler than the full ROI calculator.
 */
export function SandingConfigurator() {
  const [goalId, setGoalId] = useState<string>("finish");
  const [country, setCountry] = useState<CountryCode>("DK");
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(40);
  const [automatedShare, setAutomatedShare] = useState<number>(80); // % of manual sanding removed
  const [addAutomation, setAddAutomation] = useState<boolean>(false);

  const goal = FINISH_GOALS.find((g) => g.id === goalId) ?? FINISH_GOALS[0]!;
  const machine = SOLUTIONS.find((s) => s.name === goal.machineName) ?? SOLUTIONS[0]!;
  const autoOption = machine.automationOptions?.[0];
  const autoPrice = addAutomation ? (autoOption?.priceEur ?? 0) : 0;
  const price = machine.investmentEur + autoPrice;

  const c = COUNTRIES.find((x) => x.code === country)!;
  const currentAnnual = hoursPerWeek * WORKING_WEEKS * c.eurPerHour;
  // Automation add-on removes a little more manual work on top of the base share
  const effShare = Math.min(1, automatedShare / 100 + (addAutomation ? 0.1 : 0));
  const annualSavings = Math.max(0, currentAnnual * effShare);
  const paybackYears = annualSavings > 0 ? price / annualSavings : Infinity;

  const money = (eur: number) => fmtCurrency(eur, c.eurToLocal, c.currency);

  return (
    <div className="min-h-[600px]">
      <p className="text-eyebrow text-[var(--color-tan-500)]">Payback configurator</p>
      <h1 className="mt-3 text-display-3 text-balance text-[var(--color-ink-900)]">
        Configure by <em className="not-italic text-[var(--color-tan-500)]">end result</em>, see the payback
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-ink-500)]">
        Pick the surface result you need. We configure the machine that delivers it and show the
        payback from its price versus the manual sanding it replaces.
      </p>

      {/* Step 1 — end result */}
      <section className="mt-10">
        <h2 className="text-eyebrow text-[var(--color-slate-500)]">1 — What result do you need?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FINISH_GOALS.map((g) => {
            const isSel = g.id === goalId;
            const m = SOLUTIONS.find((s) => s.name === g.machineName);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoalId(g.id)}
                aria-pressed={isSel}
                className={cn(
                  "relative flex flex-col rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                  isSel
                    ? "border-[var(--color-navy-900)] bg-[var(--color-paper)] shadow-sm"
                    : "border-[var(--color-paper-dark)] bg-[var(--color-paper)] hover:border-[var(--color-navy-500)]",
                )}
              >
                {isSel && (
                  <span className="absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full bg-[var(--color-navy-900)] text-white">
                    <Check className="size-3" />
                  </span>
                )}
                <span className="pr-6 text-sm font-semibold text-[var(--color-ink-900)]">{g.title}</span>
                <span className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-500)]">{g.result}</span>
                <span className="mt-3 text-eyebrow text-[var(--color-tan-500)]">
                  {m?.name ?? g.machineName}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2 — your numbers */}
      <section className="mt-10">
        <h2 className="text-eyebrow text-[var(--color-slate-500)]">2 — Your manual sanding today</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Manual sanding hrs / week" hint="All operators combined">
            <NumberInput value={hoursPerWeek} min={0} max={10000} step={0.5} onChange={setHoursPerWeek} />
          </Field>
          <Field label="Country" hint="Sets the local labour rate">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as CountryCode)}
              className="w-full rounded-md border border-[var(--color-paper-dark)] bg-[var(--color-paper)] px-3 py-2 text-[0.95rem] font-medium text-[var(--color-ink-900)] outline-none focus:border-[var(--color-navy-900)] focus:ring-2 focus:ring-[var(--color-navy-900)]/15"
            >
              {COUNTRIES.map((x) => (
                <option key={x.code} value={x.code}>{x.name}</option>
              ))}
            </select>
          </Field>
          <Field label={`Automated share — ${automatedShare}%`} hint="How much manual sanding the machine removes">
            <input
              type="range"
              min={40}
              max={100}
              step={5}
              value={automatedShare}
              onChange={(e) => setAutomatedShare(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--color-navy-900)]"
            />
          </Field>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-paper-dark)] bg-[var(--color-paper)] p-4">
          <input
            type="checkbox"
            checked={addAutomation}
            onChange={(e) => setAddAutomation(e.target.checked)}
            className="size-4 accent-[var(--color-navy-900)]"
          />
          <span className="text-sm text-[var(--color-ink-700)]">
            Add {autoOption?.name ?? "automation"}
            {autoOption ? <span className="text-[var(--color-slate-500)]"> (+{money(autoOption.priceEur)}, removes more manual handling)</span> : null}
          </span>
        </label>
      </section>

      {/* Result */}
      <section className="mt-10 rounded-2xl border border-[var(--color-navy-900)]/15 bg-[var(--color-paper)] p-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Configured machine */}
          <div>
            <p className="text-eyebrow text-[var(--color-tan-500)]">Configured for “{goal.title}”</p>
            <p className="mt-2 text-xl font-bold text-[var(--color-ink-900)]">{machine.name}</p>
            <p className="mt-1 text-sm text-[var(--color-ink-500)]">{goal.config}</p>
            <dl className="mt-4 grid gap-1.5">
              {machine.specs.slice(0, 4).map((sp) => (
                <div key={sp.label} className="flex items-baseline justify-between gap-2 border-b border-[var(--color-paper-dark)] pb-1.5">
                  <dt className="text-xs text-[var(--color-slate-500)]">{sp.label}</dt>
                  <dd className="text-xs font-medium text-[var(--color-ink-700)]">{sp.value}</dd>
                </div>
              ))}
            </dl>
            {addAutomation && autoOption ? (
              <p className="mt-3 text-xs text-[var(--color-slate-500)]">
                + {autoOption.name}
              </p>
            ) : null}
          </div>

          {/* Payback */}
          <div className="rounded-xl bg-[var(--color-navy-900)] p-6 text-[var(--color-cream-50)]">
            <p className="text-eyebrow text-[var(--color-cream-50)]/70">Machine price (NM Ex Work)</p>
            <p className="mt-1 text-2xl font-bold">{money(price)}</p>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-5">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--color-cream-50)]/60">Manual cost / year</p>
                <p className="mt-1 text-sm font-semibold">{money(currentAnnual)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--color-cream-50)]/60">Saved / year</p>
                <p className="mt-1 text-sm font-semibold">{money(annualSavings)}</p>
              </div>
            </div>

            <div className="mt-5 border-t border-white/15 pt-5">
              <p className="text-[11px] uppercase tracking-wider text-[var(--color-cream-50)]/60">Payback</p>
              <p className="mt-1 text-3xl font-bold text-[var(--color-tan-300,#e6c88a)]">
                {!Number.isFinite(paybackYears)
                  ? "—"
                  : paybackYears < 1
                    ? `${Math.round(paybackYears * 12)} months`
                    : `${paybackYears.toFixed(1)} years`}
              </p>
              <p className="mt-1 text-xs text-[var(--color-cream-50)]/60">
                price ÷ annual saving
              </p>
            </div>

            <Link
              href="/advanced"
              className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-cream-50)] px-4 text-sm font-medium text-[var(--color-navy-900)] transition-colors hover:bg-white"
            >
              Full calculation & proposal <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <p className="mt-5 text-xs text-[var(--color-slate-500)]">
          Indicative. Payback uses the machine price and the share of manual sanding it replaces; the full
          calculator adds volumes, belt utilisation and capacity. Prices are NM Ex Work list prices.
        </p>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-paper-dark)] bg-[var(--color-paper)] p-4">
      <div className="text-sm font-semibold text-[var(--color-ink-900)]">{label}</div>
      {hint ? <div className="mt-0.5 text-xs text-[var(--color-slate-500)]">{hint}</div> : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      onFocus={(e) => e.target.select()}
      className="w-full rounded-md border border-[var(--color-paper-dark)] bg-[var(--color-paper)] px-3 py-2 text-right text-[0.95rem] font-medium text-[var(--color-ink-900)] outline-none focus:border-[var(--color-navy-900)] focus:ring-2 focus:ring-[var(--color-navy-900)]/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}
