import { prisma } from '../../lib/prisma'
import type { PropertyType } from '@prisma/client'

const PROPERTY_TYPE_VALUES = [
  'MULTIFAMILY', 'SINGLE_FAMILY', 'MIXED_USE', 'HOA',
  'STUDENT_HOUSING', 'SENIOR_HOUSING',
] as const

export interface CreatePropertyInput {
  organizationId: string
  name: string
  propertyType?: PropertyType
  address: { street?: string; city?: string; state?: string; zip?: string; country?: string }
  jurisdictionId?: string
  unitCount?: number
  yearBuilt?: number
  metadata?: Record<string, unknown>
  pmsPropertyId?: string
}

export interface UpdatePropertyInput {
  name?: string
  propertyType?: PropertyType
  address?: Record<string, unknown>
  jurisdictionId?: string | null
  unitCount?: number
  yearBuilt?: number | null
  metadata?: Record<string, unknown>
  isActive?: boolean
}

export interface ListPropertiesInput {
  organizationId: string
  page?: number
  limit?: number
  search?: string
  propertyType?: PropertyType
  isActive?: boolean
}

export interface CreateUnitInput {
  propertyId: string
  unitNumber: string
  pmsUnitId?: string
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  floor?: number
  isOccupied?: boolean
}

export interface UpdateUnitInput {
  unitNumber?: string
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number | null
  floor?: number | null
  isOccupied?: boolean
}

export class PropertiesService {
  async list(input: ListPropertiesInput) {
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(50, Math.max(1, input.limit ?? 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      organizationId: input.organizationId,
    }
    if (input.propertyType != null) where.propertyType = input.propertyType
    if (input.isActive != null) where.isActive = input.isActive
    if (input.search) {
      where.name = { contains: input.search, mode: 'insensitive' }
    }

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { units: true, workOrders: true } } },
      }),
      prisma.property.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getById(organizationId: string, id: string) {
    return prisma.property.findFirst({
      where: { id, organizationId },
      include: {
        jurisdiction: true,
        _count: { select: { units: true, workOrders: true, complianceTasks: true } },
      },
    })
  }

  async create(input: CreatePropertyInput) {
    return prisma.property.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        propertyType: input.propertyType ?? 'MULTIFAMILY',
        address: input.address as object,
        jurisdictionId: input.jurisdictionId,
        unitCount: input.unitCount ?? 0,
        yearBuilt: input.yearBuilt,
        metadata: (input.metadata ?? {}) as object,
        pmsPropertyId: input.pmsPropertyId,
      },
    })
  }

  async update(organizationId: string, id: string, input: UpdatePropertyInput) {
    return prisma.property.updateMany({
      where: { id, organizationId },
      data: {
        ...(input.name != null && { name: input.name }),
        ...(input.propertyType != null && { propertyType: input.propertyType }),
        ...(input.address != null && { address: input.address as object }),
        ...(input.jurisdictionId !== undefined && { jurisdictionId: input.jurisdictionId }),
        ...(input.unitCount != null && { unitCount: input.unitCount }),
        ...(input.yearBuilt !== undefined && { yearBuilt: input.yearBuilt }),
        ...(input.metadata != null && { metadata: input.metadata as object }),
        ...(input.isActive != null && { isActive: input.isActive }),
      },
    })
  }

  async softDelete(organizationId: string, id: string) {
    return prisma.property.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    })
  }

  async listUnits(organizationId: string, propertyId: string) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, organizationId },
    })
    if (!property) return null

    return prisma.unit.findMany({
      where: { propertyId },
      orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }],
      include: {
        _count: { select: { workOrders: true } },
      },
    })
  }

  async createUnit(organizationId: string, propertyId: string, input: Omit<CreateUnitInput, 'propertyId'>) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, organizationId },
    })
    if (!property) return null

    const unit = await prisma.unit.create({
      data: {
        propertyId,
        unitNumber: input.unitNumber,
        pmsUnitId: input.pmsUnitId,
        bedrooms: input.bedrooms ?? 1,
        bathrooms: input.bathrooms ?? 1,
        squareFeet: input.squareFeet,
        floor: input.floor,
        isOccupied: input.isOccupied ?? false,
      },
    })

    await prisma.property.update({
      where: { id: propertyId },
      data: { unitCount: { increment: 1 } },
    })

    return unit
  }

  async updateUnit(
    organizationId: string,
    propertyId: string,
    unitId: string,
    input: UpdateUnitInput
  ) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, organizationId },
    })
    if (!property) return null

    return prisma.unit.update({
      where: { id: unitId, propertyId },
      data: {
        ...(input.unitNumber != null && { unitNumber: input.unitNumber }),
        ...(input.bedrooms != null && { bedrooms: input.bedrooms }),
        ...(input.bathrooms != null && { bathrooms: input.bathrooms }),
        ...(input.squareFeet !== undefined && { squareFeet: input.squareFeet }),
        ...(input.floor !== undefined && { floor: input.floor }),
        ...(input.isOccupied != null && { isOccupied: input.isOccupied }),
      },
    })
  }
}
