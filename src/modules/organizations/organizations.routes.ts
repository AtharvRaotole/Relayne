import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { OrganizationsService } from './organizations.service'

const service = new OrganizationsService()

export const organizationRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /organizations/me — current user's organization
  server.get(
    '/me',
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              id: Type.String(),
              name: Type.String(),
              slug: Type.String(),
              plan: Type.String(),
              unitCount: Type.Number(),
              settings: Type.Any(),
              createdAt: Type.String(),
              updatedAt: Type.String(),
              _count: Type.Optional(
                Type.Object({
                  properties: Type.Number(),
                  tenants: Type.Number(),
                  vendors: Type.Number(),
                })
              ),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const org = await service.getById(orgId)
      if (!org) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        } as never)
      }
      return reply.send({
        success: true as const,
        data: {
          ...org,
          createdAt: org.createdAt.toISOString(),
          updatedAt: org.updatedAt.toISOString(),
        },
      })
    }
  )

  // PATCH /organizations/:id — update organization (must be same org)
  server.patch(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          name: Type.Optional(Type.String()),
          plan: Type.Optional(Type.Union([Type.Literal('STARTER'), Type.Literal('GROWTH'), Type.Literal('ENTERPRISE')])),
          unitCount: Type.Optional(Type.Number()),
          settings: Type.Optional(Type.Record(Type.String(), Type.Any())),
        }),
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              id: Type.String(),
              name: Type.String(),
              slug: Type.String(),
              plan: Type.String(),
              unitCount: Type.Number(),
              settings: Type.Any(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      if (id !== request.organizationId) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot update another organization' },
        } as never)
      }
      const body = request.body as { name?: string; plan?: string; unitCount?: number; settings?: Record<string, unknown> }
      const org = await service.update(id, {
        ...body,
        plan: body.plan as 'STARTER' | 'GROWTH' | 'ENTERPRISE' | undefined,
      })
      return reply.send({
        success: true as const,
        data: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          unitCount: org.unitCount,
          settings: org.settings,
        },
      })
    }
  )
}
