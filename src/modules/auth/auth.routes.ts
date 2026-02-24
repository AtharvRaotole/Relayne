import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { AuthService } from './auth.service'
import { requireAuth } from '../../shared/middleware/auth'
import { prisma } from '../../lib/prisma'
import { env } from '../../config/env'

const authService = new AuthService()

export const authRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  // POST /auth/register [PUBLIC]
  server.post(
    '/register',
    {
      schema: {
        body: Type.Object({
          organizationName: Type.String({ minLength: 1 }),
          organizationSlug: Type.String({ minLength: 1 }),
          email: Type.String({ format: 'email' }),
          password: Type.String({ minLength: 8 }),
          firstName: Type.String({ minLength: 1 }),
          lastName: Type.String({ minLength: 1 }),
        }),
        response: {
          201: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              user: Type.Object({
                id: Type.String(),
                email: Type.String(),
                firstName: Type.String(),
                lastName: Type.String(),
                role: Type.String(),
                organizationId: Type.String(),
                organizationName: Type.String(),
              }),
              accessToken: Type.String(),
              refreshToken: Type.String(),
              expiresIn: Type.Number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const signJwt = (payload: object) =>
          server.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
        const result = await authService.register(
          request.body as Parameters<typeof authService.register>[0],
          signJwt
        )
        const user = result.user as {
          id: string
          email: string
          firstName: string
          lastName: string
          role: string
          organizationId: string
          organizationName: string
        }
        return reply.status(201).send({
          success: true as const,
          data: {
            user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        if (msg === 'ORGANIZATION_SLUG_EXISTS') {
          return reply.status(409).send({
            success: false,
            error: { code: 'CONFLICT', message: 'Organization slug already exists' },
          } as never)
        }
        if (msg === 'EMAIL_EXISTS') {
          return reply.status(409).send({
            success: false,
            error: { code: 'CONFLICT', message: 'Email already registered' },
          } as never)
        }
        throw err
      }
    }
  )

  // POST /auth/login [PUBLIC]
  server.post(
    '/login',
    {
      schema: {
        body: Type.Object({
          email: Type.String(),
          password: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              user: Type.Object({
                id: Type.String(),
                email: Type.String(),
                firstName: Type.String(),
                lastName: Type.String(),
                role: Type.String(),
                organizationId: Type.String(),
                organizationName: Type.String(),
              }),
              accessToken: Type.String(),
              refreshToken: Type.String(),
              expiresIn: Type.Number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const signJwt = (payload: object) =>
          server.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
        const result = await authService.login(
          request.body as Parameters<typeof authService.login>[0],
          signJwt
        )
        const user = result.user as {
          id: string
          email: string
          firstName: string
          lastName: string
          role: string
          organizationId: string
          organizationName: string
        }
        return reply.send({
          success: true as const,
          data: {
            user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        if (msg === 'INVALID_CREDENTIALS') {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
          } as never)
        }
        throw err
      }
    }
  )

  // POST /auth/refresh [PUBLIC]
  server.post(
    '/refresh',
    {
      schema: {
        body: Type.Object({
          refreshToken: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              accessToken: Type.String(),
              refreshToken: Type.String(),
              expiresIn: Type.Number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { refreshToken } = request.body as { refreshToken: string }
        const signJwt = (payload: object) =>
          server.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
        const tokens = await authService.refresh(refreshToken, signJwt)
        return reply.send({
          success: true as const,
          data: tokens,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        if (msg === 'INVALID_REFRESH_TOKEN') {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
          } as never)
        }
        throw err
      }
    }
  )

  // POST /auth/logout — requires auth
  server.post(
    '/logout',
    {
      preHandler: requireAuth,
      schema: {
        body: Type.Object({
          refreshToken: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Literal(true),
          }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string }
      await authService.logout(refreshToken)
      return reply.send({ success: true as const })
    }
  )

  // POST /auth/change-password — requires JWT
  server.post(
    '/change-password',
    {
      preHandler: [requireAuth],
      schema: {
        body: Type.Object({
          currentPassword: Type.String(),
          newPassword: Type.String({ minLength: 8 }),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User session required' },
        } as never)
      }
      try {
        const { currentPassword, newPassword } = request.body as {
          currentPassword: string
          newPassword: string
        }
        await authService.changePassword(request.userId, currentPassword, newPassword)
        return reply.send({ success: true as const })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'INVALID_CURRENT_PASSWORD') {
          return reply.status(400).send({
            success: false,
            error: { code: 'BAD_REQUEST', message: 'Current password is incorrect' },
          } as never)
        }
        throw err
      }
    }
  )

  // PATCH /auth/me — requires JWT
  server.patch(
    '/me',
    {
      preHandler: [requireAuth],
      schema: {
        body: Type.Object({
          firstName: Type.Optional(Type.String()),
          lastName: Type.Optional(Type.String()),
          phone: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          avatarUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User session required' },
        } as never)
      }
      const body = request.body as { firstName?: string; lastName?: string; phone?: string | null; avatarUrl?: string | null }
      await authService.updateProfile(request.userId, body)
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          avatarUrl: true,
          organizationId: true,
          organization: { select: { id: true, name: true, slug: true, plan: true } },
        },
      })
      return reply.send({ success: true as const, data: user })
    }
  )

  // POST /auth/invite — requires JWT
  server.post(
    '/invite',
    {
      preHandler: [requireAuth],
      schema: {
        body: Type.Object({
          email: Type.String({ format: 'email' }),
          role: Type.Optional(Type.Union([
            Type.Literal('ADMIN'),
            Type.Literal('COORDINATOR'),
            Type.Literal('READ_ONLY'),
          ])),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      if (!request.userId || !request.organizationId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User session required' },
        } as never)
      }
      try {
        const { email, role } = request.body as { email: string; role?: string }
        const data = await authService.invite(
          request.organizationId,
          request.userId,
          email,
          (role as 'ADMIN' | 'COORDINATOR' | 'READ_ONLY') ?? 'COORDINATOR'
        )
        return reply.status(201).send({ success: true as const, data })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'EMAIL_ALREADY_REGISTERED') {
          return reply.status(409).send({
            success: false,
            error: { code: 'CONFLICT', message: 'Email already registered' },
          } as never)
        }
        throw err
      }
    }
  )

  // POST /auth/accept-invite/:token [PUBLIC]
  server.post(
    '/accept-invite/:token',
    {
      schema: {
        params: Type.Object({ token: Type.String() }),
        body: Type.Object({
          password: Type.String({ minLength: 8 }),
          firstName: Type.String({ minLength: 1 }),
          lastName: Type.String({ minLength: 1 }),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      try {
        const { token } = request.params as { token: string }
        const { password, firstName, lastName } = request.body as {
          password: string
          firstName: string
          lastName: string
        }
        const signJwt = (p: object) =>
          server.jwt.sign(p, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
        const result = await authService.acceptInvite(token, password, firstName, lastName, signJwt)
        return reply.send({
          success: true as const,
          data: {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'INVALID_OR_EXPIRED_INVITE') {
          return reply.status(400).send({
            success: false,
            error: { code: 'BAD_REQUEST', message: 'Invalid or expired invite' },
          } as never)
        }
        if (msg === 'EMAIL_ALREADY_REGISTERED') {
          return reply.status(409).send({
            success: false,
            error: { code: 'CONFLICT', message: 'Email already registered' },
          } as never)
        }
        throw err
      }
    }
  )

  // GET /auth/api-keys
  server.get(
    '/api-keys',
    {
      preHandler: [requireAuth],
      schema: {
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const keys = await authService.listApiKeys(orgId)
      return reply.send({ success: true as const, data: keys })
    }
  )

  // POST /auth/api-keys
  server.post(
    '/api-keys',
    {
      preHandler: [requireAuth],
      schema: {
        body: Type.Object({
          name: Type.String({ minLength: 1 }),
          scopes: Type.Optional(Type.Array(Type.String())),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { name, scopes } = request.body as { name: string; scopes?: string[] }
      const data = await authService.createApiKey(orgId, name, scopes ?? ['*'])
      return reply.status(201).send({
        success: true as const,
        data: { ...data, message: 'Save the raw key now — it will not be shown again.' },
      })
    }
  )

  // DELETE /auth/api-keys/:id
  server.delete(
    '/api-keys/:id',
    {
      preHandler: [requireAuth],
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const ok = await authService.deleteApiKey(orgId, id)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'API key not found' },
        } as never)
      }
      return reply.send({ success: true as const })
    }
  )

  // GET /auth/me — requires JWT (user session, not API key)
  server.get(
    '/me',
    {
      preHandler: [requireAuth],
      schema: {
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              id: Type.String(),
              email: Type.String(),
              firstName: Type.String(),
              lastName: Type.String(),
              role: Type.String(),
              phone: Type.Optional(Type.Union([Type.String(), Type.Null()])),
              avatarUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
              organizationId: Type.String(),
              organization: Type.Object({
                id: Type.String(),
                name: Type.String(),
                slug: Type.String(),
                plan: Type.String(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User session required (API keys not supported for /me)' },
        } as never)
      }
      const user = await prisma.user.findUnique({
        where: { id: request.userId! },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          avatarUrl: true,
          organizationId: true,
          organization: {
            select: { id: true, name: true, slug: true, plan: true },
          },
        },
      })
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        } as never)
      }
      return reply.send({
        success: true as const,
        data: {
          ...user,
          organization: user.organization,
        },
      })
    }
  )
}
