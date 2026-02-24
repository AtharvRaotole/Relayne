import { prisma } from '../../lib/prisma'
import { addDays } from 'date-fns'

/**
 * Compute tenant churn risk score (0-1) based on:
 * - Lease expiry proximity
 * - Open maintenance issues
 * - Message sentiment
 * - Engagement drop
 * - No renewal inquiry (when lease < 90 days)
 */
export async function computeChurnRisk(tenantId: string): Promise<number> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      leases: { orderBy: { createdAt: 'desc' }, take: 1 },
      messages: { orderBy: { createdAt: 'desc' }, take: 30 },
      workOrders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          status: true,
          priority: true,
          createdAt: true,
          category: true,
        },
      },
    },
  })

  if (!tenant) throw new Error('Tenant not found')

  const activeLease = tenant.leases[0]
  const daysUntilExpiry = activeLease
    ? Math.ceil(
        (activeLease.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null

  let riskScore = 0
  let maxScore = 0

  // Factor 1: Lease expiry proximity (0-25 points)
  maxScore += 25
  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry < 0) riskScore += 25
    else if (daysUntilExpiry < 30) riskScore += 20
    else if (daysUntilExpiry < 60) riskScore += 15
    else if (daysUntilExpiry < 90) riskScore += 10
    else riskScore += 2
  }

  // Factor 2: Open maintenance issues (0-20 points)
  maxScore += 20
  const openIssues = tenant.workOrders.filter(
    (wo) => !['COMPLETED', 'CANCELLED'].includes(wo.status)
  ).length
  riskScore += Math.min(20, openIssues * 7)

  // Factor 3: Negative sentiment in recent messages (0-20 points)
  maxScore += 20
  const recentMessages = await prisma.message.findMany({
    where: {
      tenantId,
      direction: 'INBOUND',
      createdAt: { gte: addDays(new Date(), -60) },
      aiSentiment: { not: null },
    },
    select: { aiSentiment: true },
  })
  if (recentMessages.length > 0) {
    const avgSentiment =
      recentMessages.reduce((s, m) => s + (m.aiSentiment ?? 0), 0) /
      recentMessages.length
    riskScore += Math.round((1 - avgSentiment) * 20)
  }

  // Factor 4: Communication frequency drop (0-15 points)
  maxScore += 15
  const recentCount = tenant.messages.filter(
    (m) => m.createdAt > addDays(new Date(), -30)
  ).length
  const olderCount = tenant.messages.filter(
    (m) =>
      m.createdAt > addDays(new Date(), -90) &&
      m.createdAt <= addDays(new Date(), -30)
  ).length
  if (olderCount > 0 && recentCount < olderCount * 0.3) {
    riskScore += 15
  } else if (olderCount > 0 && recentCount < olderCount * 0.6) {
    riskScore += 8
  }

  // Factor 5: No renewal inquiry (0-20 points)
  maxScore += 20
  if (
    daysUntilExpiry !== null &&
    daysUntilExpiry < 90 &&
    daysUntilExpiry >= 0 &&
    activeLease &&
    !activeLease.renewalSentAt
  ) {
    riskScore += 20
  }

  const normalizedScore = maxScore > 0 ? riskScore / maxScore : 0

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { churnRiskScore: Math.min(1, normalizedScore) },
  })

  return Math.min(1, normalizedScore)
}
