/**
 * Shared ROI logic — the single source of truth used by BOTH the calculator UI
 * (Calculator.tsx) and the sales report (api/roi/sanding/route.ts).
 *
 * Keeping the labour rates, constants and the calculation here means the payback
 * a customer sees and the payback in the internal report can never drift apart.
 */

import type { SolutionVariant } from "./solutions";

/** Effective working weeks per year (holidays / vacation removed). */
export const WORKING_WEEKS = 46;

/** Machine hours available per week at 1 / 2 / 3 shifts. */
export const SHIFT_WEEKLY_HOURS: Record<1 | 2 | 3, number> = { 1: 37, 2: 71, 3: 101 };

/**
 * Countries with an average manufacturing labour rate (EUR/hour) plus the local
 * currency for display.
 *
 * ⚠ eurPerHour figures are indicative — review against current wage data before
 * relying on the payback numbers commercially.
 */
export const COUNTRIES = [
  { code: "DK", name: "Denmark",   eurPerHour: 38, currency: "DKK", eurToLocal: 7.46 },
  { code: "SE", name: "Sweden",    eurPerHour: 35, currency: "SEK", eurToLocal: 11.5 },
  { code: "NO", name: "Norway",    eurPerHour: 48, currency: "NOK", eurToLocal: 11.8 },
  { code: "FI", name: "Finland",   eurPerHour: 35, currency: "EUR", eurToLocal: 1.0 },
  { code: "EE", name: "Estonia",   eurPerHour: 20, currency: "EUR", eurToLocal: 1.0 },
  { code: "LV", name: "Latvia",    eurPerHour: 20, currency: "EUR", eurToLocal: 1.0 },
  { code: "LT", name: "Lithuania", eurPerHour: 20, currency: "EUR", eurToLocal: 1.0 },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];
export type Country = (typeof COUNTRIES)[number];

/** Look up a country by code, with a safe fallback for unknown codes. */
export function getCountry(code: string): Country | { code: string; name: string; eurPerHour: number; currency: string; eurToLocal: number } {
  return COUNTRIES.find((c) => c.code === code) ?? { code, name: code, eurPerHour: 0, currency: "EUR", eurToLocal: 1 };
}

/** Format an EUR amount into the country's local currency for display. */
export function fmtCurrency(eurAmount: number, eurToLocal: number, currency: string): string {
  const amount = Math.round(eurAmount * eurToLocal);
  const formatted = amount.toLocaleString("en");
  return currency === "EUR" ? `€${formatted}` : `${formatted} ${currency}`;
}

/**
 * Workpiece material — sanded at different feed speeds. `speedFactor` scales a
 * machine's effective feed speed (higher = faster feed = shorter cycle time).
 * ⚠ factors are indicative; tune to real production experience.
 */
export const MATERIALS = [
  { code: "mdf",       name: "Raw MDF / chipboard",     speedFactor: 1.0 },
  { code: "laminated", name: "Laminated board",         speedFactor: 0.9 },
  { code: "softwood",  name: "Softwood (pine, spruce)", speedFactor: 1.15 },
  { code: "hardwood",  name: "Hardwood (oak, beech)",   speedFactor: 0.8 },
  { code: "lacquered", name: "Lacquered surface",       speedFactor: 0.65 },
  { code: "veneered",  name: "Veneered surface",        speedFactor: 0.7 },
] as const;

export type MaterialCode = (typeof MATERIALS)[number]["code"];

/** Feed-speed factor for a material code (1.0 if unknown). */
export function getMaterialFactor(code: string): number {
  return MATERIALS.find((m) => m.code === code)?.speedFactor ?? 1;
}

/** One product line for the calculation: units/week and how many sanding passes (runs). */
export type RoiItem = { id: string; unitsPerWeek: number; passes: number };

export type RoiResult = {
  oee: number;
  effectiveOperators: number;
  totalInvestment: number;
  weeklyMachineHours: number;
  annualMachineHours: number;
  capacityUtilPct: number;
  annualCurrentCost: number;
  annualFutureCost: number;
  annualSavingsEur: number;
  paybackYears: number;
};

/**
 * Core ROI calculation for one machine.
 *
 * `materialFactor` scales feed speed for the workpiece material (see MATERIALS);
 * each item's time is multiplied by its number of `passes` and divided by the factor.
 * `selectedAutoNames` are the automation add-ons the customer ticked (empty = base
 * machine); they raise OEE, reduce operators and add to the investment.
 */
export function calcSolution(
  s: SolutionVariant,
  items: RoiItem[],
  operatorHoursPerWeek: number,
  eurPerHour: number,
  availableShifts: 1 | 2 | 3,
  materialFactor: number = 1,
  selectedAutoNames: Set<string> = new Set(),
): RoiResult {
  const selectedOptions = (s.automationOptions ?? []).filter((o) => selectedAutoNames.has(o.name));
  const oeeBoost = selectedOptions.reduce((sum, o) => sum + o.oeeBoostPct, 0);
  const operatorReduction = selectedOptions.reduce((sum, o) => sum + o.operatorReduction, 0);
  const automationPrice = selectedOptions.reduce((sum, o) => sum + o.priceEur, 0);

  const oee = Math.min(100, s.oeePercent + oeeBoost);
  const effectiveOperators = Math.max(0, s.operators - operatorReduction);
  const totalInvestment = s.investmentEur + automationPrice;

  const factor = materialFactor > 0 ? materialFactor : 1;
  const rawWeeklyHours = items.reduce(
    (sum, it) => sum + (it.unitsPerWeek * (s.processingTimeSec[it.id] ?? 0) * it.passes) / factor / 3600,
    0,
  );
  const weeklyMachineHours = rawWeeklyHours / (oee / 100);
  const availableWeeklyHours = SHIFT_WEEKLY_HOURS[availableShifts];
  const capacityUtilPct = (weeklyMachineHours / availableWeeklyHours) * 100;

  const annualMachineHours = weeklyMachineHours * WORKING_WEEKS;
  const annualCurrentCost = operatorHoursPerWeek * WORKING_WEEKS * eurPerHour;
  const annualFutureCost = weeklyMachineHours * effectiveOperators * WORKING_WEEKS * eurPerHour;
  const annualSavingsEur = Math.max(0, annualCurrentCost - annualFutureCost);
  const paybackYears = annualSavingsEur > 0 ? totalInvestment / annualSavingsEur : Infinity;

  return {
    oee,
    effectiveOperators,
    totalInvestment,
    weeklyMachineHours,
    annualMachineHours,
    capacityUtilPct,
    annualCurrentCost,
    annualFutureCost,
    annualSavingsEur,
    paybackYears,
  };
}
