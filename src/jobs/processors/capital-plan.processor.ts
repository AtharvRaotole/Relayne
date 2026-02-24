import { Job } from 'bullmq'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'
import { env } from '../../config/env'
import type { WorkOrderCategory, Priority } from '@prisma/client'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const COMPONENT_LIFESPANS: Partial<
  Record<
    WorkOrderCategory,
    { avgLife: number; earlyFailureSignals: number }
  >
> = {
  HVAC: { avgLife: 15, earlyFailureSignals: 2 },
  ROOFING: { avgLife: 20, earlyFailureSignals: 3 },
  PLUMBING: { avgLife: 40, earlyFailureSignals: 4 },
  ELECTRICAL: { avgLife: 25, earlyFailureSignals: 2 },
  APPLIANCE: { avgLife: 12, earlyFailureSignals: 2 },
  ELEVATOR: { avgLife: 25, earlyFailureSignals: 3 },
  FLOORING: { avgLife: 15, earlyFailureSignals: 2 },
}

export async function processCapitalPlan(job: Job) {
  logger.info({ jobId: job.id }, 'Capital plan refresh started')

  const orgs = await prisma.organization.findMany({
    where: { plan: { in: ['GROWTH', 'ENTERPRISE'] } },
    include: { properties: true },
  })

  for (const org of orgs) {
    for (const property of org.properties) {
      await refreshCapitalPlanForProperty(property.id, org.id)
    }
  }

  logger.info({ orgCount: orgs.length }, 'Capital plan refresh completed')
}

async function refreshCapitalPlanForProperty(
  propertyId: string,
  organizationId: string
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      workOrders: {
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          category: true,
          title: true,
          actualCost: true,
          completedAt: true,
          resolutionNotes: true,
        },
      },
    },
  })

  if (!property) return

  const categoryAnalysis: Record<
    string,
    { repairCount: number; totalCost: number; recentCount: number; titles: string[] }
  > = {}
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)

  for (const wo of property.workOrders) {
    if (!categoryAnalysis[wo.category]) {
      categoryAnalysis[wo.category] = {
        repairCount: 0,
        totalCost: 0,
        recentCount: 0,
        titles: [],
      }
    }
    categoryAnalysis[wo.category].repairCount++
    categoryAnalysis[wo.category].totalCost += wo.actualCost ?? 0
    categoryAnalysis[wo.category].titles.push(wo.title)
    if (wo.completedAt && wo.completedAt > twoYearsAgo) {
      categoryAnalysis[wo.category].recentCount++
    }
  }

  const prompt = `You are a property capital planning expert. Analyze this maintenance history and generate a 5-year capital expenditure forecast.

Property: ${property.name}
Year Built: ${property.yearBuilt ?? 'Unknown'}
Unit Count: ${property.unitCount ?? 0}

Repair History by Category (last 5 years):
${JSON.stringify(categoryAnalysis, null, 2)}

Component Lifespan Reference:
${JSON.stringify(COMPONENT_LIFESPANS, null, 2)}

For each category with 2+ repairs or high repair frequency, predict:
1. Is this component showing early failure signals?
2. What is the projected replacement year?
3. What is the estimated replacement cost?

Respond as JSON array only, no markdown:
[{
  "category": string,
  "component": string,
  "failureSignals": number,
  "projectedReplacementYear": number,
  "estimatedCost": number,
  "priority": "LOW"|"NORMAL"|"HIGH"|"EMERGENCY",
  "notes": string
}]

Only include items with genuine capital planning concern. Skip minor/routine items.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '[]'
  let items: Array<{
    category: string
    component: string
    failureSignals: number
    projectedReplacementYear: number
    estimatedCost: number
    priority: string
    notes: string
  }> = []

  try {
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    items = JSON.parse(cleaned) as typeof items
  } catch {
    return
  }

  for (const item of items) {
    const validCategory = Object.keys(COMPONENT_LIFESPANS).includes(item.category)
      ? (item.category as WorkOrderCategory)
      : 'GENERAL_MAINTENANCE'
    const validPriority = ['LOW', 'NORMAL', 'HIGH', 'EMERGENCY'].includes(item.priority)
      ? (item.priority as Priority)
      : 'NORMAL'

    const existing = await prisma.capitalPlanItem.findFirst({
      where: {
        propertyId,
        category: validCategory,
        component: item.component,
      },
    })

    if (existing) {
      await prisma.capitalPlanItem.update({
        where: { id: existing.id },
        data: {
          failureSignals: item.failureSignals ?? 0,
          projectedReplacementYear: item.projectedReplacementYear ?? null,
          estimatedCost: item.estimatedCost ?? null,
          priority: validPriority,
          notes: item.notes ?? null,
        },
      })
    } else {
      await prisma.capitalPlanItem.create({
        data: {
          propertyId,
          category: validCategory,
          component: item.component,
          failureSignals: item.failureSignals ?? 0,
          projectedReplacementYear: item.projectedReplacementYear ?? null,
          estimatedCost: item.estimatedCost ?? null,
          priority: validPriority,
          notes: item.notes ?? null,
        },
      })
    }
  }
}
