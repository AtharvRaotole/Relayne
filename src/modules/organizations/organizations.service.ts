import { prisma } from '../../lib/prisma'
import type { Plan } from '@prisma/client'

export interface ListOrganizationsInput {
  organizationId: string
  page?: number
  limit?: number
  search?: string
}

export interface UpdateOrganizationInput {
  name?: string
  plan?: Plan
  unitCount?: number
  settings?: Record<string, unknown>
}

export class OrganizationsService {
  async getById(organizationId: string) {
    return prisma.organization.findFirst({
      where: { id: organizationId },
      include: {
        _count: {
          select: { properties: true, tenants: true, vendors: true },
        },
      },
    })
  }

  async update(organizationId: string, input: UpdateOrganizationInput) {
    return prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(input.name != null && { name: input.name }),
        ...(input.plan != null && { plan: input.plan }),
        ...(input.unitCount != null && { unitCount: input.unitCount }),
        ...(input.settings != null && { settings: input.settings as object }),
      },
    })
  }
}
