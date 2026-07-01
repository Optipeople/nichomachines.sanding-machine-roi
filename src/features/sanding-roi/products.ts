/**
 * Product (workpiece) catalogue for the ROI calculator.
 *
 * `category` drives machine matching:
 *   - "flat"     — flat faces / panels: calibrating & wide-belt sanders.
 *   - "profiled" — raised panels, mouldings, edges, 3D shapes: brush sanders.
 *
 * A machine is only offered if it can handle every category the customer
 * selects (see `handles` in solutions.ts).
 *
 * The list represents typical sanded workpieces (solid wood, MDF/lacquer,
 * veneer, cabinet parts, mouldings) rather than drilling parts.
 */

export type ProductCategory = "flat" | "profiled";

export type Product = {
  id: string;
  name: string;
  size: string;
  image: string;
  category: ProductCategory;
};

export const PRODUCTS: readonly Product[] = [
  // Core sanding use cases (calibration, primer/lacquer, veneer)
  { id: "MDF Lacquer Door",  name: "MDF panel — primer / lacquer", size: "716 × 397 × 18 mm",  image: "/products/mdf-lacquer-door.png", category: "flat" },
  { id: "Solid-Wood Panel",  name: "Glued board — calibration",   size: "1200 × 600 × 27 mm", image: "/products/solid-wood-panel.png", category: "flat" },
  { id: "Veneered Panel",    name: "Veneer — fine finish",        size: "1200 × 600 × 19 mm", image: "/products/veneered-panel.png",  category: "flat" },
  // Cabinet & furniture parts
  { id: "Sliding Door",      name: "", size: "1051 × 568.5 × 16 mm", image: "/products/sliding-door.png",      category: "flat" },
  { id: "Hinge Door",        name: "", size: "702 × 368 × 17 mm",    image: "/products/hinge-door.png",        category: "flat" },
  { id: "Cabinet Side",      name: "", size: "1058 × 379.5 × 23 mm", image: "/products/cabinet-side.png",      category: "flat" },
  { id: "Tall Cabinet Side", name: "", size: "2125 × 560 × 16 mm",   image: "/products/tall-cabinet-side.png", category: "flat" },
  { id: "Fixed Shelf",       name: "", size: "381 × 387 × 16 mm",    image: "/products/fixed-shelf.png",       category: "flat" },
  { id: "Drawer Front",      name: "", size: "368 × 115.3 × 17 mm",  image: "/products/drawer-front.png",      category: "flat" },
  { id: "Plinth Front",      name: "", size: "741.6 × 57.3 × 19 mm", image: "/products/plinth-front.png",      category: "flat" },
  // Profiled / shaped parts — need a brush sander (FR650 / FHDR1300)
  { id: "Raised-Panel Door", name: "Profiled / shaped face", size: "597 × 397 × 19 mm",  image: "/products/raised-panel-door.png", category: "profiled" },
  { id: "Profiled Moulding", name: "Shaped edge / profile",  size: "2400 × 60 × 20 mm",  image: "/products/profiled-moulding.png", category: "profiled" },
];
