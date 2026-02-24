import { prisma } from '../../lib/prisma'
import type { CommChannel, ThreadStatus, Direction } from '@prisma/client'

export interface CreateThreadInput {
  organizationId: string
  tenantId?: string
  vendorId?: string
  workOrderId?: string
  subject?: string
}

export interface SendMessageInput {
  organizationId: string
  to: string
  channel: CommChannel
  subject?: string
  body: string
  threadId?: string
  workOrderId?: string
  tenantId?: string
  vendorId?: string
}

export interface ListThreadsInput {
  organizationId: string
  page?: number
  limit?: number
  status?: ThreadStatus
  tenantId?: string
  vendorId?: string
}

export class CommunicationsService {
  async listThreads(input: ListThreadsInput) {
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(50, Math.max(1, input.limit ?? 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      organizationId: input.organizationId,
    }
    if (input.status) where.status = input.status
    if (input.tenantId) where.tenantId = input.tenantId
    if (input.vendorId) where.vendorId = input.vendorId

    const [items, total] = await Promise.all([
      prisma.thread.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
          tenant: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.thread.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getThread(organizationId: string, id: string) {
    return prisma.thread.findFirst({
      where: { id, organizationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        tenant: true,
      },
    })
  }

  async createThread(input: CreateThreadInput) {
    return prisma.thread.create({
      data: {
        organizationId: input.organizationId,
        tenantId: input.tenantId,
        vendorId: input.vendorId,
        workOrderId: input.workOrderId,
        subject: input.subject,
      },
    })
  }

  async updateThreadStatus(organizationId: string, id: string, status: ThreadStatus) {
    const result = await prisma.thread.updateMany({
      where: { id, organizationId },
      data: { status },
    })
    return result.count > 0
  }

  async sendMessage(input: SendMessageInput) {
    let threadId = input.threadId

    if (!threadId) {
      const thread = await prisma.thread.create({
        data: {
          organizationId: input.organizationId,
          tenantId: input.tenantId,
          vendorId: input.vendorId,
          workOrderId: input.workOrderId,
          subject: input.subject,
        },
      })
      threadId = thread.id
    }

    const message = await prisma.message.create({
      data: {
        threadId,
        tenantId: input.tenantId,
        vendorId: input.vendorId,
        direction: 'OUTBOUND',
        channel: input.channel,
        toAddress: input.to,
        subject: input.subject,
        body: input.body,
      },
    })

    await prisma.thread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    })

    return message
  }

  async getInbox(organizationId: string, limit = 50) {
    const threads = await prisma.thread.findMany({
      where: {
        organizationId,
        status: { in: ['OPEN', 'WAITING_RESPONSE'] },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: {
        messages: {
          where: { readAt: null },
          take: 1,
        },
        tenant: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    return threads
  }

  async getQueue(organizationId: string, limit = 50) {
    return prisma.message.findMany({
      where: {
        thread: { organizationId },
        aiProcessed: false,
        direction: 'INBOUND',
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { thread: true },
    })
  }
}
