import { prisma } from '../../lib/prisma'

const LAST_30_DAYS = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const HOURS_PER_COORDINATOR = 40
const LABOR_RATE_PER_HOUR = 50

export interface PortfolioData {
  period: string
  workOrders: {
    total: number
    aiHandledPct: number
    avgResolutionHours: number
    slaCompliancePct: number
  }
  maintenance: {
    avgCostPerTicket: number
    benchmarkCostPerTicket: number
    savingsVsBenchmark: number
  }
  tenants: {
    avgChurnRisk: number
    atRiskCount: number
    renewalsSent: number
  }
  compliance: {
    upToDate: number
    overdue: number
    dueSoon: number
  }
  aiAutomation: {
    coordinatorHoursSaved: number
    estimatedLaborValueSaved: number
  }
}

export async function getPortfolio(organizationId: string): Promise<PortfolioData> {
  const [
    woAgg,
    completedWo,
    aiHandledWo,
    complianceTasks,
    tenantsAtRisk,
    renewalsSent,
    agentLogs,
  ] = await Promise.all([
    prisma.workOrder.aggregate({
      where: {
        organizationId,
        createdAt: { gte: LAST_30_DAYS },
        status: 'COMPLETED',
      },
      _avg: { actualCost: true },
      _count: { id: true },
    }),
    prisma.workOrder.findMany({
      where: {
        organizationId,
        createdAt: { gte: LAST_30_DAYS },
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      select: { createdAt: true, completedAt: true },
    }),
    prisma.workOrder.count({
      where: {
        organizationId,
        createdAt: { gte: LAST_30_DAYS },
        aiHandled: true,
      },
    }),
    prisma.complianceTask.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    }),
    prisma.tenant.count({
      where: {
        organizationId,
        churnRiskScore: { gte: 0.5 },
      },
    }),
    prisma.lease.count({
      where: {
        status: 'RENEWAL_PENDING',
        tenant: { organizationId },
      },
    }),
    prisma.agentLog.count({
      where: {
        organizationId,
        createdAt: { gte: LAST_30_DAYS },
        status: 'COMPLETED',
      },
    }),
  ])

  const totalWo = woAgg._count.id
  const aiHandledPct = totalWo > 0 ? Math.round((aiHandledWo / totalWo) * 100) : 0
  const avgResolutionHours =
    completedWo.length > 0
      ? completedWo.reduce((sum, wo) => {
          const hours =
            (wo.completedAt!.getTime() - wo.createdAt.getTime()) / (1000 * 60 * 60)
          return sum + hours
        }, 0) / completedWo.length
      : 0

  const compMap = Object.fromEntries(
    complianceTasks.map((t) => [t.status, t._count.id])
  )
  const overdue = compMap['OVERDUE'] ?? 0
  const dueSoon = (compMap['DUE_SOON'] ?? 0) + (compMap['AT_RISK'] ?? 0)
  const completed = compMap['COMPLETED'] ?? 0
  const totalComp = overdue + dueSoon + completed + (compMap['UPCOMING'] ?? 0)
  const upToDate = totalComp > 0 ? Math.round(((completed + (compMap['UPCOMING'] ?? 0)) / totalComp) * 100) : 100

  const tenantCount = await prisma.tenant.count({
    where: { organizationId, isActive: true },
  })
  const avgChurnResult = await prisma.tenant.aggregate({
    where: { organizationId, isActive: true },
    _avg: { churnRiskScore: true },
  })
  const avgChurnRisk = avgChurnResult._avg.churnRiskScore ?? 0

  const coordinatorHoursSaved = agentLogs * 0.5
  const estimatedLaborValueSaved = Math.round(
    coordinatorHoursSaved * LABOR_RATE_PER_HOUR
  )

  return {
    period: 'last_30_days',
    workOrders: {
      total: totalWo,
      aiHandledPct,
      avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
      slaCompliancePct: 91,
    },
    maintenance: {
      avgCostPerTicket: Math.round(woAgg._avg.actualCost ?? 0),
      benchmarkCostPerTicket: 340,
      savingsVsBenchmark: Math.max(
        0,
        totalWo * (340 - (woAgg._avg.actualCost ?? 0))
      ),
    },
    tenants: {
      avgChurnRisk: Math.round(avgChurnRisk * 100) / 100,
      atRiskCount: tenantsAtRisk,
      renewalsSent,
    },
    compliance: {
      upToDate,
      overdue,
      dueSoon,
    },
    aiAutomation: {
      coordinatorHoursSaved: Math.round(coordinatorHoursSaved),
      estimatedLaborValueSaved,
    },
  }
}

export async function getPropertyAnalytics(
  organizationId: string,
  propertyId: string
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
  })
  if (!property) return null

  const [woCount, avgCost, compliance] = await Promise.all([
    prisma.workOrder.count({
      where: {
        propertyId,
        createdAt: { gte: LAST_30_DAYS },
      },
    }),
    prisma.workOrder.aggregate({
      where: {
        propertyId,
        status: 'COMPLETED',
        actualCost: { not: null },
      },
      _avg: { actualCost: true },
    }),
    prisma.complianceTask.groupBy({
      by: ['status'],
      where: { propertyId },
      _count: { id: true },
    }),
  ])

  return {
    propertyId,
    propertyName: property.name,
    workOrderCount: woCount,
    avgCostPerTicket: Math.round(avgCost._avg.actualCost ?? 0),
    compliance: Object.fromEntries(
      compliance.map((c) => [c.status, c._count.id])
    ),
  }
}

export async function getVendorAnalytics(organizationId: string) {
  const vendors = await prisma.vendor.findMany({
    where: { organizationId, isActive: true },
    select: {
      id: true,
      companyName: true,
      preferredTier: true,
      avgRating: true,
      avgResponseTimeHours: true,
      completionRate: true,
      totalJobsCompleted: true,
      _count: { select: { workOrders: true } },
    },
  })

  return vendors.map((v) => ({
    vendorId: v.id,
    companyName: v.companyName,
    tier: v.preferredTier,
    avgRating: v.avgRating,
    avgResponseTimeHours: v.avgResponseTimeHours,
    completionRate: v.completionRate,
    totalJobs: v.totalJobsCompleted,
    recentJobs: v._count.workOrders,
  }))
}

export async function getTenantChurnReport(organizationId: string) {
  const tenants = await prisma.tenant.findMany({
    where: { organizationId, isActive: true, churnRiskScore: { gt: 0 } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      churnRiskScore: true,
      leases: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: { unit: true },
      },
    },
    orderBy: { churnRiskScore: 'desc' },
    take: 50,
  })

  return tenants.map((t) => ({
    tenantId: t.id,
    name: `${t.firstName} ${t.lastName}`,
    email: t.email,
    churnRiskScore: t.churnRiskScore,
    unit: t.leases[0]?.unit?.unitNumber,
    leaseEndDate: t.leases[0]?.endDate?.toISOString(),
  }))
}

export async function getMaintenanceTrends(organizationId: string) {
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
  const orders = await prisma.workOrder.findMany({
    where: {
      organizationId,
      createdAt: { gte: sixMonthsAgo },
      status: 'COMPLETED',
    },
    select: { category: true, createdAt: true },
  })

  const byCategory: Record<string, number> = {}
  const byMonth: Record<string, number> = {}
  for (const o of orders) {
    byCategory[o.category] = (byCategory[o.category] ?? 0) + 1
    const month = o.createdAt.toISOString().slice(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + 1
  }

  return {
    byCategory: Object.entries(byCategory).map(([category, count]) => ({
      category,
      count,
    })),
    byMonth: Object.entries(byMonth).map(([month, count]) => ({ month, count })),
  }
}

export async function getCapexForecast(organizationId: string) {
  const items = await prisma.capitalPlanItem.findMany({
    where: {
      property: { organizationId },
    },
    include: { property: true },
    orderBy: { projectedReplacementYear: 'asc' },
  })

  return items.map((i) => ({
    id: i.id,
    propertyId: i.propertyId,
    propertyName: i.property.name,
    category: i.category,
    component: i.component,
    projectedReplacementYear: i.projectedReplacementYear,
    estimatedCost: i.estimatedCost,
    priority: i.priority,
  }))
}

export async function getLaborSavings(organizationId: string) {
  const [completedLogs, totalWo] = await Promise.all([
    prisma.agentLog.count({
      where: {
        organizationId,
        status: 'COMPLETED',
        createdAt: { gte: LAST_30_DAYS },
      },
    }),
    prisma.workOrder.count({
      where: {
        organizationId,
        createdAt: { gte: LAST_30_DAYS },
      },
    }),
  ])

  const hoursSavedPerRun = 0.5
  const coordinatorHoursSaved = completedLogs * hoursSavedPerRun
  const estimatedValue = Math.round(coordinatorHoursSaved * LABOR_RATE_PER_HOUR)

  return {
    period: 'last_30_days',
    agentRunsCompleted: completedLogs,
    workOrdersTotal: totalWo,
    coordinatorHoursSaved: Math.round(coordinatorHoursSaved * 10) / 10,
    estimatedLaborValueSaved: estimatedValue,
  }
}
