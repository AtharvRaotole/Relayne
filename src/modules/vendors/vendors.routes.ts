import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { VendorsService } from './vendors.service'

const service = new VendorsService()

const VendorTierEnum = Type.Union([
  Type.Literal('PREFERRED'),
  Type.Literal('STANDARD'),
  Type.Literal('BACKUP'),
  Type.Literal('SUSPENDED'),
])
const CommChannelEnum = Type.Union([
  Type.Literal('EMAIL'),
  Type.Literal('SMS'),
  Type.Literal('PORTAL'),
  Type.Literal('PHONE'),
])

export const vendorRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /vendors/recommend — must be before /:id
  server.get(
    '/recommend',
    {
      schema: {
        querystring: Type.Object({
          trade: Type.String(),
          zip: Type.String(),
          priority: Type.Optional(Type.String()),
          budget: Type.Optional(Type.Number()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as { trade: string; zip: string; priority?: string; budget?: number }
      const recommendations = await service.recommend(
        orgId,
        qs.trade,
        qs.zip,
        qs.priority,
        qs.budget
      )
      return reply.send({
        success: true as const,
        data: { recommendations },
      })
    }
  )

  // GET /vendors
  server.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          page: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          search: Type.Optional(Type.String()),
          trade: Type.Optional(Type.String()),
          zip: Type.Optional(Type.String()),
          tier: Type.Optional(VendorTierEnum),
          isActive: Type.Optional(Type.Boolean()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as Record<string, unknown>
      const result = await service.list({
        organizationId: orgId,
        page: qs.page as number | undefined,
        limit: qs.limit as number | undefined,
        search: qs.search as string | undefined,
        trade: qs.trade as string | undefined,
        zip: qs.zip as string | undefined,
        tier: qs.tier as never,
        isActive: qs.isActive as boolean | undefined,
      })
      return reply.send({ success: true as const, data: result })
    }
  )

  // POST /vendors
  server.post(
    '/',
    {
      schema: {
        body: Type.Object({
          companyName: Type.String(),
          contactName: Type.Optional(Type.String()),
          email: Type.Optional(Type.String()),
          phone: Type.Optional(Type.String()),
          preferredChannel: Type.Optional(CommChannelEnum),
          trades: Type.Array(Type.String()),
          serviceZips: Type.Array(Type.String()),
          preferredTier: Type.Optional(VendorTierEnum),
          laborRates: Type.Optional(Type.Record(Type.String(), Type.Number())),
          notes: Type.Optional(Type.String()),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as Record<string, unknown>
      const vendor = await service.create({
        organizationId: orgId,
        companyName: body.companyName as string,
        contactName: body.contactName as string | undefined,
        email: body.email as string | undefined,
        phone: body.phone as string | undefined,
        preferredChannel: body.preferredChannel as never,
        trades: body.trades as string[],
        serviceZips: body.serviceZips as string[],
        preferredTier: body.preferredTier as never,
        laborRates: body.laborRates as Record<string, number> | undefined,
        notes: body.notes as string | undefined,
      })
      return reply.status(201).send({ success: true as const, data: vendor })
    }
  )

  // GET /vendors/:id
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
      const vendor = await service.getById(orgId, id)
      if (!vendor) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vendor not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: vendor })
    }
  )

  // PATCH /vendors/:id
  server.patch(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          companyName: Type.Optional(Type.String()),
          contactName: Type.Optional(Type.String()),
          email: Type.Optional(Type.String()),
          phone: Type.Optional(Type.String()),
          preferredChannel: Type.Optional(CommChannelEnum),
          trades: Type.Optional(Type.Array(Type.String())),
          serviceZips: Type.Optional(Type.Array(Type.String())),
          preferredTier: Type.Optional(VendorTierEnum),
          laborRates: Type.Optional(Type.Union([Type.Record(Type.String(), Type.Number()), Type.Null()])),
          insuranceExpiry: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          licenseExpiry: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          w9OnFile: Type.Optional(Type.Boolean()),
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
      const input = { ...body } as Record<string, unknown>
      if (body.insuranceExpiry) input.insuranceExpiry = new Date(body.insuranceExpiry as string)
      if (body.licenseExpiry) input.licenseExpiry = new Date(body.licenseExpiry as string)
      const ok = await service.update(orgId, id, input as never)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vendor not found' },
        } as never)
      }
      const vendor = await service.getById(orgId, id)
      return reply.send({ success: true as const, data: vendor })
    }
  )

  // GET /vendors/:id/work-orders
  server.get(
    '/:id/work-orders',
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
      const items = await service.getWorkOrders(orgId, id, qs.limit)
      if (items === null) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vendor not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: items })
    }
  )

  // GET /vendors/:id/ratings
  server.get(
    '/:id/ratings',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const items = await service.getRatings(orgId, id)
      if (items === null) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vendor not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: items })
    }
  )

  // POST /vendors/:id/rate
  server.post(
    '/:id/rate',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          workOrderId: Type.String(),
          score: Type.Number({ minimum: 1, maximum: 5 }),
          notes: Type.Optional(Type.String()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as { workOrderId: string; score: number; notes?: string }
      const rating = await service.rate(orgId, id, body.workOrderId, body.score, body.notes)
      if (!rating) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vendor or work order not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: rating })
    }
  )
}
