import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { CommunicationsService } from './communications.service'

const service = new CommunicationsService()

const CommChannelEnum = Type.Union([
  Type.Literal('EMAIL'), Type.Literal('SMS'), Type.Literal('PORTAL'), Type.Literal('PHONE'),
])
const ThreadStatusEnum = Type.Union([
  Type.Literal('OPEN'), Type.Literal('WAITING_RESPONSE'), Type.Literal('RESOLVED'), Type.Literal('ESCALATED'),
])

export const communicationRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /communications/threads
  server.get(
    '/threads',
    {
      schema: {
        querystring: Type.Object({
          page: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          status: Type.Optional(ThreadStatusEnum),
          tenantId: Type.Optional(Type.String()),
          vendorId: Type.Optional(Type.String()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as Record<string, unknown>
      const result = await service.listThreads({
        organizationId: orgId,
        page: qs.page as number | undefined,
        limit: qs.limit as number | undefined,
        status: qs.status as never,
        tenantId: qs.tenantId as string | undefined,
        vendorId: qs.vendorId as string | undefined,
      })
      return reply.send({ success: true as const, data: result })
    }
  )

  // GET /communications/threads/:id
  server.get(
    '/threads/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const thread = await service.getThread(orgId, id)
      if (!thread) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Thread not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: thread })
    }
  )

  // POST /communications/threads
  server.post(
    '/threads',
    {
      schema: {
        body: Type.Object({
          tenantId: Type.Optional(Type.String()),
          vendorId: Type.Optional(Type.String()),
          workOrderId: Type.Optional(Type.String()),
          subject: Type.Optional(Type.String()),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as Record<string, unknown>
      const thread = await service.createThread({
        organizationId: orgId,
        tenantId: body.tenantId as string | undefined,
        vendorId: body.vendorId as string | undefined,
        workOrderId: body.workOrderId as string | undefined,
        subject: body.subject as string | undefined,
      })
      return reply.status(201).send({ success: true as const, data: thread })
    }
  )

  // PATCH /communications/threads/:id
  server.patch(
    '/threads/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({ status: ThreadStatusEnum }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const { status } = request.body as { status: string }
      const ok = await service.updateThreadStatus(orgId, id, status as never)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Thread not found' },
        } as never)
      }
      const thread = await service.getThread(orgId, id)
      return reply.send({ success: true as const, data: thread })
    }
  )

  // POST /communications/send
  server.post(
    '/send',
    {
      schema: {
        body: Type.Object({
          to: Type.String(),
          channel: CommChannelEnum,
          subject: Type.Optional(Type.String()),
          body: Type.String(),
          threadId: Type.Optional(Type.String()),
          workOrderId: Type.Optional(Type.String()),
          tenantId: Type.Optional(Type.String()),
          vendorId: Type.Optional(Type.String()),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as Record<string, unknown>
      const msg = await service.sendMessage({
        organizationId: orgId,
        to: body.to as string,
        channel: body.channel as never,
        subject: body.subject as string | undefined,
        body: body.body as string,
        threadId: body.threadId as string | undefined,
        workOrderId: body.workOrderId as string | undefined,
        tenantId: body.tenantId as string | undefined,
        vendorId: body.vendorId as string | undefined,
      })
      return reply.status(201).send({ success: true as const, data: msg })
    }
  )

  // GET /communications/inbox
  server.get(
    '/inbox',
    {
      schema: {
        querystring: Type.Object({ limit: Type.Optional(Type.Number()) }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as { limit?: number }
      const items = await service.getInbox(orgId, qs.limit)
      return reply.send({ success: true as const, data: items })
    }
  )

  // GET /communications/queue
  server.get(
    '/queue',
    {
      schema: {
        querystring: Type.Object({ limit: Type.Optional(Type.Number()) }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as { limit?: number }
      const items = await service.getQueue(orgId, qs.limit)
      return reply.send({ success: true as const, data: items })
    }
  )
}
