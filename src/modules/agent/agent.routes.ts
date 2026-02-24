import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { prisma } from '../../lib/prisma'
import { AgentRunner } from '../../agent/core/AgentRunner'

export const agentRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /agent/logs
  server.get(
    '/logs',
    {
      schema: {
        querystring: Type.Object({
          workflowType: Type.Optional(Type.String()),
          status: Type.Optional(Type.String()),
          limit: Type.Optional(Type.Number()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as { workflowType?: string; status?: string; limit?: number }
      const where: Record<string, unknown> = { organizationId: orgId }
      if (qs.workflowType) where.workflowType = qs.workflowType
      if (qs.status) where.status = qs.status

      const items = await prisma.agentLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(50, qs.limit ?? 20),
        select: {
          id: true,
          workflowType: true,
          triggerType: true,
          status: true,
          workOrderId: true,
          escalationId: true,
          tokensUsed: true,
          durationMs: true,
          createdAt: true,
          completedAt: true,
          finalAction: true,
        },
      })
      return reply.send({ success: true as const, data: items })
    }
  )

  // GET /agent/logs/:id
  server.get(
    '/logs/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const item = await prisma.agentLog.findFirst({
        where: { id, organizationId: orgId },
      })
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Agent log not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: item })
    }
  )

  // GET /agent/stats
  server.get(
    '/stats',
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              automationRate: Type.Number(),
              avgConfidence: Type.Union([Type.Number(), Type.Null()]),
              tokensUsed: Type.Number(),
              totalRuns: Type.Number(),
              completedCount: Type.Number(),
              escalatedCount: Type.Number(),
              failedCount: Type.Number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const [logs, workOrders] = await Promise.all([
        prisma.agentLog.findMany({
          where: { organizationId: orgId, createdAt: { gte: last30Days } },
          select: {
            status: true,
            tokensUsed: true,
            workOrderId: true,
          },
        }),
        prisma.workOrder.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: last30Days },
            aiHandled: true,
          },
        }),
      ])

      const totalRuns = logs.length
      const completedCount = logs.filter((l) => l.status === 'COMPLETED').length
      const escalatedCount = logs.filter((l) => l.status === 'ESCALATED').length
      const failedCount = logs.filter((l) => l.status === 'FAILED').length
      const totalWo = await prisma.workOrder.count({
        where: { organizationId: orgId, createdAt: { gte: last30Days } },
      })
      const automationRate = totalWo > 0 ? (workOrders / totalWo) * 100 : 0
      const avgConfidence = null
      const tokensUsed = logs.reduce((s, l) => s + (l.tokensUsed ?? 0), 0)

      return reply.send({
        success: true as const,
        data: {
          automationRate,
          avgConfidence,
          tokensUsed,
          totalRuns,
          completedCount,
          escalatedCount,
          failedCount,
        },
      })
    }
  )

  // POST /agent/test-run — manually trigger agent (DEV)
  server.post(
    '/test-run',
    {
      schema: {
        body: Type.Object({
          triggerType: Type.Optional(Type.String()),
          workflowHint: Type.Optional(Type.String()),
          context: Type.Optional(Type.Record(Type.String(), Type.Any())),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as { triggerType?: string; workflowHint?: string; context?: Record<string, unknown> }
      const runner = new AgentRunner(orgId)
      const result = await runner.run({
        organizationId: orgId,
        triggerType: (body.triggerType as 'manual') ?? 'manual',
        workflowHint: body.workflowHint ?? 'test',
        context: body.context,
      })
      return reply.send({ success: true as const, data: result })
    }
  )

  // POST /agent/feedback
  server.post(
    '/feedback',
    {
      schema: {
        body: Type.Object({
          agentLogId: Type.String(),
          rating: Type.Union([Type.Literal('good'), Type.Literal('bad')]),
          notes: Type.Optional(Type.String()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { agentLogId, rating, notes } = request.body as {
        agentLogId: string
        rating: 'good' | 'bad'
        notes?: string
      }
      const log = await prisma.agentLog.findFirst({
        where: { id: agentLogId, organizationId: orgId },
      })
      if (!log) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Agent log not found' },
        } as never)
      }
      // Store feedback in steps JSON for now (no dedicated table)
      const steps = (log.steps as object[]) ?? []
      steps.push({
        type: 'feedback',
        rating,
        notes: notes ?? null,
        submittedAt: new Date().toISOString(),
      })
      await prisma.agentLog.update({
        where: { id: agentLogId },
        data: { steps: steps as object },
      })
      return reply.send({ success: true as const })
    }
  )
}
