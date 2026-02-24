import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { getPortfolioBenchmarks } from './benchmarks.service'

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

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
