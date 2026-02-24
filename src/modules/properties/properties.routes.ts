import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { PropertiesService } from './properties.service'

const service = new PropertiesService()

const PropertyTypeEnum = Type.Union([
  Type.Literal('MULTIFAMILY'),
  Type.Literal('SINGLE_FAMILY'),
  Type.Literal('MIXED_USE'),
  Type.Literal('HOA'),
  Type.Literal('STUDENT_HOUSING'),
  Type.Literal('SENIOR_HOUSING'),
])

export const propertyRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /properties
  server.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          page: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          search: Type.Optional(Type.String()),
          propertyType: Type.Optional(PropertyTypeEnum),
          isActive: Type.Optional(Type.Boolean()),
        }),
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              items: Type.Array(Type.Any()),
              total: Type.Number(),
              page: Type.Number(),
              limit: Type.Number(),
              totalPages: Type.Number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as { page?: number; limit?: number; search?: string; propertyType?: string; isActive?: boolean }
      const result = await service.list({
        organizationId: orgId,
        page: qs.page,
        limit: qs.limit,
        search: qs.search,
        propertyType: qs.propertyType as never,
        isActive: qs.isActive,
      })
      return reply.send({ success: true as const, data: result })
    }
  )

  // POST /properties
  server.post(
    '/',
    {
      schema: {
        body: Type.Object({
          name: Type.String(),
          propertyType: Type.Optional(PropertyTypeEnum),
          address: Type.Object({
            street: Type.Optional(Type.String()),
            city: Type.Optional(Type.String()),
            state: Type.Optional(Type.String()),
            zip: Type.Optional(Type.String()),
            country: Type.Optional(Type.String()),
          }),
          jurisdictionId: Type.Optional(Type.String()),
          unitCount: Type.Optional(Type.Number()),
          yearBuilt: Type.Optional(Type.Number()),
          metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
          pmsPropertyId: Type.Optional(Type.String()),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as Record<string, unknown>
      const prop = await service.create({
        organizationId: orgId,
        name: body.name as string,
        propertyType: body.propertyType as never,
        address: (body.address || {}) as never,
        jurisdictionId: body.jurisdictionId as string | undefined,
        unitCount: body.unitCount as number | undefined,
        yearBuilt: body.yearBuilt as number | undefined,
        metadata: body.metadata as Record<string, unknown> | undefined,
        pmsPropertyId: body.pmsPropertyId as string | undefined,
      })
      return reply.status(201).send({ success: true as const, data: prop })
    }
  )

  // GET /properties/:id
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
      const prop = await service.getById(orgId, id)
      if (!prop) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Property not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: prop })
    }
  )

  // PATCH /properties/:id
  server.patch(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          name: Type.Optional(Type.String()),
          propertyType: Type.Optional(PropertyTypeEnum),
          address: Type.Optional(Type.Record(Type.String(), Type.Any())),
          jurisdictionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          unitCount: Type.Optional(Type.Number()),
          yearBuilt: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
          metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
          isActive: Type.Optional(Type.Boolean()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as Record<string, unknown>
      const result = await service.update(orgId, id, body as never)
      if (result.count === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Property not found' },
        } as never)
      }
      const prop = await service.getById(orgId, id)
      return reply.send({ success: true as const, data: prop })
    }
  )

  // DELETE /properties/:id (soft delete)
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
      const result = await service.softDelete(orgId, id)
      if (result.count === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Property not found' },
        } as never)
      }
      return reply.send({ success: true as const })
    }
  )

  // GET /properties/:id/units
  server.get(
    '/:id/units',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const units = await service.listUnits(orgId, id)
      if (units === null) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Property not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: units })
    }
  )

  // POST /properties/:id/units
  server.post(
    '/:id/units',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          unitNumber: Type.String(),
          pmsUnitId: Type.Optional(Type.String()),
          bedrooms: Type.Optional(Type.Number()),
          bathrooms: Type.Optional(Type.Number()),
          squareFeet: Type.Optional(Type.Number()),
          floor: Type.Optional(Type.Number()),
          isOccupied: Type.Optional(Type.Boolean()),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const body = request.body as Record<string, unknown>
      const unit = await service.createUnit(orgId, id, {
        unitNumber: body.unitNumber as string,
        pmsUnitId: body.pmsUnitId as string | undefined,
        bedrooms: body.bedrooms as number | undefined,
        bathrooms: body.bathrooms as number | undefined,
        squareFeet: body.squareFeet as number | undefined,
        floor: body.floor as number | undefined,
        isOccupied: body.isOccupied as boolean | undefined,
      })
      if (!unit) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Property not found' },
        } as never)
      }
      return reply.status(201).send({ success: true as const, data: unit })
    }
  )

  // PATCH /properties/:id/units/:unitId
  server.patch(
    '/:id/units/:unitId',
    {
      schema: {
        params: Type.Object({ id: Type.String(), unitId: Type.String() }),
        body: Type.Object({
          unitNumber: Type.Optional(Type.String()),
          bedrooms: Type.Optional(Type.Number()),
          bathrooms: Type.Optional(Type.Number()),
          squareFeet: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
          floor: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
          isOccupied: Type.Optional(Type.Boolean()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id, unitId } = request.params as { id: string; unitId: string }
      const body = request.body as Record<string, unknown>
      const unit = await service.updateUnit(orgId, id, unitId, body as never)
      if (!unit) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Property or unit not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: unit })
    }
  )
}
