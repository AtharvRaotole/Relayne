import { prisma } from '../../lib/prisma'
import type { CommChannel } from '@prisma/client'

export interface CreateTenantInput {
  organizationId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  preferredChannel?: CommChannel
  language?: string
  pmsTenantId?: string
  notes?: string
}

export interface UpdateTenantInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  preferredChannel?: CommChannel
  language?: string
  notes?: string
  isActive?: boolean
}

export interface ListTenantsInput {
  organizationId: string
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}

export class TenantsService {
  async list(input: ListTenantsInput) {
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(50, Math.max(1, input.limit ?? 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      organizationId: input.organizationId,
    }
    if (input.isActive != null) where.isActive = input.isActive
    if (input.search) {
      where.OR = [
        { firstName: { contains: input.search, mode: 'insensitive' } },
        { lastName: { contains: input.search, mode: 'insensitive' } },
        { email: { contains: input.search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          leases: {
            where: { status: 'ACTIVE' },
            take: 1,
            include: { unit: true },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getById(organizationId: string, id: string) {
    return prisma.tenant.findFirst({
      where: { id, organizationId },
      include: {
        leases: { include: { unit: { include: { property: true } } } },
        _count: { select: { workOrders: true, messages: true } },
      },
    })
  }

  async create(input: CreateTenantInput) {
    return prisma.tenant.create({
      data: {
        organizationId: input.organizationId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        preferredChannel: input.preferredChannel ?? 'EMAIL',
        language: input.language ?? 'en',
        pmsTenantId: input.pmsTenantId,
        notes: input.notes,
      },
    })
  }

  async update(organizationId: string, id: string, input: UpdateTenantInput) {
    const result = await prisma.tenant.updateMany({
      where: { id, organizationId },
      data: {
        ...(input.firstName != null && { firstName: input.firstName }),
        ...(input.lastName != null && { lastName: input.lastName }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.preferredChannel != null && { preferredChannel: input.preferredChannel }),
        ...(input.language != null && { language: input.language }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.isActive != null && { isActive: input.isActive }),
      },
    })
    return result.count > 0
  }

  /** Compute churn risk based on lease status, open work orders, satisfaction, etc. */
  async computeChurnRisk(tenantId: string): Promise<{ score: number; factors: string[]; openIssuesCount: number }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        leases: { where: { status: 'ACTIVE' }, include: { unit: true } },
        workOrders: {
          where: {
            status: { in: ['NEW', 'TRIAGED', 'VENDOR_SEARCH', 'PENDING_BIDS', 'DISPATCHED', 'SCHEDULED', 'IN_PROGRESS', 'PENDING_REVIEW'] },
          },
        },
        _count: { select: { messages: true } },
      },
    })
    if (!tenant) return { score: 0, factors: [], openIssuesCount: 0 }

    const factors: string[] = []
    let score = 0

    // Lease ending soon
    const activeLease = tenant.leases[0]
    if (activeLease) {
      const daysToEnd = Math.ceil((activeLease.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysToEnd <= 60) {
        score += 0.3
        factors.push(`Lease ends in ${daysToEnd} days`)
      }
      if (!activeLease.renewalSentAt && daysToEnd <= 90) {
        score += 0.15
        factors.push('No renewal inquiry sent yet')
      }
    } else {
      score += 0.2
      factors.push('No active lease')
    }

    // Open work orders
    const openWoCount = tenant.workOrders.length
    if (openWoCount > 0) {
      score += Math.min(0.3, openWoCount * 0.1)
      factors.push(`${openWoCount} unresolved maintenance issue(s)`)
    }

    // Low satisfaction
    if (tenant.satisfactionScore < 0.4) {
      score += 0.25
      factors.push('Low satisfaction score from interactions')
    }

    // Last interaction
    if (tenant.lastInteractionAt) {
      const daysSince = Math.ceil((Date.now() - tenant.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince > 90) {
        score += 0.1
        factors.push('No recent interaction')
      }
    }

    const finalScore = Math.min(1, score)
    return { score: Math.round(finalScore * 100) / 100, factors, openIssuesCount: openWoCount }
  }

  async getMessages(organizationId: string, tenantId: string, limit = 50) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, organizationId },
    })
    if (!tenant) return null

    return prisma.message.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { thread: true },
    })
  }

  async getWorkOrders(organizationId: string, tenantId: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, organizationId },
    })
    if (!tenant) return null

    return prisma.workOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { property: true, unit: true, vendor: true },
    })
  }
}
