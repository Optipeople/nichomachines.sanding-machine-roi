/**
 * Finish goals for the focused payback configurator.
 *
 * Each goal is a desired END RESULT the customer wants on the surface. It maps to
 * the machine configuration that delivers it (a machine in solutions.ts). This is
 * the "configure by end result" axis: pick the result, get the right machine and
 * its price, then the payback.
 */

export type FinishGoal = {
  id: string;
  /** Short goal title */
  title: string;
  /** What the surface looks like afterwards */
  result: string;
  /** Must match a `name` in solutions.ts SOLUTIONS */
  machineName: string;
  /** The sanding units / build-up that delivers this result */
  config: string;
};

export const FINISH_GOALS: readonly FinishGoal[] = [
  {
    id: "calibrate",
    title: "Thickness calibration",
    result: "Even thickness and a flat, clean surface — ready for the next step.",
    machineName: "WT RR1300V",
    config: "2 × Ø240 mm contact roller",
  },
  {
    id: "finish",
    title: "Ready-to-paint finish",
    result: "Calibrated and fine-sanded in one pass — paint-ready flat panels.",
    machineName: "WT RRC1300",
    config: "Steel roller + rubber roller + combination head",
  },
  {
    id: "veneer",
    title: "Veneer / lacquer finish",
    result: "Even, high-grade veneer or lacquer surface without through-sanding.",
    machineName: "WT RRHG1300",
    config: "Roller + rubber roller + 80-section segmented pad",
  },
  {
    id: "premium",
    title: "Premium veneer effects",
    result: "Semi-open, zig-zag, matte or high-gloss effects — no manual work.",
    machineName: "MT TRHG1300",
    config: "Cross belt + roller + super-finish + scotch-brite",
  },
  {
    id: "profiled",
    title: "Profiled / raised-panel",
    result: "Sanded profiles, raised-panel fillings and 3D faces.",
    machineName: "FHDR1300 Brush Sander",
    config: "Brush + disc + roller (Danish Flex&Trim)",
  },
  {
    id: "edges",
    title: "Edges & narrow profiles",
    result: "Shaped edges, mouldings and narrow profiled parts.",
    machineName: "FR650 3D Brush Sander",
    config: "2 side + 3 top brush heads",
  },
];
