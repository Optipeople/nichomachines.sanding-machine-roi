export const site = {
  name: "NichoMachines",
  legalName: "Nicholaisen A/S",
  tagline: "Sanding Machine ROI Calculator",
  description:
    "Estimate the time savings and payback period of an automated sanding machine — consistent, high-quality surface finishing in one machine.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://sanding-machine-roi.nichomachines.com",
  email: "info@nicholaisen.dk",
} as const;

export type Site = typeof site;
