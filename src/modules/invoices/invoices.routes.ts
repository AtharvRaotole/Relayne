import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { InvoicesService } from './invoices.service'

const service = new InvoicesService()

export const invoiceRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /invoices
  server.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          page: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          status: Type.Optional(Type.String()),
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
      const result = await service.list({
        organizationId: orgId,
        page: qs.page as number | undefined,
        limit: qs.limit as number | undefined,
        status: qs.status as never,
        vendorId: qs.vendorId as string | undefined,
        from: qs.from ? new Date(qs.from as string) : undefined,
        to: qs.to ? new Date(qs.to as string) : undefined,
      })
      return reply.send({ success: true as const, data: result })
    }
  )

  // GET /invoices/anomalies — before /:id to avoid route conflict
  server.get(
    '/anomalies',
    {
      schema: {
        querystring: Type.Object({ limit: Type.Optional(Type.Number()) }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Array(Type.Any()) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const qs = request.query as { limit?: number }
      const items = await service.getAnomalies(orgId, qs.limit)
      return reply.send({ success: true as const, data: items })
    }
  )

  // POST /invoices
  server.post(
    '/',
    {
      schema: {
        body: Type.Object({
          vendorId: Type.String(),
          workOrderId: Type.Optional(Type.String()),
          invoiceNumber: Type.Optional(Type.String()),
          amount: Type.Number(),
          taxAmount: Type.Optional(Type.Number()),
          totalAmount: Type.Number(),
          lineItems: Type.Optional(Type.Array(Type.Any())),
          invoiceDate: Type.Optional(Type.String()),
          dueDate: Type.Optional(Type.String()),
          documentUrl: Type.Optional(Type.String()),
        }),
        response: { 201: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as Record<string, unknown>
      const invoice = await service.create({
        organizationId: orgId,
        vendorId: body.vendorId as string,
        workOrderId: body.workOrderId as string | undefined,
        invoiceNumber: body.invoiceNumber as string | undefined,
        amount: body.amount as number,
        taxAmount: body.taxAmount as number | undefined,
        totalAmount: body.totalAmount as number,
        lineItems: body.lineItems as object[] | undefined,
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate as string) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate as string) : undefined,
        documentUrl: body.documentUrl as string | undefined,
      })
      return reply.status(201).send({ success: true as const, data: invoice })
    }
  )

  // GET /invoices/:id
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
      const invoice = await service.getById(orgId, id)
      if (!invoice) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found' },
        } as never)
      }
      return reply.send({ success: true as const, data: invoice })
    }
  )

  // PATCH /invoices/:id
  server.patch(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          invoiceNumber: Type.Optional(Type.String()),
          amount: Type.Optional(Type.Number()),
          taxAmount: Type.Optional(Type.Number()),
          totalAmount: Type.Optional(Type.Number()),
          lineItems: Type.Optional(Type.Array(Type.Any())),
          status: Type.Optional(Type.String()),
          invoiceDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          dueDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          documentUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
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
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate as string) : body.invoiceDate,
        dueDate: body.dueDate ? new Date(body.dueDate as string) : body.dueDate,
      } as never)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found' },
        } as never)
      }
      const invoice = await service.getById(orgId, id)
      return reply.send({ success: true as const, data: invoice })
    }
  )

  // POST /invoices/:id/approve
  server.post(
    '/:id/approve',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { id } = request.params as { id: string }
      const ok = await service.approve(orgId, id)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found' },
        } as never)
      }
      return reply.send({ success: true as const })
    }
  )

  // POST /invoices/:id/dispute
  server.post(
    '/:id/dispute',
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
      const ok = await service.dispute(orgId, id, reason)
      if (!ok) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found' },
        } as never)
      }
      return reply.send({ success: true as const })
    }
  )

}
