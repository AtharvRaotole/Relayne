import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'

export const escalationRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /escalations/stats — must be before /:id
  server.get(
    '/stats',
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              openCount: Type.Number(),
              avgResolutionHours: Type.Union([Type.Number(), Type.Null()]),
              byReason: Type.Array(
                Type.Object({
                  reason: Type.String(),
                  count: Type.Number(),
                })
              ),
              byPriority: Type.Array(
                Type.Object({
                  priority: Type.String(),
                  count: Type.Number(),
                })
              ),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const [openCount, resolved, byReason, byPriority] = await Promise.all([
        prisma.escalation.count({
          where: {
            organizationId: orgId,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
        }),
        prisma.escalation.findMany({
          where: {
            organizationId: orgId,
            status: 'RESOLVED',
            resolvedAt: { not: null },
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          select: { createdAt: true, resolvedAt: true },
        }),
        prisma.escalation.groupBy({
          by: ['reason'],
          where: { organizationId: orgId },
          _count: { id: true },
        }),
        prisma.escalation.groupBy({
          by: ['priority'],
          where: { organizationId: orgId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          _count: { id: true },
        }),
      ])

      const resolutions = resolved.filter((r) => r.resolvedAt != null)
      const avgResolutionHours =
        resolutions.length > 0
          ? resolutions.reduce((sum, r) => {
              const hours =
                (r.resolvedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60)
              return sum + hours
            }, 0) / resolutions.length
          : null

      return reply.send({
        success: true as const,
        data: {
          openCount,
          avgResolutionHours,
          byReason: byReason.map((r) => ({ reason: r.reason, count: r._count.id })),
          byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
        },
      })
    }
  )

  // GET /escalations
  server.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          priority: Type.Optional(Type.String()),
          reason: Type.Optional(Type.String()),
          assigneeId: Type.Optional(Type.String()),
          status: Type.Optional(Type.String()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as { priority?: string; reason?: string; assigneeId?: string; status?: string }
      const where: Prisma.EscalationWhereInput = { organizationId: orgId }
      if (qs.priority) where.priority = qs.priority as never
      if (qs.reason) where.reason = qs.reason as never
      if (qs.assigneeId) where.assigneeId = qs.assigneeId
      if (qs.status) where.status = qs.status as never

      const items = await prisma.escalation.findMany({
        where,
        include: { assignee: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return reply.send({ success: true as const, data: items })
    }
  )

  // GET /escalations/:id
  server.get(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const item = await prisma.escalation.findFirst({
        where: { id, organizationId: orgId },
        include: { assignee: true },
      })
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Escalation not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: item })
    }
  )

  // PATCH /escalations/:id/assign
  server.patch(
    '/:id/assign',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({ assigneeId: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const { assigneeId } = request.body as { assigneeId: string }
      const item = await prisma.escalation.findFirst({
        where: { id, organizationId: orgId },
      })
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Escalation not found' },
        } as never)
      }
      const updated = await prisma.escalation.update({
        where: { id },
        data: { assigneeId, status: 'IN_PROGRESS' },
        include: { assignee: true },
      })
      return reply.send({ success: true as const, data: updated })
    }
  )

  // POST /escalations/:id/resolve
  server.post(
    '/:id/resolve',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({ resolution: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const { resolution } = request.body as { resolution: string }
      const item = await prisma.escalation.findFirst({
        where: { id, organizationId: orgId },
      })
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Escalation not found' },
        } as never)
      }
      const updated = await prisma.escalation.update({
        where: { id },
        data: { status: 'RESOLVED', resolvedAt: new Date(), resolution },
        include: { assignee: true },
      })
      return reply.send({ success: true as const, data: updated })
    }
  )

  // POST /escalations/:id/dismiss
  server.post(
    '/:id/dismiss',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Optional(Type.Object({ notes: Type.Optional(Type.String()) })),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as { notes?: string } | undefined
      const item = await prisma.escalation.findFirst({
        where: { id, organizationId: orgId },
      })
      if (!item) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Escalation not found' },
        } as never)
      }
      const updated = await prisma.escalation.update({
        where: { id },
        data: { status: 'DISMISSED', resolvedAt: new Date(), resolution: body?.notes ?? 'Dismissed' },
        include: { assignee: true },
      })
      return reply.send({ success: true as const, data: updated })
    }
  )
}
