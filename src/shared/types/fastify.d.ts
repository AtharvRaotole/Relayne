import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    organizationId?: string
    userId?: string
    userRole?: string
    scopes?: string[]
  }
}
