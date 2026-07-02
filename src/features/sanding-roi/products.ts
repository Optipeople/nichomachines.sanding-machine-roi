/**
 * Product (workpiece) catalogue for the ROI calculator.
 *
 * `category` drives machine matching:
 *   - "flat"     — flat faces / panels: calibrating & wide-belt sanders.
 *   - "profiled" — raised panels, mouldings, edges, 3D shapes: brush sanders.
 *
 * `sides` = how many faces are sanded (1 or 2). A single-sided through-feed
 * sander runs the piece once per face, so a two-sided panel takes ~2× the
 * machine time. Defaults reflect typical furniture practice (visible-both-sides
 * panels = 2; parts with a hidden back = 1).
 *
 * A machine is only offered if it can handle every category the customer selects
 * and physically feed each piece (width, min length, thickness — see solutions.ts).
 *
 * Only size, category and sides affect the result — material does not. The list
 * is kept free of geometric duplicates so no two entries give the same ranking.
 */

export type ProductCategory = "flat" | "profiled";

export type Product = {
  id: string;
  name: string;
  size: string;
  image: string;
  category: ProductCategory;
  /** Number of faces sanded (1 = one side, 2 = both sides). */
  sides: 1 | 2;
};

export const PRODUCTS: readonly Product[] = [
  // Flat panels & cabinet parts (small → large)
  { id: "Solid-Wood Panel",  name: "Glued board — calibration", size: "1200 × 600 × 27 mm", image: "/products/solid-wood-panel.png", category: "flat", sides: 2 },
  { id: "Sliding Door",      name: "", size: "1051 × 568.5 × 16 mm", image: "/products/sliding-door.png",      category: "flat", sides: 2 },
  { id: "Hinge Door",        name: "", size: "702 × 368 × 17 mm",    image: "/products/hinge-door.png",        category: "flat", sides: 2 },
  { id: "Cabinet Side",      name: "", size: "1058 × 379.5 × 23 mm", image: "/products/cabinet-side.png",      category: "flat", sides: 2 },
  { id: "Tall Cabinet Side", name: "", size: "2125 × 560 × 16 mm",   image: "/products/tall-cabinet-side.png", category: "flat", sides: 2 },
  { id: "Fixed Shelf",       name: "", size: "381 × 387 × 16 mm",    image: "/products/fixed-shelf.png",       category: "flat", sides: 2 },
  { id: "Drawer Front",      name: "", size: "368 × 115.3 × 17 mm",  image: "/products/drawer-front.png",      category: "flat", sides: 1 },
  { id: "Plinth Front",      name: "", size: "741.6 × 57.3 × 19 mm", image: "/products/plinth-front.png",      category: "flat", sides: 1 },
  // Profiled / shaped parts — need a brush sander (FR650 / FHDR1300)
  { id: "Raised-Panel Door", name: "Profiled / shaped face", size: "597 × 397 × 19 mm",  image: "/products/raised-panel-door.png", category: "profiled", sides: 1 },
  { id: "Profiled Moulding", name: "Shaped edge / profile",  size: "2400 × 60 × 20 mm",  image: "/products/profiled-moulding.png", category: "profiled", sides: 1 },
];
