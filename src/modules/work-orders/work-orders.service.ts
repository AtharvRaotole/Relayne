import { prisma } from '../../lib/prisma'
import type { WorkOrderCategory, Priority, WorkOrderStatus, CommChannel } from '@prisma/client'

const VALID_TRANSITIONS: Partial<Record<WorkOrderStatus, WorkOrderStatus[]>> = {
  NEW: ['TRIAGED', 'CANCELLED'],
  TRIAGED: ['VENDOR_SEARCH', 'PENDING_BIDS', 'CANCELLED', 'ESCALATED'],
  VENDOR_SEARCH: ['PENDING_BIDS', 'DISPATCHED', 'CANCELLED', 'ESCALATED'],
  PENDING_BIDS: ['DISPATCHED', 'CANCELLED', 'ESCALATED'],
  DISPATCHED: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED', 'ESCALATED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED', 'ESCALATED'],
  IN_PROGRESS: ['PENDING_REVIEW', 'COMPLETED', 'CANCELLED', 'ESCALATED'],
  PENDING_REVIEW: ['COMPLETED', 'IN_PROGRESS', 'ESCALATED'],
  ON_HOLD: ['TRIAGED', 'VENDOR_SEARCH', 'CANCELLED'],
  ESCALATED: ['TRIAGED', 'VENDOR_SEARCH', 'DISPATCHED', 'IN_PROGRESS', 'CANCELLED'],
}

export interface CreateWorkOrderInput {
  organizationId: string
  propertyId: string
  unitId?: string
  tenantId?: string
  title: string
  description: string
  category: WorkOrderCategory
  priority?: Priority
  scheduledAt?: Date
  accessInstructions?: string
  estimatedCost?: number
  sourceChannel?: CommChannel
}

export interface UpdateWorkOrderInput {
  title?: string
  description?: string
  category?: WorkOrderCategory
  priority?: Priority
  scheduledAt?: Date | null
  accessInstructions?: string | null
  estimatedHours?: number | null
  estimatedCost?: number | null
  status?: WorkOrderStatus
}

export interface ListWorkOrdersInput {
  organizationId: string
  page?: number
  limit?: number
  status?: WorkOrderStatus | WorkOrderStatus[]
  priority?: Priority
  propertyId?: string
  vendorId?: string
  from?: Date
  to?: Date
}

export class WorkOrdersService {
  private async addEvent(
    workOrderId: string,
    eventType: string,
    description: string,
    actorType: string,
    actorId?: string,
    metadata?: object
  ) {
    await prisma.workOrderEvent.create({
      data: {
        workOrderId,
        eventType,
        description,
        actorType,
        actorId,
        metadata: (metadata ?? {}) as object,
      },
    })
  }

  private canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
    const allowed = VALID_TRANSITIONS[from]
    if (!allowed) return false
    return allowed.includes(to)
  }

  async list(input: ListWorkOrdersInput) {
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(50, Math.max(1, input.limit ?? 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      organizationId: input.organizationId,
    }
    if (input.status != null) {
      where.status = Array.isArray(input.status)
        ? { in: input.status }
        : input.status
    }
    if (input.priority) where.priority = input.priority
    if (input.propertyId) where.propertyId = input.propertyId
    if (input.vendorId) where.vendorId = input.vendorId
    if (input.from || input.to) {
      where.createdAt = {}
      if (input.from) (where.createdAt as Record<string, Date>).gte = input.from
      if (input.to) (where.createdAt as Record<string, Date>).lte = input.to
    }

    const [items, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, unitNumber: true } },
          tenant: { select: { id: true, firstName: true, lastName: true } },
          vendor: { select: { id: true, companyName: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getById(organizationId: string, id: string) {
    return prisma.workOrder.findFirst({
      where: { id, organizationId },
      include: {
        property: true,
        unit: true,
        tenant: true,
        vendor: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        bids: { include: { vendor: true } },
      },
    })
  }

  async create(input: CreateWorkOrderInput) {
    const wo = await prisma.workOrder.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        tenantId: input.tenantId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority ?? 'NORMAL',
        scheduledAt: input.scheduledAt,
        accessInstructions: input.accessInstructions,
        estimatedCost: input.estimatedCost,
        sourceChannel: input.sourceChannel,
      },
    })
    await this.addEvent(wo.id, 'status_change', 'Work order created', 'system')
    return wo
  }

  async update(organizationId: string, id: string, input: UpdateWorkOrderInput) {
    const existing = await prisma.workOrder.findFirst({
      where: { id, organizationId },
    })
    if (!existing) return null

    const data: Record<string, unknown> = {}
    if (input.title != null) data.title = input.title
    if (input.description != null) data.description = input.description
    if (input.category != null) data.category = input.category
    if (input.priority != null) data.priority = input.priority
    if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt
    if (input.accessInstructions !== undefined) data.accessInstructions = input.accessInstructions
    if (input.estimatedHours !== undefined) data.estimatedHours = input.estimatedHours
    if (input.estimatedCost !== undefined) data.estimatedCost = input.estimatedCost

    if (input.status != null && input.status !== existing.status) {
      if (!this.canTransition(existing.status, input.status)) {
        throw new Error('INVALID_STATUS_TRANSITION')
      }
      data.status = input.status
    }

    const wo = await prisma.workOrder.update({
      where: { id },
      data,
    })
    if (input.status != null && input.status !== existing.status) {
      await this.addEvent(id, 'status_change', `Status changed to ${input.status}`, 'user')
    }
    return wo
  }

  async cancel(organizationId: string, id: string) {
    const existing = await prisma.workOrder.findFirst({
      where: { id, organizationId },
    })
    if (!existing) return null
    if (!this.canTransition(existing.status, 'CANCELLED')) {
      throw new Error('INVALID_STATUS_TRANSITION')
    }
    await prisma.workOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
    await this.addEvent(id, 'status_change', 'Work order cancelled', 'user')
    return { cancelled: true }
  }

  async assignVendor(organizationId: string, id: string, vendorId: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id, organizationId },
    })
    if (!wo) return null

    await prisma.workOrder.update({
      where: { id },
      data: {
        vendorId,
        status: wo.status === 'VENDOR_SEARCH' || wo.status === 'PENDING_BIDS' ? 'DISPATCHED' : wo.status,
      },
    })
    await this.addEvent(id, 'vendor_assigned', `Vendor assigned: ${vendorId}`, 'user', undefined, { vendorId })
    return prisma.workOrder.findUnique({ where: { id }, include: { vendor: true } })
  }

  async complete(organizationId: string, id: string, resolutionNotes?: string, photos?: object[]) {
    const wo = await prisma.workOrder.findFirst({
      where: { id, organizationId },
    })
    if (!wo) return null

    await prisma.workOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        resolutionNotes: resolutionNotes ?? wo.resolutionNotes,
        photos: (photos ?? wo.photos ?? []) as object[],
      },
    })
    await this.addEvent(id, 'status_change', 'Work order completed', 'user')

    if (wo.vendorId) {
      const completed = await prisma.workOrder.count({
        where: { vendorId: wo.vendorId, status: 'COMPLETED' },
      })
      const total = await prisma.workOrder.count({
        where: { vendorId: wo.vendorId },
      })
      await prisma.vendor.update({
        where: { id: wo.vendorId },
        data: {
          totalJobsCompleted: completed,
          completionRate: total > 0 ? completed / total : 1,
        },
      })
    }
    return prisma.workOrder.findUnique({ where: { id } })
  }

  async escalate(organizationId: string, id: string, reason: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id, organizationId },
    })
    if (!wo) return null

    const escalation = await prisma.escalation.create({
      data: {
        organizationId,
        workOrderId: id,
        reason: 'MANUAL_REQUEST',
        description: reason,
        context: { workOrder: wo, manualReason: reason } as object,
      },
    })

    await prisma.workOrder.update({
      where: { id },
      data: { status: 'ESCALATED', escalationId: escalation.id },
    })
    await this.addEvent(id, 'escalated', reason, 'user', undefined, { escalationId: escalation.id })
    return prisma.workOrder.findUnique({ where: { id }, include: { vendor: true } })
  }

  async getTimeline(organizationId: string, id: string) {
    const wo = await prisma.workOrder.findFirst({
      where: { id, organizationId },
    })
    if (!wo) return null

    return prisma.workOrderEvent.findMany({
      where: { workOrderId: id },
      orderBy: { createdAt: 'asc' },
    })
  }
}
