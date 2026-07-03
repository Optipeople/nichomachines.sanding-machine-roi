/**
 * Product (workpiece) catalogue for the ROI calculator.
 *
 * `category` drives machine matching:
 *   - "flat"     — flat faces / panels: calibrating & wide-belt sanders.
 *   - "profiled" — raised panels, mouldings, edges, 3D shapes: brush sanders.
 *
 * `passes` = default number of sanding runs. A through-feed sander runs the
 * piece once per pass, so this covers both faces (2) and re-sanding the same
 * face (e.g. intermediate/lacquer sanding). Defaults reflect typical furniture
 * practice (visible-both-sides panels = 2; parts with a hidden back = 1); the
 * customer can adjust it per product in step 2.
 *
 * `name` is a short subtitle shown under the product name in the picker.
 *
 * A machine is only offered if it can handle every category the customer selects
 * and physically feed each piece (width, min length, thickness — see solutions.ts).
 *
 * Machine time also accounts for belt-width utilisation (how many pieces fit
 * side by side across the belt). Only size, category and passes affect the
 * result — material adjusts feed speed at runtime. The list is kept free of
 * geometric duplicates so no two entries give the same ranking.
 */

export type ProductCategory = "flat" | "profiled";

export type Product = {
  id: string;
  name: string;
  size: string;
  image: string;
  category: ProductCategory;
  /** Default number of sanding passes/runs (1 = one face, 2 = both faces, more = re-sanding). */
  passes: number;
};

export const PRODUCTS: readonly Product[] = [
  // Flat panels & cabinet parts (small → large)
  { id: "Solid-Wood Panel",  name: "Glued board, calibration", size: "1200 × 600 × 27 mm", image: "/products/solid-wood-panel.svg", category: "flat", passes: 2 },
  { id: "Sliding Door",      name: "Wardrobe front panel",     size: "1051 × 568.5 × 16 mm", image: "/products/sliding-door.svg",      category: "flat", passes: 2 },
  { id: "Hinge Door",        name: "Hinged cabinet door",      size: "702 × 368 × 17 mm",    image: "/products/hinge-door.svg",        category: "flat", passes: 2 },
  { id: "Cabinet Side",      name: "Cabinet gable",            size: "1058 × 379.5 × 23 mm", image: "/products/cabinet-side.svg",      category: "flat", passes: 2 },
  { id: "Tall Cabinet Side", name: "Full-height gable",        size: "2125 × 560 × 16 mm",   image: "/products/tall-cabinet-side.svg", category: "flat", passes: 2 },
  { id: "Fixed Shelf",       name: "Shelf panel",              size: "381 × 387 × 16 mm",    image: "/products/fixed-shelf.svg",       category: "flat", passes: 2 },
  { id: "Drawer Front",      name: "Drawer face",              size: "368 × 115.3 × 17 mm",  image: "/products/drawer-front.svg",      category: "flat", passes: 1 },
  { id: "Plinth Front",      name: "Plinth / kickboard",       size: "741.6 × 57.3 × 19 mm", image: "/products/plinth-front.svg",      category: "flat", passes: 1 },
  // Profiled / shaped parts — need a brush sander (FR650 / FHDR1300)
  { id: "Raised-Panel Door", name: "Profiled door face",       size: "597 × 397 × 19 mm",  image: "/products/raised-panel-door.svg", category: "profiled", passes: 1 },
  { id: "Profiled Moulding", name: "Shaped edge / profile",    size: "2400 × 60 × 20 mm",  image: "/products/profiled-moulding.svg", category: "profiled", passes: 1 },
];
