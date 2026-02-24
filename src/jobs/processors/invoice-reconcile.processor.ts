import { Job } from 'bullmq'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'
import { env } from '../../config/env'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

export async function processInvoiceReconciliation(job: Job) {
  const { invoiceId, organizationId } = job.data as {
    invoiceId: string
    organizationId: string
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      workOrder: {
        include: {
          property: true,
          vendor: true,
        },
      },
    },
  })

  if (!invoice || !invoice.workOrder) {
    logger.warn({ invoiceId }, 'Invoice or work order not found for reconciliation')
    return null
  }

  const workOrder = invoice.workOrder
  const vendor = workOrder.vendor

  const benchmarks = await getPricingBenchmarks(
    organizationId,
    workOrder.category,
    workOrder.property?.address as Record<string, unknown> | null
  )

  const laborRates = vendor?.laborRates as { hourly?: number } | null
  const laborRateStr = laborRates?.hourly != null ? `${laborRates.hourly}` : 'Unknown'

  const analysisPrompt = `You are a property management invoice auditor. Analyze this invoice for anomalies.

Work Order: ${workOrder.title}
Category: ${workOrder.category}
Property: ${workOrder.property?.name ?? 'N/A'}
Vendor: ${vendor?.companyName ?? 'N/A'}

Invoice Details:
- Total Amount: $${invoice.totalAmount}
- Line Items: ${JSON.stringify(invoice.lineItems, null, 2)}
- Vendor's typical labor rate: $${laborRateStr}/hr

Market Benchmarks for this trade/area:
${JSON.stringify(benchmarks, null, 2)}

Historical data for this vendor:
- Total jobs completed: ${vendor?.totalJobsCompleted ?? 0}

Flag anomalies if:
1. Total exceeds benchmark by more than 50%
2. Labor hours seem unreasonable for the scope
3. Parts/materials are marked up more than 30% above typical
4. Line items don't match the scope of work
5. Duplicate charges detected

Respond as JSON only, no markdown:
{
  "hasAnomaly": boolean,
  "anomalyReason": string | null,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "recommendedAction": "APPROVE" | "REVIEW" | "DISPUTE",
  "notes": string,
  "lineItemAnalysis": [{ "item": string, "verdict": "ok"|"high"|"suspicious", "note": string }]
}`

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: analysisPrompt }],
  })

  const analysisText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  let analysis: {
    hasAnomaly?: boolean
    anomalyReason?: string | null
    riskLevel?: string
    recommendedAction?: string
    notes?: string
    lineItemAnalysis?: Array<{ item: string; verdict: string; note: string }>
  } = {}

  try {
    const cleaned = analysisText.replace(/```json|```/g, '').trim()
    analysis = JSON.parse(cleaned) as typeof analysis
  } catch {
    analysis = {
      hasAnomaly: false,
      recommendedAction: 'REVIEW',
      notes: 'Analysis parsing failed',
    }
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      aiReviewed: true,
      aiAnomalyFlag: analysis.hasAnomaly ?? false,
      aiAnomalyReason: analysis.anomalyReason ?? null,
      status: analysis.hasAnomaly ? 'UNDER_REVIEW' : 'PENDING',
    },
  })

  const autoApproveThreshold = 300
  if (!analysis.hasAnomaly && invoice.totalAmount <= autoApproveThreshold) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'APPROVED' },
    })
  }

  logger.info({ invoiceId, hasAnomaly: analysis.hasAnomaly }, 'Invoice reconciliation complete')
  return analysis
}

async function getPricingBenchmarks(
  organizationId: string,
  category: string,
  _address: Record<string, unknown> | null
) {
  const completedOrders = await prisma.workOrder.findMany({
    where: {
      organizationId,
      category: category as import('@prisma/client').WorkOrderCategory,
      status: 'COMPLETED',
      actualCost: { not: null, gt: 0 },
      completedAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
    },
    select: { actualCost: true },
  })

  if (completedOrders.length === 0) return { message: 'No historical data available' }

  const costs = completedOrders
    .map((o) => o.actualCost!)
    .filter((c) => c > 0)
    .sort((a, b) => a - b)
  const avg = costs.reduce((s, c) => s + c, 0) / costs.length
  const median = costs[Math.floor(costs.length / 2)] ?? 0
  const p75 = costs[Math.floor(costs.length * 0.75)] ?? median
  const p90 = costs[Math.floor(costs.length * 0.9)] ?? median

  return {
    category,
    sampleSize: costs.length,
    avg: Math.round(avg),
    median: Math.round(median),
    p75: Math.round(p75),
    p90: Math.round(p90),
    highFlag: Math.round((p90 || median) * 1.5),
  }
}
