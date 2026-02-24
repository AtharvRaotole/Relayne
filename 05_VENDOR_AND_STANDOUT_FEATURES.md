# Vendor Coordination & Standout Features
## Intelligent Dispatch, Invoice Reconciliation, Benchmarking, and Capital Planning

---

## Vendor Dispatch Engine — `src/agent/tools/vendor.tools.ts`

```typescript
import { prisma } from '../../lib/prisma'
import { sendEmail } from '../../integrations/email/sendgrid/sender'
import { sendSms } from '../../integrations/sms/twilio/sender'
import { logger } from '../../lib/logger'

export async function findAvailableVendors(organizationId: string, input: {
  trade: string
  propertyZip: string
  priority: string
  estimatedBudget?: number
}) {
  const { trade, propertyZip, priority, estimatedBudget } = input

  // Determine vendor tier based on priority
  const tierFilter = priority === 'EMERGENCY'
    ? ['PREFERRED', 'STANDARD']    // All tiers for emergency
    : priority === 'HIGH'
      ? ['PREFERRED', 'STANDARD']
      : ['PREFERRED', 'STANDARD', 'BACKUP']

  const vendors = await prisma.vendor.findMany({
    where: {
      organizationId,
      isActive: true,
      preferredTier: { in: tierFilter as any },
      trades: { has: trade.toLowerCase() },
      // Check ZIP coverage
      OR: [
        { serviceZips: { has: propertyZip } },
        { serviceZips: { isEmpty: true } }, // Some vendors service all areas
      ],
    },
    include: {
      ratings: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      }
    },
    orderBy: [
      { preferredTier: 'asc' },
      { avgRating: 'desc' },
      { completionRate: 'desc' },
    ]
  })

  // Score and rank vendors
  const scoredVendors = vendors.map(vendor => {
    const score = calculateVendorScore(vendor, { priority, estimatedBudget })
    
    return {
      vendorId: vendor.id,
      vendorName: vendor.companyName,
      score,
      tier: vendor.preferredTier,
      avgResponseTimeHours: vendor.avgResponseTimeHours,
      avgRating: vendor.avgRating,
      completionRate: vendor.completionRate,
      totalJobsCompleted: vendor.totalJobsCompleted,
      laborRates: vendor.laborRates,
      reasons: buildScoreReasons(vendor, score),
    }
  })

  scoredVendors.sort((a, b) => b.score - a.score)

  return {
    vendors: scoredVendors.slice(0, 5),  // Top 5
    totalFound: scoredVendors.length,
  }
}

function calculateVendorScore(vendor: any, context: { priority: string, estimatedBudget?: number }): number {
  let score = 0

  // Response time (0-30 points) — critical for emergency
  if (context.priority === 'EMERGENCY') {
    if (vendor.avgResponseTimeHours <= 1) score += 30
    else if (vendor.avgResponseTimeHours <= 2) score += 25
    else if (vendor.avgResponseTimeHours <= 4) score += 15
    else score += 5
  } else {
    if (vendor.avgResponseTimeHours <= 4) score += 20
    else if (vendor.avgResponseTimeHours <= 24) score += 15
    else score += 5
  }

  // Rating (0-30 points)
  score += (vendor.avgRating / 5) * 30

  // Completion rate (0-20 points)
  score += vendor.completionRate * 20

  // Experience volume (0-10 points)
  if (vendor.totalJobsCompleted >= 50) score += 10
  else if (vendor.totalJobsCompleted >= 20) score += 7
  else if (vendor.totalJobsCompleted >= 5) score += 4

  // Preferred tier bonus
  if (vendor.preferredTier === 'PREFERRED') score += 10

  return Math.min(100, score)
}

function buildScoreReasons(vendor: any, score: number): string[] {
  const reasons = []
  if (vendor.avgResponseTimeHours <= 2) reasons.push(`Avg response ${vendor.avgResponseTimeHours}h`)
  if (vendor.avgRating >= 4.5) reasons.push(`${vendor.avgRating.toFixed(1)}⭐ rating`)
  if (vendor.completionRate >= 0.95) reasons.push(`${Math.round(vendor.completionRate * 100)}% completion rate`)
  if (vendor.totalJobsCompleted >= 20) reasons.push(`${vendor.totalJobsCompleted} jobs completed`)
  return reasons
}

export async function dispatchVendor(organizationId: string, input: {
  workOrderId: string
  vendorId: string
  schedulingInstructions?: string
  message?: string
}) {
  const [workOrder, vendor] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id: input.workOrderId },
      include: { property: true, unit: true, tenant: true }
    }),
    prisma.vendor.findUnique({ where: { id: input.vendorId } })
  ])

  if (!workOrder || !vendor) throw new Error('Work order or vendor not found')

  // Generate PO number
  const poNumber = generatePoNumber(organizationId)

  // Update work order
  await prisma.workOrder.update({
    where: { id: input.workOrderId },
    data: {
      vendorId: input.vendorId,
      status: 'DISPATCHED',
      poNumber,
    }
  })

  // Build dispatch message
  const dispatchMessage = buildVendorDispatchMessage(workOrder, vendor, input)

  // Send via vendor's preferred channel
  if (vendor.preferredChannel === 'EMAIL' && vendor.email) {
    await sendEmail({
      to: vendor.email,
      toName: vendor.contactName || vendor.companyName,
      subject: `New Work Order: ${workOrder.title} — ${workOrder.property.name}`,
      text: dispatchMessage,
      organizationId,
    })
  } else if (vendor.preferredChannel === 'SMS' && vendor.phone) {
    // SMS version is shorter
    const smsMessage = `New job: ${workOrder.title} at ${workOrder.property.address}. Unit ${workOrder.unit?.unitNumber || 'N/A'}. ${workOrder.priority === 'EMERGENCY' ? '🚨 EMERGENCY' : ''} Reply CONFIRM or DECLINE. Details: ${process.env.VENDOR_PORTAL_URL}/jobs/${workOrder.id}`
    await sendSms({ to: vendor.phone, body: smsMessage, organizationId })
  }

  // Log event
  await prisma.workOrderEvent.create({
    data: {
      workOrderId: input.workOrderId,
      eventType: 'vendor_dispatched',
      description: `Dispatched to ${vendor.companyName}`,
      metadata: { vendorId: input.vendorId, poNumber, channel: vendor.preferredChannel },
      actorType: 'ai',
    }
  })

  // Notify tenant
  if (workOrder.tenant) {
    const tenantMessage = buildTenantDispatchNotification(workOrder, vendor)
    if (workOrder.tenant.preferredChannel === 'SMS' && workOrder.tenant.phone) {
      await sendSms({ to: workOrder.tenant.phone, body: tenantMessage, organizationId })
    } else if (workOrder.tenant.email) {
      await sendEmail({
        to: workOrder.tenant.email,
        toName: workOrder.tenant.firstName,
        subject: `Update: ${workOrder.title}`,
        text: tenantMessage,
        organizationId,
      })
    }
  }

  return {
    success: true,
    poNumber,
    vendorNotified: true,
    tenantNotified: !!workOrder.tenant,
    channel: vendor.preferredChannel,
  }
}

function buildVendorDispatchMessage(workOrder: any, vendor: any, input: any): string {
  const priority = workOrder.priority === 'EMERGENCY' ? '🚨 EMERGENCY — SAME DAY RESPONSE REQUIRED\n\n' : ''
  const tenantContact = workOrder.tenant
    ? `Tenant Contact: ${workOrder.tenant.firstName} — ${workOrder.tenant.phone || 'No phone'}`
    : 'No direct tenant contact — call the office for access'

  return `${priority}New Work Order Assignment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PO #: ${workOrder.poNumber}
Priority: ${workOrder.priority}
Property: ${workOrder.property.name}
Address: ${JSON.stringify(workOrder.property.address)}
Unit: ${workOrder.unit?.unitNumber || 'Common area'}

Issue: ${workOrder.title}
Details: ${workOrder.description}

Access Instructions: ${workOrder.accessInstructions || 'Standard key in lockbox — call for code'}
${tenantContact}

${input.schedulingInstructions ? `Scheduling Notes: ${input.schedulingInstructions}` : ''}
${input.message ? `\nAdditional Notes: ${input.message}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please confirm receipt and provide an ETA.
Track this job: ${process.env.VENDOR_PORTAL_URL}/jobs/${workOrder.id}

Questions? Reply to this email or call the office.`
}

function buildTenantDispatchNotification(workOrder: any, vendor: any): string {
  return `Hi ${workOrder.tenant.firstName},

We've scheduled ${vendor.companyName} to address your ${workOrder.category.toLowerCase().replace('_', ' ')} issue.

They'll be reaching out to confirm a time. If you don't hear from them within 24 hours, please let us know.

Issue: ${workOrder.title}
Priority: ${workOrder.priority === 'EMERGENCY' ? 'Emergency — same day' : workOrder.priority === 'HIGH' ? 'Within 24 hours' : 'Within 3 business days'}

Thank you for your patience.`
}

function generatePoNumber(organizationId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const orgCode = organizationId.slice(-4).toUpperCase()
  return `PO-${orgCode}-${timestamp}`
}

export async function requestVendorBids(organizationId: string, input: {
  workOrderId: string
  vendorIds: string[]
  bidDeadlineHours?: number
  scopeOfWork: string
}) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: input.workOrderId },
    include: { property: true, unit: true }
  })
  if (!workOrder) throw new Error('Work order not found')

  const vendors = await prisma.vendor.findMany({
    where: { id: { in: input.vendorIds } }
  })

  const bidDeadline = new Date(Date.now() + (input.bidDeadlineHours || 48) * 60 * 60 * 1000)

  const bids = []
  for (const vendor of vendors) {
    // Create pending bid record
    const bid = await prisma.vendorBid.create({
      data: {
        workOrderId: input.workOrderId,
        vendorId: vendor.id,
        amount: 0,  // To be filled by vendor
        validUntil: bidDeadline,
        status: 'PENDING',
        notes: 'Awaiting vendor bid submission',
      }
    })
    bids.push(bid)

    // Send bid request
    const bidRequestMessage = `Bid Request — ${workOrder.title}

Property: ${workOrder.property.name}
Unit: ${workOrder.unit?.unitNumber || 'Common area'}

Scope of Work:
${input.scopeOfWork}

Please submit your bid by: ${bidDeadline.toLocaleString()}
Submit here: ${process.env.VENDOR_PORTAL_URL}/bids/${bid.id}

Questions? Reply to this email.`

    if (vendor.email) {
      await sendEmail({
        to: vendor.email,
        subject: `Bid Request: ${workOrder.title}`,
        text: bidRequestMessage,
        organizationId,
      })
    }
  }

  await prisma.workOrder.update({
    where: { id: input.workOrderId },
    data: { status: 'PENDING_BIDS' }
  })

  return {
    bidsRequested: bids.length,
    deadline: bidDeadline,
    vendorsContacted: vendors.map(v => v.companyName),
  }
}

export async function getVendorPerformance(input: { vendorId: string }) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId },
    include: {
      ratings: { orderBy: { createdAt: 'desc' }, take: 10 },
      workOrders: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 20,
        select: {
          id: true, title: true, category: true, completedAt: true,
          createdAt: true, scheduledAt: true, actualCost: true, estimatedCost: true
        }
      }
    }
  })

  if (!vendor) throw new Error('Vendor not found')

  // Compute response time distribution
  const completedJobs = vendor.workOrders.filter(wo => wo.completedAt && wo.scheduledAt)
  const avgDaysToComplete = completedJobs.length > 0
    ? completedJobs.reduce((sum, wo) => {
        const days = (wo.completedAt!.getTime() - wo.createdAt.getTime()) / 1000 / 60 / 60 / 24
        return sum + days
      }, 0) / completedJobs.length
    : null

  return {
    vendorId: vendor.id,
    name: vendor.companyName,
    tier: vendor.preferredTier,
    metrics: {
      avgRating: vendor.avgRating,
      completionRate: vendor.completionRate,
      avgResponseTimeHours: vendor.avgResponseTimeHours,
      avgDaysToComplete,
      totalJobsCompleted: vendor.totalJobsCompleted,
      insuranceExpiry: vendor.insuranceExpiry,
      licenseExpiry: vendor.licenseExpiry,
    },
    recentRatings: vendor.ratings,
    recentJobs: vendor.workOrders.slice(0, 5),
  }
}
```

---

## Invoice Reconciliation Engine — `src/jobs/processors/invoice-reconcile.processor.ts`

```typescript
import { Job } from 'bullmq'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'

const client = new Anthropic()

export async function processInvoiceReconciliation(job: Job) {
  const { invoiceId, organizationId } = job.data

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      workOrders: {
        include: {
          property: true,
          vendor: true,
        }
      }
    }
  })

  if (!invoice || !invoice.workOrders.length) return

  const workOrder = invoice.workOrders[0]
  const vendor = workOrder.vendor

  // Get pricing benchmarks for this trade in this area
  const benchmarks = await getPricingBenchmarks(
    organizationId,
    workOrder.category,
    workOrder.property?.address as any
  )

  // Use Claude to analyze the invoice
  const analysisPrompt = `You are a property management invoice auditor. Analyze this invoice for anomalies.

Work Order: ${workOrder.title}
Category: ${workOrder.category}
Property: ${workOrder.property?.name}
Vendor: ${vendor?.companyName}

Invoice Details:
- Total Amount: $${invoice.totalAmount}
- Line Items: ${JSON.stringify(invoice.lineItems, null, 2)}
- Vendor's typical labor rate: $${(vendor?.laborRates as any)?.hourly || 'Unknown'}/hr

Market Benchmarks for this trade/area:
${JSON.stringify(benchmarks, null, 2)}

Historical data for this vendor:
- Average job cost: (compute from work order history if available)
- Total jobs completed: ${vendor?.totalJobsCompleted}

Flag anomalies if:
1. Total exceeds benchmark by more than 50%
2. Labor hours seem unreasonable for the scope
3. Parts/materials are marked up more than 30% above typical
4. Line items don't match the scope of work
5. Duplicate charges detected

Respond as JSON: {
  "hasAnomaly": boolean,
  "anomalyReason": string | null,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "recommendedAction": "APPROVE" | "REVIEW" | "DISPUTE",
  "notes": string,
  "lineItemAnalysis": [{ item: string, verdict: "ok"|"high"|"suspicious", note: string }]
}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',  // Use Haiku for cost efficiency on this task
    max_tokens: 1024,
    messages: [{ role: 'user', content: analysisPrompt }]
  })

  const analysisText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  let analysis: any = {}
  
  try {
    const cleaned = analysisText.replace(/```json|```/g, '').trim()
    analysis = JSON.parse(cleaned)
  } catch {
    analysis = { hasAnomaly: false, recommendedAction: 'REVIEW', notes: 'Analysis parsing failed' }
  }

  // Update invoice with AI analysis
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      aiReviewed: true,
      aiAnomalyFlag: analysis.hasAnomaly,
      aiAnomalyReason: analysis.anomalyReason,
      status: analysis.hasAnomaly ? 'UNDER_REVIEW' : 'PENDING',
    }
  })

  // Auto-approve small invoices with no anomaly
  const autoApproveThreshold = 300
  if (!analysis.hasAnomaly && invoice.totalAmount <= autoApproveThreshold) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'APPROVED' }
    })
  }

  return analysis
}

async function getPricingBenchmarks(organizationId: string, category: string, address: any) {
  // Aggregate pricing data across org's completed work orders for same category/region
  const completedOrders = await prisma.workOrder.findMany({
    where: {
      organizationId,
      category: category as any,
      status: 'COMPLETED',
      actualCost: { not: null, gt: 0 },
      completedAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }  // Last 12 months
    },
    select: { actualCost: true, estimatedCost: true }
  })

  if (completedOrders.length === 0) return { message: 'No historical data available' }

  const costs = completedOrders.map(o => o.actualCost!).sort((a, b) => a - b)
  const avg = costs.reduce((s, c) => s + c, 0) / costs.length
  const median = costs[Math.floor(costs.length / 2)]
  const p75 = costs[Math.floor(costs.length * 0.75)]
  const p90 = costs[Math.floor(costs.length * 0.9)]

  return {
    category,
    sampleSize: completedOrders.length,
    avg: Math.round(avg),
    median: Math.round(median),
    p75: Math.round(p75),
    p90: Math.round(p90),
    highFlag: Math.round(p90 * 1.5),  // Flag if invoice is 50% above 90th percentile
  }
}
```

---

## Capital Planning Engine — `src/jobs/processors/capital-plan.processor.ts`

```typescript
import { Job } from 'bullmq'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'
import { WorkOrderCategory } from '@prisma/client'

const client = new Anthropic()

// Component lifecycle data (years) — research-based defaults
const COMPONENT_LIFESPANS: Partial<Record<WorkOrderCategory, {
  avgLife: number
  earlyFailureSignals: number  // # repairs that suggest impending failure
}>> = {
  HVAC: { avgLife: 15, earlyFailureSignals: 2 },
  ROOFING: { avgLife: 20, earlyFailureSignals: 3 },
  PLUMBING: { avgLife: 40, earlyFailureSignals: 4 },
  ELECTRICAL: { avgLife: 25, earlyFailureSignals: 2 },
  APPLIANCE: { avgLife: 12, earlyFailureSignals: 2 },
  ELEVATOR: { avgLife: 25, earlyFailureSignals: 3 },
  FLOORING: { avgLife: 15, earlyFailureSignals: 2 },
}

export async function processCapitalPlanRefresh(job: Job) {
  // Get all active organizations
  const orgs = await prisma.organization.findMany({
    where: { plan: { in: ['GROWTH', 'ENTERPRISE'] } },
    include: { properties: true }
  })

  for (const org of orgs) {
    for (const property of org.properties) {
      await refreshCapitalPlanForProperty(property.id, org.id)
    }
  }
}

async function refreshCapitalPlanForProperty(propertyId: string, organizationId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      workOrders: {
        where: {
          status: 'COMPLETED',
          completedAt: { gte: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) }  // 5 years
        },
        select: {
          category: true, title: true, actualCost: true,
          completedAt: true, resolutionNotes: true
        }
      }
    }
  })

  if (!property) return

  // Analyze work order patterns by category
  const categoryAnalysis: Record<string, {
    repairCount: number
    totalCost: number
    recentCount: number  // Last 2 years
    titles: string[]
  }> = {}

  for (const wo of property.workOrders) {
    if (!categoryAnalysis[wo.category]) {
      categoryAnalysis[wo.category] = { repairCount: 0, totalCost: 0, recentCount: 0, titles: [] }
    }
    categoryAnalysis[wo.category].repairCount++
    categoryAnalysis[wo.category].totalCost += wo.actualCost || 0
    categoryAnalysis[wo.category].titles.push(wo.title)
    
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
    if (wo.completedAt && wo.completedAt > twoYearsAgo) {
      categoryAnalysis[wo.category].recentCount++
    }
  }

  // Generate capital plan items using AI
  const prompt = `You are a property capital planning expert. Analyze this maintenance history and generate a 5-year capital expenditure forecast.

Property: ${property.name}
Year Built: ${property.yearBuilt || 'Unknown'}
Unit Count: ${property.unitCount}

Repair History by Category (last 5 years):
${JSON.stringify(categoryAnalysis, null, 2)}

Component Lifespan Reference:
${JSON.stringify(COMPONENT_LIFESPANS, null, 2)}

For each category with 2+ repairs or high repair frequency, predict:
1. Is this component showing early failure signals?
2. What is the projected replacement year?
3. What is the estimated replacement cost?

Respond as JSON array: [{
  "category": string,
  "component": string (specific description),
  "failureSignals": number,
  "projectedReplacementYear": number,
  "estimatedCost": number,
  "priority": "LOW"|"NORMAL"|"HIGH"|"EMERGENCY",
  "notes": string
}]

Only include items with genuine capital planning concern. Skip minor/routine items.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '[]'
  let items: any[] = []

  try {
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    items = JSON.parse(cleaned)
  } catch {
    return
  }

  // Upsert capital plan items
  for (const item of items) {
    await prisma.capitalPlanItem.upsert({
      where: {
        // Composite unique — property + category + component
        id: `${propertyId}-${item.category}-${item.component}`.slice(0, 30),
      },
      create: {
        propertyId,
        category: item.category,
        component: item.component,
        failureSignals: item.failureSignals,
        projectedReplacementYear: item.projectedReplacementYear,
        estimatedCost: item.estimatedCost,
        priority: item.priority,
        notes: item.notes,
      },
      update: {
        failureSignals: item.failureSignals,
        projectedReplacementYear: item.projectedReplacementYear,
        estimatedCost: item.estimatedCost,
        priority: item.priority,
        notes: item.notes,
      }
    })
  }
}
```

---

## Tenant Churn Risk Engine — `src/modules/tenants/churn-risk.service.ts`

```typescript
import { prisma } from '../../lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { addDays } from 'date-fns'

const client = new Anthropic()

export async function computeChurnRisk(tenantId: string): Promise<number> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      leases: { orderBy: { createdAt: 'desc' }, take: 1 },
      messages: { orderBy: { createdAt: 'desc' }, take: 30 },
      workOrders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { status: true, priority: true, createdAt: true, category: true }
      }
    }
  })

  if (!tenant) throw new Error('Tenant not found')

  const activeLease = tenant.leases[0]
  const daysUntilExpiry = activeLease
    ? Math.ceil((activeLease.endDate.getTime() - Date.now()) / 1000 / 60 / 60 / 24)
    : null

  // Score factors
  let riskScore = 0
  let maxScore = 0

  // Factor 1: Lease expiry proximity (0-25 points)
  maxScore += 25
  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry < 0) riskScore += 25       // Expired
    else if (daysUntilExpiry < 30) riskScore += 20  // <30 days
    else if (daysUntilExpiry < 60) riskScore += 15  // <60 days
    else if (daysUntilExpiry < 90) riskScore += 10  // <90 days
    else riskScore += 2
  }

  // Factor 2: Open maintenance issues (0-20 points)
  maxScore += 20
  const openIssues = tenant.workOrders.filter(wo =>
    !['COMPLETED', 'CANCELLED'].includes(wo.status)
  ).length
  riskScore += Math.min(20, openIssues * 7)

  // Factor 3: Negative sentiment in recent messages (0-20 points)
  maxScore += 20
  const recentMessages = await prisma.message.findMany({
    where: {
      tenantId,
      direction: 'INBOUND',
      createdAt: { gte: addDays(new Date(), -60) },
      aiSentiment: { not: null }
    },
    select: { aiSentiment: true }
  })
  if (recentMessages.length > 0) {
    const avgSentiment = recentMessages.reduce((s, m) => s + (m.aiSentiment || 0), 0) / recentMessages.length
    riskScore += Math.round((1 - avgSentiment) * 20)  // Negative sentiment = higher risk
  }

  // Factor 4: Communication frequency drop (0-15 points)
  maxScore += 15
  const recentCount = tenant.messages.filter(m =>
    m.createdAt > addDays(new Date(), -30)
  ).length
  const olderCount = tenant.messages.filter(m =>
    m.createdAt > addDays(new Date(), -90) && m.createdAt <= addDays(new Date(), -30)
  ).length
  if (olderCount > 0 && recentCount < olderCount * 0.3) {
    riskScore += 15  // Major engagement drop
  } else if (olderCount > 0 && recentCount < olderCount * 0.6) {
    riskScore += 8
  }

  // Factor 5: No renewal inquiry (0-20 points) — only if lease < 90 days
  maxScore += 20
  if (daysUntilExpiry !== null && daysUntilExpiry < 90 && !activeLease.renewalSentAt) {
    riskScore += 20
  }

  const normalizedScore = maxScore > 0 ? riskScore / maxScore : 0

  // Update tenant churn risk score
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { churnRiskScore: normalizedScore }
  })

  return normalizedScore
}
```

---

## Portfolio Benchmarking — `src/modules/analytics/benchmarks.service.ts`

```typescript
import { prisma } from '../../lib/prisma'

export async function getPortfolioBenchmarks(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } })

  // Org's own metrics
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [orgMetrics, crossOrgBenchmarks] = await Promise.all([
    // This org's metrics
    prisma.workOrder.aggregate({
      where: { organizationId, createdAt: { gte: last30Days } },
      _avg: { actualCost: true },
      _count: { id: true },
    }),
    
    // Cross-org benchmarks (anonymized — NEVER expose org names)
    // Group by similar unit count ranges
    prisma.$queryRaw`
      SELECT 
        w.category,
        AVG(w.actual_cost) as avg_cost,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY w.actual_cost) as median_cost,
        COUNT(*) as sample_count
      FROM work_orders w
      JOIN organizations o ON w.organization_id = o.id
      WHERE 
        w.status = 'COMPLETED'
        AND w.actual_cost > 0
        AND w.created_at >= NOW() - INTERVAL '6 months'
        AND o.unit_count BETWEEN ${org!.unitCount * 0.5} AND ${org!.unitCount * 2}
        AND w.organization_id != ${organizationId}
      GROUP BY w.category
      HAVING COUNT(*) >= 5
    `
  ])

  return {
    orgAvgCostPerTicket: orgMetrics._avg.actualCost,
    orgTicketCount: orgMetrics._count.id,
    crossOrgBenchmarks,
    period: '30_days',
    benchmarkPeerGroup: `Organizations with ${Math.round(org!.unitCount * 0.5)}–${Math.round(org!.unitCount * 2)} units`,
  }
}
```
