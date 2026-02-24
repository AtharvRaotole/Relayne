import { prisma } from '../../lib/prisma'
import type { ComplianceTaskType, ComplianceStatus } from '@prisma/client'

export interface CreateComplianceTaskInput {
  organizationId: string
  propertyId: string
  jurisdictionId?: string
  taskType: ComplianceTaskType
  title: string
  description?: string
  dueDate: Date
  assignedVendorId?: string
  recurrence?: string
}

export interface UpdateComplianceTaskInput {
  title?: string
  description?: string
  dueDate?: Date
  assignedVendorId?: string | null
  status?: ComplianceStatus
}

export interface ListComplianceTasksInput {
  organizationId: string
  page?: number
  limit?: number
  status?: ComplianceStatus
  propertyId?: string
  taskType?: ComplianceTaskType
}

export class ComplianceService {
  async list(input: ListComplianceTasksInput) {
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(50, Math.max(1, input.limit ?? 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      organizationId: input.organizationId,
    }
    if (input.status) where.status = input.status
    if (input.propertyId) where.propertyId = input.propertyId
    if (input.taskType) where.taskType = input.taskType

    const [items, total] = await Promise.all([
      prisma.complianceTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          property: { select: { id: true, name: true } },
          jurisdiction: { select: { id: true, name: true } },
        },
      }),
      prisma.complianceTask.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getById(organizationId: string, id: string) {
    return prisma.complianceTask.findFirst({
      where: { id, organizationId },
      include: {
        property: true,
        jurisdiction: true,
      },
    })
  }

  async create(input: CreateComplianceTaskInput) {
    return prisma.complianceTask.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        jurisdictionId: input.jurisdictionId,
        taskType: input.taskType,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        assignedVendorId: input.assignedVendorId,
        recurrence: input.recurrence,
      },
    })
  }

  async update(organizationId: string, id: string, input: UpdateComplianceTaskInput) {
    const result = await prisma.complianceTask.updateMany({
      where: { id, organizationId },
      data: {
        ...(input.title != null && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.dueDate != null && { dueDate: input.dueDate }),
        ...(input.assignedVendorId !== undefined && { assignedVendorId: input.assignedVendorId }),
        ...(input.status != null && { status: input.status }),
      },
    })
    return result.count > 0
  }

  async complete(organizationId: string, id: string, documentUrl?: string) {
    const result = await prisma.complianceTask.updateMany({
      where: { id, organizationId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(documentUrl && { documentUrl }),
      },
    })
    return result.count > 0
  }

  async snooze(organizationId: string, id: string, reason: string) {
    const task = await prisma.complianceTask.findFirst({
      where: { id, organizationId },
    })
    if (!task) return false

    await prisma.complianceTask.update({
      where: { id },
      data: {
        remindersSent: { increment: 1 },
        lastReminderAt: new Date(),
      },
    })
    return true
  }

  async listJurisdictions(organizationId: string) {
    return prisma.jurisdiction.findMany({
      where: { organizationId },
    })
  }

  async createJurisdiction(
    organizationId: string,
    data: { name: string; state: string; country?: string; rules: object }
  ) {
    return prisma.jurisdiction.create({
      data: {
        organizationId,
        name: data.name,
        state: data.state,
        country: data.country ?? 'US',
        rules: data.rules as object,
      },
    })
  }

  async updateJurisdiction(
    organizationId: string,
    id: string,
    data: { name?: string; state?: string; rules?: object }
  ) {
    const result = await prisma.jurisdiction.updateMany({
      where: { id, organizationId },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.state != null && { state: data.state }),
        ...(data.rules != null && { rules: data.rules as object }),
      },
    })
    return result.count > 0
  }
}
