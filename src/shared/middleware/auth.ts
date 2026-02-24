import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'
import { hashApiKey } from '../utils/apiKey'
import { logger } from '../../lib/logger'

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const auth = request.headers.authorization

    // Try Bearer JWT first
    if (auth?.startsWith('Bearer ')) {
      await request.jwtVerify()
      const payload = request.user as { sub: string; organizationId: string; role: string }
      request.userId = payload.sub
      request.organizationId = payload.organizationId
      request.userRole = payload.role
      return
    }

    // Try API key (format: Key propos_live_xxxx)
    if (auth?.startsWith('Key ')) {
      const key = auth.slice(4).trim()
      const keyHash = hashApiKey(key)
      const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { organization: true },
      })
      if (!apiKey || !apiKey.isActive) {
        logger.warn({ keyHash: keyHash.slice(0, 8) }, 'Invalid or inactive API key')
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid API key' },
        })
      }
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'API key expired' },
        })
      }
      request.organizationId = apiKey.organizationId
      request.scopes = apiKey.scopes
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      return
    }

    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
  } catch (err) {
    logger.debug({ err }, 'Auth verification failed')
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    })
  }
}
