import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { SandingConfigurator } from "@/features/sanding-roi/Configurator";

export const metadata: Metadata = {
  title: "Sanding Machine Payback Configurator",
  description:
    "Configure a MOTIMAC sanding machine by the surface result you need, and see the payback from its price versus the manual sanding it replaces.",
  alternates: { canonical: "/configurator" },
  openGraph: {
    title: "Sanding Machine Payback Configurator — NichoMachines",
    description: "Pick your surface result, get the configured machine and its payback.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function ConfiguratorPage() {
  return (
    <section className="pt-6 pb-20 lg:pt-8 lg:pb-28">
      <Container size="default">
        <SandingConfigurator />
      </Container>
    </section>
  );
}
