/**
 * ROI Calculator — Sanding Machine Variants
 *
 * Each entry is a real MOTIMAC / Nicholaisen wide-belt or brush sander.
 * Technical specs (working width, sanding units, abrasive belt, feed speed,
 * power, weight) are taken from the official machine datasheets.
 *
 * Throughput model
 * ----------------
 * A wide-belt / brush sander is a through-feed machine: the cycle time per
 * workpiece is driven by the panel length and the feed speed (m/min), NOT by a
 * fixed per-product number. We therefore derive `processingTimeSec` for every
 * product from its real size (products.ts) and the machine's effective feed
 * speed, so the calculator always stays in sync with the product list.
 *
 *   cycle = (feedLength + FEED_GAP) / feedSpeed
 *
 * The workpiece is oriented so its longest planar edge runs across the belt
 * whenever it fits within the machine's working width; the remaining (shorter)
 * edge then becomes the feed length. If the longest edge exceeds the working
 * width it must run along the feed direction instead.
 *
 * automationOptions: optional add-ons that improve OEE and/or reduce the number
 * of operators (automatic infeed/return, dust extraction, remote monitoring).
 *
 * ⚠ investmentEur values are indicative list-price estimates for ROI ranking
 *   only — confirm against the current Nicholaisen price list before quoting.
 */

import { PRODUCTS } from "./products";

export type AutomationOption = {
  /** Kort navn vist i UI */
  name: string;
  /** Beskrivelse vist under navnet */
  description: string;
  /** Merpris i EUR */
  priceEur: number;
  /** OEE-forbedring i procentpoint (f.eks. 8 = +8 pp) */
  oeeBoostPct: number;
  /** Reduktion i antal operatører (f.eks. 0.5 = halvt årsværk) */
  operatorReduction: number;
};

/** En enkelt teknisk specifikation vist på løsningskortet */
export type MachineSpec = { label: string; value: string };

export type SolutionVariant = {
  /** Maskinens navn, f.eks. "WT RRC1300" */
  name: string;

  /** Kort beskrivelse vist i trin 3 — hvad kendetegner maskinen */
  description: string;

  /** Valgfrit billede af maskinen — sti relativt til /public, fx "/solutions/wt-rrc1300.png" */
  image?: string;

  /** Forventet OEE i procent (0–100) */
  oeePercent: number;

  /** Antal operatører nødvendigt for at køre maskinen */
  operators: number;

  /** Investeringspris i EUR (ekskl. automatisering) — vejledende estimat */
  investmentEur: number;

  /** Maks. arbejdsbredde i mm (bruges til at orientere emnet i gennemløbet) */
  maxWorkingWidthMm: number;

  /** Effektiv produktions-fremføringshastighed i m/min (typisk under maks.) */
  feedSpeedMpm: number;

  /** Nøglespecifikationer fra databladet, vist på kortet */
  specs: MachineSpec[];

  /** Maskintid i sekunder pr. emne for hvert produkt-id (udledt af feedSpeedMpm) */
  processingTimeSec: Record<string, number>;

  /** Valgfrie automatiseringstilkøb */
  automationOptions?: AutomationOption[];
};

// ── throughput helper ─────────────────────────────────────────────────────────

/** Mellemrum/håndteringstillæg mellem emner i gennemløbet (m). */
const FEED_GAP_M = 0.4;

/** Træk de to plane mål (længde × bredde) ud af en størrelse som "397.5 × 779 × 19 mm". */
function planarDims(size: string): [number, number] {
  const nums = (size.match(/[\d.]+/g) ?? []).map(Number);
  return [nums[0] ?? 0, nums[1] ?? 0];
}

/** Cyklustid i sekunder for ét emne ved given fremføringshastighed. */
function cycleTimeSec(size: string, feedSpeedMpm: number, maxWidthMm: number): number {
  const [a, b] = planarDims(size);
  const small = Math.min(a, b);
  const large = Math.max(a, b);
  // Orientér længste kant på tværs af båndet hvis den passer → kortest fremføring.
  const feedLengthMm = large <= maxWidthMm ? small : large;
  if (feedSpeedMpm <= 0) return 0;
  return ((feedLengthMm / 1000 + FEED_GAP_M) / feedSpeedMpm) * 60;
}

/** Byg processingTimeSec-mappet for alle produkter ud fra maskinens feed speed. */
function buildTimes(feedSpeedMpm: number, maxWidthMm: number): Record<string, number> {
  return Object.fromEntries(
    PRODUCTS.map((p) => [p.id, Math.max(1, Math.round(cycleTimeSec(p.size, feedSpeedMpm, maxWidthMm)))]),
  );
}

// ── automation add-ons (genbruges på tværs af maskiner) ─────────────────────────

const AUTO_INFEED_RETURN: AutomationOption = {
  name: "Automatic infeed & return conveyor",
  description:
    "Powered infeed and return-to-operator conveyor — one operator both loads and unloads, eliminating walk-around handling.",
  priceEur: 18_000,
  oeeBoostPct: 10,
  operatorReduction: 0.5,
};

const AUTO_MONITORING: AutomationOption = {
  name: "Production monitoring (Siemens PLC, remote)",
  description:
    "Siemens PLC with remote master control — live throughput, downtime and abrasive-belt life tracking on the 10\" touch screen.",
  priceEur: 6_000,
  oeeBoostPct: 5,
  operatorReduction: 0,
};

const AUTO_DUST: AutomationOption = {
  name: "Integrated dust-extraction package",
  description:
    "Air-jet belt cleaning hood + extraction sized to the machine — cleaner abrasive belts, longer belt life and a dust-free surface into the next process.",
  priceEur: 9_000,
  oeeBoostPct: 5,
  operatorReduction: 0,
};

// ── machine line-up (1300 mm series) ────────────────────────────────────────────

export const SOLUTIONS: SolutionVariant[] = [
  {
    name: "WT RR1300V",
    description:
      "Economy 2-roller calibrating sander (36 kW). Two Ø240 mm contact rollers for reliable thickness calibration and a clean first sanding — the budget entry into the 1300 mm range.",
    image: "/solutions/wt-rr1300v.png",
    oeePercent: 60,
    operators: 1,
    investmentEur: 28_000,
    maxWorkingWidthMm: 1300,
    feedSpeedMpm: 10,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Working thickness", value: "3–150 mm" },
      { label: "Sanding units", value: "2 × roller Ø240 (26 HA)" },
      { label: "Abrasive belt", value: "1330 × 2620 mm" },
      { label: "Feed speed", value: "5–30 m/min" },
      { label: "Total power", value: "36 kW" },
    ],
    processingTimeSec: buildTimes(10, 1300),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_MONITORING],
  },

  {
    name: "WT RC1300",
    description:
      "2-unit calibrate + pad-finish sander (61 kW). A steel contact roller for calibration followed by a Ø170 mm roller + sanding pad for a fine, even finishing pass in a single pass.",
    image: "/solutions/wt-rc1300.png",
    oeePercent: 65,
    operators: 1,
    investmentEur: 34_000,
    maxWorkingWidthMm: 1300,
    feedSpeedMpm: 12,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Min. work length", value: "490 mm" },
      { label: "Sanding units", value: "Roller Ø240 + Ø170 + pad" },
      { label: "Abrasive belt", value: "1350 × 2620 mm" },
      { label: "Feed speed", value: "5–24 m/min" },
      { label: "Total power", value: "61 kW" },
    ],
    processingTimeSec: buildTimes(12, 1300),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_DUST, AUTO_MONITORING],
  },

  {
    name: "WT RR1300",
    description:
      "Heavy-duty 2-roller calibrating sander (65 kW). Steel + 80-shore contact rollers (Ø240) for aggressive stock removal and accurate calibration of solid wood, plywood and MDF.",
    image: "/solutions/wt-rr1300.png",
    oeePercent: 65,
    operators: 1,
    investmentEur: 38_000,
    maxWorkingWidthMm: 1300,
    feedSpeedMpm: 10,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Min. work length", value: "280 mm" },
      { label: "Sanding units", value: "2 × roller Ø240 (Steel/80sh)" },
      { label: "Abrasive belt", value: "1350 × 2620 mm" },
      { label: "Feed speed", value: "5–24 m/min" },
      { label: "Total power", value: "65 kW" },
    ],
    processingTimeSec: buildTimes(10, 1300),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_MONITORING],
  },

  {
    name: "WT RRC1300",
    description:
      "3-unit calibrate + fine-finish sander (84 kW). Two contact rollers (Steel/80sh) plus a Ø170 mm roller + pad (55sh) — calibration and a high-quality finish on the same machine. The best all-round choice.",
    image: "/solutions/wt-rrc1300.png",
    oeePercent: 70,
    operators: 1,
    investmentEur: 54_000,
    maxWorkingWidthMm: 1300,
    feedSpeedMpm: 14,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Min. work length", value: "490 mm" },
      { label: "Sanding units", value: "Ø240 / Ø240 / Ø170 + pad" },
      { label: "Abrasive belt", value: "1350 × 2620 mm" },
      { label: "Feed speed", value: "5–24 m/min" },
      { label: "Total power", value: "84 kW" },
    ],
    processingTimeSec: buildTimes(14, 1300),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_DUST, AUTO_MONITORING],
  },

  {
    name: "WT RRR1300",
    description:
      "3-roller maximum-removal sander (84 kW). Three contact rollers (Steel/80sh/55sh) for the highest stock-removal and throughput where heavy calibration is the priority.",
    image: "/solutions/wt-rrr1300.png",
    oeePercent: 70,
    operators: 1,
    investmentEur: 52_000,
    maxWorkingWidthMm: 1300,
    feedSpeedMpm: 12,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Min. work length", value: "280 mm" },
      { label: "Sanding units", value: "3 × roller Ø240" },
      { label: "Abrasive belt", value: "1350 × 2620 mm" },
      { label: "Feed speed", value: "5–24 m/min" },
      { label: "Total power", value: "84 kW" },
    ],
    processingTimeSec: buildTimes(12, 1300),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_MONITORING],
  },

  {
    name: "FHDR1300 Brush Sander",
    description:
      "Brush + disc + roller finishing sander (20 kW) for profiled surfaces. FH brush rollers, FD oscillating disc heads and FR rollers with Danish Flex&Trim brushes — for raised-panel doors, mouldings and primer sanding that flat sanders cannot reach.",
    image: "/solutions/fhdr1300.png",
    oeePercent: 65,
    operators: 1,
    investmentEur: 62_000,
    maxWorkingWidthMm: 1300,
    feedSpeedMpm: 6,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Working thickness", value: "3–120 mm" },
      { label: "Sanding units", value: "FH 2+2 brush · FD 6+6 disc · FR 1+1" },
      { label: "Brushes", value: "Danish Flex&Trim" },
      { label: "Feed speed", value: "3–17 m/min" },
      { label: "Total power", value: "20 kW" },
    ],
    processingTimeSec: buildTimes(6, 1300),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_MONITORING],
  },
];
