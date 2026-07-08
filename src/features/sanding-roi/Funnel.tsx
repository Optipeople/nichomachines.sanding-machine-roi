"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { PRODUCTS, type Product } from "./products";
import { SOLUTIONS, canProcess, avgBeltUtilisation } from "./solutions";
import { FINISH_GOALS } from "./finishGoals";
import {
  COUNTRIES,
  MATERIALS,
  WORKING_WEEKS,
  calcSolution,
  fmtCurrency,
  getMaterialFactor,
  type CountryCode,
  type MaterialCode,
} from "./roi";

/**
 * One progressive funnel — no question is asked twice, and the machine is chosen
 * in a single place (the end result):
 *   0 Result     → picks the machine
 *   1 Payback    → quick payback from the machine price (hours + country)
 *   2 Refine     → optional volumes for a throughput-checked payback + capacity
 *   3 Contact    → request the proposal
 *   4 Thanks
 */
type Step = 0 | 1 | 2 | 3 | 4;

type Contact = { name: string; email: string; job: string; company: string };
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const SHIFT_HOURS: Record<1 | 2 | 3, number> = { 1: 37, 2: 71, 3: 101 };

export function SandingFunnel() {
  const [step, setStep] = useState<Step>(0);

  // shared inputs (asked once)
  const [goalId, setGoalId] = useState<string>("finish");
  const [country, setCountry] = useState<CountryCode>("DK");
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(40);
  const [automatedShare, setAutomatedShare] = useState<number>(80);
  const [addAutomation, setAddAutomation] = useState<boolean>(false);
  const [material, setMaterial] = useState<MaterialCode>("mdf");

  // refine inputs
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [passesById, setPassesById] = useState<Record<string, number>>({});
  const [availableShifts, setAvailableShifts] = useState<1 | 2 | 3>(1);
  const [refined, setRefined] = useState(false);

  // contact
  const [contact, setContact] = useState<Contact>({ name: "", email: "", job: "", company: "" });
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Contact, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const goal = FINISH_GOALS.find((g) => g.id === goalId) ?? FINISH_GOALS[0]!;
  const machine = SOLUTIONS.find((s) => s.name === goal.machineName) ?? SOLUTIONS[0]!;
  const autoOption = machine.automationOptions?.[0];
  const autoPrice = addAutomation ? (autoOption?.priceEur ?? 0) : 0;
  const price = machine.investmentEur + autoPrice;

  const c = COUNTRIES.find((x) => x.code === country)!;
  const materialFactor = getMaterialFactor(material);
  const money = (eur: number) => fmtCurrency(eur, c.eurToLocal, c.currency);

  // quick payback (from machine price + share of manual sanding removed)
  const currentAnnual = hoursPerWeek * WORKING_WEEKS * c.eurPerHour;
  const effShare = Math.min(1, automatedShare / 100 + (addAutomation ? 0.1 : 0));
  const quickSavings = Math.max(0, currentAnnual * effShare);
  const quickPayback = quickSavings > 0 ? price / quickSavings : Infinity;

  // refine — the chosen machine over the entered volumes (React Compiler memoises)
  const activeProducts: Product[] = PRODUCTS.filter((p) => selected.has(p.id));
  const usableProducts = activeProducts.filter((p) => canProcess(machine, p));
  const excludedProducts = activeProducts.filter((p) => !canProcess(machine, p));

  const refinedItems = usableProducts.map((p) => ({
    id: p.id,
    unitsPerWeek: quantities[p.id] ?? 0,
    passes: passesById[p.id] ?? p.passes,
  }));
  const refinedAutoNames = addAutomation && autoOption ? new Set([autoOption.name]) : new Set<string>();
  const refinedMetrics = {
    m: calcSolution(machine, refinedItems, hoursPerWeek, c.eurPerHour, availableShifts, materialFactor, refinedAutoNames),
    beltUtil: avgBeltUtilisation(
      machine,
      usableProducts.map((p) => ({ size: p.size, unitsPerWeek: quantities[p.id] ?? 0 })),
    ),
    totalUnits: refinedItems.reduce((s, it) => s + it.unitsPerWeek, 0),
  };

  const showRefined = refined && refinedMetrics.totalUnits > 0;
  const payback = showRefined ? refinedMetrics.m.paybackYears : quickPayback;
  const savings = showRefined ? refinedMetrics.m.annualSavingsEur : quickSavings;

  const paybackLabel = !Number.isFinite(payback)
    ? "—"
    : payback < 1
      ? `${Math.round(payback * 12)} months`
      : `${payback.toFixed(1)} years`;

  const toggleProduct = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = contact.name.trim();
    const email = contact.email.trim();
    const job = contact.job.trim();
    const nextErrors = { name: !name, email: !emailOk(email), job: !job };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setFormError("Please complete all fields with a valid email.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const payload = {
      contact: { name, email, job, company: contact.company.trim() || undefined },
      products: showRefined
        ? usableProducts.map((p) => ({
            id: p.id,
            name: p.name,
            size: p.size,
            unitsPerWeek: quantities[p.id] ?? 0,
            passes: passesById[p.id] ?? p.passes,
          }))
        : [],
      operatorHoursPerWeek: hoursPerWeek,
      availableShifts,
      country,
      material,
      goal: goalId,
      selectedSolution: { name: machine.name, automationOptions: addAutomation && autoOption ? [autoOption.name] : [] },
      website,
    };
    try {
      const res = await fetch("/api/roi/sanding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormError(data.error ?? "Could not submit right now. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setStep(4);
    } catch {
      setFormError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const firstName = (contact.name.trim().split(/\s+/)[0] || "there").trim();

  return (
    <div className="min-h-[560px]">
      {/* progress dots */}
      <div className="mb-8 flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === step ? "w-8 bg-[var(--color-tan-500)]" : i < step ? "w-4 bg-[var(--color-tan-500)]/50" : "w-4 bg-[var(--color-paper-dark)]",
            )}
          />
        ))}
      </div>

      {/* STEP 0 — result */}
      {step === 0 && (
        <div>
          <p className="text-eyebrow text-[var(--color-tan-500)]">Step 1 — Result</p>
          <h1 className="mt-3 text-display-3 text-balance text-[var(--color-ink-900)]">
            What surface <em className="not-italic text-[var(--color-tan-500)]">result</em> do you need?
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-ink-500)]">
            Pick the finish you want. We configure the machine that delivers it — then show the payback.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FINISH_GOALS.map((g) => {
              const isSel = g.id === goalId;
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
                  <span className="mt-3 text-eyebrow text-[var(--color-tan-500)]">{g.machineName}</span>
                </button>
              );
            })}
          </div>
          <NavRow onNext={() => setStep(1)} nextLabel="See payback" />
        </div>
      )}

      {/* STEP 1 — quick payback */}
      {step === 1 && (
        <div>
          <p className="text-eyebrow text-[var(--color-tan-500)]">Step 2 — Payback</p>
          <h1 className="mt-3 text-display-3 text-balance text-[var(--color-ink-900)]">
            Your <em className="not-italic text-[var(--color-tan-500)]">payback</em>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-ink-500)]">
            From the machine price versus the manual sanding it replaces. Refine with your volumes for a
            capacity-checked figure, or request a proposal now.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Field label="Manual sanding hrs / week" hint="All operators combined">
              <NumberInput value={hoursPerWeek} min={0} max={10000} step={0.5} onChange={setHoursPerWeek} />
            </Field>
            <Field label="Country" hint="Sets the local labour rate">
              <Select value={country} onChange={(v) => setCountry(v as CountryCode)}>
                {COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
              </Select>
            </Field>
            <Field label={`Automated share — ${automatedShare}%`} hint="How much manual sanding the machine removes">
              <input
                type="range" min={40} max={100} step={5} value={automatedShare}
                onChange={(e) => setAutomatedShare(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--color-navy-900)]"
              />
            </Field>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-paper-dark)] bg-[var(--color-paper)] p-4">
            <input type="checkbox" checked={addAutomation} onChange={(e) => setAddAutomation(e.target.checked)} className="size-4 accent-[var(--color-navy-900)]" />
            <span className="text-sm text-[var(--color-ink-700)]">
              Add {autoOption?.name ?? "automation"}
              {autoOption ? <span className="text-[var(--color-slate-500)]"> (+{money(autoOption.priceEur)})</span> : null}
            </span>
          </label>

          <ResultPanel
            goalTitle={goal.title}
            machineName={machine.name}
            config={goal.config}
            specs={machine.specs}
            price={money(price)}
            currentAnnual={money(currentAnnual)}
            savings={money(savings)}
            paybackLabel={paybackLabel}
            beltUtil={showRefined && refinedMetrics.beltUtil !== null ? `~ ${Math.round(refinedMetrics.beltUtil * 100)}%` : null}
            machineHours={showRefined ? `${refinedMetrics.m.weeklyMachineHours.toFixed(1)} hrs` : null}
            note={showRefined ? "Throughput-checked from your volumes." : "Quick estimate — refine with volumes for capacity."}
          />

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SecondaryButton onClick={() => setStep(0)}><ArrowLeft className="size-4" /> Back</SecondaryButton>
            <SecondaryButton onClick={() => { setRefined(true); setStep(2); }}>Refine with volumes</SecondaryButton>
            <PrimaryButton onClick={() => setStep(3)}>Request proposal <ArrowRight className="size-4" /></PrimaryButton>
          </div>
        </div>
      )}

      {/* STEP 2 — refine */}
      {step === 2 && (
        <div>
          <p className="text-eyebrow text-[var(--color-tan-500)]">Step 2b — Volumes</p>
          <h1 className="mt-3 text-display-3 text-balance text-[var(--color-ink-900)]">
            Refine for <em className="not-italic text-[var(--color-tan-500)]">capacity</em>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-ink-500)]">
            Add the parts and weekly volumes. We check them on the <strong className="text-[var(--color-ink-900)]">{machine.name}</strong> —
            belt utilisation, machine hours and a throughput-based payback.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Material" hint="Sets the sanding feed speed">
              <Select value={material} onChange={(v) => setMaterial(v as MaterialCode)}>
                {MATERIALS.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
              </Select>
            </Field>
            <Field label="Available shifts" hint="Time the machine can run">
              <div className="flex overflow-hidden rounded-md border border-[var(--color-paper-dark)]">
                {([1, 2, 3] as const).map((s) => (
                  <button
                    key={s} type="button" onClick={() => setAvailableShifts(s)}
                    className={cn(
                      "flex h-10 flex-1 items-center justify-center text-sm font-semibold transition-colors",
                      s > 1 && "border-l border-[var(--color-paper-dark)]",
                      availableShifts === s ? "bg-[var(--color-navy-900)] text-[var(--color-cream-50)]" : "bg-[var(--color-paper)] text-[var(--color-ink-900)] hover:bg-[var(--color-paper-dark)]",
                    )}
                  >{s}</button>
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {PRODUCTS.map((p) => {
              const isSel = selected.has(p.id);
              const usable = canProcess(machine, p);
              return (
                <div key={p.id} className={cn("rounded-lg border p-3", isSel ? "border-[var(--color-navy-900)]" : "border-[var(--color-paper-dark)]")}>
                  <button type="button" onClick={() => toggleProduct(p.id)} className="flex w-full items-center gap-3 text-left">
                    <span className={cn("inline-flex size-5 items-center justify-center rounded border-2", isSel ? "border-[var(--color-navy-900)] bg-[var(--color-navy-900)] text-white" : "border-[var(--color-ink-300)] text-transparent")}>
                      <Check className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--color-ink-900)]">{p.id}</span>
                      <span className="block text-xs text-[var(--color-slate-500)]">{p.size}{!usable ? " · not for this machine" : ""}</span>
                    </span>
                  </button>
                  {isSel && usable && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--color-paper-dark)] pt-3">
                      <label className="text-eyebrow text-[var(--color-slate-500)]">Units / week</label>
                      <NumberInput value={quantities[p.id] ?? 0} min={0} onChange={(v) => setQuantities((q) => ({ ...q, [p.id]: v }))} className="w-24" />
                      <label className="text-eyebrow text-[var(--color-slate-500)]">Passes</label>
                      <NumberInput value={passesById[p.id] ?? p.passes} min={1} max={8} onChange={(v) => setPassesById((q) => ({ ...q, [p.id]: v }))} className="w-16" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {excludedProducts.length > 0 && (
            <p className="mt-3 text-xs text-[var(--color-slate-500)]">
              {excludedProducts.map((p) => p.id).join(", ")} can’t run on the {machine.name} (wrong type or size) and are left out.
            </p>
          )}

          <ResultPanel
            goalTitle={goal.title}
            machineName={machine.name}
            config={goal.config}
            specs={machine.specs}
            price={money(price)}
            currentAnnual={money(currentAnnual)}
            savings={money(savings)}
            paybackLabel={paybackLabel}
            beltUtil={refinedMetrics.beltUtil !== null && refinedMetrics.totalUnits > 0 ? `~ ${Math.round(refinedMetrics.beltUtil * 100)}%` : null}
            machineHours={refinedMetrics.totalUnits > 0 ? `${refinedMetrics.m.weeklyMachineHours.toFixed(1)} hrs / ${SHIFT_HOURS[availableShifts]}` : null}
            capacity={refinedMetrics.totalUnits > 0 ? `${Math.round(refinedMetrics.m.capacityUtilPct)}%` : null}
            note={refinedMetrics.totalUnits > 0 ? "Throughput-checked from your volumes." : "Enter volumes to compute machine hours."}
          />

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SecondaryButton onClick={() => setStep(1)}><ArrowLeft className="size-4" /> Back</SecondaryButton>
            <PrimaryButton onClick={() => setStep(3)}>Request proposal <ArrowRight className="size-4" /></PrimaryButton>
          </div>
        </div>
      )}

      {/* STEP 3 — contact */}
      {step === 3 && (
        <div>
          <p className="text-eyebrow text-[var(--color-tan-500)]">Step 3 — Get in touch</p>
          <h1 className="mt-3 text-display-3 text-balance text-[var(--color-ink-900)]">
            Turn this into a <em className="not-italic text-[var(--color-tan-500)]">real proposal</em>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-ink-500)]">
            A Nicholaisen specialist will send the full calculation for the <strong className="text-[var(--color-ink-900)]">{machine.name}</strong> and answer any questions.
          </p>
          <form onSubmit={handleSubmit} noValidate className="mt-8 grid max-w-lg gap-4">
            <TextField id="cName" label="Full name" required value={contact.name} invalid={!!errors.name}
              onChange={(v) => { setContact((s) => ({ ...s, name: v })); if (errors.name) setErrors((e) => ({ ...e, name: false })); }} />
            <TextField id="cEmail" label="Work email" type="email" required value={contact.email} invalid={!!errors.email}
              onChange={(v) => { setContact((s) => ({ ...s, email: v })); if (errors.email) setErrors((e) => ({ ...e, email: false })); }} />
            <TextField id="cJob" label="Job title" required value={contact.job} invalid={!!errors.job}
              onChange={(v) => { setContact((s) => ({ ...s, job: v })); if (errors.job) setErrors((e) => ({ ...e, job: false })); }} />
            <TextField id="cCompany" label="Company" value={contact.company} onChange={(v) => setContact((s) => ({ ...s, company: v }))} />
            <div className="hidden" aria-hidden>
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            {formError ? <p className="text-sm text-[#b3261e]" role="alert">{formError}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <SecondaryButton type="button" onClick={() => setStep(refined ? 2 : 1)}><ArrowLeft className="size-4" /> Back</SecondaryButton>
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : <>Request proposal <ArrowRight className="size-4" /></>}
              </PrimaryButton>
            </div>
          </form>
        </div>
      )}

      {/* STEP 4 — thanks */}
      {step === 4 && (
        <div>
          <p className="text-eyebrow text-[var(--color-tan-500)]">Submission received</p>
          <h1 className="mt-3 text-display-3 text-[var(--color-ink-900)]">
            Thank you, <em className="not-italic text-[var(--color-tan-500)]">{firstName}!</em>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-ink-500)]">
            A Nicholaisen specialist will contact <strong className="text-[var(--color-ink-900)]">{contact.email || "you"}</strong> about the {machine.name} within 1–2 business days.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function ResultPanel(props: {
  goalTitle: string; machineName: string; config: string;
  specs: { label: string; value: string }[];
  price: string; currentAnnual: string; savings: string; paybackLabel: string;
  beltUtil?: string | null; machineHours?: string | null; capacity?: string | null; note: string;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-[var(--color-navy-900)]/15 bg-[var(--color-paper)] p-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-eyebrow text-[var(--color-tan-500)]">Configured for “{props.goalTitle}”</p>
          <p className="mt-2 text-xl font-bold text-[var(--color-ink-900)]">{props.machineName}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-500)]">{props.config}</p>
          <dl className="mt-4 grid gap-1.5">
            {props.specs.slice(0, 4).map((sp) => (
              <div key={sp.label} className="flex items-baseline justify-between gap-2 border-b border-[var(--color-paper-dark)] pb-1.5">
                <dt className="text-xs text-[var(--color-slate-500)]">{sp.label}</dt>
                <dd className="text-xs font-medium text-[var(--color-ink-700)]">{sp.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-xl bg-[var(--color-navy-900)] p-6 text-[var(--color-cream-50)]">
          <p className="text-eyebrow text-[var(--color-cream-50)]/70">Machine price (NM Ex Work)</p>
          <p className="mt-1 text-2xl font-bold">{props.price}</p>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-5">
            <Stat label="Manual cost / year" value={props.currentAnnual} />
            <Stat label="Saved / year" value={props.savings} />
            {props.machineHours ? <Stat label="Machine hrs / week" value={props.machineHours} /> : null}
            {props.beltUtil ? <Stat label="Belt utilisation" value={props.beltUtil} /> : null}
            {props.capacity ? <Stat label="Capacity used" value={props.capacity} /> : null}
          </div>
          <div className="mt-5 border-t border-white/15 pt-5">
            <p className="text-[11px] uppercase tracking-wider text-[var(--color-cream-50)]/60">Payback</p>
            <p className="mt-1 text-3xl font-bold text-[var(--color-tan-300,#e6c88a)]">{props.paybackLabel}</p>
            <p className="mt-1 text-xs text-[var(--color-cream-50)]/60">{props.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[var(--color-cream-50)]/60">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
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

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-[var(--color-paper-dark)] bg-[var(--color-paper)] px-3 py-2 text-[0.95rem] font-medium text-[var(--color-ink-900)] outline-none focus:border-[var(--color-navy-900)] focus:ring-2 focus:ring-[var(--color-navy-900)]/15"
    >
      {children}
    </select>
  );
}

function NumberInput({ value, onChange, min, max, step, className }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; className?: string }) {
  return (
    <input
      type="number" inputMode="decimal"
      value={Number.isFinite(value) ? value : 0}
      min={min} max={max} step={step}
      onChange={(e) => { const n = parseFloat(e.target.value); onChange(Number.isFinite(n) ? n : 0); }}
      onFocus={(e) => e.target.select()}
      className={cn(
        "w-full rounded-md border border-[var(--color-paper-dark)] bg-[var(--color-paper)] px-3 py-2 text-right text-[0.95rem] font-medium text-[var(--color-ink-900)] outline-none focus:border-[var(--color-navy-900)] focus:ring-2 focus:ring-[var(--color-navy-900)]/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
        className,
      )}
    />
  );
}

function TextField({ id, label, value, onChange, required, type = "text", invalid }: { id: string; label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; invalid?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-[var(--color-ink-900)]">
        {label}{required ? <span className="ml-1 text-[var(--color-tan-500)]">*</span> : null}
      </label>
      <input
        id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-md border bg-[var(--color-paper)] px-3.5 py-2.5 text-[0.95rem] outline-none focus:border-[var(--color-navy-900)] focus:ring-2 focus:ring-[var(--color-navy-900)]/15",
          invalid ? "border-[#b3261e]" : "border-[var(--color-paper-dark)]",
        )}
      />
    </div>
  );
}

function PrimaryButton({ children, type = "button", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} {...props} className={cn(
      "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--color-navy-900)] px-5 text-[0.95rem] font-medium text-[var(--color-cream-50)] transition-all hover:bg-[var(--color-navy-700)] hover:shadow-sm active:translate-y-px disabled:opacity-50",
      props.className)}>{children}</button>
  );
}

function SecondaryButton({ children, type = "button", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} {...props} className={cn(
      "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--color-navy-900)]/20 bg-transparent px-5 text-[0.95rem] font-medium text-[var(--color-ink-900)] transition-colors hover:border-[var(--color-navy-900)]/60 hover:bg-[var(--color-paper-dark)]/40",
      props.className)}>{children}</button>
  );
}

function NavRow({ onNext, nextLabel }: { onNext: () => void; nextLabel: string }) {
  return (
    <div className="mt-8">
      <PrimaryButton onClick={onNext}>{nextLabel} <ArrowRight className="size-4" /></PrimaryButton>
    </div>
  );
}
