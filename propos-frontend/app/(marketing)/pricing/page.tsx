"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/marketing/SectionLabel";

const PLANS = [
  {
    name: "Starter",
    price: { monthly: 2.5, annual: 2.0 },
    unit: "per unit/month",
    description: "For growing portfolios up to 1,000 units.",
    features: [
      "Up to 1,000 units",
      "Maintenance coordination",
      "Vendor dispatch",
      "Basic tenant comms",
      "AppFolio / Buildium sync",
      "Email + SMS",
    ],
    cta: "Start Free Trial",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Growth",
    price: { monthly: 3.5, annual: 2.8 },
    unit: "per unit/month",
    description: "For established operators with compliance needs.",
    features: [
      "Up to 5,000 units",
      "Everything in Starter",
      "Compliance autopilot",
      "Lease renewal automation",
      "Capital planning",
      "Invoice reconciliation",
      "Portfolio benchmarking",
      "Priority support",
    ],
    cta: "Start Free Trial",
    ctaVariant: "default" as const,
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: null,
    unit: "",
    description: "For large operators and management companies.",
    features: [
      "Unlimited units",
      "Everything in Growth",
      "Custom PMS integrations",
      "Dedicated AI model fine-tuning",
      "SOC 2 + custom DPA",
      "SLA guarantees",
      "Dedicated success manager",
      "On-prem deployment option",
    ],
    cta: "Talk to Sales",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
];

function PricingCard({
  plan,
  annual,
}: {
  plan: (typeof PLANS)[0];
  annual: boolean;
}) {
  const displayPrice =
    plan.price === null
      ? "Custom"
      : annual
        ? `$${plan.price.annual}`
        : `$${plan.price.monthly}`;

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 ${
        plan.highlighted
          ? "border-gray-300 bg-white shadow-[0_0_0_1px_rgb(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.08)]"
          : "border-gray-200 bg-white shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]"
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
          {plan.badge}
        </span>
      )}
      <h3
        className="text-xl font-semibold text-gray-950"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {plan.name}
      </h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span
          className="text-4xl font-bold text-gray-950"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {displayPrice}
        </span>
        {plan.unit && (
          <span className="text-sm text-gray-500"> {plan.unit}</span>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />
            {feature}
          </li>
        ))}
      </ul>
      <Button
        className="mt-8 w-full"
        variant={plan.ctaVariant}
        size="lg"
        asChild
      >
        <Link href={plan.cta === "Talk to Sales" ? "/contact" : "/register"}>
          {plan.cta}
        </Link>
      </Button>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <section className="pt-32 pb-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h1
            className="mt-2 text-4xl font-bold text-gray-950"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            Start free for 30 days. No credit card required. Scale as you grow.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                !annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Annual
            </button>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Save 20%
            </span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} plan={plan} annual={annual} />
          ))}
        </div>
      </div>
    </section>
  );
}
