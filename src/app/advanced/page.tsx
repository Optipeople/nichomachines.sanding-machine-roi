import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/Container";
import { SandingRoiCalculator } from "@/features/sanding-roi/Calculator";

export const metadata: Metadata = {
  title: "Sanding Machine ROI Calculator — detailed",
  description:
    "Detailed ROI calculator: enter the panels you sand, weekly volumes, passes and material, and get matched machine options with belt utilisation, capacity and payback.",
  alternates: { canonical: "/advanced" },
  openGraph: {
    title: "Sanding Machine ROI Calculator (detailed) — NichoMachines",
    description:
      "Full calculation with volumes, belt utilisation and capacity, and a personalised proposal.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function AdvancedPage() {
  return (
    <section className="pt-6 pb-20 lg:pt-8 lg:pb-28">
      <Container size="default">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-tan-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-tan-500)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Payback configurator
          </Link>
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
            <img
              src="/nichomachines-black.png"
              alt="NichoMachines"
              className="h-16 w-auto"
            />
          </a>
        </div>
        <SandingRoiCalculator />
        <p
          className="mt-16 text-center text-xs tracking-wide"
          style={{ color: "#555" }}
        >
          NichoMachines · Sanding Machine ROI Estimator · For indicative purposes only
        </p>
      </Container>
    </section>
  );
}
