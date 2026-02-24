import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { WorkOrdersService } from './work-orders.service'

const service = new WorkOrdersService()

const WorkOrderCategoryEnum = Type.Union([
  Type.Literal('PLUMBING'), Type.Literal('ELECTRICAL'), Type.Literal('HVAC'),
  Type.Literal('APPLIANCE'), Type.Literal('STRUCTURAL'), Type.Literal('PEST_CONTROL'),
  Type.Literal('LANDSCAPING'), Type.Literal('CLEANING'), Type.Literal('PAINTING'),
  Type.Literal('FLOORING'), Type.Literal('ROOFING'), Type.Literal('SECURITY'),
  Type.Literal('ELEVATOR'), Type.Literal('FIRE_SAFETY'), Type.Literal('GENERAL_MAINTENANCE'),
  Type.Literal('EMERGENCY'), Type.Literal('OTHER'),
])
const PriorityEnum = Type.Union([
  Type.Literal('EMERGENCY'), Type.Literal('HIGH'), Type.Literal('NORMAL'), Type.Literal('LOW'),
])
const CommChannelEnum = Type.Union([
  Type.Literal('EMAIL'), Type.Literal('SMS'), Type.Literal('PORTAL'), Type.Literal('PHONE'),
])

export const workOrderRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /work-orders
  server.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          page: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          status: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
          priority: Type.Optional(PriorityEnum),
          propertyId: Type.Optional(Type.String()),
          vendorId: Type.Optional(Type.String()),
          from: Type.Optional(Type.String()),
          to: Type.Optional(Type.String()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as Record<string, unknown>
      const status = qs.status
        ? (Array.isArray(qs.status) ? qs.status : [qs.status]) as string[]
        : undefined
      const result = await service.list({
        organizationId: orgId,
        page: qs.page as number | undefined,
        limit: qs.limit as number | undefined,
        status: status as never,
        priority: qs.priority as never,
        propertyId: qs.propertyId as string | undefined,
        vendorId: qs.vendorId as string | undefined,
        from: qs.from ? new Date(qs.from as string) : undefined,
        to: qs.to ? new Date(qs.to as string) : undefined,
      })
      return reply.send({ success: true as const, data: result })
    }
  )

  // POST /work-orders
  server.post(
    '/',
    {
      schema: {
        body: Type.Object({
          propertyId: Type.String(),
          unitId: Type.Optional(Type.String()),
          tenantId: Type.Optional(Type.String()),
          title: Type.String(),
          description: Type.String(),
          category: WorkOrderCategoryEnum,
          priority: Type.Optional(PriorityEnum),
          scheduledAt: Type.Optional(Type.String()),
          accessInstructions: Type.Optional(Type.String()),
          estimatedCost: Type.Optional(Type.Number()),
          sourceChannel: Type.Optional(CommChannelEnum),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as Record<string, unknown>
      const wo = await service.create({
        organizationId: orgId,
        propertyId: body.propertyId as string,
        unitId: body.unitId as string | undefined,
        tenantId: body.tenantId as string | undefined,
        title: body.title as string,
        description: body.description as string,
        category: body.category as never,
        priority: body.priority as never,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt as string) : undefined,
        accessInstructions: body.accessInstructions as string | undefined,
        estimatedCost: body.estimatedCost as number | undefined,
        sourceChannel: body.sourceChannel as never,
      })
      return reply.status(201).send({ success: true as const, data: wo })
    }
  )

  // GET /work-orders/:id
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
      const wo = await service.getById(orgId, id)
      if (!wo) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work order not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: wo })
    }
  )

  // PATCH /work-orders/:id
  server.patch(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          title: Type.Optional(Type.String()),
          description: Type.Optional(Type.String()),
          category: Type.Optional(WorkOrderCategoryEnum),
          priority: Type.Optional(PriorityEnum),
          scheduledAt: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          accessInstructions: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          estimatedHours: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
          estimatedCost: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
          status: Type.Optional(Type.String()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as Record<string, unknown>
      try {
        const wo = await service.update(orgId, id, {
          ...body,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt as string) : body.scheduledAt,
        } as never)
        if (!wo) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Work order not found' },
          } as never)
        }
        const full = await service.getById(orgId, id)
        return reply.send({ success: true as const, data: full })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'INVALID_STATUS_TRANSITION') {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid status transition' },
          } as never)
        }
        throw err
      }
    }
  )

  // DELETE /work-orders/:id (cancel)
  server.delete(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      try {
        const result = await service.cancel(orgId, id)
        if (!result) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Work order not found' },
          } as never)
        }
        return reply.send({ success: true as const })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'INVALID_STATUS_TRANSITION') {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Cannot cancel work order in current status' },
          } as never)
        }
        throw err
      }
    }
  )

  // POST /work-orders/:id/assign-vendor
  server.post(
    '/:id/assign-vendor',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({ vendorId: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const { vendorId } = request.body as { vendorId: string }
      const wo = await service.assignVendor(orgId, id, vendorId)
      if (!wo) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work order not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: wo })
    }
  )

  // POST /work-orders/:id/complete
  server.post(
    '/:id/complete',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          resolutionNotes: Type.Optional(Type.String()),
          photos: Type.Optional(Type.Array(Type.Any())),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as { resolutionNotes?: string; photos?: object[] }
      const wo = await service.complete(orgId, id, body.resolutionNotes, body.photos)
      if (!wo) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work order not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: wo })
    }
  )

  // POST /work-orders/:id/escalate
  server.post(
    '/:id/escalate',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({ reason: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const { reason } = request.body as { reason: string }
      const wo = await service.escalate(orgId, id, reason)
      if (!wo) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work order not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: wo })
    }
  )

  // GET /work-orders/:id/timeline
  server.get(
    '/:id/timeline',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const events = await service.getTimeline(orgId, id)
      if (!events) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work order not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: events })
    }
  )
}
