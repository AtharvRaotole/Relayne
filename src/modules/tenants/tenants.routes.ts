import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { TenantsService } from './tenants.service'

const service = new TenantsService()

const CommChannelEnum = Type.Union([
  Type.Literal('EMAIL'),
  Type.Literal('SMS'),
  Type.Literal('PORTAL'),
  Type.Literal('PHONE'),
])

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /tenants
  server.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          page: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          search: Type.Optional(Type.String()),
          isActive: Type.Optional(Type.Boolean()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as { page?: number; limit?: number; search?: string; isActive?: boolean }
      const result = await service.list({
        organizationId: orgId,
        page: qs.page,
        limit: qs.limit,
        search: qs.search,
        isActive: qs.isActive,
      })
      return reply.send({ success: true as const, data: result })
    }
  )

  // POST /tenants
  server.post(
    '/',
    {
      schema: {
        body: Type.Object({
          firstName: Type.String(),
          lastName: Type.String(),
          email: Type.Optional(Type.String()),
          phone: Type.Optional(Type.String()),
          preferredChannel: Type.Optional(CommChannelEnum),
          language: Type.Optional(Type.String()),
          pmsTenantId: Type.Optional(Type.String()),
          notes: Type.Optional(Type.String()),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as Record<string, unknown>
      const tenant = await service.create({
        organizationId: orgId,
        firstName: body.firstName as string,
        lastName: body.lastName as string,
        email: body.email as string | undefined,
        phone: body.phone as string | undefined,
        preferredChannel: body.preferredChannel as never,
        language: body.language as string | undefined,
        pmsTenantId: body.pmsTenantId as string | undefined,
        notes: body.notes as string | undefined,
      })
      return reply.status(201).send({ success: true as const, data: tenant })
    }
  )

  // POST /tenants/bulk-import — must be before /:id
  server.post(
    '/bulk-import',
    {
      schema: {
        body: Type.Object({
          tenants: Type.Array(
            Type.Object({
              firstName: Type.String(),
              lastName: Type.String(),
              email: Type.Optional(Type.String()),
              phone: Type.Optional(Type.String()),
              preferredChannel: Type.Optional(CommChannelEnum),
              language: Type.Optional(Type.String()),
              pmsTenantId: Type.Optional(Type.String()),
              notes: Type.Optional(Type.String()),
            })
          ),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { tenants: tenantsInput } = request.body as {
        tenants: Array<{
          firstName: string
          lastName: string
          email?: string
          phone?: string
          preferredChannel?: 'EMAIL' | 'SMS' | 'PORTAL' | 'PHONE'
          language?: string
          pmsTenantId?: string
          notes?: string
        }>
      }
      const result = await service.bulkImport(orgId, tenantsInput)
      return reply.status(201).send({ success: true as const, data: result })
    }
  )

  // GET /tenants/:id
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
      const tenant = await service.getById(orgId, id)
      if (!tenant) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        } as never)
      }
      const churn = await service.computeChurnRisk(id)
      return reply.send({
        success: true as const,
        data: { ...tenant, churnRisk: churn },
      })
    }
  )

  // PATCH /tenants/:id
  server.patch(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          firstName: Type.Optional(Type.String()),
          lastName: Type.Optional(Type.String()),
          email: Type.Optional(Type.String()),
          phone: Type.Optional(Type.String()),
          preferredChannel: Type.Optional(CommChannelEnum),
          language: Type.Optional(Type.String()),
          notes: Type.Optional(Type.String()),
          isActive: Type.Optional(Type.Boolean()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as Record<string, unknown>
      const ok = await service.update(orgId, id, body as never)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        } as never)
      }
      const tenant = await service.getById(orgId, id)
      return reply.send({ success: true as const, data: tenant })
    }
  )

  // GET /tenants/:id/messages
  server.get(
    '/:id/messages',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        querystring: Type.Object({ limit: Type.Optional(Type.Number()) }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const qs = request.query as { limit?: number }
      const messages = await service.getMessages(orgId, id, qs.limit)
      if (messages === null) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: messages })
    }
  )

  // GET /tenants/:id/work-orders
  server.get(
    '/:id/work-orders',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const workOrders = await service.getWorkOrders(orgId, id)
      if (workOrders === null) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: workOrders })
    }
  )

  // POST /tenants/:id/send-message
  server.post(
    '/:id/send-message',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          subject: Type.Optional(Type.String()),
          body: Type.String({ minLength: 1 }),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as { subject?: string; body: string }
      const message = await service.sendMessage(orgId, id, body)
      if (message === null) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found or has no email/phone' },
        } as never)
      }
      return reply.status(201).send({ success: true as const, data: message })
    }
  )

  // GET /tenants/:id/ai-summary — churn risk + recommendation (simplified for Phase 3)
  server.get(
    '/:id/ai-summary',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const tenant = await service.getById(orgId, id)
      if (!tenant) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        } as never)
      }
      const churn = await service.computeChurnRisk(id)
      const recentInteractions = tenant._count?.messages ?? 0

      const recommendation =
        churn.score > 0.5
          ? 'Initiate renewal outreach. Address open maintenance issues before renewal conversation.'
          : churn.factors.length > 0
            ? 'Monitor lease end date and maintenance satisfaction.'
            : 'Tenant relationship appears stable.'

      return reply.send({
        success: true as const,
        data: {
          churnRiskScore: churn.score,
          churnRiskFactors: churn.factors,
          satisfactionScore: tenant.satisfactionScore,
          recentInteractions,
          openIssues: churn.openIssuesCount,
          recommendation,
          suggestedMessage: churn.score > 0.6
            ? `Hi ${tenant.firstName}, I wanted to personally reach out about your lease and any maintenance needs.`
            : undefined,
        },
      })
    }
  )
}
