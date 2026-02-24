"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Clock,
  Shield,
  CalendarDays,
  ArrowRight,
  Inbox,
  Bot,
  CheckCircle,
  Sparkles,
  Check,
  Eye,
  History,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPreviewMockup } from "@/components/marketing/DashboardPreviewMockup";
import { SectionLabel } from "@/components/marketing/SectionLabel";
import { MetricPill } from "@/components/marketing/MetricPill";
import { Stat } from "@/components/marketing/Stat";
import { StepCard } from "@/components/marketing/StepCard";
import { MetricCard } from "@/components/marketing/MetricCard";
import { Testimonial } from "@/components/marketing/Testimonial";
import { TrustPoint } from "@/components/marketing/TrustPoint";
import { EscalationCardMockup } from "@/components/marketing/EscalationCardMockup";
import { AgentLogMockup } from "@/components/marketing/AgentLogMockup";
import { FeatureSection } from "@/components/marketing/FeatureSection";

const ESCALATION_REASONS = [
  "Fair Housing concern detected in tenant communication",
  "Invoice 3× above benchmark for this trade",
  "Emergency work order open for 2+ hours with no vendor response",
  "Eviction notice requested — legal review required",
  "Tenant using threatening language",
];

const CUSTOMER_LOGOS = [
  { name: "AvalonBay", src: "/logos/avalon.svg" },
  { name: "Equity Residential", src: "/logos/equity.svg" },
  { name: "Pinnacle", src: "/logos/pinnacle.svg" },
  { name: "Camden", src: "/logos/camden.svg" },
  { name: "UDR", src: "/logos/udr.svg" },
];

export default function LandingPage() {
  return (
    <>
      {/* Section 1: Hero */}
      <section
        className="relative pt-32 pb-16 md:pt-40 md:pb-24"
        style={{
          background: "#f8fafc",
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.06), transparent)`,
        }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Now in early access — join 200+ property managers
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em] text-gray-950 md:text-[52px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The AI coordinator for
            <br />
            <span className="text-[var(--brand-600)]">property operations</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mx-auto mt-4 max-w-xl text-center text-[17px] leading-relaxed text-gray-500"
          >
            PropOS handles vendor dispatch, tenant communication, and compliance
            work — end-to-end, autonomously. Your team reviews exceptions, not
            tickets.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-8 mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            <MetricPill icon={<Zap className="h-3.5 w-3.5" />} label="78% of tickets" sub="handled by AI" />
            <MetricPill icon={<Clock className="h-3.5 w-3.5" />} label="3× faster" sub="resolution time" />
            <MetricPill icon={<Shield className="h-3.5 w-3.5" />} label="Zero missed" sub="compliance tasks" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              variant="outline"
              size="lg"
              className="h-11 border-gray-200 px-6 text-sm font-medium hover:border-gray-300"
              asChild
            >
              <Link href="/contact">
                <CalendarDays className="mr-2 h-4 w-4" />
                Talk to Sales
              </Link>
            </Button>
            <Button
              size="lg"
              className="h-11 bg-gray-950 px-6 text-sm font-medium text-white hover:bg-gray-800"
              asChild
            >
              <Link href="/register">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="relative mt-16 mx-auto max-w-5xl"
          >
            <div
              className="absolute inset-0 -z-10 scale-90 rounded-3xl blur-3xl opacity-60"
              style={{ background: "rgba(99,102,241,0.15)" }}
            />
            <div
              className="overflow-hidden rounded-2xl border border-gray-200 shadow-2xl"
              style={{
                transform: "perspective(1200px) rotateX(3deg)",
                transformOrigin: "center top",
                boxShadow: "0 30px 80px -10px rgba(99,102,241,0.2)",
              }}
            >
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="mx-auto max-w-xs rounded-md border border-gray-200 bg-white px-3 py-1 text-center text-xs text-gray-400">
                    app.propos.ai/dashboard
                  </div>
                </div>
              </div>
              <DashboardPreviewMockup />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 2: Social proof */}
      <section className="border-y border-gray-100 bg-white py-8">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Trusted by property managers across the US
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale">
            {["AvalonBay", "Equity Residential", "Pinnacle", "Camden", "UDR", "Greystar"].map(
              (name) => (
                <span
                  key={name}
                  className="text-lg font-semibold text-gray-500"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {name}
                </span>
              )
            )}
          </div>
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-8 mx-auto">
            <Stat value="1,200+" label="Properties managed" />
            <Stat value="94%" label="AI resolution rate" />
            <Stat value="$2.1M" label="Labor costs saved" />
          </div>
        </div>
      </section>

      {/* Section 3: How it works */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <SectionLabel>How PropOS Works</SectionLabel>
          <h2
            className="text-center text-4xl font-bold tracking-tight text-gray-950 mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From tenant message to resolved issue
            <br />
            <span className="text-gray-400">without touching your inbox</span>
          </h2>
          <p className="mx-auto mb-16 max-w-md text-center text-gray-500">
            PropOS operates as a full coordinator — reading, deciding,
            dispatching, and closing the loop.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 relative">
            <div className="absolute top-12 left-[calc(33%-16px)] right-[calc(33%-16px)] hidden h-px md:block bg-gradient-to-r from-gray-200 via-[var(--brand-300)] to-gray-200" />
            <StepCard
              number="01"
              icon={<Inbox className="h-5 w-5" />}
              title="Tenant sends message"
              description="Via email, SMS, or portal. PropOS reads, classifies intent, and identifies the unit and issue type — instantly."
              highlight="Any channel, fully unified"
            />
            <StepCard
              number="02"
              icon={<Bot className="h-5 w-5" />}
              title="AI coordinates the fix"
              description="PropOS selects the right vendor, checks availability, sends dispatch, and notifies the tenant with an ETA."
              highlight="No human touchpoint needed"
            />
            <StepCard
              number="03"
              icon={<CheckCircle className="h-5 w-5" />}
              title="Closed, logged, synced"
              description="After completion, PropOS reconciles the invoice, updates the PMS, and logs everything for audit."
              highlight="Full paper trail, always"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Feature showcase */}
      <FeatureSection
        label="Vendor Coordination"
        title="Dispatch the right vendor in seconds, not hours"
        description="Our AI scores vendors by response time, rating, trade match, and proximity. It dispatches, follows up, and escalates if no response — all automatically."
        points={[
          "PO auto-generated within pre-approved thresholds",
          "Vendor performance tracked per property",
          "Bid requests for larger jobs",
        ]}
        mockup={
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <div className="text-xs font-medium text-gray-500 mb-3">Vendor Comparison</div>
            <div className="space-y-2">
              {["QuickFix HVAC — 2.1hr · 4.8★", "CoolPro — 4.5hr · 4.6★", "AC Masters — 1.8hr · 4.9★"].map((v, i) => (
                <div key={i} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                  <span>{v}</span>
                  <span className="text-[var(--brand-600)] font-medium">Selected</span>
                </div>
              ))}
            </div>
          </div>
        }
      />
      <FeatureSection
        label="Tenant Intelligence"
        title="Know every tenant's history before you respond"
        description="PropOS tracks every interaction, complaint, and satisfaction signal. It predicts churn risk 90 days out and triggers renewal outreach automatically."
        points={[
          "Churn risk score per tenant",
          "Unified multi-channel conversation history",
          "AI-drafted renewal messages",
        ]}
        mockup={
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-900">Sarah M. — Unit 4B</span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700">42% churn risk</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-full w-[42%] rounded-full bg-amber-400" />
            </div>
            <p className="mt-2 text-xs text-gray-500">Lease ends in 47 days · 3 open WOs</p>
          </div>
        }
        reverse
      />
      <FeatureSection
        label="Compliance"
        title="Never miss an inspection or filing deadline again"
        description="PropOS knows the compliance requirements for every jurisdiction you operate in. It tracks deadlines, auto-generates legally correct notices, and logs proof of completion."
        points={[
          "Jurisdiction-specific rulesets",
          "Legal notice generation with one click",
          "Risk report across your entire portfolio",
        ]}
        mockup={
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <div className="text-xs font-medium text-gray-500 mb-3">This Week</div>
            <div className="space-y-2">
              {["Elevator inspection — 100 Main", "Sprinkler test — Park Ave", "Fire drill — Tower B"].map((t, i) => (
                <div key={i} className="flex items-center gap-2 rounded bg-white px-3 py-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${i === 0 ? "bg-red-500" : "bg-green-500"}`} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        }
      />
      <FeatureSection
        label="Intelligence"
        title="See your next $2M in CapEx before you need it"
        description="PropOS analyzes your repair history to identify aging components — and produces a 3–5 year capital expenditure forecast per property. No spreadsheets."
        points={[
          "Pattern detection across work order history",
          "Cost projections by component",
          "Portfolio-level CapEx dashboard",
        ]}
        mockup={
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <div className="flex gap-2">
              {[2025, 2026, 2027].map((y, i) => (
                <div key={y} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full rounded-t bg-[var(--brand-500)]/40"
                    style={{ height: `${40 + i * 25}px` }}
                  />
                  <span className="text-[10px] text-gray-500 mt-1">{y}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center">Projected CapEx by year</p>
          </div>
        }
        reverse
      />

      {/* Section 5: Escalation intelligence */}
      <section className="relative overflow-hidden py-24 bg-gray-950 text-white">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--brand-500)]/30 bg-[var(--brand-500)]/20 px-3 py-1 text-xs font-medium text-[var(--brand-300)]">
                <Sparkles className="h-3.5 w-3.5" />
                Human in the loop
              </div>
              <h2
                className="text-4xl font-bold tracking-tight mb-5"
                style={{ fontFamily: "var(--font-display)" }}
              >
                PropOS handles 80%.
                <br />
                <span className="text-[var(--brand-400)]">You handle the 20% that matters.</span>
              </h2>
              <p className="mb-8 text-[17px] leading-relaxed text-gray-400">
                The AI knows exactly when it's out of its depth — legal language,
                Fair Housing concerns, large expenses, hostile tenants. It stops,
                assembles full context, and presents you with a 30-second
                decision, not a 30-minute investigation.
              </p>
              <div className="space-y-3">
                {ESCALATION_REASONS.map((reason) => (
                  <div
                    key={reason}
                    className="flex items-center gap-3 text-sm text-gray-300"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-500)]/20">
                      <Check className="h-3 w-3 text-[var(--brand-400)]" />
                    </div>
                    {reason}
                  </div>
                ))}
              </div>
            </div>
            <EscalationCardMockup />
          </div>
        </div>
      </section>

      {/* Section 6: AI Transparency */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <SectionLabel>Full Auditability</SectionLabel>
          <h2
            className="text-center text-4xl font-bold text-gray-950 mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Every AI decision is explained
            <br />
            <span className="text-gray-400">and reviewable.</span>
          </h2>
          <div className="mt-12">
            <AgentLogMockup />
          </div>
          <div className="mt-12 grid max-w-3xl grid-cols-1 gap-8 mx-auto md:grid-cols-3">
            <TrustPoint
              icon={<Eye className="h-5 w-5" />}
              title="Full reasoning log"
              body="See exactly why PropOS made each decision."
            />
            <TrustPoint
              icon={<History className="h-5 w-5" />}
              title="Complete audit trail"
              body="Every action timestamped and attributed."
            />
            <TrustPoint
              icon={<Lock className="h-5 w-5" />}
              title="SOC 2 Type II"
              body="Enterprise-grade security and compliance."
            />
          </div>
        </div>
      </section>

      {/* Section 7: Metrics / ROI */}
      <section className="py-24 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6">
          <SectionLabel>The Numbers</SectionLabel>
          <h2
            className="mb-16 text-center text-4xl font-bold text-gray-950"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Real results from real portfolios
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <MetricCard
              stat="78%"
              label="of maintenance tickets"
              sublabel="handled end-to-end by PropOS"
              delta="+23% vs industry avg"
              positive
            />
            <MetricCard
              stat="3.4×"
              label="more units per coordinator"
              sublabel="from 200 units to 680 units"
              delta="3–4× labor leverage"
              positive
            />
            <MetricCard
              stat="94%"
              label="SLA compliance rate"
              sublabel="across all work orders"
              delta="+31% vs without PropOS"
              positive
            />
            <MetricCard
              stat="$12k"
              label="avg monthly savings"
              sublabel="per 1,000 units under management"
              delta="In labor + vendor savings"
              positive
            />
          </div>
          <Testimonial
            quote="We went from 1 coordinator per 180 units to 1 coordinator per 650 units. PropOS handles the routine — our team handles relationships and exceptions."
            author="Sarah K."
            role="VP Operations, Pinnacle Residential (4,200 units)"
          />
        </div>
      </section>

      {/* Section 8: CTA footer banner */}
      <section className="py-20 bg-gray-950 text-white">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2
            className="mb-4 text-4xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready to run operations on autopilot?
          </h2>
          <p className="mb-8 text-lg text-gray-400">
            Join 1,200+ properties already using PropOS. First 30 days free.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-12 bg-white px-8 font-semibold text-gray-950 hover:bg-gray-100"
              asChild
            >
              <Link href="/register">Start Free Trial</Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 px-8 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/contact">Schedule a Demo →</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            No credit card required · Setup in 15 minutes · Cancel anytime
          </p>
        </div>
      </section>
    </>
  );
}
