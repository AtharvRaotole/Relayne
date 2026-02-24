import { prisma } from '../../lib/prisma'
import type { CommChannel, VendorTier } from '@prisma/client'

export interface CreateVendorInput {
  organizationId: string
  companyName: string
  contactName?: string
  email?: string
  phone?: string
  preferredChannel?: CommChannel
  trades: string[]
  serviceZips: string[]
  preferredTier?: VendorTier
  laborRates?: Record<string, number>
  notes?: string
}

export interface UpdateVendorInput {
  companyName?: string
  contactName?: string
  email?: string
  phone?: string
  preferredChannel?: CommChannel
  trades?: string[]
  serviceZips?: string[]
  preferredTier?: VendorTier
  laborRates?: Record<string, number> | null
  insuranceExpiry?: Date | null
  licenseExpiry?: Date | null
  w9OnFile?: boolean
  notes?: string
  isActive?: boolean
}

export interface ListVendorsInput {
  organizationId: string
  page?: number
  limit?: number
  search?: string
  trade?: string
  zip?: string
  tier?: VendorTier
  isActive?: boolean
}

export class VendorsService {
  async list(input: ListVendorsInput) {
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(50, Math.max(1, input.limit ?? 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      organizationId: input.organizationId,
    }
    if (input.tier != null) where.preferredTier = input.tier
    if (input.isActive != null) where.isActive = input.isActive
    if (input.trade) where.trades = { has: input.trade }
    if (input.zip) where.serviceZips = { has: input.zip }
    if (input.search) {
      where.OR = [
        { companyName: { contains: input.search, mode: 'insensitive' } },
        { contactName: { contains: input.search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ preferredTier: 'asc' }, { avgRating: 'desc' }],
      }),
      prisma.vendor.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getById(organizationId: string, id: string) {
    return prisma.vendor.findFirst({
      where: { id, organizationId },
      include: {
        _count: { select: { workOrders: true, ratings: true } },
      },
    })
  }

  async create(input: CreateVendorInput) {
    return prisma.vendor.create({
      data: {
        organizationId: input.organizationId,
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        preferredChannel: input.preferredChannel ?? 'EMAIL',
        trades: input.trades,
        serviceZips: input.serviceZips,
        preferredTier: input.preferredTier ?? 'STANDARD',
        laborRates: (input.laborRates ?? undefined) as object | undefined,
        notes: input.notes,
      },
    })
  }

  async update(organizationId: string, id: string, input: UpdateVendorInput) {
    const result = await prisma.vendor.updateMany({
      where: { id, organizationId },
      data: {
        ...(input.companyName != null && { companyName: input.companyName }),
        ...(input.contactName !== undefined && { contactName: input.contactName }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.preferredChannel != null && { preferredChannel: input.preferredChannel }),
        ...(input.trades != null && { trades: input.trades }),
        ...(input.serviceZips != null && { serviceZips: input.serviceZips }),
        ...(input.preferredTier != null && { preferredTier: input.preferredTier }),
        ...(input.laborRates !== undefined && { laborRates: input.laborRates as object | undefined }),
        ...(input.insuranceExpiry !== undefined && { insuranceExpiry: input.insuranceExpiry }),
        ...(input.licenseExpiry !== undefined && { licenseExpiry: input.licenseExpiry }),
        ...(input.w9OnFile != null && { w9OnFile: input.w9OnFile }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.isActive != null && { isActive: input.isActive }),
      },
    })
    return result.count > 0
  }

  async getWorkOrders(organizationId: string, vendorId: string, limit = 50) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
    })
    if (!vendor) return null

    return prisma.workOrder.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { property: true, unit: true, tenant: true },
    })
  }

  async getRatings(organizationId: string, vendorId: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
    })
    if (!vendor) return null

    return prisma.vendorRating.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async rate(organizationId: string, vendorId: string, workOrderId: string, score: number, notes?: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
    })
    if (!vendor) return null

    const wo = await prisma.workOrder.findFirst({
      where: { id: workOrderId, vendorId, organizationId },
    })
    if (!wo) return null

    const rating = await prisma.vendorRating.upsert({
      where: { workOrderId },
      create: { vendorId, workOrderId, score, notes },
      update: { score, notes },
    })

    // Recompute vendor avgRating
    const ratings = await prisma.vendorRating.findMany({ where: { vendorId } })
    const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length
    await prisma.vendor.update({
      where: { id: vendorId },
      data: { avgRating: Math.round(avg * 10) / 10 },
    })

    return rating
  }

  /** Recommend vendors for a job (simple scoring for Phase 3; AI enhancement in Phase 6) */
  async recommend(
    organizationId: string,
    trade: string,
    zip: string,
    priority?: string,
    budget?: number
  ) {
    const vendors = await prisma.vendor.findMany({
      where: {
        organizationId,
        isActive: true,
        trades: { has: trade },
        serviceZips: { has: zip },
      },
      orderBy: [
        { preferredTier: 'asc' },
        { avgResponseTimeHours: 'asc' },
        { avgRating: 'desc' },
      ],
      take: 5,
    })

    return vendors.map((v) => ({
      vendorId: v.id,
      vendorName: v.companyName,
      score: 0.7 + (v.avgRating / 10) + (v.preferredTier === 'PREFERRED' ? 0.2 : 0),
      reasons: [
        `Avg response ${v.avgResponseTimeHours}h`,
        `${Math.round(v.completionRate * 100)}% completion rate`,
      ],
      estimatedCost: (v.laborRates as { hourly?: number; callout?: number })?.hourly
        ? (v.laborRates as { hourly: number }).hourly * 2
        : undefined,
      availability: 'Contact for availability',
    }))
  }
}
