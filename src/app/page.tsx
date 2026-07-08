import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { SandingFunnel } from "@/features/sanding-roi/Funnel";

export const metadata: Metadata = {
  title: "Sanding Machine ROI — configure & payback",
  description:
    "Pick the surface result you need, get the configured MOTIMAC sanding machine and its payback, and refine with your volumes for a capacity-checked business case.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Sanding Machine ROI — NichoMachines",
    description: "Configure by end result, see the payback, refine with your volumes.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return (
    <section className="pt-6 pb-20 lg:pt-8 lg:pb-28">
      <Container size="default">
        <div className="mb-8 flex items-center justify-start">
          <a
            href="https://nichomachines.com/"
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-tan-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-tan-500)]"
          >
            nichomachines.com
          </a>
        </div>
        <div className="mb-10 flex items-center justify-center">
          <a
            href="https://nichomachines.com/"
            aria-label="Back to NichoMachines.com"
            className="inline-block rounded-sm transition-opacity hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-tan-500)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nichomachines-black.png" alt="NichoMachines" className="h-16 w-auto" />
          </a>
        </div>
        <SandingFunnel />
        <p className="mt-16 text-center text-xs tracking-wide" style={{ color: "#555" }}>
          NichoMachines · Sanding Machine ROI Estimator · For indicative purposes only
        </p>
      </Container>
    </section>
  );
}
