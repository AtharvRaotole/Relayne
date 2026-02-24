import { prisma } from '../../lib/prisma'
export interface PortfolioBenchmarksResult {
  orgAvgCostPerTicket: number | null
  orgTicketCount: number
  crossOrgBenchmarks: Array<{
    category: string
    avg_cost: number
    median_cost: number
    sample_count: bigint
  }>
  period: string
  benchmarkPeerGroup: string
}

/**
 * Get portfolio-level benchmarks: org's own metrics + anonymized cross-org comparison.
 * Cross-org data is grouped by similar unit count — NEVER exposes org names.
 */
export async function getPortfolioBenchmarks(
  organizationId: string
): Promise<PortfolioBenchmarksResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const minUnits = Math.floor(org.unitCount * 0.5)
  const maxUnits = Math.ceil(org.unitCount * 2)

  const [orgMetrics, crossOrgBenchmarks] = await Promise.all([
    prisma.workOrder.aggregate({
      where: {
        organizationId,
        createdAt: { gte: last30Days },
        status: 'COMPLETED',
        actualCost: { not: null, gt: 0 },
      },
      _avg: { actualCost: true },
      _count: { id: true },
    }),
    prisma.$queryRaw<
      Array<{ category: string; avg_cost: number; median_cost: number; sample_count: bigint }>
    >`
      SELECT 
        w.category::text as category,
        AVG(w.actual_cost)::float as avg_cost,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY w.actual_cost)::float as median_cost,
        COUNT(*)::bigint as sample_count
      FROM work_orders w
      JOIN organizations o ON w.organization_id = o.id
      WHERE 
        w.status = 'COMPLETED'
        AND w.actual_cost > 0
        AND w.completed_at >= NOW() - INTERVAL '6 months'
        AND o.unit_count BETWEEN ${minUnits} AND ${maxUnits}
        AND w.organization_id != ${organizationId}
      GROUP BY w.category
      HAVING COUNT(*) >= 5
    `,
  ])

  return {
    orgAvgCostPerTicket: orgMetrics._avg.actualCost,
    orgTicketCount: orgMetrics._count.id,
    crossOrgBenchmarks: crossOrgBenchmarks.map((row) => ({
      category: row.category,
      avg_cost: Number(row.avg_cost),
      median_cost: Number(row.median_cost),
      sample_count: row.sample_count,
    })),
    period: '30_days',
    benchmarkPeerGroup: `Organizations with ${minUnits}–${maxUnits} units`,
  }
}
