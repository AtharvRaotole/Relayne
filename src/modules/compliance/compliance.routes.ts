import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { ComplianceService } from './compliance.service'

const service = new ComplianceService()

const ComplianceTaskTypeEnum = Type.Union([
  Type.Literal('ELEVATOR_INSPECTION'), Type.Literal('FIRE_SPRINKLER_TEST'),
  Type.Literal('FIRE_ALARM_TEST'), Type.Literal('BOILER_INSPECTION'),
  Type.Literal('GAS_LINE_INSPECTION'), Type.Literal('LEAD_PAINT_INSPECTION'),
  Type.Literal('MOLD_INSPECTION'), Type.Literal('HABITABILITY_NOTICE'),
  Type.Literal('RENT_INCREASE_NOTICE'), Type.Literal('LEASE_RENEWAL_NOTICE'),
  Type.Literal('ENTRY_NOTICE'), Type.Literal('EVICTION_NOTICE'),
  Type.Literal('CERTIFICATE_OF_OCCUPANCY'), Type.Literal('ENERGY_AUDIT'),
  Type.Literal('BACKFLOW_PREVENTER_TEST'), Type.Literal('PEST_INSPECTION'),
  Type.Literal('ROOF_INSPECTION'), Type.Literal('CUSTOM'),
])

export const complianceRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /compliance
  server.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          page: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          status: Type.Optional(Type.String()),
          propertyId: Type.Optional(Type.String()),
          taskType: Type.Optional(ComplianceTaskTypeEnum),
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
        status: qs.status as never,
        propertyId: qs.propertyId as string | undefined,
        taskType: qs.taskType as never,
      })
      return reply.send({ success: true as const, data: result })
    }
  )

  // POST /compliance
  server.post(
    '/',
    {
      schema: {
        body: Type.Object({
          propertyId: Type.String(),
          jurisdictionId: Type.Optional(Type.String()),
          taskType: ComplianceTaskTypeEnum,
          title: Type.String(),
          description: Type.Optional(Type.String()),
          dueDate: Type.String(),
          assignedVendorId: Type.Optional(Type.String()),
          recurrence: Type.Optional(Type.String()),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as Record<string, unknown>
      const task = await service.create({
        organizationId: orgId,
        propertyId: body.propertyId as string,
        jurisdictionId: body.jurisdictionId as string | undefined,
        taskType: body.taskType as never,
        title: body.title as string,
        description: body.description as string | undefined,
        dueDate: new Date(body.dueDate as string),
        assignedVendorId: body.assignedVendorId as string | undefined,
        recurrence: body.recurrence as string | undefined,
      })
      return reply.status(201).send({ success: true as const, data: task })
    }
  )

  // GET /compliance/jurisdictions — before /:id to avoid route conflict
  server.get(
    '/jurisdictions',
    {
      schema: {
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const list = await service.listJurisdictions(orgId)
      return reply.send({ success: true as const, data: list })
    }
  )

  // POST /compliance/jurisdictions
  server.post(
    '/jurisdictions',
    {
      schema: {
        body: Type.Object({
          name: Type.String(),
          state: Type.String(),
          country: Type.Optional(Type.String()),
          rules: Type.Record(Type.String(), Type.Any()),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as Record<string, unknown>
      const j = await service.createJurisdiction(orgId, body as never)
      return reply.status(201).send({ success: true as const, data: j })
    }
  )

  // PATCH /compliance/jurisdictions/:id
  server.patch(
    '/jurisdictions/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          name: Type.Optional(Type.String()),
          state: Type.Optional(Type.String()),
          rules: Type.Optional(Type.Record(Type.String(), Type.Any())),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as Record<string, unknown>
      const ok = await service.updateJurisdiction(orgId, id, body as never)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Jurisdiction not found' },
        } as never)
      }
      return reply.send({ success: true as const })
    }
  )

  // GET /compliance/:id
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
      const task = await service.getById(orgId, id)
      if (!task) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Compliance task not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: task })
    }
  )

  // PATCH /compliance/:id
  server.patch(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          title: Type.Optional(Type.String()),
          description: Type.Optional(Type.String()),
          dueDate: Type.Optional(Type.String()),
          assignedVendorId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          status: Type.Optional(Type.String()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as Record<string, unknown>
      const ok = await service.update(orgId, id, {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate as string) : undefined,
      } as never)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Compliance task not found' },
        } as never)
      }
      const task = await service.getById(orgId, id)
      return reply.send({ success: true as const, data: task })
    }
  )

  // POST /compliance/:id/complete
  server.post(
    '/:id/complete',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({ documentUrl: Type.Optional(Type.String()) }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as { documentUrl?: string }
      const ok = await service.complete(orgId, id, body.documentUrl)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Compliance task not found' },
        } as never)
      }
      return reply.send({ success: true as const })
    }
  )

  // POST /compliance/:id/snooze
  server.post(
    '/:id/snooze',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({ reason: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const { reason } = request.body as { reason: string }
      const ok = await service.snooze(orgId, id, reason)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Compliance task not found' },
        } as never)
      }
      return reply.send({ success: true as const })
    }
  )
}
