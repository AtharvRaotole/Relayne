import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { getPortfolioBenchmarks } from './benchmarks.service'
import {
  getPortfolio,
  getPropertyAnalytics,
  getVendorAnalytics,
  getTenantChurnReport,
  getMaintenanceTrends,
  getCapexForecast,
  getLaborSavings,
} from './analytics.service'

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  server.get(
    '/portfolio',
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              period: Type.String(),
              workOrders: Type.Object({
                total: Type.Number(),
                aiHandledPct: Type.Number(),
                avgResolutionHours: Type.Number(),
                slaCompliancePct: Type.Number(),
              }),
              maintenance: Type.Object({
                avgCostPerTicket: Type.Number(),
                benchmarkCostPerTicket: Type.Number(),
                savingsVsBenchmark: Type.Number(),
              }),
              tenants: Type.Object({
                avgChurnRisk: Type.Number(),
                atRiskCount: Type.Number(),
                renewalsSent: Type.Number(),
              }),
              compliance: Type.Object({
                upToDate: Type.Number(),
                overdue: Type.Number(),
                dueSoon: Type.Number(),
              }),
              aiAutomation: Type.Object({
                coordinatorHoursSaved: Type.Number(),
                estimatedLaborValueSaved: Type.Number(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const data = await getPortfolio(orgId)
      return reply.send({ success: true as const, data })
    }
  )

  server.get(
    '/properties/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const data = await getPropertyAnalytics(orgId, id)
      if (!data) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Property not found' },
        } as never)
      }
      return reply.send({ success: true as const, data })
    }
  )

  server.get(
    '/vendors',
    {
      schema: {
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const data = await getVendorAnalytics(orgId)
      return reply.send({ success: true as const, data })
    }
  )

  server.get(
    '/tenants/churn',
    {
      schema: {
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const data = await getTenantChurnReport(orgId)
      return reply.send({ success: true as const, data })
    }
  )

  server.get(
    '/maintenance-trends',
    {
      schema: {
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const data = await getMaintenanceTrends(orgId)
      return reply.send({ success: true as const, data })
    }
  )

  server.get(
    '/capex-forecast',
    {
      schema: {
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const data = await getCapexForecast(orgId)
      return reply.send({ success: true as const, data })
    }
  )

  server.get(
    '/labor-savings',
    {
      schema: {
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const data = await getLaborSavings(orgId)
      return reply.send({ success: true as const, data })
    }
  )

  server.get(
    '/benchmarks',
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              orgAvgCostPerTicket: Type.Union([Type.Number(), Type.Null()]),
              orgTicketCount: Type.Number(),
              crossOrgBenchmarks: Type.Array(
                Type.Object({
                  category: Type.String(),
                  avg_cost: Type.Number(),
                  median_cost: Type.Number(),
                  sample_count: Type.Number(),
                })
              ),
              period: Type.String(),
              benchmarkPeerGroup: Type.String(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const result = await getPortfolioBenchmarks(orgId)
      return reply.send({
        success: true as const,
        data: {
          ...result,
          crossOrgBenchmarks: result.crossOrgBenchmarks.map((r) => ({
            ...r,
            sample_count: Number(r.sample_count),
          })),
        },
      })
    }
  )
}
