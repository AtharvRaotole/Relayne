import { prisma } from '../../lib/prisma'
import type { InvoiceStatus } from '@prisma/client'

export interface CreateInvoiceInput {
  organizationId: string
  vendorId: string
  workOrderId?: string
  invoiceNumber?: string
  amount: number
  taxAmount?: number
  totalAmount: number
  lineItems?: object[]
  invoiceDate?: Date
  dueDate?: Date
  documentUrl?: string
}

export interface UpdateInvoiceInput {
  invoiceNumber?: string
  amount?: number
  taxAmount?: number
  totalAmount?: number
  lineItems?: object[]
  status?: InvoiceStatus
  invoiceDate?: Date | null
  dueDate?: Date | null
  documentUrl?: string | null
}

export interface ListInvoicesInput {
  organizationId: string
  page?: number
  limit?: number
  status?: InvoiceStatus
  vendorId?: string
  from?: Date
  to?: Date
}

export class InvoicesService {
  async list(input: ListInvoicesInput) {
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(50, Math.max(1, input.limit ?? 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      organizationId: input.organizationId,
    }
    if (input.status) where.status = input.status
    if (input.vendorId) where.vendorId = input.vendorId
    if (input.from || input.to) {
      where.createdAt = {}
      if (input.from) (where.createdAt as Record<string, Date>).gte = input.from
      if (input.to) (where.createdAt as Record<string, Date>).lte = input.to
    }

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { id: true, companyName: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getById(organizationId: string, id: string) {
    return prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        vendor: true,
      },
    })
  }

  async create(input: CreateInvoiceInput) {
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: input.organizationId,
        vendorId: input.vendorId,
        invoiceNumber: input.invoiceNumber,
        amount: input.amount,
        taxAmount: input.taxAmount ?? 0,
        totalAmount: input.totalAmount,
        lineItems: (input.lineItems ?? []) as object[],
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        documentUrl: input.documentUrl,
      },
    })

    if (input.workOrderId) {
      await prisma.workOrder.updateMany({
        where: { id: input.workOrderId, organizationId: input.organizationId },
        data: { invoiceId: invoice.id },
      })
    }

    return invoice
  }

  async update(organizationId: string, id: string, input: UpdateInvoiceInput) {
    const result = await prisma.invoice.updateMany({
      where: { id, organizationId },
      data: {
        ...(input.invoiceNumber !== undefined && { invoiceNumber: input.invoiceNumber }),
        ...(input.amount != null && { amount: input.amount }),
        ...(input.taxAmount !== undefined && { taxAmount: input.taxAmount }),
        ...(input.totalAmount != null && { totalAmount: input.totalAmount }),
        ...(input.lineItems != null && { lineItems: input.lineItems as object[] }),
        ...(input.status != null && { status: input.status }),
        ...(input.invoiceDate !== undefined && { invoiceDate: input.invoiceDate }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.documentUrl !== undefined && { documentUrl: input.documentUrl }),
      },
    })
    return result.count > 0
  }

  async approve(organizationId: string, id: string) {
    const result = await prisma.invoice.updateMany({
      where: { id, organizationId },
      data: { status: 'APPROVED' },
    })
    return result.count > 0
  }

  async dispute(organizationId: string, id: string, reason: string) {
    const result = await prisma.invoice.updateMany({
      where: { id, organizationId },
      data: {
        status: 'DISPUTED',
        aiAnomalyReason: reason,
      },
    })
    return result.count > 0
  }

  async getAnomalies(organizationId: string, limit = 50) {
    return prisma.invoice.findMany({
      where: { organizationId, aiAnomalyFlag: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { vendor: { select: { companyName: true } } },
    })
  }
}
