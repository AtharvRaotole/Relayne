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
import { ScrollRevealSection } from "@/components/marketing/ScrollRevealSection";

const ESCALATION_REASONS = [
  "Fair Housing concern detected in tenant communication",
  "Invoice 3× above benchmark for this trade",
  "Emergency work order open for 2+ hours with no vendor response",
  "Eviction notice requested, legal review required",
  "Tenant using threatening language",
];

export default function LandingPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 min-h-[90vh] flex items-center overflow-hidden">
        {/* Background gradient orbs */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(34,211,238,0.12) 0%, rgba(34,211,238,0.04) 40%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[500px] opacity-20"
          style={{
            background:
              "radial-gradient(circle at 70% 80%, rgba(99,102,241,0.12) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 w-full">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left: Hero text */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-2 text-xs font-medium text-cyan-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Now in early access. Join 200+ property managers.
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-[44px] font-bold leading-[1.08] tracking-[-0.03em] text-white md:text-[60px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Operate fast.
                <br />
                <span className="bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
                  Win faster.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="mt-5 max-w-xl text-[17px] leading-relaxed text-zinc-400 mx-auto lg:mx-0"
              >
                Relayne handles vendor dispatch, tenant communication, and compliance
                work, end-to-end and autonomously. Your team reviews exceptions, not
                tickets.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-2"
              >
                <MetricPill icon={<Zap className="h-3.5 w-3.5" />} label="78% of tickets" sub="handled by AI" />
                <MetricPill icon={<Clock className="h-3.5 w-3.5" />} label="3× faster" sub="resolution time" />
                <MetricPill icon={<Shield className="h-3.5 w-3.5" />} label="Zero missed" sub="compliance tasks" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl border-zinc-700 bg-zinc-900/50 px-6 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all duration-200"
                  asChild
                >
                  <Link href="/contact">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Talk to Sales
                  </Link>
                </Button>
                <Button
                  size="lg"
                  className="h-12 rounded-xl bg-cyan-500 text-white px-7 text-sm font-semibold hover:bg-cyan-400 shadow-[0_0_32px_rgba(34,211,238,0.2)] hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-200"
                  asChild
                >
                  <Link href="/register">
                    Launch App
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>

            {/* Right: Dashboard preview */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div
                className="absolute -inset-4 -z-10 rounded-3xl blur-3xl opacity-25"
                style={{ background: "radial-gradient(circle, rgba(34,211,238,0.15), transparent 70%)" }}
              />
              <div
                className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl ring-1 ring-white/[0.04]"
                style={{
                  transform: "perspective(1200px) rotateX(2deg)",
                  transformOrigin: "center top",
                  boxShadow: "0 30px 80px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                }}
              >
                <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-yellow-400" />
                    <span className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="mx-auto max-w-xs rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-center text-xs text-zinc-400">
                      app.relayne.ai/dashboard
                    </div>
                  </div>
                </div>
                <DashboardPreviewMockup />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section className="relative border-y border-white/[0.04] py-14">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
            Trusted by property managers across the US
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-zinc-500">
            {["AvalonBay", "Equity Residential", "Pinnacle", "Camden", "UDR", "Greystar"].map(
              (name) => (
                <span
                  key={name}
                  className="text-lg font-semibold tracking-tight opacity-60 hover:opacity-100 transition-opacity duration-300"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {name}
                </span>
              )
            )}
          </div>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-8 mx-auto">
            <Stat value="1,200+" label="Properties managed" />
            <Stat value="94%" label="AI resolution rate" />
            <Stat value="$2.1M" label="Labor costs saved" />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-28 relative">
        <div className="mx-auto max-w-5xl px-6">
          <SectionLabel>How Relayne Works</SectionLabel>
          <h2
            className="text-center text-4xl md:text-[44px] font-bold tracking-tight text-white mb-4 leading-[1.1]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From tenant message to resolved issue
            <br />
            <span className="bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
              without touching your inbox
            </span>
          </h2>
          <p className="mx-auto mb-16 max-w-lg text-center text-zinc-400 text-[17px] leading-relaxed">
            Relayne operates as a full coordinator, reading, deciding,
            dispatching, and closing the loop.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 relative">
            <div className="absolute top-14 left-[calc(33%-16px)] right-[calc(33%-16px)] hidden h-px md:block bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            <StepCard
              number="01"
              icon={<Inbox className="h-5 w-5" />}
              title="Tenant sends message"
              description="Via email, SMS, or portal. Relayne reads, classifies intent, and identifies the unit and issue type, instantly."
              highlight="Any channel, fully unified"
            />
            <StepCard
              number="02"
              icon={<Bot className="h-5 w-5" />}
              title="AI coordinates the fix"
              description="Relayne selects the right vendor, checks availability, sends dispatch, and notifies the tenant with an ETA."
              highlight="No human touchpoint needed"
            />
            <StepCard
              number="03"
              icon={<CheckCircle className="h-5 w-5" />}
              title="Closed, logged, synced"
              description="After completion, Relayne reconciles the invoice, updates the PMS, and logs everything for audit."
              highlight="Full paper trail, always"
            />
          </div>
        </div>
      </section>

      {/* ─── FEATURE SECTIONS ─── */}
      <FeatureSection
        label="Vendor Coordination"
        title="Dispatch the right vendor in seconds, not hours"
        description="Our AI scores vendors by response time, rating, trade match, and proximity. It dispatches, follows up, and escalates if no response, all automatically."
        points={[
          "PO auto-generated within pre-approved thresholds",
          "Vendor performance tracked per property",
          "Bid requests for larger jobs",
        ]}
        mockup={
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <div className="text-xs font-medium text-zinc-400 mb-3">Vendor Comparison</div>
            <div className="space-y-2">
              {[
                { name: "QuickFix HVAC", meta: "2.1hr · 4.8★", selected: false },
                { name: "CoolPro", meta: "4.5hr · 4.6★", selected: false },
                { name: "AC Masters", meta: "1.8hr · 4.9★", selected: true },
              ].map((v, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm border ${v.selected ? "border-cyan-500/30 bg-cyan-500/[0.06]" : "border-zinc-700/50 bg-zinc-800/30"}`}>
                  <div>
                    <span className="text-zinc-200 font-medium">{v.name}</span>
                    <span className="text-zinc-500 ml-2 text-xs">{v.meta}</span>
                  </div>
                  {v.selected && <span className="text-cyan-400 text-xs font-semibold">Selected ✓</span>}
                </div>
              ))}
            </div>
          </div>
        }
      />
      <FeatureSection
        label="Tenant Intelligence"
        title="Know every tenant's history before you respond"
        description="Relayne tracks every interaction, complaint, and satisfaction signal. It predicts churn risk 90 days out and triggers renewal outreach automatically."
        points={[
          "Churn risk score per tenant",
          "Unified multi-channel conversation history",
          "AI-drafted renewal messages",
        ]}
        mockup={
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-200">Sarah M., Unit 4B</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">42% churn risk</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-700">
              <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-amber-500 to-amber-400" />
            </div>
            <p className="mt-3 text-xs text-zinc-500">Lease ends in 47 days · 3 open WOs</p>
          </div>
        }
        reverse
      />
      <FeatureSection
        label="Compliance"
        title="Never miss an inspection or filing deadline again"
        description="Relayne knows the compliance requirements for every jurisdiction you operate in. It tracks deadlines, auto-generates legally correct notices, and logs proof of completion."
        points={[
          "Jurisdiction-specific rulesets",
          "Legal notice generation with one click",
          "Risk report across your entire portfolio",
        ]}
        mockup={
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <div className="text-xs font-medium text-zinc-400 mb-3">This Week</div>
            <div className="space-y-2">
              {[
                { text: "Elevator inspection, 100 Main", urgent: true },
                { text: "Sprinkler test, Park Ave", urgent: false },
                { text: "Fire drill, Tower B", urgent: false },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-2.5 text-sm">
                  <span className={`h-2 w-2 rounded-full ${t.urgent ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]" : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]"}`} />
                  <span className="text-zinc-300">{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        }
      />
      <FeatureSection
        label="Intelligence"
        title="See your next $2M in CapEx before you need it"
        description="Relayne analyzes your repair history to identify aging components and produces a 3 to 5 year capital expenditure forecast per property. No spreadsheets."
        points={[
          "Pattern detection across work order history",
          "Cost projections by component",
          "Portfolio-level CapEx dashboard",
        ]}
        mockup={
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <div className="flex items-end gap-3 h-28 pb-2">
              {[
                { year: 2025, height: 35, color: "from-cyan-500/60 to-cyan-400/40" },
                { year: 2026, height: 55, color: "from-cyan-500/70 to-cyan-400/50" },
                { year: 2027, height: 80, color: "from-cyan-500/80 to-cyan-400/60" },
              ].map((bar) => (
                <div key={bar.year} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className={`w-full rounded-t-md bg-gradient-to-t ${bar.color}`}
                    style={{ height: `${bar.height}%` }}
                  />
                  <span className="text-[10px] text-zinc-500 mt-2 font-medium">{bar.year}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500 text-center">Projected CapEx by year</p>
          </div>
        }
        reverse
      />

      {/* ─── ESCALATION ─── */}
      <ScrollRevealSection dark className="relative overflow-hidden py-28 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div
          className="pointer-events-none absolute top-0 left-1/4 w-[600px] h-[400px] opacity-10"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.2), transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-1.5 text-xs font-semibold text-cyan-400">
                <Sparkles className="h-3.5 w-3.5" />
                Human in the loop
              </div>
              <h2
                className="text-4xl md:text-[44px] font-bold tracking-tight leading-[1.1] mb-5"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Relayne handles 80%.
                <br />
                <span className="text-zinc-400">You handle the 20% that matters.</span>
              </h2>
              <p className="mb-8 text-[17px] leading-relaxed text-zinc-400">
                The AI knows exactly when it&apos;s out of its depth: legal language,
                Fair Housing concerns, large expenses, hostile tenants. It stops,
                assembles full context, and presents you with a 30-second
                decision, not a 30-minute investigation.
              </p>
              <div className="space-y-3">
                {ESCALATION_REASONS.map((reason) => (
                  <div
                    key={reason}
                    className="flex items-center gap-3 text-sm text-zinc-300"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20">
                      <Check className="h-3 w-3 text-cyan-400" />
                    </div>
                    {reason}
                  </div>
                ))}
              </div>
            </div>
            <EscalationCardMockup />
          </div>
        </div>
      </ScrollRevealSection>

      {/* ─── AI TRANSPARENCY ─── */}
      <ScrollRevealSection dark className="py-28 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl px-6">
          <SectionLabel>Full Auditability</SectionLabel>
          <h2
            className="text-center text-4xl md:text-[44px] font-bold text-white mb-2 leading-[1.1]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Every AI decision is explained
            <br />
            <span className="text-zinc-500">and reviewable.</span>
          </h2>
          <div className="mt-12">
            <AgentLogMockup />
          </div>
          <div className="mt-14 grid max-w-3xl grid-cols-1 gap-8 mx-auto md:grid-cols-3">
            <TrustPoint
              icon={<Eye className="h-5 w-5" />}
              title="Full reasoning log"
              body="See exactly why Relayne made each decision."
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
      </ScrollRevealSection>

      {/* ─── METRICS / ROI ─── */}
      <ScrollRevealSection dark className="py-28 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl px-6">
          <SectionLabel>The Numbers</SectionLabel>
          <h2
            className="mb-16 text-center text-4xl md:text-[44px] font-bold text-white leading-[1.1]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Real results from real portfolios
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <MetricCard
              stat="78%"
              label="of maintenance tickets"
              sublabel="handled end-to-end by Relayne"
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
              delta="+31% vs without Relayne"
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
            quote="We went from 1 coordinator per 180 units to 1 coordinator per 650 units. Relayne handles the routine. Our team handles relationships and exceptions."
            author="Sarah K."
            role="VP Operations, Pinnacle Residential (4,200 units)"
          />
        </div>
      </ScrollRevealSection>

      {/* ─── CTA FOOTER ─── */}
      <ScrollRevealSection dark className="relative py-24 text-white border-t border-white/[0.04] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(34,211,238,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
          <h2
            className="mb-4 text-4xl md:text-[48px] font-bold leading-[1.1]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready to run operations on autopilot?
          </h2>
          <p className="mb-8 text-lg text-zinc-400">
            Join 1,200+ properties already using Relayne. First 30 days free.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-12 rounded-xl bg-cyan-500 text-white px-8 font-semibold hover:bg-cyan-400 shadow-[0_0_32px_rgba(34,211,238,0.2)] hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] transition-all duration-200"
              asChild
            >
              <Link href="/register">Launch App</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-zinc-700 bg-zinc-900/50 px-8 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all duration-200"
              asChild
            >
              <Link href="/contact">Schedule a Demo →</Link>
            </Button>
          </div>
          <p className="mt-5 text-sm text-zinc-500">
            No credit card required · Setup in 15 minutes · Cancel anytime
          </p>
        </div>
      </ScrollRevealSection>
    </>
  );
}
