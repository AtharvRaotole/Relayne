# Landing Page Specification
## Full Marketing Site — Page-by-Page

> Reference aesthetic: Peec AI screenshot — clean, product-forward, data-heavy hero, minimal nav, strong social proof strip.
> PropOS twist: darker, more industrial. AI coordinator framing, not analytics.

---

## Navigation — `components/marketing/Navbar.tsx`

```
Layout: Fixed top, full width, backdrop-blur glass effect
Height: 60px
Background: rgba(255,255,255,0.85) blur(12px) border-b border-gray-100

Left:   Logo — "PropOS" with small animated status dot (green, pulsing)
Center: Pricing | Docs | Careers  (hidden on mobile)
Right:  Log in (ghost) | Start Free Trial (filled brand button)
```

**Logo Component:**
```tsx
<div className="flex items-center gap-2.5">
  {/* Icon: small dark square with grid of dots pattern */}
  <div className="w-7 h-7 bg-gray-950 rounded-lg flex items-center justify-center">
    <div className="grid grid-cols-2 gap-[3px]">
      {[0,1,2,3].map(i => (
        <div key={i} className={`w-1.5 h-1.5 rounded-[2px] ${i === 3 ? 'bg-brand-500' : 'bg-white/80'}`} />
      ))}
    </div>
  </div>
  <span className="font-display font-700 text-[17px] text-gray-950 tracking-tight">PropOS</span>
</div>
```

---

## Landing Page — `app/(marketing)/page.tsx`

### Section 1: Hero

```
Background: #f8fafc with subtle dot grid pattern overlay (CSS)
           + large radial gradient bloom: rgba(99,102,241,0.06) at center-top

Layout: Centered, max-w-3xl, generous padding top (120px desktop)
```

**Badge (top of hero):**
```tsx
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-medium text-gray-600 mb-6">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
  Now in early access — join 200+ property managers
</div>
```

**Headline:**
```tsx
<h1 className="font-display text-[52px] font-bold leading-[1.1] tracking-[-0.03em] text-gray-950 text-center mb-4">
  The AI coordinator for
  <br />
  <span className="text-brand-600">property operations</span>
</h1>
```

**Subheadline:**
```tsx
<p className="text-center text-[17px] text-gray-500 leading-relaxed max-w-xl mx-auto mb-2">
  PropOS handles vendor dispatch, tenant communication, and compliance work — 
  end-to-end, autonomously. Your team reviews exceptions, not tickets.
</p>
```

**Key metric pills (inline with subhead):**
```tsx
// Three metric pills in a row, centered
<div className="flex items-center justify-center gap-2 flex-wrap mb-8">
  <MetricPill icon={<Zap />} label="78% of tickets" sub="handled by AI" />
  <MetricPill icon={<Clock />} label="3× faster" sub="resolution time" />  
  <MetricPill icon={<Shield />} label="Zero missed" sub="compliance tasks" />
</div>
```

**CTA buttons:**
```tsx
<div className="flex items-center justify-center gap-3">
  <Button 
    variant="outline" 
    size="lg" 
    className="h-11 px-6 text-sm font-medium border-gray-200 hover:border-gray-300"
  >
    <CalendarDays className="w-4 h-4 mr-2" />
    Talk to Sales
  </Button>
  <Button 
    size="lg" 
    className="h-11 px-6 text-sm font-medium bg-gray-950 hover:bg-gray-800 text-white"
  >
    Start Free Trial
    <ArrowRight className="w-4 h-4 ml-2" />
  </Button>
</div>
```

**Dashboard Preview (hero image):**
```tsx
// Browser-frame mockup of the dashboard
// Slightly tilted perspective (transform: perspective(1200px) rotateX(4deg))
// Fade at bottom into page background
// Has glow: box-shadow: 0 30px 80px -10px rgba(99,102,241,0.2)
<div className="mt-16 mx-auto max-w-5xl relative">
  {/* Glow effect behind screenshot */}
  <div className="absolute inset-0 -z-10 bg-brand-500/10 blur-3xl rounded-3xl scale-90" />
  
  {/* Browser chrome frame */}
  <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-2xl"
       style={{ transform: 'perspective(1200px) rotateX(3deg)', transformOrigin: 'center top' }}>
    {/* Browser top bar */}
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div className="flex-1 mx-4">
        <div className="bg-white rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-400 max-w-xs mx-auto text-center">
          app.propos.ai/dashboard
        </div>
      </div>
    </div>
    {/* Dashboard screenshot — use actual screenshot or animated mockup */}
    <DashboardPreviewMockup />
  </div>
</div>
```

---

### Section 2: Social Proof Bar

```tsx
<section className="border-y border-gray-100 bg-white py-8">
  <div className="max-w-5xl mx-auto px-6">
    <p className="text-center text-xs font-semibold tracking-widest text-gray-400 uppercase mb-6">
      Trusted by property managers across the US
    </p>
    {/* Logo strip — 2 rows: left "Operators" / right "Management Companies" */}
    <div className="flex items-center justify-center gap-10 flex-wrap opacity-50 grayscale">
      {/* Company name logos in same style as Peec AI screenshot */}
      {CUSTOMER_LOGOS.map(logo => (
        <img key={logo.name} src={logo.src} alt={logo.name} className="h-5 object-contain" />
      ))}
    </div>
    {/* Stats row */}
    <div className="mt-8 grid grid-cols-3 gap-8 max-w-lg mx-auto">
      <Stat value="1,200+" label="Properties managed" />
      <Stat value="94%" label="AI resolution rate" />
      <Stat value="$2.1M" label="Labor costs saved" />
    </div>
  </div>
</section>
```

---

### Section 3: How It Works (3-step flow)

```tsx
<section className="py-24 bg-white">
  <div className="max-w-5xl mx-auto px-6">
    <SectionLabel>How PropOS Works</SectionLabel>
    <h2 className="text-4xl font-display font-bold tracking-tight text-gray-950 text-center mb-4">
      From tenant message to resolved issue
      <br />
      <span className="text-gray-400">without touching your inbox</span>
    </h2>
    <p className="text-center text-gray-500 mb-16 max-w-md mx-auto">
      PropOS operates as a full coordinator — reading, deciding, dispatching, and closing the loop.
    </p>

    {/* Flow diagram: 3 cards connected by arrows */}
    <div className="grid grid-cols-3 gap-6 relative">
      {/* Connecting line between cards */}
      <div className="absolute top-12 left-[calc(33%-16px)] right-[calc(33%-16px)] h-px bg-gradient-to-r from-gray-200 via-brand-300 to-gray-200" />
      
      <StepCard
        number="01"
        icon={<Inbox />}
        title="Tenant sends message"
        description="Via email, SMS, or portal. PropOS reads, classifies intent, and identifies the unit and issue type — instantly."
        highlight="Any channel, fully unified"
      />
      <StepCard
        number="02"
        icon={<Bot />}
        title="AI coordinates the fix"
        description="PropOS selects the right vendor, checks availability, sends dispatch, and notifies the tenant with an ETA."
        highlight="No human touchpoint needed"
      />
      <StepCard
        number="03"
        icon={<CheckCircle />}
        title="Closed, logged, synced"
        description="After completion, PropOS reconciles the invoice, updates the PMS, and logs everything for audit."
        highlight="Full paper trail, always"
      />
    </div>
  </div>
</section>
```

---

### Section 4: Feature Showcase (alternating left/right)

```
Pattern: Feature name | Screenshot on right → next feature flips to left
Background alternates: white / gray-50
```

**Feature 1: Autonomous Vendor Dispatch**
```
Left: Text content
  - Label chip: "Vendor Coordination"
  - H3: "Dispatch the right vendor in seconds, not hours"
  - Body: Our AI scores vendors by response time, rating, trade match, and proximity. It dispatches, follows up, and escalates if no response — all automatically.
  - Key points (3 bullet icons):
    • PO auto-generated within pre-approved thresholds
    • Vendor performance tracked per property
    • Bid requests for larger jobs

Right: Animated UI mockup showing vendor comparison table with scores
```

**Feature 2: Tenant Relationship Memory**
```
Right: Text content
  - Label chip: "Tenant Intelligence"  
  - H3: "Know every tenant's history before you respond"
  - Body: PropOS tracks every interaction, complaint, and satisfaction signal. It predicts churn risk 90 days out and triggers renewal outreach automatically.
  - Key points:
    • Churn risk score per tenant
    • Unified multi-channel conversation history
    • AI-drafted renewal messages

Left: Tenant profile card mockup with churn risk gauge, message timeline
```

**Feature 3: Compliance Autopilot**
```
Left: Text content
  - Label chip: "Compliance"
  - H3: "Never miss an inspection or filing deadline again"
  - Body: PropOS knows the compliance requirements for every jurisdiction you operate in. It tracks deadlines, auto-generates legally correct notices, and logs proof of completion.
  - Key points:
    • Jurisdiction-specific rulesets
    • Legal notice generation with one click
    • Risk report across your entire portfolio

Right: Compliance calendar mockup with status indicators
```

**Feature 4: Capital Planning**
```
Right: Text content
  - Label chip: "Intelligence"  
  - H3: "See your next $2M in CapEx before you need it"
  - Body: PropOS analyzes your repair history to identify aging components — and produces a 3–5 year capital expenditure forecast per property. No spreadsheets.
  - Key points:
    • Pattern detection across work order history
    • Cost projections by component
    • Portfolio-level CapEx dashboard

Left: Bar chart mockup showing projected capital needs by year/property
```

---

### Section 5: Escalation Intelligence (Standout Feature Callout)

```tsx
<section className="py-24 bg-gray-950 text-white relative overflow-hidden">
  {/* Background grid */}
  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url(/grid-white.svg)' }} />
  
  <div className="max-w-5xl mx-auto px-6 relative z-10">
    <div className="grid grid-cols-2 gap-16 items-center">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Human in the loop
        </div>
        <h2 className="text-4xl font-display font-bold tracking-tight mb-5">
          PropOS handles 80%.
          <br />
          <span className="text-brand-400">You handle the 20% that matters.</span>
        </h2>
        <p className="text-gray-400 text-[17px] leading-relaxed mb-8">
          The AI knows exactly when it's out of its depth — legal language, Fair Housing concerns, large expenses, hostile tenants. It stops, assembles full context, and presents you with a 30-second decision, not a 30-minute investigation.
        </p>
        <div className="space-y-3">
          {ESCALATION_REASONS.map(reason => (
            <div key={reason} className="flex items-center gap-3 text-sm text-gray-300">
              <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-brand-400" />
              </div>
              {reason}
            </div>
          ))}
        </div>
      </div>
      
      {/* Escalation card mockup */}
      <EscalationCardMockup />
    </div>
  </div>
</section>
```

**ESCALATION_REASONS:**
- Fair Housing concern detected in tenant communication
- Invoice 3× above benchmark for this trade
- Emergency work order open for 2+ hours with no vendor response
- Eviction notice requested — legal review required
- Tenant using threatening language

---

### Section 6: AI Transparency (Audit Trail)

```tsx
<section className="py-24 bg-white">
  <SectionLabel>Full Auditability</SectionLabel>
  <h2 className="text-4xl font-bold text-center">
    Every AI decision is explained
    <br />
    <span className="text-gray-400">and reviewable.</span>
  </h2>
  
  {/* Agent log mockup — showing step-by-step reasoning */}
  <AgentLogMockup />
  
  {/* 3 trust points below */}
  <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-12">
    <TrustPoint icon={<Eye />} title="Full reasoning log" body="See exactly why PropOS made each decision." />
    <TrustPoint icon={<History />} title="Complete audit trail" body="Every action timestamped and attributed." />
    <TrustPoint icon={<Lock />} title="SOC 2 Type II" body="Enterprise-grade security and compliance." />
  </div>
</section>
```

---

### Section 7: Metrics / ROI Section

```tsx
<section className="py-24 bg-gray-50">
  <div className="max-w-5xl mx-auto px-6">
    <SectionLabel>The Numbers</SectionLabel>
    <h2 className="text-4xl font-bold text-center mb-16">
      Real results from real portfolios
    </h2>
    
    <div className="grid grid-cols-2 gap-6">
      {/* Large stat cards */}
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
    
    {/* Quote */}
    <Testimonial
      quote="We went from 1 coordinator per 180 units to 1 coordinator per 650 units. PropOS handles the routine — our team handles relationships and exceptions."
      author="Sarah K."
      role="VP Operations, Pinnacle Residential (4,200 units)"
    />
  </div>
</section>
```

---

### Section 8: Pricing — `app/(marketing)/pricing/page.tsx`

```tsx
{/* Pricing toggle: Monthly / Annual */}
<PricingToggle />

<div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto mt-10">
  <PricingCard
    name="Starter"
    price={{ monthly: 2.50, annual: 2.00 }}
    unit="per unit/month"
    description="For growing portfolios up to 1,000 units."
    features={[
      'Up to 1,000 units',
      'Maintenance coordination',
      'Vendor dispatch',
      'Basic tenant comms',
      'AppFolio / Buildium sync',
      'Email + SMS',
    ]}
    cta="Start Free Trial"
    ctaVariant="outline"
  />
  
  <PricingCard
    name="Growth"
    price={{ monthly: 3.50, annual: 2.80 }}
    unit="per unit/month"
    description="For established operators with compliance needs."
    features={[
      'Up to 5,000 units',
      'Everything in Starter',
      'Compliance autopilot',
      'Lease renewal automation',
      'Capital planning',
      'Invoice reconciliation',
      'Portfolio benchmarking',
      'Priority support',
    ]}
    cta="Start Free Trial"
    ctaVariant="primary"
    highlighted
    badge="Most Popular"
  />
  
  <PricingCard
    name="Enterprise"
    price="Custom"
    description="For large operators and management companies."
    features={[
      'Unlimited units',
      'Everything in Growth',
      'Custom PMS integrations',
      'Dedicated AI model fine-tuning',
      'SOC 2 + custom DPA',
      'SLA guarantees',
      'Dedicated success manager',
      'On-prem deployment option',
    ]}
    cta="Talk to Sales"
    ctaVariant="outline"
  />
</div>
```

---

### Section 9: CTA Footer Banner

```tsx
<section className="py-20 bg-gray-950 text-white">
  <div className="max-w-2xl mx-auto text-center px-6">
    <h2 className="text-4xl font-display font-bold mb-4">
      Ready to run operations on autopilot?
    </h2>
    <p className="text-gray-400 text-lg mb-8">
      Join 1,200+ properties already using PropOS. First 30 days free.
    </p>
    <div className="flex items-center justify-center gap-3">
      <Button size="lg" className="bg-white text-gray-950 hover:bg-gray-100 h-12 px-8 font-semibold">
        Start Free Trial
      </Button>
      <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 h-12 px-8">
        Schedule a Demo →
      </Button>
    </div>
    <p className="text-gray-600 text-sm mt-4">No credit card required · Setup in 15 minutes · Cancel anytime</p>
  </div>
</section>
```

---

### Footer — `components/marketing/Footer.tsx`

```
4-column footer: dark bg (#0f1117)
  Col 1: Logo + tagline + social links
  Col 2: Product (Features, Pricing, Docs, Changelog)
  Col 3: Company (About, Blog, Careers, Press)
  Col 4: Legal (Privacy, Terms, Security, Status)

Bottom bar: © 2025 PropOS Inc. · Made for property managers who want to move fast
```

---

## Animation Notes for Landing Page

1. **Hero entrance**: Stagger badge → headline → subtext → pills → buttons → dashboard preview (200ms between each)
2. **Dashboard preview**: Subtle float animation (transform: translateY(0px ↔ -8px), 4s ease-in-out infinite)
3. **Stats counter**: Numbers count up when scrolled into view
4. **Feature sections**: Slide in from appropriate side when entering viewport
5. **Escalation section**: Cards appear with slight stagger on scroll enter
6. **Metric cards**: Scale from 0.95 → 1 with opacity when in view

```tsx
// Scroll animation hook
export function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])
  
  return { ref, inView }
}
```
