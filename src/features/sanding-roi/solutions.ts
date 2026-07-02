/**
 * ROI Calculator — Sanding Machine Variants
 *
 * The complete MOTIMAC / Nicholaisen sanding line-up that has an official NM
 * Ex Work price. Technical specs (working width, sanding units/configuration,
 * abrasive belt, feed speed, power) are taken from the machine datasheets,
 * spec sheet (WT_machine_specifications.xlsx) and the sanders overview deck.
 *
 * Prices
 * ------
 * `investmentEur` = the NM Ex Work price (EUR) from the official price list
 * (June 2026). These are real list prices, not estimates.
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
 */

import { PRODUCTS, type ProductCategory } from "./products";

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

  /** NM Ex Work-pris i EUR (officiel prisliste) */
  investmentEur: number;

  /** Hvilke produktkategorier maskinen kan bearbejde — styrer hvilke løsninger der tilbydes */
  handles: ProductCategory[];

  /** Maks. arbejdsbredde i mm (bruges til at orientere emnet i gennemløbet) */
  maxWorkingWidthMm: number;

  /** Min. arbejdslængde i mm — emner kortere end dette i fremføringsretningen kan ikke føres sikkert igennem */
  minWorkLengthMm: number;

  /** Arbejdstykkelse-område i mm — emner uden for dette kan ikke bearbejdes */
  minThicknessMm: number;
  maxThicknessMm: number;

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

/** Tykkelsen (3. mål) i mm fra en størrelse som "397.5 × 779 × 19 mm". */
function thicknessMm(size: string): number {
  const nums = (size.match(/[\d.]+/g) ?? []).map(Number);
  return nums[2] ?? 0;
}

/**
 * Fremføringslængden (mm) i den bedste gyldige orientering, eller null hvis
 * emnet ikke kan føres igennem maskinen.
 *
 * Emnet kan vendes på to måder:
 *   B) korteste kant i fremføringen (længste på tværs) — kræver længste ≤ bredde
 *      OG korteste ≥ min. længde. Giver den korteste fremføring (bedst kapacitet).
 *   A) længste kant i fremføringen (korteste på tværs) — kræver længste ≥ min. længde.
 * Passer ingen af dem, er emnet for kort (eller for bredt) til maskinen.
 */
function feedLengthMm(size: string, maxWidthMm: number, minWorkLengthMm: number): number | null {
  const [a, b] = planarDims(size);
  const small = Math.min(a, b);
  const large = Math.max(a, b);
  if (large <= maxWidthMm && small >= minWorkLengthMm) return small; // orientering B
  if (small <= maxWidthMm && large >= minWorkLengthMm) return large; // orientering A
  return null; // kan ikke føres igennem
}

/** Cyklustid i sekunder for én fremføringslængde ved given hastighed. */
function cycleTimeSec(feedLenMm: number, feedSpeedMpm: number): number {
  if (feedSpeedMpm <= 0) return 0;
  return ((feedLenMm / 1000 + FEED_GAP_M) / feedSpeedMpm) * 60;
}

/**
 * Byg processingTimeSec-mappet for alle produkter ud fra maskinens feed speed.
 * Tiden ganges med antal slibede sider (én passage pr. side i en gennemløbssliber).
 * For emner maskinen ikke kan føre (feedLengthMm === null) bruges længste mål
 * som worst-case tid — maskinen udelukkes alligevel af canProcess.
 */
function buildTimes(feedSpeedMpm: number, maxWidthMm: number, minWorkLengthMm: number): Record<string, number> {
  return Object.fromEntries(
    PRODUCTS.map((p) => {
      const fl = feedLengthMm(p.size, maxWidthMm, minWorkLengthMm);
      const lenForTime = fl ?? Math.max(...planarDims(p.size));
      const perSide = cycleTimeSec(lenForTime, feedSpeedMpm);
      return [p.id, Math.max(1, Math.round(perSide * p.sides))];
    }),
  );
}

/**
 * Kan maskinen bearbejde emnet? Kræver rette kategori, at det kan føres igennem
 * (bredde + min. længde), og at tykkelsen ligger i maskinens arbejdsområde.
 */
export function canProcess(
  s: SolutionVariant,
  p: { size: string; category: ProductCategory },
): boolean {
  if (!s.handles.includes(p.category)) return false;
  const t = thicknessMm(p.size);
  if (t > 0 && (t < s.minThicknessMm || t > s.maxThicknessMm)) return false;
  return feedLengthMm(p.size, s.maxWorkingWidthMm, s.minWorkLengthMm) !== null;
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

// ── machine line-up (sorted by NM Ex Work price) ────────────────────────────────

export const SOLUTIONS: SolutionVariant[] = [
  {
    name: "FR650 3D Brush Sander",
    description:
      "Compact 3D brush sander for edges and profiled surfaces. Two side heads (multi-angle) plus three top brush heads with Danish Flex&Trim brushes — sands shaped, raised-panel and narrow parts that flat sanders cannot reach.",
    image: "/solutions/fr650.png",
    oeePercent: 60,
    operators: 1,
    investmentEur: 26_386,
    handles: ["profiled"],
    maxWorkingWidthMm: 635,
    minWorkLengthMm: 380,
    minThicknessMm: 3,
    maxThicknessMm: 100,
    feedSpeedMpm: 6,
    specs: [
      { label: "Working width", value: "635 mm (25\")" },
      { label: "Working thickness", value: "3–100 mm" },
      { label: "Sanding heads", value: "2 side + 3 top brush" },
      { label: "Feed speed", value: "3–17 m/min" },
      { label: "Total power", value: "≈ 11.5 kW (15.5 hp)" },
      { label: "Best for", value: "Edges & profiles" },
    ],
    processingTimeSec: buildTimes(6, 635, 380),
    automationOptions: [AUTO_MONITORING],
  },

  {
    name: "WT RR1300V",
    description:
      "Standard lacquer / calibrating sander (36 kW). \"Platform+\" modular design with two Ø240 mm contact rollers — low cost, high value for reliable thickness calibration and a clean first sanding. Handles short panels down to 280 mm.",
    image: "/solutions/wt-rr1300v.png",
    oeePercent: 60,
    operators: 1,
    investmentEur: 38_000,
    handles: ["flat"],
    maxWorkingWidthMm: 1300,
    minWorkLengthMm: 280,
    minThicknessMm: 3,
    maxThicknessMm: 150,
    feedSpeedMpm: 10,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Min. work length", value: "280 mm" },
      { label: "Sanding units", value: "2 × roller Ø240 (26 sh)" },
      { label: "Abrasive belt", value: "1330 × 2620 mm" },
      { label: "Feed speed", value: "5–30 m/min" },
      { label: "Total power", value: "36 kW" },
    ],
    processingTimeSec: buildTimes(10, 1300, 280),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_MONITORING],
  },

  {
    name: "WT RRC1300",
    description:
      "WT-series calibrate + fine-finish sander (84 kW). Steel contact roller + rubber roller + combination finishing head (Ø170 + pad) — calibration and a high-quality finish on the same machine. The best all-round choice for flat panels.",
    image: "/solutions/wt-rrc1300.png",
    oeePercent: 70,
    operators: 1,
    investmentEur: 53_640,
    handles: ["flat"],
    maxWorkingWidthMm: 1300,
    minWorkLengthMm: 490,
    minThicknessMm: 3,
    maxThicknessMm: 150,
    feedSpeedMpm: 14,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Min. work length", value: "490 mm" },
      { label: "Sanding units", value: "Steel + rubber + combi head" },
      { label: "Abrasive belt", value: "1350 × 2620 mm" },
      { label: "Feed speed", value: "5–24 m/min" },
      { label: "Total power", value: "84 kW" },
    ],
    processingTimeSec: buildTimes(14, 1300, 490),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_DUST, AUTO_MONITORING],
  },

  {
    name: "FHDR1300 Brush Sander",
    description:
      "Three-unit brush + disc + roller sander (20 kW) for profiled doors and primer sanding. FH brush rollers, FD oscillating disc heads and FR rollers with Danish Flex&Trim brushes — reaches raised panels, mouldings and corner grooves flat sanders miss.",
    image: "/solutions/fhdr1300.png",
    oeePercent: 65,
    operators: 1,
    investmentEur: 68_435,
    handles: ["flat", "profiled"],
    maxWorkingWidthMm: 1300,
    minWorkLengthMm: 460,
    minThicknessMm: 3,
    maxThicknessMm: 120,
    feedSpeedMpm: 6,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Working thickness", value: "3–120 mm" },
      { label: "Sanding units", value: "FH 2+2 brush · FD 6+6 disc · FR 1+1" },
      { label: "Brushes", value: "Danish Flex&Trim" },
      { label: "Feed speed", value: "3–17 m/min" },
      { label: "Total power", value: "20 kW" },
    ],
    processingTimeSec: buildTimes(6, 1300, 460),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_MONITORING],
  },

  {
    name: "WT RRHG1300",
    description:
      "Segmented-pad finishing sander. Steel roller + rubber roller + 80-section electronic segmented pad on a 2620 mm belt — the segmented head fits the board surface even with curvature or warping for an even, high-grade veneer finish.",
    image: "/solutions/wt-rrhg1300.png",
    oeePercent: 72,
    operators: 1,
    investmentEur: 93_976,
    handles: ["flat"],
    maxWorkingWidthMm: 1300,
    minWorkLengthMm: 490,
    minThicknessMm: 3,
    maxThicknessMm: 150,
    feedSpeedMpm: 8,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Abrasive belt", value: "2620 mm" },
      { label: "Sanding units", value: "Roller + rubber + 80-section pad" },
      { label: "Segmented pad", value: "80-section electronic" },
      { label: "Feed speed", value: "5–24 m/min" },
      { label: "Best for", value: "Even veneer / lacquer finish" },
    ],
    processingTimeSec: buildTimes(8, 1300, 490),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_DUST, AUTO_MONITORING],
  },

  {
    name: "MT TRHG1300",
    description:
      "Top-of-range segmented-pad sander with an 80-section electronic system and a 3250 mm belt. Cross belt + roller + super-finish + scotch-brite units realise diverse veneer effects (semi-open, zig-zag, matte, high-gloss) without manual intervention — for premium doors and furniture.",
    image: "/solutions/mt-trhg1300.png",
    oeePercent: 75,
    operators: 1,
    investmentEur: 154_868,
    handles: ["flat"],
    maxWorkingWidthMm: 1300,
    minWorkLengthMm: 490,
    minThicknessMm: 3,
    maxThicknessMm: 150,
    feedSpeedMpm: 6,
    specs: [
      { label: "Working width", value: "1300 mm" },
      { label: "Abrasive belt", value: "3250 mm" },
      { label: "Sanding units", value: "Cross belt + roller + super-finish + scotch-brite" },
      { label: "Segmented pad", value: "80-section electronic" },
      { label: "Feed speed", value: "5–24 m/min" },
      { label: "Best for", value: "Premium veneer effects" },
    ],
    processingTimeSec: buildTimes(6, 1300, 490),
    automationOptions: [AUTO_INFEED_RETURN, AUTO_DUST, AUTO_MONITORING],
  },
];
